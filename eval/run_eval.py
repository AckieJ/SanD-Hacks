"""
Section 15, "Validation". Run with:
    cd backend && RESEARCHLENS_MODE=mock python ../eval/run_eval.py

Runs the pipeline once, compares every produced claim_edges row against
eval/gold_set.csv by paper-title pair, and prints exactly the numbers
section 15 asks for: label agreement, quote pass rate, full-text vs
abstract-only share, and sources per lane -- plus the "one honest number"
for a closing slide (section 15, point 4).

NOTE: this gold_set.csv was built by tracing the mock verification rules
in clients/mock.py (see the comment at the top of tests/test_pipeline_end_to_end.py)
-- it validates that the harness works, not that the mock labels are
"correct" research judgments. On a real run with real papers and Gemini,
label the gold set BEFORE looking at pipeline output, per section 15 step 1.
"""
import csv
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "backend"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app import models
from app.pipeline.orchestrator import create_workspace, run_full_pipeline
from app.pipeline.quote_check import quote_is_verbatim

GOLD_PATH = pathlib.Path(__file__).resolve().parent / "gold_set.csv"


def load_gold() -> dict[tuple[str, str], str]:
    gold = {}
    with open(GOLD_PATH) as f:
        for row in csv.DictReader(f):
            key = tuple(sorted([row["paper_a_title"], row["paper_b_title"]]))
            gold[key] = row["gold_label"]
    return gold


def main():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()

    ws = create_workspace(db, "Do AI tutors improve learning?")
    run_full_pipeline(db, ws.id)

    papers = {p.id: p for p in db.query(models.Paper).filter_by(workspace_id=ws.id).all()}
    claims = {c.id: c for c in db.query(models.Claim).join(models.Paper).filter(models.Paper.workspace_id == ws.id).all()}
    edges = db.query(models.ClaimEdge).filter_by(workspace_id=ws.id).all()
    sources = db.query(models.PaperSource).join(models.Paper).filter(models.Paper.workspace_id == ws.id).all()

    gold = load_gold()
    matched, total_checked = 0, 0
    for e in edges:
        title_a = papers[claims[e.claim_a].paper_id].title
        title_b = papers[claims[e.claim_b].paper_id].title
        key = tuple(sorted([title_a, title_b]))
        if key in gold:
            total_checked += 1
            if gold[key] == e.label:
                matched += 1

    quote_checks = [
        quote_is_verbatim(c.quote, papers[c.paper_id].full_text or papers[c.paper_id].abstract)
        for c in claims.values()
    ]
    quote_pass_rate = sum(quote_checks) / len(quote_checks) if quote_checks else 0.0

    full_text_n = sum(1 for p in papers.values() if p.text_level == "full")
    abstract_n = len(papers) - full_text_n

    lane_counts: dict[str, int] = {}
    for s in sources:
        lane_counts[s.lane] = lane_counts.get(s.lane, 0) + 1

    print(f"Label agreement: matched {matched} of {total_checked} hand-labeled pairs")
    print(f"Quote verbatim pass rate: {quote_pass_rate:.0%} ({sum(quote_checks)}/{len(quote_checks)})")
    print(f"Full text vs abstract-only: {full_text_n} full / {abstract_n} abstract-only "
          f"(of {len(papers)} papers)")
    print(f"Sources per lane: {lane_counts}")
    print()
    print(f"Closing-slide number: matched {matched} of {total_checked} hand-labeled pairs")


if __name__ == "__main__":
    main()
