import { redirect } from "next/navigation"
import { getCurrentUserContext } from "@/lib/user-context"
import { assertActiveStudentPortalAccess } from "@/lib/portal-access"
import { ROLES } from "@/constants/roles"

export default async function StudentPortalLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentUserContext()
  if (!context || context.role !== ROLES.STUDENT) redirect("/auth/login")
  if (!context.is_active || !(await assertActiveStudentPortalAccess(context.id, context.institution_id))) {
    redirect("/auth/login?error=student_portal_inactive")
  }
  return children
}
