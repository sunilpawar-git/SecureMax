"""
LinkedIn post drafting — admin endpoint.
Uses Gemini Pro to draft engaging posts from threat intel articles.
"""

import json
import logging
import re

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from config import get_settings
from gemini_client import GeminiClient, GeminiError

router = APIRouter(prefix="/linkedin", tags=["linkedin"])
logger = logging.getLogger(__name__)

# Accepts both UUIDs and Prisma CUIDs (cuid() produces cljxxxxxxxxxxxxxxxx-style IDs)
_SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")


class DraftRequest(BaseModel):
    article_ids: list[str] = Field(..., min_length=1, max_length=10)

    @field_validator("article_ids")
    @classmethod
    def validate_ids(cls, ids: list[str]) -> list[str]:
        for uid in ids:
            if not _SAFE_ID_RE.match(uid):
                raise ValueError(f"Invalid article ID format: {uid!r}")
        return ids


@router.post("/draft")
async def draft_post(req: DraftRequest, request: Request) -> dict:
    """Draft a LinkedIn post from selected threat_intel articles."""
    pool = request.app.state.pool

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT title, summary, domain_tags
            FROM threat_intel
            WHERE id = ANY($1::text[])
              AND soft_deleted = FALSE
            """,
            req.article_ids,
        )

    if not rows:
        return {
            "post_text": "No matching articles found.",
            "hashtags": [],
            "character_count": 0,
        }

    article_text = "\n".join(f"- {r['title']}: {r['summary']}" for r in rows)

    prompt = (
        "Draft a LinkedIn post for Raivan Global Security Consulting.\n\n"
        "Recent security incidents:\n"
        f"{article_text}\n\n"
        "Requirements:\n"
        "- 1-2 sentences highlighting the shared risk pattern\n"
        "- 1-2 sentences on why this matters to facility managers\n"
        "- Position Raivan Global's audit approach as proactive\n"
        "- Soft CTA: What's your organization's physical security posture?\n"
        "- 3-5 hashtags\n"
        "- Max 1300 characters. Professional, non-promotional tone.\n\n"
        'Return ONLY JSON: {"post_text": "...", "hashtags": ["...", "..."]}'
    )

    gemini = getattr(request.app.state, "gemini", None)
    if gemini is None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise HTTPException(status_code=503, detail="Gemini API key not configured")
        gemini = GeminiClient(settings)

    try:
        raw = await gemini.generate(prompt)
        cleaned = re.sub(r"^```[a-z]*\n?", "", raw.strip())
        cleaned = re.sub(r"\n?```$", "", cleaned).strip()

        parsed = json.loads(cleaned)
        post_text = parsed.get("post_text", "")
        hashtags = parsed.get("hashtags", [])
        char_count = len(post_text) + sum(len(h) + 1 for h in hashtags)

        return {
            "post_text": post_text,
            "hashtags": hashtags,
            "character_count": char_count,
        }
    except (GeminiError, OSError, ValueError, json.JSONDecodeError, RuntimeError) as e:
        logger.warning("Gemini LinkedIn draft failed: %s", e)
        fallback_text = (
            "Recent security incidents highlight ongoing risks "
            "in physical security. Is your organization prepared? "
            "A proactive audit from Raivan Global can identify "
            "gaps before they become incidents."
        )
        fallback_hashtags = [
            "#PhysicalSecurity",
            "#SecurityAudit",
            "#RaivanGlobal",
            "#ESRM",
        ]
        return {
            "post_text": fallback_text,
            "hashtags": fallback_hashtags,
            "character_count": len(fallback_text) + sum(len(h) + 1 for h in fallback_hashtags),
        }
