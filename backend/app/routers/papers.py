from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.db import get_db
from app.pipeline.orchestrator import evaluate_new_paper

router = APIRouter(tags=["papers"])


@router.get("/papers/{paper_id}")
def get_paper(paper_id: str, db: Session = Depends(get_db)):
    paper = db.get(models.Paper, paper_id)
    if not paper:
        raise HTTPException(404, "paper not found")
    claims = db.query(models.Claim).filter_by(paper_id=paper_id).all()
    return {
        "id": paper.id, "title": paper.title, "year": paper.year, "authors": paper.authors,
        "venue": paper.venue, "doi": paper.doi, "text_level": paper.text_level,
        "retraction_status": paper.retraction_status,
        "claims": [{
            "id": c.id, "claim_text": c.claim_text, "quote": c.quote, "location": c.location,
            "direction": c.direction, "significance": c.significance, "population": c.population,
            "duration": c.duration, "measure": c.measure, "limitations": c.limitations,
        } for c in claims],
    }


@router.get("/edges/{edge_id}")
def get_edge(edge_id: str, db: Session = Depends(get_db)):
    edge = db.get(models.ClaimEdge, edge_id)
    if not edge:
        raise HTTPException(404, "edge not found")
    claim_a = db.get(models.Claim, edge.claim_a)
    claim_b = db.get(models.Claim, edge.claim_b)

    def side(c):
        return None if c is None else {
            "claim_text": c.claim_text, "population": c.population, "sample_n": c.sample_n,
            "design": c.design, "duration": c.duration, "measure": c.measure,
            "direction": c.direction, "significance": c.significance, "quote": c.quote,
        }

    return {
        "label": edge.label, "confidence": edge.confidence, "reason": edge.reason,
        "factors": edge.factors, "a": side(claim_a), "b": side(claim_b),
    }


@router.post("/workspaces/{workspace_id}/papers")
def add_paper(workspace_id: str, req: schemas.NewPaperRequest, db: Session = Depends(get_db)):
    ws = db.get(models.Workspace, workspace_id)
    if not ws:
        raise HTTPException(404, "workspace not found")
    return evaluate_new_paper(db, workspace_id, req.title, req.full_text,
                               {"year": req.year, "authors": req.authors})
