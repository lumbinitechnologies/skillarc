#!/usr/bin/env bash
set -euo pipefail

# Fresh database, no ports/network/host credentials. Never targets a configured DB.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER="skillarc-timezone-test-$$"
cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run --rm -d --name "$CONTAINER" --network none \
  --tmpfs /var/lib/postgresql/data -e POSTGRES_HOST_AUTH_METHOD=trust \
  postgres:17-alpine >/dev/null
for attempt in {1..30}; do
  if docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  if [[ "$attempt" == 30 ]]; then echo "Local test database did not become ready" >&2; exit 1; fi
  sleep 1
done

# Dependency tables are a minimal fixture matching the columns used by this
# migration, not a claim that the entire Supabase baseline was replayed.
{
  cat "$ROOT_DIR/scripts/local/fixtures/academic-time-zone-base.sql"
  cat "$ROOT_DIR/supabase/migrations/20261016153434_institution_academic_time_zone.sql"
  cat "$ROOT_DIR/scripts/local/fixtures/academic-time-zone-assertions.sql"
} | docker exec -i "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres
