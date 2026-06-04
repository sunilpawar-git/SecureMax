"""Unit tests for database DSN helpers — prevents asyncpg/Prisma URL mismatches."""

import pytest

from db import clean_database_dsn, parse_database_name


class TestCleanDatabaseDsn:
    def test_strips_prisma_schema_param(self) -> None:
        raw = "postgresql://postgres:postgres@localhost:5432/raivan_global?schema=public"
        dsn = clean_database_dsn(raw)
        assert "schema=" not in dsn
        assert dsn.endswith("/raivan_global")

    def test_preserves_sslmode(self) -> None:
        raw = "postgresql://u:p@db:5432/raivan_global?schema=public&sslmode=require"
        dsn = clean_database_dsn(raw)
        assert "sslmode=require" in dsn
        assert "schema=" not in dsn

    def test_strips_asyncpg_driver_prefix(self) -> None:
        raw = "postgresql+asyncpg://postgres:postgres@localhost:5432/raivan_global"
        assert clean_database_dsn(raw).endswith("/raivan_global")


class TestParseDatabaseName:
    def test_extracts_database_from_standard_url(self) -> None:
        assert (
            parse_database_name("postgresql://postgres:postgres@localhost:5432/raivan_global")
            == "raivan_global"
        )

    def test_extracts_database_with_prisma_schema_param(self) -> None:
        assert (
            parse_database_name(
                "postgresql://postgres:postgres@localhost:5432/raivan_global?schema=public"
            )
            == "raivan_global"
        )

    def test_raises_on_missing_database(self) -> None:
        with pytest.raises(ValueError, match="Could not parse database name"):
            parse_database_name("postgresql://postgres:postgres@localhost:5432/")
