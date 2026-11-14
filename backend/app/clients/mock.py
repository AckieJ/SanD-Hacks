"""
Deterministic offline implementations of every client interface in
clients/base.py. These exist so (a) `pytest` can exercise the real
pipeline logic -- dedup, matching, scoring, quote validation -- without
any API keys or network, and (b) anyone can demo the product before
Bright Data / Gemini keys are set up.

The six fixture papers below are hand-authored so that:
  - every `quote` is an exact substring of that paper's `full_text` (or
    `abstract` for the abstract-only one) -- the Stage 4 code-level quote
    check in pipeline/extract.py is validated against real text, not
    hand-waved
  - the six papers produce one of each relationship label from section 8:
    P1<->P4 supports_compatible, P1<->P5 genuine_contradiction,
    P1<->P2 apparent_contradiction, P1<->P3 related_not_comparable,
    and P6 is the abstract-only / weak-claim flag for Stage 8's gaps panel
"""
from __future__ import annotations
import hashlib
import re
from typing import Any

EMBED_DIM = 64

FIXTURE_PAPERS: list[dict[str, Any]] = [
    {
        "key": "P1",
        "title": "AI Tutoring Boosts Math Scores in Middle School",
        "authors": "Chen, L., Patel, R.",
        "year": 2021,
        "venue": "Journal of Educational Technology",
        "doi": "10.9999/jedtech.2021.0001",
        "oa_url": "https://arxiv.org/abs/2101.00001",
        "abstract": "We report a randomized study of AI-tutor use in middle school math classrooms.",
        "full_text": (
            "Methods: 240 middle school students were randomly assigned to an AI-tutor "
            "condition or a business-as-usual control over a 6-week unit. "
            "Results: Students using the AI tutor scored 18% higher on the post-test "
            "than the control group (p < .01). Gains were largest among students who "
            "started below grade level."
        ),
    },
    {
        "key": "P2",
        "title": "No Effect of Chatbot Tutors on Undergraduate Retention",
        "authors": "Okafor, N., Diaz, M.",
        "year": 2022,
        "venue": "Computers & Education",
        "doi": "10.9999/candc.2022.0002",
        "oa_url": "https://arxiv.org/abs/2202.00002",
        "abstract": "We examine whether chatbot tutoring improves retention in an intro statistics course.",
        "full_text": (
            "Methods: 180 undergraduates in an introductory statistics course used a "
            "chatbot tutor for 4 weeks. Retention was measured with a delayed quiz. "
            "Results: We found no statistically significant difference in retention "
            "scores between the chatbot-tutored group and the control group (p = .41)."
        ),
    },
    {
        "key": "P3",
        "title": "AI Tutors Reduce Engagement in Low-Achieving Students",
        "authors": "Singh, A.",
        "year": 2023,
        "venue": "Learning & Instruction",
        "doi": "10.9999/lni.2023.0003",
        "oa_url": "https://biorxiv.org/content/2023.00003",
        "abstract": "This study tracks engagement among low-achieving high schoolers using an AI tutor.",
        "full_text": (
            "Methods: Engagement was tracked via click-stream data for 90 low-achieving "
            "high schoolers over 4 weeks of AI-tutor use. "
            "Results: Among students in the bottom quartile, engagement scores decreased "
            "by 12% after four weeks of AI-tutor use, driven mainly by reduced voluntary "
            "practice time."
        ),
    },
    {
        "key": "P4",
        "title": "Confirming AI Tutoring Math Gains: A Replication",
        "authors": "Martinez, S.",
        "year": 2023,
        "venue": "Journal of Educational Technology",
        "doi": "10.9999/jedtech.2023.0004",
        "oa_url": "https://arxiv.org/abs/2301.00004",
        "abstract": "A direct replication of Chen et al. (2021) in a second school district.",
        "full_text": (
            "Methods: 210 middle school students across three schools were randomized "
            "to AI-tutor or control over a 6-week math unit, following Chen et al.'s "
            "protocol. Results: Consistent with Chen et al., students scored 15% higher "
            "on the post-test (p < .01)."
        ),
    },
    {
        "key": "P5",
        "title": "AI Tutor Group Underperforms in a Pre-Registered RCT",
        "authors": "Reyes, D.",
        "year": 2020,
        "venue": "Educational Researcher",
        "doi": "10.9999/edres.2020.0005",
        "oa_url": "https://arxiv.org/abs/2001.00005",
        "abstract": "A pre-registered RCT comparing AI tutoring to traditional tutoring in middle school math.",
        "full_text": (
            "Methods: 260 middle school students were randomized to a 6-week AI-tutor "
            "condition or traditional human tutoring, pre-registered on OSF. "
            "Results: In our randomized controlled trial, the AI-tutor group scored 9% "
            "lower on the post-test than traditionally-tutored peers (p = .02)."
        ),
    },
    {
        "key": "P6",
        "title": "AI Tutoring and Long-Term Retention: A Research Note",
        "authors": "Park, J.",
        "year": 2022,
        "venue": "(abstract only -- full text not openly accessible)",
        "doi": "10.9999/note.2022.0006",
        "oa_url": None,
        "abstract": (
            "Long-term retention one year after AI-tutor use remains understudied; "
            "preliminary data from a small convenience sample suggest modest gains, "
            "but the sample size was too small to draw firm conclusions."
        ),
        "full_text": None,
    },
]

