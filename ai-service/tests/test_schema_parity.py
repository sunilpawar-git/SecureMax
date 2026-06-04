"""
Schema parity test — verifies the LIVE production database has every column
that the Python code references in SQL.

This test hits the real `public` schema (not the isolated test_ai schema) so
it catches migrations that were tracked as applied but whose DDL never ran.

Marked @pytest.mark.integration so it is skipped in fast CI runs but included
in the full CI gate and pre-deploy checks.

HOW TO RUN:
    pytest tests/test_schema_parity.py -v
    pytest -m integration -v          # runs all integration tests including this
"""

import asyncio

import asyncpg
import pytest

from schema_guard import _REQUIRED_COLUMNS

# Connect directly to the real public schema, not the test_ai schema.
_PROD_DSN = "postgresql://postgres@localhost:5432/security_crawler"


@pytest.mark.integration
def test_production_schema_has_all_required_columns():
    """Every (table, column) pair in schema_guard._REQUIRED_COLUMNS must exist
    in the public schema of the live database.

    Failure means a migration was either not run or not applied correctly.
    Root cause of the graph_version 500 bug (Jun 2026): this test would have
    caught the missing column before deployment.
    """

    async def _check():
        conn = await asyncpg.connect(_PROD_DSN)
        try:
            rows = await conn.fetch(
                """
                SELECT table_name, column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                """,
            )
        finally:
            await conn.close()
        return {(r["table_name"], r["column_name"]) for r in rows}

    live_columns = asyncio.run(_check())

    missing = [
        f"{table}.{column}"
        for table, column in _REQUIRED_COLUMNS
        if (table, column) not in live_columns
    ]

    assert not missing, (
        "Production DB is missing the following columns — run pending migrations:\n  "
        + "\n  ".join(missing)
    )


@pytest.mark.integration
def test_conftest_ddl_covers_all_required_columns():
    """Every column in schema_guard._REQUIRED_COLUMNS must also appear in the
    test schema DDL defined in conftest.py.

    Catches the case where a new column is added to _REQUIRED_COLUMNS (or a new
    migration is written) but conftest.py is not updated — causing tests to pass
    on the test schema while production fails.
    """
    from tests.conftest import _DDL

    ddl_lower = _DDL.lower()
    missing_in_ddl = [
        f"{table}.{column}"
        for table, column in _REQUIRED_COLUMNS
        if column.lower() not in ddl_lower
    ]

    assert not missing_in_ddl, (
        "The following columns are in schema_guard._REQUIRED_COLUMNS but absent "
        "from the conftest.py test DDL — update conftest.py to keep test and "
        "production schemas in sync:\n  " + "\n  ".join(missing_in_ddl)
    )
