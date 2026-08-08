"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { Subject, Faculty, Slot } from "../types/timetable.types"
import { timetableService } from "../services/timetableService"

interface TimetableContextType {
  loading: boolean
  subjects: Subject[]
  faculty: Faculty[]
  slots: Slot[]
  periods: Array<{ id: string; label: string; time: string }>
  institutionId: string | null
  sectionId: string | null
  semester: string | null
  assignSubject: (
    day: string,
    period: string,
    subject: Subject | undefined,
    facultyId?: string | null,
    facultyName?: string | null
  ) => void
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
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [periods, setPeriods] = useState<Array<{ id: string; label: string; time: string }>>([
    { id: "P1", label: "Period 1", time: "8:45 – 9:45" },
    { id: "P2", label: "Period 2", time: "9:45 – 10:45" },
    { id: "P3", label: "Period 3", time: "11:00 – 12:00" },
    { id: "P4", label: "Period 4", time: "12:00 – 1:00" },
    { id: "P5", label: "Period 5", time: "2:00 – 3:00" },
  ])

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)

        if (!semester || !sectionId) {
          setSubjects([])
          setFaculty([])
          setSlots([])
          return
        }

        const id = await timetableService.getCurrentInstitutionId()
        setInstitutionId(id)

        const programId = new URLSearchParams(window.location.search).get("program")

        const [subjectsData, facultyData, slotsData, settingsRes] = await Promise.all([
          timetableService.getSubjects(id, Number(semester), programId),
          timetableService.getFaculty(id, programId),
          timetableService.getSlots(id, sectionId, Number(semester)),
          fetch("/api/timetable/settings").then(r => r.ok ? r.json() : null).catch(() => null),
        ])

        setSubjects(subjectsData)
        setFaculty(facultyData)
        setSlots(slotsData)

        if (settingsRes && settingsRes.period_timings && settingsRes.period_timings.length > 0) {
          setPeriods(settingsRes.period_timings)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [semester, sectionId])

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
          subject: {
            ...subject,
            faculty_id: facultyId ?? undefined,
            faculty_name: facultyName ?? subject.faculty_name ?? undefined,
          },
        },
      ]
    })
  }

  return (
    <TimetableContext.Provider
      value={{
        loading,
        subjects,
        faculty,
        slots,
        periods,
        institutionId,
        sectionId: sectionId ?? null,
        semester: semester ?? null,
        assignSubject,
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