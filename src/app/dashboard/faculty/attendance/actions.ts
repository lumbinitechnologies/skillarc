"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

interface SaveAttendancePayload {
  subjectId: string
  sectionId: string
  attendanceDate: string
  period: number
  records: Record<string, string>
  notes?: Record<string, string>
  sessionNotes?: string
}

function formatStatus(status: string) {
  switch (status?.toUpperCase()) {
    case "PRESENT":
      return "Present"
    case "ABSENT":
      return "Absent"
    case "LATE":
      return "Late"
    case "APPROVED_ABSENCE":
    case "APPROVED ABSENCE":
    case "EXCUSED":
      return "Approved Absence"
    default:
      return status ?? ""
  }
}

function normalizeStatus(status: string) {
  switch (status?.toUpperCase()) {
    case "PRESENT":
      return "PRESENT"
    case "ABSENT":
      return "ABSENT"
    case "LATE":
      return "LATE"
    case "APPROVED ABSENCE":
    case "APPROVED_ABSENCE":
    case "EXCUSED":
      return "APPROVED_ABSENCE"
    default:
      return "PRESENT"
  }
}

export async function getExistingAttendanceAction({
  subjectId,
  sectionId,
  attendanceDate,
  period,
}: Omit<SaveAttendancePayload, "records">) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Please sign in again to view attendance." }
  }

  const normalizedPeriod = Number.parseInt(String(period), 10)
  if (Number.isNaN(normalizedPeriod)) {
    return { success: false, error: "Please select a valid period before loading attendance.", exists: false }
  }

  // 1. Look for any existing session for this section, date, and period (cross-faculty check)
  const { data: existingSession, error: sessionLookupError } = await supabase
    .from("attendance_sessions")
    .select("id, faculty_id, subject_id, session_notes")
    .eq("section_id", sectionId)
    .eq("attendance_date", attendanceDate)
    .eq("period", normalizedPeriod)
    .maybeSingle()

  if (sessionLookupError) {
    return { success: false, error: sessionLookupError.message, exists: false }
  }

  if (!existingSession?.id) {
    return { success: true, exists: false, records: {}, notes: {}, sessionNotes: "", isLoggedByOther: false }
  }

  // Fetch faculty and subject info if marked
  const isLoggedByOther = Boolean(existingSession.faculty_id && existingSession.faculty_id !== user.id)
  let loggedByFacultyName = "Another Faculty"
  let loggedByFacultyEmail = ""
  let loggedSubjectName = ""
  let loggedSubjectCode = ""

  if (existingSession.faculty_id) {
    const { data: facultyUser } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", existingSession.faculty_id)
      .maybeSingle()
    if (facultyUser) {
      loggedByFacultyName = facultyUser.name || "Another Faculty"
      loggedByFacultyEmail = facultyUser.email || ""
    }
  }

  if (existingSession.subject_id) {
    const { data: subjectData } = await supabase
      .from("subjects")
      .select("name, code")
      .eq("id", existingSession.subject_id)
      .maybeSingle()
    if (subjectData) {
      loggedSubjectName = subjectData.name || ""
      loggedSubjectCode = subjectData.code || ""
    }
  }

  const { data: existingRecords = [], error: recordsError } = await supabase
    .from("attendance_records")
    .select("student_id, status, notes")
    .eq("session_id", existingSession.id)

  if (recordsError) {
    // Fallback if notes column not present
    const { data: fallbackRecords = [] } = await supabase
      .from("attendance_records")
      .select("student_id, status")
      .eq("session_id", existingSession.id)

    const records = Object.fromEntries(
      (fallbackRecords as Array<{ student_id: string; status: string }>).map((row) => [row.student_id, formatStatus(row.status)])
    )
    return {
      success: true,
      exists: true,
      sessionId: existingSession.id,
      records,
      notes: {},
      sessionNotes: existingSession.session_notes || "",
      isLoggedByOther,
      loggedByFacultyId: existingSession.faculty_id,
      loggedByFacultyName,
      loggedByFacultyEmail,
      loggedSubjectId: existingSession.subject_id,
      loggedSubjectName,
      loggedSubjectCode,
    }
  }

  const records = Object.fromEntries(
    (existingRecords as Array<{ student_id: string; status: string; notes?: string }>).map((row) => [row.student_id, formatStatus(row.status)])
  )

  const notes = Object.fromEntries(
    (existingRecords as Array<{ student_id: string; status: string; notes?: string }>).filter(r => r.notes).map((row) => [row.student_id, row.notes || ""])
  )

  return {
    success: true,
    exists: true,
    sessionId: existingSession.id,
    records,
    notes,
    sessionNotes: existingSession.session_notes || "",
    isLoggedByOther,
    loggedByFacultyId: existingSession.faculty_id,
    loggedByFacultyName,
    loggedByFacultyEmail,
    loggedSubjectId: existingSession.subject_id,
    loggedSubjectName,
    loggedSubjectCode,
  }
}

