#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

npm run typecheck
npx eslint \
  src/lib/assistant \
  src/app/api/assistant \
  src/app/api/ai/chat/route.ts \
  src/app/api/chatbot/chat/route.ts \
  src/app/api/chatbot/public/route.ts \
  src/app/api/edurag/route.ts \
  src/proxy.ts \
  src/app/api/auth/profile/route.ts \
  src/components/ui/message.tsx \
  src/components/ui/message-scroller.tsx \
  src/components/ui/spinner.tsx \
  src/components/chatbot/ChatbotWidget.tsx
if [[ -x "$ROOT_DIR/arca-backend/.venv/bin/pytest" ]]; then
  (cd "$ROOT_DIR/arca-backend" && PYTHONPATH=. ./.venv/bin/pytest -q)
else
  echo "Skipping FastAPI tests: arca-backend/.venv/bin/pytest is not installed." >&2
fi

echo "Local-safe static and backend checks passed."
