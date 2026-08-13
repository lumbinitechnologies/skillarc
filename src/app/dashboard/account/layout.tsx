import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { AccountNav } from "./account-nav"
import { roleAccents, roleLabels } from "./role-accent"
import { ROLES } from "@/constants/roles"

export const dynamic = "force-dynamic"

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("users")
    .select("name, role")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/auth/login")

  const role = profile.role as (typeof ROLES)[keyof typeof ROLES]
  const accent = roleAccents[role] ?? { bg: "#ede9fe", color: "#5b21b6" }
  const roleLabel = roleLabels[role] ?? role

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 lg:flex-row lg:px-0">
      <aside className="w-full shrink-0 lg:w-64">
        <div className="glass-panel sticky top-8 flex flex-col gap-6 p-6">
          <div>
            <p className="font-['Space_Grotesk'] text-xl font-semibold tracking-tight text-foreground">
              Account
            </p>
            <div
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ background: accent.bg, color: accent.color }}
            >
              {roleLabel}
            </div>
          </div>

          <AccountNav />
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
