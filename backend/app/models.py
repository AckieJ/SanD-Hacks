"""
ORM models. Field-for-field match to db/schema.sql (the Tiger Data /
Postgres + pgvector production schema from the proposal, section 9),
except embeddings are JSON here for cross-DB dev convenience -- see db.py.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Text, Integer, Float, ForeignKey, DateTime, JSON
)
from sqlalchemy.orm import relationship

from app.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Workspace(Base):
    __tablename__ = "workspaces"
    id = Column(String, primary_key=True, default=_uuid)
    question = Column(Text, nullable=False)
    parsed = Column(JSON, nullable=True)       # Stage 1 output
    status = Column(String, default="created")  # created|discovering|extracting|ready|error
    created_at = Column(DateTime, default=_now)

    papers = relationship("Paper", back_populates="workspace", cascade="all, delete-orphan")


class Paper(Base):
    __tablename__ = "papers"
    id = Column(String, primary_key=True, default=_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    doi = Column(String, nullable=True, index=True)
    title = Column(Text, nullable=False)
    year = Column(Integer, nullable=True)
    authors = Column(Text, nullable=True)
    venue = Column(Text, nullable=True)
    url = Column(Text, nullable=True)
    license = Column(String, nullable=True)
    text_level = Column(String, default="abstract")  # "full" | "abstract"
    full_text = Column(Text, nullable=True)
    abstract = Column(Text, nullable=True)
    retraction_status = Column(String, nullable=True)
    cited_by_count = Column(Integer, nullable=True)
    embedding = Column(JSON, nullable=True)  # list[float]

    workspace = relationship("Workspace", back_populates="papers")
    sources = relationship("PaperSource", back_populates="paper", cascade="all, delete-orphan")
    claims = relationship("Claim", back_populates="paper", cascade="all, delete-orphan")
    score = relationship("PaperScore", back_populates="paper", uselist=False, cascade="all, delete-orphan")


class PaperSource(Base):
    __tablename__ = "paper_sources"
    id = Column(String, primary_key=True, default=_uuid)
    paper_id = Column(String, ForeignKey("papers.id"), nullable=False)
    lane = Column(String, nullable=False)   # "A" | "B" | "C" | "D"
    query = Column(Text, nullable=True)
    found_at = Column(DateTime, default=_now)

    paper = relationship("Paper", back_populates="sources")


class Claim(Base):
    __tablename__ = "claims"
    id = Column(String, primary_key=True, default=_uuid)
    paper_id = Column(String, ForeignKey("papers.id"), nullable=False)
    claim_text = Column(Text, nullable=False)
    intervention = Column(Text, nullable=True)
    outcome = Column(Text, nullable=True)
    outcome_family = Column(Text, nullable=True)
    direction = Column(String, nullable=True)       # increase|decrease|no_effect|mixed
    significance = Column(String, nullable=True)     # significant|not_significant|not_reported
    effect_size = Column(Text, nullable=True)
    population = Column(Text, nullable=True)
    sample_n = Column(Integer, nullable=True)
    design = Column(Text, nullable=True)
    duration = Column(Text, nullable=True)
    measure = Column(Text, nullable=True)
    limitations = Column(Text, nullable=True)
    quote = Column(Text, nullable=False)
    location = Column(Text, nullable=True)
    embedding = Column(JSON, nullable=True)

    paper = relationship("Paper", back_populates="claims")


class ClaimEdge(Base):
    __tablename__ = "claim_edges"
    id = Column(String, primary_key=True, default=_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    claim_a = Column(String, ForeignKey("claims.id"), nullable=False)
    claim_b = Column(String, ForeignKey("claims.id"), nullable=False)
    label = Column(String, nullable=False)   # see pipeline/verify.py Label enum
    factors = Column(JSON, nullable=True)    # list[str]
    confidence = Column(Float, nullable=True)
    reason = Column(Text, nullable=True)
    quotes = Column(JSON, nullable=True)     # {"a": "...", "b": "..."}


class PaperScore(Base):
    __tablename__ = "paper_scores"
    paper_id = Column(String, ForeignKey("papers.id"), primary_key=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    relevance = Column(Float, nullable=False)
    sector = Column(Integer, nullable=True)
    angle = Column(Float, nullable=True)
    radius = Column(Float, nullable=True)
    parent_paper = Column(String, nullable=True)

    paper = relationship("Paper", back_populates="score")


class Flag(Base):
    __tablename__ = "flags"
    id = Column(String, primary_key=True, default=_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    kind = Column(String, nullable=False)  # "limitation" | "weak_claim" | "gap"
    description = Column(Text, nullable=False)
    claim_ids = Column(JSON, nullable=True)


class FetchCache(Base):
    __tablename__ = "fetch_cache"
    url_hash = Column(String, primary_key=True)
    url = Column(Text, nullable=False)
    fetched_at = Column(DateTime, default=_now)
    body = Column(Text, nullable=True)


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(String, primary_key=True, default=_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    cited_claims = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=_now)
