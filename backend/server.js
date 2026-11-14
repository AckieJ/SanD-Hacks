import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { UnlockerClient, ScholarClient } from "./clients/brightdata.js";
import { createDemoWorkspace } from "./data/demoWorkspace.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.resolve(__dirname, "../frontend")));

const unlockerClient = new UnlockerClient();
const scholarClient = new ScholarClient();

// In-memory workspace store (backed by Tiger Data in full pipeline)
const workspaces = new Map();
const defaultDemo = createDemoWorkspace();
workspaces.set(defaultDemo.id, defaultDemo);

function findPaperAndClaim(claimId) {
  for (const ws of workspaces.values()) {
    for (const paper of ws.papers) {
      const claim = paper.claims.find((c) => c.id === claimId);
      if (claim) return { paper, claim };
    }
  }
  return null;
}

// Health & Bright Data configuration check
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    brightdata: {
      unlockerConfigured: unlockerClient.isConfigured(),
      unlockerZone: unlockerClient.zone,
      scholarConfigured: scholarClient.isConfigured(),
      scholarId: scholarClient.datasetId ? "***configured***" : null,
      allowlistCount: unlockerClient.allowedDomains.size,
    },
  });
});

// Direct Bright Data Google Scholar Scraper endpoint
app.post("/api/brightdata/scholar", async (req, res) => {
  try {
    const { query, limit = 10 } = req.body || {};
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Missing required 'query' string" });
    }
    const result = await scholarClient.search(query.trim(), { limit });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(err.status || 500).json({
      ok: false,
      code: err.code || "SCHOLAR_ERROR",
      error: err.message,
    });
  }
});

// Direct Bright Data Web Unlocker endpoint (enforces allowlist + rate limit + cache)
app.post("/api/brightdata/unlocker", async (req, res) => {
  try {
    const { url, bypassCache = false } = req.body || {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing required 'url' string" });
    }
    const result = await unlockerClient.fetch(url.trim(), { bypassCache });
    res.json({
      ok: true,
      url: result.url,
      domain: result.domain,
      cached: result.cached,
      length: result.body.length,
      preview: result.body.slice(0, 4000),
    });
  } catch (err) {
    res.status(err.status || 500).json({
      ok: false,
      code: err.code || "UNLOCKER_ERROR",
      error: err.message,
    });
  }
});

// ResearchLens Workspace Endpoints (Section 10)
app.post("/api/workspaces", async (req, res) => {
  const { question } = req.body || {};
  const cleanQuestion = (question || "").trim() || "Do AI tutors improve learning?";

  // If Bright Data Scholar is configured, run a live discovery query alongside the workspace
  let liveScholar = null;
  if (scholarClient.isConfigured()) {
    try {
      liveScholar = await scholarClient.search(cleanQuestion, { limit: 5 });
    } catch (err) {
      liveScholar = { error: err.message };
    }
  }

  const ws = createDemoWorkspace(cleanQuestion);
  ws.id = `ws-${Date.now()}`;
  if (liveScholar && !liveScholar.error) {
    ws.status.counts.brightdata_scholar = liveScholar.count;
    ws.liveScholarSample = liveScholar.results.slice(0, 5);
  }
  workspaces.set(ws.id, ws);
  res.status(201).json({ id: ws.id, question: ws.question, status: ws.status, liveScholar });
});

app.get("/api/workspaces/:id/status", (req, res) => {
  const ws = workspaces.get(req.params.id);
  if (!ws) return res.status(404).json({ error: "Workspace not found" });
  res.json({ id: ws.id, question: ws.question, status: ws.status });
});

app.get("/api/workspaces/:id/graph", (req, res) => {
  const ws = workspaces.get(req.params.id);
  if (!ws) return res.status(404).json({ error: "Workspace not found" });
  res.json({
    id: ws.id,
    question: ws.question,
    papers: ws.papers.map(({ claims, ...rest }) => ({
      ...rest,
      claimCount: claims.length,
    })),
    edges: ws.edges,
  });
});

app.get("/api/papers/:id", (req, res) => {
  for (const ws of workspaces.values()) {
    const paper = ws.papers.find((p) => p.id === req.params.id);
    if (paper) return res.json(paper);
  }
  res.status(404).json({ error: "Paper not found" });
});

app.get("/api/edges/:id", (req, res) => {
  for (const ws of workspaces.values()) {
    const edge = ws.edges.find((e) => e.id === req.params.id);
    if (edge) {
      const a = findPaperAndClaim(edge.claim_a);
      const b = findPaperAndClaim(edge.claim_b);
      return res.json({ edge, left: a, right: b });
    }
  }
  res.status(404).json({ error: "Edge not found" });
});

app.get("/api/workspaces/:id/flags", (req, res) => {
  const ws = workspaces.get(req.params.id);
  if (!ws) return res.status(404).json({ error: "Workspace not found" });
  res.json(ws.flags);
});

app.listen(PORT, () => {
  console.log(`ResearchLens server running at http://localhost:${PORT}`);
});
