"""
Schema parity test: verify that the SQL used by scheduled_weekly_briefing
in main.py references the correct Prisma-mapped table and column names.

This test parses the INSERT statement directly from the source rather than
running it against a database, providing a fast CI check that catches column
name mismatches early.
"""

import re
from pathlib import Path

_MAIN_PY = Path(__file__).resolve().parent.parent / "main.py"
_PRISMA_SCHEMA = Path(__file__).resolve().parent.parent.parent / "prisma" / "schema.prisma"

# Expected values derived from the Prisma schema mapping
_EXPECTED_TABLE = "linkedin_posts"
_EXPECTED_COLUMNS = {"draft_text", "status", "platform", "created_at", "updated_at"}
_FORBIDDEN_COLUMNS = {"content", "createdAt", "updatedAt", '"createdAt"', '"updatedAt"'}
_FORBIDDEN_TABLE = '"LinkedinPost"'


def _extract_briefing_sql(source: str) -> str:
    """Extract the INSERT SQL string from scheduled_weekly_briefing via regex."""
    pattern = re.compile(
        r'INSERT\s+INTO\s+[\w"]+\s*\([^)]+\)\s*VALUES\s*\([^)]+\)',
        re.DOTALL | re.IGNORECASE,
    )
    matches = pattern.findall(source)
    assert matches, "No INSERT INTO statement found in main.py — check scheduled_weekly_briefing"
    # Find the one related to linkedin (should reference draft_text or linkedin_posts)
    linkedin_matches = [m for m in matches if "linkedin" in m.lower() or "draft_text" in m.lower()]
    assert linkedin_matches, (
        "No linkedin-related INSERT found — main.py weekly briefing SQL may have changed"
    )
    return linkedin_matches[0]


class TestWeeklyBriefingSqlParity:
    def test_main_py_readable(self):
        assert _MAIN_PY.exists(), f"main.py not found at {_MAIN_PY}"

    def test_prisma_schema_readable(self):
        assert _PRISMA_SCHEMA.exists(), f"schema.prisma not found at {_PRISMA_SCHEMA}"

    def test_insert_uses_correct_table_name(self):
        source = _MAIN_PY.read_text()
        sql = _extract_briefing_sql(source)
        assert _EXPECTED_TABLE in sql, (
            f"INSERT must target '{_EXPECTED_TABLE}' (Prisma-mapped name), got:\n{sql}"
        )

    def test_insert_does_not_use_prisma_class_name(self):
        source = _MAIN_PY.read_text()
        sql = _extract_briefing_sql(source)
        assert _FORBIDDEN_TABLE not in sql, (
            f"INSERT must NOT use Prisma class name {_FORBIDDEN_TABLE!r} — use 'linkedin_posts'"
        )

    def test_insert_uses_draft_text_not_content(self):
        source = _MAIN_PY.read_text()
        sql = _extract_briefing_sql(source)
        assert "draft_text" in sql, (
            "INSERT must use column 'draft_text' (mapped name), not 'content'"
        )
        assert "content" not in sql.lower().replace("draft_text", ""), (
            "Stale column name 'content' found in briefing INSERT — use 'draft_text'"
        )

    def test_insert_includes_updated_at(self):
        source = _MAIN_PY.read_text()
        sql = _extract_briefing_sql(source)
        assert "updated_at" in sql, (
            "INSERT must set 'updated_at' — required column in linkedin_posts (not nullable, "
            "no DB default other than Prisma @updatedAt which only applies via ORM)"
        )

    def test_insert_uses_snake_case_created_at(self):
        source = _MAIN_PY.read_text()
        sql = _extract_briefing_sql(source)
        assert "created_at" in sql, "INSERT must use 'created_at' not 'createdAt'"
        for forbidden in ('"createdAt"', '"updatedAt"', "createdAt", "updatedAt"):
            assert forbidden not in sql, (
                f"Camel-case column name {forbidden!r} found — use snake_case"
            )

    def test_prisma_schema_defines_expected_columns(self):
        """Sanity check: verify the Prisma schema still maps to the columns we assert."""
        schema = _PRISMA_SCHEMA.read_text()
        assert "draft_text" in schema or "draftText" in schema, (
            "Prisma schema no longer defines draftText/draft_text for LinkedinPost — "
            "update this test to match the new column name"
        )
        assert "linkedin_posts" in schema, (
            "Prisma schema @@map('linkedin_posts') not found — "
            "update this test to match the new table name"
        )
