"use server"

import { errorMessage as readErrorMessage } from "@/lib/error-message"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase-server"

interface CreateMeetingInput {
  title: string
  subject_id: string
  section_id: string
  faculty_id: string
  institution_id: string
  meeting_type: "instant" | "scheduled"
  scheduled_start?: string | null
  scheduled_end?: string | null
}

// Helper to generate readable random meeting codes (e.g. cse-sec-a-x7y8z)
function generateMeetingCode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let segment = ""
  for (let i = 0; i < 6; i++) {
    segment += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `meet-${segment}`
}

export async function createMeetingAction(input: CreateMeetingInput) {
  try {
    const supabase = await createSupabaseServerClient()
    const meetingCode = generateMeetingCode()

    const { data, error } = await supabase
      .from("meetings")
      .insert({
        institution_id: input.institution_id,
        subject_id: input.subject_id,
        section_id: input.section_id,
        faculty_id: input.faculty_id,
        meeting_code: meetingCode,
        title: input.title,
        meeting_provider: "daily", // custom room default
        meeting_type: input.meeting_type,
        is_active: input.meeting_type === "instant", // active immediately if instant
        scheduled_start: input.scheduled_start || null,
        scheduled_end: input.scheduled_end || null,
        started_at: input.meeting_type === "instant" ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/dashboard/faculty/subjects/${input.subject_id}`)
    revalidatePath(`/dashboard/student/subjects/${input.subject_id}`)
    
    return { success: true, meeting: data }
  } catch (error: unknown) {
    console.error("Error creating meeting:", error)
    return { success: false, error: readErrorMessage(error) }
  }
}

export async function endMeetingAction(meetingId: string, subjectId: string) {
  try {
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from("meetings")
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
      })
      .eq("id", meetingId)
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/dashboard/faculty/subjects/${subjectId}`)
    revalidatePath(`/dashboard/student/subjects/${subjectId}`)

    return { success: true, meeting: data }
  } catch (error: unknown) {
    console.error("Error ending meeting:", error)
    return { success: false, error: readErrorMessage(error) }
  }
}

export async function getMeetingByCodeAction(meetingCode: string) {
  try {
    const supabase = await createSupabaseServerClient()

    // Fetch active meeting details along with subject name & section name
    const { data: meeting, error } = await supabase
      .from("meetings")
      .select(`
        *,
        subject:subjects(name, code),
        section:sections(name)
      `)
      .eq("meeting_code", meetingCode)
      .eq("is_active", true)
      .maybeSingle()

    if (error) throw error
    return { success: true, meeting }
  } catch (error: unknown) {
    console.error("Error fetching meeting:", error)
    return { success: false, error: readErrorMessage(error) }
  }
}

export async function getActiveMeetingsAction(subjectId: string, sectionId: string) {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: meetings, error } = await supabase
      .from("meetings")
      .select(`
        *,
        faculty:users!meetings_faculty_id_fkey(name)
      `)
      .eq("subject_id", subjectId)
      .eq("section_id", sectionId)
      .eq("is_active", true)

    if (error) throw error
    return { success: true, meetings: meetings || [] }
  } catch (error: unknown) {
    console.error("Error fetching active meetings:", error)
    return { success: false, error: readErrorMessage(error), meetings: [] }
  }
}

export async function postMeetingMessageAction(
  meetingId: string,
  institutionId: string,
  senderId: string,
  senderName: string,
  message: string
) {
  try {
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from("meeting_messages")
      .insert({
        meeting_id: meetingId,
        institution_id: institutionId,
        sender_id: senderId,
        sender_name: senderName,
        message: message,
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, message: data }
  } catch (error: unknown) {
    console.error("Error posting meeting message:", error)
    return { success: false, error: readErrorMessage(error) }
  }
}

export async function getMeetingMessagesAction(meetingId: string) {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: messages, error } = await supabase
      .from("meeting_messages")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: true })

    if (error) throw error
    return { success: true, messages: messages || [] }
  } catch (error: unknown) {
    console.error("Error fetching meeting messages:", error)
    return { success: false, error: readErrorMessage(error), messages: [] }
  }
}

export async function recordJoinMeetingAction(meetingId: string, userId: string) {
  try {
    const supabase = await createSupabaseServerClient()

    // Upsert participant record to register attendance join timestamps
    const { data, error } = await supabase
      .from("meeting_participants")
      .upsert({
        meeting_id: meetingId,
        user_id: userId,
        joined_at: new Date().toISOString(),
        left_at: null,
        is_present: true,
      }, {
        onConflict: "meeting_id,user_id"
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, participant: data }
  } catch (error: unknown) {
    console.error("Error recording join:", error)
    return { success: false, error: readErrorMessage(error) }
  }
}

export async function recordLeaveMeetingAction(meetingId: string, userId: string) {
  try {
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from("meeting_participants")
      .update({
        left_at: new Date().toISOString(),
        is_present: false,
      })
      .eq("meeting_id", meetingId)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) throw error
    return { success: true, participant: data }
  } catch (error: unknown) {
    console.error("Error recording leave:", error)
    return { success: false, error: readErrorMessage(error) }
  }
}

export async function getMeetingAnalyticsAction(meetingId: string) {
  try {
    const supabase = await createSupabaseServerClient()

    // Fetch participant logs alongside user details
    const { data: logs, error } = await supabase
      .from("meeting_participants")
      .select(`
        *,
        user:users!meeting_participants_user_id_fkey(name, email, role)
      `)
      .eq("meeting_id", meetingId)

    if (error) throw error
    return { success: true, logs: logs || [] }
  } catch (error: unknown) {
    console.error("Error fetching meeting analytics:", error)
    return { success: false, error: readErrorMessage(error), logs: [] }
  }
}