export async function saveAttendanceAction({
  subjectId,
  sectionId,
  attendanceDate,
  period,
  records,
  notes = {},
  sessionNotes = "",
}: SaveAttendancePayload) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Please sign in again to save attendance." }
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .single()

  const todayIso = new Date().toISOString().slice(0, 10)
  if (attendanceDate > todayIso) {
    return { success: false, error: "Attendance cannot be logged for future dates. Please select today or an earlier date." }
  }

  if (!profile || !["FACULTY", "HOD", "PROGRAM_HEAD", "TEACHER", "SUPER_ADMIN", "INSTITUTION_ADMIN"].includes(profile.role)) {
    return { success: false, error: "Only authorized faculty users can save attendance." }
  }

  const normalizedPeriod = Number.parseInt(String(period), 10)
  if (Number.isNaN(normalizedPeriod)) {
    return { success: false, error: "Please select a valid period before saving." }
  }

  // Look for any existing session for this (section_id, attendance_date, period)
  const { data: existingSession, error: sessionLookupError } = await supabase
    .from("attendance_sessions")
    .select("id, faculty_id, subject_id")
    .eq("section_id", sectionId)
    .eq("attendance_date", attendanceDate)
    .eq("period", normalizedPeriod)
    .maybeSingle()

  if (sessionLookupError) {
    return { success: false, error: sessionLookupError.message }
  }

  let sessionId = existingSession?.id

  if (!sessionId) {
    // Attempt with session_notes
    let insertResult = await supabase
      .from("attendance_sessions")
      .insert({
        subject_id: subjectId,
        faculty_id: user.id,
        section_id: sectionId,
        attendance_date: attendanceDate,
        period: normalizedPeriod,
        session_notes: sessionNotes || null,
      })
      .select("id")
      .single()

    if (insertResult.error) {
      // Fallback without session_notes if column not yet applied
      insertResult = await supabase
        .from("attendance_sessions")
        .insert({
          subject_id: subjectId,
          faculty_id: user.id,
          section_id: sectionId,
          attendance_date: attendanceDate,
          period: normalizedPeriod,
        })
        .select("id")
        .single()
    }

    if (insertResult.error || !insertResult.data?.id) {
      return { success: false, error: insertResult.error?.message ?? "Failed to create attendance session." }
    }

    sessionId = insertResult.data.id
  } else {
    // Update existing session attributes (supports overwriting)
    try {
      await supabase
        .from("attendance_sessions")
        .update({
          faculty_id: user.id,
          subject_id: subjectId,
          session_notes: sessionNotes || null,
        })
        .eq("id", sessionId)
    } catch {
      try {
        await supabase
          .from("attendance_sessions")
          .update({
            faculty_id: user.id,
            subject_id: subjectId,
          })
          .eq("id", sessionId)
      } catch {
        // ignore if fails
      }
    }
  }

  const { error: deleteError } = await supabase
    .from("attendance_records")
    .delete()
    .eq("session_id", sessionId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  // Tier 1: Insert with status and notes
  const fullAttendanceRows = Object.entries(records).map(([studentId, status]) => ({
    session_id: sessionId,
    student_id: studentId,
    status: normalizeStatus(status),
    notes: notes[studentId] || null,
  }))

  const { error: insertError } = await supabase
    .from("attendance_records")
    .insert(fullAttendanceRows)

  if (insertError) {
    // Tier 2 Fallback: Insert without notes column
    const fallbackRows = Object.entries(records).map(([studentId, status]) => ({
      session_id: sessionId,
      student_id: studentId,
      status: normalizeStatus(status),
    }))

    const { error: fallbackErr } = await supabase
      .from("attendance_records")
      .insert(fallbackRows)

    if (fallbackErr) {
      return { success: false, error: fallbackErr.message }
    }
  }

  revalidatePath("/dashboard/faculty/attendance")

  return { success: true }
}

