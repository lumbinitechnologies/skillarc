#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$ROOT_DIR/scripts/local/check.sh"

set -a
source "$ROOT_DIR/arca-backend/.env.local"
set +a
cd "$ROOT_DIR/arca-backend"

if [[ -x "$ROOT_DIR/arca-backend/.venv/bin/uvicorn" ]]; then
  exec "$ROOT_DIR/arca-backend/.venv/bin/uvicorn" main:app --host 127.0.0.1 --port 8000 --reload
fi

exec python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
