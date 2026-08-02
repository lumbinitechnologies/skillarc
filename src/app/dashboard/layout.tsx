import Sidebar from "@/components/sidebar"
import Navbar from "@/components/navbar"
import ImpersonationBanner from "@/components/impersonation-banner"
import { CourseProvider } from "@/modules/courses/course-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CourseProvider>
      <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(108,99,255,0.16),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(139,92,246,0.14),_transparent_18%),radial-gradient(circle_at_bottom_left,_rgba(0,194,168,0.12),_transparent_18%),linear-gradient(180deg,#f8fafc,#eff6ff)] text-slate-950">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Navbar />
          <main className="p-6 md:p-8 lg:p-10 flex-1 min-w-0">
            {children}
          </main>
        </div>
        <ImpersonationBanner />
      </div>
    </CourseProvider>
  )
}