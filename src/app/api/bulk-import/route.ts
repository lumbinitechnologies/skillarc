import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
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

    const admin = createSupabaseAdminClient()
    const origin = resolveAppOrigin(request.headers)
    let createdCount = 0

    // ─────────────────────────────────────────────────────────────
    // 1. STUDENTS
    // ─────────────────────────────────────────────────────────────
    if (entity === "students") {
      for (const row of rows) {
        const email = String(row.email || "").trim()
        const name = String(row.name || "").trim()
        if (!email || !name) continue

        try {
          const inviteResult = await inviteUser({
            email,
            role: ROLES.STUDENT,
            institutionId: institution_id,
            organizationId: profile.organization_id,
            origin,
          })

          const studentUserId = inviteResult?.userId
          if (!studentUserId) continue

          const sectionName = String(row.section_name || "").trim()
          const programName = String(row.program_name || "").trim()
          const semester = Number(row.semester || 1)

          let sectionId: string | null = null
          let programId: string | null = null

          if (sectionName) {
            const { data: section } = await admin
              .from("sections")
              .select("id, program_id")
              .eq("institution_id", institution_id)
              .ilike("name", `%${sectionName}%`)
              .maybeSingle()
            sectionId = section?.id ?? null
            programId = section?.program_id ?? null
          }

          if (!programId && programName) {
            const { data: prog } = await admin
              .from("programs")
              .select("id")
              .eq("institution_id", institution_id)
              .ilike("name", `%${programName}%`)
              .maybeSingle()
            programId = prog?.id ?? null
          }

          await admin.from("users").update({
            name: toTitleCase(name),
            role: ROLES.STUDENT,
            institution_id: institution_id,
            phone: row.phone || null,
          }).eq("id", studentUserId)

          await admin.from("students").upsert({
            id: studentUserId,
            institution_id: institution_id,
            section_id: sectionId,
            program_id: programId,
            semester: Number.isFinite(semester) ? semester : null,
            registration_number: row.registration_number || null,
            admission_year: row.admission_year ? Number(row.admission_year) : null,
            dob: row.dob || null,
            gender: row.gender || null,
          }, { onConflict: "id" })

          // Create / Link parent if parent details provided in CSV
          const parentEmail = String(row.parent_email || "").trim()
          const parentName = String(row.parent_name || "").trim()
          const parentPhone = String(row.parent_phone || "").trim()
          const parentRelationship = String(row.parent_relationship || "").trim() || "Guardian"

          if (parentEmail && parentName) {
            const { data: existingParent } = await admin
              .from("users")
              .select("id")
              .eq("email", parentEmail)
              .eq("role", ROLES.PARENT)
              .maybeSingle()

            let parentUserId = existingParent?.id

            if (!parentUserId) {
              try {
                const inviteResult = await inviteUser({
                  email: parentEmail,
                  role: ROLES.PARENT,
                  institutionId: institution_id,
                  organizationId: profile.organization_id || "",
                  origin,
                  name: toTitleCase(parentName),
                })
                parentUserId = inviteResult?.userId ?? undefined

                if (parentUserId) {
                  await admin.from("users").update({
                    name: toTitleCase(parentName),
                    phone: parentPhone || null,
                  }).eq("id", parentUserId)
                }
              } catch (parentInviteError) {
                console.error(`[bulk-import] Parent invite failed (${parentEmail}):`, parentInviteError)
              }
            }

            if (parentUserId) {
              const { data: existingRelation } = await admin
                .from("parent_student_relations")
                .select("id")
                .eq("parent_id", parentUserId)
                .eq("student_id", studentUserId)
                .maybeSingle()

              if (!existingRelation) {
                await admin.from("parent_student_relations").insert({
                  parent_id: parentUserId,
                  student_id: studentUserId,
                  relationship: parentRelationship,
                })
              }
            }
          }

          createdCount += 1
        } catch (rowError) {
          console.error(`[bulk-import] Failed to import student (${email}):`, rowError)
        }
      }

    // ─────────────────────────────────────────────────────────────
    // 2. FACULTY
    // ─────────────────────────────────────────────────────────────
    } else if (entity === "faculty") {
      for (const row of rows) {
        const email = String(row.email || "").trim()
        const name = String(row.name || "").trim()
        if (!email || !name) continue

        try {
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
            const { data: department } = await admin
              .from("departments")
              .select("id")
              .eq("institution_id", institution_id)
              .ilike("name", `%${departmentName}%`)
              .maybeSingle()
            departmentId = department?.id ?? null
          }

          const rawRole = String(row.role || "").trim().toUpperCase()
          const assignedRole = (rawRole === "HOD" || rawRole === "PROGRAM_HEAD") ? rawRole : ROLES.FACULTY

          const { data: facultyUser } = await admin.from("users").update({
            name: toTitleCase(name),
            role: assignedRole,
            institution_id: institution_id,
            department_id: departmentId,
            phone: row.phone || null,
          }).eq("email", email).select("id").maybeSingle()

          const employeeId = String(row.employee_id || "").trim()
          if (employeeId && facultyUser?.id) {
            await admin.from("staff").upsert({
              id: facultyUser.id,
              institution_id: institution_id,
              employee_id: employeeId,
            }, { onConflict: "id" })
          }

          const isTt = String(row.is_timetable_builder || "").trim().toLowerCase()
          if ((isTt === "true" || isTt === "1" || isTt === "yes") && facultyUser?.id) {
            let { data: perm } = await admin
              .from("permissions")
              .select("id")
              .eq("name", "timetable_builder")
              .maybeSingle()
            if (!perm) {
              const { data: newPerm } = await admin
                .from("permissions")
                .insert({ name: "timetable_builder" })
                .select("id")
                .single()
              perm = newPerm
            }
            if (perm?.id) {
              await admin
                .from("user_permissions")
                .upsert({ user_id: facultyUser.id, permission_id: perm.id }, { onConflict: "user_id,permission_id" as any })
            }
          }

          createdCount += 1
        } catch (rowError) {
          console.error(`[bulk-import] Failed to import faculty row (${email}):`, rowError)
        }
      }

    // ─────────────────────────────────────────────────────────────
    // 3. SUBJECTS
    // ─────────────────────────────────────────────────────────────
    } else if (entity === "subjects") {
      for (const row of rows) {
        const name = String(row.name || "").trim()
        const code = String(row.code || "").trim()
        if (!name || !code) continue

        try {
          let programId: string | null = null
          const programName = String(row.program_name || "").trim()
          if (programName) {
            const { data: program } = await admin
              .from("programs")
              .select("id")
              .eq("institution_id", institution_id)
              .ilike("name", `%${programName}%`)
              .maybeSingle()
            programId = program?.id ?? null
          }

          const { data: existingSub } = await admin
            .from("subjects")
            .select("id")
            .eq("institution_id", institution_id)
            .ilike("code", code)
            .maybeSingle()

          let normalizedType: string = "THEORY"
          const rawType = String(row.subject_type || "").trim().toUpperCase()
          if (rawType === "LAB" || rawType === "PRACTICAL") {
            normalizedType = "LAB"
          } else if (rawType === "ELECTIVE") {
            normalizedType = "ELECTIVE"
          } else {
            normalizedType = "THEORY"
          }

          if (existingSub?.id) {
            const { error: updErr } = await admin.from("subjects").update({
              name: toTitleCase(name),
              semester: row.semester ? Number(row.semester) : null,
              program_id: programId,
              credits: row.credits ? Number(row.credits) : null,
              subject_type: normalizedType,
            }).eq("id", existingSub.id)
            if (updErr) throw updErr
          } else {
            const { error: insErr } = await admin.from("subjects").insert({
              institution_id: institution_id,
              name: toTitleCase(name),
              code: code.toUpperCase(),
              semester: row.semester ? Number(row.semester) : null,
              program_id: programId,
              credits: row.credits ? Number(row.credits) : null,
              subject_type: normalizedType,
            })
            if (insErr) throw insErr
          }

          createdCount += 1
        } catch (rowError) {
          console.error(`[bulk-import] Failed to import subject (${code}):`, rowError)
        }
      }

    // ─────────────────────────────────────────────────────────────
    // 4. FACULTY-SUBJECTS
    // ─────────────────────────────────────────────────────────────
    } else if (entity === "faculty-subjects") {
      for (const row of rows) {
        const facultyEmail = String(row.faculty_email || "").trim()
        const facultyName = String(row.faculty_name || "").trim()
        const subjectCode = String(row.subject_code || "").trim()
        const subjectName = String(row.subject_name || "").trim()
        if ((!facultyEmail && !facultyName) || (!subjectCode && !subjectName)) continue

        try {
          let facultyId: string | null = null
          if (facultyEmail) {
            const { data: faculty } = await admin
              .from("users")
              .select("id")
              .eq("institution_id", institution_id)
              .eq("role", ROLES.FACULTY)
              .eq("email", facultyEmail)
              .maybeSingle()
            facultyId = faculty?.id ?? null
          } else if (facultyName) {
            const { data: faculty } = await admin
              .from("users")
              .select("id")
              .eq("institution_id", institution_id)
              .eq("role", ROLES.FACULTY)
              .ilike("name", `%${facultyName}%`)
              .maybeSingle()
            facultyId = faculty?.id ?? null
          }

          let subjectId: string | null = null
          if (subjectCode) {
            const { data: subject } = await admin
              .from("subjects")
              .select("id")
              .eq("institution_id", institution_id)
              .ilike("code", subjectCode)
              .maybeSingle()
            subjectId = subject?.id ?? null
          } else if (subjectName) {
            const { data: subject } = await admin
              .from("subjects")
              .select("id")
              .eq("institution_id", institution_id)
              .ilike("name", `%${subjectName}%`)
              .maybeSingle()
            subjectId = subject?.id ?? null
          }

          if (facultyId && subjectId) {
            let sectionId: string | null = null
            const sectionName = String(row.section_name || "").trim()
            if (sectionName) {
              const { data: section } = await admin
                .from("sections")
                .select("id")
                .eq("institution_id", institution_id)
                .ilike("name", `%${sectionName}%`)
                .maybeSingle()
              sectionId = section?.id ?? null
            }

            const semester = row.semester ? Number(row.semester) : null
            const academicYear = row.academic_year ? String(row.academic_year).trim() : null

            const { data: existingMap } = await admin
              .from("faculty_subjects")
              .select("id")
              .eq("institution_id", institution_id)
              .eq("faculty_id", facultyId)
              .eq("subject_id", subjectId)
              .maybeSingle()

            if (!existingMap) {
              await admin.from("faculty_subjects").insert({
                institution_id: institution_id,
                faculty_id: facultyId,
                subject_id: subjectId,
                section_id: sectionId,
                semester: semester,
                academic_year: academicYear,
              })
            } else if (sectionId || semester || academicYear) {
              await admin.from("faculty_subjects").update({
                section_id: sectionId ?? undefined,
                semester: semester ?? undefined,
                academic_year: academicYear ?? undefined,
              }).eq("id", existingMap.id)
            }
            createdCount += 1
          }
        } catch (rowError) {
          console.error(`[bulk-import] Failed to import faculty-subject mapping:`, rowError)
        }
      }

    // ─────────────────────────────────────────────────────────────
    // 5. PARENTS
    // ─────────────────────────────────────────────────────────────
    } else if (entity === "parents") {
      for (const row of rows) {
        const email = String(row.email || "").trim()
        const name = String(row.name || "").trim()
        if (!email || !name) continue

        try {
          let parentUserId: string | null = null

          try {
            const inviteRes = await inviteUser({
              email,
              role: ROLES.PARENT,
              institutionId: institution_id,
              organizationId: profile.organization_id,
              origin,
            })
            parentUserId = inviteRes.userId
          } catch (invErr) {
            const { data: existingUser } = await admin
              .from("users")
              .select("id")
              .eq("email", email)
              .maybeSingle()
            parentUserId = existingUser?.id ?? null
          }

          if (parentUserId) {
            await admin.from("users").upsert({
              id: parentUserId,
              name: toTitleCase(name),
              email,
              role: ROLES.PARENT,
              institution_id: institution_id,
              organization_id: profile.organization_id,
              phone: row.phone || null,
            }, { onConflict: "id" })

            // Link parent to student if student identifier is provided
            const studentEmail = String(row.student_email || "").trim()
            const studentRegNo = String(row.student_registration_number || "").trim()
            const relationship = String(row.relationship || "").trim() || "Guardian"

            if (studentEmail || studentRegNo) {
              let studentId: string | null = null
              if (studentEmail) {
                const { data: stUser } = await admin
                  .from("users")
                  .select("id")
                  .eq("email", studentEmail)
                  .eq("role", ROLES.STUDENT)
                  .maybeSingle()
                studentId = stUser?.id ?? null
              }
              if (!studentId && studentRegNo) {
                const { data: stRec } = await admin
                  .from("students")
                  .select("id")
                  .eq("institution_id", institution_id)
                  .ilike("registration_number", studentRegNo)
                  .maybeSingle()
                studentId = stRec?.id ?? null
              }
              if (studentId) {
                const { data: existingRelation } = await admin
                  .from("parent_student_relations")
                  .select("id")
                  .eq("parent_id", parentUserId)
                  .eq("student_id", studentId)
                  .maybeSingle()
                if (!existingRelation) {
                  await admin.from("parent_student_relations").insert({
                    parent_id: parentUserId,
                    student_id: studentId,
                    relationship,
                  })
                }
              }
            }

            createdCount += 1
          }
        } catch (rowError) {
          console.error(`[bulk-import] Failed to import parent row (${email}):`, rowError)
        }
      }

    // ─────────────────────────────────────────────────────────────
    // 6. TIMETABLE
    // ─────────────────────────────────────────────────────────────
    } else if (entity === "timetable") {
      for (const row of rows) {
        const day = String(row.day || "").trim()
        const period = Number(row.period)
        const sectionName = String(row.section_name || "").trim()
        const subjectCode = String(row.subject_code || "").trim()
        const facultyEmail = String(row.faculty_email || "").trim()
        if (!day || !Number.isFinite(period) || !sectionName || !subjectCode) continue

        try {
          const { data: section } = await admin
            .from("sections")
            .select("id, semester")
            .eq("institution_id", institution_id)
            .ilike("name", `%${sectionName}%`)
            .maybeSingle()

          const { data: subject } = await admin
            .from("subjects")
            .select("id")
            .eq("institution_id", institution_id)
            .ilike("code", `%${subjectCode}%`)
            .maybeSingle()

          if (!section?.id || !subject?.id) {
            console.warn(`[bulk-import] Timetable row missing section or subject: section=${sectionName}, subject=${subjectCode}`)
            continue
          }

          let facultyId: string | null = null
          if (facultyEmail) {
            const { data: facultyUser } = await admin
              .from("users")
              .select("id")
              .eq("institution_id", institution_id)
              .eq("email", facultyEmail)
              .maybeSingle()
            facultyId = facultyUser?.id ?? null
          }

          const semesterVal = row.semester ? Number(row.semester) : (section.semester ?? 1)
          const normalizedDay = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()

          // Check if slot already exists in this logical cell (institution, section, day, period)
          const { data: existingSlot } = await admin
            .from("timetable_slots")
            .select("id")
            .eq("institution_id", institution_id)
            .eq("section_id", section.id)
            .eq("day", normalizedDay)
            .eq("period", period)
            .maybeSingle()

          if (existingSlot?.id) {
            await admin
              .from("timetable_slots")
              .update({
                subject_id: subject.id,
                faculty_id: facultyId,
                semester: semesterVal,
              })
              .eq("id", existingSlot.id)
          } else {
            await admin
              .from("timetable_slots")
              .insert({
                institution_id: institution_id,
                organization_id: profile.organization_id,
                section_id: section.id,
                semester: semesterVal,
                day: normalizedDay,
                period,
                subject_id: subject.id,
                faculty_id: facultyId,
              })
          }

          createdCount += 1
        } catch (rowError) {
          console.error(`[bulk-import] Failed to import timetable row:`, rowError)
        }
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
