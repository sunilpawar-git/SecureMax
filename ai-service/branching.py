"""
AI-driven branch selection for the questionnaire engine.
Uses Gemini Flash to choose the next question node based on user answers
and CPP context. Falls back to deterministic routing on any failure.
"""

import asyncio
import json
import logging
from dataclasses import dataclass

from google import genai
from google.genai import types

from config import Settings, get_settings
from prompts import build_branching_prompt
from questionnaire import determine_next_node
from schemas import CppChunkResult

logger = logging.getLogger(__name__)

_AI_TIMEOUT_SECONDS = 5
_GEMINI_MODEL = get_settings().generation_model_fast


@dataclass(frozen=True, slots=True)
class BranchResult:
    target_id: str
    reasoning: str
    ai_used: bool


async def determine_next_node_with_ai(
    current_node: dict,
    answer: str | list[str],
    node_map: dict[str, dict],
    context_events: list[dict],
    cpp_chunks: list[CppChunkResult],
    settings: Settings,
    session_id: str = "",
) -> BranchResult:
    """Select the next node using Gemini AI or deterministic fallback.

    Gemini is ONLY invoked for text_input questions with two or more DISTINCT
    non-any branch targets — i.e., cases where a free-text answer must be
    semantically interpreted to choose between different paths.

    For single_choice / multi_choice nodes the answer is always an exact MCQ
    option string; determine_next_node() handles that with exact matching and
    Gemini adds no value (and can misroute, inflating the session length).
    """
    edges = current_node.get("edges", [])
    answer_str = answer if isinstance(answer, str) else answer[0] if answer else ""

    # MCQ: deterministic exact-match is always correct — skip Gemini entirely.
    question_type = current_node.get("question_type", "")
    if question_type in ("single_choice", "multi_choice"):
        fallback_id = determine_next_node(current_node, answer, node_map)
        return BranchResult(
            target_id=fallback_id or "",
            reasoning="MCQ — deterministic routing; AI skipped",
            ai_used=False,
        )

    # For text_input: only invoke Gemini when there are 2+ DISTINCT non-any
    # targets.  If all negative-condition edges share the same destination the
    # decision is still binary (enter branch / skip branch) and is deterministic.
    non_any_edges = [e for e in edges if e.get("condition", "") != "any"]
    distinct_non_any_targets = {e["target"] for e in non_any_edges if e.get("target")}
    if len(distinct_non_any_targets) < 2:
        fallback_id = determine_next_node(current_node, answer, node_map)
        return BranchResult(
            target_id=fallback_id or "",
            reasoning="Single-path or unconditional edge — AI skipped",
            ai_used=False,
        )

    valid_targets = [e["target"] for e in edges if e.get("target")]

    try:
        result = await asyncio.wait_for(
            _call_gemini(
                current_node,
                answer_str,
                context_events,
                cpp_chunks,
                valid_targets,
                settings,
            ),
            timeout=_AI_TIMEOUT_SECONDS,
        )
    except TimeoutError:
        return _fallback(current_node, answer, node_map, session_id, "Gemini timeout")
    except Exception as exc:
        return _fallback(current_node, answer, node_map, session_id, f"Gemini error: {exc}")

    if result.target_id not in valid_targets:
        return _fallback(
            current_node,
            answer,
            node_map,
            session_id,
            f"Invalid target_id from AI: {result.target_id}",
        )

    return result


async def _call_gemini(
    current_node: dict,
    answer_str: str,
    context_events: list[dict],
    cpp_chunks: list[CppChunkResult],
    valid_targets: list[str],
    settings: Settings,
) -> BranchResult:
    """Call Gemini Flash and parse the structured JSON response."""
    prompt = build_branching_prompt(current_node, answer_str, context_events, cpp_chunks)

    response_schema = types.Schema(
        type=types.Type.OBJECT,
        properties={
            "target_id": types.Schema(type=types.Type.STRING, enum=valid_targets),
            "reasoning": types.Schema(type=types.Type.STRING),
        },
        required=["target_id", "reasoning"],
    )

    def _sync_generate() -> str:
        client = genai.Client(api_key=settings.gemini_api_key)
        resp = client.models.generate_content(
            model=_GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_schema,
                temperature=0.1,
            ),
        )
        return resp.text

    raw_text = await asyncio.to_thread(_sync_generate)
    parsed = json.loads(raw_text)
    return BranchResult(
        target_id=parsed["target_id"],
        reasoning=parsed.get("reasoning", ""),
        ai_used=True,
    )


def _fallback(
    current_node: dict,
    answer: str | list[str],
    node_map: dict[str, dict],
    session_id: str,
    reason: str,
) -> BranchResult:
    """Deterministic fallback with observability logging."""
    fallback_id = determine_next_node(current_node, answer, node_map) or ""
    logger.warning(
        "AI branching fallback: session=%s node=%s reason=%s fallback=%s",
        session_id,
        current_node.get("id", "?"),
        reason,
        fallback_id,
    )
    return BranchResult(target_id=fallback_id, reasoning=f"Fallback: {reason}", ai_used=False)
