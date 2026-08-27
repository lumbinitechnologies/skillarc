"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { Subject, Faculty, Slot, TimetableWeek } from "../types/timetable.types"
import { timetableService } from "../services/timetableService"

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
  weeks: TimetableWeek[]
  selectedWeek: TimetableWeek | null
  setSelectedWeek: (week: TimetableWeek | null) => void
  reloadWeeks: () => Promise<void>
  reloadSlots: () => Promise<void>
  assignSubject: (
    day: string,
    period: string,
    subject: Subject | undefined,
    facultyId?: string | null,
    facultyName?: string | null
  ) => void
  clearSlot: (day: string, period: string) => Promise<void>
}

interface TimetableProviderProps {
  children: React.ReactNode
  semester?: string | null
  sectionId?: string | null
}

const TimetableContext = createContext<TimetableContextType | null>(null)

export function TimetableProvider({
  children,
  semester,
  sectionId,
}: TimetableProviderProps) {
  const [loading, setLoading] = useState(true)
  const [multiWeekEnabled, setMultiWeekEnabled] = useState(false)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [weeks, setWeeks] = useState<TimetableWeek[]>([])
  const [selectedWeek, setSelectedWeek] = useState<TimetableWeek | null>(null)

  const [periods, setPeriods] = useState<Array<{ id: string; label: string; time: string }>>([
    { id: "P1", label: "Period 1", time: "8:45 – 9:45" },
    { id: "P2", label: "Period 2", time: "9:45 – 10:45" },
    { id: "P3", label: "Period 3", time: "11:00 – 12:00" },
    { id: "P4", label: "Period 4", time: "12:00 – 1:00" },
    { id: "P5", label: "Period 5", time: "2:00 – 3:00" },
  ])

  // Fetch organization features on mount
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

  // Load weeks when section or semester changes
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
        // Refresh selectedWeek with latest updated week from fetched list
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

  // Load initial timetable data
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
          return
        }

        const id = await timetableService.getCurrentInstitutionId()
        setInstitutionId(id)

        const programId = new URLSearchParams(window.location.search).get("program")

        const [subjectsData, facultyData, settingsRes, weeksData] = await Promise.all([
          timetableService.getSubjects(id, Number(semester), programId),
          timetableService.getFaculty(id, programId),
          fetch("/api/timetable/settings").then((r) => (r.ok ? r.json() : null)).catch(() => null),
          timetableService.getWeeks(id, sectionId, Number(semester)),
        ])

        setSubjects(subjectsData)
        setFaculty(facultyData)
        setWeeks(weeksData)

        let initialWeek: TimetableWeek | null = null
        if (weeksData.length > 0) {
          // Auto-select week matching today's date, or week 1
          const today = new Date().toISOString().split("T")[0]
          const currentWeek = weeksData.find((w) => w.start_date <= today && today <= w.end_date)
          initialWeek = currentWeek || weeksData[0]
          setSelectedWeek(initialWeek)
        } else {
          setSelectedWeek(null)
        }

        if (settingsRes && settingsRes.period_timings && settingsRes.period_timings.length > 0) {
          setPeriods(settingsRes.period_timings)
        }

        // Fetch slots for initial week or static timetable
        const targetWeekId = multiWeekEnabled && initialWeek ? initialWeek.id : null
        const slotsData = await timetableService.getSlots(id, sectionId, Number(semester), targetWeekId)
        setSlots(slotsData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [semester, sectionId, multiWeekEnabled])

  // Reload slots when selectedWeek changes (for multi-week mode)
  useEffect(() => {
    async function loadWeekSlots() {
      if (!institutionId || !sectionId || !semester) return
      if (!multiWeekEnabled) return

      try {
        const targetWeekId = selectedWeek ? selectedWeek.id : null
        const slotsData = await timetableService.getSlots(
          institutionId,
          sectionId,
          Number(semester),
          targetWeekId
        )
        setSlots(slotsData)
      } catch (err) {
        console.error("Failed to load slots for selected week:", err)
      }
    }

    loadWeekSlots()
  }, [selectedWeek, institutionId, sectionId, semester, multiWeekEnabled])

  const reloadSlots = useCallback(async () => {
    if (!institutionId || !sectionId || !semester) return
    const targetWeekId = multiWeekEnabled && selectedWeek ? selectedWeek.id : null
    const slotsData = await timetableService.getSlots(
      institutionId,
      sectionId,
      Number(semester),
      targetWeekId
    )
    setSlots(slotsData)
  }, [institutionId, sectionId, semester, multiWeekEnabled, selectedWeek])

  function assignSubject(
    day: string,
    period: string,
    subject: Subject | undefined,
    facultyId?: string | null,
    facultyName?: string | null
  ) {
    setSlots((prev) => {
      const nextSlots = prev.filter((s) => !(s.day === day && s.period === period))

      if (!subject) return nextSlots

      return [
        ...nextSlots,
        {
          day,
          period,
          faculty_id: facultyId ?? null,
          faculty_name: facultyName ?? subject.faculty_name ?? null,
          week_id: multiWeekEnabled && selectedWeek ? selectedWeek.id : null,
          subject: {
            ...subject,
            faculty_id: facultyId ?? undefined,
            faculty_name: facultyName ?? subject.faculty_name ?? undefined,
          },
        },
      ]
    })
  }

  async function clearSlot(day: string, period: string) {
    assignSubject(day, period, undefined)

    if (!institutionId || !sectionId || !semester) return

    await timetableService.deleteSlot({
      institutionId,
      sectionId,
      semester: Number(semester),
      day,
      period: Number(period.replace("P", "")),
      weekId: multiWeekEnabled && selectedWeek ? selectedWeek.id : null,
    })
  }

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
        weeks,
        selectedWeek,
        setSelectedWeek,
        reloadWeeks,
        reloadSlots,
        assignSubject,
        clearSlot,
      }}
    >
      {children}
    </TimetableContext.Provider>
  )
}

export function useTimetable() {
  const ctx = useContext(TimetableContext)
  if (!ctx) throw new Error("useTimetable must be used inside TimetableProvider")
  return ctx
}