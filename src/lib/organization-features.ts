export const ORGANIZATION_FEATURE_CACHE_SECONDS = 60

export const ALL_ORG_FEATURES = [
  "plagiarism",
  "billing",
  "placements",
  "video_call",
  "ai_evaluation",
  "report_cards",
  "intake_cohorts",
  "interventions",
  "multi_week_timetable",
  "admissions_workflow",
  "direct_onboarding",
] as const

export function normalizeOrganizationFeatures(features: unknown): string[] {
  if (!Array.isArray(features)) return []
  return features.filter((feature): feature is string => typeof feature === "string")
}

export function resolveDashboardFeatures(
  organizationId: string | null | undefined,
  organizationFeatures: string[] | null | undefined,
) {
  return organizationId ? organizationFeatures ?? [] : [...ALL_ORG_FEATURES]
}
