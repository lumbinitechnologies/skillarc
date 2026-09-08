#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEST_DIR="$ROOT_DIR/supabase/migrations"
mkdir -p "$DEST_DIR"

# The repository currently keeps imperative migrations at /migrations. The
# local Supabase CLI expects timestamped files under /supabase/migrations, so
# this creates an ignored local projection without maintaining a second source
# of truth. The baseline already contains the objects from legacy 001/002;
# those two files also contain non-idempotent development policies and are
# intentionally not replayed on a clean local database.
cp "$ROOT_DIR/skillarc_schema_v1.sql" "$DEST_DIR/20260908000000_skillarc_schema_v1.sql"

sequence=1
for source in "$ROOT_DIR"/migrations/*.sql; do
  base="$(basename "$source")"
  case "$base" in
    001_*|002_*) continue ;;
  esac
  stamp="2026090800$(printf '%04d' "$sequence")"
  cp "$source" "$DEST_DIR/${stamp}_${base}"
  sequence=$((sequence + 1))
done

echo "Synchronized local Supabase migrations from the repository schema and migrations/ directory."
