import { supabase } from "@/lib/supabase"
import { TimetableClash, ClashType } from "../types/timetable.types"

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

      let rawSlots: any[] = []
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
        rawSlots = (fallbackResult.data ?? []) as any[]
      } else {
        rawSlots = (data ?? []) as any[]
      }

      if (!rawSlots || rawSlots.length === 0) {
        return []
      }

      const slots = rawSlots.map((s: any) => ({
        id: s.id,
        day: s.day,
        period: s.period,
        subject_id: s.subject_id,
        subject_code: s.subjects?.code ?? "Unit",
        subject_name: s.subjects?.name ?? "Unit",
        faculty_id: s.faculty_id,
        faculty_name: s.faculty?.name ?? "Unassigned",
        section_id: s.section_id,
        section_name: s.sections?.name ?? `Section (${s.sections?.semester ?? 1})`,
        room: s.room ? String(s.room).trim() : null,
        delivery_mode: s.delivery_mode || "ON_CAMPUS",
        week_id: s.week_id,
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
              conflictingSlots: facultySlots,
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
              conflictingSlots: roomSlots,
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
              conflictingSlots: sectionSlots,
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

      let existingSlots: any[] = []
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
        existingSlots = (fallbackRes.data ?? []) as any[]
      } else {
        existingSlots = (data ?? []) as any[]
      }

      if (!existingSlots || existingSlots.length === 0) {
        return { hasClash: false, warnings: [], clashes: [] }
      }

      for (const slot of existingSlots as any[]) {
        // Skip current slot in current section if it's the same record
        if (slot.section_id === sectionId && (!excludeSlotId || slot.id === excludeSlotId)) {
          continue
        }

        // Trainer conflict check across all sections
        if (facultyId && slot.faculty_id && slot.faculty_id === facultyId) {
          const facultyName = slot.faculty?.name || "This trainer"
          const secName = slot.sections?.name ? `Section ${slot.sections.name}` : "another section"
          const subCode = slot.subjects?.code || "another unit"
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
            conflictingSlots: [slot],
          })
        }

        // Room conflict check across all sections
        if (room && room.trim() && deliveryMode !== "ONLINE" && slot.delivery_mode !== "ONLINE" && slot.room) {
          if (String(slot.room).trim().toLowerCase() === room.trim().toLowerCase()) {
            const secName = slot.sections?.name ? `Section ${slot.sections.name}` : "another section"
            const subCode = slot.subjects?.code || "another unit"
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
              conflictingSlots: [slot],
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
