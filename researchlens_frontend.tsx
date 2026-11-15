import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  GitCompare,
  Plus,
  MessageSquare,
  Compass,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  X,
  Send,
  Sliders,
  Server,
  Wifi,
  WifiOff,
  BookOpen,
  Quote,
  ShieldAlert,
  ArrowRight,
  Loader2,
  Info,
  Check,
  Filter
} from 'lucide-react';

// ============================================================================
// 1. BUILT-IN MOCK DATA & SIMULATION (Mirrors backend/app/clients/mock.py)
// ============================================================================

const MOCK_FIXTURE_PAPERS = [
  {
    id: 'paper-p1',
    key: 'P1',
    title: 'AI Tutoring Boosts Math Scores in Middle School',
    authors: 'Chen, L., Patel, R.',
    year: 2021,
    venue: 'Journal of Educational Technology',
    doi: '10.9999/jedtech.2021.0001',
    text_level: 'full',
    retraction_status: null,
    relevance: 0.88,
    sector: 0,
    angle: 0.52,
    radius: 0.2256,
    claims: [
      {
        id: 'claim-c1',
        paper_id: 'paper-p1',
        claim_text: "AI tutoring improved middle schoolers' math post-test scores.",
        intervention: 'AI tutor',
        outcome: 'math post-test score',
        outcome_family: 'math_test_score',
        direction: 'increase',
        significance: 'significant',
        effect_size: '+18%',
        population: 'middle school students',
        sample_n: 240,
        design: 'RCT',
        duration: '6 weeks',
        measure: 'standardized math post-test',
        limitations: 'not_reported',
        quote: 'Students using the AI tutor scored 18% higher on the post-test than the control group (p < .01).',
        location: 'Results',
      },
    ],
  },
  {
    id: 'paper-p2',
    key: 'P2',
    title: 'No Effect of Chatbot Tutors on Undergraduate Retention',
    authors: 'Okafor, N., Diaz, M.',
    year: 2022,
    venue: 'Computers & Education',
    doi: '10.9999/candc.2022.0002',
    text_level: 'full',
    retraction_status: null,
    relevance: 0.72,
    sector: 2,
    angle: 4.55,
    radius: 0.3664,
    claims: [
      {
        id: 'claim-c2',
        paper_id: 'paper-p2',
        claim_text: 'Chatbot math tutoring showed no effect on undergraduate math test retention.',
        intervention: 'AI chatbot tutor',
        outcome: 'math retention quiz score',
        outcome_family: 'math_test_score',
        direction: 'no_effect',
        significance: 'not_significant',
        effect_size: 'not_reported',
        population: 'undergraduate math students',
        sample_n: 180,
        design: 'RCT',
        duration: '4 weeks',
        measure: 'delayed math retention quiz',
        limitations: 'not_reported',
        quote: 'We found no statistically significant difference in retention scores between the chatbot-tutored group and the control group (p = .41).',
        location: 'Results',
      },
    ],
  },
  {
    id: 'paper-p3',
    key: 'P3',
    title: 'AI Tutors Reduce Engagement in Low-Achieving Students',
    authors: 'Singh, A.',
    year: 2023,
    venue: 'Learning & Instruction',
    doi: '10.9999/lni.2023.0003',
    text_level: 'full',
    retraction_status: null,
    relevance: 0.65,
    sector: 1,
    angle: 2.75,
    radius: 0.428,
    claims: [
      {
        id: 'claim-c3',
        paper_id: 'paper-p3',
        claim_text: 'AI tutoring reduced engagement among low-achieving high schoolers.',
        intervention: 'AI tutor',
        outcome: 'engagement score',
        outcome_family: 'engagement',
        direction: 'decrease',
        significance: 'not_reported',
        effect_size: '-12%',
        population: 'low-achieving high school students',
        sample_n: 90,
        design: 'observational',
        duration: '4 weeks',
        measure: 'click-stream engagement score',
        limitations: 'not_reported',
        quote: 'Among students in the bottom quartile, engagement scores decreased by 12% after four weeks of AI-tutor use',
        location: 'Results',
      },
    ],
  },
  {
    id: 'paper-p4',
    key: 'P4',
    title: 'Confirming AI Tutoring Math Gains: A Replication',
    authors: 'Martinez, S.',
    year: 2023,
    venue: 'Journal of Educational Technology',
    doi: '10.9999/jedtech.2023.0004',
    text_level: 'full',
    retraction_status: null,
    relevance: 0.84,
    sector: 0,
    angle: 1.25,
    radius: 0.2608,
    claims: [
      {
        id: 'claim-c4',
        paper_id: 'paper-p4',
        claim_text: "A replication confirmed AI tutoring improves middle schoolers' math scores.",
        intervention: 'AI tutor',
        outcome: 'math post-test score',
        outcome_family: 'math_test_score',
        direction: 'increase',
        significance: 'significant',
        effect_size: '+15%',
        population: 'middle school students',
        sample_n: 210,
        design: 'RCT',
        duration: '6 weeks',
        measure: 'standardized math post-test',
        limitations: 'not_reported',
        quote: 'Consistent with Chen et al., students scored 15% higher on the post-test (p < .01).',
        location: 'Results',
      },
    ],
  },
  {
    id: 'paper-p5',
    key: 'P5',
    title: 'AI Tutor Group Underperforms in a Pre-Registered RCT',
    authors: 'Reyes, D.',
    year: 2020,
    venue: 'Educational Researcher',
    doi: '10.9999/edres.2020.0005',
    text_level: 'full',
    retraction_status: null,
    relevance: 0.81,
    sector: 2,
    angle: 5.45,
    radius: 0.2872,
    claims: [
      {
        id: 'claim-c5',
        paper_id: 'paper-p5',
        claim_text: 'A pre-registered RCT found the AI-tutor group scored lower than traditionally-tutored peers.',
        intervention: 'AI tutor',
        outcome: 'math post-test score',
        outcome_family: 'math_test_score',
        direction: 'decrease',
        significance: 'significant',
        effect_size: '-9%',
        population: 'middle school students',
        sample_n: 260,
        design: 'RCT',
        duration: '6 weeks',
        measure: 'standardized math post-test',
        limitations: 'not_reported',
        quote: 'In our randomized controlled trial, the AI-tutor group scored 9% lower on the post-test than traditionally-tutored peers (p = .02).',
        location: 'Results',
      },
    ],
  },
  {
    id: 'paper-p6',
    key: 'P6',
    title: 'AI Tutoring and Long-Term Retention: A Research Note',
    authors: 'Park, J.',
    year: 2022,
    venue: '(abstract only -- full text not openly accessible)',
    doi: '10.9999/note.2022.0006',
    text_level: 'abstract',
    retraction_status: null,
    relevance: 0.34,
    sector: 1,
    angle: 3.35,
    radius: 0.7008,
    claims: [
      {
        id: 'claim-c6',
        paper_id: 'paper-p6',
        claim_text: 'Preliminary, underpowered data suggest modest long-term retention gains from AI tutoring.',
        intervention: 'AI tutor',
        outcome: 'one-year retention',
        outcome_family: 'math_test_score',
        direction: 'increase',
        significance: 'not_reported',
        effect_size: 'not_reported',
        population: 'not_reported',
        sample_n: null,
        design: 'observational',
        duration: '1 year',
        measure: 'not_reported',
        limitations: 'sample size was too small to draw firm conclusions',
        quote: 'preliminary data from a small convenience sample suggest modest gains, but the sample size was too small to draw firm conclusions',
        location: 'Abstract',
      },
    ],
  },
];

