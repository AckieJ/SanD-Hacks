from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.db import get_db
from app.pipeline.orchestrator import chat as run_chat

router = APIRouter(tags=["chat"])


@router.post("/workspaces/{workspace_id}/chat")
def chat_endpoint(workspace_id: str, req: schemas.ChatRequest, db: Session = Depends(get_db)):
    if not db.get(models.Workspace, workspace_id):
        raise HTTPException(404, "workspace not found")
    return run_chat(db, workspace_id, req.question)
