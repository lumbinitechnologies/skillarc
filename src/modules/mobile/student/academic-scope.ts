import type { SupabaseClient } from "@supabase/supabase-js"
import { ROLES } from "@/constants/roles"
import { academicTimeContext } from "@/lib/academic-time-zone"
import { MobileAuthError, type MobilePrincipal } from "@/lib/mobile-auth"
import { enrollmentDateBounds } from "./academic-time"

type Result<T> = { data: T | null; error: unknown }
type PagedQuery = PromiseLike<Result<unknown>>
export type Named = { id: string; name: string | null }
type Section = Named & { program_id: string | null; semester: number }
type Relationship = { subject_id: string; section_id: string | null; program_id: string | null; trainer_id: string | null }
export type StudentPrincipal = MobilePrincipal & { institution_id: string; organization_id: string }

export function scopeDenied(): never {
  throw new MobileAuthError(403, "ACADEMIC_SCOPE_DENIED", "Academic information is not available for this account")
}

export function requireStudent(principal: MobilePrincipal): StudentPrincipal {
  if (principal.role !== ROLES.STUDENT) {
    throw new MobileAuthError(403, "ROLE_NOT_SUPPORTED", "Student role required")
  }
  if (!principal.institution_id || !principal.organization_id) scopeDenied()
  return { ...principal, institution_id: principal.institution_id, organization_id: principal.organization_id }
}

export function result<T>(response: Result<unknown>) {
  if (response.error) {
    throw new MobileAuthError(503, "SERVICE_UNAVAILABLE", "Academic information is temporarily unavailable")
  }
  return response.data as T | null
}

export async function allPages<T extends { id: string }>(query: (after?: string) => PagedQuery) {
  const rows: T[] = []
  let after: string | undefined
  for (;;) {
    const page: T[] | null = result<T[]>(await query(after))
    if (!Array.isArray(page)) throw new Error("Invalid academic page")
    if (page.length === 0) return rows
    for (const row of page) {
      if (typeof row.id !== "string" || (after !== undefined && row.id <= after)) {
        throw new Error("Unordered academic page")
      }
      rows.push(row)
      after = row.id
    }
  }
}

export const PAGE_SIZE = 200

export function batches<T>(items: readonly T[], size = 50): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size))
}

