import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/user-context"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const context = await getCurrentUserContext()
  if (!context) return NextResponse.json({ results: [] }, { status: 401 })

  const supabase = await createSupabaseServerClient()
  const iid = context.institution_id
  const role = context.role
  const pattern = `%${q}%`

  type SearchResult = { id: string; type: string; title: string; subtitle: string; href: string }
  const results: SearchResult[] = []

  // Admin / HOD / Program Head can search students and faculty
  if ([ROLES.INSTITUTION_ADMIN, ROLES.HOD, ROLES.PROGRAM_HEAD].includes(role as any)) {
    const [studentsRes, facultyRes] = await Promise.all([
      supabase.from("users").select("id, name, email").eq("institution_id", iid).eq("role", ROLES.STUDENT).or(`name.ilike.${pattern},email.ilike.${pattern}`).limit(5),
      supabase.from("users").select("id, name, email").eq("institution_id", iid).in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD]).or(`name.ilike.${pattern},email.ilike.${pattern}`).limit(5),
    ])

    for (const s of studentsRes.data ?? []) {
      results.push({ id: s.id, type: "Student", title: s.name, subtitle: s.email, href: `/dashboard/institution-admin/students` })
    }
    for (const f of facultyRes.data ?? []) {
      results.push({ id: f.id, type: "Faculty", title: f.name, subtitle: f.email, href: `/dashboard/institution-admin/faculty` })
    }
  }

  // Everyone can search subjects/courses
  const subjectsRes = await supabase.from("subjects").select("id, name, code").eq("institution_id", iid).or(`name.ilike.${pattern},code.ilike.${pattern}`).limit(5)
  for (const sub of subjectsRes.data ?? []) {
    const href = role === ROLES.INSTITUTION_ADMIN
      ? `/dashboard/institution-admin/subjects`
      : role === ROLES.FACULTY
      ? `/dashboard/faculty/subjects`
      : `/dashboard/student/subjects`
    results.push({ id: sub.id, type: "Course", title: sub.name, subtitle: sub.code ?? "", href })
  }

  // Admin can search departments and programs
  if (role === ROLES.INSTITUTION_ADMIN) {
    const [deptsRes, progsRes] = await Promise.all([
      supabase.from("departments").select("id, name").eq("institution_id", iid).ilike("name", pattern).limit(5),
      supabase.from("programs").select("id, name").eq("institution_id", iid).ilike("name", pattern).limit(5),
    ])
    for (const d of deptsRes.data ?? []) {
      results.push({ id: d.id, type: "Department", title: d.name, subtitle: "", href: `/dashboard/institution-admin/departments` })
    }
    for (const p of progsRes.data ?? []) {
      results.push({ id: p.id, type: "Program", title: p.name, subtitle: "", href: `/dashboard/institution-admin/programs` })
    }
  }

  return NextResponse.json({ results })
}
