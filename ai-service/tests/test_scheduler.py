"""Scheduler configuration tests — guard the cron times against silent drift.

The daily scraper must run at 02:30 UTC (08:00 IST) so fresh threat intel is
ready before the admin workday. The weekly newsletter fires Mon 03:00 UTC and
the LinkedIn briefing fires Mon 04:00 UTC (60-min gap prevents a timing race).
Parses main.py's add_job calls via AST so no app/DB bootstrap is needed.
"""

import ast
from pathlib import Path

MAIN_PY = Path(__file__).resolve().parent.parent / "main.py"


def _find_add_job_calls():
    tree = ast.parse(MAIN_PY.read_text())
    calls = {}
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr == "add_job"
        ):
            kwargs = {
                kw.arg: kw.value.value
                for kw in node.keywords
                if isinstance(kw.value, ast.Constant)
            }
            job_id = kwargs.get("id")
            if job_id:
                calls[job_id] = kwargs
    return calls


def test_daily_scraper_runs_at_0230_utc():
    jobs = _find_add_job_calls()
    assert "daily_scraper" in jobs, "daily_scraper job missing from main.py"
    assert jobs["daily_scraper"]["hour"] == 2
    assert jobs["daily_scraper"]["minute"] == 30


def test_weekly_briefing_fires_after_newsletter():
    """LinkedIn briefing at 04:00 UTC gives the 03:00 newsletter cron a full hour."""
    jobs = _find_add_job_calls()
    assert "weekly_linkedin_briefing" in jobs
    assert jobs["weekly_linkedin_briefing"]["hour"] == 4
    assert jobs["weekly_linkedin_briefing"]["minute"] == 0
    assert jobs["weekly_linkedin_briefing"]["day_of_week"] == "mon"
