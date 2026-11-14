from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = 'postgresql://researchlens:researchlens@postgres:5432/researchlens'
    redis_url: str = 'redis://redis:6379/0'
    gemini_api_key: str = ''
    gemini_model: str = 'gemini-2.5-flash'
    embedding_model: str = 'gemini-embedding-001'
    bright_data_api_key: str = ''
    bright_data_unlocker_zone: str = ''
    bright_data_scholar_id: str = ''
    openalex_email: str = ''
    upload_dir: str = '/app/uploads'
    max_papers: int = 18
    max_pairs: int = 35
    enable_bright_data: bool = False
    enable_fulltext: bool = False
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

@lru_cache
def settings():
    return Settings()
