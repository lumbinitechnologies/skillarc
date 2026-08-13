import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { SettingsFormClient } from "./settings-form-client"

export const dynamic = "force-dynamic"

export default async function AccountSettingsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  return <SettingsFormClient />
}
