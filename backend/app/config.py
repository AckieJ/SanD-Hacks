"""
Central settings. Everything that differs between a laptop, CI, and the
Vultr box lives here and only here -- nothing else in the codebase should
read os.environ directly.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    researchlens_mode: str = "mock"  # "mock" | "live"

    database_url: str = "sqlite:///./researchlens.db"
    redis_url: str = "redis://localhost:6379/0"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-pro"
    gemini_embed_model: str = "text-embedding-004"
    gemini_embed_dim: int = 768

    bright_data_api_key: str = ""
    bright_data_unlocker_zone: str = "researchlens_unlocker"
    bright_data_scholar_id: str = ""

    openalex_email: str = "you@example.com"

    # Tunables from the proposal (section 9, stage 6/9) -- kept here, not
    # buried in pipeline code, so they can be adjusted without a deploy.
    match_similarity_threshold: float = 0.80
    dedup_title_similarity_threshold: float = 0.90
    max_candidate_pairs_per_workspace: int = 300
    max_candidates_before_ranking: int = 150
    keep_top_n_papers: int = 40
    relevance_weight_cosine: float = 0.45
    relevance_weight_outcome: float = 0.20
    relevance_weight_citation: float = 0.20
    relevance_weight_evidence_strength: float = 0.15
    fetch_cache_ttl_days: int = 7
    fetch_rate_limit_seconds: float = 1.0

    @property
    def is_mock(self) -> bool:
        return self.researchlens_mode.lower() != "live"


@lru_cache
def get_settings() -> Settings:
    return Settings()
