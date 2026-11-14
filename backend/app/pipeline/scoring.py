"""
Stage 9, formula and layout verbatim from the proposal:

    relevance = 0.45 * cosine(paper_claims, question)
              + 0.20 * outcome_match
              + 0.20 * citation_centrality (within the library)
              + 0.15 * evidence_strength (design, sample size, full text)

    radius = r_min + (1 - relevance) * (r_max - r_min)
    angle  = sector of its sub-question, plus small jitter
    second ring = papers found by citation or Scholar expansion
    parent = strongest-linked paper; radius from its own relevance

"The weights are a starting guess" -- they live in app/config.py so they
can be tuned without touching this file.
"""
import math
import random

from app.config import get_settings
from app.vector_math import cosine_similarity

settings = get_settings()

R_MIN, R_MAX = 0.12, 1.0  # normalized radius; frontend scales to pixels


def _evidence_strength(paper: dict) -> float:
    """design, sample size, full text -> one 0-1 score."""
    design_score = {"RCT": 1.0, "quasi_experimental": 0.7, "observational": 0.4}.get(
        paper.get("design"), 0.3
    )
    sample_n = paper.get("sample_n") or 0
    sample_score = min(sample_n / 300.0, 1.0)  # saturates around n=300
    text_score = 1.0 if paper.get("text_level") == "full" else 0.5
    return round(0.5 * design_score + 0.3 * sample_score + 0.2 * text_score, 4)


def _outcome_match(paper_outcome_families: set[str], target_outcome_families: set[str]) -> float:
    if not target_outcome_families:
        return 0.0
    overlap = paper_outcome_families & target_outcome_families
    return len(overlap) / len(target_outcome_families)


def compute_relevance(
    paper: dict,
    question_embedding: list[float],
    paper_claim_embedding: list[float],
    target_outcome_families: set[str],
    max_citation_count_in_library: int,
) -> float:
    cosine = cosine_similarity(question_embedding, paper_claim_embedding)
    outcome = _outcome_match(set(paper.get("outcome_families", [])), target_outcome_families)
    cites = paper.get("cited_by_count") or 0
    centrality = (cites / max_citation_count_in_library) if max_citation_count_in_library else 0.0
    evidence = _evidence_strength(paper)

    relevance = (
        settings.relevance_weight_cosine * cosine
        + settings.relevance_weight_outcome * outcome
        + settings.relevance_weight_citation * centrality
        + settings.relevance_weight_evidence_strength * evidence
    )
    return round(min(max(relevance, 0.0), 1.0), 4)


def compute_layout(
    papers_with_relevance: list[dict],  # each: {id, relevance, sector, second_ring, parent_paper}
    num_sectors: int,
    jitter_seed: int | None = None,
) -> dict[str, dict]:
    """Returns {paper_id: {radius, angle}}."""
    rng = random.Random(jitter_seed)
    sector_width = 2 * math.pi / max(num_sectors, 1)
    layout = {}
    for p in papers_with_relevance:
        radius = R_MIN + (1 - p["relevance"]) * (R_MAX - R_MIN)
        base_angle = p.get("sector", 0) * sector_width
        jitter = rng.uniform(-sector_width * 0.3, sector_width * 0.3)
        angle = base_angle + sector_width / 2 + jitter
        layout[p["id"]] = {"radius": round(radius, 4), "angle": round(angle, 4)}
    return layout
