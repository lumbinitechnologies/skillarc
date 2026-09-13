#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

npm run typecheck
npx eslint \
  src/lib/assistant \
  src/app/api/assistant \
  src/app/api/ai/chat/route.ts \
  src/app/api/internal/knowledge/worker/route.ts \
  src/app/api/knowledge/documents/route.ts \
  src/proxy.ts \
  src/app/api/auth/profile/route.ts \
  src/components/ui/message.tsx \
  src/components/ui/message-scroller.tsx \
  src/components/ui/spinner.tsx \
  src/components/chatbot/ChatbotWidget.tsx
echo "Local-safe static and backend checks passed."
