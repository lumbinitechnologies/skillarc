#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# Canonical timestamped SQL is now tracked directly. Never regenerate old
# versions from /migrations: those files are historical source, not a replay plan.
node "$ROOT_DIR/scripts/local/check-migrations.mjs"
