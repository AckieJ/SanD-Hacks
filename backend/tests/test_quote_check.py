from app.pipeline.quote_check import quote_is_verbatim, validate_claims


def test_exact_match():
    assert quote_is_verbatim("the sky is blue", "Yesterday the sky is blue and calm.")


def test_whitespace_normalized():
    assert quote_is_verbatim("the   sky\nis blue", "the sky is blue today.")


def test_rejects_paraphrase():
    assert not quote_is_verbatim("the sky was blue", "the sky is blue today.")


def test_validate_claims_splits_pass_fail():
    claims = [
        {"quote": "scored 18% higher"},
        {"quote": "this quote is not in the text"},
    ]
    source = "Students scored 18% higher on the post-test."
    passing, failing = validate_claims(claims, source)
    assert len(passing) == 1
    assert len(failing) == 1
