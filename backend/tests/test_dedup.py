from app.pipeline.dedup import dedupe_papers


def test_dedup_by_doi():
    candidates = [
        {"title": "AI Tutors", "year": 2021, "doi": "10.1/abc", "lane": "A"},
        {"title": "AI Tutors (preprint)", "year": 2021, "doi": "https://doi.org/10.1/abc", "lane": "B"},
    ]
    merged = dedupe_papers(candidates)
    assert len(merged) == 1
    assert set(merged[0]["sources"]) == {"A", "B"}


def test_dedup_by_title_similarity_same_year():
    candidates = [
        {"title": "AI Tutoring Boosts Math Scores in Middle School", "year": 2021, "doi": None, "lane": "A"},
        {"title": "AI Tutoring Boosts Math Scores in Middle Schools", "year": 2021, "doi": None, "lane": "B"},
    ]
    merged = dedupe_papers(candidates)
    assert len(merged) == 1


def test_no_merge_different_year():
    candidates = [
        {"title": "AI Tutors", "year": 2021, "doi": None, "lane": "A"},
        {"title": "AI Tutors", "year": 2019, "doi": None, "lane": "B"},
    ]
    merged = dedupe_papers(candidates)
    assert len(merged) == 2
