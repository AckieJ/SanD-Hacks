"""
Ties stages 0-11 together against the SQLAlchemy models. Each function is
small and independently callable (and independently tested in tests/) --
this file is glue, not logic. workers/tasks.py calls `run_full_pipeline`
as one RQ job; routers/workspaces.py calls the same function synchronously
in mock mode for a snappy local demo.
"""
from __future__ import annotations
import uuid
from sqlalchemy.orm import Session

from app import models
from app.factory import get_clients
from app.pipeline.dedup import dedupe_papers
from app.pipeline.quote_check import validate_claims
from app.pipeline.matching import candidate_pairs
from app.pipeline.scoring import compute_relevance, compute_layout
from app.pipeline import flags as flags_mod


def _claim_embedding_text(c: dict) -> str:
    """
    What gets embedded for matching (Stage 5). A real semantic embedding of
    "AI tutoring improved middle schoolers' math scores" and "chatbot
    tutoring showed no effect on undergrad retention" would land close
    together -- both are *topically* about AI tutoring and a learning
    outcome -- even though the population and specific measure differ.
    That's the point of Stage 6's threshold: find same-topic claims first;
    Stage 7's comparability checklist (population/duration/measure) is a
    separate, later judgment, not baked into the similarity score.

    The mock embedder (clients/mock.py, _hash_embed) is a crude bag-of-words
    hash with no real semantics, so to approximate that "topically close
    despite different wording" behavior, outcome_family and intervention --
    the two fields Stage 6 already hard-filters on -- are repeated to
    dominate the vector; claim_text and the comparability fields contribute
    the rest. A real Gemini embedding would need none of this weighting.
    """
    topical = f"{c.get('outcome_family', '')} " * 5 + f"{c.get('intervention', '')} " * 5
    detail = " ".join(filter(None, [
        c.get("claim_text"), c.get("population"), c.get("duration"), c.get("measure"),
    ]))
    return topical + detail


def create_workspace(db: Session, question: str) -> models.Workspace:
    ws = models.Workspace(question=question, status="created")
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return ws


def run_discovery_and_retrieval(db: Session, workspace: models.Workspace) -> list[models.Paper]:
    """Stages 1-3."""
    clients = get_clients()
    ai, discovery, scholar, unlocker = clients["ai"], clients["discovery"], clients["scholar"], clients["unlocker"]

    workspace.parsed = ai.understand_question(workspace.question)
    workspace.status = "discovering"
    db.commit()

    candidates: list[dict] = []
    for q in workspace.parsed["search_queries"]:
        candidates.extend(discovery.search(q))           # Lane A
        candidates.extend(scholar.search(q))              # Lane B
    merged = dedupe_papers(candidates)                     # Stage 2

    papers = []
    for m in merged:
        full_text, text_level = None, "abstract"
        oa_url = m.get("oa_url")
        if oa_url:
            try:
                full_text = unlocker.fetch(oa_url)          # Lane C
                text_level = "full"
            except (FileNotFoundError, PermissionError):
                pass
        paper = models.Paper(
            workspace_id=workspace.id, doi=m.get("doi"), title=m["title"],
            year=m.get("year"), authors=m.get("authors"), venue=m.get("venue"),
            url=oa_url, text_level=text_level, full_text=full_text,
            abstract=m.get("abstract"), cited_by_count=m.get("cited_by_count"),
        )
        db.add(paper)
        db.flush()
        for lane in m.get("sources", []):
            db.add(models.PaperSource(paper_id=paper.id, lane=lane))
        papers.append(paper)
    db.commit()
    return papers


def run_extraction(db: Session, workspace: models.Workspace, papers: list[models.Paper]) -> list[models.Claim]:
    """Stage 4 (+ validation) and Stage 5 (embed)."""
    ai = get_clients()["ai"]
    all_claims = []
    for paper in papers:
        source_text = paper.full_text or paper.abstract
        raw_claims = ai.extract_claims(source_text or "", {"title": paper.title, "year": paper.year})
        passing, failing = validate_claims(raw_claims, source_text)
        # Proposal Stage 4 done-when: >=90% pass on a test paper. Failing
        # claims are dropped rather than silently kept with a bad quote.
        for c in passing:
            claim = models.Claim(
                paper_id=paper.id, claim_text=c["claim_text"], intervention=c.get("intervention"),
                outcome=c.get("outcome"), outcome_family=c.get("outcome_family"),
                direction=c.get("direction"), significance=c.get("significance"),
                effect_size=c.get("effect_size"), population=c.get("population"),
                sample_n=c.get("sample_n"), design=c.get("design"), duration=c.get("duration"),
                measure=c.get("measure"), limitations=c.get("limitations"), quote=c["quote"],
                location=c.get("location"),
            )
            claim.embedding = ai.embed(_claim_embedding_text(c))
            db.add(claim)
            all_claims.append(claim)
    db.commit()
    workspace.status = "extracting"
    db.commit()
    return all_claims


def run_matching_and_verification(db: Session, workspace: models.Workspace, claims: list[models.Claim]) -> list[models.ClaimEdge]:
    """Stage 6 (match) + Stage 7 (verify)."""
    ai = get_clients()["ai"]
    claim_dicts = [{
        "id": c.id, "paper_id": c.paper_id, "outcome_family": c.outcome_family,
        "intervention": c.intervention, "embedding": c.embedding,
        "population": c.population, "duration": c.duration, "measure": c.measure,
        "direction": c.direction, "significance": c.significance,
        "location": c.location, "quote": c.quote, "claim_text": c.claim_text,
    } for c in claims]
    by_id = {c["id"]: c for c in claim_dicts}

    pairs = candidate_pairs(claim_dicts)
    edges = []
    for pair in pairs:
        verdict = ai.verify_relationship(by_id[pair["claim_a"]], by_id[pair["claim_b"]])
        if verdict["label"] == "genuine_contradiction":
            # Stage 7: "Run a second self-check pass on every genuine_contradiction."
            recheck = ai.verify_relationship(by_id[pair["claim_b"]], by_id[pair["claim_a"]])
            if recheck["label"] != "genuine_contradiction":
                verdict = {**verdict, "label": "unresolved",
                           "reason": verdict["reason"] + " (self-check did not confirm; downgraded.)"}
        edge = models.ClaimEdge(
            workspace_id=workspace.id, claim_a=pair["claim_a"], claim_b=pair["claim_b"],
            label=verdict["label"], factors=verdict.get("factors"),
            confidence=verdict.get("confidence"), reason=verdict.get("reason"),
            quotes={"a": by_id[pair["claim_a"]]["quote"], "b": by_id[pair["claim_b"]]["quote"]},
        )
        db.add(edge)
        edges.append(edge)
    db.commit()
    return edges


def run_scoring(db: Session, workspace: models.Workspace, papers: list[models.Paper], claims: list[models.Claim]) -> None:
    """Stage 9."""
    ai = get_clients()["ai"]
    question_embedding = ai.embed(workspace.question)
    sub_questions = workspace.parsed.get("sub_questions", ["General"])
    target_families = set(workspace.parsed.get("outcome_families", []))
    max_citations = max((p.cited_by_count or 0 for p in papers), default=0)

    claims_by_paper: dict[str, list[models.Claim]] = {}
    for c in claims:
        claims_by_paper.setdefault(c.paper_id, []).append(c)

    scored = []
    for i, paper in enumerate(papers):
        paper_claims = claims_by_paper.get(paper.id, [])
        paper_outcome_families = {c.outcome_family for c in paper_claims if c.outcome_family}
        # average claim embedding stands in for "paper_claims" embedding in the formula
        embeds = [c.embedding for c in paper_claims if c.embedding]
        avg_embedding = (
            [sum(vals) / len(vals) for vals in zip(*embeds)] if embeds else []
        )
        relevance = compute_relevance(
            paper={"outcome_families": list(paper_outcome_families), "design": (paper_claims[0].design if paper_claims else None),
                   "sample_n": (paper_claims[0].sample_n if paper_claims else None), "text_level": paper.text_level,
                   "cited_by_count": paper.cited_by_count or 0},
            question_embedding=question_embedding,
            paper_claim_embedding=avg_embedding,
            target_outcome_families=target_families,
            max_citation_count_in_library=max_citations,
        )
        scored.append({"id": paper.id, "relevance": relevance, "sector": i % max(len(sub_questions), 1)})

    layout = compute_layout(scored, num_sectors=len(sub_questions), jitter_seed=hash(workspace.id) % (2**31))
    for s in scored:
        existing = db.get(models.PaperScore, s["id"])
        if existing:
            db.delete(existing)
            db.flush()
        db.add(models.PaperScore(
            paper_id=s["id"], workspace_id=workspace.id, relevance=s["relevance"],
            sector=s["sector"], angle=layout[s["id"]]["angle"], radius=layout[s["id"]]["radius"],
        ))
    db.commit()


def run_flags(db: Session, workspace: models.Workspace, papers: list[models.Paper], claims: list[models.Claim]) -> list[models.Flag]:
    """Stage 8."""
    papers_by_id = {p.id: {"text_level": p.text_level, "retraction_status": p.retraction_status} for p in papers}
    claim_dicts = [{
        "id": c.id, "paper_id": c.paper_id, "claim_text": c.claim_text,
        "limitations": c.limitations, "sample_n": c.sample_n,
    } for c in claims]

    records = (
        flags_mod.stated_limitations(claim_dicts)
        + flags_mod.weak_claims(claim_dicts, papers_by_id)
        + flags_mod.library_gaps(
            workspace.parsed.get("sub_questions", []),
            {c.outcome_family for c in claims if c.outcome_family},
            claim_dicts,
        )
    )
    out = []
    for r in records:
        f = models.Flag(workspace_id=workspace.id, kind=r["kind"], description=r["description"], claim_ids=r["claim_ids"])
        db.add(f)
        out.append(f)
    db.commit()
    return out


