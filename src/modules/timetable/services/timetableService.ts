import { supabase } from "@/lib/supabase"
import { TimetableWeek, Slot } from "../types/timetable.types"

export const timetableService = {
  async getCurrentInstitutionId() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error("User not authenticated")
    }

    const { data: profile, error } = await supabase
      .from("users")
      .select("institution_id")
      .eq("id", user.id)
      .single()

    if (error) throw error

    return profile.institution_id
  },

  async getSubjects(institutionId: string, semester?: number, programId?: string | null) {
    let query = supabase
      .from("subjects")
      .select(`
        id,
        name,
        code,
        semester,
        institution_id,
        program_id,
        credits,
        subject_type
      `)
      .eq("institution_id", institutionId)

    if (semester) {
      query = query.eq("semester", semester)
    }

    if (programId) {
      query = query.eq("program_id", programId)
    }

    const { data, error } = await query

    if (error) throw error

    return data ?? []
  },

  async getFaculty(institutionId: string, programId?: string | null) {
    const { data: subjectData, error: subjectError } = await supabase
      .from("subjects")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("program_id", programId)

    if (subjectError) throw subjectError

    const subjectIds = (subjectData ?? []).map((subject) => subject.id)

    if (subjectIds.length === 0) return []

    const { data, error } = await supabase
      .from("faculty_subjects")
      .select("faculty:faculty_id(id, name, email, role)")
      .in("subject_id", subjectIds)

    if (error) throw error

    const seen = new Set<string>()

    return (data ?? [])
      .map((row: any) => row.faculty)
      .filter(Boolean)
      .filter((faculty: any) => {
        if (seen.has(faculty.id)) return false
        seen.add(faculty.id)
        return true
      })
  },

  // ─── Weeks Management ───────────────────────────────────────────────────────
  async getWeeks(institutionId: string, sectionId: string, semester: number): Promise<TimetableWeek[]> {
    const { data, error } = await supabase
      .from("timetable_weeks")
      .select("*")
      .eq("institution_id", institutionId)
      .eq("section_id", sectionId)
      .eq("semester", semester)
      .order("week_number", { ascending: true })

    if (error) {
      // Table might not exist or error occurred
      console.warn("Failed to fetch timetable weeks:", error.message)
      return []
    }

    return (data ?? []) as TimetableWeek[]
  },

  async createWeek({
    institutionId,
    sectionId,
    semester,
    weekNumber,
    title,
    startDate,
    endDate,
  }: {
    institutionId: string
    sectionId: string
    semester: number
    weekNumber: number
    title?: string
    startDate: string
    endDate: string
  }): Promise<TimetableWeek> {
    const { data, error } = await supabase
      .from("timetable_weeks")
      .insert({
        institution_id: institutionId,
        section_id: sectionId,
        semester,
        week_number: weekNumber,
        title: title || `Week ${weekNumber}`,
        start_date: startDate,
        end_date: endDate,
      })
      .select()
      .single()

    if (error) throw error
    return data as TimetableWeek
  },

  async updateWeek(
    weekId: string,
    updates: { title?: string; startDate?: string; endDate?: string; weekNumber?: number }
  ) {
    const payload: Record<string, any> = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) payload.title = updates.title
    if (updates.startDate !== undefined) payload.start_date = updates.startDate
    if (updates.endDate !== undefined) payload.end_date = updates.endDate
    if (updates.weekNumber !== undefined) payload.week_number = updates.weekNumber

    const { data, error } = await supabase
      .from("timetable_weeks")
      .update(payload)
      .eq("id", weekId)
      .select()
      .single()

    if (error) throw error
    return data as TimetableWeek
  },

  async deleteWeek(weekId: string) {
    // Cascade deletes slots linked to this week_id
    const { error: slotErr } = await supabase
      .from("timetable_slots")
      .delete()
      .eq("week_id", weekId)
    if (slotErr) console.warn("Failed to delete week slots:", slotErr.message)

    const { error } = await supabase
      .from("timetable_weeks")
      .delete()
      .eq("id", weekId)

    if (error) throw error
  },

  async batchCreateWeeks({
    institutionId,
    sectionId,
    semester,
    count,
    startDate,
  }: {
    institutionId: string
    sectionId: string
    semester: number
    count: number
    startDate: string
  }): Promise<TimetableWeek[]> {
    const start = new Date(startDate)
    const weeksToInsert = []

    for (let i = 1; i <= count; i++) {
      // Calculate start and end date for each week (Mon to Sat = 5 days span)
      const weekStart = new Date(start)
      weekStart.setDate(start.getDate() + (i - 1) * 7)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 5) // Mon to Sat

      weeksToInsert.push({
        institution_id: institutionId,
        section_id: sectionId,
        semester,
        week_number: i,
        title: `Week ${i}`,
        start_date: weekStart.toISOString().split("T")[0],
        end_date: weekEnd.toISOString().split("T")[0],
      })
    }

    const { data, error } = await supabase
      .from("timetable_weeks")
      .insert(weeksToInsert)
      .select()

    if (error) throw error
    return (data ?? []) as TimetableWeek[]
  },

  async copyWeekSchedule({
    institutionId,
    sectionId,
    semester,
    sourceWeekId,
    targetWeekId,
  }: {
    institutionId: string
    sectionId: string
    semester: number
    sourceWeekId: string | null
    targetWeekId: string
  }) {
    // 1. Fetch slots from source week (or default if null)
    let sourceQuery = supabase
      .from("timetable_slots")
      .select("day, period, subject_id, faculty_id")
      .eq("institution_id", institutionId)
      .eq("section_id", sectionId)
      .eq("semester", semester)

    if (sourceWeekId) {
      sourceQuery = sourceQuery.eq("week_id", sourceWeekId)
    } else {
      sourceQuery = sourceQuery.is("week_id", null)
    }

    const { data: sourceSlots, error: fetchErr } = await sourceQuery
    if (fetchErr) throw fetchErr

    // 2. Clear target week existing slots
    await supabase
      .from("timetable_slots")
      .delete()
      .eq("institution_id", institutionId)
      .eq("section_id", sectionId)
      .eq("semester", semester)
      .eq("week_id", targetWeekId)

    if (!sourceSlots || sourceSlots.length === 0) return []

    // 3. Insert new slots into target week
    const newSlots = sourceSlots.map((s: any) => ({
      institution_id: institutionId,
      section_id: sectionId,
      semester,
      day: s.day,
      period: s.period,
      subject_id: s.subject_id,
      faculty_id: s.faculty_id,
      week_id: targetWeekId,
    }))

    const { data: inserted, error: insertErr } = await supabase
      .from("timetable_slots")
      .insert(newSlots)
      .select()

    if (insertErr) throw insertErr
    return inserted
  },

  // ─── Slots Management ───────────────────────────────────────────────────────
  async getSlots(institutionId: string, sectionId: string, semester: number, weekId?: string | null) {
    let query = supabase
      .from("timetable_slots")
      .select(`
        id,
        day,
        period,
        subject_id,
        faculty_id,
        week_id,
        faculty:faculty_id(id, name),
        subjects(
          id,
          name,
          code,
          semester,
          institution_id,
          program_id,
          credits,
          subject_type
        )
      `)
      .eq("institution_id", institutionId)
      .eq("section_id", sectionId)
      .eq("semester", semester)

    if (weekId) {
      query = query.eq("week_id", weekId)
    } else {
      // For standard static timetable (Type 1)
      query = query.is("week_id", null)
    }

    const { data, error } = await query

    if (error) throw error

    return (data ?? []).map((s: any) => ({
      id: s.id,
      day: s.day,
      period: `P${s.period}`,
      faculty_id: s.faculty_id ?? null,
      faculty_name: s.faculty?.name ?? null,
      week_id: s.week_id ?? null,
      subject: {
        ...s.subjects,
        faculty_name: s.faculty?.name ?? null,
      },
    }))
  },

  async saveSlot({
    institutionId,
    sectionId,
    semester,
    day,
    period,
    subjectId,
    facultyId,
    weekId,
  }: {
    institutionId: string
    sectionId: string
    semester: number
    day: string
    period: number
    subjectId: string
    facultyId?: string | null
    weekId?: string | null
  }) {
    // Delete any existing slot in that specific cell for this week (or static timetable)
    let deleteQuery = supabase
      .from("timetable_slots")
      .delete()
      .eq("institution_id", institutionId)
      .eq("section_id", sectionId)
      .eq("semester", semester)
      .eq("day", day)
      .eq("period", period)

    if (weekId) {
      deleteQuery = deleteQuery.eq("week_id", weekId)
    } else {
      deleteQuery = deleteQuery.is("week_id", null)
    }

    await deleteQuery

    // Insert new slot
    const { error: insertError } = await supabase
      .from("timetable_slots")
      .insert({
        institution_id: institutionId,
        section_id: sectionId,
        semester,
        day,
        period,
        subject_id: subjectId,
        faculty_id: facultyId ?? null,
        week_id: weekId ?? null,
      })

    if (insertError) throw insertError
  },

  async deleteSlot({
    institutionId,
    sectionId,
    semester,
    day,
    period,
    weekId,
  }: {
    institutionId: string
    sectionId: string
    semester: number
    day: string
    period: number
    weekId?: string | null
  }) {
    let deleteQuery = supabase
      .from("timetable_slots")
      .delete()
      .eq("institution_id", institutionId)
      .eq("section_id", sectionId)
      .eq("semester", semester)
      .eq("day", day)
      .eq("period", period)

    if (weekId) {
      deleteQuery = deleteQuery.eq("week_id", weekId)
    } else {
      deleteQuery = deleteQuery.is("week_id", null)
    }

    const { error } = await deleteQuery
    if (error) console.error("Failed to delete slot:", error.message)
  },
}