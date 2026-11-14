import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALLOWLIST_PATH = path.resolve(__dirname, "../../config/allowlist.json");

function loadAllowlist() {
  try {
    const raw = fs.readFileSync(ALLOWLIST_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return new Set((parsed.allowedDomains || []).map((d) => d.toLowerCase()));
  } catch {
    return new Set(["ncbi.nlm.nih.gov", "europepmc.org", "arxiv.org", "biorxiv.org", "medrxiv.org", "doaj.org"]);
  }
}

function hashUrl(url) {
  return crypto.createHash("sha256").update(url).digest("hex");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class UnlockerClient {
  constructor({ apiKey, zone } = {}) {
    this.apiKey = apiKey || process.env.BRIGHT_DATA_API_KEY || "";
    this.zone = zone || process.env.BRIGHT_DATA_UNLOCKER_ZONE || "researchlens_unlocker";
    this.allowedDomains = loadAllowlist();
    this.domainLastCall = new Map();
    this.cache = new Map();
    this.cacheTtlMs = 7 * 24 * 60 * 60 * 1000;
  }

  isConfigured() {
    return Boolean(this.apiKey && !this.apiKey.startsWith("your_"));
  }

  isUrlAllowed(rawUrl) {
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return { allowed: false, reason: "Invalid URL format" };
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { allowed: false, reason: "Only HTTP/HTTPS URLs are permitted" };
    }
    const host = parsed.hostname.toLowerCase();
    for (const domain of this.allowedDomains) {
      if (host === domain || host.endsWith(`.${domain}`)) {
        return { allowed: true, domain: host };
      }
    }
    return { allowed: false, reason: `Domain "${host}" is not in config/allowlist.json` };
  }

  async rateLimit(domain) {
    const last = this.domainLastCall.get(domain) || 0;
    const elapsed = Date.now() - last;
    if (elapsed < 1000) await sleep(1000 - elapsed);
    this.domainLastCall.set(domain, Date.now());
  }

  async fetch(url, { bypassCache = false } = {}) {
    const check = this.isUrlAllowed(url);
    if (!check.allowed) {
      const err = new Error(check.reason);
      err.code = "ALLOWLIST_BLOCKED";
      err.status = 403;
      throw err;
    }

    const key = hashUrl(url);
    if (!bypassCache && this.cache.has(key)) {
      const entry = this.cache.get(key);
      if (Date.now() - entry.fetchedAt < this.cacheTtlMs) {
        return { url, cached: true, body: entry.body, domain: check.domain };
      }
    }

    if (!this.isConfigured()) {
      const err = new Error("BRIGHT_DATA_API_KEY is not configured in .env");
      err.code = "NOT_CONFIGURED";
      err.status = 400;
      throw err;
    }

    await this.rateLimit(check.domain);

    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch("https://api.brightdata.com/request", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ zone: this.zone, url, format: "raw" }),
        });

        if (res.status === 429 || res.status >= 500) {
          throw new Error(`Bright Data HTTP ${res.status}`);
        }
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Bright Data Web Unlocker error (${res.status}): ${text.slice(0, 300)}`);
        }

        const body = await res.text();
        this.cache.set(key, { url, body, fetchedAt: Date.now() });
        return { url, cached: false, body, domain: check.domain };
      } catch (err) {
        lastError = err;
        if (attempt < 2) await sleep(600 * 2 ** attempt);
      }
    }
    throw lastError;
  }
}

export class ScholarClient {
  constructor({ apiKey, datasetId } = {}) {
    this.apiKey = apiKey || process.env.BRIGHT_DATA_API_KEY || "";
    this.datasetId = datasetId || process.env.BRIGHT_DATA_SCHOLAR_ID || "";
  }

  isConfigured() {
    return Boolean(
      this.apiKey &&
        !this.apiKey.startsWith("your_") &&
        this.datasetId &&
        !this.datasetId.startsWith("your_")
    );
  }

  async search(query, { limit = 10 } = {}) {
    if (!this.isConfigured()) {
      const err = new Error(
        "BRIGHT_DATA_API_KEY or BRIGHT_DATA_SCHOLAR_ID is not configured in .env"
      );
      err.code = "NOT_CONFIGURED";
      err.status = 400;
      throw err;
    }

    const endpoint = `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${encodeURIComponent(
      this.datasetId
    )}&format=json`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ keyword: query, num_results: limit }]),
    });

    if (res.status === 202) {
      const payload = await res.json();
      if (payload?.snapshot_id) {
        return await this.pollSnapshot(payload.snapshot_id);
      }
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Bright Data Scholar API error (${res.status}): ${text.slice(0, 300)}`);
    }

    const data = await res.json();
    const records = Array.isArray(data) ? data : data?.results || [data];
    return { query, count: records.length, results: records };
  }

  async pollSnapshot(snapshotId, { maxAttempts = 12, intervalMs = 2500 } = {}) {
    const headers = { Authorization: `Bearer ${this.apiKey}` };
    for (let i = 0; i < maxAttempts; i++) {
      const progressRes = await fetch(
        `https://api.brightdata.com/datasets/v3/progress/${encodeURIComponent(snapshotId)}`,
        { headers }
      );
      if (progressRes.ok) {
        const status = await progressRes.json();
        if (status.status === "ready") {
          const dlRes = await fetch(
            `https://api.brightdata.com/datasets/v3/snapshot/${encodeURIComponent(snapshotId)}?format=json`,
            { headers }
          );
          if (!dlRes.ok) throw new Error(`Snapshot download failed (${dlRes.status})`);
          const records = await dlRes.json();
          const list = Array.isArray(records) ? records : [records];
          return { snapshotId, count: list.length, results: list };
        }
        if (status.status === "failed") {
          throw new Error(`Bright Data snapshot ${snapshotId} failed`);
        }
      }
      await sleep(intervalMs);
    }
    throw new Error(`Timed out waiting for Bright Data snapshot ${snapshotId}`);
  }
}
