"""Pydantic request/response shapes for the API endpoints (section 10)."""
from pydantic import BaseModel


class CreateWorkspaceRequest(BaseModel):
    question: str


class WorkspaceOut(BaseModel):
    id: str
    question: str
    status: str

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    question: str


class NewPaperRequest(BaseModel):
    title: str
    full_text: str
    year: int | None = None
    authors: str | None = None
