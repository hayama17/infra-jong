"""
Game state and logic for インフラ雀 (Infra-Jan).
"""

import asyncio
import random
import uuid
from dataclasses import dataclass, field
from typing import Optional

from .tiles import (
    build_deck,
    check_win,
    check_win_with_incoming,
    can_hotfix,
    get_hotfix_term,
)

# In-memory room storage
rooms: dict[str, "Room"] = {}


@dataclass
class Player:
    name: str
    hand: list[str] = field(default_factory=list)
    revealed: list[list[str]] = field(default_factory=list)  # list of revealed 3-tile sets
    has_drawn: bool = False
    connected: bool = True
    websocket: object = None  # WebSocket connection

    def to_dict(self, include_hand: bool = False) -> dict:
        result = {
            "name": self.name,
            "hand_count": len(self.hand),
            "revealed": self.revealed,
            "has_drawn": self.has_drawn,
            "connected": self.connected,
        }
        if include_hand:
            result["hand"] = self.hand
        return result


@dataclass
class Room:
    room_id: str
    players: list[Player] = field(default_factory=list)
    deck: list[str] = field(default_factory=list)
    discard_pile: list[str] = field(default_factory=list)
    phase: str = "waiting"  # waiting | playing | finished
    current_player_index: int = 0
    winner: Optional[str] = None
    winning_terms: Optional[list[str]] = None
    last_discard: Optional[dict] = None  # {"tile": "K", "player": "Bob"}
    pending_interrupt: Optional[dict] = None  # {"tile": ..., "from_player": ..., "expires_in": ...}
    interrupt_timer_task: Optional[asyncio.Task] = None
    creator: str = ""

    def get_player(self, name: str) -> Optional[Player]:
        for p in self.players:
            if p.name == name:
                return p
        return None

    def get_current_player(self) -> Optional[Player]:
        if not self.players:
            return None
        return self.players[self.current_player_index % len(self.players)]

    def to_state(self, for_player: str = None) -> dict:
        """Build game state dict. Hand is included only for the requesting player."""
        current = self.get_current_player()
        players_data = []
        for p in self.players:
            include_hand = (p.name == for_player)
            pdata = p.to_dict(include_hand=include_hand)
            pdata["is_current"] = (current is not None and p.name == current.name)
            players_data.append(pdata)

        return {
            "phase": self.phase,
            "players": players_data,
            "discard_pile": self.discard_pile[-10:],  # show last 10 discards
            "last_discard": self.last_discard,
            "deck_count": len(self.deck),
            "current_player": current.name if current else None,
            "winner": self.winner,
            "winning_terms": self.winning_terms,
            "pending_interrupt": self.pending_interrupt,
        }


def create_room() -> Room:
    """Create a new room with a unique ID."""
    room_id = str(uuid.uuid4())[:8].upper()
    room = Room(room_id=room_id)
    rooms[room_id] = room
    return room


def get_room(room_id: str) -> Optional[Room]:
    return rooms.get(room_id)


def add_player_to_room(room: Room, player_name: str) -> tuple[bool, str]:
    """
    Add a player to a room.
    Returns (success, error_message).
    """
    if room.phase != "waiting":
        return False, "ゲームはすでに開始されています"
    if len(room.players) >= 3:
        return False, "部屋が満員です（最大3人）"
    if room.get_player(player_name):
        return False, "その名前はすでに使用されています"
    player = Player(name=player_name)
    room.players.append(player)
    if not room.creator:
        room.creator = player_name
    return True, ""


def start_game(room: Room) -> tuple[bool, str]:
    """
    Start the game: shuffle deck, deal 5 tiles per player.
    Returns (success, error_message).
    """
    if room.phase != "waiting":
        return False, "ゲームはすでに開始されています"
    if len(room.players) < 2:
        return False, "最低2人必要です"

    # Build and shuffle deck
    deck = build_deck()
    random.shuffle(deck)
    room.deck = deck

    # Deal 5 tiles per player
    for player in room.players:
        player.hand = []
        for _ in range(5):
            if room.deck:
                player.hand.append(room.deck.pop())

    room.phase = "playing"
    room.current_player_index = 0
    room.discard_pile = []
    room.last_discard = None
    room.pending_interrupt = None
    room.winner = None
    room.winning_terms = None

    # Give first player a draw immediately (they start with 5 tiles, but need to draw)
    # Actually per rules, first action is to draw
    return True, ""


def draw_tile(room: Room, player_name: str) -> tuple[bool, str]:
    """
    Player draws a tile.
    Returns (success, error_message).
    """
    if room.phase != "playing":
        return False, "ゲームが進行中ではありません"

    current = room.get_current_player()
    if not current or current.name != player_name:
        return False, "あなたのターンではありません"

    if current.has_drawn:
        return False, "すでにドローしています"

    if room.pending_interrupt:
        return False, "割り込みアクション待ち中です"

    if not room.deck:
        # Deck exhausted = draw game
        room.phase = "finished"
        room.winner = "引き分け"
        room.winning_terms = []
        return True, ""

    tile = room.deck.pop()
    current.hand.append(tile)
    current.has_drawn = True

    return True, ""


