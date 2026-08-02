// app/dashboard/super-admin/actions.ts

"use server"

import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createClient } from "@supabase/supabase-js"
import { ROLES } from "@/constants/roles"

// ─── Auth guard helper ────────────────────────────────────────────────────────
async function requireSuperAdmin() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized", supabase: null, adminClient: null }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (profile?.role !== ROLES.SUPER_ADMIN) return { error: "Forbidden", supabase: null, adminClient: null }

  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!rawKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing. Please configure it in your environment variables / Vercel settings.");
  }
  // Defensively strip any accidentally pasted trailing environment variables (e.g. from copy-paste mistakes)
  const serviceRoleKey = rawKey.split(/\s+/)[0].trim();

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  return { error: null, supabase, adminClient }
}

export async function createOrganization(name: string, features: string[] = []) {
  const { error: authError, supabase } = await requireSuperAdmin()
  if (authError || !supabase) return { success: false, error: authError }

  const { data, error } = await supabase
    .from("organizations")
    .insert({ name, features })
    .select("id, name, created_at, features")
    .single()

  if (error) {
    if (error.code === "23505") return { success: false, error: "Organization name already exists." }
    return { success: false, error: error.message }
  }

  return { success: true, org: { ...data, institution_count: 0, admin_count: 0, features: data.features } }
}

export async function editOrganization(id: string, name: string, features: string[] = []) {
  const { error: authError, supabase } = await requireSuperAdmin()
  if (authError || !supabase) return { success: false, error: authError }

  const { error } = await supabase.from("organizations").update({ name, features }).eq("id", id)
  if (error) return { success: false, error: error.message }

  return { success: true }
}

export async function deleteOrganization(id: string) {
  const { error: authError, supabase } = await requireSuperAdmin()
  if (authError || !supabase) return { success: false, error: authError }

  const { error } = await supabase.from("organizations").delete().eq("id", id)
  if (error) return { success: false, error: error.message }

  return { success: true }
}

// ─── Org Admins ───────────────────────────────────────────────────────────────
export async function createOrgAdmin(input: {
  name: string
  email: string
  password: string
  organization_id: string
}) {
  const { error: authError, adminClient } = await requireSuperAdmin()
  if (authError || !adminClient) return { success: false, error: authError }

  const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  })

  if (authErr) {
    if (authErr.message.includes("already registered")) return { success: false, error: "Email already registered." }
    return { success: false, error: authErr.message }
  }

  const newUserId = authData.user.id

  const result = await adminClient
    .from("users")
    .upsert({
      id: newUserId,
      name: input.name,
      email: input.email,
      role: ROLES.ORG_ADMIN,
      organization_id: input.organization_id,
    }, { onConflict: "id" })
    .select()

  if (result.error) {
    return { success: false, error: result.error.message }
  }

  // Fetch org name for optimistic UI
  const { data: org } = await adminClient
    .from("organizations")
    .select("name")
    .eq("id", input.organization_id)
    .single()

  return {
    success: true,
    admin: {
      id: newUserId,
      name: input.name,
      email: input.email,
      created_at: new Date().toISOString(),
      organization_id: input.organization_id,
      organization_name: org?.name ?? "—",
      last_login: undefined,
    },
  }
}

export async function deleteOrgAdmin(id: string) {
  const { error: authError, supabase, adminClient } = await requireSuperAdmin()
  if (authError || !supabase || !adminClient) return { success: false, error: authError }

  const { error: dbErr } = await supabase.from("users").delete().eq("id", id)
  if (dbErr) return { success: false, error: dbErr.message }

  await adminClient.auth.admin.deleteUser(id)
  return { success: true }
}

export async function resetAdminPassword(id: string, newPassword: string) {
  const { error: authError, adminClient } = await requireSuperAdmin()
  if (authError || !adminClient) return { success: false, error: authError }

  const { error } = await adminClient.auth.admin.updateUserById(id, { password: newPassword })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Platform Settings ────────────────────────────────────────────────────────
export async function savePlatformSettings(settings: Record<string, unknown>) {
  const { error: authError, supabase } = await requireSuperAdmin()
  if (authError || !supabase) return { success: false, error: authError }

  const { error } = await supabase
    .from("platform_settings")
    .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() }, { onConflict: "id" })

  if (error) return { success: false, error: error.message }
  return { success: true }
}