# ResearchLens — Scientific evidence explorer

**GitHub-ready hackathon MVP** based on the two ResearchLens design PDFs. Search scientific literature, extract quote-validated research claims, compare similar findings, visualize a radial evidence graph, inspect limitations, upload PDFs, and ask a source-grounded question.

## Stack

- **React + Vite + Cytoscape.js** frontend.
- **FastAPI** backend, **Redis + RQ** background jobs.
- **Tiger Data (PostgreSQL + pgvector)** remote database, or bundled local pgvector Postgres for development.
- **Gemini** structured claim extraction, embedding, cautious comparison, and grounded chat.
- **OpenAlex + Europe PMC** research discovery; **Bright Data** Scholar scraper and optional Web Unlocker on approved open pages.
- **Vultr** Ubuntu VM, Docker Compose and Nginx for deployment.

## Start in 4 commands

Install Docker Desktop with Docker Compose. From the repository root:

```bash
cp .env.example .env
# Edit .env with your GEMINI_API_KEY, OPENALEX_EMAIL, and optionally Bright Data / Tiger Data credentials.
docker compose up -d --build
docker compose ps
```

Open **http://localhost:8080**. API health: `http://localhost:8080/api/health`. Click **Explore interface with sample data** for an *explicitly fictional*, no-API demo. For actual literature, set GEMINI_API_KEY and search a question. No secrets are required for the fictional sample UI.

> If you use external Tiger Data, replace `DATABASE_URL` with its connection string including `sslmode=require`. The bundled `postgres` service stays unused; you can leave it running. The API creates schema and pgvector extension on startup. The DB user must have permission to create extensions, or run `db/schema.sql` as an admin first.

## Service setup

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for Bright Data, Tiger Data, Gemini, Vultr and GitHub instructions, commands, security notes and test checklist.

## API routes

| Method | Route | Function |
| --- | --- | --- |
| GET | `/api/health` | DB and credential readiness |
| POST | `/api/workspaces` | Multipart `question` and optional `files` PDFs |
| GET | `/api/workspaces/{id}/status` | Job stage / errors |
| GET | `/api/workspaces/{id}/graph` | Papers and claim-level relationship summaries |
| GET | `/api/papers/{id}` | Paper details / verified quotations |
| GET | `/api/edges/{id}` | Source-backed pair comparison |
| GET | `/api/workspaces/{id}/flags` | Collection gaps and limitations |
| POST | `/api/workspaces/{id}/papers` | Incremental PDF evaluation |
| POST | `/api/workspaces/{id}/chat` | Evidence-grounded Q&A |

FastAPI interactive documentation (in Docker network only by default): `/docs` on API port 8000; optionally expose it via Nginx for a local debug setup.

## What works / important limits

- ✅ End-to-end app and Docker build configuration, real API routes, Postgres storage, progress polling and an interactive evidence graph.
- ✅ OpenAlex and Europe PMC discovery; optional Bright Data Google Scholar scraper and allowlisted Web Unlocker.
- ✅ Gemini extraction with **deterministic whitespace-normalized quote validation**. Claims with unverified quotes are discarded.
- ✅ Structured, evidence-cautious comparison. Second model check on possible genuine contradictions. Abstract-only evidence caps confidence.
- ✅ Source-linked paper/edge panels, gaps categorized by type, incremental PDF workflow and workspace-grounded chat.
- ✅ Fictional preview mode that is conspicuously labeled and requires no external services.
- ⚠️ This is an **MVP, not a validated scientific fact-checker**. Matching, recall, study design, retractions and causal conclusions require researcher review. Null results do not disprove positive results. No truth scores.
- ⚠️ Source integrations need live credentials and network tests. Bright Data Scholar datasets can vary in accepted input keys; verify the data schema for *your* dataset in Bright Data and edit `clients/brightdata.py` if necessary.
- ⚠️ The first version ranks paper relevance by approximate retrieval order, not the proposed full weighted semantic relevance formula. Gemini embeddings are saved and used for chat; graph position is a navigation aid.
- ⚠️ Collection gap detection is deliberately conservative. It reports limited coverage, not a global absence of research. DOI resolution and cited-by expansion are not fully implemented.
- ⚠️ The application has **no user accounts**; workspaces and uploaded PDFs are not private. Do not use sensitive unpublished material on a public deployment. Add authentication, rate limits and TLS before public exposure.
- ⚠️ Bright Data calls are disabled by default, both to avoid surprising bills and to require domain policy checks. `ENABLE_FULLTEXT=true` additionally enables allowlisted page retrieval.
- ⚠️ For a sponsor demo, prove live Bright Data and Tiger Data usage and state clearly which data came from which source. The sample UI does not prove those integrations.

## Developer tests

```bash
python -m compileall -q backend
cd frontend && npm install && npm run build
# inside Docker after setup:
docker compose exec api python -c "from db.database import initialize; initialize(); print('schema OK')"
curl http://localhost:8080/api/health
```

## Research ethics

Only fetch publicly accessible material where allowed by site terms and robots policies. Avoid paywall and access control circumvention. Preserve paper attribution/DOI and brief validated quotations. Uploaded PDFs are not redistributed. Results are hypotheses for a human researcher to verify.
