"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { facultySubjectService } from "@/modules/faculty-subjects/services/facultySubjectService"
import SummaryPanel from "@/modules/faculty-subjects/components/SummaryPanel"
import { BulkImportDialog } from "@/components/import/bulk-import-dialog"
import { Search, Users, X, CheckCircle2, AlertCircle, Save, Loader2 } from "lucide-react"

interface Faculty {
  id: string
  name: string
  department?: string
}

interface Subject {
  id: string
  name: string
  code: string
  semester?: number
  credits?: number
}

interface Assignment {
  faculty_id: string
  subject_id: string
}

interface Props {
  faculty: Faculty[]
  subjects: Subject[]
  assignments: Assignment[] | null
}

const AVATAR_COLORS = [
  { bg: "#dbeafe", text: "#1d4ed8" },
  { bg: "#ede9fe", text: "#6d28d9" },
  { bg: "#fef3c7", text: "#b45309" },
  { bg: "#d1fae5", text: "#065f46" },
  { bg: "#fce7f3", text: "#9d174d" },
  { bg: "#ccfbf1", text: "#0f766e" },
]

function colorFor(name: string) {
  const sum = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const sb = new Set(b)
  return a.every((x) => sb.has(x))
}

const SEMESTER_EMOJI: Record<number, string> = {
  1: "📘",
  2: "📗",
  3: "📙",
  4: "📕",
}

type Toast = { type: "success" | "error"; message: string } | null

