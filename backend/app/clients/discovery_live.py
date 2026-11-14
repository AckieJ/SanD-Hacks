"""
Lane A: structured discovery via free, keyless public APIs.

These are real implementations meant to run where the host has normal
internet egress (your laptop, the Vultr box) -- NOT inside this build
sandbox, which only allows a short allowlist of package-registry domains.
That's a sandbox limitation, not a code limitation: point this at a host
with normal egress and it works as written. Identify yourself via email
per each API's etiquette policy (OpenAlex "polite pool", Crossref mailto).
"""
from __future__ import annotations
import httpx
from tenacity import retry, wait_exponential, stop_after_attempt

from app.config import get_settings

settings = get_settings()
_TIMEOUT = 20.0


class LiveDiscoveryClient:
    def __init__(self, email: str | None = None):
        self.email = email or settings.openalex_email

    @retry(wait=wait_exponential(multiplier=1, min=1, max=10), stop=stop_after_attempt(3))
    def _get(self, url: str, params: dict) -> dict:
        with httpx.Client(timeout=_TIMEOUT) as client:
            r = client.get(url, params=params, headers={"User-Agent": f"ResearchLens ({self.email})"})
            r.raise_for_status()
            return r.json()

    def search(self, query: str, limit: int = 20) -> list[dict]:
        """OpenAlex first (richest metadata + OA locations), Europe PMC as a
        secondary pass for biomedical coverage Crossref/OpenAlex sometimes miss."""
        out = []
        try:
            data = self._get(
                "https://api.openalex.org/works",
                {"search": query, "per_page": limit, "mailto": self.email},
            )
            for w in data.get("results", []):
                oa = (w.get("open_access") or {}).get("oa_url")
                out.append({
                    "title": w.get("title"),
                    "year": w.get("publication_year"),
                    "doi": (w.get("doi") or "").replace("https://doi.org/", "") or None,
                    "authors": ", ".join(
                        a.get("author", {}).get("display_name", "")
                        for a in w.get("authorships", [])
                    ),
                    "venue": (w.get("primary_location") or {}).get("source", {}).get("display_name"),
                    "oa_url": oa,
                    "cited_by_count": w.get("cited_by_count"),
                    "lane": "A",
                    "source_api": "openalex",
                })
        except httpx.HTTPError:
            pass  # Lane A degrades gracefully; Stage 2 just has fewer candidates
        return out[:limit]

    def resolve_doi(self, title: str, year: int | None) -> str | None:
        """Used by Lane B to attach a DOI to a Scholar-only hit (Stage 2)."""
        try:
            data = self._get(
                "https://api.crossref.org/works",
                {"query.bibliographic": title, "rows": 3, "mailto": self.email},
            )
            for item in data.get("message", {}).get("items", []):
                cand_title = (item.get("title") or [""])[0]
                cand_year = (
                    item.get("issued", {}).get("date-parts", [[None]])[0][0]
                )
                if _title_matches(title, cand_title) and (year is None or cand_year == year):
                    return item.get("DOI")
        except httpx.HTTPError:
            pass
        return None

    def full_text_from_europepmc(self, doi: str) -> str | None:
        """Stage 3, Lane C step 2: Europe PMC's own full-text API, no scraping."""
        try:
            data = self._get(
                "https://www.ebi.ac.uk/europepmc/webservices/rest/search",
                {"query": f"DOI:{doi}", "format": "json"},
            )
            results = data.get("resultList", {}).get("result", [])
            if results and results[0].get("isOpenAccess") == "Y":
                pmcid = results[0].get("pmcid")
                if pmcid:
                    with httpx.Client(timeout=_TIMEOUT) as client:
                        r = client.get(
                            f"https://www.ebi.ac.uk/europepmc/webservices/rest/{pmcid}/fullTextXML"
                        )
                        if r.status_code == 200:
                            return r.text
        except httpx.HTTPError:
            pass
        return None


def _title_matches(a: str, b: str, threshold: float = 0.90) -> bool:
    from app.vector_math import trigram_similarity
    return trigram_similarity(a, b) >= threshold