const MOCK_EDGES = [
  {
    id: 'edge-e1',
    paper_a: 'paper-p1',
    paper_b: 'paper-p4',
    claim_a: 'claim-c1',
    claim_b: 'claim-c4',
    label: 'supports_compatible',
    confidence: 0.9,
    factors: [],
    reason: 'Same direction (+18% vs +15%, both p < .01) on closely comparable randomized middle school math studies (6 weeks, standardized math post-test).',
  },
  {
    id: 'edge-e2',
    paper_a: 'paper-p1',
    paper_b: 'paper-p5',
    claim_a: 'claim-c1',
    claim_b: 'claim-c5',
    label: 'genuine_contradiction',
    confidence: 0.85,
    factors: [],
    reason: 'Comparable studies (same population: middle school students, duration: 6 weeks, measure: standardized math post-test) report significant effects in opposite directions (+18% vs -9%). Note: comparison conditions differed (business-as-usual vs human tutoring).',
  },
  {
    id: 'edge-e3',
    paper_a: 'paper-p1',
    paper_b: 'paper-p2',
    claim_a: 'claim-c1',
    claim_b: 'claim-c2',
    label: 'apparent_contradiction',
    confidence: 0.72,
    factors: ['population', 'duration', 'measure'],
    reason: 'Results differ (+18% significant gain vs no statistically significant difference), but population (middle school vs undergraduates), duration (6 weeks vs 4 weeks), and measure (immediate post-test vs delayed retention quiz) also differ between studies.',
  },
  {
    id: 'edge-e4',
    paper_a: 'paper-p1',
    paper_b: 'paper-p3',
    claim_a: 'claim-c1',
    claim_b: 'claim-c3',
    label: 'related_not_comparable',
    confidence: 0.9,
    factors: ['outcome_family', 'population', 'design'],
    reason: 'Different outcome families: Chen & Patel measured standardized math test scores, whereas Singh measured click-stream behavioral engagement.',
  },
  {
    id: 'edge-e5',
    paper_a: 'paper-p2',
    paper_b: 'paper-p6',
    claim_a: 'claim-c2',
    claim_b: 'claim-c6',
    label: 'unresolved',
    confidence: 0.45,
    factors: ['duration', 'population', 'measure', 'sample_size'],
    reason: 'Comparability unclear and Park (2022) relies on abstract-only preliminary evidence with unreported sample size over 1 year vs 4 weeks.',
  },
];

const MOCK_FLAGS = {
  limitations: [
    'Park (2022) [claim-c6]: "sample size was too small to draw firm conclusions"',
  ],
  weak_claims: [
    'Preliminary, underpowered data suggest modest long-term retention gains from AI tutoring. (abstract only)',
  ],
  gaps: [
    'Not found in the papers examined: "Long-term multi-year standardized achievement outcomes"',
    'Not found in the papers examined: "Cost-effectiveness compared to small-group human tutoring"',
  ],
};

const EDGE_STYLES = {
  genuine_contradiction: {
    label: 'Genuine Contradiction',
    shortLabel: 'Genuine Conflict',
    color: '#ef4444',
    bgLight: 'bg-red-50',
    textDark: 'text-red-700',
    borderLight: 'border-red-200',
    dashArray: 'none',
    strokeWidth: 2.8,
    description: 'Comparable studies report incompatible, significant results.',
  },
  apparent_contradiction: {
    label: 'Apparent Contradiction',
    shortLabel: 'Apparent Conflict',
    color: '#f97316',
    bgLight: 'bg-orange-50',
    textDark: 'text-orange-700',
    borderLight: 'border-orange-200',
    dashArray: '7, 5',
    strokeWidth: 2.5,
    description: 'Results differ, but study conditions (population, duration, measure) plausibly explain it.',
  },
  supports_compatible: {
    label: 'Supports / Compatible',
    shortLabel: 'Supports',
    color: '#14b8a6',
    bgLight: 'bg-teal-50',
    textDark: 'text-teal-700',
    borderLight: 'border-teal-200',
    dashArray: 'none',
    strokeWidth: 2.5,
    description: 'Results agree or can both hold under similar conditions.',
  },
  related_not_comparable: {
    label: 'Related, Not Comparable',
    shortLabel: 'Not Comparable',
    color: '#94a3b8',
    bgLight: 'bg-slate-100',
    textDark: 'text-slate-700',
    borderLight: 'border-slate-300',
    dashArray: '2, 5',
    strokeWidth: 2,
    description: 'Same broad topic, but investigates different outcome families or questions.',
  },
  unresolved: {
    label: 'Unresolved',
    shortLabel: 'Unresolved',
    color: '#f59e0b',
    bgLight: 'bg-amber-50',
    textDark: 'text-amber-700',
    borderLight: 'border-amber-200',
    dashArray: '4, 3, 1, 3',
    strokeWidth: 2.2,
    description: 'Not enough methodological detail or evidence strength to decide.',
  },
};

// ============================================================================
// 2. MAIN APPLICATION COMPONENT
// ============================================================================

