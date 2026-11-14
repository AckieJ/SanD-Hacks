CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY, question text NOT NULL, status text NOT NULL DEFAULT 'queued',
  progress jsonb NOT NULL DEFAULT '{}'::jsonb, parsed jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS papers (
  id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  doi text, title text NOT NULL, year int, authors text, venue text, url text,
  abstract text, source_text text, text_level text NOT NULL DEFAULT 'abstract',
  license text, sources jsonb NOT NULL DEFAULT '[]'::jsonb, unverified boolean DEFAULT false,
  embedding vector(768), relevance real DEFAULT 0, angle real DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY, paper_id uuid NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  claim_text text NOT NULL, outcome_family text, intervention text, outcome text,
  direction text, significance text, effect_size text, population text,
  sample_n int, design text, duration text, measure text, limitations text,
  quote text NOT NULL, location text, embedding vector(768)
);
CREATE TABLE IF NOT EXISTS claim_edges (
  id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  claim_a uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  claim_b uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  label text NOT NULL, reason text NOT NULL, factors jsonb DEFAULT '[]'::jsonb,
  confidence real DEFAULT 0, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS flags (
  id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL, description text NOT NULL, paper_id uuid REFERENCES papers(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS fetch_cache (
  url_hash text PRIMARY KEY, url text NOT NULL, body text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role text NOT NULL, content text NOT NULL, cited_claims jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_papers_ws ON papers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_claims_paper ON claims(paper_id);
CREATE INDEX IF NOT EXISTS idx_edges_ws ON claim_edges(workspace_id);
CREATE INDEX IF NOT EXISTS idx_paper_vec ON papers USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_claim_vec ON claims USING hnsw (embedding vector_cosine_ops);
