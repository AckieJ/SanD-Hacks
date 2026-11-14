"""
Every external dependency (discovery APIs, Bright Data, Gemini) is called
through one of these interfaces. clients/mock.py implements all of them
with deterministic fixture data so the full pipeline runs offline, in CI,
or in a sandbox with no network egress. clients/live.py implements the
same interfaces against the real services. app/factory.py picks which set
to hand to the pipeline based on RESEARCHLENS_MODE -- no pipeline code
changes when you go from mock to live.
"""
from __future__ import annotations
from typing import Protocol, Any


class DiscoveryClient(Protocol):
    """Lane A: OpenAlex / Crossref / Europe PMC."""
    def search(self, query: str, limit: int = 20) -> list[dict[str, Any]]: ...
    def resolve_doi(self, title: str, year: int | None) -> str | None: ...


class ScholarClient(Protocol):
    """Lane B: Bright Data Google Scholar ScraperAPI."""
    def search(self, query: str, limit: int = 20) -> list[dict[str, Any]]: ...
    def cited_by(self, result_url: str, limit: int = 10) -> list[dict[str, Any]]: ...
    def related(self, result_url: str, limit: int = 10) -> list[dict[str, Any]]: ...


class UnlockerClient(Protocol):
    """Lane C: Bright Data Web Unlocker, allowlisted public pages only."""
    def fetch(self, url: str) -> str: ...


class AIClient(Protocol):
    """Gemini: question parsing, extraction, verification, embeddings, chat."""
    def understand_question(self, question: str) -> dict[str, Any]: ...
    def extract_claims(self, paper_text: str, paper_meta: dict) -> list[dict[str, Any]]: ...
    def verify_relationship(self, claim_a: dict, claim_b: dict) -> dict[str, Any]: ...
    def embed(self, text: str) -> list[float]: ...
    def chat(self, question: str, context_claims: list[dict]) -> dict[str, Any]: ...
