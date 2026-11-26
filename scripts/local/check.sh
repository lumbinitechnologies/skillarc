#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Local environment is not configured: $ENV_FILE is missing." >&2
  echo "Run npm run local:start, then npm run local:init-env." >&2
  exit 1
fi

# This intentionally does not print environment values, keys, tokens, or
# passwords. It rejects common hosted endpoint patterns before any app starts.
for file in "$ENV_FILE"; do
  if grep -Eiq 'supabase\.co|vercel\.app|onrender\.com|render\.com|railway\.app|upstash\.io|\.prod([.:/]|$)' "$file"; then
    echo "Refusing to run local tooling: a hosted/production-looking endpoint was found in $file." >&2
    exit 1
  fi
done

value_for() {
  local key="$1" file="$2"
  awk -F= -v key="$key" '$1 == key {
    value = $0
    sub(/^[^=]*=/, "", value)
    sub(/^"/, "", value)
    sub(/"$/, "", value)
    print value
    exit
  }' "$file"
}

assert_loopback() {
  local key="$1" value="$2"
  case "$value" in
    http://127.0.0.1:*|http://localhost:*|https://127.0.0.1:*|https://localhost:*|postgresql://127.0.0.1:*|postgres://127.0.0.1:*|redis://127.0.0.1:*|sqlite:*) ;;
    *)
      echo "Refusing to run local tooling: $key is not local." >&2
      exit 1
      ;;
  esac
}

assert_loopback NEXT_PUBLIC_SUPABASE_URL "$(value_for NEXT_PUBLIC_SUPABASE_URL "$ENV_FILE")"
if [[ "$(value_for NEXT_PUBLIC_SUPABASE_ANON_KEY "$ENV_FILE")" == copy-* || "$(value_for SUPABASE_SERVICE_ROLE_KEY "$ENV_FILE")" == copy-* ]]; then
  echo "Local Supabase keys are still placeholders. Run npm run local:init-env." >&2
  exit 1
fi

echo "Local environment guard passed: all configured service endpoints are loopback-only."
