"use server"

import { createSupabaseServerClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { detectAIContent } from "@/lib/ai-detector"
import { dispatchNotification, dispatchBatchNotifications } from "@/lib/notification-service"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { syncAssignmentKnowledge, archiveAssignmentKnowledge } from "@/lib/knowledge/assignment"

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

  if (!data.title || !data.title.trim()) {
    return { success: false, error: "Assignment title is required." }
  }

  if (!data.section_ids || data.section_ids.length === 0) {
    return { success: false, error: "At least one target section must be selected." }
  }

  // Enforce mandatory/optional rules for content & attachments (ASG-003)
  if (data.type === "Assignment" && !data.description?.trim() && (!data.files || data.files.length === 0)) {
    return { success: false, error: "Assignment requires either instructions/description or at least one attached guideline file." }
  }

  if ((data.type === "Material" || data.type === "Syllabus") && !data.description?.trim() && (!data.files || data.files.length === 0)) {
    return { success: false, error: "Please provide description details or attach at least one resource file." }
  }

  if (data.type === "Coding Assignment" && !data.description?.trim()) {
    return { success: false, error: "Problem statement/description is required for coding assignments." }
  }

  if (data.type === "Quiz") {
    if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
      return { success: false, error: "Quiz must have at least one question." }
    }
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i]
      if (!q.q?.trim()) {
        return { success: false, error: `Question #${i + 1} cannot be empty.` }
      }
      if (!Array.isArray(q.options) || q.options.some((opt: any) => !String(opt || "").trim())) {
        return { success: false, error: `All options for Question #${i + 1} must be filled out.` }
      }
    }
  }

  // Prevent past due dates (ASG-005)
  if (data.due_date && data.type !== "Material" && data.type !== "Syllabus") {
    const dueDate = new Date(data.due_date)
    if (isNaN(dueDate.getTime())) {
      return { success: false, error: "Invalid due date format." }
    }
    if (dueDate.getTime() < Date.now() - 60000) {
      return { success: false, error: "Due date cannot be in the past. Please select a future date and time." }
    }
  }

  const uniqueFiles = data.files && Array.isArray(data.files) ? Array.from(new Set(data.files)) : data.files

  const { data: assignment, error } = await supabase.from("assignments").insert({
    subject_id: data.subject_id,
    faculty_id: data.faculty_id,
    title: data.title.trim(),
    description: data.description?.trim() || "",
    due_date: (data.type === "Material" || data.type === "Syllabus" || !data.due_date) ? null : new Date(data.due_date).toISOString(),
    type: data.type,
    max_score: data.type === "Material" || data.type === "Syllabus" ? 0 : data.max_score,
    questions: data.questions,
    language: data.language,
    test_cases: data.test_cases,
    section_ids: data.section_ids,
    files: uniqueFiles,
  }).select("id").single()

  if (error) {
    console.error("Error creating assignment:", error)
    return { success: false, error: error.message }
  }

  await syncAssignmentKnowledge(createSupabaseAdminClient(), assignment.id)

  // Revalidate paths immediately so dashboards show the new assignment right away
  revalidatePath(`/dashboard/faculty/subjects/${data.subject_id}`)
  revalidatePath(`/dashboard/student/subjects/${data.subject_id}`)
  revalidatePath(`/dashboard/parent/assignments`)

  // Dispatch in-app + email notifications for all students in the selected sections
  // NOTE: Must use admin client here — the user (faculty) session cannot read other users' data
  if (data.section_ids && data.section_ids.length > 0) {
    try {
      const notifAdmin = createSupabaseAdminClient()

      // Fetch all students in the target sections (students.id === users.id)
      const { data: studentsList } = await notifAdmin
        .from("students")
        .select("id")
        .in("section_id", data.section_ids)

      if (studentsList && studentsList.length > 0) {
        const studentIds = studentsList.map(st => st.id)

        // Notify students
        await dispatchBatchNotifications(
          studentIds,
          "due_date",
          "📚 New Assignment Assigned",
          `A new assignment "${data.title}" has been assigned for your class.`,
          `/dashboard/student/subjects/${data.subject_id}`
        )

        // Notify parents of affected students
        try {
          const { data: parentRelations } = await notifAdmin
            .from("parent_student_relations")
            .select("parent_id")
            .in("student_id", studentIds)

          if (parentRelations && parentRelations.length > 0) {
            const parentIds = [...new Set(parentRelations.map(r => r.parent_id))]
            await dispatchBatchNotifications(
              parentIds,
              "due_date",
              "📚 New Assignment for Your Child",
              `A new assignment "${data.title}" has been assigned. Check the Parent Portal for details.`,
              `/dashboard/parent/assignments`
            )
          }
        } catch (parentNotifErr) {
          console.warn("Failed to dispatch parent notifications:", parentNotifErr)
        }
      }
    } catch (notifErr) {
      console.error("Failed to dispatch assignment notifications:", notifErr)
    }
  }

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

  if (data.title !== undefined && !data.title.trim()) {
    return { success: false, error: "Assignment title cannot be empty." }
  }

  if (data.section_ids !== undefined && data.section_ids.length === 0) {
    return { success: false, error: "At least one target section must be selected." }
  }

  if (data.type === "Assignment" && data.description !== undefined && !data.description.trim() && (!data.files || data.files.length === 0)) {
    return { success: false, error: "Assignment requires either instructions/description or at least one attached guideline file." }
  }

  if (data.due_date && data.type !== "Material" && data.type !== "Syllabus") {
    const dueDate = new Date(data.due_date)
    if (isNaN(dueDate.getTime())) {
      return { success: false, error: "Invalid due date format." }
    }
    if (dueDate.getTime() < Date.now() - 60000) {
      return { success: false, error: "Due date cannot be in the past. Please select a future date and time." }
    }
  }

  // Format update payload
  const updateData = { ...data } as any
  if (data.title) updateData.title = data.title.trim()
  if (data.description !== undefined) updateData.description = data.description.trim()
  if (data.due_date) {
    updateData.due_date = new Date(data.due_date).toISOString()
  } else if (data.due_date === null) {
    updateData.due_date = null
  }

  // Deduplicate files if provided
  if (data.files && Array.isArray(data.files)) {
    updateData.files = Array.from(new Set(data.files))
  }

  // If max_score or questions are being updated, fetch current assignment to check for changes
  let oldAssignmentData: any = null
  let oldMaxScore: number | null = null

  const { data: currentAss } = await supabase
    .from("assignments")
    .select("type, max_score, questions")
    .eq("id", id)
    .maybeSingle()

  if (currentAss) {
    oldAssignmentData = currentAss
    if (currentAss.max_score) {
      oldMaxScore = Number(currentAss.max_score)
    }
  }

  const { error } = await supabase
    .from("assignments")
    .update(updateData)
    .eq("id", id)

  if (error) {
    console.error("Error updating assignment:", error)
    return { success: false, error: error.message }
  }

  // If this is a Quiz and questions or max_score were updated, auto-regrade all submitted student answers (QUIZ-024)
  const isQuiz = (data.type === "Quiz") || (oldAssignmentData?.type === "Quiz")
  if (isQuiz && (data.questions !== undefined || data.max_score !== undefined)) {
    try {
      const activeQuestions = data.questions || oldAssignmentData?.questions || []
      const activeMaxScore = data.max_score !== undefined ? data.max_score : (oldAssignmentData?.max_score || 100)

      if (Array.isArray(activeQuestions) && activeQuestions.length > 0) {
        const { data: quizSubs } = await supabase
          .from("submissions")
          .select("id, quiz_answers")
          .eq("assignment_id", id)

        if (quizSubs && quizSubs.length > 0) {
          for (const sub of quizSubs) {
            if (sub.quiz_answers && Array.isArray(sub.quiz_answers)) {
              let correct = 0
              sub.quiz_answers.forEach((ans: number, idx: number) => {
                if (ans === activeQuestions[idx]?.answer) correct++
              })
              const regradedScore = Number(((correct / activeQuestions.length) * activeMaxScore).toFixed(1))
              await supabase
                .from("submissions")
                .update({
                  grade: regradedScore,
                  status: "graded",
                  feedback: `Auto-graded Quiz: ${correct}/${activeQuestions.length} correct (${regradedScore}/${activeMaxScore} Marks).`,
                })
                .eq("id", sub.id)
            }
          }
        }
      }
    } catch (regradeErr) {
      console.error("Failed to auto-regrade quiz submissions after quiz update:", regradeErr)
    }
  } else if (
    oldMaxScore !== null &&
    data.max_score !== undefined &&
    oldMaxScore > 0 &&
    data.max_score > 0 &&
    oldMaxScore !== data.max_score
  ) {
    // If max_score was updated and changed for non-quiz, proportionally rescale all existing graded submissions (ASG-074)
    try {
      const { data: gradedSubs } = await supabase
        .from("submissions")
        .select("id, grade")
        .eq("assignment_id", id)
        .not("grade", "is", null)

      if (gradedSubs && gradedSubs.length > 0) {
        const newMax = data.max_score
        for (const sub of gradedSubs) {
          if (sub.grade !== null && typeof sub.grade === "number") {
            const scaled = (sub.grade / oldMaxScore) * newMax
            const roundedGrade = Number((Math.round(scaled * 10) / 10).toFixed(1))
            const finalGrade = Math.min(newMax, Math.max(0, roundedGrade))

            await supabase
              .from("submissions")
              .update({ grade: finalGrade })
              .eq("id", sub.id)
          }
        }
      }
    } catch (scaleErr) {
      console.error("Failed to rescale existing submissions for updated max_score:", scaleErr)
    }
  }

  await syncAssignmentKnowledge(createSupabaseAdminClient(), id)

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

  await archiveAssignmentKnowledge(createSupabaseAdminClient(), id)

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
        await dispatchNotification({
          userId: student.id,
          category: "grading",
          title: "📝 Assignment Graded",
          message: `Your submission for "${assignmentTitle}" has been graded: ${grade}/${maxScore}.`,
          link: `/dashboard/student/subjects/${subjectId}`,
        })
      }
    } catch (notifErr) {
      console.error("Failed to dispatch grade notification:", notifErr)
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

  // 1. Fetch assignment details to enforce due date and fetch faculty info
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, faculty_id, due_date")
    .eq("id", data.assignment_id)
    .maybeSingle()

  // 2. Strict due date validation: block submissions if deadline has passed (with 2-minute latency buffer to guarantee on-time submittal acceptance)
  if (assignment?.due_date) {
    const dueDate = new Date(assignment.due_date)
    if (!isNaN(dueDate.getTime()) && Date.now() - dueDate.getTime() > 120000) {
      return {
        success: false,
        error: "Submissions closed: The deadline for this assignment/quiz has passed.",
      }
    }
  }

  // Upsert or insert submission
  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("assignment_id", data.assignment_id)
    .eq("student_id", data.student_id)
    .maybeSingle()

  let submissionId = existing?.id
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
    const { data: inserted, error: insertError } = await supabase
      .from("submissions")
      .insert({
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
      .select("id")
      .single()
    error = insertError
    if (inserted?.id) submissionId = inserted.id
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
        await dispatchNotification({
          userId: faculty.user_id,
          category: "submissions",
          title: "📥 New Submission Received",
          message: `${studentName} submitted their solution for "${assignment.title}".`,
          link: `/dashboard/faculty/subjects/${data.subject_id}`,
        })
      }
    }
  } catch (notifErr) {
    console.error("Failed to dispatch submission notification:", notifErr)
  }

  revalidatePath(`/dashboard/faculty/subjects/${data.subject_id}`)
  revalidatePath(`/dashboard/student/subjects/${data.subject_id}`)
  return { success: true, submissionId }
}

