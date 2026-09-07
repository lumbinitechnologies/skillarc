import type { UserContext } from "@/lib/user-context"
import type { AssistantPrincipal } from "@/lib/assistant/types"
import type { UserRole } from "@/constants/roles"

const KNOWN_ROLES = new Set<UserRole>([
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "INSTITUTION_ADMIN",
  "HOD",
  "PROGRAM_HEAD",
  "FACULTY",
  "STUDENT",
  "PARENT",
])

export function toAssistantPrincipal(profile: UserContext): AssistantPrincipal {
  const role = profile.role as UserRole
  if (!KNOWN_ROLES.has(role)) {
    throw new Error("The current account has an unsupported assistant role")
  }

  return {
    userId: profile.id,
    actorUserId: profile.originalProfile.id,
    organizationId: profile.organization_id,
    institutionId: profile.institution_id,
    departmentId: profile.department_id ?? profile.originalProfile.department_id ?? null,
    role,
    isImpersonating: profile.isImpersonating,
  }
}
