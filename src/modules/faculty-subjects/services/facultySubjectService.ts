import { supabase } from "@/lib/supabase"

export const facultySubjectService = {
  async getFacultyAssignments(institutionId: string) {
    const { data, error } = await supabase
      .from("faculty_subjects")
      .select(`
        id,
        faculty_id,
        subject_id,
        users(
          id,
          name
        ),
        subjects(
          id,
          name,
          code,
          semester
        )
      `)
      .eq("institution_id", institutionId)

    if (error) throw error

    return data ?? []
  },

  async assignFaculty({
    institutionId,
    facultyId,
    subjectId,
  }: {
    institutionId: string
    facultyId: string
    subjectId: string
  }) {
    const { error } = await supabase
      .from("faculty_subjects")
      .insert({
        institution_id: institutionId,
        faculty_id: facultyId,
        subject_id: subjectId,
      })

    if (error) throw error
  },

  async removeAssignment(id: string) {
    const { error } = await supabase
      .from("faculty_subjects")
      .delete()
      .eq("id", id)

    if (error) throw error
  },

  async replaceFacultyAssignments({
    facultyId,
    subjectIds,
  }: {
    facultyId: string
    subjectIds: string[]
  }) {
    const response = await fetch("/api/faculty-subjects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        facultyId,
        subjectIds,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error)
    }

    return response.json()
  },
}