// ---------------------------------------------------------------------------
// Plagiarism detection engine
//
// The previous implementation only combined a raw Levenshtein edit-distance
// ratio with single-word token overlap. Both are easy to defeat (reordering
// sentences, swapping a handful of words, minor paraphrasing) and produce
// noisy scores on longer submissions. This version combines four
// complementary signals that are each good at catching a different kind of
// copying, then takes a weighted blend floored by the strongest individual
// signal so a single glaring red flag (e.g. a verbatim block) can't be
// diluted away by weaker metrics.
// ---------------------------------------------------------------------------

const MAX_COMPARE_LENGTH = 4000 // guard against O(n*m) blowups on huge code/text payloads

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "else", "when",
  "while", "for", "to", "of", "in", "on", "at", "by", "with", "from",
  "into", "about", "over", "under", "between", "through", "after", "before",
  "during", "because", "that", "this", "these", "those", "is", "are", "was",
  "were", "be", "been", "being", "it", "its", "their", "our", "your", "we",
  "you", "they", "he", "she", "i", "as", "so", "not", "no", "yes", "can",
  "could", "should", "would", "may", "might", "must", "have", "has", "had",
  "do", "does", "did", "will", "just", "very", "more", "most", "same",
  "such", "than", "also", "there", "here", "using", "used", "use", "each",
  "every", "any", "all", "some", "one", "two", "three", "four", "five"
])

