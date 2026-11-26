#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

supabase_cmd() {
  if command -v supabase >/dev/null 2>&1; then
    command -v supabase
  elif [[ -x "$ROOT_DIR/node_modules/.bin/supabase" ]]; then
    printf '%s\n' "$ROOT_DIR/node_modules/.bin/supabase"
  else
    echo "Supabase CLI is required. Install it with: npm install --save-dev supabase" >&2
    return 1
  fi
}