export default function App() {
  // Connection & Mode State
  const [apiUrl, setApiUrl] = useState('http://localhost:8000');
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [mode, setMode] = useState('mock'); // 'live' | 'mock'
  const [backendHealthy, setBackendHealthy] = useState(false);

  // Navigation / View State: 'setup' | 'progress' | 'workspace'
  const [view, setView] = useState('setup');
  const [questionInput, setQuestionInput] = useState('Do AI tutors improve learning?');
  const [workspaceId, setWorkspaceId] = useState(null);

  // Progress Screen State
  const [progressData, setProgressData] = useState({
    status: 'created',
    counts: { papers: 0, claims: 0, edges: 0 },
    error: null,
  });

  // Graph & Workspace Data
  const [graphData, setGraphData] = useState({
    question: '',
    sub_questions: [],
    nodes: [],
    edges: [],
  });
  const [flagsData, setFlagsData] = useState({
    limitations: [],
    weak_claims: [],
    gaps: [],
  });

  // Local Mock Store (used when in mock mode or if backend is unreachable)
  const [mockPapers, setMockPapers] = useState(MOCK_FIXTURE_PAPERS);
  const [mockEdges, setMockEdges] = useState(MOCK_EDGES);

  // Interactive Graph Filters & Controls
  const [minRelevance, setMinRelevance] = useState(0.0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEdgeFilters, setActiveEdgeFilters] = useState({
    genuine_contradiction: true,
    apparent_contradiction: true,
    supports_compatible: true,
    related_not_comparable: true,
    unresolved: true,
  });
  const [hoveredNode, setHoveredNode] = useState(null);

  // Pan & Zoom State for Radial Graph
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const svgContainerRef = useRef(null);

  // Side Panels & Modals
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [loadingPaper, setLoadingPaper] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [loadingEdge, setLoadingEdge] = useState(false);
  const [activeRightDrawer, setActiveRightDrawer] = useState(null); // null | 'paper' | 'gaps' | 'chat'
  const [showAddPaperModal, setShowAddPaperModal] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content:
        'Ask any question about the papers and claims in this workspace. Every answer is grounded strictly in extracted verbatim quotes and will flag uncertainties or unresolved conflicts.',
      cited_claim_ids: [],
      uncertainty_note: null,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Check backend health on mount or when apiUrl changes
  useEffect(() => {
    let cancelled = false;
    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 1800);
        const res = await fetch(`${apiUrl.replace(/\/$/, '')}/health`, {
          signal: controller.signal,
        });
        clearTimeout(tid);
        if (!cancelled && res.ok) {
          setBackendHealthy(true);
        } else if (!cancelled) {
          setBackendHealthy(false);
        }
      } catch {
        if (!cancelled) setBackendHealthy(false);
      }
    };
    checkHealth();
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  // ==========================================================================
  // 3. DATA LOADERS (LIVE FASTAPI + SEAMLESS MOCK FALLBACK)
  // ==========================================================================

  const loadWorkspaceArtifacts = useCallback(
    async (wsId, activeMode, currentMockPapers = mockPapers, currentMockEdges = mockEdges) => {
      if (activeMode === 'live') {
        try {
          const base = apiUrl.replace(/\/$/, '');
          const [gRes, fRes] = await Promise.all([
            fetch(`${base}/workspaces/${wsId}/graph`),
            fetch(`${base}/workspaces/${wsId}/flags`),
          ]);
          if (!gRes.ok) throw new Error('Failed to load graph');
          const gJson = await gRes.json();
          const fJson = fRes.ok ? await fRes.json() : { limitations: [], weak_claims: [], gaps: [] };
          setGraphData(gJson);
          setFlagsData(fJson);
          setView('workspace');
          return;
        } catch (err) {
          console.warn('Live graph fetch failed, falling back to built-in mock:', err);
        }
      }

      // Mock mode graph construction
      setGraphData({
        question: questionInput || 'Do AI tutors improve learning?',
        sub_questions: [
          'Does AI tutoring change test scores?',
          'Does AI tutoring change engagement or motivation?',
          'Do effects replicate across populations?',
        ],
        nodes: currentMockPapers.map((p) => ({
          id: p.id,
          title: p.title,
          year: p.year,
          text_level: p.text_level,
          relevance: p.relevance,
          angle: p.angle,
          radius: p.radius,
          sector: p.sector,
        })),
        edges: currentMockEdges.map((e) => ({
          id: e.id,
          label: e.label,
          confidence: e.confidence,
          paper_a: e.paper_a,
          paper_b: e.paper_b,
          claim_a: e.claim_a,
          claim_b: e.claim_b,
        })),
      });
      setFlagsData(MOCK_FLAGS);
      setView('workspace');
    },
    [apiUrl, mockPapers, mockEdges, questionInput]
  );

  // Start a new workspace (Live API if available & selected, else Mock)
  const handleStartWorkspace = async (forceMode = null) => {
    const q = questionInput.trim();
    if (!q) return;

    const chosenMode = forceMode || (backendHealthy ? 'live' : 'mock');
    setMode(chosenMode);
    setView('progress');
    setSelectedPaper(null);
    setSelectedEdge(null);
    setActiveRightDrawer(null);
    setTransform({ x: 0, y: 0, k: 1 });

    if (chosenMode === 'live') {
      setProgressData({
        status: 'created',
        counts: { papers: 0, claims: 0, edges: 0 },
        error: null,
      });
      try {
        const base = apiUrl.replace(/\/$/, '');
        const res = await fetch(`${base}/workspaces`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q }),
        });
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const ws = await res.json();
        setWorkspaceId(ws.id);

        if (ws.status === 'ready') {
          setProgressData({
            status: 'ready',
            counts: { papers: 6, claims: 6, edges: 5 },
            error: null,
          });
          await loadWorkspaceArtifacts(ws.id, 'live');
          return;
        }

        // Poll /workspaces/{id}/status while discovering/extracting
        const pollInterval = setInterval(async () => {
          try {
            const stRes = await fetch(`${base}/workspaces/${ws.id}/status`);
            if (!stRes.ok) return;
            const st = await stRes.json();
            setProgressData({
              status: st.status,
              counts: st.counts || { papers: 0, claims: 0, edges: 0 },
              error: st.error || null,
            });
            if (st.status === 'ready') {
              clearInterval(pollInterval);
              await loadWorkspaceArtifacts(ws.id, 'live');
            } else if (st.status === 'error') {
              clearInterval(pollInterval);
            }
          } catch {
            // keep polling
          }
        }, 1200);
        return;
      } catch (err) {
        console.warn('Live workspace creation failed, switching to mock simulation:', err);
        setMode('mock');
      }
    }

    // Animated stage progression in Mock Mode so user sees the full pipeline UX
    setWorkspaceId('mock-ws-001');
    setMockPapers(MOCK_FIXTURE_PAPERS);
    setMockEdges(MOCK_EDGES);

    const steps = [
      { status: 'created', counts: { papers: 0, claims: 0, edges: 0 }, delay: 150 },
      { status: 'discovering', counts: { papers: 6, claims: 0, edges: 0 }, delay: 550 },
      { status: 'extracting', counts: { papers: 6, claims: 6, edges: 2 }, delay: 1000 },
      { status: 'ready', counts: { papers: 6, claims: 6, edges: 5 }, delay: 1450 },
    ];

    steps.forEach((step) => {
      setTimeout(() => {
        setProgressData({
          status: step.status,
          counts: step.counts,
          error: null,
        });
        if (step.status === 'ready') {
          loadWorkspaceArtifacts('mock-ws-001', 'mock', MOCK_FIXTURE_PAPERS, MOCK_EDGES);
        }
      }, step.delay);
    });
  };

  // Inspect a Paper Node
  const handleSelectPaper = async (paperId) => {
    setActiveRightDrawer('paper');
    setLoadingPaper(true);

    if (mode === 'live') {
      try {
        const base = apiUrl.replace(/\/$/, '');
        const res = await fetch(`${base}/papers/${paperId}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedPaper(data);
          setLoadingPaper(false);
          return;
        }
      } catch {
        // fallback to mock
      }
    }

    const found = mockPapers.find((p) => p.id === paperId);
    if (found) {
      setSelectedPaper(found);
    }
    setLoadingPaper(false);
  };

  // Inspect a Claim Relationship Edge (Comparison View)
  const handleSelectEdge = async (edgeId) => {
    setLoadingEdge(true);
    setSelectedEdge({ id: edgeId, loading: true });

    if (mode === 'live') {
      try {
        const base = apiUrl.replace(/\/$/, '');
        const res = await fetch(`${base}/edges/${edgeId}`);
        if (res.ok) {
          const data = await res.json();
          const graphEdge = graphData.edges.find((e) => e.id === edgeId);
          const paperA = graphData.nodes.find((n) => n.id === graphEdge?.paper_a);
          const paperB = graphData.nodes.find((n) => n.id === graphEdge?.paper_b);
          setSelectedEdge({
            id: edgeId,
            ...data,
            paper_a_title: paperA?.title || 'Study A',
            paper_b_title: paperB?.title || 'Study B',
          });
          setLoadingEdge(false);
          return;
        }
      } catch {
        // fallback to mock
      }
    }

    const edge = mockEdges.find((e) => e.id === edgeId);
    if (edge) {
      const paperA = mockPapers.find((p) => p.id === edge.paper_a);
      const paperB = mockPapers.find((p) => p.id === edge.paper_b);
      const claimA = paperA?.claims.find((c) => c.id === edge.claim_a) || paperA?.claims[0];
      const claimB = paperB?.claims.find((c) => c.id === edge.claim_b) || paperB?.claims[0];

      setSelectedEdge({
        id: edge.id,
        label: edge.label,
        confidence: edge.confidence,
        reason: edge.reason,
        factors: edge.factors,
        paper_a_title: paperA?.title,
        paper_a_year: paperA?.year,
        paper_a_authors: paperA?.authors,
        paper_b_title: paperB?.title,
        paper_b_year: paperB?.year,
        paper_b_authors: paperB?.authors,
        a: claimA || null,
        b: claimB || null,
      });
    }
    setLoadingEdge(false);
  };

  // Add a New Paper & Evaluate Impact (Stage 10)
  const handleAddNewPaper = async ({ title, authors, year, full_text }) => {
    if (mode === 'live' && workspaceId) {
      try {
        const base = apiUrl.replace(/\/$/, '');
        const res = await fetch(`${base}/workspaces/${workspaceId}/papers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            authors: authors || null,
            year: year ? Number(year) : null,
            full_text,
          }),
        });
        if (res.ok) {
          const report = await res.json();
          await loadWorkspaceArtifacts(workspaceId, 'live');
          return report;
        }
      } catch (err) {
        console.warn('Live add_paper failed, running mock Stage 10 evaluation:', err);
      }
    }

    // Mock Stage 10 Evaluation
    const newId = `paper-new-${Date.now()}`;
    const newClaimId = `claim-new-${Date.now()}`;
    const firstSentence =
      full_text
        .split('.')
        .map((s) => s.trim())
        .find((s) => s.length > 20) || full_text.slice(0, 140);

    const isNegative = /lower|decrease|no effect|not significant|underperform/i.test(full_text);
    const isConditional = /only when|scaffold|guided|high school|college|long-term/i.test(full_text);

    const newPaperObj = {
      id: newId,
      key: 'NEW',
      title,
      authors: authors || 'Uploaded Author(s)',
      year: year ? Number(year) : 2025,
      venue: 'User Uploaded Manuscript',
      doi: null,
      text_level: 'full',
      retraction_status: null,
      relevance: 0.79,
      sector: 0,
      angle: 0.88,
      radius: 0.3048,
      claims: [
        {
          id: newClaimId,
          paper_id: newId,
          claim_text: `Uploaded study finding: ${firstSentence}.`,
          intervention: 'AI tutor',
          outcome: 'math post-test score',
          outcome_family: 'math_test_score',
          direction: isNegative ? 'decrease' : 'increase',
          significance: 'significant',
          effect_size: isNegative ? '-7%' : '+14%',
          population: isConditional ? 'high school students' : 'middle school students',
          sample_n: 310,
          design: 'RCT',
          duration: '8 weeks',
          measure: 'standardized math post-test',
          limitations: 'Single-semester follow-up window reported by authors.',
          quote: firstSentence + '.',
          location: 'Uploaded Full Text',
        },
      ],
    };

    const edgeLabel = isNegative
      ? 'genuine_contradiction'
      : isConditional
      ? 'apparent_contradiction'
      : 'supports_compatible';

    const impactKind = isNegative
      ? 'challenges'
      : isConditional
      ? 'qualifies'
      : 'strengthens';

    const newEdgeObj = {
      id: `edge-new-${Date.now()}`,
      paper_a: newId,
      paper_b: 'paper-p1',
      claim_a: newClaimId,
      claim_b: 'claim-c1',
      label: edgeLabel,
      confidence: 0.84,
      factors: isConditional ? ['population', 'duration'] : [],
      reason: isNegative
        ? 'Uploaded RCT reports lower post-test outcomes under comparable math assessment conditions, challenging Chen & Patel (2021).'
        : isConditional
        ? 'Results align directionally, but extended 8-week duration and high-school cohort qualify the scope of Chen & Patel (2021).'
        : 'Replicates positive math post-test gains from AI tutoring in a larger sample (n=310), strengthening Chen & Patel (2021).',
    };

    const updatedPapers = [...mockPapers, newPaperObj];
    const updatedEdges = [...mockEdges, newEdgeObj];
    setMockPapers(updatedPapers);
    setMockEdges(updatedEdges);
    await loadWorkspaceArtifacts(workspaceId || 'mock-ws-001', 'mock', updatedPapers, updatedEdges);

    return {
      paper_id: newId,
      impact: [
        {
          new_claim: newPaperObj.claims[0].claim_text,
          existing_claim: "AI tutoring improved middle schoolers' math post-test scores.",
          impact: impactKind,
          reason: newEdgeObj.reason,
        },
      ],
    };
  };

  // Send GraphRAG Chat Question (Stage 11)
  const handleSendChat = async (customPrompt = null) => {
    const q = (customPrompt || chatInput).trim();
    if (!q || chatLoading) return;

    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: q }]);
    setChatLoading(true);

    if (mode === 'live' && workspaceId) {
      try {
        const base = apiUrl.replace(/\/$/, '');
        const res = await fetch(`${base}/workspaces/${workspaceId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q }),
        });
        if (res.ok) {
          const data = await res.json();
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: data.answer,
              cited_claim_ids: data.cited_claim_ids || [],
              uncertainty_note: data.uncertainty_note || null,
            },
          ]);
          setChatLoading(false);
          return;
        }
      } catch {
        // fallback to mock chat
      }
    }

    // Mock GraphRAG response grounded in fixture claims
    setTimeout(() => {
      const lower = q.toLowerCase();
      let reply;
      if (lower.includes('retention') || lower.includes('short-term') || lower.includes('long-term')) {
        reply = {
          answer:
            'In this library, short-term middle school math post-tests showed +18% [claim-c1] and +15% [claim-c4] gains over 6 weeks, whereas a 4-week undergraduate statistics study found no statistically significant difference in delayed retention scores (p = .41) [claim-c2]. Only one abstract-only note examined 1-year retention and reported that "the sample size was too small to draw firm conclusions" [claim-c6].',
          cited_claim_ids: ['claim-c1', 'claim-c4', 'claim-c2', 'claim-c6'],
          uncertainty_note:
            'Long-term retention evidence in this library relies on a single abstract-only research note with unreported sample size.',
        };
      } else if (lower.includes('disprove') || lower.includes('conflict') || lower.includes('reyes')) {
        reply = {
          answer:
            'Reyes (2020) [claim-c5] presents a genuine contradiction with Chen & Patel (2021) [claim-c1] and Martinez (2023) [claim-c4]: in a pre-registered 6-week middle school math RCT, the AI-tutor group scored 9% lower on the post-test than traditionally-tutored peers (p = .02), whereas Chen & Patel reported an 18% gain against a business-as-usual control (p < .01).',
          cited_claim_ids: ['claim-c5', 'claim-c1', 'claim-c4'],
          uncertainty_note:
            'Control conditions differ across studies (active traditional human tutoring in Reyes vs. business-as-usual classroom instruction in Chen & Patel).',
        };
      } else {
        reply = {
          answer:
            'Across the examined studies, AI tutoring increased middle school math post-test scores by 18% [claim-c1] and 15% [claim-c4] in 6-week RCTs, but a pre-registered RCT found a 9% decrease compared to human tutoring [claim-c5]. Meanwhile, no significant effect was found on undergraduate retention [claim-c2], and engagement decreased by 12% among low-achieving high schoolers [claim-c3].',
          cited_claim_ids: ['claim-c1', 'claim-c4', 'claim-c5', 'claim-c2', 'claim-c3'],
          uncertainty_note: null,
        };
      }
      setChatMessages((prev) => [...prev, { role: 'assistant', ...reply }]);
      setChatLoading(false);
    }, 450);
  };

  // ==========================================================================
  // 4. RADIAL GRAPH GEOMETRY & FILTERING
  // ==========================================================================

  const GRAPH_MAX_RADIUS_PX = 290;

  const filteredNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (graphData.nodes || []).filter((node) => {
      const rel = node.relevance ?? 0.5;
      if (rel < minRelevance) return false;
      if (q && !node.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [graphData.nodes, minRelevance, searchQuery]);

  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const nodePositions = useMemo(() => {
    const pos = {};
    (graphData.nodes || []).forEach((node, idx) => {
      // Backend provides normalized radius in [0.12, 1.0] and angle in radians
      const rNorm = node.radius != null ? node.radius : 0.12 + (1 - (node.relevance ?? 0.5)) * 0.88;
      const angle = node.angle != null ? node.angle : (idx * 2 * Math.PI) / Math.max(graphData.nodes.length, 1);
      const rPx = rNorm * GRAPH_MAX_RADIUS_PX;
      pos[node.id] = {
        x: Math.cos(angle) * rPx,
        y: Math.sin(angle) * rPx,
        rPx,
        angle,
      };
    });
    return pos;
  }, [graphData.nodes]);

  const filteredEdges = useMemo(() => {
    return (graphData.edges || []).filter((edge) => {
      if (!activeEdgeFilters[edge.label]) return false;
      if (!visibleNodeIds.has(edge.paper_a) || !visibleNodeIds.has(edge.paper_b)) return false;
      return true;
    });
  }, [graphData.edges, activeEdgeFilters, visibleNodeIds]);

  const edgeCountsByType = useMemo(() => {
    const counts = {
      genuine_contradiction: 0,
      apparent_contradiction: 0,
      supports_compatible: 0,
      related_not_comparable: 0,
      unresolved: 0,
    };
    (graphData.edges || []).forEach((e) => {
      if (counts[e.label] !== undefined) counts[e.label] += 1;
    });
    return counts;
  }, [graphData.edges]);

  // Pan & Zoom Handlers
  const handleWheel = (e) => {
    e.preventDefault();
    const scaleFactor = e.deltaY < 0 ? 1.12 : 0.9;
    setTransform((prev) => ({
      ...prev,
      k: Math.min(Math.max(prev.k * scaleFactor, 0.45), 2.8),
    }));
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('[data-interactive="true"]')) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ==========================================================================
  // 5. RENDER: TOP NAVIGATION BAR
  // ==========================================================================

  const renderHeader = () => (
    <header className="h-14 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setView('setup')}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:bg-indigo-700 transition">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight text-base">ResearchLens</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-400">
              Claim-Level Evidence Graph
            </span>
          </div>
        </button>

        {view === 'workspace' && (
          <>
            <span className="text-slate-300 hidden md:inline">/</span>
            <div className="hidden md:flex items-center gap-2 max-w-md truncate bg-slate-100 px-3 py-1 rounded-full text-xs font-medium text-slate-700">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{graphData.question}</span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Connection Status Pill */}
        <div className="relative">
          <button
            onClick={() => setShowApiConfig((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
              mode === 'live' && backendHealthy
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
            title="Configure FastAPI Backend Connection"
          >
            {mode === 'live' && backendHealthy ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Live FastAPI</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Built-in Mock Demo</span>
              </>
            )}
          </button>

          {showApiConfig && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Backend Connection
                </span>
                <button
                  onClick={() => setShowApiConfig(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Connect to your running FastAPI server (<code className="text-indigo-600">uvicorn app.main:app</code>) or use the built-in offline fixture library.
              </p>
              <label className="block text-xs font-medium text-slate-700 mb-1">FastAPI Base URL</label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-2"
                placeholder="http://localhost:8000"
              />
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      backendHealthy ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                  {backendHealthy ? 'Server reachable' : 'Server offline'}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setMode('mock');
                      setShowApiConfig(false);
                    }}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      mode === 'mock'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Mock
                  </button>
                  <button
                    onClick={() => {
                      setMode('live');
                      setShowApiConfig(false);
                    }}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      mode === 'live'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Live API
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {view === 'workspace' && (
          <>
            <button
              onClick={() => setShowAddPaperModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Paper</span>
            </button>

            <button
              onClick={() =>
                setActiveRightDrawer((prev) => (prev === 'gaps' ? null : 'gaps'))
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                activeRightDrawer === 'gaps'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Gaps & Flags</span>
              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[11px] font-semibold">
                {(flagsData.limitations?.length || 0) +
                  (flagsData.weak_claims?.length || 0) +
                  (flagsData.gaps?.length || 0)}
              </span>
            </button>

            <button
              onClick={() =>
                setActiveRightDrawer((prev) => (prev === 'chat' ? null : 'chat'))
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                activeRightDrawer === 'chat'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">GraphRAG Chat</span>
            </button>
          </>
        )}
      </div>
    </header>
  );

  // ==========================================================================
  // 6. RENDER: STAGE 0 WORKSPACE SETUP SCREEN
  // ==========================================================================

  const renderSetupView = () => (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Evidence Synthesis with Verbatim Quote Traceability</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
            Ask a research question. Map where the evidence agrees or conflicts.
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            ResearchLens gathers open-access studies, extracts testable claims backed by exact verbatim quotes, and distinguishes genuine contradictions from differences in study conditions.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/90 p-6 sm:p-8">
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            Research Question
          </label>
          <div className="relative">
            <textarea
              rows={2}
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="e.g., Do AI tutors improve learning?"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base resize-none"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Try example:</span>
            {[
              'Do AI tutors improve learning?',
              'Does spaced repetition improve long-term retention?',
              'Are flipped classrooms effective in undergraduate STEM?',
            ].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setQuestionInput(sample)}
                className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition"
              >
                {sample}
              </button>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                {backendHealthy ? (
                  <span className="text-emerald-700 font-medium">
                    FastAPI backend detected at {apiUrl}
                  </span>
                ) : (
                  <span>
                    FastAPI offline — ready for instant offline demo mode
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {backendHealthy && (
                <button
                  onClick={() => handleStartWorkspace('live')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2"
                >
                  <span>Run on FastAPI</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleStartWorkspace(backendHealthy ? 'mock' : null)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2"
              >
                <span>{backendHealthy ? 'Launch Instant Demo' : 'Build Evidence Graph'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Four Retrieval Lanes Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {[
            { lane: 'Lane A', title: 'Scholarly APIs', desc: 'OpenAlex, Crossref, Europe PMC' },
            { lane: 'Lane B', title: 'Google Scholar', desc: 'Bright Data Scraper API' },
            { lane: 'Lane C', title: 'Public OA Text', desc: 'Bright Data Web Unlocker' },
            { lane: 'Stage 4–7', title: 'Quote Verified', desc: 'Verbatim check + Gemini' },
          ].map((item) => (
            <div
              key={item.lane}
              className="bg-white/80 border border-slate-200/80 rounded-xl p-3 text-left"
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                {item.lane}
              </div>
              <div className="text-xs font-semibold text-slate-800 mt-0.5">{item.title}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ==========================================================================
  // 7. RENDER: LIVE PIPELINE PROGRESS SCREEN (STAGES 1 - 9)
  // ==========================================================================

  const renderProgressView = () => {
    const stages = [
      {
        id: 'created',
        title: 'Stage 1: Question Parsing & Sub-Question Sectors',
        desc: 'Decomposing population, intervention, outcome families, and search queries',
        done: ['discovering', 'extracting', 'ready'].includes(progressData.status),
        active: progressData.status === 'created',
      },
      {
        id: 'discovering',
        title: 'Stage 2–3: Multi-Lane Discovery & Full-Text Retrieval',
        desc: 'Querying OpenAlex/Crossref/Europe PMC & Bright Data Scholar, deduplicating by DOI/trigram',
        done: ['extracting', 'ready'].includes(progressData.status),
        active: progressData.status === 'discovering',
      },
      {
        id: 'extracting',
        title: 'Stage 4–7: Verbatim Quote Check & Relationship Verification',
        desc: 'Extracting testable claims, checking verbatim quotes in code, verifying contradictions',
        done: progressData.status === 'ready',
        active: progressData.status === 'extracting',
      },
      {
        id: 'ready',
        title: 'Stage 8–9: Library Flags & Radial Relevance Layout',
        desc: 'Computing relevance scores, polar coordinates, and library-scoped gap flags',
        done: progressData.status === 'ready',
        active: false,
      },
    ];

    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Building Evidence Graph</h2>
              <p className="text-xs text-slate-500 truncate max-w-md">{questionInput}</p>
            </div>
          </div>

          {/* Live Counters */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-slate-900">
                {progressData.counts?.papers ?? 0}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">Papers Kept</div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {progressData.counts?.claims ?? 0}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">Verified Claims</div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-teal-600">
                {progressData.counts?.edges ?? 0}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">Claim Links</div>
            </div>
          </div>

          {/* Pipeline Stages */}
          <div className="space-y-3">
            {stages.map((st) => (
              <div
                key={st.id}
                className={`p-3.5 rounded-xl border transition flex items-start gap-3 ${
                  st.done
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : st.active
                    ? 'bg-indigo-50/60 border-indigo-200'
                    : 'bg-white border-slate-100 opacity-60'
                }`}
              >
                <div className="mt-0.5">
                  {st.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : st.active ? (
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">{st.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{st.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {progressData.error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              Pipeline error: {progressData.error}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 8. RENDER: INTERACTIVE RADIAL EVIDENCE GRAPH (MAIN WORKSPACE VIEW)
  // ==========================================================================

  const renderWorkspaceView = () => {
    const subQuestions = graphData.sub_questions || [];
    const numSectors = Math.max(subQuestions.length, 1);

    return (
      <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden bg-slate-50 relative">
        {/* LEFT FILTER & LEGEND SIDEBAR */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between overflow-y-auto shrink-0 hidden lg:flex">
          <div className="p-4 space-y-5">
            {/* Search Filter */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Filter Library
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search paper title..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Minimum Relevance Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Min Relevance
                </label>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {minRelevance.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.9"
                step="0.05"
                value={minRelevance}
                onChange={(e) => setMinRelevance(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0.0 (Outer)</span>
                <span>0.5</span>
                <span>0.9 (Center)</span>
              </div>
            </div>

            {/* Edge Relationship Toggles */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Claim Relationships
                </span>
                <span className="text-[11px] text-slate-400">Click edge to compare</span>
              </div>
              <div className="space-y-1.5">
                {Object.entries(EDGE_STYLES).map(([key, style]) => {
                  const active = activeEdgeFilters[key];
                  const count = edgeCountsByType[key] || 0;
                  return (
                    <button
                      key={key}
                      onClick={() =>
                        setActiveEdgeFilters((prev) => ({ ...prev, [key]: !prev[key] }))
                      }
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border text-left transition ${
                        active
                          ? 'bg-white border-slate-200 shadow-2xs'
                          : 'bg-slate-50 border-transparent opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <svg width="24" height="8" className="shrink-0">
                          <line
                            x1="0"
                            y1="4"
                            x2="24"
                            y2="4"
                            stroke={style.color}
                            strokeWidth={style.strokeWidth}
                            strokeDasharray={style.dashArray}
                          />
                        </svg>
                        <span className="text-xs font-medium text-slate-700 truncate">
                          {style.shortLabel}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Node Border Legend */}
            <div className="pt-3 border-t border-slate-100">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Evidence Text Level
              </span>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full border-2 border-indigo-600 bg-white inline-block shrink-0" />
                  <span>Full text retrieved (verified quotes)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full border-2 border-dashed border-amber-500 bg-amber-50 inline-block shrink-0" />
                  <span>Abstract only (capped confidence)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mandatory Footnote (Section 11) */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>Relevance helps navigation and is not a measure of truth.</span>
          </div>
        </aside>

        {/* CENTER INTERACTIVE RADIAL GRAPH CANVAS */}
        <main
          ref={svgContainerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex-1 relative overflow-hidden select-none cursor-grab active:cursor-grabbing bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]"
        >
          {/* Floating Graph Toolbar */}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
            <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-xs px-3 py-1.5 flex items-center gap-3 text-xs">
              <span className="font-semibold text-slate-700">
                {filteredNodes.length} Papers
              </span>
              <span className="text-slate-300">|</span>
              <span className="font-semibold text-slate-700">
                {filteredEdges.length} Claim Links
              </span>
            </div>

            <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-xs p-1 flex items-center gap-1">
              <button
                onClick={() => setTransform((t) => ({ ...t, k: Math.min(t.k * 1.2, 2.8) }))}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTransform((t) => ({ ...t, k: Math.max(t.k * 0.85, 0.45) }))}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTransform({ x: 0, y: 0, k: 1 })}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                title="Reset View"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive SVG Radial Graph */}
          <svg className="w-full h-full" viewBox="-480 -380 960 760">
            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
              {/* 1. Concentric Relevance Rings (0.8, 0.6, 0.4, 0.2) */}
              {[
                { rel: 0.8, label: '0.8' },
                { rel: 0.6, label: '0.6' },
                { rel: 0.4, label: '0.4' },
                { rel: 0.2, label: '0.2' },
              ].map((ring) => {
                const rNorm = 0.12 + (1 - ring.rel) * 0.88;
                const rPx = rNorm * GRAPH_MAX_RADIUS_PX;
                return (
                  <g key={ring.rel}>
                    <circle
                      cx={0}
                      cy={0}
                      r={rPx}
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth="1"
                      strokeDasharray="4, 4"
                    />
                    <text
                      x={4}
                      y={-rPx + 12}
                      fill="#94a3b8"
                      fontSize="10"
                      fontWeight="600"
                    >
                      rel {ring.label}
                    </text>
                  </g>
                );
              })}

              {/* 2. Sub-Question Angular Sector Dividers & Labels */}
              {subQuestions.map((sq, idx) => {
                const sectorWidth = (2 * Math.PI) / numSectors;
                const borderAngle = idx * sectorWidth;
                const midAngle = borderAngle + sectorWidth / 2;
                const outerR = GRAPH_MAX_RADIUS_PX + 28;
                const labelR = GRAPH_MAX_RADIUS_PX + 48;
                const lx = Math.cos(midAngle) * labelR;
                const ly = Math.sin(midAngle) * labelR;

                return (
                  <g key={idx}>
                    <line
                      x1={0}
                      y1={0}
                      x2={Math.cos(borderAngle) * outerR}
                      y2={Math.sin(borderAngle) * outerR}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                    />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor={lx > 20 ? 'start' : lx < -20 ? 'end' : 'middle'}
                      fill="#64748b"
                      fontSize="11"
                      fontWeight="600"
                    >
                      {sq.length > 36 ? sq.slice(0, 34) + '…' : sq}
                    </text>
                  </g>
                );
              })}

              {/* 3. Radial Spokes (Question Center -> Paper Node) */}
              {filteredNodes.map((node) => {
                const pos = nodePositions[node.id];
                if (!pos) return null;
                return (
                  <line
                    key={`spoke-${node.id}`}
                    x1={0}
                    y1={0}
                    x2={pos.x}
                    y2={pos.y}
                    stroke="#e2e8f0"
                    strokeWidth="1.2"
                  />
                );
              })}

              {/* 4. Claim-Level Relationship Edges Between Papers */}
              {filteredEdges.map((edge) => {
                const pA = nodePositions[edge.paper_a];
                const pB = nodePositions[edge.paper_b];
                if (!pA || !pB) return null;
                const style = EDGE_STYLES[edge.label] || EDGE_STYLES.unresolved;

                // Slight curve so edges don't pass directly over the center question node
                const midX = (pA.x + pB.x) / 2;
                const midY = (pA.y + pB.y) / 2;
                const curveX = midX * 0.82;
                const curveY = midY * 0.82;
                const pathD = `M ${pA.x} ${pA.y} Q ${curveX} ${curveY} ${pB.x} ${pB.y}`;

                return (
                  <g
                    key={edge.id}
                    data-interactive="true"
                    onClick={() => handleSelectEdge(edge.id)}
                    className="cursor-pointer group"
                  >
                    {/* Wide invisible hit target for easy clicking */}
                    <path d={pathD} fill="none" stroke="transparent" strokeWidth="14" />
                    <path
                      d={pathD}
                      fill="none"
                      stroke={style.color}
                      strokeWidth={style.strokeWidth}
                      strokeDasharray={style.dashArray}
                      className="transition-all duration-150 group-hover:stroke-[4.5px]"
                    />
                    {/* Interactive midpoint badge */}
                    <circle
                      cx={curveX * 0.91 + midX * 0.09}
                      cy={curveY * 0.91 + midY * 0.09}
                      r="6"
                      fill="#ffffff"
                      stroke={style.color}
                      strokeWidth="2"
                      className="group-hover:scale-125 transition-transform"
                    />
                  </g>
                );
              })}

              {/* 5. Center Research Question Node */}
              <g data-interactive="true">
                <circle
                  cx={0}
                  cy={0}
                  r="42"
                  fill="#312e81"
                  stroke="#c7d2fe"
                  strokeWidth="4"
                  className="shadow-md"
                />
                <text
                  x={0}
                  y={-5}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="700"
                >
                  RESEARCH
                </text>
                <text
                  x={0}
                  y={9}
                  textAnchor="middle"
                  fill="#c7d2fe"
                  fontSize="9"
                  fontWeight="600"
                >
                  QUESTION
                </text>
              </g>

              {/* 6. Paper Nodes */}
              {filteredNodes.map((node) => {
                const pos = nodePositions[node.id];
                if (!pos) return null;
                const isSelected = selectedPaper?.id === node.id && activeRightDrawer === 'paper';
                const isAbstract = node.text_level === 'abstract';
                const shortTitle =
                  node.title.length > 26 ? node.title.slice(0, 24) + '…' : node.title;

                return (
                  <g
                    key={node.id}
                    data-interactive="true"
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => handleSelectPaper(node.id)}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    className="cursor-pointer group"
                  >
                    {isSelected && (
                      <circle
                        r="27"
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="2.5"
                        opacity="0.45"
                      />
                    )}
                    <circle
                      r="20"
                      fill={isAbstract ? '#fffbeb' : '#ffffff'}
                      stroke={isSelected ? '#4f46e5' : isAbstract ? '#f59e0b' : '#1e293b'}
                      strokeWidth={isSelected ? '3' : '2.2'}
                      strokeDasharray={isAbstract ? '4, 3' : 'none'}
                      className="transition-transform duration-150 group-hover:scale-110"
                    />
                    <text
                      y="3"
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="10"
                      fontWeight="700"
                    >
                      {node.year || 'Paper'}
                    </text>

                    {/* Paper label pill below node */}
                    <g transform="translate(0, 31)">
                      <rect
                        x="-68"
                        y="-9"
                        width="136"
                        height="18"
                        rx="4"
                        fill="rgba(255,255,255,0.92)"
                        stroke="#e2e8f0"
                        strokeWidth="1"
                      />
                      <text
                        y="3"
                        textAnchor="middle"
                        fill="#1e293b"
                        fontSize="9.5"
                        fontWeight="600"
                      >
                        {shortTitle}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Hover Tooltip */}
          {hoveredNode && (
            <div className="absolute bottom-12 left-4 z-20 max-w-sm bg-slate-900/95 text-white rounded-xl p-3.5 shadow-xl pointer-events-none">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 text-[10px] font-bold">
                  Relevance {((hoveredNode.relevance ?? 0) * 100).toFixed(0)}%
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    hoveredNode.text_level === 'full'
                      ? 'bg-emerald-500/30 text-emerald-200'
                      : 'bg-amber-500/30 text-amber-200'
                  }`}
                >
                  {hoveredNode.text_level === 'full' ? 'Full Text' : 'Abstract Only'}
                </span>
              </div>
              <div className="text-xs font-semibold leading-snug">{hoveredNode.title}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Click node to inspect extracted claims & verbatim quotes
              </div>
            </div>
          )}

          {/* Bottom Bar: Quick Edge List + Mandatory Footnote */}
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-600 shadow-2xs pointer-events-auto">
              <strong>Tip:</strong> Click any <span className="text-red-600 font-semibold">red</span> or{' '}
              <span className="text-teal-600 font-semibold">teal</span> link between papers to open the side-by-side claim comparison.
            </div>
            <div className="lg:hidden bg-white/95 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-500">
              Relevance helps navigation and is not a measure of truth.
            </div>
          </div>
        </main>

        {/* RIGHT SLIDE-OVER DRAWER (Paper Inspector | Gaps & Flags | GraphRAG Chat) */}
        {activeRightDrawer && (
          <aside className="w-full sm:w-[440px] bg-white border-l border-slate-200 flex flex-col z-20 shadow-xl shrink-0">
            {activeRightDrawer === 'paper' && renderPaperDrawer()}
            {activeRightDrawer === 'gaps' && renderGapsDrawer()}
            {activeRightDrawer === 'chat' && renderChatDrawer()}
          </aside>
        )}

        {/* SIDE-BY-SIDE CLAIM COMPARISON MODAL (Stage 7) */}
        {selectedEdge && renderComparisonModal()}

        {/* ADD PAPER & IMPACT REPORT MODAL (Stage 10) */}
        {showAddPaperModal && (
          <AddPaperModal
            onClose={() => setShowAddPaperModal(false)}
            onSubmit={handleAddNewPaper}
          />
        )}
      </div>
    );
  };

  // ==========================================================================
  // 9. RENDER: PAPER INSPECTOR DRAWER
  // ==========================================================================

  const renderPaperDrawer = () => (
    <>
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Paper Claims & Quotes
          </span>
        </div>
        <button
          onClick={() => setActiveRightDrawer(null)}
          className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {loadingPaper || !selectedPaper ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading paper claims...</span>
          </div>
        ) : (
          <>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    selectedPaper.text_level === 'full'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {selectedPaper.text_level === 'full'
                    ? 'Full Text Verified'
                    : 'Abstract Only (Lower Confidence)'}
                </span>
                {selectedPaper.year && (
                  <span className="text-xs font-medium text-slate-500">
                    {selectedPaper.year}
                  </span>
                )}
                {selectedPaper.doi && (
                  <a
                    href={`https://doi.org/${selectedPaper.doi}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                  >
                    <span>DOI</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {selectedPaper.title}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {selectedPaper.authors || 'Authors not listed'}
                {selectedPaper.venue ? ` • ${selectedPaper.venue}` : ''}
              </p>
            </div>

            {selectedPaper.retraction_status && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Publisher Notice:</strong> {selectedPaper.retraction_status}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Extracted Testable Claims ({selectedPaper.claims?.length || 0})
              </div>

              {(selectedPaper.claims || []).map((claim) => (
                <div
                  key={claim.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-400">
                      {claim.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {claim.direction && (
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            claim.direction === 'increase'
                              ? 'bg-teal-50 text-teal-700'
                              : claim.direction === 'decrease'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {claim.direction}
                        </span>
                      )}
                      {claim.significance && (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-medium">
                          {claim.significance}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 leading-snug">
                    {claim.claim_text}
                  </p>

                  {/* Study Conditions Metadata */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Population</span>
                      <span className="text-slate-700 font-medium">
                        {claim.population || 'not_reported'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Duration</span>
                      <span className="text-slate-700 font-medium">
                        {claim.duration || 'not_reported'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px] uppercase">Measure</span>
                      <span className="text-slate-700 font-medium">
                        {claim.measure || 'not_reported'}
                      </span>
                    </div>
                  </div>

                  {/* Verbatim Quote Box */}
                  <div className="bg-indigo-50/50 border-l-4 border-indigo-500 p-3 rounded-r-lg">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-1">
                      <span className="flex items-center gap-1">
                        <Quote className="w-3 h-3" />
                        Verbatim Source Quote
                      </span>
                      <span>{claim.location || 'Source Text'}</span>
                    </div>
                    <p className="text-xs text-slate-800 italic leading-relaxed">
                      “{claim.quote}”
                    </p>
                  </div>

                  {claim.limitations && claim.limitations !== 'not_reported' && (
                    <div className="text-xs text-amber-800 bg-amber-50/80 border border-amber-200/70 rounded-lg p-2.5">
                      <strong>Author-stated limitation:</strong> {claim.limitations}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );

  // ==========================================================================
  // 10. RENDER: GAPS & FLAGS DRAWER (STAGE 8 — THREE SEPARATE LISTS)
  // ==========================================================================

  const renderGapsDrawer = () => (
    <>
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-amber-50/60">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
            Library Flags & Evidence Gaps
          </span>
        </div>
        <button
          onClick={() => setActiveRightDrawer(null)}
          className="p-1 rounded-lg hover:bg-amber-100 text-amber-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <div className="p-3 rounded-xl bg-slate-100 text-xs text-slate-600 leading-relaxed">
          <strong>Scope Note:</strong> Per ResearchLens methodology, these three lists are never merged, and gaps refer strictly to <em>the papers examined in this workspace</em>—not all published science.
        </div>

        {/* 1. Stated Limitations */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            1. Author-Stated Limitations ({flagsData.limitations?.length || 0})
          </h4>
          {flagsData.limitations?.length ? (
            <ul className="space-y-2">
              {flagsData.limitations.map((item, idx) => (
                <li
                  key={idx}
                  className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">No explicit limitations reported in extracted claims.</p>
          )}
        </div>

        {/* 2. Weakly Supported Claims */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            2. Weakly Supported Claims ({flagsData.weak_claims?.length || 0})
          </h4>
          {flagsData.weak_claims?.length ? (
            <ul className="space-y-2">
              {flagsData.weak_claims.map((item, idx) => (
                <li
                  key={idx}
                  className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-950 leading-relaxed"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">No abstract-only or small-sample flags triggered.</p>
          )}
        </div>

        {/* 3. Unrepresented Topics in This Library */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-800 mb-2.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            3. Unrepresented in This Library ({flagsData.gaps?.length || 0})
          </h4>
          {flagsData.gaps?.length ? (
            <ul className="space-y-2">
              {flagsData.gaps.map((item, idx) => (
                <li
                  key={idx}
                  className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200 text-xs text-indigo-950 leading-relaxed"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">All parsed sub-questions had at least one matching claim in this library.</p>
          )}
        </div>
      </div>
    </>
  );

  // ==========================================================================
  // 11. RENDER: GRAPHRAG CITED CHATBOT DRAWER (STAGE 11)
  // ==========================================================================

  const renderChatDrawer = () => (
    <>
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-indigo-50/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-950">
            GraphRAG Quote-Grounded Chat
          </span>
        </div>
        <button
          onClick={() => setActiveRightDrawer(null)}
          className="p-1 rounded-lg hover:bg-indigo-100 text-indigo-900"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Starter Prompt Chips */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-1.5">
        {[
          'Distinguish short-term vs long-term results',
          'Does Reyes (2020) disprove Chen & Patel (2021)?',
        ].map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSendChat(prompt)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 text-slate-600 transition text-left"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}
            >
              <p>{msg.content}</p>

              {msg.cited_claim_ids && msg.cited_claim_ids.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase text-slate-500">
                    Cited Claims:
                  </span>
                  {msg.cited_claim_ids.map((cid) => (
                    <button
                      key={cid}
                      onClick={() => {
                        // Find paper owning this claim in mock mode and open it
                        const owner = mockPapers.find((p) =>
                          p.claims.some((c) => c.id === cid)
                        );
                        if (owner) handleSelectPaper(owner.id);
                      }}
                      className="px-2 py-0.5 rounded bg-white border border-indigo-200 text-indigo-700 font-mono text-[10px] hover:bg-indigo-50"
                    >
                      {cid}
                    </button>
                  ))}
                </div>
              )}

              {msg.uncertainty_note && (
                <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{msg.uncertainty_note}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {chatLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Retrieving claim neighborhood & quotes...</span>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendChat();
        }}
        className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
      >
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Ask about agreements, conflicts, or gaps..."
          className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={chatLoading || !chatInput.trim()}
          className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </>
  );

  // ==========================================================================
  // 12. RENDER: SIDE-BY-SIDE CLAIM COMPARISON MODAL (STAGE 7)
  // ==========================================================================

  const renderComparisonModal = () => {
    const style = EDGE_STYLES[selectedEdge.label] || EDGE_STYLES.unresolved;
    const sideA = selectedEdge.a || {};
    const sideB = selectedEdge.b || {};
    const differingFactors = new Set(selectedEdge.factors || []);

    const rows = [
      { key: 'claim_text', label: 'Normalized Claim', highlight: false },
      { key: 'direction', label: 'Effect Direction', highlight: false },
      { key: 'significance', label: 'Statistical Significance', highlight: false },
      { key: 'population', label: 'Population', highlight: differingFactors.has('population') },
      { key: 'sample_n', label: 'Sample Size (n)', highlight: differingFactors.has('sample_size') },
      { key: 'design', label: 'Study Design', highlight: differingFactors.has('method') },
      { key: 'duration', label: 'Duration', highlight: differingFactors.has('duration') },
      { key: 'measure', label: 'Outcome Measure', highlight: differingFactors.has('measure') },
    ];

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <GitCompare className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Side-by-Side Claim Comparison
                </h3>
                <p className="text-xs text-slate-500">
                  Verifying comparability, conditions, and verbatim source quotes
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedEdge(null)}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loadingEdge ? (
              <div className="py-12 flex items-center justify-center gap-2 text-slate-500 text-sm">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading verification details...</span>
              </div>
            ) : (
              <>
                {/* Verdict Banner */}
                <div className={`p-4 rounded-xl border ${style.bgLight} ${style.borderLight}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white border ${style.borderLight} ${style.textDark}`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: style.color }}
                      />
                      {style.label}
                    </span>
                    {selectedEdge.confidence != null && (
                      <span className="text-xs font-semibold text-slate-700">
                        Verification Confidence: {(selectedEdge.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {selectedEdge.reason}
                  </p>
                  {selectedEdge.factors && selectedEdge.factors.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-600">
                        Differing Study Factors:
                      </span>
                      {selectedEdge.factors.map((f) => (
                        <span
                          key={f}
                          className="px-2 py-0.5 rounded bg-white/90 border border-slate-300 text-xs font-semibold text-slate-800"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comparison Matrix Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="py-3 px-4 font-bold text-slate-600 w-44">Dimension</th>
                        <th className="py-3 px-4 font-bold text-slate-900">
                          Study A: {selectedEdge.paper_a_title || 'Claim A'}
                        </th>
                        <th className="py-3 px-4 font-bold text-slate-900">
                          Study B: {selectedEdge.paper_b_title || 'Claim B'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {rows.map((row) => (
                        <tr
                          key={row.key}
                          className={row.highlight ? 'bg-amber-50/70' : 'bg-white'}
                        >
                          <td className="py-2.5 px-4 font-semibold text-slate-600 flex items-center gap-1.5">
                            <span>{row.label}</span>
                            {row.highlight && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                                Differs
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-slate-800">
                            {sideA[row.key] ?? 'not_reported'}
                          </td>
                          <td className="py-2.5 px-4 text-slate-800">
                            {sideB[row.key] ?? 'not_reported'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Verbatim Source Quotes Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-1.5 flex items-center gap-1">
                      <Quote className="w-3.5 h-3.5" />
                      Verbatim Quote — Study A
                    </div>
                    <p className="text-xs text-slate-800 italic leading-relaxed">
                      “{sideA.quote || 'No quote available.'}”
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-1.5 flex items-center gap-1">
                      <Quote className="w-3.5 h-3.5" />
                      Verbatim Quote — Study B
                    </div>
                    <p className="text-xs text-slate-800 italic leading-relaxed">
                      “{sideB.quote || 'No quote available.'}”
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 13. MAIN RETURN
  // ==========================================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {renderHeader()}
      {view === 'setup' && renderSetupView()}
      {view === 'progress' && renderProgressView()}
      {view === 'workspace' && renderWorkspaceView()}
    </div>
  );
}

// ============================================================================
// 14. STAGE 10: ADD NEW PAPER & IMPACT REPORT MODAL COMPONENT
// ============================================================================

function AddPaperModal({ onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [year, setYear] = useState('2025');
  const [fullText, setFullText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [report, setReport] = useState(null);

  const fillSample = (variant) => {
    if (variant === 'strengthen') {
      setTitle('Multi-District RCT of Adaptive AI Math Tutors in Grade 7');
      setAuthors('Alvarez, K., Wong, T.');
      setYear('2025');
      setFullText(
        'Methods: 310 seventh-grade middle school students were randomly assigned to an adaptive AI tutor or control classroom over 6 weeks. Results: Students using the AI tutor scored 14% higher on the standardized math post-test than controls (p < .01).'
      );
    } else {
      setTitle('AI Tutoring Outcomes Depend on Teacher Scaffolding in High School');
      setAuthors('Lindqvist, E.');
      setYear('2025');
      setFullText(
        'Methods: 280 high school students used an AI tutor for 8 weeks with or without weekly teacher scaffolding. Results: Unscaffolded AI-tutor use resulted in 7% lower post-test scores compared to teacher-guided instruction (p = .03).'
      );
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !fullText.trim()) return;
    setSubmitting(true);
    const res = await onSubmit({
      title: title.trim(),
      authors: authors.trim(),
      year,
      full_text: fullText.trim(),
    });
    setReport(res);
    setSubmitting(false);
  };

  const impactBadge = (kind) => {
    switch (kind) {
      case 'strengthens':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'challenges':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'qualifies':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      default:
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <Plus className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Evaluate New Paper Against Evidence Graph
              </h3>
              <p className="text-xs text-slate-500">
                Extracts claims, verifies verbatim quotes, and computes graph impact
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {!report ? (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 bg-indigo-50/70 p-3 rounded-xl border border-indigo-100">
                <span className="text-xs font-semibold text-indigo-900">
                  Quick-fill test manuscript:
                </span>
                <button
                  type="button"
                  onClick={() => fillSample('strengthen')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-medium"
                >
                  + Replicating RCT (Strengthens)
                </button>
                <button
                  type="button"
                  onClick={() => fillSample('challenge')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-medium"
                >
                  + Conflicting High School RCT (Challenges)
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Paper Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Randomized Trial of AI Tutoring in Algebra"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Authors
                  </label>
                  <input
                    type="text"
                    value={authors}
                    onChange={(e) => setAuthors(e.target.value)}
                    placeholder="e.g., Alvarez, K., Wong, T."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Publication Year
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Paper Full Text (or Methods & Results Excerpt) *
                </label>
                <textarea
                  rows={5}
                  required
                  value={fullText}
                  onChange={(e) => setFullText(e.target.value)}
                  placeholder="Paste full text so ResearchLens can extract claims and verify verbatim quotes..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? 'Evaluating Impact...' : 'Evaluate & Update Graph'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-emerald-950">
                    Paper Added & Graph Updated
                  </div>
                  <div className="text-xs text-emerald-800">
                    {title} has been placed on the radial evidence graph.
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Impact on Existing Library ({report.impact?.length || 0} Claim Links)
                </h4>
                {(report.impact || []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    No overlapping outcome-family claims matched above similarity threshold.
                  </p>
                ) : (
                  report.impact.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-white space-y-2"
                    >
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${impactBadge(
                          item.impact
                        )}`}
                      >
                        {item.impact}
                      </span>
                      <div className="text-xs text-slate-900 font-semibold">
                        New: {item.new_claim}
                      </div>
                      <div className="text-xs text-slate-600">
                        Prior: {item.existing_claim}
                      </div>
                      <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {item.reason}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                >
                  View Updated Graph
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}