function normalizeForComparison(input: string) {
  return (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function removeStopWords(input: string): string[] {
  return normalizeForComparison(input)
    .split(" ")
    .filter(token => token && !STOP_WORDS.has(token))
}

function tokenize(input: string): string[] {
  return removeStopWords(input)
}

function truncateForEditDistance(input: string): string {
  return input.length > MAX_COMPARE_LENGTH ? input.slice(0, MAX_COMPARE_LENGTH) : input
}

/**
 * Classic Levenshtein edit-distance ratio. Best at catching near-identical
 * short answers with only minor edits (typos, small substitutions).
 */
function calculateFuzzRatio(str1: string, str2: string): number {
  const s1 = truncateForEditDistance((str1 || "").trim().toLowerCase())
  const s2 = truncateForEditDistance((str2 || "").trim().toLowerCase())
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
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        )
      }
    }
  }

  const distance = dp[m][n]
  const ratio = ((m + n - distance) / (m + n)) * 100
  return Math.round(ratio)
}

/**
 * N-gram ("shingle") Jaccard similarity. Instead of comparing single words
 * (which two unrelated essays about the same topic will naturally share a
 * lot of), this compares overlapping runs of k consecutive words. Shared
 * 5-word phrases are a very strong signal of copied *phrasing*, and it
 * still catches copying even when sentences elsewhere have been reordered
 * or reworded. This is the same family of technique used by MOSS-style
 * plagiarism detectors.
 */
