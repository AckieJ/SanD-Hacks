# ResearchLens — accounts, API keys and deployment

This guide is for the **actual files in this repository**, not a generic template. In every case, keep API keys only in `.env` on your machine/server (already ignored by Git). Never add keys to React source or publish your `.env` file.

## 0. Requirements

You need Git, Docker Desktop / Docker Engine with the Compose plugin, a Bright Data account, a Tiger Data account, a Google AI Studio account, and (for deployment) a Vultr account. GitHub is used to host source code. Choose a narrow topic with a few genuinely comparable published studies, and test live retrieval early.

## 1. Google Gemini (AI analysis)

1. Open https://aistudio.google.com/apikey and create a Gemini API key in a project with API access enabled. Review model quotas and billing restrictions.
2. In project `.env`, set `GEMINI_API_KEY=...`.
3. Keep `GEMINI_MODEL=gemini-2.5-flash` unless a model is unavailable for your project/region; consult https://ai.google.dev/gemini-api/docs/models.
4. Keep `EMBEDDING_MODEL=gemini-embedding-001` and 768-dimensional output. The code explicitly requests a 768-dimensional embedding; use a matching `vector(768)` database schema.
5. Restart with `docker compose up -d --build` (or `docker compose restart api worker` for env changes).
6. Search a question and watch `docker compose logs -f worker`. Each claim's quote must appear exactly, after whitespace normalization, in the source text. Do not expect results without a valid Gemini key.

Official references: https://ai.google.dev/gemini-api/docs/structured-output and https://ai.google.dev/gemini-api/docs/embeddings

## 2. Tiger Data (database)

1. Visit https://console.tigerdata.com/ and create an account/project.
2. Click **New service**. Choose a PostgreSQL-backed Tiger Cloud service with vector extensions available; development/free tier if suitable. Avoid plain Postgres without the `vector` extension.
3. Download the generated **database credentials/config file** and keep it private. Tiger Data's setup page states the password may be shown only once.
4. Copy the provided PostgreSQL connection URI into `.env`, for example:

   `DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require`

   If your password contains special URL characters, URL-encode them. Do not use the literal placeholders above.
5. Ensure the service accepts a connection from the Vultr instance (check Tiger firewall/trusted IP controls if enabled). The local development database uses the default `DATABASE_URL` from `.env.example` instead.
6. Enable pgvector if needed using Tiger SQL Editor: `CREATE EXTENSION IF NOT EXISTS vector;`. The backend automatically executes `backend/db/schema.sql` on startup. Run the SQL manually if the account lacks extension-creation privileges.
7. Test in Tiger SQL Editor: `SELECT CURRENT_DATE;` and `SELECT extname FROM pg_extension WHERE extname='vector';`.
8. Confirm that `workspaces`, `papers`, `claims`, `claim_edges`, `flags`, `fetch_cache`, `chat_messages` exist after API startup.

Official guide: https://www.tigerdata.com/docs/get-started/quickstart/create-service

## 3. Bright Data (Google Scholar + optional public pages)

1. Register or sign in at https://brightdata.com/. Review plan and estimated requests; scraping services may incur usage costs.
2. Generate a Bright Data **API token** in the dashboard. Put it in `.env` as `BRIGHT_DATA_API_KEY=`.
3. Under **Web Unlocker**, create an API zone, for example `researchlens_unlocker`. Set `BRIGHT_DATA_UNLOCKER_ZONE` to the actual zone name.
4. Under **Web Scraper API / datasets**, select the **Google Scholar** dataset (if available in your account). Run a sample query in the provider playground. Copy the dataset identifier as `BRIGHT_DATA_SCHOLAR_ID`. Dataset IDs are account/provider dependent; do **not** use the example ID in the uploaded PDFs as a real value.
5. The included client uses `POST https://api.brightdata.com/datasets/v3/scrape?dataset_id=...&format=json` with payload `[{'keyword': query}]`. Verify your dataset's required input field (it might be `keyword`, `url` or another shape). Update the single payload in `backend/clients/brightdata.py` to match the schema shown in your dashboard. For asynchronous-only datasets, implement `trigger` then snapshot polling before enabling.
6. Set `ENABLE_BRIGHT_DATA=true` in `.env`. Until then the API exclusively uses public scholarly APIs and uploaded PDFs.
7. For allowed public full text, verify the domain's `robots.txt`, terms and license first. Explicitly add allowed domains in `backend/clients/brightdata.py` (`allowed()`), and set `ENABLE_FULLTEXT=true`. Start with verified open-access sources; don't scrape paywalls or logins. The client limits a domain to about one request per second per worker and caches fetched text for seven days in Tiger Data.
8. Test Web Unlocker independently (replace the domain with an approved page):

```bash
curl 'https://api.brightdata.com/request' \
  -H "Authorization: Bearer $BRIGHT_DATA_API_KEY" \
  -H 'Content-Type: application/json' \
  --data '{"zone":"researchlens_unlocker","url":"https://www.ncbi.nlm.nih.gov/","format":"raw"}'
```