export async function readAcademicScope(db: SupabaseClient, principal: StudentPrincipal, now: Date) {
  const { id, organization_id: organization, institution_id: institution } = principal
  const [institutionResult, studentResult] = await Promise.all([
    db.from("institutions").select("academic_time_zone").eq("id", institution)
      .eq("organization_id", organization).maybeSingle(),
    db.from("students").select("section_id,program_id").eq("id", id)
      .eq("institution_id", institution).maybeSingle(),
  ])
  const campus = result<{ academic_time_zone: string | null }>(institutionResult)
  if (!campus) scopeDenied()
  const student = result<{ section_id: string | null; program_id: string | null }>(studentResult)
  if (!student) {
    // Only test the verified identity's existence. No out-of-scope profile fields.
    const elsewhere = result(await db.from("students").select("id").eq("id", id).maybeSingle())
    if (elsewhere) scopeDenied()
  }

  const clock = academicTimeContext(campus.academic_time_zone, now)
  const { earliest, latest } = enrollmentDateBounds(clock.today, now)
  const programs = new Map<string, Named>()
  const sections = new Map<string, Section>()
  const relationships: Relationship[] = []
  const multiweek = principal.features.includes("multi_week_timetable")
  let status: "ready" | "no_enrollment" | "no_section" = "no_enrollment"

  async function loadProgram(program: string | null) {
    if (!program || programs.has(program)) return
    const row = result<Named>(await db.from("programs").select("id,name").eq("id", program)
      .eq("institution_id", institution).eq("organization_id", organization).maybeSingle())
    if (!row) scopeDenied()
    programs.set(program, row)
  }

  async function loadSection(section: string | null, program: string | null) {
    if (!section) return
    if (!sections.has(section)) {
      let query = db.from("sections").select("id,name,program_id,semester").eq("id", section)
        .eq("institution_id", institution)
      if (program) query = query.eq("program_id", program)
      const row = result<Section>(await query.maybeSingle())
      if (!row) scopeDenied()
      await loadProgram(row.program_id)
      sections.set(section, row)
    }
    if (program && sections.get(section)?.program_id !== program) scopeDenied()
  }

  if (student) {
    // An existence probe across this student's own formal records suppresses
    // fallback even when the eligible scoped enrollment query returns nothing.
    const anyEnrollment = result<{ id: string }[]>(await db.from("enrolments")
      .select("id").eq("student_id", id).limit(1))
    if (!Array.isArray(anyEnrollment)) throw new Error("Invalid enrollment result")

    if (anyEnrollment.length > 0) {
      const enrollments = await allPages<{ id: string; program_id: string; section_id: string | null }>(after => {
        const query = db.from("enrolments").select("id,program_id,section_id")
          .eq("student_id", id).eq("institution_id", institution)
          .in("status", ["ENROLLED", "ACTIVE"]).lte("started_at", earliest)
          .or(`ended_at.is.null,ended_at.gte.${latest}`)
          .order("id").limit(PAGE_SIZE)
        return after ? query.gt("id", after) : query
      })
      for (const enrollment of enrollments) {
        const units = await allPages<{ id: string; subject_id: string; trainer_id: string | null }>(after => {
          const query = db.from("enrolment_units").select("id,subject_id,trainer_id")
            .eq("enrolment_id", enrollment.id).eq("status", "ACTIVE")
            .lte("planned_start", earliest).gte("planned_end", latest).order("id").limit(PAGE_SIZE)
          return after ? query.gt("id", after) : query
        })
        if (!units.length) continue
        await loadProgram(enrollment.program_id)
        await loadSection(enrollment.section_id, enrollment.program_id)
        for (const unit of units) {
          relationships.push({
            subject_id: unit.subject_id, section_id: enrollment.section_id,
            program_id: enrollment.program_id, trainer_id: unit.trainer_id,
          })
        }
      }
      if (relationships.length) status = sections.size ? "ready" : "no_section"
    } else if (student.section_id) {
      await loadProgram(student.program_id)
      await loadSection(student.section_id, student.program_id)
      const section = sections.get(student.section_id)!
      type SlotLink = { id: string; subject_id: string; faculty_id: string | null }
      const scopeSlots = (weekIds?: string[]) => allPages<SlotLink>(after => {
        let query = db.from("timetable_slots").select("id,subject_id,faculty_id")
          .eq("institution_id", institution).eq("organization_id", organization)
          .eq("section_id", section.id).eq("semester", section.semester)
          .not("subject_id", "is", null).order("id").limit(PAGE_SIZE)
        query = weekIds ? query.in("week_id", weekIds) : query.is("week_id", null)
        return after ? query.gt("id", after) : query
      })
      const [links, slots, weeks] = await Promise.all([
        allPages<{ id: string; subject_id: string; faculty_id: string }>(after => {
          const query = db.from("faculty_subjects").select("id,subject_id,faculty_id")
            .eq("institution_id", institution).eq("section_id", section.id)
            .order("id").limit(PAGE_SIZE)
          return after ? query.gt("id", after) : query
        }),
        scopeSlots(),
        multiweek ? allPages<{ id: string }>(after => {
          const query = db.from("timetable_weeks").select("id").eq("institution_id", institution)
            .eq("section_id", section.id).eq("semester", section.semester).order("id").limit(PAGE_SIZE)
          return after ? query.gt("id", after) : query
        }) : Promise.resolve([]),
      ])
      for (const group of batches(weeks.map(week => week.id))) slots.push(...await scopeSlots(group))
      for (const link of [...links, ...slots]) {
        relationships.push({
          subject_id: link.subject_id, section_id: section.id,
          program_id: section.program_id, trainer_id: link.faculty_id,
        })
      }
      status = "ready"
    } else {
      await loadProgram(student.program_id)
      status = student.program_id ? "no_section" : "no_enrollment"
    }
  }

  const summarize = (row: Named | undefined) => row ? { id: row.id, name: row.name } : null
  return {
    institution, organization, studentId: id, clock, now, multiweek, sections, relationships, programs,
    context: {
      status,
      program: programs.size === 1 ? summarize(programs.values().next().value) : null,
      section: sections.size === 1 ? summarize(sections.values().next().value) : null,
    },
  }
}

export type AcademicScope = Awaited<ReturnType<typeof readAcademicScope>>