function calculateShingleJaccard(str1: string, str2: string): number {
  const tokens1 = tokenize(str1)
  const tokens2 = tokenize(str2)
  if (!tokens1.length || !tokens2.length) return 0

  // Adapt shingle size to available tokens so very short answers still
  // produce a meaningful (non-empty) shingle set.
  const k = Math.max(1, Math.min(5, tokens1.length, tokens2.length))

  const shingle = (tokens: string[]) => {
    const set = new Set<string>()
    for (let i = 0; i <= tokens.length - k; i++) {
      set.add(tokens.slice(i, i + k).join(" "))
    }
    return set
  }

  const set1 = shingle(tokens1)
  const set2 = shingle(tokens2)
  if (!set1.size || !set2.size) return 0

  let common = 0
  for (const s of set1) if (set2.has(s)) common++
  const union = set1.size + set2.size - common

  if (!union) return 0
  return Math.round((common / union) * 100)
}

/**
 * Sentence overlap ratio. Two essays that copied the same paragraphing or
 * same sentence structure will produce a strong signal here, even when a
 * few words are swapped.
 */
function calculateSentenceOverlap(str1: string, str2: string): number {
  const sentences1 = normalizeForComparison(str1)
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(Boolean)

  const sentences2 = normalizeForComparison(str2)
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(Boolean)

  if (!sentences1.length || !sentences2.length) return 0

  const set1 = new Set(sentences1)
  const set2 = new Set(sentences2)
  let common = 0
  for (const sentence of set1) if (set2.has(sentence)) common++

  const union = new Set([...sentences1, ...sentences2]).size
  if (!union) return 0

  return Math.round((common / union) * 100)
}

