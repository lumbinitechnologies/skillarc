import { deprecatedAssistantRoute } from "@/lib/assistant/deprecated-route"

/** Temporary compatibility marker. Remove after the migration verification window. */
export async function POST() {
  return deprecatedAssistantRoute()
}

export async function GET() {
  return deprecatedAssistantRoute()
}