FIXTURE_CLAIMS: dict[str, list[dict[str, Any]]] = {
    "P1": [{
        "claim_text": "AI tutoring improved middle schoolers' math post-test scores.",
        "intervention": "AI tutor", "outcome": "math post-test score",
        "outcome_family": "math_test_score", "direction": "increase",
        "significance": "significant", "effect_size": "+18%",
        "population": "middle school students", "sample_n": 240,
        "design": "RCT", "duration": "6 weeks", "measure": "standardized math post-test",
        "limitations": "not_reported",
        "quote": "Students using the AI tutor scored 18% higher on the post-test than the control group (p < .01).",
        "location": "Results",
    }],
    "P2": [{
        "claim_text": "Chatbot math tutoring showed no effect on undergraduate math test retention.",
        "intervention": "AI chatbot tutor", "outcome": "math retention quiz score",
        "outcome_family": "math_test_score", "direction": "no_effect",
        "significance": "not_significant", "effect_size": "not_reported",
        "population": "undergraduate math students", "sample_n": 180,
        "design": "RCT", "duration": "4 weeks", "measure": "delayed math retention quiz",
        "limitations": "not_reported",
        "quote": "We found no statistically significant difference in retention scores between the chatbot-tutored group and the control group (p = .41).",
        "location": "Results",
    }],
    "P3": [{
        "claim_text": "AI tutoring reduced engagement among low-achieving high schoolers.",
        "intervention": "AI tutor", "outcome": "engagement score",
        "outcome_family": "engagement", "direction": "decrease",
        "significance": "not_reported", "effect_size": "-12%",
        "population": "low-achieving high school students", "sample_n": 90,
        "design": "observational", "duration": "4 weeks", "measure": "click-stream engagement score",
        "limitations": "not_reported",
        "quote": "Among students in the bottom quartile, engagement scores decreased by 12% after four weeks of AI-tutor use",
        "location": "Results",
    }],
    "P4": [{
        "claim_text": "A replication confirmed AI tutoring improves middle schoolers' math scores.",
        "intervention": "AI tutor", "outcome": "math post-test score",
        "outcome_family": "math_test_score", "direction": "increase",
        "significance": "significant", "effect_size": "+15%",
        "population": "middle school students", "sample_n": 210,
        "design": "RCT", "duration": "6 weeks", "measure": "standardized math post-test",
        "limitations": "not_reported",
        "quote": "Consistent with Chen et al., students scored 15% higher on the post-test (p < .01).",
        "location": "Results",
    }],
    "P5": [{
        "claim_text": "A pre-registered RCT found the AI-tutor group scored lower than traditionally-tutored peers.",
        "intervention": "AI tutor", "outcome": "math post-test score",
        "outcome_family": "math_test_score", "direction": "decrease",
        "significance": "significant", "effect_size": "-9%",
        "population": "middle school students", "sample_n": 260,
        "design": "RCT", "duration": "6 weeks", "measure": "standardized math post-test",
        "limitations": "not_reported",
        "quote": "In our randomized controlled trial, the AI-tutor group scored 9% lower on the post-test than traditionally-tutored peers (p = .02).",
        "location": "Results",
    }],
    "P6": [{
        "claim_text": "Preliminary, underpowered data suggest modest long-term retention gains from AI tutoring.",
        "intervention": "AI tutor", "outcome": "one-year retention",
        "outcome_family": "math_test_score", "direction": "increase",
        "significance": "not_reported", "effect_size": "not_reported",
        "population": "not_reported", "sample_n": None,
        "design": "observational", "duration": "1 year", "measure": "not_reported",
        "limitations": "sample size was too small to draw firm conclusions",
        "quote": "preliminary data from a small convenience sample suggest modest gains, but the sample size was too small to draw firm conclusions",
        "location": "Abstract",
    }],
}


def _hash_embed(text: str, dim: int = EMBED_DIM) -> list[float]:
    """Deterministic bag-of-words hashing embedding -- stands in for a real
    Gemini embedding so cosine similarity in Stage 5/6 behaves sensibly
    (same-topic text lands closer together) without calling any API."""
    vec = [0.0] * dim
    for word in re.findall(r"[a-z0-9']+", text.lower()):
        h = int(hashlib.md5(word.encode()).hexdigest(), 16)
        vec[h % dim] += 1.0
    norm = sum(v * v for v in vec) ** 0.5
    return [v / norm for v in vec] if norm else vec


