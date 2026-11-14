from app.pipeline.matching import candidate_pairs
from app.pipeline.scoring import compute_relevance, compute_layout
from app.clients.mock import _hash_embed


def test_candidate_pairs_requires_same_paper_different_outcome_family():
    a = {"id": "a", "paper_id": "p1", "outcome_family": "math", "intervention": "AI tutor",
         "embedding": _hash_embed("students scored higher on math tests")}
    b = {"id": "b", "paper_id": "p2", "outcome_family": "math", "intervention": "AI tutor",
         "embedding": _hash_embed("students scored higher on math tests")}
    c = {"id": "c", "paper_id": "p1", "outcome_family": "math", "intervention": "AI tutor",
         "embedding": _hash_embed("students scored higher on math tests")}
    pairs = candidate_pairs([a, b, c])
    pair_ids = {(p["claim_a"], p["claim_b"]) for p in pairs}
    assert ("a", "b") in pair_ids
    assert ("a", "c") not in pair_ids  # same paper, excluded


def test_relevance_in_zero_one_range():
    r = compute_relevance(
        paper={"outcome_families": ["math"], "design": "RCT", "sample_n": 240, "text_level": "full", "cited_by_count": 10},
        question_embedding=_hash_embed("ai tutor learning"),
        paper_claim_embedding=_hash_embed("ai tutor improved learning"),
        target_outcome_families={"math"},
        max_citation_count_in_library=20,
    )
    assert 0.0 <= r <= 1.0


def test_layout_assigns_radius_inversely_to_relevance():
    papers = [{"id": "hi", "relevance": 0.9, "sector": 0}, {"id": "lo", "relevance": 0.1, "sector": 0}]
    layout = compute_layout(papers, num_sectors=2, jitter_seed=1)
    assert layout["hi"]["radius"] < layout["lo"]["radius"]