def run_full_pipeline(db: Session, workspace_id: str) -> None:
    """One call = stages 1 through 9. Stage 10 (new paper) and 11 (chat)
    are separate entry points below since they run on-demand, not once."""
    workspace = db.get(models.Workspace, workspace_id)
    try:
        papers = run_discovery_and_retrieval(db, workspace)
        claims = run_extraction(db, workspace, papers)
        run_matching_and_verification(db, workspace, claims)
        run_scoring(db, workspace, papers, claims)
        run_flags(db, workspace, papers, claims)
        workspace.status = "ready"
    except Exception as exc:  # pragma: no cover - defensive; surfaced via /status
        workspace.status = "error"
        workspace.parsed = {**(workspace.parsed or {}), "error": str(exc)}
        raise
    finally:
        db.commit()


def evaluate_new_paper(db: Session, workspace_id: str, title: str, full_text: str, meta: dict) -> dict:
    """Stage 10: run extraction + matching + verification for one new paper
    against the existing graph, and summarize impact per claim."""
    ai = get_clients()["ai"]
    workspace = db.get(models.Workspace, workspace_id)

    paper = models.Paper(workspace_id=workspace_id, title=title, full_text=full_text,
                          text_level="full", year=meta.get("year"), authors=meta.get("authors"))
    db.add(paper)
    db.flush()

    raw_claims = ai.extract_claims(full_text, {"title": title, "year": meta.get("year")})
    passing, _ = validate_claims(raw_claims, full_text)

    existing_claims = db.query(models.Claim).join(models.Paper).filter(models.Paper.workspace_id == workspace_id).all()
    existing_dicts = [{
        "id": c.id, "paper_id": c.paper_id, "outcome_family": c.outcome_family,
        "intervention": c.intervention, "embedding": c.embedding, "population": c.population,
        "duration": c.duration, "measure": c.measure, "direction": c.direction,
        "significance": c.significance, "location": c.location, "quote": c.quote,
        "claim_text": c.claim_text,
    } for c in existing_claims]

    impact_report = []
    for c in passing:
        new_claim = models.Claim(paper_id=paper.id, claim_text=c["claim_text"],
                                  outcome_family=c.get("outcome_family"), intervention=c.get("intervention"),
                                  direction=c.get("direction"), significance=c.get("significance"),
                                  population=c.get("population"), duration=c.get("duration"),
                                  measure=c.get("measure"), quote=c["quote"], location=c.get("location"))
        new_claim.embedding = ai.embed(_claim_embedding_text(c))
        db.add(new_claim)
        db.flush()

        new_dict = {"id": new_claim.id, "paper_id": paper.id, "outcome_family": new_claim.outcome_family,
                    "intervention": new_claim.intervention, "embedding": new_claim.embedding,
                    "population": new_claim.population, "duration": new_claim.duration,
                    "measure": new_claim.measure, "direction": new_claim.direction,
                    "significance": new_claim.significance, "location": new_claim.location,
                    "quote": new_claim.quote, "claim_text": new_claim.claim_text}

        for existing in existing_dicts:
            pairs = candidate_pairs([new_dict, existing])
            if not pairs:
                continue
            verdict = ai.verify_relationship(new_dict, existing)
            edge = models.ClaimEdge(workspace_id=workspace_id, claim_a=new_claim.id, claim_b=existing["id"],
                                     label=verdict["label"], factors=verdict.get("factors"),
                                     confidence=verdict.get("confidence"), reason=verdict.get("reason"),
                                     quotes={"a": new_dict["quote"], "b": existing["quote"]})
            db.add(edge)
            impact_kind = {
                "supports_compatible": "strengthens", "genuine_contradiction": "challenges",
                "apparent_contradiction": "qualifies", "related_not_comparable": "unrelated",
                "unresolved": "leaves_unanswered",
            }[verdict["label"]]
            impact_report.append({
                "new_claim": new_claim.claim_text, "existing_claim": existing["claim_text"],
                "impact": impact_kind, "reason": verdict.get("reason"),
            })
    db.commit()
    return {"paper_id": paper.id, "impact": impact_report}


def chat(db: Session, workspace_id: str, question: str) -> dict:
    """Stage 11: embed question, vector-search claims, answer from quotes only."""
    from app.vector_math import nearest
    ai = get_clients()["ai"]
    q_embedding = ai.embed(question)
    claims = db.query(models.Claim).join(models.Paper).filter(models.Paper.workspace_id == workspace_id).all()
    candidates = [(c.id, c.embedding or []) for c in claims]
    top = nearest(q_embedding, candidates, k=6)
    top_ids = {cid for cid, _ in top}
    context = [{"id": c.id, "claim_text": c.claim_text, "quote": c.quote} for c in claims if c.id in top_ids]

    result = ai.chat(question, context)
    msg = models.ChatMessage(workspace_id=workspace_id, role="assistant",
                              content=result["answer"], cited_claims=result.get("cited_claim_ids"))
    db.add(msg)
    db.commit()
    return result
