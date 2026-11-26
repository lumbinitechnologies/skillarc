import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext } from "@/lib/user-context"

type Context = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Context) {
  const actor = await getCurrentUserContext()
  if (!actor?.institution_id || !["SUPER_ADMIN", "ORG_ADMIN", "INSTITUTION_ADMIN"].includes(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  const { data, error } = await createSupabaseAdminClient().rpc("admissions_generate_offer", { p_application_id: id, p_actor_id: actor.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 409 })
  return NextResponse.json(data, { status: 201 })
}
