"""
Tile definitions and term validation logic for CNK雀 (Infra-Jan).
"""

# All valid 3-character tech terms
# ファミリー構成:
#   最強コア:       SRE / DNS / RPC / CRD / SDN
#   プラットフォーム: SDK / CSP / RKE
#   組織・ロール:   CRE / DRE / NRE
#   セキュリティ:   CSR / PKE
#   コミュニティ:   CNK / CND / PEK
VALID_TERMS = [
    "SRE", "DNS", "RPC", "CRD", "SDN",
    "SDK", "CSP", "RKE",
    "CRE", "DRE", "NRE",
    "CSR", "PKE",
    "CNK", "CND", "PEK",
]

# Tile distribution (52 tiles total)
# Backbone を抑えて孤立牌（N/P/K）を厚くすることで初期あがりを抑制
TILE_DISTRIBUTION = {
    # Backbone (7〜8用語に登場) — 少なめに抑える
    "R": 6,   # SRE,RPC,CRD,RKE,CRE,DRE,NRE,CSR
    "E": 5,   # SRE,RKE,CRE,DRE,NRE,PKE,PEK
    "C": 5,   # RPC,CRD,CSP,CRE,CSR,CNK,CND
    # Middle (5〜6用語に登場)
    "S": 5,   # SRE,DNS,SDN,SDK,CSP,CSR
    "D": 5,   # DNS,CRD,SDN,SDK,DRE,CND
    # Finisher (3〜5用語) — 多めにして山を希釈
    "K": 9,   # SDK,RKE,PKE,CNK,PEK
    "N": 9,   # DNS,SDN,NRE,CNK,CND
    "P": 8,   # RPC,CSP,PKE,PEK
}

# Total tiles = 48
TOTAL_TILES = sum(TILE_DISTRIBUTION.values())

# 高頻度文字（多くの用語に登場）
BACKBONE_CHARS = {"R", "E", "C"}

# 中頻度文字
MIDDLE_CHARS = {"S", "D", "K", "N"}

# 低頻度文字（少数用語専用）
FINISHER_CHARS = {"P"}


def build_deck() -> list[str]:
    """Build and return the full deck of 36 tiles (unshuffled)."""
    deck = []
    for tile, count in TILE_DISTRIBUTION.items():
        deck.extend([tile] * count)
    return deck


def is_valid_term(tiles: list[str]) -> bool:
    """Check if exactly 3 tiles form a valid term (order-sensitive)."""
    if len(tiles) != 3:
        return False
    term = "".join(tiles)
    return term in VALID_TERMS


def find_valid_term_in_tiles(tiles: list[str]) -> list[str] | None:
    """
    Given a list of tiles, find the first arrangement of 3 tiles that forms a valid term.
    Returns the list of 3 tiles (from VALID_TERMS) if found, else None.
    """
    from itertools import permutations
    for perm in permutations(tiles, 3):
        if is_valid_term(list(perm)):
            return list(perm)
    return None


def can_form_term(tiles: list[str], target_term: str) -> bool:
    """Check if the given tiles can form the target term (has all required chars)."""
    if target_term not in VALID_TERMS:
        return False
    term_chars = list(target_term)
    available = list(tiles)
    for ch in term_chars:
        if ch in available:
            available.remove(ch)
        else:
            return False
    return True


def find_all_valid_terms(tiles: list[str]) -> list[tuple[str, list[int]]]:
    """
    Find all valid terms that can be formed from the given tiles.
    Returns list of (term_string, [indices_used]) tuples.
    """
    results = []
    n = len(tiles)
    from itertools import combinations, permutations

    for indices in combinations(range(n), 3):
        subset = [tiles[i] for i in indices]
        for perm in permutations(subset):
            term = "".join(perm)
            if term in VALID_TERMS:
                results.append((term, list(indices)))
                break  # one perm per index combo is enough
    return results


def check_win(hand: list[str], revealed_sets: list[list[str]]) -> tuple[bool, list[str] | None]:
    """
    Check if a player has won.
    Win = 2 complete valid terms total (revealed + hidden).

    Args:
        hand: current tiles in hand (not yet revealed)
        revealed_sets: list of already-revealed sets (each is a list of 3 tiles)

    Returns:
        (is_win, winning_term_strings_or_None)
        winning_term_strings is a list of term strings (e.g. ["SLI", "API"])
    """
    revealed_count = len(revealed_sets)

    if revealed_count >= 2:
        # Already have 2 revealed sets - that's a win
        terms = ["".join(s) for s in revealed_sets[:2]]
        return True, terms

    if revealed_count == 1:
        # Need 1 more complete term from hand (hand should have ~2-3 tiles)
        term_results = find_all_valid_terms(hand)
        if term_results:
            existing = "".join(revealed_sets[0])
            new_term = term_results[0][0]
            return True, [existing, new_term]
        return False, None

    # No revealed sets - need 2 terms from hand (hand should have 6 tiles)
    if len(hand) < 6:
        return False, None

    from itertools import combinations
    n = len(hand)
    for indices1 in combinations(range(n), 3):
        subset1 = [hand[i] for i in indices1]
        remaining_indices = [i for i in range(n) if i not in indices1]
        if len(remaining_indices) < 3:
            continue
        for indices2 in combinations(remaining_indices, 3):
            subset2 = [hand[i] for i in indices2]
            from itertools import permutations as perms
            term1 = None
            term2 = None
            for p in perms(subset1):
                if "".join(p) in VALID_TERMS:
                    term1 = "".join(p)
                    break
            if not term1:
                continue
            for p in perms(subset2):
                if "".join(p) in VALID_TERMS:
                    term2 = "".join(p)
                    break
            if term2:
                return True, [term1, term2]

    return False, None


def check_win_with_incoming(
    hand: list[str],
    incoming_tile: str,
    revealed_sets: list[list[str]]
) -> tuple[bool, list[str] | None]:
    """
    Check if adding incoming_tile to hand creates a winning condition.
    """
    new_hand = hand + [incoming_tile]
    return check_win(new_hand, revealed_sets)


def can_hotfix(hand: list[str], discarded_tile: str) -> bool:
    """
    Check if a player can perform Hotfix (pon) with the discarded tile.
    Hotfix requires having 2 tiles that, together with the discarded tile, form a complete term.
    """
    # Try adding the discarded tile and see if any 3-tile subset forms a valid term
    test_hand = hand + [discarded_tile]
    from itertools import combinations, permutations

    for indices in combinations(range(len(test_hand)), 3):
        if len(test_hand) - 1 in indices:  # discarded tile must be included
            subset = [test_hand[i] for i in indices]
            for perm in permutations(subset):
                if "".join(perm) in VALID_TERMS:
                    return True
    return False


def get_hotfix_term(hand: list[str], discarded_tile: str) -> tuple[str, list[int]] | None:
    """
    Get the term formed by hotfix (pon).
    Returns (term_string, [hand_indices_used]) or None.
    The discarded tile is not in hand, so indices refer to hand only.
    """
    from itertools import combinations, permutations

    n = len(hand)
    # Try pairs from hand combined with the discarded tile
    for indices in combinations(range(n), 2):
        subset = [hand[i] for i in indices] + [discarded_tile]
        for perm in permutations(subset):
            if "".join(perm) in VALID_TERMS:
                return "".join(perm), list(indices)
    return None
