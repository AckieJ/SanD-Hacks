"""
Isolated so the dev (Python/JSON-column) path and the production
(pgvector HNSW) path share one call site. Swapping to pgvector means
replacing the body of `nearest()` with an `ORDER BY embedding <=> :q`
query and deleting this file's loop -- nothing in pipeline/ changes.
"""
from __future__ import annotations
import numpy as np


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0
    va, vb = np.array(a, dtype=float), np.array(b, dtype=float)
    denom = (np.linalg.norm(va) * np.linalg.norm(vb))
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


def nearest(query: list[float], candidates: list[tuple[str, list[float]]], k: int = 10) -> list[tuple[str, float]]:
    """candidates: [(id, embedding), ...] -> top-k (id, similarity) desc."""
    scored = [(cid, cosine_similarity(query, emb)) for cid, emb in candidates]
    scored.sort(key=lambda t: t[1], reverse=True)
    return scored[:k]


def trigram_similarity(a: str, b: str) -> float:
    """
    Pure-Python stand-in for Postgres `pg_trgm` similarity() used in
    Stage 2 de-duplication. Same 3-gram Jaccard measure pg_trgm uses,
    so the 0.90 threshold from the proposal behaves the same way.
    """
    def trigrams(s: str) -> set[str]:
        s = f"  {s.lower().strip()} "
        return {s[i:i + 3] for i in range(len(s) - 2)} if len(s) >= 3 else {s}

    ta, tb = trigrams(a), trigrams(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)
