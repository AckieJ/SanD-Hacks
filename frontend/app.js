let currentWorkspaceId = "demo-ai-tutors";
let cy = null;
let graphData = null;

const EDGE_COLORS = {
  supports_compatible: "#14b8a6",
  genuine_contradiction: "#ef4444",
  apparent_contradiction: "#ef4444",
  related_not_comparable: "#64748b",
  unresolved: "#f59e0b",
};

function switchTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === `tab-${name}`));
}

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

async function checkHealth() {
  const pill = document.getElementById("bd-status-pill");
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    const { unlockerConfigured, scholarConfigured } = data.brightdata;
    if (unlockerConfigured && scholarConfigured) {
      pill.textContent = "Bright Data: Scholar + Unlocker Ready";
      pill.classList.add("ok");
    } else if (unlockerConfigured || scholarConfigured) {
      pill.textContent = "Bright Data: Partially Configured";
    } else {
      pill.textContent = "Demo Mode (Add Bright Data keys in .env)";
    }
  } catch {
    pill.textContent = "Server Offline";
  }
}

async function loadWorkspace(id) {
  currentWorkspaceId = id;
  const [statusRes, graphRes, flagsRes] = await Promise.all([
    fetch(`/api/workspaces/${id}/status`),
    fetch(`/api/workspaces/${id}/graph`),
    fetch(`/api/workspaces/${id}/flags`),
  ]);

  const status = await statusRes.json();
  graphData = await graphRes.json();
  const flags = await flagsRes.json();

  const c = status.status.counts;
  document.getElementById("cnt-oa").textContent = c.openalex_crossref;
  document.getElementById("cnt-scholar").textContent = c.brightdata_scholar;
  document.getElementById("cnt-dedup").textContent = c.deduplicated_candidates;
  document.getElementById("cnt-full").textContent = c.full_text_unlocker;
  document.getElementById("cnt-abs").textContent = c.abstract_only;
  document.getElementById("cnt-claims").textContent = c.claims_extracted;

  renderFlags(flags);
  renderGraph();
}

function renderGraph() {
  if (!graphData) return;
  const minRel = parseFloat(document.getElementById("rel-slider").value);
  const query = document.getElementById("search-input").value.trim().toLowerCase();
  const activeEdges = new Set(
    Array.from(document.querySelectorAll("#edge-filters input:checked")).map((el) => el.value)
  );

  const elements = [
    {
      data: { id: "center", label: graphData.question, isCenter: true },
      position: { x: 0, y: 0 },
    },
  ];

  const visiblePapers = new Set();
  const rMin = 95;
  const rMax = 290;

  graphData.papers.forEach((p) => {
    const matchesSearch = !query || p.title.toLowerCase().includes(query) || p.authors.toLowerCase().includes(query);
    if (p.relevance < minRel || !matchesSearch) return;
    visiblePapers.add(p.id);
    const radius = rMin + (1 - p.relevance) * (rMax - rMin);
    const x = Math.cos(p.angle) * radius;
    const y = Math.sin(p.angle) * radius;

    elements.push({
      data: {
        id: p.id,
        label: `${p.authors.split(",")[0]} (${p.year})`,
        fullTitle: p.title,
        relevance: p.relevance,
        text_level: p.text_level,
      },
      position: { x, y },
    });

    elements.push({
      data: {
        id: `spoke-${p.id}`,
        source: p.parent_paper && visiblePapers.has(p.parent_paper) ? p.parent_paper : "center",
        target: p.id,
        isSpoke: true,
      },
    });
  });

  graphData.edges.forEach((e) => {
    if (!activeEdges.has(e.label)) return;
    if (!visiblePapers.has(e.source_paper) || !visiblePapers.has(e.target_paper)) return;
    elements.push({
      data: { id: e.id, source: e.source_paper, target: e.target_paper, labelType: e.label },
    });
  });

  if (cy) cy.destroy();
  cy = cytoscape({
    container: document.getElementById("cy"),
    elements,
    layout: { name: "preset" },
    style: [
      {
        selector: "node[?isCenter]",
        style: {
          "background-color": "#38bdf8",
          color: "#082f49",
          label: "data(label)",
          "text-wrap": "wrap",
          "text-max-width": 120,
          "font-size": 11,
          "font-weight": "bold",
          "text-valign": "center",
          width: 96,
          height: 96,
        },
      },
      {
        selector: "node[!isCenter]",
        style: {
          "background-color": "#1e293b",
          "border-color": "#38bdf8",
          "border-width": 2.5,
          "border-style": (ele) => (ele.data("text_level") === "full" ? "solid" : "dashed"),
          color: "#f1f5f9",
          label: "data(label)",
          "font-size": 11,
          "text-valign": "bottom",
          "text-margin-y": 6,
          width: 34,
          height: 34,
        },
      },
      {
        selector: "edge[?isSpoke]",
        style: { width: 1, "line-color": "#334155", "curve-style": "straight" },
      },
      {
        selector: "edge[!isSpoke]",
        style: {
          width: 3,
          "line-color": (ele) => EDGE_COLORS[ele.data("labelType")] || "#64748b",
          "line-style": (ele) => {
            const t = ele.data("labelType");
            if (t === "apparent_contradiction" || t === "unresolved") return "dashed";
            if (t === "related_not_comparable") return "dotted";
            return "solid";
          },
          "curve-style": "bezier",
        },
      },
    ],
  });

  cy.on("tap", "node[!isCenter]", async (evt) => {
    const id = evt.target.id();
    const res = await fetch(`/api/papers/${id}`);
    const paper = await res.json();
    renderPaperPanel(paper);
    switchTab("paper");
  });

  cy.on("tap", "edge[!isSpoke]", async (evt) => {
    const id = evt.target.id();
    const res = await fetch(`/api/edges/${id}`);
    const data = await res.json();
    renderComparisonPanel(data);
    switchTab("compare");
  });
}

