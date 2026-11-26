import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { ParentStudentRelation, ParentStudentRelationWithDetails, CreateParentStudentRelationInput } from "../types/parent-student.types"

export async function createSupabaseParentStudentClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

export async function getStudentsByParent(parentId: string): Promise<ParentStudentRelationWithDetails[]> {
  const supabase = await createSupabaseParentStudentClient()
  const { data, error } = await supabase
    .from("parent_student_relations")
    .select(`
      id,
      parent_id,
      student_id,
      relationship,
      created_at,
      users!student_id(id, name, email)
    `)
    .eq("parent_id", parentId)

  if (error) throw new Error(`Failed to fetch parent's students: ${error.message}`)
  return data || []
}

export async function getParentsByStudent(studentId: string): Promise<ParentStudentRelationWithDetails[]> {
  const supabase = await createSupabaseParentStudentClient()
  const { data, error } = await supabase
    .from("parent_student_relations")
    .select(`
      id,
      parent_id,
      student_id,
      relationship,
      created_at,
      users!parent_id(id, name, email)
    `)
    .eq("student_id", studentId)

  if (error) throw new Error(`Failed to fetch student's parents: ${error.message}`)
  return data || []
}

export async function createParentStudentRelation(input: CreateParentStudentRelationInput): Promise<ParentStudentRelation> {
  const supabase = await createSupabaseParentStudentClient()
  const { data, error } = await supabase
    .from("parent_student_relations")
    .insert([input])
    .select()
    .single()

  if (error) throw new Error(`Failed to create parent-student relation: ${error.message}`)
  return data
}

export async function deleteParentStudentRelation(relationId: string): Promise<void> {
  const supabase = await createSupabaseParentStudentClient()
  const { error } = await supabase
    .from("parent_student_relations")
    .delete()
    .eq("id", relationId)

  if (error) throw new Error(`Failed to delete parent-student relation: ${error.message}`)
}

export async function getStudentCount(parentId: string): Promise<number> {
  const supabase = await createSupabaseParentStudentClient()
  const { count, error } = await supabase
    .from("parent_student_relations")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", parentId)

  if (error) throw new Error(`Failed to count parent's students: ${error.message}`)
  return count || 0
}