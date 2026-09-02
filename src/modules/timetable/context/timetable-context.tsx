"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { Subject, Faculty, Slot, TimetableWeek, AcademicEvent, TimetableClash } from "../types/timetable.types"
import { timetableService } from "../services/timetableService"
import { clashDetectionService } from "../services/clashDetectionService"
import { supabase } from "@/lib/supabase"

interface TimetableContextType {
  loading: boolean
  multiWeekEnabled: boolean
  subjects: Subject[]
  faculty: Faculty[]
  slots: Slot[]
  periods: Array<{ id: string; label: string; time: string }>
  institutionId: string | null
  sectionId: string | null
  semester: string | null
  programId: string | null
  weeks: TimetableWeek[]
  selectedWeek: TimetableWeek | null
  academicEvents: AcademicEvent[]
  clashes: TimetableClash[]
  isScanningClashes: boolean
  setSelectedWeek: (week: TimetableWeek | null) => void
  reloadWeeks: () => Promise<void>
  reloadSlots: () => Promise<void>
  scanClashes: () => Promise<void>
  assignSubject: (
    day: string,
    period: string,
    subject: Subject | undefined,
    facultyId?: string | null,
    facultyName?: string | null,
    room?: string | null,
    deliveryMode?: string | null,
    meetingLink?: string | null,
    notes?: string | null
  ) => void
  clearSlot: (day: string, period: string) => Promise<void>
}

interface TimetableProviderProps {
  children: React.ReactNode
  semester?: string | null
  sectionId?: string | null
  programId?: string | null
}

const TimetableContext = createContext<TimetableContextType | null>(null)