class MockDiscoveryClient:
    """Lane A stand-in."""
    def search(self, query: str, limit: int = 20) -> list[dict]:
        return [
            {**p, "lane": "A", "source_api": "openalex (mock)"}
            for p in FIXTURE_PAPERS
        ][:limit]

    def resolve_doi(self, title: str, year: int | None) -> str | None:
        for p in FIXTURE_PAPERS:
            if p["title"].lower() == title.lower():
                return p["doi"]
        return None


class MockScholarClient:
    """Lane B stand-in -- returns the same papers, simulating Scholar
    surfacing results discovery already found (a realistic overlap case
    Stage 2's de-dup step is responsible for collapsing)."""
    def search(self, query: str, limit: int = 20) -> list[dict]:
        return [{**p, "lane": "B"} for p in FIXTURE_PAPERS[:3]][:limit]

    def cited_by(self, result_url: str, limit: int = 10) -> list[dict]:
        return []

    def related(self, result_url: str, limit: int = 10) -> list[dict]:
        return []


class MockUnlockerClient:
    """Lane C stand-in -- 'fetches' full text for papers that have it."""
    def fetch(self, url: str) -> str:
        for p in FIXTURE_PAPERS:
            if p.get("oa_url") == url and p.get("full_text"):
                return p["full_text"]
        raise FileNotFoundError(f"No mock full text for {url} -- falls back to abstract_level")


class MockAIClient:
    """Deterministic stand-in for Gemini across all five stages it covers."""

    def understand_question(self, question: str) -> dict[str, Any]:
        return {
            "population": "students (K-12 and undergraduate)",
            "intervention": "AI tutor / chatbot tutor",
            "outcome": "learning outcomes",
            "comparison": "traditional instruction or no tutor",
            "outcome_families": ["math_test_score", "engagement"],
            "search_queries": [
                "AI tutor learning outcomes",
                "chatbot tutoring randomized trial",
                "intelligent tutoring system math scores",
                "AI tutor student engagement",
            ],
            "sub_questions": [
                "Does AI tutoring change test scores?",
                "Does AI tutoring change engagement or motivation?",
                "Do effects replicate across populations?",
            ],
        }

    def extract_claims(self, paper_text: str, paper_meta: dict) -> list[dict]:
        for key, claims in FIXTURE_CLAIMS.items():
            fixture = next(p for p in FIXTURE_PAPERS if p["key"] == key)
            if fixture["title"] == paper_meta.get("title"):
                return claims
        return []

    def verify_relationship(self, claim_a: dict, claim_b: dict) -> dict[str, Any]:
        """Simple, explainable rule-stand-in for the Gemini verification prompt
        in clients/gemini_live.py -- same inputs/outputs, deterministic."""
        same_family = claim_a.get("outcome_family") == claim_b.get("outcome_family")
        if not same_family:
            return {"label": "related_not_comparable", "factors": [], "confidence": 0.9,
                     "reason": "Different outcome families.", "quotes_used": []}

        comparable_fields = ["population", "duration", "measure"]
        differing = [f for f in comparable_fields if claim_a.get(f) != claim_b.get(f)]
        abstract_involved = claim_a.get("location") == "Abstract" or claim_b.get("location") == "Abstract"

        dir_a, dir_b = claim_a.get("direction"), claim_b.get("direction")
        sig_a, sig_b = claim_a.get("significance"), claim_b.get("significance")
        opposite_direction = {dir_a, dir_b} == {"increase", "decrease"}

        if dir_a == dir_b and not differing:
            label, confidence, reason = (
                "supports_compatible", 0.9,
                "Same direction on closely comparable studies.",
            )
        elif opposite_direction and not differing and sig_a == "significant" and sig_b == "significant":
            label, confidence, reason = (
                "genuine_contradiction", 0.85,
                "Comparable studies (same population/duration/measure) report "
                "significant effects in opposite directions.",
            )
        elif differing and (sig_a != sig_b or opposite_direction):
            label, confidence, reason = (
                "apparent_contradiction", 0.7,
                f"Results differ, but {', '.join(differing)} also differ between studies.",
            )
        else:
            label, confidence, reason = ("unresolved", 0.5, "Comparability unclear.")

        if abstract_involved:
            confidence = min(confidence, 0.6)

        return {
            "label": label, "factors": differing, "confidence": confidence,
            "reason": reason,
            "quotes_used": [claim_a.get("quote"), claim_b.get("quote")],
        }

    def embed(self, text: str) -> list[float]:
        return _hash_embed(text)

    def chat(self, question: str, context_claims: list[dict]) -> dict[str, Any]:
        if not context_claims:
            return {
                "answer": "I don't have any matching claims in this library to answer that.",
                "cited_claim_ids": [], "uncertainty_note": "No retrieved evidence.",
            }
        ids = [c.get("id") for c in context_claims if c.get("id")]
        summary = "; ".join(c.get("claim_text", "") for c in context_claims[:3])
        return {
            "answer": f"Based on the retrieved claims: {summary}",
            "cited_claim_ids": ids,
            "uncertainty_note": None if len(context_claims) > 1 else "Only one matching claim was found.",
        }
