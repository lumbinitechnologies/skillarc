"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase-server"

function isMissingTableError(error: any) {
  if (!error) return false

  const message = String(error.message || "")
  return (
    error.code === "42P01" ||
    message.includes("does not exist") ||
    message.includes("grade_columns") ||
    message.includes("grade_entries")
  )
}

export async function createGradeColumnAction(data: {
  subject_id: string
  title: string
  type?: string
  max_score?: number
  weight?: number
  display_order?: number
  created_by?: string
}) {
  const supabase = await createSupabaseServerClient()

  if (!data.subject_id || !data.title?.trim()) {
    return { success: false, error: "Subject and title are required." }
  }

  const payload = {
    subject_id: data.subject_id,
    created_by: data.created_by || (await supabase.auth.getUser()).data.user?.id,
    title: data.title.trim(),
    type: data.type || "custom",
    max_score: Number(data.max_score ?? 100),
    weight: Number(data.weight ?? 0),
    display_order: Number(data.display_order ?? 0),
    is_active: true,
  }

  if (!payload.created_by) {
    return { success: false, error: "User session is required." }
  }

  const { data: inserted, error } = await supabase
    .from("grade_columns")
    .insert(payload)
    .select()
    .single()

  if (error) {
    if (isMissingTableError(error)) {
      return { success: false, error: "Gradebook tables have not been created in the database yet." }
    }
    console.error("Error creating grade column:", error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/dashboard/faculty/subjects/${data.subject_id}`)
  return { success: true, column: inserted }
}

export async function updateGradeColumnAction(data: {
  id: string
  subject_id: string
  title?: string
  type?: string
  max_score?: number
  weight?: number
  display_order?: number
  is_active?: boolean
}) {
  const supabase = await createSupabaseServerClient()

  const payload: Record<string, any> = {}

  if (data.title !== undefined) payload.title = data.title.trim()
  if (data.type !== undefined) payload.type = data.type
  if (data.max_score !== undefined) payload.max_score = Number(data.max_score)
  if (data.weight !== undefined) payload.weight = Number(data.weight)
  if (data.display_order !== undefined) payload.display_order = Number(data.display_order)
  if (data.is_active !== undefined) payload.is_active = Boolean(data.is_active)

  if (!Object.keys(payload).length) {
    return { success: false, error: "No changes were provided." }
  }

  const { error } = await supabase
    .from("grade_columns")
    .update(payload)
    .eq("id", data.id)
    .eq("subject_id", data.subject_id)

  if (error) {
    if (isMissingTableError(error)) {
      return { success: false, error: "Gradebook tables have not been created in the database yet." }
    }
    console.error("Error updating grade column:", error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/dashboard/faculty/subjects/${data.subject_id}`)
  return { success: true }
}

export async function deleteGradeColumnAction(subject_id: string, column_id: string) {
  const supabase = await createSupabaseServerClient()

  const { error: entryError } = await supabase
    .from("grade_entries")
    .delete()
    .eq("column_id", column_id)

  if (entryError) {
    if (isMissingTableError(entryError)) {
      return { success: false, error: "Gradebook tables have not been created in the database yet." }
    }
    console.error("Error deleting grade entries for column:", entryError)
    return { success: false, error: entryError.message }
  }

  const { error } = await supabase
    .from("grade_columns")
    .delete()
    .eq("id", column_id)
    .eq("subject_id", subject_id)

  if (error) {
    if (isMissingTableError(error)) {
      return { success: false, error: "Gradebook tables have not been created in the database yet." }
    }
    console.error("Error deleting grade column:", error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/dashboard/faculty/subjects/${subject_id}`)
  return { success: true }
}

export async function upsertGradeEntryAction(data: {
  column_id: string
  student_id: string
  score: number | string | null
  feedback?: string | null
  graded_by?: string
  subject_id?: string
}) {
  const supabase = await createSupabaseServerClient()

  const scoreValue = data.score === "" || data.score == null ? null : Number(data.score)

  const payload = {
    column_id: data.column_id,
    student_id: data.student_id,
    score: scoreValue,
    feedback: data.feedback ?? null,
    graded_by: data.graded_by || (await supabase.auth.getUser()).data.user?.id,
    graded_at: new Date().toISOString(),
  }

  if (!payload.graded_by) {
    return { success: false, error: "User session is required." }
  }

  const { data: existing, error: fetchError } = await supabase
    .from("grade_entries")
    .select("id")
    .eq("column_id", data.column_id)
    .eq("student_id", data.student_id)
    .maybeSingle()

  if (fetchError) {
    if (isMissingTableError(fetchError)) {
      return { success: false, error: "Gradebook tables have not been created in the database yet." }
    }
    console.error("Error looking up grade entry:", fetchError)
    return { success: false, error: fetchError.message }
  }

  let result
  if (existing?.id) {
    result = await supabase
      .from("grade_entries")
      .update({
        score: scoreValue,
        feedback: payload.feedback,
        graded_by: payload.graded_by,
        graded_at: payload.graded_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
  } else {
    result = await supabase.from("grade_entries").insert({ ...payload, updated_at: new Date().toISOString() })
  }

  if (result.error) {
    if (isMissingTableError(result.error)) {
      return { success: false, error: "Gradebook tables have not been created in the database yet." }
    }
    console.error("Error saving grade entry:", result.error)
    return { success: false, error: result.error.message }
  }

  if (data.subject_id) {
    revalidatePath(`/dashboard/faculty/subjects/${data.subject_id}`)
    revalidatePath(`/dashboard/student/subjects/${data.subject_id}`)
    revalidatePath(`/dashboard/student/report-card`)
  }

  return { success: true }
}

export async function getGradeColumnsBySubjectAction(subject_id: string) {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from("grade_columns")
    .select("*")
    .eq("subject_id", subject_id)
    .eq("is_active", true)
    .order("display_order", { ascending: true })

  if (error) {
    if (isMissingTableError(error)) {
      return [] as any[]
    }
    console.error("Error fetching grade columns:", error)
    return [] as any[]
  }

  return data || []
}

export async function getGradeEntriesBySubjectAction(subject_id: string) {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from("grade_columns")
    .select("id")
    .eq("subject_id", subject_id)
    .eq("is_active", true)

  if (error || !data?.length) {
    return [] as any[]
  }

  const columnIds = data.map((col) => col.id)

  const { data: entries, error: entryError } = await supabase
    .from("grade_entries")
    .select("*")
    .in("column_id", columnIds)

  if (entryError) {
    if (isMissingTableError(entryError)) {
      return [] as any[]
    }
    console.error("Error fetching grade entries:", entryError)
    return [] as any[]
  }

  return entries || []
}