export function TimetableProvider({
  children,
  semester,
  sectionId,
  programId,
}: TimetableProviderProps) {
  const [loading, setLoading] = useState(true)
  const [multiWeekEnabled, setMultiWeekEnabled] = useState(false)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [weeks, setWeeks] = useState<TimetableWeek[]>([])
  const [selectedWeek, setSelectedWeek] = useState<TimetableWeek | null>(null)
  const [academicEvents, setAcademicEvents] = useState<AcademicEvent[]>([])
  const [clashes, setClashes] = useState<TimetableClash[]>([])
  const [isScanningClashes, setIsScanningClashes] = useState(false)

  const [periods, setPeriods] = useState<Array<{ id: string; label: string; time: string }>>([
    { id: "P1", label: "Period 1", time: "8:45 – 9:45" },
    { id: "P2", label: "Period 2", time: "9:45 – 10:45" },
    { id: "P3", label: "Period 3", time: "11:00 – 12:00" },
    { id: "P4", label: "Period 4", time: "12:00 – 1:00" },
    { id: "P5", label: "Period 5", time: "2:00 – 3:00" },
  ])

  // Check organization features
  useEffect(() => {
    async function checkFeatures() {
      try {
        const res = await fetch("/api/org-features")
        if (res.ok) {
          const json = await res.json()
          const isEnabled = Boolean(json.features?.includes("multi_week_timetable"))
          setMultiWeekEnabled(isEnabled)
        }
      } catch (err) {
        console.error("Failed to check multi_week_timetable feature:", err)
      }
    }
    checkFeatures()
  }, [])

  // Scan clashes across institution
  const scanClashes = useCallback(async () => {
    if (!institutionId) return
    setIsScanningClashes(true)
    try {
      const detected = await clashDetectionService.scanInstitutionClashes(
        institutionId,
        selectedWeek?.id ?? null
      )
      setClashes(detected)
    } catch (err) {
      console.error("Clash scan error:", err)
    } finally {
      setIsScanningClashes(false)
    }
  }, [institutionId, selectedWeek?.id])

  // Load weeks
  const reloadWeeks = useCallback(async () => {
    if (!institutionId || !sectionId || !semester) return
    try {
      const fetchedWeeks = await timetableService.getWeeks(
        institutionId,
        sectionId,
        Number(semester)
      )
      setWeeks(fetchedWeeks)
      if (fetchedWeeks.length > 0 && !selectedWeek) {
        setSelectedWeek(fetchedWeeks[0])
      } else if (fetchedWeeks.length > 0 && selectedWeek) {
        const updated = fetchedWeeks.find((w) => w.id === selectedWeek.id)
        if (updated) setSelectedWeek(updated)
        else setSelectedWeek(fetchedWeeks[0])
      } else if (fetchedWeeks.length === 0) {
        setSelectedWeek(null)
      }
    } catch (err) {
      console.error("Failed to reload weeks:", err)
    }
  }, [institutionId, sectionId, semester, selectedWeek])

  // Load initial timetable data scoped to selected Program / Department
  useEffect(() => {
    async function load() {
      try {
        setLoading(true)

        if (!semester || !sectionId) {
          setSubjects([])
          setFaculty([])
          setSlots([])
          setWeeks([])
          setSelectedWeek(null)
          setAcademicEvents([])
          setClashes([])
          return
        }

        const id = await timetableService.getCurrentInstitutionId()
        setInstitutionId(id)

        // Resolve target program from query or section
        let targetProgramId = programId || null
        if (!targetProgramId && sectionId) {
          const { data: secData } = await supabase
            .from("sections")
            .select("program_id")
            .eq("id", sectionId)
            .maybeSingle()
          if (secData?.program_id) {
            targetProgramId = secData.program_id
          }
        }

        const [subs, facs, events] = await Promise.all([
          timetableService.getSubjects(id, Number(semester), targetProgramId),
          timetableService.getFaculty(id, targetProgramId),
          timetableService.getAcademicCalendarEvents(id),
        ])

        setSubjects(subs)
        setFaculty(facs)
        setAcademicEvents(events)

        // Load multi-week metadata
        const fetchedWeeks = await timetableService.getWeeks(id, sectionId, Number(semester))
        setWeeks(fetchedWeeks)
        if (fetchedWeeks.length > 0) {
          setSelectedWeek(fetchedWeeks[0])
        }

        // Load slots for initial view
        const initialWeekId = fetchedWeeks.length > 0 ? fetchedWeeks[0].id : null
        const initialSlots = await timetableService.getSlots(id, sectionId, Number(semester), initialWeekId)
        setSlots(initialSlots)

        // Initial clash scan
        const detected = await clashDetectionService.scanInstitutionClashes(id, initialWeekId)
        setClashes(detected)
      } catch (err: any) {
        console.error("Failed to load timetable data:", err?.message || err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [semester, sectionId, programId])

  // Reload slots when selectedWeek changes
  const reloadSlots = useCallback(async () => {
    if (!institutionId || !sectionId || !semester) return
    try {
      setLoading(true)
      const weekId = selectedWeek ? selectedWeek.id : null
      const fetchedSlots = await timetableService.getSlots(
        institutionId,
        sectionId,
        Number(semester),
        weekId
      )
      setSlots(fetchedSlots)
      await scanClashes()
    } catch (err) {
      console.error("Failed to reload slots for week:", err)
    } finally {
      setLoading(false)
    }
  }, [institutionId, sectionId, semester, selectedWeek, scanClashes])

  useEffect(() => {
    if (!loading && institutionId && sectionId && semester) {
      reloadSlots()
    }
  }, [selectedWeek]) // eslint-disable-line react-hooks/exhaustive-deps

  // Assign Subject to Slot
  const assignSubject = useCallback(
    (
      day: string,
      period: string,
      subject: Subject | undefined,
      facultyId?: string | null,
      facultyName?: string | null,
      room?: string | null,
      deliveryMode?: string | null,
      meetingLink?: string | null,
      notes?: string | null
    ) => {
      setSlots((prev) => {
        const remaining = prev.filter((s) => !(s.day === day && s.period === period))
        if (!subject) return remaining

        const newSlot: Slot = {
          day,
          period,
          faculty_id: facultyId ?? null,
          faculty_name: facultyName ?? null,
          room: room ?? null,
          delivery_mode: deliveryMode ?? "ON_CAMPUS",
          meeting_link: meetingLink ?? null,
          notes: notes ?? null,
          week_id: selectedWeek ? selectedWeek.id : null,
          subject: {
            ...subject,
            faculty_name: facultyName ?? null,
          },
        }

        return [...remaining, newSlot]
      })

      // Persist to Supabase
      if (institutionId && sectionId && semester && subject) {
        const periodNum = parseInt(period.replace("P", ""), 10)
        timetableService
          .saveSlot({
            institutionId,
            sectionId,
            semester: Number(semester),
            day,
            period: periodNum,
            subjectId: subject.id,
            facultyId: facultyId || null,
            room: room ?? null,
            deliveryMode: deliveryMode ?? "ON_CAMPUS",
            meetingLink: meetingLink ?? null,
            notes: notes ?? null,
            weekId: selectedWeek ? selectedWeek.id : null,
          })
          .then(() => {
            try {
              timetableService.dispatchTimetableChangeNotifications({
                institutionId,
                sectionId,
                subjectCode: subject.code,
                subjectName: subject.name,
                day,
                periodLabel: period,
                room,
                deliveryMode,
                action: "ASSIGNED",
              })
            } catch (notifyErr) {
              console.warn("Notification dispatch warning:", notifyErr)
            }
            scanClashes()
          })
          .catch((err: any) => {
            const detail = err?.message || err?.details || (typeof err === "object" ? JSON.stringify(err) : String(err))
            console.error("Failed to save slot to database:", detail)
          })
      }
    },
    [institutionId, sectionId, semester, selectedWeek, scanClashes]
  )

  // Clear Slot
  const clearSlot = useCallback(
    async (day: string, period: string) => {
      const removedSlot = slots.find((s) => s.day === day && s.period === period)

      setSlots((prev) => prev.filter((s) => !(s.day === day && s.period === period)))

      if (institutionId && sectionId && semester) {
        const periodNum = parseInt(period.replace("P", ""), 10)
        try {
          await timetableService.deleteSlot({
            institutionId,
            sectionId,
            semester: Number(semester),
            day,
            period: periodNum,
            weekId: selectedWeek ? selectedWeek.id : null,
          })

          if (removedSlot?.subject) {
            timetableService.dispatchTimetableChangeNotifications({
              institutionId,
              sectionId,
              subjectCode: removedSlot.subject.code,
              subjectName: removedSlot.subject.name,
              day,
              periodLabel: period,
              action: "CANCELLED",
            })
          }

          scanClashes()
        } catch (err) {
          console.error("Failed to delete slot from database:", err)
        }
      }
    },
    [institutionId, sectionId, semester, selectedWeek, slots, scanClashes]
  )

  return (
    <TimetableContext.Provider
      value={{
        loading,
        multiWeekEnabled,
        subjects,
        faculty,
        slots,
        periods,
        institutionId,
        sectionId: sectionId ?? null,
        semester: semester ?? null,
        programId: programId ?? null,
        weeks,
        selectedWeek,
        academicEvents,
        clashes,
        isScanningClashes,
        setSelectedWeek,
        reloadWeeks,
        reloadSlots,
        scanClashes,
        assignSubject,
        clearSlot,
      }}
    >
      {children}
    </TimetableContext.Provider>
  )
}

export function useTimetable() {
  const context = useContext(TimetableContext)
  if (!context) {
    throw new Error("useTimetable must be used within a TimetableProvider")
  }
  return context
}