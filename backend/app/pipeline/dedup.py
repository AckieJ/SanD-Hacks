"""
Stage 2: "De-duplicate by normalized DOI first, then by title similarity
(trigram similarity above 0.9 plus matching year). Record paper_sources."
"""
from app.config import get_settings
from app.vector_math import trigram_similarity

settings = get_settings()


def _normalize_doi(doi: str | None) -> str | None:
    if not doi:
        return None
    return doi.strip().lower().removeprefix("https://doi.org/").removeprefix("doi:")


def dedupe_papers(candidates: list[dict]) -> list[dict]:
    """
    candidates: raw hits from Lane A/B/D, each a dict with at least
    `title`, `year`, `doi`, and `lane`. Returns merged papers, each with a
    `sources` list recording every lane that found it (for paper_sources).
    """
    merged: list[dict] = []

    for cand in candidates:
        cand_doi = _normalize_doi(cand.get("doi"))
        match = None

        if cand_doi:
            match = next((m for m in merged if _normalize_doi(m.get("doi")) == cand_doi), None)

        if match is None:
            for m in merged:
                same_year = cand.get("year") == m.get("year")
                sim = trigram_similarity(cand.get("title", ""), m.get("title", ""))
                if same_year and sim >= settings.dedup_title_similarity_threshold:
                    match = m
                    break

        if match is None:
            cand = dict(cand)
            cand["sources"] = [cand.pop("lane")] if "lane" in cand else []
            merged.append(cand)
        else:
            lane = cand.get("lane")
            if lane and lane not in match["sources"]:
                match["sources"].append(lane)
            # Prefer the DOI-bearing / more complete record as canonical.
            if not match.get("doi") and cand.get("doi"):
                match["doi"] = cand["doi"]

    return merged
