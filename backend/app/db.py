"""
DB engine/session setup.

Dev/test default is SQLite so the whole pipeline runs with zero setup.
Production target is Tiger Data (Postgres + pgvector) using db/schema.sql
verbatim from the proposal. The ORM models below store embeddings as JSON
arrays so the same code runs on both; cosine similarity is computed in
Python via app/vector_math.py. At real scale (hundreds of workspaces),
swap that for a native pgvector column + the HNSW index in db/schema.sql
and an ORDER BY embedding <=> :q query -- the call sites in pipeline/
are already isolated in vector_math.nearest() for exactly that swap.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import get_settings

settings = get_settings()

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app import models  # noqa: F401  (register models on Base)
    Base.metadata.create_all(bind=engine)
