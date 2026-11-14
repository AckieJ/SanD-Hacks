-- Production schema (Tiger Data / Postgres + pgvector), verbatim from the
-- proposal, section 9. The dev/test ORM in backend/app/models.py mirrors
-- this field-for-field but stores `embedding` as JSON for cross-DB
-- convenience -- run this file against a real Postgres+pgvector instance
-- for production and point DATABASE_URL at it; see backend/app/db.py for
-- the one place that changes (vector_math.nearest()).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text,
  parsed jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  doi text, title text, year int, authors text, venue text, url text,
  license text, text_level text, full_text text, abstract text,
  retraction_status text, cited_by_count int,
  embedding vector(768)
);

CREATE TABLE paper_sources (
  paper_id uuid REFERENCES papers(id),
  lane text, query text, found_at timestamptz DEFAULT now()
);

CREATE TABLE claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid REFERENCES papers(id),
  claim_text text, intervention text, outcome text, outcome_family text,
  direction text, significance text, effect_size text, population text,
  sample_n int, design text, duration text, measure text, limitations text,
  quote text, location text,
  embedding vector(768)
);

CREATE TABLE claim_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  claim_a uuid REFERENCES claims(id),
  claim_b uuid REFERENCES claims(id),
  label text, factors text[], confidence real, reason text, quotes jsonb
);

CREATE TABLE paper_scores (
  workspace_id uuid, paper_id uuid, relevance real, sector int, angle real,
  radius real, parent_paper uuid
);

CREATE TABLE flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid, kind text, description text, claim_ids uuid[]
);

CREATE TABLE fetch_cache (
  url_hash text PRIMARY KEY, url text, fetched_at timestamptz, body text
);

CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid, role text, content text, cited_claims uuid[]
);

CREATE INDEX ON claims USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON papers USING hnsw (embedding vector_cosine_ops);
