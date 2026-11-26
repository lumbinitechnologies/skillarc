"use server"

import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"

export async function createOrganization(data: {
  orgName: string
  adminName: string
  adminEmail: string
  adminPassword: string
}) {
  const supabase = await createSupabaseServerClient()

  // 1. Create organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: data.orgName })
    .select()
    .single()

  if (orgError) throw orgError

  // 2. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.adminEmail,
    password: data.adminPassword,
  })

  if (authError) throw authError

  const user = authData.user

  await supabase.from("users").upsert({
    id: user?.id,
    name: data.adminName,
    role: ROLES.ORG_ADMIN,
    organization_id: org.id,
  }, { onConflict: "id" })

  return org
}