"""
Newsletter drafting — admin-triggered (via Next.js) and weekly cron.
Synthesizes a one-pager from recent threat intel, renders it to PNG, and
stores a draft newsletter row for admin review. Never auto-publishes.
"""

import json
import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from config import get_settings
from gemini_client import GeminiClient
from newsletter.render import build_newsletter_html, render_png
from newsletter.synthesis import synthesize_newsletter

router = APIRouter(prefix="/newsletter", tags=["newsletter"])
logger = logging.getLogger(__name__)

_MAX_ARTICLES = 6


class NewsletterDraftRequest(BaseModel):
    days: int = Field(default=7, ge=1, le=31)


def _content_to_markdown(content: dict) -> str:
    """Markdown body persisted alongside the image (editable in admin UI)."""
    lines = [f"# {content['title']}", "", content.get("intro", ""), ""]
    for item in content.get("items", []):
        lines.append(f"## {item['headline']} ({item['domain']})")
        lines.append(item["takeaway"])
        lines.append("")
    lines.append(f"**{content.get('cta', '')}**")
    return "\n".join(lines)


async def create_newsletter_draft(pool, gemini, days: int = 7) -> dict:
    """Shared by the route and the weekly cron. Returns {newsletter_id, title}."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, title, summary, domain_tags
            FROM threat_intel
            WHERE soft_deleted = FALSE
              AND scraped_at >= NOW() - make_interval(days => $1)
            ORDER BY relevance_score DESC, scraped_at DESC
            LIMIT $2
            """,
            days,
            _MAX_ARTICLES,
        )

        if not rows:
            raise HTTPException(
                status_code=422,
                detail=f"No threat intel articles in the last {days} days — run the scraper first",
            )

        articles = []
        for r in rows:
            tags = r["domain_tags"]
            articles.append(
                {
                    "id": r["id"],
                    "title": r["title"],
                    "summary": r["summary"],
                    "domain_tags": json.loads(tags) if isinstance(tags, str) else (tags or []),
                }
            )

        content = await synthesize_newsletter(articles, gemini=gemini)
        try:
            image = await render_png(build_newsletter_html(content))
        except Exception as render_err:
            logger.error("Newsletter render failed: %s", render_err)
            raise HTTPException(
                status_code=503, detail="Newsletter image rendering failed"
            ) from render_err

        row = await conn.fetchrow(
            """
            INSERT INTO newsletters
                (id, title, body_markdown, image_png, article_ids, status,
                 created_at, updated_at)
            VALUES (gen_random_uuid()::text, $1, $2, $3, $4::jsonb, 'draft', NOW(), NOW())
            RETURNING id
            """,
            content["title"],
            _content_to_markdown(content),
            image,
            json.dumps([a["id"] for a in articles]),
        )

    logger.info("Newsletter draft created: %s (%d articles)", row["id"], len(articles))
    return {"newsletter_id": row["id"], "title": content["title"]}


@router.post("/draft", status_code=201)
async def draft_newsletter(req: NewsletterDraftRequest, request: Request) -> dict:
    """Draft a newsletter from the last N days of threat intel."""
    pool = request.app.state.pool
    gemini = getattr(request.app.state, "gemini", None)
    if gemini is None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise HTTPException(status_code=503, detail="Gemini API key not configured")
        gemini = GeminiClient(settings)
    return await create_newsletter_draft(pool, gemini, days=req.days)
