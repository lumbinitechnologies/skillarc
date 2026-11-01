import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { ROLES } from "@/constants/roles"
import { inviteUser, resolveAppOrigin } from "@/lib/invite-user"

function escapeLike(value: string): string {
  // Escape SQL LIKE wildcards so user input doesn't corrupt ilike patterns
  return value.replace(/%/g, "\\%").replace(/_/g, "\\_")
}

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

    const admin = createSupabaseAdminClient()

    const { data: profile } = await admin
      .from("users")
      .select("role, institution_id, organization_id")
      .eq("id", user.id)
      .single()

    const allowedRoles = new Set([
      ROLES.SUPER_ADMIN,
      ROLES.ORG_ADMIN,
      ROLES.INSTITUTION_ADMIN,
      ROLES.HOD,
      ROLES.PROGRAM_HEAD,
    ])

    if (!profile || !allowedRoles.has(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { entity, rows } = body
    const institution_id = body.institution_id || profile.institution_id

    if (!institution_id) {
      return NextResponse.json({ error: "Institution ID is required" }, { status: 400 })
    }

    if (
      profile.role !== ROLES.SUPER_ADMIN &&
      profile.institution_id &&
      profile.institution_id !== institution_id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!entity || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Invalid import payload" }, { status: 400 })
    }

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

          // 1. Resolve program (by name or associated department name)
          if (programName) {
            const { data: prog } = await admin
              .from("programs")
              .select("id")
              .eq("institution_id", institution_id)
              .ilike("name", `%${programName}%`)
              .limit(1)
              .maybeSingle()
            programId = prog?.id ?? null

            if (!programId) {
              const { data: deptProg } = await admin
                .from("programs")
                .select("id, departments!inner(name)")
                .eq("institution_id", institution_id)
                .ilike("departments.name", `%${programName}%`)
                .limit(1)
                .maybeSingle()
              programId = deptProg?.id ?? null
            }
          }

          // 2. Resolve section (scoped to program if known, avoiding name collisions)
          if (sectionName) {
            let sectionQuery = admin
              .from("sections")
              .select("id, program_id")
              .eq("institution_id", institution_id)
              .ilike("name", `%${sectionName}%`)

            if (programId) {
              sectionQuery = sectionQuery.eq("program_id", programId)
            }

            const { data: section } = await sectionQuery.limit(1).maybeSingle()
            sectionId = section?.id ?? null
            if (!programId && section?.program_id) {
              programId = section.program_id
            }
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
              institution_id,
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
            // 1. Try matching program name directly
            const { data: program } = await admin
              .from("programs")
              .select("id")
              .eq("institution_id", institution_id)
              .ilike("name", `%${programName}%`)
              .limit(1)
              .maybeSingle()
            programId = program?.id ?? null

            // 2. If not found, try matching by associated department name
            if (!programId) {
              const { data: deptProg } = await admin
                .from("programs")
                .select("id, departments!inner(name)")
                .eq("institution_id", institution_id)
                .ilike("departments.name", `%${programName}%`)
                .limit(1)
                .maybeSingle()
              programId = deptProg?.id ?? null
            }
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
        const facultyEmail = String(row.faculty_email || row.email || "").trim()
        const facultyName = String(row.faculty_name || row.faculty || row.name || "").trim()
        const subjectCode = String(row.subject_code || row.code || row.course_code || "").trim()
        const subjectName = String(row.subject_name || row.subject || row.course || row.course_name || "").trim()
        if ((!facultyEmail && !facultyName) || (!subjectCode && !subjectName)) continue

        try {
          let facultyId: string | null = null
          if (facultyEmail) {
            const { data: faculty } = await admin
              .from("users")
              .select("id")
              .eq("institution_id", institution_id)
              .in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD])
              .eq("email", facultyEmail)
              .limit(1)
              .maybeSingle()
            facultyId = faculty?.id ?? null
            if (!facultyId) console.warn(`[bulk-import] No faculty found with email: ${facultyEmail}`)
          }
          
          if (!facultyId && facultyName) {
            // 1. Try exact match on name
            const { data: exactFaculty } = await admin
              .from("users")
              .select("id")
              .eq("institution_id", institution_id)
              .in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD])
              .ilike("name", facultyName)
              .limit(1)
              .maybeSingle()
            if (exactFaculty?.id) {
              facultyId = exactFaculty.id
            } else {
              // 2. Try fuzzy match on name
              const { data: fuzzyFaculty } = await admin
                .from("users")
                .select("id")
                .eq("institution_id", institution_id)
                .in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD])
                .ilike("name", `%${facultyName}%`)
                .limit(1)
                .maybeSingle()
              facultyId = fuzzyFaculty?.id ?? null
            }
            if (!facultyId) console.warn(`[bulk-import] No faculty found with name matching: ${facultyName}`)
          }

          let subjectId: string | null = null
          if (subjectCode) {
            const { data: subject } = await admin
              .from("subjects")
              .select("id")
              .eq("institution_id", institution_id)
              .ilike("code", subjectCode)
              .limit(1)
              .maybeSingle()
            subjectId = subject?.id ?? null
          }
          
          if (!subjectId && subjectName) {
            // 1. Try exact match on subject name
            const { data: exactSubject } = await admin
              .from("subjects")
              .select("id")
              .eq("institution_id", institution_id)
              .ilike("name", subjectName)
              .limit(1)
              .maybeSingle()
            if (exactSubject?.id) {
              subjectId = exactSubject.id
            } else {
              // 2. Try fuzzy match on subject name
              const { data: fuzzySubject } = await admin
                .from("subjects")
                .select("id")
                .eq("institution_id", institution_id)
                .ilike("name", `%${subjectName}%`)
                .limit(1)
                .maybeSingle()
              subjectId = fuzzySubject?.id ?? null
            }
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
      let failedRows = 0
      const missingSections = new Set<string>()
      const missingSubjects = new Set<string>()
      for (const row of rows) {
        const day = String(row.day || "").trim()
        const rawPeriod = String(row.period || "").trim()
        const periodNum = Number(rawPeriod.toUpperCase().replace(/[^0-9]/g, "") || rawPeriod)
        const period = Number.isFinite(periodNum) ? periodNum : 0
        const sectionName = String(row.section_name || "").trim()
        const subjectCode = String(row.subject_code || row.subject_name || "").trim()
        const facultyEmail = String(row.faculty_email || "").trim()
        const facultyName = String(row.faculty_name || "").trim()
        const departmentName = String(row.department_name || "").trim()
        const programName = String(row.program_name || "").trim()
        const room = row.room ? String(row.room).trim() : null
        if (!day || period <= 0 || !sectionName || !subjectCode) {
          failedRows++
          continue
        }

        try {
          // Narrow section lookup by program/department/semester when provided
          // Escape special SQL LIKE wildcards in user-provided strings
          const safeSection = escapeLike(sectionName)
          const safeProgramName = escapeLike(programName)
          const safeDeptName = escapeLike(departmentName)

          let sectionQuery = admin
            .from("sections")
            .select("id, semester, name")
            .eq("institution_id", institution_id)
            .ilike("name", `%${safeSection}%`)

          if (row.semester) {
            sectionQuery = sectionQuery.eq("semester", Number(row.semester))
          }

          if (safeProgramName || safeDeptName) {
            let programQuery = admin
              .from("programs")
              .select("id")
              .eq("institution_id", institution_id)

            if (safeProgramName) {
              programQuery = programQuery.ilike("name", `%${safeProgramName}%`)
            }

            if (safeDeptName) {
              const { data: matchedDepts } = await admin
                .from("departments")
                .select("id")
                .eq("institution_id", institution_id)
                .ilike("name", `%${safeDeptName}%`)
                .limit(1)
              const deptId = matchedDepts?.[0]?.id
              if (deptId) {
                programQuery = programQuery.eq("department_id", deptId)
              }
            }

            const { data: matchedPrograms } = await programQuery
            const programIds = (matchedPrograms ?? []).map((p: any) => p.id)
            if (programIds.length > 0) {
              sectionQuery = sectionQuery.in("program_id", programIds)
            }
          }

          let { data: matchedSections } = await sectionQuery.limit(1)
          let section = matchedSections?.[0]

          // Fallback: if semester narrowed too strictly and returned nothing, try without semester constraint
          if (!section?.id && row.semester) {
            const { data: fallbackSections } = await admin
              .from("sections")
              .select("id, semester, name")
              .eq("institution_id", institution_id)
              .ilike("name", `%${safeSection}%`)
              .limit(1)
            section = fallbackSections?.[0]
          }

          // Subject lookup: try exact code match first (safest), then case-insensitive code, then name
          // Avoid injecting subjectCode into raw .or() filter strings — special chars break the query
          let matchedSubjects: { id: string }[] | null = null

          // 1. Exact code match (fastest, handles special chars safely)
          const { data: exactCodeSubjects } = await admin
            .from("subjects")
            .select("id")
            .eq("institution_id", institution_id)
            .eq("code", subjectCode.toUpperCase())
            .limit(1)
          matchedSubjects = exactCodeSubjects && exactCodeSubjects.length > 0 ? exactCodeSubjects : null

          // 2. Case-insensitive code match
          if (!matchedSubjects) {
            const safeCode = escapeLike(subjectCode)
            const { data: ilikeCodeSubjects } = await admin
              .from("subjects")
              .select("id")
              .eq("institution_id", institution_id)
              .ilike("code", safeCode)
              .limit(1)
            matchedSubjects = ilikeCodeSubjects && ilikeCodeSubjects.length > 0 ? ilikeCodeSubjects : null
          }

          // 3. Partial code match (fuzzy)
          if (!matchedSubjects) {
            const safeCode = escapeLike(subjectCode)
            const { data: partialCodeSubjects } = await admin
              .from("subjects")
              .select("id")
              .eq("institution_id", institution_id)
              .ilike("code", `%${safeCode}%`)
              .limit(1)
            matchedSubjects = partialCodeSubjects && partialCodeSubjects.length > 0 ? partialCodeSubjects : null
          }

          // 4. Name match (fallback when column is subject_name)
          if (!matchedSubjects) {
            const safeName = escapeLike(subjectCode)
            const { data: nameSubjects } = await admin
              .from("subjects")
              .select("id")
              .eq("institution_id", institution_id)
              .ilike("name", `%${safeName}%`)
              .limit(1)
            matchedSubjects = nameSubjects && nameSubjects.length > 0 ? nameSubjects : null
          }

          const subject = matchedSubjects?.[0]

          if (!section?.id) {
            missingSections.add(sectionName)
            console.warn(`[bulk-import] Timetable row: section not found: ${sectionName}`)
            failedRows++
            continue
          }
          if (!subject?.id) {
            missingSubjects.add(subjectCode)
            console.warn(`[bulk-import] Timetable row: subject not found: ${subjectCode} — import it first via Subjects CSV`)
            failedRows++
            continue
          }

          let facultyId: string | null = null
          if (facultyEmail) {
            const { data: facultyUsers } = await admin
              .from("users")
              .select("id")
              .eq("institution_id", institution_id)
              .ilike("email", facultyEmail)
              .limit(1)
            facultyId = facultyUsers?.[0]?.id ?? null
          }
          if (!facultyId && (facultyName || facultyEmail)) {
            const nameToFind = facultyName || facultyEmail
            const { data: facultyUsers } = await admin
              .from("users")
              .select("id")
              .eq("institution_id", institution_id)
              .ilike("name", `%${nameToFind}%`)
              .limit(1)
            facultyId = facultyUsers?.[0]?.id ?? null
          }

          const semesterVal = row.semester ? Number(row.semester) : (section.semester ?? 1)
          const normalizedDay = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()

          // Check if slot already exists in this logical cell (institution, section, day, period)
          const { data: existingSlots } = await admin
            .from("timetable_slots")
            .select("id")
            .eq("institution_id", institution_id)
            .eq("section_id", section.id)
            .eq("day", normalizedDay)
            .eq("period", period)
            .limit(1)
          const existingSlot = existingSlots?.[0]

          const slotPayload: Record<string, any> = {
            subject_id: subject.id,
            faculty_id: facultyId,
            semester: semesterVal,
          }
          if (room) {
            slotPayload.room = room
          }

          if (existingSlot?.id) {
            const { error: updErr } = await admin
              .from("timetable_slots")
              .update(slotPayload)
              .eq("id", existingSlot.id)
            if (updErr) {
              console.error("[bulk-import] Failed to update timetable slot:", updErr)
              failedRows++
              continue
            }
          } else {
            const { error: insErr } = await admin
              .from("timetable_slots")
              .insert({
                institution_id: institution_id,
                organization_id: profile.organization_id,
                section_id: section.id,
                day: normalizedDay,
                period,
                ...slotPayload,
              })
            if (insErr) {
              console.error("[bulk-import] Failed to insert timetable slot:", insErr)
              failedRows++
              continue
            }
          }

          createdCount += 1
        } catch (rowError) {
          console.error(`[bulk-import] Failed to import timetable row:`, rowError)
          failedRows++
        }
      }

      if (createdCount === 0 && failedRows > 0) {
        const parts: string[] = []
        if (missingSections.size > 0) {
          parts.push(`Sections not found: ${[...missingSections].join(", ")}`)
        }
        if (missingSubjects.size > 0) {
          parts.push(`Subject codes not found (import via Subjects CSV first): ${[...missingSubjects].join(", ")}`)
        }
        const detail = parts.length > 0 ? parts.join(" | ") : "Please verify section names and subject codes match your institution."
        return NextResponse.json(
          { error: `No timetable slots could be imported. ${detail}` },
          { status: 400 }
        )
      }

      // Partial success: return warnings for what failed
      if (failedRows > 0) {
        const warnings: string[] = []
        if (missingSections.size > 0) warnings.push(`Sections not found: ${[...missingSections].join(", ")}`)
        if (missingSubjects.size > 0) warnings.push(`Subject codes not found: ${[...missingSubjects].join(", ")}`)
        return NextResponse.json({ createdCount, failedRows, warnings })
      }
    // ─────────────────────────────────────────────────────────────
    // 7. DEPARTMENTS
    // ─────────────────────────────────────────────────────────────
    } else if (entity === "departments") {
      for (const row of rows) {
        const name = String(row.name || "").trim()
        if (!name) continue

        try {
          // Upsert by name (case-insensitive) to avoid duplicates
          const { data: existing } = await admin
            .from("departments")
            .select("id")
            .eq("institution_id", institution_id)
            .ilike("name", name)
            .maybeSingle()

          if (!existing) {
            const { error: insErr } = await admin.from("departments").insert({
              name: toTitleCase(name),
              institution_id: institution_id,
            })
            if (insErr) throw insErr
          }

          createdCount += 1
        } catch (rowError) {
          console.error(`[bulk-import] Failed to import department (${name}):`, rowError)
        }
      }

    // ─────────────────────────────────────────────────────────────
    // 8. PROGRAMS
    // ─────────────────────────────────────────────────────────────
    } else if (entity === "programs") {
      for (const row of rows) {
        const name = String(row.name || "").trim()
        if (!name) continue

        try {
          // Resolve department by name — try exact match first, then partial
          let departmentId: string | null = null
          const departmentName = String(row.department_name || "").trim()
          if (departmentName) {
            // 1. Exact match (case-insensitive)
            const { data: exactDept } = await admin
              .from("departments")
              .select("id")
              .eq("institution_id", institution_id)
              .ilike("name", departmentName)
              .maybeSingle()

            if (exactDept?.id) {
              departmentId = exactDept.id
            } else {
              // 2. Partial match fallback
              const { data: partialDept } = await admin
                .from("departments")
                .select("id, name")
                .eq("institution_id", institution_id)
                .ilike("name", `%${departmentName}%`)
                .maybeSingle()

              if (partialDept?.id) {
                departmentId = partialDept.id
              } else {
                console.warn(
                  `[bulk-import] Program "${name}": department "${departmentName}" not found in institution ${institution_id}. Program will be created without a department link.`
                )
              }
            }
          }

          const { data: existing } = await admin
            .from("programs")
            .select("id")
            .eq("institution_id", institution_id)
            .ilike("name", name)
            .maybeSingle()

          if (!existing) {
            const { error: insErr } = await admin.from("programs").insert({
              name: toTitleCase(name),
              department_id: departmentId,
              institution_id: institution_id,
              organization_id: profile.organization_id,
            })
            if (insErr) throw insErr
          } else {
            // Always update department link if provided and resolved
            if (departmentId) {
              await admin.from("programs").update({ department_id: departmentId }).eq("id", existing.id)
            }
          }

          createdCount += 1
        } catch (rowError) {
          console.error(`[bulk-import] Failed to import program (${name}):`, rowError)
        }
      }


    // ─────────────────────────────────────────────────────────────
    // 9. SECTIONS
    // ─────────────────────────────────────────────────────────────
    } else if (entity === "sections") {
      for (const row of rows) {
        const name = String(row.name || "").trim()
        const semester = Number(row.semester || 1)
        if (!name || !Number.isFinite(semester)) continue

        try {
          const programName = String(row.program_name || "").trim()
          const departmentName = String(row.department_name || "").trim()

          // ── 1. Resolve department (exact first, then partial) ──
          let departmentId: string | null = null
          if (departmentName) {
            const { data: exactDept } = await admin
              .from("departments")
              .select("id")
              .eq("institution_id", institution_id)
              .ilike("name", departmentName)
              .maybeSingle()

            if (exactDept?.id) {
              departmentId = exactDept.id
            } else {
              const { data: partialDept } = await admin
                .from("departments")
                .select("id")
                .eq("institution_id", institution_id)
                .ilike("name", `%${departmentName}%`)
                .maybeSingle()

              if (partialDept?.id) {
                departmentId = partialDept.id
              } else {
                console.warn(
                  `[bulk-import] Section "${name}": department "${departmentName}" not found — program lookup will run without department filter.`
                )
              }
            }
          }

          // ── 2. Resolve program (exact first, then partial; narrowed by dept if resolved) ──
          let programId: string | null = null
          if (programName) {
            // Try exact match first
            let exactQuery = admin
              .from("programs")
              .select("id")
              .eq("institution_id", institution_id)
              .ilike("name", programName)

            if (departmentId) exactQuery = exactQuery.eq("department_id", departmentId)

            const { data: exactProg } = await exactQuery.maybeSingle()

            if (exactProg?.id) {
              programId = exactProg.id
            } else {
              // Partial match fallback
              let partialQuery = admin
                .from("programs")
                .select("id")
                .eq("institution_id", institution_id)
                .ilike("name", `%${programName}%`)

              if (departmentId) partialQuery = partialQuery.eq("department_id", departmentId)

              const { data: partialProg } = await partialQuery.maybeSingle()

              if (partialProg?.id) {
                programId = partialProg.id
              } else {
                console.warn(
                  `[bulk-import] Section "${name}" skipped — could not resolve program "${programName}"${departmentName ? ` (under department "${departmentName}")` : ""}.`
                )
              }
            }
          } else {
            console.warn(`[bulk-import] Section "${name}" skipped — program_name is required.`)
          }

          if (!programId) continue

          // ── 3. Resolve optional faculty advisor ──
          let facultyAdvisorId: string | null = null
          const facultyEmail = String(row.faculty_advisor_email || "").trim()
          if (facultyEmail) {
            const { data: fac } = await admin
              .from("users")
              .select("id")
              .eq("institution_id", institution_id)
              .eq("email", facultyEmail)
              .maybeSingle()
            facultyAdvisorId = fac?.id ?? null
          }

          // ── 4. Insert or update section ──
          const { data: existing } = await admin
            .from("sections")
            .select("id")
            .eq("institution_id", institution_id)
            .eq("program_id", programId)
            .ilike("name", name)
            .eq("semester", semester)
            .maybeSingle()

          if (!existing) {
            const { error: insErr } = await admin.from("sections").insert({
              name: toTitleCase(name),
              semester,
              program_id: programId,
              institution_id: institution_id,
              faculty_advisor_id: facultyAdvisorId,
            })
            if (insErr) throw insErr
          } else if (facultyAdvisorId) {
            await admin.from("sections").update({ faculty_advisor_id: facultyAdvisorId }).eq("id", existing.id)
          }

          createdCount += 1
        } catch (rowError) {
          console.error(`[bulk-import] Failed to import section (${name}):`, rowError)
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
