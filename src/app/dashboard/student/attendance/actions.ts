"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase-server"

export async function submitLeaveApplicationAction({
  studentId,
  sectionId,
  advisorId,
  institutionId,
  fromDate,
  toDate,
  reason,
  notes,
}: {
  studentId: string
  sectionId: string | null
  advisorId: string | null
  institutionId: string | null
  fromDate: string
  toDate: string
  reason: string
  notes: string | null
}) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Please sign in again to submit the leave request." }
  }

  if (user.id !== studentId) {
    return { success: false, error: "Invalid student session. Please sign in again." }
  }

  const payload = {
    student_id: studentId,
    section_id: sectionId,
    advisor_id: advisorId,
    institution_id: institutionId,
    from_date: fromDate,
    to_date: toDate,
    reason,
    notes,
    status: "PENDING",
  }

  const { data, error } = await supabase
    .from("leave_applications")
    .insert(payload)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/dashboard/student/attendance")
  revalidatePath("/dashboard/faculty/attendance")

  return { success: true, application: data }
}
