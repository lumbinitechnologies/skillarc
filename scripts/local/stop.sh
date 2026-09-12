#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
SUPABASE_BIN="$(supabase_cmd)"

cd "$ROOT_DIR"
"$SUPABASE_BIN" stop
docker compose -f docker-compose.local.yml stop redis
echo "Stopped local Supabase and Redis services. Local volumes were preserved."
