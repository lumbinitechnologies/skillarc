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
}

function formatStatus(status: string) {
  switch (status?.toUpperCase()) {
    case "PRESENT":
      return "Present"
    case "ABSENT":
      return "Absent"
    case "LATE":
      return "Late"
    default:
      return status ?? ""
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

  const { data: existingSession, error: sessionLookupError } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("subject_id", subjectId)
    .eq("faculty_id", user.id)
    .eq("section_id", sectionId)
    .eq("attendance_date", attendanceDate)
    .eq("period", normalizedPeriod)
    .maybeSingle()

  if (sessionLookupError) {
    return { success: false, error: sessionLookupError.message, exists: false }
  }

  if (!existingSession?.id) {
    return { success: true, exists: false, records: {} }
  }

  const { data: existingRecords = [], error: recordsError } = await supabase
    .from("attendance_records")
    .select("student_id, status")
    .eq("session_id", existingSession.id)

  if (recordsError) {
    return { success: false, error: recordsError.message, exists: false }
  }

  const records = Object.fromEntries(
    (existingRecords as Array<{ student_id: string; status: string }>).map((row) => [row.student_id, formatStatus(row.status)])
  )

  return { success: true, exists: true, sessionId: existingSession.id, records }
}

export async function saveAttendanceAction({
  subjectId,
  sectionId,
  attendanceDate,
  period,
  records,
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

  if (!profile || profile.role !== "FACULTY") {
    return { success: false, error: "Only faculty users can save attendance." }
  }

  const normalizedPeriod = Number.parseInt(String(period), 10)
  if (Number.isNaN(normalizedPeriod)) {
    return { success: false, error: "Please select a valid period before saving." }
  }

  const { data: existingSession, error: sessionLookupError } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("subject_id", subjectId)
    .eq("faculty_id", user.id)
    .eq("section_id", sectionId)
    .eq("attendance_date", attendanceDate)
    .eq("period", normalizedPeriod)
    .maybeSingle()

  if (sessionLookupError) {
    return { success: false, error: sessionLookupError.message }
  }

  let sessionId = existingSession?.id

  if (!sessionId) {
    const { data: insertedSession, error: insertSessionError } = await supabase
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

    if (insertSessionError || !insertedSession?.id) {
      return { success: false, error: insertSessionError?.message ?? "Failed to create attendance session." }
    }

    sessionId = insertedSession.id
  }

  const { error: deleteError } = await supabase
    .from("attendance_records")
    .delete()
    .eq("session_id", sessionId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  const attendanceRows = Object.entries(records).map(([studentId, status]) => ({
    session_id: sessionId,
    student_id: studentId,
    status: status.toUpperCase(),
  }))

  const { error: insertError } = await supabase
    .from("attendance_records")
    .insert(attendanceRows)

  if (insertError) {
    return { success: false, error: insertError.message }
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

  // Query session regardless of faculty_id!
  const { data: existingSession, error: sessionLookupError } = await adminClient
    .from("attendance_sessions")
    .select(`
      id,
      faculty_id,
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
    return { success: true, exists: false, records: {} }
  }

  const { data: existingRecords = [], error: recordsError } = await adminClient
    .from("attendance_records")
    .select("student_id, status")
    .eq("session_id", existingSession.id)

  if (recordsError) {
    return { success: false, error: recordsError.message, exists: false }
  }

  const records = Object.fromEntries(
    (existingRecords as Array<{ student_id: string; status: string }>).map((row) => [row.student_id, formatStatus(row.status)])
  )

  const facultyName = (existingSession as any).faculty?.name || "Unknown Faculty"

  return { success: true, exists: true, sessionId: existingSession.id, records, facultyName }
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
  const total = records.length

  const averageAttendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0

  return {
    success: true,
    totalSessions: sessionIds.length,
    averageAttendanceRate,
    presentRecordsCount: present,
    absentRecordsCount: absent,
    lateRecordsCount: late,
  }
}

export async function saveAdminAttendanceAction({
  subjectId,
  sectionId,
  attendanceDate,
  period,
  records,
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
    const { data: insertedSession, error: insertSessionError } = await adminClient
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

    if (insertSessionError || !insertedSession?.id) {
      return { success: false, error: insertSessionError?.message ?? "Failed to create attendance session." }
    }

    sessionId = insertedSession.id
  }

  // Delete previous records for the session
  const { error: deleteError } = await adminClient
    .from("attendance_records")
    .delete()
    .eq("session_id", sessionId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  const attendanceRows = Object.entries(records).map(([studentId, status]) => ({
    session_id: sessionId,
    student_id: studentId,
    status: status.toUpperCase(),
  }))

  const { error: insertError } = await adminClient
    .from("attendance_records")
    .insert(attendanceRows)

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  revalidatePath("/dashboard/institution-admin/attendance")

  return { success: true }
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
    const records = s.attendance_records as Array<{ status: string }> || []
    const present = records.filter(r => r.status === "PRESENT").length
    const absent = records.filter(r => r.status === "ABSENT").length
    const late = records.filter(r => r.status === "LATE").length
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
      total_count: total,
    }
  })

  return { success: true, stats }
}
