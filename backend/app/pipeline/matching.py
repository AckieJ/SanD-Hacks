"""
Stage 6: "Candidate pair if: same outcome family, same or related
intervention entity, vector similarity above a starting threshold of
0.80 (tune it), and claims from different papers... Cap at about 300
pairs per workspace."
"""
from app.config import get_settings
from app.vector_math import cosine_similarity

settings = get_settings()

COMPARABILITY_FIELDS = ["population", "duration", "measure"]


def comparability_checklist(claim_a: dict, claim_b: dict) -> dict[str, bool]:
    return {field: claim_a.get(field) == claim_b.get(field) for field in COMPARABILITY_FIELDS}


def candidate_pairs(claims: list[dict]) -> list[dict]:
    """
    claims: list of dicts with at least `id`, `paper_id`, `outcome_family`,
    `intervention`, `embedding`. Returns pair records (not yet verified --
    that's Stage 7) each with the comparability checklist attached.
    """
    pairs = []
    threshold = settings.match_similarity_threshold
    cap = settings.max_candidate_pairs_per_workspace

    for i, a in enumerate(claims):
        for b in claims[i + 1:]:
            if a["paper_id"] == b["paper_id"]:
                continue
            if a.get("outcome_family") != b.get("outcome_family"):
                continue
            if not (a.get("intervention") and b.get("intervention")):
                continue
            sim = cosine_similarity(a.get("embedding") or [], b.get("embedding") or [])
            if sim < threshold:
                continue
            pairs.append({
                "claim_a": a["id"], "claim_b": b["id"],
                "similarity": sim,
                "comparability": comparability_checklist(a, b),
            })
            if len(pairs) >= cap:
                return pairs
    return pairs
