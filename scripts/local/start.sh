#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
SUPABASE_BIN="$(supabase_cmd)"

cd "$ROOT_DIR"
"$ROOT_DIR/scripts/local/sync-migrations.sh"
docker compose -f docker-compose.local.yml up -d redis
"$SUPABASE_BIN" start
"$ROOT_DIR/scripts/local/init-env.sh"
"$ROOT_DIR/scripts/local/check.sh"

echo
echo "Local services are running. Start the app in separate terminals with:"
echo "  npm run local:dev"
echo "Local Supabase Studio: http://127.0.0.1:55423"
echo "Local email inbox:     http://127.0.0.1:55424"
