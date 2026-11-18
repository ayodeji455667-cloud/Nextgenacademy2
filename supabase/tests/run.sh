#!/usr/bin/env bash
# Runs the migration, seed and RLS smoke test against a THROWAWAY local Postgres.
# Usage: PGURL=postgres://postgres@localhost:5432/postgres supabase/tests/run.sh
# It creates and drops a database called rls_smoke. Never point it at production.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${PGURL:?Set PGURL to a local Postgres admin connection string}"
psql "$PGURL" -q -c "drop database if exists rls_smoke" -c "create database rls_smoke"
DB="${PGURL%/*}/rls_smoke"
psql "$DB" -q -v ON_ERROR_STOP=1 -f tests/00_supabase_stubs.sql
psql "$DB" -q -v ON_ERROR_STOP=1 -f migrations/20261118000000_init.sql
psql "$DB" -q -v ON_ERROR_STOP=1 -f seed.sql
psql "$DB" -q -f tests/rls_smoke_test.sql
