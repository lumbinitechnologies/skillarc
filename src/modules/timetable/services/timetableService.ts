import { supabase } from "@/lib/supabase"
import { TimetableWeek, Slot, AcademicEvent, Subject } from "../types/timetable.types"

export const timetableService = {
  async getCurrentInstitutionId(): Promise<string> {
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
      .maybeSingle()

    if (!error && profile?.institution_id) {
      return profile.institution_id
    }

    // Fallback: Check if user is associated with a student record or staff record
    const { data: student } = await supabase
      .from("students")
      .select("institution_id")
      .eq("id", user.id)
      .maybeSingle()

    if (student?.institution_id) {
      return student.institution_id
    }

    // Fallback for Super Admin / Demo: fetch the first institution
    const { data: inst } = await supabase
      .from("institutions")
      .select("id")
      .limit(1)
      .maybeSingle()

    if (inst?.id) {
      return inst.id
    }

    throw new Error("No institution found for current user")
  },

  async getSubjects(institutionId: string, semester?: number, programId?: string | null) {
    try {
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

      if (error) {
        console.warn("Failed to get subjects:", error.message)
        return []
      }

      return data ?? []
    } catch (err) {
      console.error("getSubjects error:", err)
      return []
    }
  },

  async getFaculty(institutionId: string, programId?: string | null) {
    try {
      const { data: subjectData, error: subjectError } = await supabase
        .from("subjects")
        .select("id")
        .eq("institution_id", institutionId)

      if (subjectError) {
        console.warn("Failed to fetch subject IDs for faculty:", subjectError.message)
        return []
      }

      const subjectIds = (subjectData ?? []).map((subject) => subject.id)

      if (subjectIds.length === 0) {
        // Fallback: fetch users with faculty role in this institution
        const { data: facultyUsers } = await supabase
          .from("users")
          .select("id, name, email, role")
          .eq("institution_id", institutionId)
          .in("role", ["FACULTY", "faculty", "TEACHER", "teacher"])

        return (facultyUsers ?? []) as any[]
      }

      const { data, error } = await supabase
        .from("faculty_subjects")
        .select("faculty:faculty_id(id, name, email, role)")
        .in("subject_id", subjectIds)

      if (error) {
        console.warn("Failed to fetch faculty_subjects:", error.message)
        const { data: facultyUsers } = await supabase
          .from("users")
          .select("id, name, email, role")
          .eq("institution_id", institutionId)
          .in("role", ["FACULTY", "faculty", "TEACHER", "teacher"])

        return (facultyUsers ?? []) as any[]
      }

      const seen = new Set<string>()

      const results = (data ?? [])
        .map((row: any) => row.faculty)
        .filter(Boolean)
        .filter((faculty: any) => {
          if (seen.has(faculty.id)) return false
          seen.add(faculty.id)
          return true
        })

      if (results.length === 0) {
        const { data: facultyUsers } = await supabase
          .from("users")
          .select("id, name, email, role")
          .eq("institution_id", institutionId)
          .in("role", ["FACULTY", "faculty", "TEACHER", "teacher"])

        return (facultyUsers ?? []) as any[]
      }

      return results
    } catch (err) {
      console.error("getFaculty error:", err)
      return []
    }
  },

  // ─── Weeks Management ───────────────────────────────────────────────────────
  async getWeeks(institutionId: string, sectionId: string, semester: number): Promise<TimetableWeek[]> {
    try {
      const { data, error } = await supabase
        .from("timetable_weeks")
        .select("*")
        .eq("institution_id", institutionId)
        .eq("section_id", sectionId)
        .eq("semester", semester)
        .order("week_number", { ascending: true })

      if (error) {
        console.warn("Failed to fetch timetable weeks:", error.message)
        return []
      }

      return (data ?? []) as TimetableWeek[]
    } catch (err) {
      console.error("getWeeks error:", err)
      return []
    }
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
    let sourceQuery = supabase
      .from("timetable_slots")
      .select("*")
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

    await supabase
      .from("timetable_slots")
      .delete()
      .eq("institution_id", institutionId)
      .eq("section_id", sectionId)
      .eq("semester", semester)
      .eq("week_id", targetWeekId)

    if (!sourceSlots || sourceSlots.length === 0) return []

    const newSlots = sourceSlots.map((s: any) => ({
      institution_id: institutionId,
      section_id: sectionId,
      semester,
      day: s.day,
      period: s.period,
      subject_id: s.subject_id,
      faculty_id: s.faculty_id,
      room: s.room ?? null,
      delivery_mode: s.delivery_mode ?? "ON_CAMPUS",
      meeting_link: s.meeting_link ?? null,
      notes: s.notes ?? null,
      week_id: targetWeekId,
    }))

    const { data: inserted, error: insertErr } = await supabase
      .from("timetable_slots")
      .insert(newSlots)
      .select()

    if (insertErr) throw insertErr
    return inserted
  },

  // ─── Slots Management (With Fallback) ───────────────────────────────────────
  async getSlots(institutionId: string, sectionId: string, semester: number, weekId?: string | null): Promise<Slot[]> {
    try {
      let query = supabase
        .from("timetable_slots")
        .select(`
          id,
          day,
          period,
          subject_id,
          faculty_id,
          week_id,
          room,
          delivery_mode,
          meeting_link,
          notes,
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
        query = query.is("week_id", null)
      }

      const { data, error } = await query

      if (error) {
        // Fallback for when room / delivery_mode columns are not yet in DB schema
        console.warn("getSlots: retrying with base schema fallback:", error.message)
        let fallbackQuery = supabase
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
          fallbackQuery = fallbackQuery.eq("week_id", weekId)
        } else {
          fallbackQuery = fallbackQuery.is("week_id", null)
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery
        if (fallbackError) {
          console.error("getSlots fallback failed:", fallbackError.message)
          return []
        }

        return (fallbackData ?? []).map((s: any) => ({
          id: s.id,
          day: s.day,
          period: `P${s.period}`,
          faculty_id: s.faculty_id ?? null,
          faculty_name: s.faculty?.name ?? null,
          week_id: s.week_id ?? null,
          room: null,
          delivery_mode: "ON_CAMPUS",
          meeting_link: null,
          notes: null,
          subject: s.subjects
            ? {
                ...s.subjects,
                faculty_name: s.faculty?.name ?? null,
              }
            : undefined,
        }))
      }

      return (data ?? []).map((s: any) => ({
        id: s.id,
        day: s.day,
        period: `P${s.period}`,
        faculty_id: s.faculty_id ?? null,
        faculty_name: s.faculty?.name ?? null,
        week_id: s.week_id ?? null,
        room: s.room ?? null,
        delivery_mode: s.delivery_mode ?? "ON_CAMPUS",
        meeting_link: s.meeting_link ?? null,
        notes: s.notes ?? null,
        subject: s.subjects
          ? {
              ...s.subjects,
              faculty_name: s.faculty?.name ?? null,
            }
          : undefined,
      }))
    } catch (err) {
      console.error("getSlots exception:", err)
      return []
    }
  },

  async saveSlot({
    institutionId,
    sectionId,
    semester,
    day,
    period,
    subjectId,
    facultyId,
    room,
    deliveryMode,
    meetingLink,
    notes,
    weekId,
  }: {
    institutionId: string
    sectionId: string
    semester: number
    day: string
    period: number
    subjectId: string
    facultyId?: string | null
    room?: string | null
    deliveryMode?: string | null
    meetingLink?: string | null
    notes?: string | null
    weekId?: string | null
  }) {
    // 1. Prepare payloads
    const fullPayload: Record<string, any> = {
      institution_id: institutionId,
      section_id: sectionId,
      semester,
      day,
      period,
      subject_id: subjectId,
      faculty_id: facultyId ? facultyId : null,
    }

    if (weekId) fullPayload.week_id = weekId
    if (room && room.trim()) fullPayload.room = room.trim()
    if (deliveryMode) fullPayload.delivery_mode = deliveryMode
    if (meetingLink && meetingLink.trim()) fullPayload.meeting_link = meetingLink.trim()
    if (notes && notes.trim()) fullPayload.notes = notes.trim()

    const tier2Payload: Record<string, any> = {
      institution_id: institutionId,
      section_id: sectionId,
      semester,
      day,
      period,
      subject_id: subjectId,
      faculty_id: facultyId ? facultyId : null,
    }
    if (weekId) tier2Payload.week_id = weekId

    const tier3Payload = {
      institution_id: institutionId,
      section_id: sectionId,
      semester,
      day,
      period,
      subject_id: subjectId,
      faculty_id: facultyId ? facultyId : null,
    }

    // 2. Check if a slot already exists in this logical cell
    let existingSlotId: string | null = null
    try {
      let checkQuery = supabase
        .from("timetable_slots")
        .select("id")
        .eq("institution_id", institutionId)
        .eq("section_id", sectionId)
        .eq("semester", semester)
        .eq("day", day)
        .eq("period", period)

      if (weekId) {
        const { data: weekSlot } = await checkQuery.eq("week_id", weekId).limit(1).maybeSingle()
        if (weekSlot?.id) {
          existingSlotId = weekSlot.id
        }
      }

      if (!existingSlotId) {
        const { data: cellSlot } = await supabase
          .from("timetable_slots")
          .select("id")
          .eq("institution_id", institutionId)
          .eq("section_id", sectionId)
          .eq("semester", semester)
          .eq("day", day)
          .eq("period", period)
          .limit(1)
          .maybeSingle()

        if (cellSlot?.id) {
          existingSlotId = cellSlot.id
        }
      }
    } catch (lookupErr) {
      console.warn("Slot lookup before save warning:", lookupErr)
    }

    // 3. If slot exists, UPDATE in place (avoids unique constraint violation)
    if (existingSlotId) {
      // Try Tier 1 update
      const { data: updated1, error: updateErr1 } = await supabase
        .from("timetable_slots")
        .update(fullPayload)
        .eq("id", existingSlotId)
        .select()
        .maybeSingle()

      if (!updateErr1 && updated1) {
        return updated1
      }

      // Try Tier 2 update
      const { data: updated2, error: updateErr2 } = await supabase
        .from("timetable_slots")
        .update(tier2Payload)
        .eq("id", existingSlotId)
        .select()
        .maybeSingle()

      if (!updateErr2 && updated2) {
        return updated2
      }

      // Try Tier 3 update
      const { data: updated3, error: updateErr3 } = await supabase
        .from("timetable_slots")
        .update(tier3Payload)
        .eq("id", existingSlotId)
        .select()
        .maybeSingle()

      if (!updateErr3 && updated3) {
        return updated3
      }

      if (updateErr3) {
        const detail = updateErr3.message || updateErr3.details || JSON.stringify(updateErr3)
        throw new Error(`Failed to update timetable slot: ${detail}`)
      }
    }

    // 4. If no slot exists, INSERT (with tier fallback)
    let { data: inserted1, error: insertError1 } = await supabase
      .from("timetable_slots")
      .insert(fullPayload)
      .select()
      .maybeSingle()

    if (!insertError1 && inserted1) {
      return inserted1
    }

    if (insertError1) {
      // If unique constraint error on insert, try finding the row that was just created and update it
      if (insertError1.code === "23505" || insertError1.message?.includes("unique")) {
        const { data: conflictRow } = await supabase
          .from("timetable_slots")
          .select("id")
          .eq("institution_id", institutionId)
          .eq("section_id", sectionId)
          .eq("semester", semester)
          .eq("day", day)
          .eq("period", period)
          .limit(1)
          .maybeSingle()

        if (conflictRow?.id) {
          const { data: updatedConflict } = await supabase
            .from("timetable_slots")
            .update(fullPayload)
            .eq("id", conflictRow.id)
            .select()
            .maybeSingle()

          if (updatedConflict) return updatedConflict
        }
      }

      console.warn("saveSlot: Insert Tier 1 failed, trying Tier 2:", insertError1.message)

      // Tier 2: Base schema with week_id
      let { data: inserted2, error: insertError2 } = await supabase
        .from("timetable_slots")
        .insert(tier2Payload)
        .select()
        .maybeSingle()

      if (!insertError2 && inserted2) {
        return inserted2
      }

      if (insertError2) {
        console.warn("saveSlot: Insert Tier 2 failed, trying Tier 3:", insertError2.message)

        // Tier 3: Absolute minimal schema
        const { data: inserted3, error: insertError3 } = await supabase
          .from("timetable_slots")
          .insert(tier3Payload)
          .select()
          .maybeSingle()

        if (insertError3) {
          const detail = insertError3.message || insertError3.details || JSON.stringify(insertError3)
          throw new Error(`Failed to save slot to database: ${detail}`)
        }
        return inserted3
      }
    }

    return inserted1
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
    try {
      if (weekId) {
        await supabase
          .from("timetable_slots")
          .delete()
          .eq("institution_id", institutionId)
          .eq("section_id", sectionId)
          .eq("semester", semester)
          .eq("day", day)
          .eq("period", period)
          .eq("week_id", weekId)
      } else {
        const { error } = await supabase
          .from("timetable_slots")
          .delete()
          .eq("institution_id", institutionId)
          .eq("section_id", sectionId)
          .eq("semester", semester)
          .eq("day", day)
          .eq("period", period)
          .is("week_id", null)

        if (error) {
          await supabase
            .from("timetable_slots")
            .delete()
            .eq("institution_id", institutionId)
            .eq("section_id", sectionId)
            .eq("semester", semester)
            .eq("day", day)
            .eq("period", period)
        }
      }
    } catch (err) {
      console.warn("deleteSlot warning:", err)
    }
  },

  // ─── Academic Calendar & Public Holidays ────────────────────────────────────
  async getAcademicCalendarEvents(
    institutionId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AcademicEvent[]> {
    try {
      let query = supabase
        .from("academic_calendar_events")
        .select("*")
        .eq("institution_id", institutionId)
        .order("start_date", { ascending: true })

      if (startDate && endDate) {
        query = query
          .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)
      }

      const { data, error } = await query
      if (error) {
        // Table might not exist yet before migration
        return []
      }
      return (data ?? []) as AcademicEvent[]
    } catch {
      return []
    }
  },

  async createAcademicEvent(event: Omit<AcademicEvent, "id" | "created_at">): Promise<AcademicEvent | null> {
    try {
      const { data, error } = await supabase
        .from("academic_calendar_events")
        .insert(event)
        .select()
        .single()

      if (error) throw error
      return data as AcademicEvent
    } catch (err) {
      console.warn("createAcademicEvent error:", err)
      return null
    }
  },

  // ─── Timetable Change Notifications ─────────────────────────────────────────
  async dispatchTimetableChangeNotifications({
    institutionId,
    sectionId,
    subjectCode,
    subjectName,
    day,
    periodLabel,
    room,
    deliveryMode,
    action,
  }: {
    institutionId: string
    sectionId: string
    subjectCode: string
    subjectName: string
    day: string
    periodLabel: string
    room?: string | null
    deliveryMode?: string | null
    action: "ASSIGNED" | "MOVED" | "CANCELLED"
  }) {
    try {
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("section_id", sectionId)

      if (!students || students.length === 0) return

      const title = action === "CANCELLED" 
        ? `📅 Class Cancelled: ${subjectCode}`
        : `📅 Timetable Update: ${subjectCode}`

      const locationStr = deliveryMode === "ONLINE" 
        ? "Online Session" 
        : room ? `Room ${room}` : "On Campus"

      const message = action === "CANCELLED"
        ? `The scheduled session for ${subjectName} (${subjectCode}) on ${day} ${periodLabel} has been cancelled.`
        : `${subjectName} (${subjectCode}) is scheduled for ${day} ${periodLabel} at ${locationStr}.`

      const notifications = students.map((s) => ({
        user_id: s.id,
        title,
        message,
        is_read: false,
      }))

      await supabase.from("notifications").insert(notifications)
    } catch (err) {
      console.warn("Failed to dispatch timetable notifications:", err)
    }
  },
}