import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { inviteUser } from "@/lib/invite-user"

export const PORTAL_ACCESS_STATUSES = ["NOT_INVITED", "INVITED", "ACTIVE", "DEACTIVATED"] as const
export type PortalAccessStatus = typeof PORTAL_ACCESS_STATUSES[number]
export type PortalAccess = {
  id: string
  student_id: string
  institution_id: string
  auth_user_id: string
  status: PortalAccessStatus
  invited_at: string | null
  activated_at: string | null
  deactivated_at: string | null
  last_invited_at: string | null
  invited_by: string | null
  activated_by: string | null
  deactivated_by: string | null
  created_at: string
  updated_at: string
}

const adminRoles = new Set(["SUPER_ADMIN", "ORG_ADMIN", "INSTITUTION_ADMIN"])

export function canTransitionPortalAccess(from: PortalAccessStatus, to: PortalAccessStatus) {
  return (
    (from === "NOT_INVITED" && to === "INVITED") ||
    (from === "INVITED" && to === "INVITED") ||
    (from === "INVITED" && to === "ACTIVE") ||
    (from === "INVITED" && to === "DEACTIVATED") ||
    (from === "ACTIVE" && to === "DEACTIVATED") ||
    (from === "DEACTIVATED" && to === "INVITED")
  )
}

function requireAdmin(actor: { id: string; role: string; institution_id: string | null }) {
  if (!adminRoles.has(actor.role) || !actor.institution_id) throw new Error("Portal access action is not authorized")
}

async function audit(admin: ReturnType<typeof createSupabaseAdminClient>, actorId: string, action: string, studentId: string, metadata: Record<string, unknown> = {}) {
  const { error } = await admin.from("audit_logs").insert({
    user_id: actorId, action, entity_type: "STUDENT_PORTAL_ACCESS", entity_id: studentId, metadata,
  })
  if (error) throw new Error(`Portal audit failed: ${error.message}`)
}

export async function getStudentPortalAccess(studentId: string, institutionId: string) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.from("student_portal_access").select("*").eq("student_id", studentId).eq("institution_id", institutionId).maybeSingle()
  if (error) throw new Error(`Portal status lookup failed: ${error.message}`)
  return data as PortalAccess | null
}

export async function inviteStudentPortalAccess(params: {
  studentId: string
  actor: { id: string; role: string; institution_id: string | null; organization_id: string | null }
  origin: string
}) {
  requireAdmin(params.actor)
  const admin = createSupabaseAdminClient()
  const { data: student } = await admin.from("students").select("id,institution_id").eq("id", params.studentId).eq("institution_id", params.actor.institution_id).maybeSingle()
  if (!student) throw new Error("Student not found in actor institution")
  const { data: user } = await admin.from("users").select("id,email,role").eq("id", params.studentId).eq("institution_id", params.actor.institution_id).eq("role", "STUDENT").maybeSingle()
  if (!user?.email) throw new Error("Student auth profile is missing")

  const current = await getStudentPortalAccess(params.studentId, params.actor.institution_id!)
  if (current && !canTransitionPortalAccess(current.status, "INVITED")) throw new Error("Deactivated portal access must be re-invited before activation")
  const result = await inviteUser({ email: user.email, role: "STUDENT", institutionId: params.actor.institution_id!, organizationId: params.actor.organization_id ?? "", origin: params.origin })
  const { error: reactivateError } = await admin.from("users").update({ is_active: true }).eq("id", user.id).eq("institution_id", params.actor.institution_id)
  if (reactivateError) throw new Error(`Student account reactivation failed: ${reactivateError.message}`)
  const now = new Date().toISOString()
  const payload = { student_id: params.studentId, institution_id: params.actor.institution_id, auth_user_id: user.id, status: "INVITED", invited_at: current?.invited_at ?? now, last_invited_at: now, invited_by: params.actor.id, activated_at: null, deactivated_at: null, activated_by: null, deactivated_by: null }
  const { data: access, error } = await admin.from("student_portal_access").upsert(payload, { onConflict: "student_id" }).select("*").single()
  if (error) throw new Error(`Portal access persistence failed: ${error.message}`)
  await audit(admin, params.actor.id, current ? "STUDENT_PORTAL_INVITE_RESENT" : "STUDENT_PORTAL_INVITED", params.studentId, { auth_user_id: result.userId })
  return access as PortalAccess
}

export async function markStudentPortalActive(authUserId: string, actorId?: string) {
  const admin = createSupabaseAdminClient()
  const { data: access } = await admin.from("student_portal_access").select("*").eq("auth_user_id", authUserId).maybeSingle()
  if (!access || access.status !== "INVITED") return access as PortalAccess | null
  const { data: updated, error } = await admin.from("student_portal_access").update({ status: "ACTIVE", activated_at: new Date().toISOString(), activated_by: actorId ?? authUserId, deactivated_at: null, deactivated_by: null }).eq("id", access.id).select("*").single()
  if (error) throw new Error(`Portal activation failed: ${error.message}`)
  await admin.from("users").update({ is_active: true }).eq("id", authUserId)
  await audit(admin, actorId ?? authUserId, "STUDENT_PORTAL_ACTIVATED", access.student_id)
  return updated as PortalAccess
}

export async function setStudentPortalDeactivated(studentId: string, actor: { id: string; role: string; institution_id: string | null }) {
  requireAdmin(actor)
  const admin = createSupabaseAdminClient()
  const current = await getStudentPortalAccess(studentId, actor.institution_id!)
  if (!current) throw new Error("Portal access has not been invited")
  if (current.status === "DEACTIVATED") return current
  if (current.status !== "ACTIVE" && current.status !== "INVITED") throw new Error("Portal access cannot be deactivated from its current state")
  const { data, error } = await admin.from("student_portal_access").update({ status: "DEACTIVATED", deactivated_at: new Date().toISOString(), deactivated_by: actor.id }).eq("id", current.id).select("*").single()
  if (error) throw new Error(`Portal deactivation failed: ${error.message}`)
  await admin.from("users").update({ is_active: false }).eq("id", current.auth_user_id).eq("institution_id", actor.institution_id)
  await audit(admin, actor.id, "STUDENT_PORTAL_DEACTIVATED", studentId)
  return data as PortalAccess
}

export async function assertActiveStudentPortalAccess(studentId: string, institutionId: string | null) {
  if (!institutionId) return false
  const access = await getStudentPortalAccess(studentId, institutionId)
  return access?.status === "ACTIVE"
}
