"""
Real Gemini client. One method per proposal stage that needs the model.
Every prompt below encodes the "non-negotiable rules" from section 12
verbatim -- don't loosen these when iterating on prompts later:
  - extraction: quotes must be verbatim, no paraphrase inside `quote`
  - verification: never infer non-significant == no effect; abstract-only
    caps confidence; unclear comparability -> "unresolved"
  - chat: answer only from retrieved quotes, cite claim IDs, say what's
    missing

Claude cannot call this from the build sandbox (generativelanguage.
googleapis.com isn't reachable here), so it's unexercised by the test
suite in tests/ -- those tests run against clients/mock.py instead, which
implements the identical interface. Wire a real GEMINI_API_KEY and flip
RESEARCHLENS_MODE=live to use this.
"""
from __future__ import annotations
import json
from typing import Any

import httpx
from tenacity import retry, wait_exponential, stop_after_attempt

from app.config import get_settings

settings = get_settings()
_TIMEOUT = 60.0
_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class LiveGeminiClient:
    def __init__(self):
        self.api_key = settings.gemini_api_key
        self.model = settings.gemini_model
        self.embed_model = settings.gemini_embed_model

    @retry(wait=wait_exponential(multiplier=1, min=2, max=20), stop=stop_after_attempt(3))
    def _generate_json(self, system: str, user: str) -> dict:
        """Calls generateContent with responseMimeType=application/json so the
        model is constrained to valid JSON -- no fence-stripping needed."""
        url = f"{_BASE}/{self.model}:generateContent?key={self.api_key}"
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {"responseMimeType": "application/json"},
        }
        with httpx.Client(timeout=_TIMEOUT) as client:
            r = client.post(url, json=body)
            r.raise_for_status()
            data = r.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)

    def understand_question(self, question: str) -> dict[str, Any]:
        """Stage 1."""
        system = (
            "You turn a research question into a structured brief. Return JSON only "
            "with keys: population, intervention, outcome, comparison, "
            "outcome_families (list), search_queries (3-5 items), "
            "sub_questions (3-6 items). Do not editorialize or answer the question."
        )
        return self._generate_json(system, question)

    def extract_claims(self, paper_text: str, paper_meta: dict) -> list[dict[str, Any]]:
        """Stage 4. Verbatim-quote rule is non-negotiable (section 12)."""
        system = (
            "Extract 3 to 6 testable findings from this paper. For each, return an "
            "object with: claim_text (one normalized sentence), intervention, outcome, "
            "outcome_family, direction (increase|decrease|no_effect|mixed), "
            "significance (significant|not_significant|not_reported), effect_size, "
            "population, sample_n, design, duration, measure, limitations (as stated "
            "by the authors), quote (COPIED VERBATIM from the text, one or two "
            "sentences, never paraphrased), location (page or section). "
            "If a field is not reported, use \"not_reported\" rather than guessing. "
            "Return a JSON array only."
        )
        user = f"Paper metadata: {json.dumps(paper_meta)}\n\nPaper text:\n{paper_text}"
        result = self._generate_json(system, user)
        return result if isinstance(result, list) else result.get("claims", [])

    def verify_relationship(self, claim_a: dict, claim_b: dict) -> dict[str, Any]:
        """Stage 7. Labels per section 8's table."""
        system = (
            "Compare two claims ONLY on the supplied fields and quotes. Labels: "
            "supports_compatible, genuine_contradiction, apparent_contradiction, "
            "related_not_comparable, unresolved. Rules: a non-significant result does "
            "not refute a significant one; abstract-only evidence caps confidence "
            "(max 0.6); if comparability is unclear, return unresolved. Return JSON "
            "with: label, factors (list of: population, duration, measure, method, "
            "sample_size, statistical_power -- only ones that actually differ), "
            "confidence (0-1), reason, quotes_used (list)."
        )
        user = json.dumps({"claim_a": claim_a, "claim_b": claim_b})
        return self._generate_json(system, user)

    @retry(wait=wait_exponential(multiplier=1, min=2, max=20), stop=stop_after_attempt(3))
    def embed(self, text: str) -> list[float]:
        url = f"{_BASE}/{self.embed_model}:embedContent?key={self.api_key}"
        with httpx.Client(timeout=_TIMEOUT) as client:
            r = client.post(url, json={"content": {"parts": [{"text": text}]}})
            r.raise_for_status()
            return r.json()["embedding"]["values"]

    def chat(self, question: str, context_claims: list[dict]) -> dict[str, Any]:
        """Stage 11. Answers only from retrieved quotes (section 12)."""
        system = (
            "Answer the question using ONLY the supplied claims and quotes. Cite claim "
            "IDs for every assertion. If the retrieved material doesn't answer the "
            "question, or is unresolved/missing, say so explicitly. Never state whether "
            "a paper is right or wrong. Return JSON with: answer (text), "
            "cited_claim_ids (list), uncertainty_note (text or null)."
        )
        user = json.dumps({"question": question, "claims": context_claims})
        return self._generate_json(system, user)
