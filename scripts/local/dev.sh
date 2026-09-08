#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$ROOT_DIR/scripts/local/check.sh"
cd "$ROOT_DIR"
# Next loads .env.local automatically from the project root. Passing Node's
# --env-file flag here causes Next's worker processes to forward it via
# NODE_OPTIONS, which Node rejects.
exec node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3000
