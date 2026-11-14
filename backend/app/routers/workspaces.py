"""
Section 10 endpoints, minus /workspaces/{id}/papers and /workspaces/{id}/chat
which live in papers.py and chat.py.

In mock mode the full pipeline runs synchronously inline (it's instant --
no real network calls) so `curl`-ing this is a complete local demo with no
Redis/worker process needed. In live mode, POST /workspaces enqueues an RQ
job (workers/tasks.py) and the frontend polls /status.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.db import get_db
from app.config import get_settings
from app.pipeline.orchestrator import create_workspace, run_full_pipeline

router = APIRouter(prefix="/workspaces", tags=["workspaces"])
settings = get_settings()


@router.post("", response_model=schemas.WorkspaceOut)
def create(req: schemas.CreateWorkspaceRequest, db: Session = Depends(get_db)):
    ws = create_workspace(db, req.question)
    if settings.is_mock:
        run_full_pipeline(db, ws.id)
        db.refresh(ws)
    else:
        from app.workers.tasks import run_pipeline_job
        run_pipeline_job.delay(ws.id)  # type: ignore[attr-defined]
    return ws


@router.get("/{workspace_id}/status")
def status(workspace_id: str, db: Session = Depends(get_db)):
    ws = db.get(models.Workspace, workspace_id)
    if not ws:
        raise HTTPException(404, "workspace not found")
    counts = {
        "papers": db.query(models.Paper).filter_by(workspace_id=workspace_id).count(),
        "claims": db.query(models.Claim).join(models.Paper).filter(models.Paper.workspace_id == workspace_id).count(),
        "edges": db.query(models.ClaimEdge).filter_by(workspace_id=workspace_id).count(),
    }
    return {"status": ws.status, "counts": counts, "error": (ws.parsed or {}).get("error")}


@router.get("/{workspace_id}/graph")
def graph(workspace_id: str, db: Session = Depends(get_db)):
    ws = db.get(models.Workspace, workspace_id)
    if not ws:
        raise HTTPException(404, "workspace not found")
    papers = db.query(models.Paper).filter_by(workspace_id=workspace_id).all()
    scores = {s.paper_id: s for s in db.query(models.PaperScore).filter_by(workspace_id=workspace_id).all()}
    edges = db.query(models.ClaimEdge).filter_by(workspace_id=workspace_id).all()
    claim_to_paper = {c.id: c.paper_id for c in db.query(models.Claim).join(models.Paper).filter(models.Paper.workspace_id == workspace_id).all()}

    return {
        "question": ws.question,
        "sub_questions": (ws.parsed or {}).get("sub_questions", []),
        "nodes": [
            {
                "id": p.id, "title": p.title, "year": p.year, "text_level": p.text_level,
                "relevance": scores[p.id].relevance if p.id in scores else None,
                "angle": scores[p.id].angle if p.id in scores else None,
                "radius": scores[p.id].radius if p.id in scores else None,
                "sector": scores[p.id].sector if p.id in scores else None,
            }
            for p in papers
        ],
        "edges": [
            {
                "id": e.id, "label": e.label, "confidence": e.confidence,
                "paper_a": claim_to_paper.get(e.claim_a), "paper_b": claim_to_paper.get(e.claim_b),
                "claim_a": e.claim_a, "claim_b": e.claim_b,
            }
            for e in edges
        ],
    }


@router.get("/{workspace_id}/flags")
def flags(workspace_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.Flag).filter_by(workspace_id=workspace_id).all()
    return {
        "limitations": [r.description for r in rows if r.kind == "limitation"],
        "weak_claims": [r.description for r in rows if r.kind == "weak_claim"],
        "gaps": [r.description for r in rows if r.kind == "gap"],
    }
