import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("legacy assistant gateways do not retain active backend callers", () => {
  for (const path of [
    "src/app/api/chatbot/chat/route.ts",
    "src/app/api/chatbot/public/route.ts",
    "src/app/api/edurag/route.ts",
  ]) {
    const source = readFileSync(path, "utf8")
    assert.doesNotMatch(source, /EDURAG_BACKEND_URL|ARCA_BACKEND_SECRET|fetch\(/)
    assert.match(source, /deprecatedAssistantRoute/)
  }
})
