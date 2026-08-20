"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Users, Sparkles, Layers, Sliders, Star, FolderOpen } from "lucide-react"
import { ROLES } from "@/constants/roles"
import { createProjectWithGroupsAction, getSubjectStudentsAction } from "@/app/actions/project-groups"

interface StudentGroupsProps {
  profile: { id: string; name: string; role: string }
  initialProjects: any[]
  subjects: any[]
  studentGroups: any[]
}

const POPULAR_ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Fullstack Engineer",
  "UI/UX Designer",
  "Product Manager",
  "QA Specialist",
  "DevOps Engineer",
  "Data Scientist",
  "Embedded Engineer",
  "Hardware Specialist",
]

export default function ProjectGroupsClient({
  profile,
  initialProjects,
  subjects,
  studentGroups,
}: StudentGroupsProps) {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<"projects" | "allocate">("projects")
  const [projects] = useState(initialProjects)
  const [selectedSubjectId, setSelectedSubjectId] = useState("")
  const [teamName, setTeamName] = useState("")
  const [projectName, setProjectName] = useState("")
  const [teacherNotes, setTeacherNotes] = useState("")
  const [teamSize, setTeamSize] = useState(3)
  const [roster, setRoster] = useState<any[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [generatedTeams, setGeneratedTeams] = useState<any[]>([])
  const [overallFeedback, setOverallFeedback] = useState("")
  const [saving, setSaving] = useState(false)
  const [expandedProjId, setExpandedProjId] = useState<string | null>(null)

  async function handleSubjectChange(subId: string) {
    setSelectedSubjectId(subId)
    if (!subId) {
      setRoster([])
      setSelectedStudentIds([])
      return
    }

    setLoadingRoster(true)
    const list = await getSubjectStudentsAction(subId)
    const enriched = list.map((student, index) => ({
      ...student,
      role: POPULAR_ROLES[index % POPULAR_ROLES.length],
      skill: (index % 3) + 3,
      gender: index % 2 === 0 ? "Male" : "Female",
    }))

    setRoster(enriched)
    setSelectedStudentIds(enriched.map((student) => student.id))
    setLoadingRoster(false)
  }

  function toggleStudentSelection(studentId: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    )
  }

  function handleGenerateRandomTeams() {
    const selectedStudents = roster.filter((student) => selectedStudentIds.includes(student.id))

    if (selectedStudents.length === 0) {
      alert("Please select at least one student from the section.")
      return
    }

    const safeTeamSize = Math.max(2, Number(teamSize) || 2)
    const shuffled = [...selectedStudents].sort(() => Math.random() - 0.5)
    const teamCount = Math.max(1, Math.ceil(shuffled.length / safeTeamSize))
    const groups: string[][] = Array.from({ length: teamCount }, () => [])

    shuffled.forEach((student, index) => {
      const groupIndex = index % teamCount
      groups[groupIndex].push(student.id)
    })

    const teamPrefix = teamName.trim() || "Team"
    const teams = groups.map((members, idx) => ({
      name: `${teamPrefix} ${idx + 1}`,
      description: projectName.trim() || "Project work",
      motto: teacherNotes.trim() || "Work together and deliver a strong outcome.",
      memberIds: members,
      synergyScore: 82 + (idx % 4) * 5,
    }))

    setGeneratedTeams(teams)
    setOverallFeedback(`Random team generation completed for ${selectedStudents.length} students in groups of ${safeTeamSize}.`)
  }

  async function handlePublish() {
    if (!projectName.trim()) {
      alert("Please enter the project or work title.")
      return
    }

    if (generatedTeams.length === 0) {
      alert("Generate or create a team before publishing.")
      return
    }

    setSaving(true)
    const selectedSub = subjects.find((subject) => subject.section_id === selectedSubjectId)
    const subjectId = selectedSub?.id || ""
    const projectDescription = teacherNotes.trim() || "Faculty instructions for this team allocation."

    const result = await createProjectWithGroupsAction({
      title: projectName.trim(),
      description: projectDescription,
      subject_id: subjectId,
      faculty_id: profile.id,
      groups: generatedTeams,
    })

    if (result.success) {
      alert("Project team allocation published successfully!")
      router.refresh()
      setProjectName("")
      setTeacherNotes("")
      setTeamName("")
      setGeneratedTeams([])
      setOverallFeedback("")
      setSelectedStudentIds([])
      setSelectedSubjectId("")
      setRoster([])
      setActiveTab("projects")
      window.location.reload()
    } else {
      alert(`Failed to save: ${result.error}`)
    }

    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.04),_transparent_25%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.03),_transparent_20%)] p-6 lg:p-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Project Team Allocation</h1>
          <p className="mt-2 text-sm text-slate-500">Create teams, assign students from a selected section, and publish project work details.</p>
        </div>
      </div>

      <div className="mb-8 flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold transition ${
            activeTab === "projects"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <FolderOpen size={16} />
          {profile.role === ROLES.STUDENT ? "My Allocated Projects" : "Published Projects"}
        </button>

        {profile.role === ROLES.FACULTY && (
          <button
            onClick={() => setActiveTab("allocate")}
            className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold transition ${
              activeTab === "allocate"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Sparkles size={16} />
            Team Creation Workspace
          </button>
        )}
      </div>

      {activeTab === "projects" && (
        <div className="space-y-6">
          {profile.role === ROLES.STUDENT ? (
            studentGroups.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <Users className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-base font-semibold text-slate-900">No project groups yet</h3>
                <p className="mt-2 text-sm text-slate-500">You haven’t been assigned to any project groups yet by your faculty.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {studentGroups.map((sg: any, idx: number) => (
                  <div key={idx} className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm backdrop-blur-xl">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                        {sg.group?.group_name}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{sg.project?.title}</h3>
                    <p className="mt-2 text-sm text-slate-500">{sg.project?.description}</p>

                    <div className="mt-6 border-t border-slate-100 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Group Teammates</p>
                      <div className="space-y-2">
                        {sg.members.map((member: any, mIdx: number) => (
                          <div key={mIdx} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                            <span className="font-semibold text-slate-700">{member.users?.name}</span>
                            <span className="text-xs text-slate-400">{member.users?.email}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            projects.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <FolderOpen className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-base font-semibold text-slate-900">No projects created yet</h3>
                <p className="mt-2 text-sm text-slate-500">Use the Team Creation Workspace to form student teams and publish project work.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((proj: any) => (
                  <div key={proj.id} className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{proj.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{proj.description}</p>
                        <p className="mt-2 text-xs text-slate-400">Created: {new Date(proj.created_at).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => setExpandedProjId(expandedProjId === proj.id ? null : proj.id)}
                        className="rounded-xl border border-slate-100 px-4 py-2 text-xs font-semibold hover:bg-slate-50"
                      >
                        {expandedProjId === proj.id ? "Hide details" : "View groups"}
                      </button>
                    </div>

                    {expandedProjId === proj.id && (
                      <div className="mt-6 border-t border-slate-100 pt-6">
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                          {proj.project_groups?.map((group: any) => (
                            <div key={group.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                              <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3">{group.group_name}</h4>
                              <div className="space-y-2">
                                {group.group_members?.map((member: any, mIdx: number) => (
                                  <div key={mIdx} className="flex flex-col rounded-xl bg-white p-2 text-xs border border-slate-100">
                                    <span className="font-semibold text-slate-700">{member.users?.name}</span>
                                    <span className="text-slate-400 mt-0.5">{member.users?.email}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {activeTab === "allocate" && (
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-4">
            <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm backdrop-blur-xl">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Sliders size={18} className="text-indigo-600" />
                Team Setup
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Subject & Section
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select subject...</option>
                    {subjects.map((sub: any, idx: number) => (
                      <option key={idx} value={sub.section_id}>
                        {sub.name} ({sub.code}) - Sec {sub.section_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Alpha Team"
                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Project / Work Title
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter the project title..."
                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Team Size
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={12}
                    value={teamSize}
                    onChange={(e) => setTeamSize(Math.max(2, Number(e.target.value) || 2))}
                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Teacher Instructions / Notes
                  </label>
                  <textarea
                    rows={4}
                    value={teacherNotes}
                    onChange={(e) => setTeacherNotes(e.target.value)}
                    placeholder="Add task details, priorities, or expectations..."
                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                  <button
                    onClick={handleGenerateRandomTeams}
                    disabled={selectedStudentIds.length === 0 || loadingRoster}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    <Sparkles size={16} />
                    Randomly Generate Teams
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedTeams([])
                      setOverallFeedback("")
                      setSelectedStudentIds([])
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-8">
            <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Users size={18} className="text-indigo-600" />
                  Select Students for the Team
                </h2>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  {selectedStudentIds.length} selected
                </span>
              </div>

              {loadingRoster ? (
                <div className="py-12 text-center text-sm text-slate-400">Loading student roster...</div>
              ) : roster.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  Select a subject on the left to view the student list and choose participants.
                </div>
              ) : (
                <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-slate-100">
                  <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
                    {roster.map((student) => {
                      const isSelected = selectedStudentIds.includes(student.id)

                      return (
                        <label
                          key={student.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                            isSelected
                              ? "border-indigo-200 bg-indigo-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleStudentSelection(student.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate font-semibold text-slate-800">{student.name}</p>
                              {isSelected && <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">Selected</span>}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{student.email || "No email provided"}</p>
                            <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wide text-slate-400">
                              <span>{student.role || "Unassigned role"}</span>
                              <span>{student.skill || 3}★</span>
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {generatedTeams.length > 0 && (
              <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm backdrop-blur-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Layers size={18} className="text-indigo-600" />
                      Generated Team Preview
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">{overallFeedback || "Teams created for review."}</p>
                  </div>
                  <button
                    onClick={handlePublish}
                    disabled={saving}
                    className="rounded-2xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-100 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    {saving ? "Publishing..." : "Publish Allocation"}
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {generatedTeams.map((team, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-black text-slate-800">{team.name}</span>
                        {team.synergyScore && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                            <Star size={10} className="fill-emerald-600" />
                            {team.synergyScore}% Synergy
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 italic mb-3">{team.description}</p>

                      <div className="space-y-1.5 mt-4">
                        {team.memberIds.map((memId: string) => {
                          const student = roster.find((entry) => entry.id === memId)
                          if (!student) return null
                          return (
                            <div key={memId} className="flex items-center justify-between rounded-xl bg-white p-2 border border-slate-100 text-xs">
                              <span className="font-semibold text-slate-700">{student.name}</span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                {student.role || "Student"}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