export async function getAdminAttendanceAction({
  subjectId,
  sectionId,
  attendanceDate,
  period,
}: {
  subjectId: string
  sectionId: string
  attendanceDate: string
  period: number
}) {
  const adminClient = createSupabaseAdminClient()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Please sign in again to view attendance." }
  }

  // Verify the user is an institution admin
  const { data: profile } = await adminClient
    .from("users")
    .select("role, institution_id")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "INSTITUTION_ADMIN") {
    return { success: false, error: "Access denied." }
  }

  const normalizedPeriod = Number.parseInt(String(period), 10)
  if (Number.isNaN(normalizedPeriod)) {
    return { success: false, error: "Please select a valid period before loading attendance.", exists: false }
  }

  // Query session regardless of faculty_id
  const { data: existingSession, error: sessionLookupError } = await adminClient
    .from("attendance_sessions")
    .select(`
      id,
      faculty_id,
      session_notes,
      faculty:faculty_id(name)
    `)
    .eq("subject_id", subjectId)
    .eq("section_id", sectionId)
    .eq("attendance_date", attendanceDate)
    .eq("period", normalizedPeriod)
    .maybeSingle()

  if (sessionLookupError) {
    return { success: false, error: sessionLookupError.message, exists: false }
  }

  if (!existingSession?.id) {
    return { success: true, exists: false, records: {}, notes: {}, sessionNotes: "" }
  }

  const { data: existingRecords = [], error: recordsError } = await adminClient
    .from("attendance_records")
    .select("student_id, status, notes")
    .eq("session_id", existingSession.id)

  if (recordsError) {
    // Fallback if notes column not present
    const { data: fallbackRecords = [] } = await adminClient
      .from("attendance_records")
      .select("student_id, status")
      .eq("session_id", existingSession.id)

    const records = Object.fromEntries(
      (fallbackRecords as Array<{ student_id: string; status: string }>).map((row) => [row.student_id, formatStatus(row.status)])
    )
    const facultyName = (existingSession as any).faculty?.name || "Unknown Faculty"
    return { success: true, exists: true, sessionId: existingSession.id, records, notes: {}, sessionNotes: existingSession.session_notes || "", facultyName }
  }

  const records = Object.fromEntries(
    (existingRecords as Array<{ student_id: string; status: string; notes?: string }>).map((row) => [row.student_id, formatStatus(row.status)])
  )

  const notes = Object.fromEntries(
    (existingRecords as Array<{ student_id: string; status: string; notes?: string }>).filter(r => r.notes).map((row) => [row.student_id, row.notes || ""])
  )

  const facultyName = (existingSession as any).faculty?.name || "Unknown Faculty"

  return { success: true, exists: true, sessionId: existingSession.id, records, notes, sessionNotes: existingSession.session_notes || "", facultyName }
}

export async function getAdminAttendanceAnalyticsAction({
  subjectId,
  sectionId,
}: {
  subjectId: string
  sectionId: string
}) {
  const adminClient = createSupabaseAdminClient()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Please sign in again." }
  }

  // 1. Fetch all sessions for this section & subject
  const { data: sessions, error: sessionsErr } = await adminClient
    .from("attendance_sessions")
    .select("id")
    .eq("subject_id", subjectId)
    .eq("section_id", sectionId)

  if (sessionsErr || !sessions) {
    return { success: false, error: sessionsErr?.message || "Failed to fetch sessions" }
  }

  const sessionIds = sessions.map(s => s.id)
  if (sessionIds.length === 0) {
    return {
      success: true,
      totalSessions: 0,
      averageAttendanceRate: 0,
      presentRecordsCount: 0,
      absentRecordsCount: 0,
      lateRecordsCount: 0,
      approvedAbsenceRecordsCount: 0,
    }
  }

  // 2. Fetch all records for these sessions
  const { data: records, error: recordsErr } = await adminClient
    .from("attendance_records")
    .select("status")
    .in("session_id", sessionIds)

  if (recordsErr || !records) {
    return { success: false, error: recordsErr?.message || "Failed to fetch records" }
  }

  const present = records.filter(r => r.status === "PRESENT").length
  const absent = records.filter(r => r.status === "ABSENT").length
  const late = records.filter(r => r.status === "LATE").length
  const approved = records.filter(r => r.status === "APPROVED_ABSENCE" || r.status === "EXCUSED").length
  const total = records.length

  const averageAttendanceRate = total > 0 ? Math.round(((present + late + approved) / total) * 100) : 0

  return {
    success: true,
    totalSessions: sessionIds.length,
    averageAttendanceRate,
    presentRecordsCount: present,
    absentRecordsCount: absent,
    lateRecordsCount: late,
    approvedAbsenceRecordsCount: approved,
  }
}

