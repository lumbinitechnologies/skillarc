#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
SUPABASE_BIN="$(supabase_cmd)"

cd "$ROOT_DIR"
"$ROOT_DIR/scripts/local/check.sh"
"$ROOT_DIR/scripts/local/sync-migrations.sh"
"$SUPABASE_BIN" db reset --local --yes
echo "Reset only the local Supabase database and re-applied synthetic seed data."