export function FacultySubjectsClientPage({
  faculty,
  subjects,
  assignments,
}: Props) {
  const safeAssignments = assignments ?? []
  const router = useRouter()

  const [localAssignments, setLocalAssignments] = useState<Assignment[]>(safeAssignments)
  const [search, setSearch] = useState("")
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [savedSubjects, setSavedSubjects] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const [isImportOpen, setIsImportOpen] = useState(false)

  // Animation state
  const [subjectsVisible, setSubjectsVisible] = useState(false)
  const [summaryVisible, setSummaryVisible] = useState(false)
  const prevFacultyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // Trigger entrance animation when faculty changes
  useEffect(() => {
    if (selectedFaculty && selectedFaculty !== prevFacultyRef.current) {
      setSubjectsVisible(false)
      setSummaryVisible(false)
      const t1 = setTimeout(() => setSubjectsVisible(true), 60)
      const t2 = setTimeout(() => setSummaryVisible(true), 160)
      prevFacultyRef.current = selectedFaculty
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
  }, [selectedFaculty])

  const assignedCountByFaculty = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of localAssignments) {
      map[a.faculty_id] = (map[a.faculty_id] ?? 0) + 1
    }
    return map
  }, [localAssignments])

  const assignedCountBySubject = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of localAssignments) {
      map[a.subject_id] = (map[a.subject_id] ?? 0) + 1
    }
    return map
  }, [localAssignments])

  const filteredFaculty = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return faculty
    return faculty.filter((f) => f.name.toLowerCase().includes(q))
  }, [faculty, search])

  const activeFaculty = faculty.find((f) => f.id === selectedFaculty)
  const hasChanges = !sameSet(selectedSubjects, savedSubjects)

  function selectFaculty(f: Faculty) {
    if (hasChanges) {
      const confirmSwitch = window.confirm(
        "You have unsaved changes. Switch faculty anyway?"
      )
      if (!confirmSwitch) return
    }

    const assigned = localAssignments
      .filter((a) => a.faculty_id === f.id)
      .map((a) => a.subject_id)

    setSelectedFaculty(f.id)
    setSelectedSubjects(assigned)
    setSavedSubjects(assigned)
  }

  function toggleSubject(id: string) {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function selectAll() {
    setSelectedSubjects(subjects.map((s) => s.id))
  }

  function clearAll() {
    setSelectedSubjects([])
  }

  function discard() {
    setSelectedSubjects(savedSubjects)
  }

  async function handleSave() {
    if (!selectedFaculty) return
    setSaving(true)

    try {
      await facultySubjectService.replaceFacultyAssignments({
        facultyId: selectedFaculty,
        subjectIds: selectedSubjects,
      })

      // Update localAssignments state so counts and checkboxes sync reactively immediately
      const cleanAssignments = localAssignments.filter(
        (a) => a.faculty_id !== selectedFaculty
      )
      const newAssignments = selectedSubjects.map((subId) => ({
        faculty_id: selectedFaculty,
        subject_id: subId,
      }))
      setLocalAssignments([...cleanAssignments, ...newAssignments])

      setSavedSubjects(selectedSubjects)
      setToast({ type: "success", message: "Assignments saved" })
      router.refresh()
    } catch (err: any) {
      console.error(err)
      setToast({ type: "error", message: `Failed to save: ${err.message || "Unknown error"}` })
    } finally {
      setSaving(false)
    }
  }

  // Semester distribution counts
  const semester1 = subjects.filter(
    (s) => selectedSubjects.includes(s.id) && s.semester === 1
  ).length
  const semester2 = subjects.filter(
    (s) => selectedSubjects.includes(s.id) && s.semester === 2
  ).length
  const semester3 = subjects.filter(
    (s) => selectedSubjects.includes(s.id) && s.semester === 3
  ).length
  const semester4 = subjects.filter(
    (s) => selectedSubjects.includes(s.id) && s.semester === 4
  ).length

  // Max subjects for progress bar (use total subject count as ceiling)
  const maxSubjectsForBar = Math.max(subjects.length, 1)

  return (
    <div className="min-h-screen bg-[#f7f7f8] p-4 md:p-8 font-sans">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg border text-sm font-medium transition-all
            ${
              toast.type === "success"
                ? "bg-white border-emerald-200 text-emerald-700"
                : "bg-white border-red-200 text-red-700"
            }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-500" />
          ) : (
            <AlertCircle size={16} className="text-red-500" />
          )}
          {toast.message}
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Faculty Assignment Center
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Select a faculty member, then choose the subjects they teach.
            </p>
          </div>
          <button
            onClick={() => setIsImportOpen(true)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Import CSV
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr_300px] gap-6 items-start">
          {/* ── Faculty column ── */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search faculty..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[70vh] p-2 space-y-1.5">
              {filteredFaculty.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">
                  No faculty found
                </p>
              )}

              {filteredFaculty.map((f) => {
                const isActive = selectedFaculty === f.id
                const color = colorFor(f.name)
                const count = assignedCountByFaculty[f.id] ?? 0
                const barPct = Math.min((count / maxSubjectsForBar) * 100, 100)

                return (
                  <button
                    key={f.id}
                    onClick={() => selectFaculty(f)}
                    className={`w-full flex items-start gap-3 p-4 rounded-2xl text-left transition-all duration-200
                      hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]
                      ${
                        isActive
                          ? "bg-indigo-50 border border-indigo-200 scale-[1.02] shadow-sm"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                  >
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                      style={{ backgroundColor: color.bg, color: color.text }}
                    >
                      {initials(f.name)}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {f.name}
                      </p>

                      {/* Badges */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                          Faculty
                        </span>
                        {f.department && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {f.department}
                          </span>
                        )}
                      </div>

                      {/* ── STEP 1: Progress bar ── */}
                      <div className="mt-3">
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-violet-500 transition-all duration-500"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>

                      {/* ── STEP 2: Subject count + status ── */}
                      <div className="flex justify-between mt-1.5 text-[10px] text-gray-500">
                        <span>{count} Subjects</span>
                        <span
                          className={`flex items-center gap-1 font-medium ${
                            isActive ? "text-violet-500" : "text-gray-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? "bg-violet-500" : "bg-gray-300"
                            }`}
                          />
                          {isActive ? "Active" : "Idle"}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Subjects column ── */}
          <div
            className={`bg-white border border-gray-200 rounded-2xl flex flex-col transition-all duration-300 ease-out
              ${subjectsVisible && activeFaculty
                ? "opacity-100 translate-y-0"
                : activeFaculty
                ? "opacity-0 translate-y-2"
                : "opacity-100 translate-y-0"
              }`}
          >
            {!activeFaculty ? (
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                  <Users size={24} className="text-indigo-400" />
                </div>
                <p className="font-semibold text-gray-700">Select a faculty</p>
                <p className="text-sm text-gray-400 mt-1">
                  Choose someone from the left to start assigning subjects
                </p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor: colorFor(activeFaculty.name).bg,
                        color: colorFor(activeFaculty.name).text,
                      }}
                    >
                      {initials(activeFaculty.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {activeFaculty.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {selectedSubjects.length} of {subjects.length} subjects selected
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-medium">
                    <button
                      onClick={selectAll}
                      className="px-2.5 py-1 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                    >
                      Select all
                    </button>
                    <button
                      onClick={clearAll}
                      className="px-2.5 py-1 rounded-lg text-gray-500 hover:bg-gray-100 transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* ── Subject cards grid ── */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[58vh]">
                  {subjects.map((s, i) => {
                    const checked = selectedSubjects.includes(s.id)
                    const countOnSubject = assignedCountBySubject[s.id] ?? 0
                    const semEmoji = s.semester ? (SEMESTER_EMOJI[s.semester] ?? "📄") : null

                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleSubject(s.id)}
                        style={{
                          // Staggered scale-in on faculty switch
                          transitionDelay: subjectsVisible ? `${i * 18}ms` : "0ms",
                        }}
                        className={`flex items-start gap-3 p-4 rounded-2xl border text-left
                          transition-all duration-300 ease-out
                          hover:shadow-lg hover:border-violet-300 hover:-translate-y-1 active:scale-[0.97]
                          ${
                            checked
                              ? "bg-violet-50 border-violet-300 scale-100"
                              : "border-gray-200 hover:bg-gray-50 scale-[0.98]"
                          }
                          ${subjectsVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
                      >
                        {/* Circle checkbox */}
                        <div
                          className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300
                            ${checked ? "bg-violet-600 border-violet-600" : "border-gray-300"}`}
                        >
                          {checked && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </div>

                        {/* Card content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {s.name}
                            </h3>
                            {checked && (
                              <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                                Selected
                              </span>
                            )}
                          </div>

                          {/* ── STEP 3: Emoji-polished tags ── */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              {s.code}
                            </span>
                            {s.semester && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                {semEmoji} Semester {s.semester}
                              </span>
                            )}
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                              👨‍🏫 {countOnSubject} Faculty
                            </span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* ── Footer bar ── */}
                <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs font-medium">
                    {hasChanges ? (
                      <span className="flex items-center gap-1.5 text-amber-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Unsaved changes
                      </span>
                    ) : (
                      <span className="text-gray-400">All changes saved</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {hasChanges && (
                      <button
                        onClick={discard}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                      >
                        <X size={14} />
                        Discard
                      </button>
                    )}

                    {/* ── STEP 4: Upgraded Save button ── */}
                    <button
                      onClick={handleSave}
                      disabled={!hasChanges || saving}
                      className={`
                        relative flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white
                        transition-all duration-200
                        disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0
                        ${
                          !saving && hasChanges
                            ? "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-indigo-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-300 active:translate-y-0 active:shadow-sm"
                            : "bg-indigo-600"
                        }
                      `}
                    >
                      {saving ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          Save Assignments
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Summary column — desktop only ── */}
          <div
            className={`hidden xl:block transition-all duration-400 ease-out
              ${summaryVisible && activeFaculty
                ? "opacity-100 translate-x-0"
                : activeFaculty
                ? "opacity-0 translate-x-4"
                : "opacity-100 translate-x-0"
              }`}
          >
            <SummaryPanel
              facultyName={activeFaculty?.name}
              totalSubjects={subjects.length}
              selectedSubjects={selectedSubjects.length}
              hasChanges={hasChanges}
              semester1={semester1}
              semester2={semester2}
              semester3={semester3}
              semester4={semester4}
            />
          </div>
        </div>
      </div>
    </div>
  )
}