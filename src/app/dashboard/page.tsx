import { redirect } from "next/navigation"
import { getCurrentUserContext } from "@/lib/user-context"
import { ROLES } from "@/constants/roles"
import { DASHBOARD_ROUTES } from "@/constants/routes"

export default async function DashboardPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect("/auth/login")

  const role = context.role

  const roleRedirects: Record<string, string> = {
    [ROLES.SUPER_ADMIN]:       DASHBOARD_ROUTES.SUPER_ADMIN,
    [ROLES.ORG_ADMIN]:         DASHBOARD_ROUTES.ORG_ADMIN,
    [ROLES.INSTITUTION_ADMIN]: DASHBOARD_ROUTES.INSTITUTION_ADMIN,
    [ROLES.HOD]:               DASHBOARD_ROUTES.HOD,
    [ROLES.PROGRAM_HEAD]:      DASHBOARD_ROUTES.PROGRAM_HEAD,
    [ROLES.FACULTY]:           DASHBOARD_ROUTES.FACULTY,
    [ROLES.STUDENT]:           DASHBOARD_ROUTES.STUDENT,
    [ROLES.PARENT]:            DASHBOARD_ROUTES.PARENT,
  }

  const destination = role ? roleRedirects[role] : null

  if (!destination) {
    return (
      <pre style={{ padding: "1rem", whiteSpace: "pre-wrap" }}>
        {JSON.stringify({ userId: context.id, context }, null, 2)}
      </pre>
    )
  }

  redirect(destination)
}