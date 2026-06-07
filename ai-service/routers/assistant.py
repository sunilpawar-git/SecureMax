"""
CPP-grounded conversational AI assistant endpoint.
Uses Gemini + RAG over CPP Seven Precis embeddings.
"""

import logging
import time
from string import Template

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from config import get_settings
from cpp_repository import get_relevant_chunks
from db import get_db

router = APIRouter(prefix="/assistant", tags=["assistant"])
logger = logging.getLogger(__name__)

_MAX_CONTEXT_CHUNKS = 5
_MAX_RESPONSE_CHARS = 2000

_rate_limit_map: dict[str, float] = {}

_SYSTEM_PROMPT = Template("""You are a physical security expert assistant for SecureMax, \
grounded in the CPP Seven Precis framework.

Your role:
- Answer questions about physical security, access control, crisis management, \
information security, personnel security, investigations, and security management.
- Always ground your answers in the CPP reference material provided below.
- Cite which CPP domain(s) your answer draws from (e.g., "Per CPP-01: Physical Security...").
- If the question is outside the CPP framework scope, say so clearly.
- Be concise and actionable. Limit response to 3-4 paragraphs max.

CPP Reference Context:
$context

User Question: $question""")


class AssistantQuery(BaseModel):
    question: str = Field(min_length=3, max_length=500)
    session_id: str | None = None
    domains: list[str] | None = None


class AssistantResponse(BaseModel):
    answer: str
    citations: list[dict]
    domains_referenced: list[str]


@router.post("/ask", response_model=AssistantResponse)
async def ask_assistant(
    req: AssistantQuery,
    request: Request,
    conn: asyncpg.Connection = Depends(get_db),  # noqa: B008
) -> AssistantResponse:
    """Answer a security question grounded in CPP Seven Precis."""
    user_id = request.headers.get("X-User-Id", "anonymous")
    settings = get_settings()
    now = time.monotonic()
    last_call = _rate_limit_map.get(user_id, 0.0)
    if now - last_call < settings.ai_rate_limit_seconds:
        raise HTTPException(
            status_code=429,
            detail="Please wait before asking another question.",
        )
    _rate_limit_map[user_id] = now

    gemini = getattr(request.app.state, "gemini", None)
    if gemini is None:
        return AssistantResponse(
            answer="AI assistant is currently unavailable. Please try again later.",
            citations=[],
            domains_referenced=[],
        )

    chunks = await get_relevant_chunks(
        req.question,
        conn,
        settings,
        top_k=_MAX_CONTEXT_CHUNKS,
        gemini=gemini,
        domains=req.domains,
    )

    context_parts = []
    citations = []
    domains_seen = set()

    for chunk in chunks:
        context_parts.append(f"[{chunk.domain} — {chunk.section}]\n{chunk.chunk_text}")
        citations.append(
            {
                "domain": chunk.domain,
                "section": chunk.section,
                "excerpt": chunk.chunk_text[:200],
            }
        )
        domains_seen.add(chunk.domain)

    no_context = "No relevant CPP material found."
    context = "\n\n---\n\n".join(context_parts) if context_parts else no_context

    prompt = _SYSTEM_PROMPT.substitute(context=context, question=req.question)

    try:
        answer = await gemini.generate(prompt, model=settings.generation_model_fast)
        if len(answer) > _MAX_RESPONSE_CHARS:
            answer = answer[:_MAX_RESPONSE_CHARS] + "..."
    except (OSError, ValueError, RuntimeError) as e:
        logger.warning("Gemini generation failed for assistant: %s", e)
        answer = (
            "I'm unable to generate a response right now. "
            "Please try again or consult the CPP Seven Precis documentation directly."
        )

    return AssistantResponse(
        answer=answer,
        citations=citations,
        domains_referenced=sorted(domains_seen),
    )
