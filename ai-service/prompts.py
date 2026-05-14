"""
SSOT for all Gemini prompt templates and prompt-building helpers.
Templates are string constants. Helpers format inputs into prompts.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from schemas import CppChunkResult

BRANCHING_PROMPT_TEMPLATE = """You are a security audit questionnaire engine.
Given the user's answer and relevant CPP security framework context, decide which \
question branch to follow next.

## Current Question
Domain: {domain}
Question: {question_text}
User Answer: {answer}

## CPP Context (relevant security framework sections)
{cpp_context}

## Previous Q&A Context
{qa_context}

## Available Branches
{branches}

## Instructions
Choose the single best branch target based on:
1. The user's answer content and sentiment
2. Alignment with CPP security framework guidance
3. Logical flow of the questionnaire

Return ONLY a JSON object with your choice:
{{"target_id": "<one of the valid target IDs>", "reasoning": "<brief explanation>"}}"""

_CONTEXT_SEP = "\n---\n"
_CPP_FMT = "[{domain}] {section}:\n{text}"
_BRANCH_FMT = "- {target_id}: condition={condition}"
_ANSWER_MAX_CHARS = 500
_CPP_CHUNK_MAX_CHARS = 300


def build_branching_prompt(
    current_node: dict,
    answer_str: str,
    context_events: list[dict],
    cpp_chunks: list[CppChunkResult],
) -> str:
    """Assemble the full branching prompt from node, answer, and context."""
    from context import build_context_summary

    cpp_context = (
        _CONTEXT_SEP.join(
            _CPP_FMT.format(
                domain=c.domain,
                section=c.section,
                text=c.chunk_text[:_CPP_CHUNK_MAX_CHARS],
            )
            for c in cpp_chunks
        )
        or "No CPP context available."
    )

    qa_context = build_context_summary(context_events) or "No prior context."
    answer_str = answer_str[:_ANSWER_MAX_CHARS]

    branches = "\n".join(
        _BRANCH_FMT.format(target_id=e["target"], condition=e.get("condition", "any"))
        for e in current_node.get("edges", [])
        if e.get("target")
    )

    return BRANCHING_PROMPT_TEMPLATE.format(
        domain=current_node.get("domain", ""),
        question_text=current_node.get("text", ""),
        answer=answer_str,
        cpp_context=cpp_context,
        qa_context=qa_context,
        branches=branches,
    )
