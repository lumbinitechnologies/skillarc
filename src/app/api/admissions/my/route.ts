import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext } from "@/lib/user-context"
import { ROLES } from "@/constants/roles"

export async function GET() {
  const actor = await getCurrentUserContext()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (actor.role !== ROLES.STUDENT) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from("admissions_applications")
    .select("id,status,program_id,intake_id,course_start_date,course_end_date,offer_letters(id,course_fees,currency,status,rendered_html,term_start,signed_at,agreement_document_id),admission_documents_v2(id,document_type,version,rendered_html,status,created_at)")
    .eq("student_id", actor.id)
    .eq("institution_id", actor.institution_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return NextResponse.json({ error: "Unable to load admission" }, { status: 500 })
  return NextResponse.json({ application: data ?? null })
}