function renderPaperPanel(paper) {
  const el = document.getElementById("tab-paper");
  el.innerHTML = `
    <div class="card">
      <div>
        <span class="badge ${paper.text_level}">${paper.text_level === "full" ? "Full Text" : "Abstract Only"}</span>
        <span class="badge">Relevance: ${paper.relevance.toFixed(2)}</span>
        ${paper.source_lanes.map((s) => `<span class="badge">${s}</span>`).join("")}
      </div>
      <h3>${paper.title}</h3>
      <p class="muted">${paper.authors} · ${paper.venue} (${paper.year})</p>
      <p class="muted">DOI: ${paper.doi || "Unresolved (lower confidence)"}</p>
    </div>
    ${paper.claims
      .map(
        (c) => `
      <div class="card">
        <strong>${c.claim_text}</strong>
        <p class="muted">Effect: ${c.effect_size} · Design: ${c.design} (n=${c.sample_n}) · ${c.duration}</p>
        <div class="quote-box">"${c.quote}" <br/><span class="muted">— ${c.location}</span></div>
      </div>`
      )
      .join("")}
  `;
}

function renderComparisonPanel({ edge, left, right }) {
  const el = document.getElementById("tab-compare");
  el.innerHTML = `
    <div class="card">
      <span class="badge">${edge.label.replaceAll("_", " ")}</span>
      <span class="badge">Confidence: ${(edge.confidence * 100).toFixed(0)}%</span>
      <p style="margin-top:8px">${edge.reason}</p>
      <p class="muted">Factors: ${edge.factors.join(", ")}</p>
    </div>
    <table class="compare-table">
      <tr><th>Field</th><th>${left.paper.authors.split(",")[0]} (${left.paper.year})</th><th>${right.paper.authors.split(",")[0]} (${right.paper.year})</th></tr>
      <tr><th>Population</th><td>${left.claim.population}</td><td>${right.claim.population}</td></tr>
      <tr><th>Sample (n)</th><td>${left.claim.sample_n}</td><td>${right.claim.sample_n}</td></tr>
      <tr><th>Design</th><td>${left.claim.design}</td><td>${right.claim.design}</td></tr>
      <tr><th>Duration</th><td>${left.claim.duration}</td><td>${right.claim.duration}</td></tr>
      <tr><th>Measure</th><td>${left.claim.measure}</td><td>${right.claim.measure}</td></tr>
      <tr><th>Result</th><td>${left.claim.effect_size}</td><td>${right.claim.effect_size}</td></tr>
    </table>
    <div class="card" style="margin-top:12px">
      <strong>Source Quotes</strong>
      <div class="quote-box">"${left.claim.quote}" — ${left.claim.location}</div>
      <div class="quote-box">"${right.claim.quote}" — ${right.claim.location}</div>
    </div>
  `;
}

function renderFlags(flags) {
  const el = document.getElementById("tab-gaps");
  el.innerHTML = `
    <div class="card"><h4>1. Stated Limitations</h4><ul>${flags.stated_limitations.map((f) => `<li><strong>${f.paper_id}:</strong> ${f.text}</li>`).join("")}</ul></div>
    <div class="card"><h4>2. Weakly Supported Claims</h4><ul>${flags.weakly_supported.map((f) => `<li><strong>${f.paper_id}:</strong> ${f.reason}</li>`).join("")}</ul></div>
    <div class="card"><h4>3. Topics Not Found in This Library</h4><ul>${flags.library_gaps.map((g) => `<li>${g}</li>`).join("")}</ul></div>
  `;
}

document.getElementById("rel-slider").addEventListener("input", (e) => {
  document.getElementById("rel-val").textContent = parseFloat(e.target.value).toFixed(2);
  renderGraph();
});
document.getElementById("search-input").addEventListener("input", renderGraph);
document.querySelectorAll("#edge-filters input").forEach((cb) => cb.addEventListener("change", renderGraph));

document.getElementById("question-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = document.getElementById("question-input").value;
  const res = await fetch("/api/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  const data = await res.json();
  loadWorkspace(data.id);
});

document.getElementById("bd-scholar-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const out = document.getElementById("bd-output");
  out.textContent = "Calling Bright Data Google Scholar Scraper API...";
  const query = document.getElementById("bd-scholar-query").value;
  const res = await fetch("/api/brightdata/scholar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 5 }),
  });
  out.textContent = JSON.stringify(await res.json(), null, 2);
});

document.getElementById("bd-unlocker-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const out = document.getElementById("bd-output");
  out.textContent = "Calling Bright Data Web Unlocker API...";
  const url = document.getElementById("bd-unlocker-url").value;
  const res = await fetch("/api/brightdata/unlocker", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  out.textContent = JSON.stringify(await res.json(), null, 2);
});

checkHealth();
loadWorkspace(currentWorkspaceId);