/**
 * Keyword Jaccard ratio after stop-word removal. This is cleaner than raw
 * token-overlap because it rewards substantive content overlap instead of
 * common filler words. Useful for short descriptive answers.
 */
function calculateKeywordJaccard(str1: string, str2: string): number {
  const tokens1 = new Set(removeStopWords(str1))
  const tokens2 = new Set(removeStopWords(str2))

  if (!tokens1.size || !tokens2.size) return 0

  let common = 0
  for (const token of tokens1) if (tokens2.has(token)) common++

  const union = new Set([...tokens1, ...tokens2]).size
  if (!union) return 0

  return Math.round((common / union) * 100)
}

/**
 * Cosine similarity over term-frequency vectors. Robust to word order and
 * catches matching vocabulary/content distribution even under light
 * paraphrasing, complementing the phrase-level shingle check above.
 */
function calculateCosineSimilarity(str1: string, str2: string): number {
  const tokens1 = tokenize(str1)
  const tokens2 = tokenize(str2)
  if (!tokens1.length || !tokens2.length) return 0

  const freq = (tokens: string[]) => {
    const map = new Map<string, number>()
    for (const t of tokens) map.set(t, (map.get(t) || 0) + 1)
    return map
  }

  const freq1 = freq(tokens1)
  const freq2 = freq(tokens2)

  let dot = 0
  for (const [term, count] of freq1) {
    const other = freq2.get(term)
    if (other) dot += count * other
  }

  const norm = (map: Map<string, number>) =>
    Math.sqrt([...map.values()].reduce((sum, c) => sum + c * c, 0))

  const denom = norm(freq1) * norm(freq2)
  if (!denom) return 0

  return Math.round((dot / denom) * 100)
}

/**
 * Longest common substring, expressed as a ratio of the shorter input's
 * length. Directly catches large verbatim copy-pasted blocks, which the
 * other metrics can under-report on long documents where only a section
 * was copied.
 */
function calculateLongestCommonSubstringRatio(str1: string, str2: string): number {
  const s1 = truncateForEditDistance(normalizeForComparison(str1))
  const s2 = truncateForEditDistance(normalizeForComparison(str2))
  if (!s1 || !s2) return 0

  const m = s1.length
  const n = s2.length
  let longest = 0

  // Rolling two-row DP to keep memory bounded.
  let prev = new Array(n + 1).fill(0)
  for (let i = 1; i <= m; i++) {
    const curr = new Array(n + 1).fill(0)
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        curr[j] = prev[j - 1] + 1
        if (curr[j] > longest) longest = curr[j]
      } else {
        curr[j] = 0
      }
    }
    prev = curr
  }

  const shorter = Math.min(m, n)
  if (!shorter) return 0
  return Math.round((longest / shorter) * 100)
}

/**
 * Weighted blend of all four signals, floored by the single strongest
 * signal. Flooring matters: e.g. a submission that copied one big paragraph
 * verbatim into an otherwise original essay should score high on LCS even
 * if shingle/cosine dilute it across the rest of the (original) content.
 */
function calculateSimilarityScore(str1: string, str2: string): number {
  const shingleJaccard = calculateShingleJaccard(str1, str2)
  const cosine = calculateCosineSimilarity(str1, str2)
  const lcsRatio = calculateLongestCommonSubstringRatio(str1, str2)
  const fuzz = calculateFuzzRatio(str1, str2)
  const sentenceOverlap = calculateSentenceOverlap(str1, str2)
  const keywordJaccard = calculateKeywordJaccard(str1, str2)

  const weighted =
    shingleJaccard * 0.3 +
    cosine * 0.18 +
    lcsRatio * 0.22 +
    fuzz * 0.12 +
    sentenceOverlap * 0.1 +
    keywordJaccard * 0.08

  const strongestSignal = Math.max(
    shingleJaccard,
    cosine,
    lcsRatio,
    fuzz,
    sentenceOverlap,
    keywordJaccard
  )

  return Math.round(Math.max(weighted, strongestSignal * 0.9))
}

