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
    "ARCA_BACKEND_SECRET=skillarc-local-only-change-me" \
    "EDURAG_BACKEND_URL=http://127.0.0.1:8000" \
    "GROQ_API_KEY=" \
    "GROQ_MODEL=llama-3.3-70b-versatile" \
    "UPSTASH_REDIS_REST_URL=" \
    "UPSTASH_REDIS_REST_TOKEN=" > "$target"
}

write_backend_env() {
  local target="$ROOT_DIR/arca-backend/.env.local"
  if [[ -e "$target" ]]; then
    echo "Keeping existing $target" >&2
    return
  fi
  umask 077
  printf '%s\n' \
    "GROQ_API_KEY=" \
    "GROQ_MODEL=llama-3.3-70b-versatile" \
    "EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2" \
    "UPLOAD_DIR=../.local/arca-backend/uploads" \
    "CHROMA_DIR=../.local/arca-backend/chroma_db" \
    "DATABASE_URL=sqlite:///../.local/arca-backend/edurag.db" \
    "DEFAULT_CHUNK_SIZE=1000" \
    "DEFAULT_CHUNK_OVERLAP=150" \
    "DEFAULT_TOP_K=4" \
    "FRONTEND_ORIGIN=http://127.0.0.1:3000" \
    "ARCA_BACKEND_SECRET=skillarc-local-only-change-me" \
    "SUPABASE_URL=$api_url" \
    "SUPABASE_SERVICE_ROLE_KEY=$service_key" \
    "UPSTASH_REDIS_REST_URL=" \
    "UPSTASH_REDIS_REST_TOKEN=" > "$target"
}

write_next_env
write_backend_env
echo "Local environment files are ready. They are gitignored and contain local Supabase keys only."