9. Trigger a paper search through ResearchLens and check that at least one paper has `Bright Data Scholar` in its `sources` field if the scraper integration succeeds. Expect Scholar metadata to require DOI resolution/validation before trusting claims.

Reference docs: https://docs.brightdata.com/api-reference/rest-api/unlocker/unlock-website ; https://github.com/brightdata/skills/blob/main/skills/bright-data-best-practices/references/web-scraper-api.md

**Legal/ethical note:** Bright Data tooling is not permission to ignore site restrictions. Follow permitted access terms and licenses; avoid collecting restricted content.

## 4. Vultr (hosting)

1. Create a Vultr account: https://my.vultr.com/ . Provision an **Ubuntu 24.04 LTS** Cloud Compute VM. A starting point is 2 vCPU / 4 GB RAM; watch worker memory and scale if needed. Choose a region near your users and Tiger Data.
2. Add an SSH public key while provisioning. Attach a firewall group allowing SSH 22 **only from your IP** and HTTP 80 / HTTPS 443 from the public internet. Follow Vultr's documented Firewall Group setup. The Compose app publishes port **8080 by default**, so change `.env` to `HTTP_PORT=80` on Vultr, or put a HTTPS reverse proxy in front of 8080.
3. SSH into the VM:

```bash
ssh ubuntu@YOUR_VULTR_IP
```

4. Install Docker Engine and the Compose plugin from Docker's official Ubuntu instructions (preferred over unverified shell install scripts): https://docs.docker.com/engine/install/ubuntu/ . Confirm `docker --version` and `docker compose version`.
5. Clone your GitHub repo and configure credentials:

```bash
git clone https://github.com/YOUR_USERNAME/researchlens.git
cd researchlens
cp .env.example .env
nano .env
```

6. In `.env`, insert Gemini, Tiger Data, and Bright Data credentials; set `HTTP_PORT=80`; use Tiger Data's `DATABASE_URL`, not the development database. Set `OPENALEX_EMAIL` to a real team contact and verify all credentials. Never commit `.env`.
7. Deploy:

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=80 api worker frontend
curl http://localhost/api/health
```

8. Open `http://YOUR_VULTR_IP/` and test the application. **For public use, add HTTPS with your DNS domain and a reverse proxy** (Caddy or Nginx + Let's Encrypt). This template does not automatically configure TLS, so do not upload sensitive unpublished papers or put credentials in a browser URL.
9. Deploy updates: `git pull && docker compose up -d --build`.
10. Never expose Docker's private Redis or PostgreSQL ports publicly. Keep API behind Nginx. Add authentication, upload quotas and rate limiting before releasing beyond hackathon use.

Vultr firewall reference: https://docs.vultr.com/products/compute/instances/cloud-compute/networking/enable-firewall

## 5. Upload to GitHub

Extract the ZIP, open a terminal **inside the `researchlens/` directory**, and run:

```bash
git init
git add .
git commit -m "Initial ResearchLens full-stack MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/researchlens.git
git push -u origin main
```

Create an empty `researchlens` repo on GitHub before the push. Alternatively select **Add file → Upload files** in GitHub and drag in the *unzipped repository files*, retaining their directory structure. GitHub cannot execute a ZIP uploaded as one file.

## 6. Practical smoke-test checklist

- `docker compose ps` shows `postgres`, `redis`, `api`, `worker`, `frontend` healthy/running.
- `curl http://localhost:8080/api/health` returns `status: ok` (use port 80 if deploying on Vultr).
- Home → **Explore interface with sample data**: interactive Cytoscape graph and comparison popups function. All sample papers are marked fictional.
- Home → enter a real narrow question: workspace created; status progresses; real titles and source links appear.
- With Gemini key: at least one valid quote-backed claim appears in the paper panel. If none, choose a narrower topic or add an accessible PDF.
- With multiple comparable papers: some graph edges appear; no fabricated contradiction is forced.
- With Bright Data correctly enabled: `papers.sources` includes Bright Data or fetch cache has successful permitted pages.
- Upload a *public/open-licensed* PDF via Add Paper, then observe graph refresh and new relationships.
- Chat answers are explicitly tied to extracted claims; verify cited passages yourself.

## Known limitations before a public launch

- This is an MVP, not fully audited scientific reasoning software; train/test the pair classifier on a manually annotated gold set.
- Academic metadata and short abstracts may yield few extractable/verifiable claims. That is safer than inventing claims.
- The current graph relevance uses order-based relevance, not the fully weighted 0.45/0.20/0.20/0.15 proposal formula.
- Google Scholar dataset schema and third-party quotas vary; test real account setup and adjust adapter.
- Bright Data full-text HTML extraction may include incidental page text; quote verification only proves literal presence, not context validity.
- No public authentication or HTTPS preconfigured. Uploaded PDFs are not appropriate for sensitive data.
