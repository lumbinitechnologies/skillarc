"use server"

import { createSupabaseServerClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

export async function createAssignmentAction(data: {
  subject_id: string
  faculty_id: string
  title: string
  description: string
  due_date: string | null
  type: string
  max_score: number
  questions: any | null
  language: string | null
  test_cases: any | null
  section_ids: string[]
  files: string[] | null
}) {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.from("assignments").insert({
    subject_id: data.subject_id,
    faculty_id: data.faculty_id,
    title: data.title,
    description: data.description,
    due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
    type: data.type,
    max_score: data.max_score,
    questions: data.questions,
    language: data.language,
    test_cases: data.test_cases,
    section_ids: data.section_ids,
    files: data.files,
  })

  if (error) {
    console.error("Error creating assignment:", error)
    return { success: false, error: error.message }
  }

  // Insert notifications for all students in the selected sections
  if (data.section_ids && data.section_ids.length > 0) {
    try {
      const { data: studentsList } = await supabase
        .from("students")
        .select("id")
        .in("section_id", data.section_ids)

      if (studentsList && studentsList.length > 0) {
        const notifications = studentsList.map(st => ({
          user_id: st.id,
          title: "📚 New Assignment Assigned",
          message: `A new assignment "${data.title}" has been assigned for your class.`,
          is_read: false,
        }))

        await supabase.from("notifications").insert(notifications)
      }
    } catch (notifErr) {
      console.error("Failed to insert assignment notifications for students:", notifErr)
    }
  }

  revalidatePath(`/dashboard/faculty/subjects/${data.subject_id}`)
  revalidatePath(`/dashboard/student/subjects/${data.subject_id}`)
  return { success: true }
}

export async function updateAssignmentAction(
  id: string,
  subjectId: string,
  data: Partial<{
    title: string
    description: string
    due_date: string | null
    type: string
    max_score: number
    questions: any | null
    language: string | null
    test_cases: any | null
    section_ids: string[]
    files: string[] | null
  }>
) {
  const supabase = await createSupabaseServerClient()

  // Format due date if present
  const updateData = { ...data } as any
  if (data.due_date) {
    updateData.due_date = new Date(data.due_date).toISOString()
  } else if (data.due_date === null) {
    updateData.due_date = null
  }

  const { error } = await supabase
    .from("assignments")
    .update(updateData)
    .eq("id", id)

  if (error) {
    console.error("Error updating assignment:", error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/dashboard/faculty/subjects/${subjectId}`)
  revalidatePath(`/dashboard/student/subjects/${subjectId}`)
  return { success: true }
}

export async function deleteAssignmentAction(id: string, subjectId: string) {
  const supabase = await createSupabaseServerClient()

  // First delete dependent submissions
  const { error: subError } = await supabase
    .from("submissions")
    .delete()
    .eq("assignment_id", id)

  if (subError) {
    console.error("Error deleting submissions for assignment:", subError)
    return { success: false, error: subError.message }
  }

  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting assignment:", error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/dashboard/faculty/subjects/${subjectId}`)
  revalidatePath(`/dashboard/student/subjects/${subjectId}`)
  return { success: true }
}

export async function gradeSubmissionAction(
  submissionId: string,
  grade: number,
  feedback: string,
  subjectId: string
) {
  const supabase = await createSupabaseServerClient()

  // Retrieve submission, assignment details, and student user ID
  const { data: sub } = await supabase
    .from("submissions")
    .select("student_id, assignment_id, assignments(title, max_score)")
    .eq("id", submissionId)
    .single()

  const { error } = await supabase
    .from("submissions")
    .update({
      grade,
      feedback,
      status: "graded",
    })
    .eq("id", submissionId)

  if (error) {
    console.error("Error grading submission:", error)
    return { success: false, error: error.message }
  }

  // Insert notification for the student
  if (sub) {
    try {
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("id", sub.student_id)
        .single()

      if (student?.id) {
        const assignmentTitle = (sub as any).assignments?.title || "Assignment"
        const maxScore = (sub as any).assignments?.max_score || 100
        await supabase.from("notifications").insert({
          user_id: student.id,
          title: "📝 Assignment Graded",
          message: `Your submission for "${assignmentTitle}" has been graded: ${grade}/${maxScore}.`,
          is_read: false,
        })
      }
    } catch (notifErr) {
      console.error("Failed to insert grade notification:", notifErr)
    }
  }

  revalidatePath(`/dashboard/faculty/subjects/${subjectId}`)
  revalidatePath(`/dashboard/student/subjects/${subjectId}`)
  return { success: true }
}

export async function submitAssignmentAction(data: {
  assignment_id: string
  student_id: string
  file_url: string | null
  quiz_answers: any | null
  code_content: string | null
  language: string | null
  grade: number | null
  feedback: string | null
  status: string
  subject_id: string
}) {
  const supabase = await createSupabaseServerClient()

  // Upsert or insert submission
  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("assignment_id", data.assignment_id)
    .eq("student_id", data.student_id)
    .maybeSingle()

  let error
  if (existing) {
    const { error: updateError } = await supabase
      .from("submissions")
      .update({
        file_url: data.file_url,
        quiz_answers: data.quiz_answers,
        code_content: data.code_content,
        language: data.language,
        grade: data.grade,
        feedback: data.feedback,
        status: data.status,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
    error = updateError
  } else {
    const { error: insertError } = await supabase.from("submissions").insert({
      assignment_id: data.assignment_id,
      student_id: data.student_id,
      file_url: data.file_url,
      quiz_answers: data.quiz_answers,
      code_content: data.code_content,
      language: data.language,
      grade: data.grade,
      feedback: data.feedback,
      status: data.status,
      submitted_at: new Date().toISOString(),
    })
    error = insertError
  }

  if (error) {
    console.error("Error submitting assignment:", error)
    return { success: false, error: error.message }
  }

  // Insert notification for the faculty member
  try {
    const { data: assignment } = await supabase
      .from("assignments")
      .select("title, faculty_id")
      .eq("id", data.assignment_id)
      .single()

    if (assignment) {
      const { data: faculty } = await supabase
        .from("staff")
        .select("user_id")
        .eq("id", assignment.faculty_id)
        .single()

      const { data: studentUser } = await supabase
        .from("students")
        .select("users(name)")
        .eq("id", data.student_id)
        .single()

      if (faculty?.user_id) {
        const studentName = (studentUser as any)?.users?.name || "A student"
        await supabase.from("notifications").insert({
          user_id: faculty.user_id,
          title: "📥 New Submission Received",
          message: `${studentName} submitted their solution for "${assignment.title}".`,
          is_read: false,
        })
      }
    }
  } catch (notifErr) {
    console.error("Failed to insert submission notification:", notifErr)
  }

  revalidatePath(`/dashboard/faculty/subjects/${data.subject_id}`)
  revalidatePath(`/dashboard/student/subjects/${data.subject_id}`)
  return { success: true }
}

function calculateFuzzRatio(str1: string, str2: string): number {
  const s1 = (str1 || "").trim().toLowerCase()
  const s2 = (str2 || "").trim().toLowerCase()
  if (s1 === s2) return 100
  if (!s1 || !s2) return 0

  const m = s1.length
  const n = s2.length
  
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        )
      }
    }
  }
  
  const distance = dp[m][n]
  const ratio = ((m + n - distance) / (m + n)) * 100
  return Math.round(ratio)
}