export async function saveAdminAttendanceAction({
  subjectId,
  sectionId,
  attendanceDate,
  period,
  records,
  notes = {},
  sessionNotes = "",
}: SaveAttendancePayload) {
  const adminClient = createSupabaseAdminClient()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Please sign in again to save attendance." }
  }

  // Verify the user is an institution admin
  const { data: profile } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "INSTITUTION_ADMIN") {
    return { success: false, error: "Access denied." }
  }

  const todayIso = new Date().toISOString().slice(0, 10)
  if (attendanceDate > todayIso) {
    return { success: false, error: "Attendance cannot be logged for future dates. Please select today or an earlier date." }
  }

  const normalizedPeriod = Number.parseInt(String(period), 10)
  if (Number.isNaN(normalizedPeriod)) {
    return { success: false, error: "Please select a valid period before saving." }
  }

  // Query or create session
  const { data: existingSession, error: sessionLookupError } = await adminClient
    .from("attendance_sessions")
    .select("id")
    .eq("subject_id", subjectId)
    .eq("section_id", sectionId)
    .eq("attendance_date", attendanceDate)
    .eq("period", normalizedPeriod)
    .maybeSingle()

  if (sessionLookupError) {
    return { success: false, error: sessionLookupError.message }
  }

  let sessionId = existingSession?.id

  if (!sessionId) {
    let insertResult = await adminClient
      .from("attendance_sessions")
      .insert({
        subject_id: subjectId,
        faculty_id: user.id,
        section_id: sectionId,
        attendance_date: attendanceDate,
        period: normalizedPeriod,
        session_notes: sessionNotes || null,
      })
      .select("id")
      .single()

    if (insertResult.error) {
      insertResult = await adminClient
        .from("attendance_sessions")
        .insert({
          subject_id: subjectId,
          faculty_id: user.id,
          section_id: sectionId,
          attendance_date: attendanceDate,
          period: normalizedPeriod,
        })
        .select("id")
        .single()
    }

    if (insertResult.error || !insertResult.data?.id) {
      return { success: false, error: insertResult.error?.message ?? "Failed to create attendance session." }
    }

    sessionId = insertResult.data.id
  } else if (sessionNotes) {
    try {
      await adminClient
        .from("attendance_sessions")
        .update({ session_notes: sessionNotes })
        .eq("id", sessionId)
    } catch {
      // Ignore if column not present yet
    }
  }

  // Delete previous records for the session
  const { error: deleteError } = await adminClient
    .from("attendance_records")
    .delete()
    .eq("session_id", sessionId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  const fullAttendanceRows = Object.entries(records).map(([studentId, status]) => ({
    session_id: sessionId,
    student_id: studentId,
    status: normalizeStatus(status),
    notes: notes[studentId] || null,
  }))

  const { error: insertError } = await adminClient
    .from("attendance_records")
    .insert(fullAttendanceRows)

  if (insertError) {
    const fallbackRows = Object.entries(records).map(([studentId, status]) => ({
      session_id: sessionId,
      student_id: studentId,
      status: normalizeStatus(status),
    }))

    const { error: fallbackErr } = await adminClient
      .from("attendance_records")
      .insert(fallbackRows)

    if (fallbackErr) {
      return { success: false, error: fallbackErr.message }
    }
  }

  revalidatePath("/dashboard/institution-admin/attendance")

  return { success: true }
}

