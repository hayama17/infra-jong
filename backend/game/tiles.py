"""
Tile definitions and term validation logic for インフラ雀 (Infra-Jan).
"""

# All valid 3-character tech terms
# ファミリー構成:
#   SRE指標:        SLI / SLO / SLA / SRE
#   可用性:         RTO / RPO
#   オートスケーラー: HPA / VPA / CPA / OPA
#   コンテナIF:     OCI / CNI / CSI / CRI
#   k8sリソース:    POD / IDP / IAC / CRD / PVC / SVC
#   ネットワーク:   DNS / TLS / VPN / CDN
#   セキュリティ:   PKI / SSO
#   認証・基盤:     IAM / K8S / SDK
#   可観測性:       APM
#   運用:           NOC
VALID_TERMS = [
    "SLI", "SLO", "SLA", "SRE",
    "RTO", "RPO",
    "HPA", "VPA", "CPA", "OPA",
    "OCI", "CNI", "CSI", "CRI",
    "POD", "IDP", "IAC", "CRD", "PVC", "SVC",
    "DNS", "TLS", "VPN", "CDN",
    "PKI", "SSO",
    "IAM", "K8S", "SDK",
    "APM",
    "NOC",
]

# Tile distribution (52 tiles total)
# 出現頻度の高い文字ほど多め、孤立・低頻度文字は2枚
TILE_DISTRIBUTION = {
    # 高頻度 (8〜11用語に登場)
    "S": 4,  # SLI,SLO,SLA,SRE,CSI,K8S,SDK,TLS,DNS,SVC,SSO
    "I": 4,  # SLI,CNI,CSI,CRI,IDP,IAC,IAM,OCI,PKI
    "A": 4,  # SLA,HPA,VPA,CPA,OPA,IAC,IAM,APM
    "P": 4,  # RPO,HPA,VPA,CPA,OPA,POD,IDP,APM,PVC,VPN,PKI
    "O": 4,  # SLO,RTO,RPO,OPA,POD,OCI,NOC,SSO
    "C": 4,  # CPA,CNI,CSI,CRI,IAC,OCI,CRD,PVC,SVC,CDN,NOC
    # 中頻度 (3〜6用語に登場)
    "R": 3,  # SRE,RTO,RPO,CRI,CRD
    "L": 3,  # SLI,SLO,SLA,TLS
    "D": 3,  # POD,IDP,SDK,CRD,DNS,CDN
    "K": 3,  # K8S,SDK,PKI
    "N": 3,  # CNI,DNS,VPN,CDN,NOC
    "V": 3,  # VPA,PVC,SVC,VPN
    # 低頻度・孤立 (1〜2用語のみ)
    "E": 2,  # SRE
    "T": 2,  # RTO,TLS
    "H": 2,  # HPA
    "M": 2,  # IAM,APM
    "8": 2,  # K8S
}

# Total tiles = 52
TOTAL_TILES = sum(TILE_DISTRIBUTION.values())

# 高頻度文字（多くの用語に登場）
BACKBONE_CHARS = {"S", "I", "A", "P", "O", "C"}

# その他の文字
FINISHER_CHARS = {"R", "L", "D", "K", "N", "V", "E", "T", "H", "M", "8"}


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
