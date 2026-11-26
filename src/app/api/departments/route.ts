import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const institutionId =
    searchParams.get("institution_id")

  const supabase = createSupabaseAdminClient()

  const { data } = await supabase
    .from("departments")
    .select("*")
    .eq("institution_id", institutionId)
    .order("name")

  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const body = await req.json()

  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from("departments")
    .insert({
      institution_id: body.institution_id,
      name: body.name,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }

  return NextResponse.json(data)
}