// ── Cumulative Student Attendance Calculation (For At-Risk < 80% Detection) ──
export async function getStudentCumulativeAttendanceAction({
  sectionId,
  institutionId,
}: {
  sectionId?: string
  institutionId: string
}) {
  const adminClient = createSupabaseAdminClient()

  try {
    let sessionQuery = adminClient
      .from("attendance_sessions")
      .select(`
        id,
        section_id,
        attendance_records (
          student_id,
          status
        )
      `)

    if (sectionId) {
      sessionQuery = sessionQuery.eq("section_id", sectionId)
    }

    const { data: sessions, error } = await sessionQuery
    if (error || !sessions) {
      return { success: false, rates: {} }
    }

    const studentCounts: Record<string, { present: number; late: number; approved: number; absent: number; total: number }> = {}

    for (const session of sessions) {
      const records = (session.attendance_records as Array<{ student_id: string; status: string }>) || []
      for (const rec of records) {
        if (!studentCounts[rec.student_id]) {
          studentCounts[rec.student_id] = { present: 0, late: 0, approved: 0, absent: 0, total: 0 }
        }
        studentCounts[rec.student_id].total += 1
        const s = rec.status?.toUpperCase()
        if (s === "PRESENT") studentCounts[rec.student_id].present += 1
        else if (s === "LATE") studentCounts[rec.student_id].late += 1
        else if (s === "APPROVED_ABSENCE" || s === "EXCUSED") studentCounts[rec.student_id].approved += 1
        else if (s === "ABSENT") studentCounts[rec.student_id].absent += 1
      }
    }

    const rates: Record<string, { rate: number; total: number; missed: number }> = {}
    for (const [studentId, counts] of Object.entries(studentCounts)) {
      const attended = counts.present + counts.late + counts.approved
      const rate = counts.total > 0 ? Math.round((attended / counts.total) * 100) : 100
      rates[studentId] = {
        rate,
        total: counts.total,
        missed: counts.absent,
      }
    }

    return { success: true, rates }
  } catch (err: any) {
    console.error("Failed to compute cumulative attendance:", err)
    return { success: false, rates: {} }
  }
}

// ── Save Attendance Warning Notice Letter ──
export async function saveWarningLetterAction({
  institutionId,
  studentId,
  warningLevel,
  attendancePercentage,
  totalSessions,
  missedSessions,
  interventionDate,
  renderedHtml,
  notes,
}: {
  institutionId: string
  studentId: string
  warningLevel: string
  attendancePercentage: number
  totalSessions: number
  missedSessions: number
  interventionDate: string
  renderedHtml: string
  notes?: string
}) {
  const adminClient = createSupabaseAdminClient()

  try {
    const { data, error } = await adminClient
      .from("attendance_warning_letters")
      .insert({
        institution_id: institutionId,
        student_id: studentId,
        warning_level: warningLevel,
        attendance_percentage: attendancePercentage,
        total_sessions: totalSessions,
        missed_sessions: missedSessions,
        intervention_date: interventionDate || null,
        rendered_letter_html: renderedHtml,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, warning: data }
  } catch (err: any) {
    console.error("Failed to save warning letter:", err)
    return { success: false, error: err.message }
  }
}

export async function getInstitutionAllAttendanceAnalyticsAction(institutionId: string) {
  const adminClient = createSupabaseAdminClient()

  // 1. Fetch all section IDs of the institution
  const { data: sections, error: sectionsErr } = await adminClient
    .from("sections")
    .select("id")
    .eq("institution_id", institutionId)

  if (sectionsErr || !sections) {
    return { success: false, error: sectionsErr?.message || "Failed to fetch sections" }
  }

  const sectionIds = sections.map(s => s.id)
  if (sectionIds.length === 0) {
    return { success: true, stats: [] }
  }

  // 2. Fetch all sessions with their attendance records status
  const { data: sessions, error: sessionsErr } = await adminClient
    .from("attendance_sessions")
    .select(`
      id,
      subject_id,
      section_id,
      attendance_date,
      period,
      attendance_records (
        status
      )
    `)
    .in("section_id", sectionIds)

  if (sessionsErr || !sessions) {
    return { success: false, error: sessionsErr?.message || "Failed to fetch attendance sessions" }
  }

  // 3. Map into aggregated format
  const stats = sessions.map((s: any) => {
    const records = (s.attendance_records as Array<{ status: string }>) || []
    const present = records.filter(r => r.status === "PRESENT").length
    const absent = records.filter(r => r.status === "ABSENT").length
    const late = records.filter(r => r.status === "LATE").length
    const approved = records.filter(r => r.status === "APPROVED_ABSENCE" || r.status === "EXCUSED").length
    const total = records.length
    return {
      session_id: s.id,
      subject_id: s.subject_id,
      section_id: s.section_id,
      attendance_date: s.attendance_date,
      period: s.period,
      present_count: present,
      absent_count: absent,
      late_count: late,
      approved_count: approved,
      total_count: total,
    }
  })

  return { success: true, stats }
}
