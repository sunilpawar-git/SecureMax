"""
Trend detection — analyse threat_intel archive across 7/30/90-day windows.
Identifies rising, stable, and declining threat categories for newsletter enrichment.
"""

import logging
from collections import Counter
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class TrendResult:
    domain: str
    direction: str  # "rising" | "stable" | "declining"
    current_count: int
    previous_count: int
    change_pct: float


async def detect_trends(
    conn,
    *,
    windows: tuple[int, ...] = (7, 30, 90),
) -> dict[int, list[TrendResult]]:
    """Detect trends across multiple time windows.

    For each window, compares the current period to the previous period
    of equal length (e.g. last 7 days vs 7-14 days ago).
    """
    results: dict[int, list[TrendResult]] = {}
    for window_days in windows:
        results[window_days] = await _detect_window(conn, window_days)
    return results


async def _detect_window(conn, window_days: int) -> list[TrendResult]:
    """Compare domain counts: current window vs prior window."""
    current_rows = await conn.fetch(
        """
        SELECT domain_tags FROM threat_intel
        WHERE soft_deleted = FALSE
          AND scraped_at >= NOW() - make_interval(days => $1)
        """,
        window_days,
    )
    prior_rows = await conn.fetch(
        """
        SELECT domain_tags FROM threat_intel
        WHERE soft_deleted = FALSE
          AND scraped_at >= NOW() - make_interval(days => $1)
          AND scraped_at < NOW() - make_interval(days => $2)
        """,
        window_days * 2,
        window_days,
    )

    current_counts = _count_domains(current_rows)
    prior_counts = _count_domains(prior_rows)

    all_domains = set(current_counts.keys()) | set(prior_counts.keys())
    trends = []
    for domain in sorted(all_domains):
        curr = current_counts.get(domain, 0)
        prev = prior_counts.get(domain, 0)
        direction, change = _classify_trend(curr, prev)
        trends.append(
            TrendResult(
                domain=domain,
                direction=direction,
                current_count=curr,
                previous_count=prev,
                change_pct=change,
            )
        )

    return sorted(trends, key=lambda t: abs(t.change_pct), reverse=True)


def _count_domains(rows) -> Counter:
    """Extract and count domain tags from DB rows."""
    counter: Counter = Counter()
    for row in rows:
        tags = row["domain_tags"]
        if isinstance(tags, str):
            import json

            tags = json.loads(tags)
        if isinstance(tags, list):
            for tag in tags:
                counter[tag] += 1
    return counter


def _classify_trend(current: int, previous: int) -> tuple[str, float]:
    """Classify as rising/stable/declining with percentage change."""
    if previous == 0:
        if current > 0:
            return "rising", 100.0
        return "stable", 0.0

    change_pct = ((current - previous) / previous) * 100
    if change_pct > 20:
        return "rising", round(change_pct, 1)
    elif change_pct < -20:
        return "declining", round(change_pct, 1)
    return "stable", round(change_pct, 1)


def format_trend_summary(trends: dict[int, list[TrendResult]]) -> str:
    """Format trends into a readable summary for newsletter enrichment."""
    parts = []
    for window, results in sorted(trends.items()):
        rising = [t for t in results if t.direction == "rising"]
        declining = [t for t in results if t.direction == "declining"]

        if rising or declining:
            label = f"{window}-day"
            items = []
            for t in rising[:3]:
                items.append(
                    f"{t.domain} rising (+{t.change_pct:.0f}%, {t.current_count} incidents)"
                )
            for t in declining[:3]:
                items.append(
                    f"{t.domain} declining ({t.change_pct:.0f}%, {t.current_count} incidents)"
                )
            parts.append(f"{label} trends: {'; '.join(items)}")

    return "\n".join(parts) if parts else "No significant trends detected."
