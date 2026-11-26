import { createSupabaseServerClient } from "@/lib/supabase-server"
import SettingsClient from "./settings-client"

type PlatformSettings = {
  platform_name: string
  support_email: string
  max_orgs_per_plan: number
  allow_self_registration: boolean
  require_email_verification: boolean
  session_timeout_hours: number
  maintenance_mode: boolean
  maintenance_message: string
  default_timezone: string
  max_institutions_per_org: number
}

const SETTINGS_DEFAULTS: PlatformSettings = {
  platform_name: "SkillArc",
  support_email: "support@skillarc.com",
  max_orgs_per_plan: 50,
  allow_self_registration: false,
  require_email_verification: true,
  session_timeout_hours: 24,
  maintenance_mode: false,
  maintenance_message: "We're performing scheduled maintenance. Back soon!",
  default_timezone: "Asia/Kolkata",
  max_institutions_per_org: 20,
}

async function saveSettings(
  settings: Partial<PlatformSettings>
): Promise<{ success: boolean; error?: string }> {
  "use server"
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ id: 1, ...settings })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: "Failed to save settings" }
  }
}

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient()

  const { data: row } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("id", 1)
    .single()

  const settings: PlatformSettings = row ?? SETTINGS_DEFAULTS

  return (
    <SettingsClient
      settings={settings}
      onSave={saveSettings}
    />
  )
}