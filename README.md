# ResearchLens — backend

A working implementation of the proposal: a claim-level evidence graph
over a research question, with retrieval from OpenAlex/Crossref/Europe
PMC, Google Scholar via Bright Data, and allowlisted open-access pages;
Gemini-based extraction and verification; a radial relevance graph; and a
GraphRAG chat over claim quotes.

## What's real here vs. what needs your keys

Every pipeline stage (1 through 11) is implemented with real logic:
de-duplication (DOI + trigram title similarity), code-level verbatim
quote validation, vector-similarity claim matching, the relevance/layout
formula, flags/gaps, new-paper impact evaluation, and GraphRAG chat.
That logic is identical in mock and live mode — nothing about *how the
pipeline works* changes when you add API keys.

What differs by mode (`RESEARCHLENS_MODE` in `.env`):

- **`mock`** (default): uses `app/clients/mock.py`, a hand-authored set of
  6 fixture papers and a deterministic fake Gemini client. No API keys,
  no network, runs anywhere. This is what `pytest` and `eval/run_eval.py`
  exercise. Good for development, demos, and CI.
- **`live`**: uses `app/clients/discovery_live.py`, `bright_data_live.py`,
  and `gemini_live.py` — real HTTP calls to OpenAlex/Crossref/Europe PMC,
  Bright Data, and Gemini. Needs the keys in `.env.example`. I could not
  test these against the real services from the sandbox I built this in
  (no network egress to those hosts there), so smoke-test them yourself
  per proposal section 7 before relying on them for a demo.

## Quickstart (mock mode, zero setup)

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # RESEARCHLENS_MODE=mock is already the default
uvicorn app.main:app --reload
```

Then:
```bash
curl -X POST localhost:8000/workspaces \
  -H 'Content-Type: application/json' \
  -d '{"question":"Do AI tutors improve learning?"}'
# -> {"id": "...", "status": "ready"}   (mock mode runs the pipeline inline)

curl localhost:8000/workspaces/<id>/graph
curl -X POST localhost:8000/workspaces/<id>/chat -d '{"question":"..."}'
```

Run the tests (13 tests, all pure logic + one full pipeline run):
```bash
pytest tests/ -v
```

Run the validation harness from section 15:
```bash
RESEARCHLENS_MODE=mock python ../eval/run_eval.py
```

## Going live

1. **Bright Data** (proposal section 7): create an account, a Web
   Unlocker zone, and open the Google Scholar scraper in the playground
   to confirm field names before relying on `bright_data_live.py` — their
   dashboard is the source of truth and can drift from what's coded here.
2. **Gemini**: get an API key, set `GEMINI_API_KEY` and `GEMINI_MODEL`.
3. **Allowlist** (`backend/app/config/allowlist.yaml`): add your demo
   topic's open-access publisher domains, and check each one's
   `robots.txt` and terms first — this file existing is not permission
   (proposal section 6, rule 2).
4. Flip `RESEARCHLENS_MODE=live` in `.env`.
5. **Database**: point `DATABASE_URL` at a real Postgres instance (Tiger
   Data) and run `db/schema.sql` against it, with the `vector` extension
   available. The dev ORM stores embeddings as JSON for zero-setup
   SQLite; swapping to native `pgvector` means changing `app/db.py`'s
   engine URL and `app/vector_math.py::nearest()` to an `ORDER BY
   embedding <=> :q` query — nothing in `pipeline/` needs to change.
6. **Jobs**: run Redis + an RQ worker (`rq worker -u $REDIS_URL
   researchlens`) for `live` mode's async job queue; `mock` mode doesn't
   need either since it runs inline.

## Deploying to Vultr (proposal section 13)

```bash
# On a fresh Ubuntu VM, ports 80/443 open:
git clone <your-repo> && cd researchlens
cp backend/.env.example backend/.env   # fill in real keys, RESEARCHLENS_MODE=live
docker compose up -d                   # api + worker + redis
```
Put Caddy or nginx in front for TLS; keep the database external
(managed Tiger Data/Postgres), per the architecture in section 4.

## Layout

```
backend/
  app/
    clients/        # one file per external dependency + mock.py fixtures
    pipeline/        # stages 1–11: dedup, matching, scoring, flags, orchestrator
    routers/         # the section-10 endpoints
    config/allowlist.yaml
  tests/             # pytest — runs entirely in mock mode
db/schema.sql         # production Postgres + pgvector schema (section 9)
eval/                 # gold_set.csv + run_eval.py (section 15)
docker-compose.yml
```

## Known gaps vs. the full proposal

- No frontend server here — see the published interactive demo (mock
  data, same 6 fixture papers) for what the UI looks like and behaves
  like; wiring it to this API is mechanical (swap the mock `fetch()`
  calls for real endpoint calls) but not done.
- `bright_data_live.py`'s field mapping is best-effort against the
  proposal's description of the ScraperAPI response — verify against
  Bright Data's actual dashboard before a live demo (see "Going live" #1).
- No auth — the proposal describes "auth-less demo sessions," which this
  matches, but don't deploy this publicly without adding some.
