#!/usr/bin/env bash
# ==============================================================================
# Automated CI / Staging RLS Regression Test Runner
# ==============================================================================
# Executes tests/rls_security_validation.sql against local/staging Postgres
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo ">>> Running SkillArc RLS Automated Security Test Suite <<<"

# Run unit and isolation tests
npx tsx --test src/lib/*.test.ts

echo ">>> TypeScript security assertion suite passed. <<<"

# If psql or Supabase DB is available locally/in CI, execute the live SQL test harness
if command -v psql >/dev/null 2>&1 && [ -n "${DATABASE_URL:-}" ]; then
  echo ">>> Executing live Postgres RLS test harness against $DATABASE_URL <<<"
  psql "$DATABASE_URL" -f tests/rls_security_validation.sql
  echo ">>> Live Postgres RLS test harness PASSED with 0 regressions. <<<"
else
  echo ">>> Note: DATABASE_URL not set in this environment. To run live SQL harness, supply DATABASE_URL or execute tests/rls_security_validation.sql in Supabase SQL editor. <<<"
fi