/**
 * Extracts readable text from a remote file reference.
 * Supports: plain text, PDF (via unpdf), DOCX (via mammoth), and most code files.
 * For formats we cannot parse, returns an empty string gracefully.
 */
async function extractTextFromFileReference(fileUrl: string): Promise<string> {
  if (!fileUrl || !/^https?:\/\//i.test(fileUrl)) return ""

  try {
    const response = await fetch(fileUrl)
    if (!response.ok) return ""

    const contentType = response.headers.get("content-type") || ""
    const urlLower = fileUrl.toLowerCase().split("?")[0] // strip query params before checking ext

    // --- Plain text & code files ---
    if (
      contentType.includes("text/") ||
      /\.(txt|md|csv|json|js|ts|jsx|tsx|py|java|c|cpp|cs|xml|html|htm|yaml|yml)$/i.test(urlLower)
    ) {
      return (await response.text()).trim()
    }

    // --- PDF ---
    if (contentType.includes("application/pdf") || urlLower.endsWith(".pdf")) {
      try {
        const { extractText } = await import("unpdf")
        const arrayBuffer = await response.arrayBuffer()
        const uint8 = new Uint8Array(arrayBuffer)
        const extracted = await extractText(uint8, { mergePages: true })
        return (extracted?.text || "").trim()
      } catch (pdfErr) {
        console.warn("[extractText] PDF extraction failed:", pdfErr)
        return ""
      }
    }

    // --- DOCX ---
    if (
      contentType.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
      urlLower.endsWith(".docx")
    ) {
      try {
        const mammoth = await import("mammoth")
        const arrayBuffer = await response.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        return (result?.value || "").trim()
      } catch (docxErr) {
        console.warn("[extractText] DOCX extraction failed:", docxErr)
        return ""
      }
    }

    return ""
  } catch {
    return ""
  }
}

async function extractSubmissionContent(payload: {
  code_content?: string | null
  feedback?: string | null
  quiz_answers?: any
  file_url?: string | null
}): Promise<string> {
  const candidates: string[] = []

  if (payload.code_content?.trim()) candidates.push(payload.code_content)
  if (payload.feedback?.trim()) candidates.push(payload.feedback)

  if (Array.isArray(payload.quiz_answers)) {
    const flatAnswers = payload.quiz_answers
      .map((a: any) => (typeof a === "string" ? a : String(a ?? "")))
      .filter(Boolean)
      .join(" ")
    if (flatAnswers.trim()) candidates.push(flatAnswers)
  } else if (typeof payload.quiz_answers === "string" && payload.quiz_answers.trim()) {
    candidates.push(payload.quiz_answers)
  }

  // For file_url: extract actual text — do NOT push the raw URL as content
  if (payload.file_url?.trim()) {
    const extractedFileText = await extractTextFromFileReference(payload.file_url)
    if (extractedFileText.trim()) candidates.push(extractedFileText)
  }

  if (!candidates.length) return ""

  return candidates
    .map(candidate => String(candidate).trim())
    .join("\n")
}

export async function runPlagiarismScanAction(submissionId: string) {
  try {
    const supabase = await createSupabaseServerClient()

    // 1. Fetch current submission
    const { data: currentSub, error: subErr } = await supabase
      .from("submissions")
      .select("id, assignment_id, student_id, code_content, feedback, quiz_answers, file_url")
      .eq("id", submissionId)
      .single()

    if (subErr || !currentSub) {
      return { success: false, error: "Submission not found" }
    }

    const contentToCheck = await extractSubmissionContent(currentSub)
    if (!contentToCheck.trim()) {
      // Persist the "scanned but no content" result so it doesn't show as NOT SCANNED
      const hasFile = !!currentSub.file_url?.trim()
      const noteMsg = hasFile
        ? "This submission contains a file attachment but no readable text could be extracted. The file may be an image, scanned document, or unsupported format — manual review is required."
        : "This submission has no text answer, code, or file attachment to compare against."

      // Write to DB so the badge updates from "NOT SCANNED"
      const { data: existingV } = await supabase
        .from("submission_verifications")
        .select("id")
        .eq("submission_id", submissionId)
        .maybeSingle()

      if (existingV) {
        await supabase.from("submission_verifications").update({
          plagiarism_rate: -1,
          ai_probability: 0,
          status: "NO_CONTENT",
          verified_at: new Date().toISOString(),
        }).eq("id", existingV.id)
      } else {
        await supabase.from("submission_verifications").insert({
          submission_id: submissionId,
          plagiarism_rate: -1,
          ai_probability: 0,
          status: "NO_CONTENT",
        })
      }

      return {
        success: true,
        noContent: true,
        plagiarismRate: -1,
        risk: "LOW" as const,
        matchedStudent: "N/A",
        aiProbability: 0,
        aiRisk: "LOW" as const,
        note: noteMsg,
      }
    }

    // 2. Fetch all other submissions for the same assignment (peer comparison — secondary signal)
    const { data: otherSubs } = await supabase
      .from("submissions")
      .select("id, student_id, code_content, feedback, quiz_answers, file_url")
      .eq("assignment_id", currentSub.assignment_id)
      .neq("id", submissionId)

    let highestRate = 0
    let matchedStudentName = "None"

    if (otherSubs && otherSubs.length > 0) {
      const peerStudentIds = otherSubs.map(s => s.student_id)
      const { data: users } = await supabase
        .from("users")
        .select("id, name")
        .in("id", peerStudentIds)

      for (const other of otherSubs) {
        const otherContent = await extractSubmissionContent(other)
        if (!otherContent.trim()) continue
        const rate = calculateSimilarityScore(contentToCheck, otherContent)
        if (rate > highestRate) {
          highestRate = rate
          const userObj = users?.find(u => u.id === other.student_id)
          matchedStudentName = userObj?.name || "Peer Student"
        }
      }
    }

    const peerRisk = highestRate >= 60 ? "HIGH" : highestRate >= 30 ? "MEDIUM" : "LOW"

    // -----------------------------------------------------------------------
    // PRIMARY AI DETECTION — Direct Gemini API call (accurate, semantic)
    // Falls back to local heuristic if Gemini is unavailable.
    // -----------------------------------------------------------------------
    let aiProbability = 0
    let aiRisk: "LOW" | "MEDIUM" | "HIGH" | "VERY HIGH" = "LOW"
    let aiVerdict = "UNCERTAIN"
    let aiConfidence = "LOW"
    let aiSummary: string | null = null
    let aiSignals: Record<string, boolean> | null = null
    let usedGemini = false

    const geminiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GEMINI_API_KEY

    console.log(`[AI Detect] Key present: ${!!geminiKey}, length: ${geminiKey?.trim().length ?? 0}`)

    if (geminiKey && !geminiKey.includes("placeholder") && geminiKey.trim().length > 10) {
      const detectionPrompt = `You are an expert AI content detector with deep knowledge of how LLMs (ChatGPT, Gemini, Claude, etc.) write.
Your job is to analyse the following student submission and determine how much of it was written by an AI.

STUDENT SUBMISSION:
"""
${contentToCheck.slice(0, 6000)}
"""

Analyse the text carefully for these AI writing signals:
1. Unnaturally perfect sentence structure with very uniform length
2. Overuse of transition words (however, furthermore, moreover, in conclusion, etc.)
3. Generic, surface-level explanations without concrete examples or personal voice
4. Overly formal academic tone even for simple topics
5. Repetitive sentence openers and structural patterns
6. Absence of grammatical quirks, colloquialisms, or personal experience
7. Perfect logical flow that feels templated
8. Vocabulary that is rich but lacks domain-specific depth or personal perspective
9. Suspiciously comprehensive coverage of all sub-points in balanced, equal-length sections
10. Text that reads like a textbook answer rather than a student's genuine response

Respond ONLY with compact JSON — no markdown fences, no explanation, just raw JSON:
{"aiProbability":85,"verdict":"LIKELY_AI","confidence":"HIGH","shortSummary":"One sentence here.","signals":{"uniformSentenceLength":true,"overusesTransitionWords":true,"lacksPersonalVoice":true,"overlyFormal":true,"templateStructure":true,"genericExplanations":true}}`

      const GEMINI_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"]

      for (const model of GEMINI_MODELS) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey.trim()}`
          const gRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: detectionPrompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1024,
              },
            }),
            signal: AbortSignal.timeout(20000),
          })

          console.log(`[AI Detect] Trying model: ${model}`)
          if (!gRes.ok) {
            const errBody = await gRes.text().catch(() => "")
            console.warn(`[AI Detect] ${model} returned ${gRes.status}: ${errBody.slice(0, 200)}`)
            continue
          }

          const gJson = await gRes.json()
          const rawText: string = gJson.candidates?.[0]?.content?.parts?.[0]?.text || ""
          console.log(`[AI Detect] ${model} raw text: ${rawText.slice(0, 150)}`)
          if (!rawText) continue

          // Strip markdown fences if present
          const cleaned = rawText
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim()

          // Extract JSON object even if there's surrounding text
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
          if (!jsonMatch) continue

          const parsed = JSON.parse(jsonMatch[0])
          if (typeof parsed.aiProbability !== "number") continue

          aiProbability = Math.max(0, Math.min(100, Math.round(parsed.aiProbability)))
          aiVerdict = parsed.verdict || "UNCERTAIN"
          aiConfidence = parsed.confidence || "MEDIUM"
          aiSummary = parsed.shortSummary || null
          aiSignals = parsed.signals || null
          console.log(`[AI Detect] SUCCESS — model: ${model}, aiProbability: ${aiProbability}, verdict: ${aiVerdict}`)
          usedGemini = true

          if (aiProbability >= 80) aiRisk = "VERY HIGH"
          else if (aiProbability >= 60) aiRisk = "HIGH"
          else if (aiProbability >= 35) aiRisk = "MEDIUM"
          else aiRisk = "LOW"

          break // success — stop trying more models
        } catch (modelErr) {
          console.warn(`[AI Detect] Gemini model ${model} failed:`, modelErr)
        }
      }
    }

    // Fallback to local heuristic if Gemini was not available or all models failed
    if (!usedGemini) {
      const heuristic = detectAIContent(contentToCheck)
      aiProbability = Math.round(heuristic.aiProbability)
      aiRisk = heuristic.risk
      aiVerdict = aiProbability >= 60 ? "LIKELY_AI" : aiProbability >= 35 ? "UNCERTAIN" : "LIKELY_HUMAN"
      aiConfidence = "LOW"
      aiSummary = "Analysed using local heuristics (Gemini unavailable). Results may be less accurate."
    }

    // -----------------------------------------------------------------------
    // Persist results
    // -----------------------------------------------------------------------
    const status = (highestRate >= 50 || aiProbability >= 60) ? "FLAGGED" : "CLEAN"

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
          ai_probability: aiProbability,
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
          ai_probability: aiProbability,
          status,
        })
    }

    return {
      success: true,
      plagiarismRate: highestRate,
      risk: peerRisk,
      matchedStudent: highestRate > 0 ? matchedStudentName : "None",
      aiProbability,
      aiRisk,
      aiVerdict,
      aiConfidence,
      aiSummary,
      aiSignals,
      usedGemini,
      note:
        highestRate > 0
          ? `Most similar peer text matched ${matchedStudentName}.`
          : "No strong peer textual overlap found in the current submission batch.",
    }
  } catch (err: any) {
    console.error("Plagiarism check action error:", err)
    return { success: false, error: err.message || String(err) }
  }
}
