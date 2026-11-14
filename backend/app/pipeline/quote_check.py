"""
Stage 4's validation step, verbatim from the proposal: "normalize
whitespace and check that quote occurs in the stored text. Reject and
retry claims whose quote is not found." This is deliberately pure code,
not another AI call -- an LLM grading its own quotes is not a check.
"""
import re


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def quote_is_verbatim(quote: str, source_text: str | None) -> bool:
    if not quote or not source_text:
        return False
    return _normalize(quote) in _normalize(source_text)


def validate_claims(claims: list[dict], source_text: str | None) -> tuple[list[dict], list[dict]]:
    """Returns (passing, failing). Called once per paper in Stage 4."""
    passing, failing = [], []
    for claim in claims:
        (passing if quote_is_verbatim(claim.get("quote", ""), source_text) else failing).append(claim)
    return passing, failing
