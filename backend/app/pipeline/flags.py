"""
Stage 8: "Three separate lists, never merged": limitations, weak claims,
and library gaps. List 3 is always phrased as being about this library,
never about the whole literature.
"""

WEAK_IF_TEXT_LEVEL_ABSTRACT = True
WEAK_IF_SAMPLE_N_UNDER = 50


def stated_limitations(claims: list[dict]) -> list[dict]:
    out = []
    for c in claims:
        lim = c.get("limitations")
        if lim and lim != "not_reported":
            out.append({"kind": "limitation", "description": lim, "claim_ids": [c["id"]]})
    return out


def weak_claims(claims: list[dict], papers_by_id: dict[str, dict]) -> list[dict]:
    out = []
    for c in claims:
        paper = papers_by_id.get(c["paper_id"], {})
        reasons = []
        if paper.get("text_level") == "abstract" and WEAK_IF_TEXT_LEVEL_ABSTRACT:
            reasons.append("abstract only")
        if c.get("sample_n") is not None and c["sample_n"] < WEAK_IF_SAMPLE_N_UNDER:
            reasons.append(f"small sample (n={c['sample_n']})")
        if paper.get("retraction_status"):
            reasons.append(f"paper status: {paper['retraction_status']}")
        if reasons:
            out.append({
                "kind": "weak_claim",
                "description": f"{c['claim_text']} ({'; '.join(reasons)})",
                "claim_ids": [c["id"]],
            })
    return out


def library_gaps(target_sub_questions: list[str], covered_outcome_families: set[str],
                  claims: list[dict]) -> list[dict]:
    """Topics with zero matching claims in *this* library -- never phrased
    as a gap in the research itself."""
    out = []
    claim_text_blob = " ".join(c.get("claim_text", "").lower() for c in claims)
    for sq in target_sub_questions:
        keywords = [w.lower() for w in sq.replace("?", "").split() if len(w) > 4]
        if keywords and not any(k in claim_text_blob for k in keywords):
            out.append({
                "kind": "gap",
                "description": f"Not found in the papers examined: \u201c{sq}\u201d",
                "claim_ids": [],
            })
    return out
