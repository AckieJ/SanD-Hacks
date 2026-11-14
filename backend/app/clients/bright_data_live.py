"""
Lane B (Google Scholar via Bright Data's ScraperAPI) and Lane C (Web
Unlocker for allowlisted public pages). Follows proposal section 7's
contract and section 6's rules exactly: allowlist-only fetches, 1 req/sec
per domain, 7-day cache, no paywall circumvention.

Field names for the ScraperAPI response are a best-effort mapping --
Bright Data's dashboard is the source of truth and can change; run the
playground smoke test in section 7 step 3 and adjust `_parse_scholar_hit`
if field names differ before relying on this in a demo.
"""
from __future__ import annotations
import hashlib
import time
from pathlib import Path
from urllib.parse import urlparse

import httpx
import yaml
from tenacity import retry, wait_exponential, stop_after_attempt

from app.config import get_settings

settings = get_settings()
_TIMEOUT = 60.0
_ALLOWLIST_PATH = Path(__file__).resolve().parents[1] / "config" / "allowlist.yaml"


def _load_allowlist() -> set[str]:
    if not _ALLOWLIST_PATH.exists():
        return set()
    data = yaml.safe_load(_ALLOWLIST_PATH.read_text()) or {}
    return set(data.get("domains", []))


class RateLimiter:
    """1 request/sec per domain, per proposal section 6 rule 4."""
    def __init__(self, min_interval: float = 1.0):
        self.min_interval = min_interval
        self._last_call: dict[str, float] = {}

    def wait(self, domain: str) -> None:
        last = self._last_call.get(domain, 0.0)
        elapsed = time.monotonic() - last
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self._last_call[domain] = time.monotonic()


class LiveScholarClient:
    """Lane B: proposal section 5, 'Lane B in detail'."""

    def __init__(self):
        self.api_key = settings.bright_data_api_key
        self.scraper_id = settings.bright_data_scholar_id
        self._limiter = RateLimiter(settings.fetch_rate_limit_seconds)

    @retry(wait=wait_exponential(multiplier=1, min=2, max=20), stop=stop_after_attempt(3))
    def _call(self, payload: dict) -> dict:
        self._limiter.wait("scholar.google.com")
        with httpx.Client(timeout=_TIMEOUT) as client:
            r = client.post(
                f"https://api.brightdata.com/datasets/v3/trigger?dataset_id={self.scraper_id}",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json=payload,
            )
            r.raise_for_status()
            return r.json()

    def search(self, query: str, limit: int = 20) -> list[dict]:
        """Top 15-20 results per query (proposal step 2-3)."""
        raw = self._call({"query": query, "limit": limit})
        return [_parse_scholar_hit(hit) for hit in raw.get("results", [])][:limit]

    def cited_by(self, result_url: str, limit: int = 10) -> list[dict]:
        raw = self._call({"cited_by_url": result_url, "limit": limit})
        return [_parse_scholar_hit(hit) for hit in raw.get("results", [])][:limit]

    def related(self, result_url: str, limit: int = 10) -> list[dict]:
        raw = self._call({"related_url": result_url, "limit": limit})
        return [_parse_scholar_hit(hit) for hit in raw.get("results", [])][:limit]


def _parse_scholar_hit(hit: dict) -> dict:
    return {
        "title": hit.get("title"),
        "authors": hit.get("authors"),
        "year": hit.get("year"),
        "snippet": hit.get("snippet"),
        "result_url": hit.get("url") or hit.get("link"),
        "cited_by_count": hit.get("cited_by_count"),
        "cited_by_link": hit.get("cited_by_link"),
        "related_articles_link": hit.get("related_articles_link"),
        "lane": "B",
        "doi": None,  # resolved later via DiscoveryClient.resolve_doi (Stage 2)
    }


class LiveUnlockerClient:
    """
    Lane C: fetch_public_page(), verbatim from proposal section 7, wrapped
    with the allowlist + rate-limit + cache rules from section 6.
    `cache_get`/`cache_set` are injected so this stays storage-agnostic
    (SQLAlchemy session in app/db.py backs them in routers/pipeline code).
    """

    def __init__(self, cache_get=None, cache_set=None):
        self.api_key = settings.bright_data_api_key
        self.zone = settings.bright_data_unlocker_zone
        self._limiter = RateLimiter(settings.fetch_rate_limit_seconds)
        self._allowlist = _load_allowlist()
        self.cache_get = cache_get or (lambda _url_hash: None)
        self.cache_set = cache_set or (lambda _url_hash, _url, _body: None)

    def _is_allowed(self, url: str) -> bool:
        domain = urlparse(url).netloc.lower()
        return any(domain == d or domain.endswith(f".{d}") for d in self._allowlist)

    @retry(wait=wait_exponential(multiplier=1, min=2, max=20), stop=stop_after_attempt(3))
    def _request(self, url: str) -> str:
        r = httpx.post(
            "https://api.brightdata.com/request",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={"zone": self.zone, "url": url, "format": "raw"},
            timeout=_TIMEOUT,
        )
        r.raise_for_status()
        return r.text

    def fetch(self, url: str) -> str:
        if not self._is_allowed(url):
            raise PermissionError(
                f"{url} is not on config/allowlist.yaml -- refusing to fetch "
                "(proposal section 6, rule 3: reject any other URL in code)."
            )
        url_hash = hashlib.sha256(url.encode()).hexdigest()
        cached = self.cache_get(url_hash)
        if cached is not None:
            return cached
        self._limiter.wait(urlparse(url).netloc)
        body = self._request(url)
        self.cache_set(url_hash, url, body)
        return body
