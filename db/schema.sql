-- ResearchLens Database Schema for Tiger Data (PostgreSQL + pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  parsed jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  doi text,
  title text NOT NULL,
  year int,
  authors text,
  venue text,
  url text,
  license text,
  text_level text CHECK (text_level IN ('full', 'abstract')),
  full_text text,
  abstract text,
  retraction_status text,
  embedding vector(768)
);

CREATE TABLE IF NOT EXISTS paper_sources (
  paper_id uuid REFERENCES papers(id) ON DELETE CASCADE,
  lane text NOT NULL,
  query text,
  found_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid REFERENCES papers(id) ON DELETE CASCADE,
  claim_text text NOT NULL,
  intervention text,
  outcome text,
  outcome_family text,
  direction text,
  significance text,
  effect_size text,
  population text,
  sample_n int,
  design text,
  duration text,
  measure text,
  limitations text,
  quote text NOT NULL,
  location text,
  embedding vector(768)
);

CREATE TABLE IF NOT EXISTS claim_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  claim_a uuid REFERENCES claims(id) ON DELETE CASCADE,
  claim_b uuid REFERENCES claims(id) ON DELETE CASCADE,
  label text CHECK (label IN (
    'supports_compatible',
    'genuine_contradiction',
    'apparent_contradiction',
    'related_not_comparable',
    'unresolved'
  )),
  factors text[],
  confidence real,
  reason text,
  quotes jsonb
);

CREATE TABLE IF NOT EXISTS paper_scores (
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  paper_id uuid REFERENCES papers(id) ON DELETE CASCADE,
  relevance real,
  sector int,
  angle real,
  parent_paper uuid REFERENCES papers(id),
  PRIMARY KEY (workspace_id, paper_id)
);

CREATE TABLE IF NOT EXISTS flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  kind text,
  description text,
  claim_ids uuid[]
);

CREATE TABLE IF NOT EXISTS fetch_cache (
  url_hash text PRIMARY KEY,
  url text NOT NULL,
  fetched_at timestamptz DEFAULT now(),
  body text
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  role text,
  content text,
  cited_claims uuid[]
);

CREATE INDEX IF NOT EXISTS idx_claims_embedding ON claims USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_papers_embedding ON papers USING hnsw (embedding vector_cosine_ops);