def discard_tile(room: Room, player_name: str, tile_index: int) -> tuple[bool, str]:
    """
    Player discards a tile by index.
    Returns (success, error_message).
    """
    if room.phase != "playing":
        return False, "ゲームが進行中ではありません"

    current = room.get_current_player()
    if not current or current.name != player_name:
        return False, "あなたのターンではありません"

    if not current.has_drawn:
        return False, "先にドローしてください"

    if tile_index < 0 or tile_index >= len(current.hand):
        return False, "無効な牌インデックスです"

    tile = current.hand.pop(tile_index)
    room.discard_pile.append(tile)
    room.last_discard = {"tile": tile, "player": player_name}
    current.has_drawn = False

    # Set pending interrupt window (other players can pon/ron)
    room.pending_interrupt = {
        "tile": tile,
        "from_player": player_name,
        "expires_in": 5,
    }

    return True, ""


def commit_win(room: Room, player_name: str) -> tuple[bool, str]:
    """
    Player declares tsumo win after drawing.
    Returns (success, error_message).
    """
    if room.phase != "playing":
        return False, "ゲームが進行中ではありません"

    current = room.get_current_player()
    if not current or current.name != player_name:
        return False, "あなたのターンではありません"

    if not current.has_drawn:
        return False, "コミットにはドローが必要です"

    is_win, terms = check_win(current.hand, current.revealed)
    if not is_win:
        return False, "勝利条件を満たしていません"

    room.phase = "finished"
    room.winner = player_name
    room.winning_terms = terms
    return True, ""


def hotfix_claim(room: Room, claimer_name: str, tile: str) -> tuple[bool, str]:
    """
    Player claims opponent's discard for Hotfix (pon).
    Returns (success, error_message).
    """
    if room.phase != "playing":
        return False, "ゲームが進行中ではありません"

    if not room.pending_interrupt:
        return False, "ホットフィックス可能な牌がありません"

    if room.pending_interrupt["tile"] != tile:
        return False, "その牌はホットフィックスできません"

    if room.pending_interrupt["from_player"] == claimer_name:
        return False, "自分がデプロイした牌はホットフィックスできません"

    claimer = room.get_player(claimer_name)
    if not claimer:
        return False, "プレイヤーが見つかりません"

    result = get_hotfix_term(claimer.hand, tile)
    if not result:
        return False, "ホットフィックス可能な組み合わせがありません"

    term_str, hand_indices = result

    # Remove used tiles from hand (in reverse order to preserve indices)
    for idx in sorted(hand_indices, reverse=True):
        claimer.hand.pop(idx)

    # Store the revealed set as the ordered term characters
    revealed_set = list(term_str)
    claimer.revealed.append(revealed_set)

    # Cancel pending interrupt
    room.pending_interrupt = None

    # Switch current player to the claimer
    claimer_index = next(i for i, p in enumerate(room.players) if p.name == claimer_name)
    room.current_player_index = claimer_index
    claimer.has_drawn = True  # They've effectively "received" the tile, now must discard

    return True, ""


def merge_win(room: Room, claimer_name: str, tile: str) -> tuple[bool, str]:
    """
    Player claims opponent's discard for Merge (ron win).
    Returns (success, error_message).
    """
    if room.phase != "playing":
        return False, "ゲームが進行中ではありません"

    if not room.pending_interrupt:
        return False, "マージ可能な牌がありません"

    if room.pending_interrupt["tile"] != tile:
        return False, "その牌ではマージできません"

    if room.pending_interrupt["from_player"] == claimer_name:
        return False, "自分がデプロイした牌ではマージできません"

    claimer = room.get_player(claimer_name)
    if not claimer:
        return False, "プレイヤーが見つかりません"

    # ホットフィックス済みの場合はマージ不可
    if claimer.revealed:
        return False, "ホットフィックス済みのためマージできません（コミットのみ）"

    # Check win condition with the incoming tile
    is_win, terms = check_win_with_incoming(claimer.hand, tile, claimer.revealed)
    if not is_win:
        return False, "マージの勝利条件を満たしていません"

    room.phase = "finished"
    room.winner = claimer_name
    room.winning_terms = terms
    room.pending_interrupt = None
    return True, ""


def advance_turn(room: Room):
    """Move to the next player's turn."""
    if room.phase != "playing":
        return
    n = len(room.players)
    room.current_player_index = (room.current_player_index + 1) % n
    current = room.get_current_player()
    if current:
        current.has_drawn = False
    room.pending_interrupt = None
    room.last_discard = None
