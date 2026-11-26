"use client"

import { useState } from "react"
import { Subject } from "../types/timetable.types"
import { timetableService } from "../services/timetableService"

interface Props {
  institutionId: string
  semester: number
  sectionId: string

  assignSubject: (
    day: string,
    period: string,
    subject: Subject | undefined
  ) => void
}

export function useTimetableBuilder({
  institutionId,
  semester,
  sectionId,
  assignSubject,
}: Props) {

  const [activeSubject, setActiveSubject] =
    useState<Subject | null>(null)

  async function saveSubject(
    day: string,
    period: string,
    subject: Subject
  ) {

    assignSubject(day, period, subject)

    await timetableService.saveSlot({
      institutionId,
      sectionId,
      semester,
      day,
      period: Number(period.replace("P", "")),
      subjectId: subject.id,
      facultyId: subject.faculty_id ?? null,
    })
  }

  return {
    activeSubject,
    setActiveSubject,
    saveSubject,
  }
}