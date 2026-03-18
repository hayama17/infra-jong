"""
CNK雀 (Infra-Jan) - FastAPI Backend
"""

import asyncio
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from game.logic import (
    create_room,
    get_room,
    add_player_to_room,
    start_game,
    draw_tile,
    discard_tile,
    commit_win,
    hotfix_claim,
    merge_win,
    advance_turn,
    rooms,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("CNK雀サーバー起動")
    yield
    logger.info("CNK雀サーバー停止")


app = FastAPI(title="CNK雀", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------

@app.get("/")
async def health_check():
    return {"status": "ok", "game": "CNK雀"}


@app.post("/rooms")
async def create_new_room():
    room = create_room()
    return {"room_id": room.room_id}


@app.get("/rooms/{room_id}")
async def get_room_state(room_id: str):
    room = get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="部屋が見つかりません")
    return room.to_state()


# ---------------------------------------------------------------------------
# WebSocket helpers
# ---------------------------------------------------------------------------

async def broadcast_state(room, exclude_player: str = None):
    """Send personalized game state to all connected players."""
    for player in room.players:
        if player.websocket and player.connected:
            try:
                state = room.to_state(for_player=player.name)
                await player.websocket.send_json({
                    "type": "game_state",
                    "state": state,
                })
            except Exception as e:
                logger.warning(f"Failed to send to {player.name}: {e}")
                player.connected = False


async def send_error(websocket: WebSocket, message: str):
    try:
        await websocket.send_json({"type": "error", "message": message})
    except Exception:
        pass


async def interrupt_timer(room, room_id: str):
    """
    Wait for interrupt window to expire, then advance turn.
    """
    try:
        # Count down
        for remaining in range(5, 0, -1):
            if room.pending_interrupt is None or room.phase != "playing":
                return
            room.pending_interrupt["expires_in"] = remaining
            await broadcast_state(room)
            await asyncio.sleep(1)

        # Timer expired - advance turn if still pending
        if room.pending_interrupt and room.phase == "playing":
            room.pending_interrupt = None
            advance_turn(room)
            await broadcast_state(room)
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"Interrupt timer error: {e}")


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@app.websocket("/ws/{room_id}/{player_name}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, player_name: str):
    await websocket.accept()

    # Get or create room
    room = get_room(room_id)
    if not room:
        await send_error(websocket, "部屋が見つかりません")
        await websocket.close()
        return

    # Handle reconnection
    existing_player = room.get_player(player_name)
    if existing_player:
        existing_player.websocket = websocket
        existing_player.connected = True
        logger.info(f"{player_name} reconnected to room {room_id}")
    else:
        success, error = add_player_to_room(room, player_name)
        if not success:
            await send_error(websocket, error)
            await websocket.close()
            return
        player = room.get_player(player_name)
        player.websocket = websocket
        player.connected = True
        logger.info(f"{player_name} joined room {room_id}")

    # Broadcast updated state to all
    await broadcast_state(room)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "start":
                if room.creator != player_name:
                    await send_error(websocket, "ゲームを開始できるのは部屋の作成者のみです")
                    continue
                success, error = start_game(room)
                if not success:
                    await send_error(websocket, error)
                    continue
                await broadcast_state(room)

            elif action == "draw":
                # Cancel any running interrupt timer before drawing
                if room.interrupt_timer_task and not room.interrupt_timer_task.done():
                    room.interrupt_timer_task.cancel()
                    room.pending_interrupt = None

                success, error = draw_tile(room, player_name)
                if not success:
                    await send_error(websocket, error)
                    continue

                # Check for deck exhaustion
                if room.phase == "finished":
                    await broadcast_state(room)
                    continue

                await broadcast_state(room)

            elif action == "discard":
                tile_index = data.get("tile_index")
                if tile_index is None:
                    await send_error(websocket, "tile_index が必要です")
                    continue

                success, error = discard_tile(room, player_name, tile_index)
                if not success:
                    await send_error(websocket, error)
                    continue

                await broadcast_state(room)

                # Start interrupt timer
                if room.interrupt_timer_task and not room.interrupt_timer_task.done():
                    room.interrupt_timer_task.cancel()

                room.interrupt_timer_task = asyncio.create_task(
                    interrupt_timer(room, room_id)
                )

            elif action == "commit":
                # Cancel interrupt timer if running
                if room.interrupt_timer_task and not room.interrupt_timer_task.done():
                    room.interrupt_timer_task.cancel()

                success, error = commit_win(room, player_name)
                if not success:
                    await send_error(websocket, error)
                    continue
                await broadcast_state(room)

            elif action == "hotfix":
                tile = data.get("tile")
                if not tile:
                    await send_error(websocket, "tile が必要です")
                    continue

                # Cancel interrupt timer
                if room.interrupt_timer_task and not room.interrupt_timer_task.done():
                    room.interrupt_timer_task.cancel()

                success, error = hotfix_claim(room, player_name, tile)
                if not success:
                    await send_error(websocket, error)
                    # Restart timer if still pending
                    if room.pending_interrupt:
                        room.interrupt_timer_task = asyncio.create_task(
                            interrupt_timer(room, room_id)
                        )
                    continue
                await broadcast_state(room)

            elif action == "merge":
                tile = data.get("tile")
                if not tile:
                    await send_error(websocket, "tile が必要です")
                    continue

                # Cancel interrupt timer
                if room.interrupt_timer_task and not room.interrupt_timer_task.done():
                    room.interrupt_timer_task.cancel()

                success, error = merge_win(room, player_name, tile)
                if not success:
                    await send_error(websocket, error)
                    # Restart timer if still pending
                    if room.pending_interrupt:
                        room.interrupt_timer_task = asyncio.create_task(
                            interrupt_timer(room, room_id)
                        )
                    continue
                await broadcast_state(room)

            elif action == "pass_interrupt":
                # Player explicitly passes on interrupt opportunity
                # (Timer handles this automatically, but allow explicit pass)
                pass

            else:
                await send_error(websocket, f"不明なアクション: {action}")

    except WebSocketDisconnect:
        logger.info(f"{player_name} disconnected from room {room_id}")
        player_obj = room.get_player(player_name)
        if player_obj:
            player_obj.connected = False
            player_obj.websocket = None
        await broadcast_state(room)

    except Exception as e:
        logger.error(f"WebSocket error for {player_name} in {room_id}: {e}", exc_info=True)
        player_obj = room.get_player(player_name)
        if player_obj:
            player_obj.connected = False
            player_obj.websocket = None
