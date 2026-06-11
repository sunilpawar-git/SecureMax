"""
Newsletter drafting — admin-triggered (via Next.js) and weekly cron.
Runs the multi-pass synthesis pipeline, renders multi-format output
(PNG + email HTML + WhatsApp text + website HTML), and stores a draft
newsletter row for admin review. Never auto-publishes.
"""

import json
import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from config import get_settings
from cpp_repository import get_relevant_chunks
from gemini_client import GeminiClient
from newsletter.constants import MAX_NEWSLETTER_ARTICLES, NEWSLETTER_QUALITY_THRESHOLD
from newsletter.render import build_newsletter_html, render_png
from newsletter.render_email import render_email_html
from newsletter.render_website import render_website_html
from newsletter.render_whatsapp import render_whatsapp_text
from newsletter.synthesis import synthesize_newsletter_pipeline

router = APIRouter(prefix="/newsletter", tags=["newsletter"])
logger = logging.getLogger(__name__)

_MAX_ARTICLES = MAX_NEWSLETTER_ARTICLES


class NewsletterDraftRequest(BaseModel):
    days: int = Field(default=7, ge=1, le=31)


def _content_to_markdown(content) -> str:
    """Markdown body from either legacy dict or NewsletterContent."""
    if hasattr(content, "title"):
        lines = [f"# {content.title}", "", content.executive_summary, ""]
        for theme in getattr(content, "themes", []):
            lines.append(f"## {theme.theme_title} ({theme.cpp_domain})")
            lines.append(theme.recommendation)
            lines.append("")
        if content.cta_soft:
            lines.append(f"**{content.cta_soft}**")
        return "\n".join(lines)
    lines = [f"# {content['title']}", "", content.get("intro", ""), ""]
    for item in content.get("items", []):
        lines.append(f"## {item['headline']} ({item['domain']})")
        lines.append(item["takeaway"])
        lines.append("")
    lines.append(f"**{content.get('cta', '')}**")
    return "\n".join(lines)


async def create_newsletter_draft(pool, gemini, days: int = 7) -> dict:
    """Shared by the route and the weekly cron. Returns {newsletter_id, title}."""
    settings = get_settings()

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, title, summary, domain_tags, affected_segments,
                   relevance_score
            FROM threat_intel
            WHERE soft_deleted = FALSE
              AND scraped_at >= NOW() - make_interval(days => $1)
              AND relevance_score >= $3
            ORDER BY relevance_score DESC, scraped_at DESC
            LIMIT $2
            """,
            days,
            _MAX_ARTICLES,
            NEWSLETTER_QUALITY_THRESHOLD,
        )

        if not rows:
            raise HTTPException(
                status_code=422,
                detail=f"No threat intel articles in the last {days} days — run the scraper first",
            )

        articles = []
        for r in rows:
            tags = r["domain_tags"]
            segs = r["affected_segments"]
            articles.append(
                {
                    "id": r["id"],
                    "title": r["title"],
                    "summary": r["summary"],
                    "domain_tags": json.loads(tags) if isinstance(tags, str) else (tags or []),
                    "affected_segments": (
                        json.loads(segs) if isinstance(segs, str) else (segs or [])
                    ),
                }
            )

        async def _cpp_retrieve(query, domains=None):
            return await get_relevant_chunks(
                query, conn, settings, gemini=gemini, domains=domains
            )

        content = await synthesize_newsletter_pipeline(
            articles, gemini=gemini, cpp_retrieve=_cpp_retrieve
        )

        try:
            image = await render_png(build_newsletter_html(content))
        except Exception as render_err:
            logger.error("Newsletter PNG render failed: %s", render_err)
            image = None

        email_html = render_email_html(content)
        whatsapp_text = render_whatsapp_text(content)
        website_html = render_website_html(content)

        row = await conn.fetchrow(
            """
            INSERT INTO newsletters
                (id, title, body_markdown, image_png,
                 email_html, whatsapp_text, website_html,
                 executive_summary, intelligence_briefing,
                 full_analysis, commanders_note,
                 article_ids, status, created_at, updated_at)
            VALUES (gen_random_uuid()::text,
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11::jsonb, 'draft', NOW(), NOW())
            RETURNING id
            """,
            content.title,
            _content_to_markdown(content),
            image,
            email_html,
            whatsapp_text,
            website_html,
            content.executive_summary,
            content.intelligence_briefing,
            content.full_analysis,
            content.commanders_note or "",
            json.dumps([a["id"] for a in articles]),
        )

    logger.info("Newsletter draft created: %s (%d articles)", row["id"], len(articles))
    return {"newsletter_id": row["id"], "title": content.title}


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
    try:
        return await create_newsletter_draft(pool, gemini, days=req.days)
    except HTTPException:
        raise
    except BaseException as exc:
        logger.exception("Newsletter draft unexpected error: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Newsletter draft failed — check server logs",
        ) from exc
