import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"
import Link from "next/link"
import { Clock, FileText, Brain, FileCode, AlertCircle, CheckCircle2, BookOpen } from "lucide-react"

export const dynamic = "force-dynamic"

const TYPE_CONFIG = {
  Assignment: {
    label: "Assignments",
    icon: FileText,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    borderColor: "border-blue-200",
    headerBg: "bg-indigo-600",
  },
  Quiz: {
    label: "Quizzes",
    icon: Brain,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-700",
    borderColor: "border-purple-200",
    headerBg: "bg-purple-600",
  },
  "Coding Assignment": {
    label: "Coding Tasks",
    icon: FileCode,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    borderColor: "border-emerald-200",
    headerBg: "bg-emerald-600",
  },
} as const

function getDueDateStatus(dueDate: string | null) {
  if (!dueDate) return null
  const due = new Date(dueDate)
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { label: "Overdue", color: "text-red-600 bg-red-50 border border-red-200" }
  if (diffDays === 0) return { label: "Due Today", color: "text-orange-600 bg-orange-50 border border-orange-200" }
  if (diffDays === 1) return { label: "Due Tomorrow", color: "text-orange-500 bg-orange-50 border border-orange-200" }
  if (diffDays <= 3) return { label: `Due in ${diffDays} days`, color: "text-amber-600 bg-amber-50 border border-amber-200" }
  return { label: `Due ${due.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`, color: "text-slate-600 bg-slate-50 border border-slate-200" }
}

export default async function StudentTodoPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: userProfile } = await supabase
    .from("users")
    .select("id, role, institution_id")
    .eq("id", user.id)
    .single()

  if (!userProfile || userProfile.role !== ROLES.STUDENT) redirect("/dashboard")

  const { data: studentData } = await supabase
    .from("students")
    .select("id, section_id, program_id, semester")
    .eq("id", user.id)
    .single()

  const profile = { ...userProfile, ...studentData }

  // 1. Fetch enrolled subjects to filter assignments
  const { data: timetableRows = [] } = profile.section_id
    ? await supabase
        .from("timetable_slots")
        .select("subject_id")
        .eq("institution_id", profile.institution_id)
        .eq("section_id", profile.section_id)
    : { data: [] }

  let subjectIds = Array.from(new Set((timetableRows as Array<any>).map((slot) => slot.subject_id).filter(Boolean))) as string[]

  if (subjectIds.length === 0 && (profile.program_id || profile.institution_id)) {
    let subQuery = supabase
      .from("subjects")
      .select("id")
    if (profile.program_id) {
      subQuery = subQuery.eq("program_id", profile.program_id)
    } else if (profile.institution_id) {
      subQuery = subQuery.eq("institution_id", profile.institution_id)
    }
    if (profile.semester) {
      subQuery = subQuery.eq("semester", profile.semester)
    }
    const { data: programSubjects } = await subQuery
    if (programSubjects?.length) {
      subjectIds = programSubjects.map((s: any) => s.id)
    }
  }

  if (!subjectIds.length) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center bg-white border rounded-3xl shadow-sm">
        <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700">All caught up!</h3>
        <p className="text-gray-400 mt-2">No subjects are assigned to your section.</p>
      </div>
    )
  }

  // Fetch subject names mapping
  const { data: subjects = [] } = await supabase
    .from("subjects")
    .select("id, name, code")
    .in("id", subjectIds)

  const subjectMap = new Map((subjects ?? []).map(s => [s.id, s]))

  // 2. Fetch all assignments for these subjects
  const { data: allAssignments = [] } = await supabase
    .from("assignments")
    .select("*")
    .in("subject_id", subjectIds)

  // Filter assignments targeted at the student's section
  const sectionId = profile.section_id
  const sectionAssignments = (allAssignments ?? []).filter((a: any) => {
    if (a.type === "Material") return false // Materials are not Todo items
    if (!a.section_ids || a.section_ids.length === 0) return true
    return a.section_ids.includes(sectionId)
  })

  // 3. Fetch submissions by this student
  const { data: submissions = [] } = await supabase
    .from("submissions")
    .select("assignment_id")
    .eq("student_id", user.id)

  const submittedSet = new Set((submissions ?? []).map(s => s.assignment_id))

  // Group pending assignments
  const pendingAssignments = sectionAssignments.filter(a => !submittedSet.has(a.id))

  const pendingByType = {
    Assignment: pendingAssignments.filter(a => a.type === "Assignment" || a.type === "assignment"),
    Quiz: pendingAssignments.filter(a => a.type === "Quiz" || a.type === "quiz"),
    "Coding Assignment": pendingAssignments.filter(a => a.type === "Coding Assignment" || a.type === "coding"),
  }

  const totalPending = pendingAssignments.length

  return (
    <div className="max-w-4xl w-full mx-auto p-8 space-y-8 font-sans text-left">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="w-7 h-7 text-indigo-600" />
            To-Do List & Deadlines
          </h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">All pending assignments, organized by coursework type.</p>
        </div>
        {totalPending > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-red-700 font-bold text-xs">{totalPending} pending</span>
          </div>
        )}
      </div>

      {totalPending === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700">All caught up!</h3>
          <p className="text-gray-400 text-sm mt-2">No pending assignments, quizzes, or coding tasks.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {(Object.entries(pendingByType) as [keyof typeof TYPE_CONFIG, typeof pendingAssignments][]).map(([type, items]) => {
            if (items.length === 0) return null
            const config = TYPE_CONFIG[type]
            const Icon = config.icon

            return (
              <div key={type} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className={`${config.headerBg} px-6 py-4 flex items-center justify-between text-white`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-white font-extrabold text-base">{config.label}</h2>
                  </div>
                  <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {items.length} pending
                  </span>
                </div>

                {/* Items */}
                <div className="divide-y divide-slate-100">
                  {items
                    .sort((a, b) => {
                      if (!a.due_date) return 1
                      if (!b.due_date) return -1
                      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                    })
                    .map(item => {
                      const subjectInfo = subjectMap.get(item.subject_id)
                      const dueDateStatus = getDueDateStatus(item.due_date)

                      return (
                        <Link
                          key={item.id}
                          href={`/dashboard/student/subjects/${item.subject_id}/assignments/${item.id}`}
                          className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
                        >
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${config.iconBg}`}>
                            <Icon className={`w-5 h-5 ${config.iconColor}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 text-sm transition-colors truncate">
                              {item.title}
                            </h3>
                            {subjectInfo && (
                              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
                                <BookOpen className="w-3.5 h-3.5" />
                                <span className="truncate">{subjectInfo.name} ({subjectInfo.code})</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            {dueDateStatus && (
                              <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${dueDateStatus.color}`}>
                                {dueDateStatus.label}
                              </span>
                            )}
                            {item.max_score && (
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${config.badgeBg} ${config.badgeText}`}>
                                {item.max_score} pts
                              </span>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
