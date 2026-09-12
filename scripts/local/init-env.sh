#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
SUPABASE_BIN="$(supabase_cmd)"

status_env="$(cd "$ROOT_DIR" && "$SUPABASE_BIN" status -o env)"
api_url="$(printf '%s\n' "$status_env" | awk -F= '$1 == "API_URL" { sub(/^[^=]*=/, ""); print; exit }')"
anon_key="$(printf '%s\n' "$status_env" | awk -F= '$1 == "ANON_KEY" { sub(/^[^=]*=/, ""); print; exit }')"
service_key="$(printf '%s\n' "$status_env" | awk -F= '$1 == "SERVICE_ROLE_KEY" { sub(/^[^=]*=/, ""); print; exit }')"

if [[ -z "$api_url" || -z "$anon_key" || -z "$service_key" ]]; then
  echo "Could not read local Supabase keys. Run supabase start first." >&2
  exit 1
fi

write_next_env() {
  local target="$ROOT_DIR/.env.local"
  if [[ -e "$target" ]]; then
    echo "Keeping existing $target" >&2
    return
  fi
  umask 077
  printf '%s\n' \
    "NEXT_PUBLIC_SUPABASE_URL=$api_url" \
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon_key" \
    "SUPABASE_SERVICE_ROLE_KEY=$service_key" \
    "GROQ_API_KEY=" \
    "GROQ_MODEL=llama-3.3-70b-versatile" \
    "KNOWLEDGE_SEARCH_ENABLED=false" \
    "KNOWLEDGE_EMBEDDING_MODEL=text-embedding-3-small" \
    "KNOWLEDGE_EMBEDDING_DIMENSIONS=384" \
    "OPENAI_API_KEY=" \
    "CRON_SECRET=skillarc-local-cron-secret" \
    "UPSTASH_REDIS_REST_URL=" \
    "UPSTASH_REDIS_REST_TOKEN=" > "$target"
}

write_next_env
echo "Local Next.js environment is ready. It is gitignored and contains local Supabase keys only."
