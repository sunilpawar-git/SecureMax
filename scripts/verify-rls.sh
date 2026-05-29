#!/bin/bash

# Row-Level Security verification (live Postgres).
#
# Spins up a throwaway database, applies the RLS policies from migration
# `5_rls_tenant_isolation`, and asserts per-tenant isolation against a
# non-owner role (the role class the app uses once RLS is activated).
# The dev/prod database is never touched. Requires `psql` + `createdb`.
#
# Usage: ./scripts/verify-rls.sh   (or: npm run db:verify-rls)

set -euo pipefail

DB_NAME="raivan_rls_verify_$$"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() { dropdb "$DB_NAME" 2>/dev/null || true; }
trap cleanup EXIT

createdb "$DB_NAME"
psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/rls-verify.sql"
