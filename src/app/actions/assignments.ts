"use server"

import { createSupabaseServerClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { detectAIContent } from "@/lib/ai-detector"

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

async function extractTextFromFileReference(fileUrl: string): Promise<string> {
  if (!fileUrl || !/^https?:\/\//i.test(fileUrl)) return ""

  try {
    const response = await fetch(fileUrl)
    const contentType = response.headers.get("content-type") || ""
    const urlLower = fileUrl.toLowerCase()

    if (contentType.includes("text/") || /\.(txt|md|csv|json|js|ts|py|java|xml|html|htm)$/i.test(urlLower)) {
      return (await response.text()).trim()
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
}) {
  const candidates: string[] = []

  if (payload.code_content?.trim()) candidates.push(payload.code_content)
  if (payload.feedback?.trim()) candidates.push(payload.feedback)
  if (typeof payload.quiz_answers === "string" && payload.quiz_answers.trim()) {
    candidates.push(payload.quiz_answers)
  }

  if (payload.file_url?.trim()) {
    candidates.push(payload.file_url)
    const extractedFileText = await extractTextFromFileReference(payload.file_url)
    if (extractedFileText.trim()) candidates.push(extractedFileText)
  }

  if (!candidates.length) return ""

  return candidates
    .map(candidate => String(candidate).trim())
    .join(" \n ")
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
      return {
        success: true,
        plagiarismRate: 0,
        risk: "LOW",
        matchedStudent: "None (No textual submission)",
        aiProbability: 0,
        aiRisk: "LOW",
        note: "The selected submission has no text answer or code payload to compare.",
      }
    }

    // 2. Fetch all other submissions for the same assignment
    const { data: otherSubs, error: othersErr } = await supabase
      .from("submissions")
      .select("id, student_id, code_content, feedback, quiz_answers, file_url")
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
        const otherContent = await extractSubmissionContent(other)
        if (!otherContent.trim()) continue

        const rate = calculateSimilarityScore(contentToCheck, otherContent)
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

    // Run AI Detection checking using translated stylometric engine
    const aiResult = detectAIContent(contentToCheck)

    // 3. Upsert into submission_verifications
    // Flag if classmate copying is high OR AI generation is high
    const status = (highestRate >= 50 || aiResult.aiProbability >= 60) ? "FLAGGED" : "CLEAN"

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
          ai_probability: aiResult.aiProbability,
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
          ai_probability: aiResult.aiProbability,
          status,
        })
    }

    return {
      success: true,
      plagiarismRate: highestRate,
      risk,
      matchedStudent: highestRate > 0 ? matchedStudentName : "None",
      aiProbability: aiResult.aiProbability,
      aiRisk: aiResult.risk,
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