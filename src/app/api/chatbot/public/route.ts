import { deprecatedAssistantRoute } from "@/lib/assistant/deprecated-route"

/** Temporary compatibility marker. Remove after the migration verification window. */
export async function POST() {
  return deprecatedAssistantRoute("/api/assistant/public")
}
