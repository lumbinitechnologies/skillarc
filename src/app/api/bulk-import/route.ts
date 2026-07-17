import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"
import { inviteUser, resolveAppOrigin } from "@/lib/invite-user"

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("users")
      .select("role, institution_id, organization_id")
      .eq("id", user.id)
      .single()

    if (profile?.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { entity, institution_id, rows } = body

    if (!institution_id || institution_id !== profile.institution_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!entity || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Invalid import payload" }, { status: 400 })
    }

    const origin = resolveAppOrigin(request.headers)
    let createdCount = 0

    if (entity === "students") {
      for (const row of rows) {
        const email = String(row.email || "").trim()
        const name = String(row.name || "").trim()
        if (!email || !name) continue

        await inviteUser({
          email,
          role: ROLES.STUDENT,
          institutionId: institution_id,
          organizationId: profile.organization_id,
          origin,
        })

        const sectionName = String(row.section_name || "").trim()
        const semester = Number(row.semester || 1)

        let sectionId: string | null = null
        if (sectionName) {
          const { data: section } = await supabase
            .from("sections")
            .select("id")
            .eq("institution_id", institution_id)
            .ilike("name", `%${sectionName}%`)
            .maybeSingle()
          sectionId = section?.id ?? null
        }

        const { data: invitedUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .single()

        if (invitedUser?.id) {
          await supabase.from("users").update({
            name: toTitleCase(name),
            role: ROLES.STUDENT,
            institution_id: institution_id,
            section_id: sectionId,
            semester: Number.isFinite(semester) ? semester : null,
            registration_number: row.registration_number || null,
            phone: row.phone || null,
            admission_year: row.admission_year ? Number(row.admission_year) : null,
          }).eq("id", invitedUser.id)
          createdCount += 1
        }
      }
    } else if (entity === "faculty") {
      for (const row of rows) {
        const email = String(row.email || "").trim()
        const name = String(row.name || "").trim()
        if (!email || !name) continue

        await inviteUser({
          email,
          role: ROLES.FACULTY,
          institutionId: institution_id,
          organizationId: profile.organization_id,
          origin,
        })

        const departmentName = String(row.department_name || "").trim()
        let departmentId: string | null = null
        if (departmentName) {
          const { data: department } = await supabase
            .from("departments")
            .select("id")
            .eq("institution_id", institution_id)
            .ilike("name", `%${departmentName}%`)
            .maybeSingle()
          departmentId = department?.id ?? null
        }

        await supabase.from("users").update({
          name: toTitleCase(name),
          role: ROLES.FACULTY,
          institution_id: institution_id,
          department_id: departmentId,
        }).eq("email", email)
        createdCount += 1
      }
    } else if (entity === "subjects") {
      for (const row of rows) {
        const name = String(row.name || "").trim()
        const code = String(row.code || "").trim()
        if (!name || !code) continue

        let programId: string | null = null
        const programName = String(row.program_name || "").trim()
        if (programName) {
          const { data: program } = await supabase
            .from("programs")
            .select("id")
            .eq("institution_id", institution_id)
            .ilike("name", `%${programName}%`)
            .maybeSingle()
          programId = program?.id ?? null
        }

        const { error } = await supabase.from("subjects").insert({
          institution_id: institution_id,
          name: toTitleCase(name),
          code: code.toUpperCase(),
          semester: row.semester ? Number(row.semester) : null,
          program_id: programId,
          credits: row.credits ? Number(row.credits) : null,
          subject_type: row.subject_type || null,
        })

        if (!error) createdCount += 1
      }
    } else if (entity === "faculty-subjects") {
      for (const row of rows) {
        const facultyEmail = String(row.faculty_email || "").trim()
        const facultyName = String(row.faculty_name || "").trim()
        const subjectCode = String(row.subject_code || "").trim()
        const subjectName = String(row.subject_name || "").trim()
        if ((!facultyEmail && !facultyName) || (!subjectCode && !subjectName)) continue

        const { data: faculty } = await supabase
          .from("users")
          .select("id")
          .eq("institution_id", institution_id)
          .eq("role", ROLES.FACULTY)
          .or(`email.eq.${facultyEmail},name.ilike.%${facultyName}%`)
          .maybeSingle()

        const { data: subject } = await supabase
          .from("subjects")
          .select("id")
          .eq("institution_id", institution_id)
          .or(`code.eq.${subjectCode},name.ilike.%${subjectName}%`)
          .maybeSingle()

        if (faculty?.id && subject?.id) {
          const { error } = await supabase.from("faculty_subjects").insert({
            institution_id: institution_id,
            faculty_id: faculty.id,
            subject_id: subject.id,
          })
          if (!error) createdCount += 1
        }
      }
    } else if (entity === "parents") {
      for (const row of rows) {
        const email = String(row.email || "").trim()
        const name = String(row.name || "").trim()
        if (!email || !name) continue

        const adminClient = (await import("@/lib/supabase-admin")).createSupabaseAdminClient()
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email,
          password: String(row.password || Math.random().toString(36).slice(-12)),
          email_confirm: true,
        })

        if (authError || !authData.user) continue

        const { error } = await adminClient.from("users").upsert({
          id: authData.user.id,
          name: toTitleCase(name),
          email,
          role: ROLES.PARENT,
          institution_id: institution_id,
          organization_id: profile.organization_id,
          phone: row.phone || null,
        }, { onConflict: "id" })
        if (!error) createdCount += 1
      }
    } else if (entity === "timetable") {
      for (const row of rows) {
        const day = String(row.day || "").trim()
        const period = Number(row.period)
        const sectionName = String(row.section_name || "").trim()
        const subjectCode = String(row.subject_code || "").trim()
        if (!day || !Number.isFinite(period) || !sectionName || !subjectCode) continue

        const { data: section } = await supabase
          .from("sections")
          .select("id")
          .eq("institution_id", institution_id)
          .ilike("name", `%${sectionName}%`)
          .maybeSingle()

        const { data: subject } = await supabase
          .from("subjects")
          .select("id")
          .eq("institution_id", institution_id)
          .ilike("code", `%${subjectCode}%`)
          .maybeSingle()

        if (!section?.id || !subject?.id) continue

        const { error } = await supabase.from("timetable_slots").upsert({
          institution_id: institution_id,
          section_id: section.id,
          semester: row.semester ? Number(row.semester) : null,
          day: day.charAt(0).toUpperCase() + day.slice(1),
          period,
          subject_id: subject.id,
          faculty_id: null,
        }, { onConflict: "institution_id,section_id,semester,day,period" })

        if (!error) createdCount += 1
      }
    } else {
      return NextResponse.json({ error: "Unsupported entity" }, { status: 400 })
    }

    return NextResponse.json({ success: true, createdCount })
  } catch (error) {
    console.error("Bulk import error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}
