"use server"

import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"

export async function getSubjectAnnouncementsAction(subjectId: string) {
  const supabase = createSupabaseAdminClient()

  const { data: announcements, error } = await supabase
    .from("subject_announcements")
    .select(`
      *,
      faculty:faculty_id(id, name)
    `)
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to load subject announcements:", JSON.stringify(error))
    return []
  }

  if (!announcements || announcements.length === 0) {
    return []
  }

  const announcementIds = announcements.map((announcement: any) => announcement.id)
  const { data: replies, error: repliesError } = await supabase
    .from("announcement_replies")
    .select(`
      *,
      users:author_id(id, name)
    `)
    .in("post_id", announcementIds)
    .order("created_at", { ascending: true })

  if (repliesError) {
    console.error("Failed to load announcement replies:", JSON.stringify(repliesError))
    return announcements.map((announcement: any) => ({ ...announcement, replies: [] }))
  }

  const repliesByAnnouncement = new Map<string, any[]>()
  ;(replies || []).forEach((reply: any) => {
    const list = repliesByAnnouncement.get(reply.post_id) || []
    list.push(reply)
    repliesByAnnouncement.set(reply.post_id, list)
  })

  return announcements.map((announcement: any) => ({
    ...announcement,
    replies: repliesByAnnouncement.get(announcement.id) || [],
  }))
}

export async function createSubjectAnnouncementAction(data: {
  subject_id: string
  faculty_id: string
  title: string
  description: string
  section_ids?: string[]
}) {
  const supabase = createSupabaseAdminClient()

  const announcementPayload = {
    subject_id: data.subject_id,
    faculty_id: data.faculty_id,
    title: data.title,
    description: data.description,
    section_ids: data.section_ids || [],
  }

  const { data: inserted, error } = await supabase
    .from("subject_announcements")
    .insert(announcementPayload)
    .select(`
      *,
      faculty:faculty_id(id, name)
    `)
    .single()

  if (error) {
    console.error("Error creating subject announcement:", JSON.stringify(error))
    return { success: false, error: error.message }
  }

  try {
    const { data: studentsList } = await supabase
      .from("students")
      .select("id")
      .in("section_id", data.section_ids || [])

    if (studentsList && studentsList.length > 0) {
      const notifications = studentsList.map((st: any) => ({
        user_id: st.id,
        title: "📢 New Announcement",
        message: `A new announcement "${data.title}" has been posted for your class.`,
        is_read: false,
      }))

      await supabase.from("notifications").insert(notifications)
    }
  } catch (notifErr) {
    console.error("Failed to insert announcement notifications:", notifErr)
  }

  revalidatePath(`/dashboard/faculty/subjects/${data.subject_id}`)
  revalidatePath(`/dashboard/student/subjects/${data.subject_id}`)

  return { success: true, announcement: inserted }
}

export async function replyToAnnouncementAction(data: {
  announcement_id: string
  student_id: string
  subject_id: string
  content: string
}) {
  const supabase = createSupabaseAdminClient()

  const { data: inserted, error } = await supabase
    .from("announcement_replies")
    .insert({
      post_id: data.announcement_id,
      author_id: data.student_id,
      author_role: "STUDENT",
      message: data.content,
    })
    .select(`
      id,
      message,
      created_at,
      author_id,
      users:author_id (id, name)
    `)
    .single()

  if (error) {
    console.error("Error saving announcement reply:", error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/dashboard/faculty/subjects/${data.subject_id}`)
  revalidatePath(`/dashboard/student/subjects/${data.subject_id}`)

  return { success: true, reply: inserted }
}

export async function deleteSubjectAnnouncementAction(announcementId: string, subjectId: string) {
  const supabase = createSupabaseAdminClient()

  const { error: replyError } = await supabase
    .from("announcement_replies")
    .delete()
    .eq("post_id", announcementId)

  if (replyError) {
    console.error("Error deleting announcement replies:", replyError)
    return { success: false, error: replyError.message }
  }

  const { error } = await supabase
    .from("subject_announcements")
    .delete()
    .eq("id", announcementId)

  if (error) {
    console.error("Error deleting subject announcement:", error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/dashboard/faculty/subjects/${subjectId}`)
  revalidatePath(`/dashboard/student/subjects/${subjectId}`)

  return { success: true }
}
