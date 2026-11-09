import { supabase } from "@/lib/supabase"
import { TimetableClash, ClashType } from "../types/timetable.types"

type Relation<T> = T | T[] | null
type ClashSlotRow = {
  id: string
  day: string | null
  period: number | null
  subject_id: string | null
  faculty_id: string | null
  section_id: string | null
  room?: string | null
  delivery_mode?: string | null
  week_id: string | null
  faculty: Relation<{ id: string; name: string | null; email?: string | null }>
  sections: Relation<{ id: string; name: string | null; semester?: number | null }>
  subjects: Relation<{ id: string; name: string | null; code: string | null }>
}

function relationOne<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return (value ?? null) as T | null
}

export const clashDetectionService = {
  /**
   * Scan all timetable slots for an entire institution (optionally scoped to a specific week)
   * to detect trainer double-bookings, room overlaps, and concurrent section assignments.
   */
  async scanInstitutionClashes(
    institutionId: string,
    weekId?: string | null
  ): Promise<TimetableClash[]> {
    try {
      let query = supabase
        .from("timetable_slots")
        .select(`
          id,
          day,
          period,
          subject_id,
          faculty_id,
          section_id,
          room,
          delivery_mode,
          week_id,
          faculty:faculty_id(id, name, email),
          sections:section_id(id, name, semester),
          subjects:subject_id(id, name, code)
        `)
        .eq("institution_id", institutionId)

      if (weekId) {
        query = query.or(`week_id.eq.${weekId},week_id.is.null`)
      }

      let rawSlots: ClashSlotRow[] = []
      const { data, error } = await query

      if (error) {
        console.warn("scanInstitutionClashes: retrying with base schema fallback:", error.message)
        let fallbackQuery = supabase
          .from("timetable_slots")
          .select(`
            id,
            day,
            period,
            subject_id,
            faculty_id,
            section_id,
            week_id,
            faculty:faculty_id(id, name, email),
            sections:section_id(id, name, semester),
            subjects:subject_id(id, name, code)
          `)
          .eq("institution_id", institutionId)

        if (weekId) {
          fallbackQuery = fallbackQuery.or(`week_id.eq.${weekId},week_id.is.null`)
        }

        const fallbackResult = await fallbackQuery
        rawSlots = (fallbackResult.data ?? [])
      } else {
        rawSlots = (data ?? [])
      }

      if (!rawSlots || rawSlots.length === 0) {
        return []
      }

      const slots = rawSlots.map((s) => {
        const faculty = relationOne(s.faculty)
        const section = relationOne(s.sections)
        const subject = relationOne(s.subjects)
        return ({
        id: s.id,
        day: s.day ?? "Unknown",
        period: s.period ?? 0,
        subject_id: s.subject_id,
        subject_code: subject?.code ?? "Unit",
        subject_name: subject?.name ?? "Unit",
        faculty_id: s.faculty_id,
        faculty_name: faculty?.name ?? "Unassigned",
        section_id: s.section_id,
        section_name: section?.name ?? `Section (${section?.semester ?? 1})`,
        room: s.room ? String(s.room).trim() : null,
        delivery_mode: s.delivery_mode || "ON_CAMPUS",
        week_id: s.week_id,
      })})

      const toClashSlots = (rows: typeof slots): TimetableClash["conflictingSlots"] => rows.map((slot) => ({
        id: slot.id,
        day: slot.day,
        period: slot.period,
        section_id: slot.section_id ?? undefined,
        section_name: slot.section_name,
        subject_code: slot.subject_code,
        subject_name: slot.subject_name,
        faculty_name: slot.faculty_name,
        room: slot.room,
        week_id: slot.week_id,
      }))

      const clashes: TimetableClash[] = []

      // Group slots by (day, period)
      const slotBuckets = new Map<string, typeof slots>()
      for (const slot of slots) {
        const key = `${slot.day}-${slot.period}`
        if (!slotBuckets.has(key)) {
          slotBuckets.set(key, [])
        }
        slotBuckets.get(key)!.push(slot)
      }

      // Check each time bucket for clashes across ALL sections
      for (const [key, bucket] of slotBuckets.entries()) {
        const [day, periodStr] = key.split("-")
        const period = Number(periodStr)

        // 1. Trainer Double-Booking Check (same trainer in multiple different sections at same time)
        const trainerBuckets = new Map<string, typeof slots>()
        for (const slot of bucket) {
          if (!slot.faculty_id) continue
          if (!trainerBuckets.has(slot.faculty_id)) {
            trainerBuckets.set(slot.faculty_id, [])
          }
          trainerBuckets.get(slot.faculty_id)!.push(slot)
        }

        for (const [facultyId, facultySlots] of trainerBuckets.entries()) {
          if (facultySlots.length > 1) {
            const facultyName = facultySlots[0].faculty_name
            const sectionNames = Array.from(new Set(facultySlots.map((s) => s.section_name))).join(" & ")
            const unitCodes = Array.from(new Set(facultySlots.map((s) => s.subject_code))).join(" & ")

            clashes.push({
              id: `clash-trainer-${facultyId}-${day}-${period}`,
              type: "TRAINER_DOUBLE_BOOKED",
              severity: "CRITICAL",
              title: `Trainer Clash: ${facultyName}`,
              description: `${facultyName} is scheduled concurrently in ${facultySlots.length} different sections (${sectionNames} for ${unitCodes}) on ${day}, Period ${period}.`,
              day,
              period,
              faculty_id: facultyId,
              faculty_name: facultyName,
              conflictingSlots: toClashSlots(facultySlots),
            })
          }
        }

        // 2. Room Overlap Check (same room booked by multiple different sections at same time)
        const roomBuckets = new Map<string, typeof slots>()
        for (const slot of bucket) {
          if (!slot.room || slot.delivery_mode === "ONLINE") continue
          const normalizedRoom = slot.room.toLowerCase()
          if (!roomBuckets.has(normalizedRoom)) {
            roomBuckets.set(normalizedRoom, [])
          }
          roomBuckets.get(normalizedRoom)!.push(slot)
        }

        for (const [roomName, roomSlots] of roomBuckets.entries()) {
          if (roomSlots.length > 1) {
            const displayRoom = roomSlots[0].room || roomName
            const sectionNames = Array.from(new Set(roomSlots.map((s) => s.section_name))).join(" & ")
            const unitCodes = Array.from(new Set(roomSlots.map((s) => s.subject_code))).join(" & ")

            clashes.push({
              id: `clash-room-${roomName}-${day}-${period}`,
              type: "ROOM_OVERLAP",
              severity: "CRITICAL",
              title: `Room Overlap: ${displayRoom}`,
              description: `Room "${displayRoom}" is assigned to multiple sections (${sectionNames} for ${unitCodes}) on ${day}, Period ${period}.`,
              day,
              period,
              room: displayRoom,
              conflictingSlots: toClashSlots(roomSlots),
            })
          }
        }

        // 3. Section Concurrent Class Check (same section assigned multiple units at same time)
        const sectionBuckets = new Map<string, typeof slots>()
        for (const slot of bucket) {
          if (!slot.section_id) continue
          if (!sectionBuckets.has(slot.section_id)) {
            sectionBuckets.set(slot.section_id, [])
          }
          sectionBuckets.get(slot.section_id)!.push(slot)
        }

        for (const [sectionId, sectionSlots] of sectionBuckets.entries()) {
          if (sectionSlots.length > 1) {
            const sectionName = sectionSlots[0].section_name
            const unitCodes = Array.from(new Set(sectionSlots.map((s) => s.subject_code))).join(" & ")

            clashes.push({
              id: `clash-section-${sectionId}-${day}-${period}`,
              type: "SECTION_CONCURRENT",
              severity: "CRITICAL",
              title: `Cohort Clash: ${sectionName}`,
              description: `Class cohort ${sectionName} is scheduled for multiple concurrent subjects (${unitCodes}) on ${day}, Period ${period}.`,
              day,
              period,
              section_id: sectionId,
              section_name: sectionName,
              conflictingSlots: toClashSlots(sectionSlots),
            })
          }
        }
      }

      return clashes
    } catch (err) {
      console.error("Clash detection scan exception:", err)
      return []
    }
  },

  /**
   * Pre-validation check before saving a slot in the builder dialog.
   */
  async checkCandidateSlotClash({
    institutionId,
    sectionId,
    day,
    period,
    facultyId,
    room,
    deliveryMode,
    weekId,
    excludeSlotId,
  }: {
    institutionId: string
    sectionId: string
    day: string
    period: number
    facultyId?: string | null
    room?: string | null
    deliveryMode?: string | null
    weekId?: string | null
    excludeSlotId?: string | null
  }): Promise<{ hasClash: boolean; warnings: string[]; clashes: TimetableClash[] }> {
    const warnings: string[] = []
    const clashes: TimetableClash[] = []

    try {
      let query = supabase
        .from("timetable_slots")
        .select(`
          id,
          day,
          period,
          subject_id,
          faculty_id,
          section_id,
          room,
          delivery_mode,
          week_id,
          faculty:faculty_id(id, name),
          sections:section_id(id, name),
          subjects:subject_id(id, name, code)
        `)
        .eq("institution_id", institutionId)
        .eq("day", day)
        .eq("period", period)

      if (weekId) {
        query = query.or(`week_id.eq.${weekId},week_id.is.null`)
      }

      if (excludeSlotId) {
        query = query.neq("id", excludeSlotId)
      }

      let existingSlots: ClashSlotRow[] = []
      const { data, error } = await query

      if (error) {
        let fallbackQuery = supabase
          .from("timetable_slots")
          .select(`
            id,
            day,
            period,
            subject_id,
            faculty_id,
            section_id,
            week_id,
            faculty:faculty_id(id, name),
            sections:section_id(id, name),
            subjects:subject_id(id, name, code)
          `)
          .eq("institution_id", institutionId)
          .eq("day", day)
          .eq("period", period)

        if (weekId) {
          fallbackQuery = fallbackQuery.or(`week_id.eq.${weekId},week_id.is.null`)
        }

        const fallbackRes = await fallbackQuery
        existingSlots = (fallbackRes.data ?? [])
      } else {
        existingSlots = (data ?? [])
      }

      if (!existingSlots || existingSlots.length === 0) {
        return { hasClash: false, warnings: [], clashes: [] }
      }

      for (const slot of existingSlots) {
        // Skip current slot in current section if it's the same record
        if (slot.section_id === sectionId && (!excludeSlotId || slot.id === excludeSlotId)) {
          continue
        }

        // Trainer conflict check across all sections
        if (facultyId && slot.faculty_id && slot.faculty_id === facultyId) {
          const facultyName = relationOne(slot.faculty)?.name || "This trainer"
          const sectionName = relationOne(slot.sections)?.name
          const secName = sectionName ? `Section ${sectionName}` : "another section"
          const subCode = relationOne(slot.subjects)?.code || "another unit"
          const msg = `⚠️ Trainer Clash: ${facultyName} is already teaching ${subCode} in ${secName} on ${day}, Period ${period}.`
          warnings.push(msg)
          clashes.push({
            id: `candidate-clash-trainer-${slot.id}`,
            type: "TRAINER_DOUBLE_BOOKED",
            severity: "CRITICAL",
            title: `Trainer Clash: ${facultyName}`,
            description: msg,
            day,
            period,
            faculty_id: facultyId,
            faculty_name: facultyName,
            conflictingSlots: [{ id: slot.id, day: slot.day ?? day, period: slot.period ?? period, section_id: slot.section_id ?? undefined, section_name: sectionName ?? undefined, subject_code: subCode, faculty_name: facultyName, room: slot.room ?? null, week_id: slot.week_id }],
          })
        }

        // Room conflict check across all sections
        if (room && room.trim() && deliveryMode !== "ONLINE" && slot.delivery_mode !== "ONLINE" && slot.room) {
          if (String(slot.room).trim().toLowerCase() === room.trim().toLowerCase()) {
            const sectionName = relationOne(slot.sections)?.name
            const secName = sectionName ? `Section ${sectionName}` : "another section"
            const subCode = relationOne(slot.subjects)?.code || "another unit"
            const msg = `⚠️ Room Clash: "${room.trim()}" is already booked for ${subCode} in ${secName} on ${day}, Period ${period}.`
            warnings.push(msg)
            clashes.push({
              id: `candidate-clash-room-${slot.id}`,
              type: "ROOM_OVERLAP",
              severity: "CRITICAL",
              title: `Room Overlap: ${room.trim()}`,
              description: msg,
              day,
              period,
              room: room.trim(),
              conflictingSlots: [{ id: slot.id, day: slot.day ?? day, period: slot.period ?? period, section_id: slot.section_id ?? undefined, section_name: sectionName ?? undefined, subject_code: subCode, room: slot.room ?? null, week_id: slot.week_id }],
            })
          }
        }
      }

      return {
        hasClash: warnings.length > 0,
        warnings,
        clashes,
      }
    } catch (err) {
      console.error("Candidate slot check error:", err)
      return { hasClash: false, warnings: [], clashes: [] }
    }
  },
}
