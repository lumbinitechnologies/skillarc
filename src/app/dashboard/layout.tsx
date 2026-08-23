import Sidebar from "@/components/sidebar"
import Navbar from "@/components/navbar"
import ImpersonationBanner from "@/components/impersonation-banner"
import DashboardRouteTransition from "@/components/dashboard-route-transition"
import { DashboardSessionProvider } from "@/components/dashboard-session-provider"
import { CourseProvider } from "@/modules/courses/course-context"
import { getCurrentUserContext } from "@/lib/user-context"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userContext = await getCurrentUserContext()

  return (
    <DashboardSessionProvider value={userContext}>
      <CourseProvider>
        <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(108,99,255,0.16),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(139,92,246,0.14),_transparent_18%),radial-gradient(circle_at_bottom_left,_rgba(0,194,168,0.12),_transparent_18%),linear-gradient(180deg,#f8fafc,#eff6ff)] text-slate-950">
          <Sidebar profile={userContext} />
          <div className="flex flex-col flex-1 min-w-0">
            <Navbar profile={userContext} />
            <DashboardRouteTransition>{children}</DashboardRouteTransition>
          </div>
          <ImpersonationBanner profile={userContext} />
        </div>
      </CourseProvider>
    </DashboardSessionProvider>
  )
}