export async function runPlagiarismScanAction(submissionId: string) {
  try {
    const supabase = await createSupabaseServerClient()

    // 1. Fetch current submission
    const { data: currentSub, error: subErr } = await supabase
      .from("submissions")
      .select("id, assignment_id, student_id, code_content, feedback")
      .eq("id", submissionId)
      .single()

    if (subErr || !currentSub) {
      return { success: false, error: "Submission not found" }
    }

    const contentToCheck = currentSub.code_content || currentSub.feedback || ""
    if (!contentToCheck.trim()) {
      return { success: true, plagiarismRate: 0, risk: "LOW", matchedStudent: "None (Empty Submission)" }
    }

    // 2. Fetch all other submissions for the same assignment
    const { data: otherSubs, error: othersErr } = await supabase
      .from("submissions")
      .select("id, student_id, code_content, feedback")
      .eq("assignment_id", currentSub.assignment_id)
      .neq("id", submissionId)

    if (othersErr) {
      return { success: false, error: "Failed to fetch peer submissions" }
    }

    let highestRate = 0
    let matchedStudentId = null
    let matchedStudentName = "None"

    if (otherSubs && otherSubs.length > 0) {
      // Fetch names of other students
      const peerStudentIds = otherSubs.map(s => s.student_id)
      const { data: users } = await supabase
        .from("users")
        .select("id, name")
        .in("id", peerStudentIds)

      for (const other of otherSubs) {
        const otherContent = other.code_content || other.feedback || ""
        if (!otherContent.trim()) continue

        const rate = calculateFuzzRatio(contentToCheck, otherContent)
        if (rate > highestRate) {
          highestRate = rate
          matchedStudentId = other.student_id
          const userObj = users?.find(u => u.id === other.student_id)
          matchedStudentName = userObj?.name || "Peer Student"
        }
      }
    }

    let risk = "LOW"
    if (highestRate >= 60) risk = "HIGH"
    else if (highestRate >= 30) risk = "MEDIUM"

    // 3. Upsert into submission_verifications
    const status = highestRate >= 50 ? "FLAGGED" : "CLEAN"
    
    // Check if verification already exists
    const { data: existingVerification } = await supabase
      .from("submission_verifications")
      .select("id")
      .eq("submission_id", submissionId)
      .maybeSingle()

    if (existingVerification) {
      await supabase
        .from("submission_verifications")
        .update({
          plagiarism_rate: highestRate,
          status,
          verified_at: new Date().toISOString(),
        })
        .eq("id", existingVerification.id)
    } else {
      await supabase
        .from("submission_verifications")
        .insert({
          submission_id: submissionId,
          plagiarism_rate: highestRate,
          status,
        })
    }

    return {
      success: true,
      plagiarismRate: highestRate,
      risk,
      matchedStudent: highestRate > 0 ? matchedStudentName : "None"
    }
  } catch (err: any) {
    console.error("Plagiarism check action error:", err)
    return { success: false, error: err.message || String(err) }
  }
}
