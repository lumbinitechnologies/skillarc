"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Users, 
  Sparkles, 
  Layers, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRightLeft, 
  Plus, 
  Search, 
  Star, 
  Trash2, 
  BookOpen,
  FolderOpen
} from "lucide-react"
import { ROLES } from "@/constants/roles"
import { 
  createProjectWithGroupsAction, 
  getSubjectStudentsAction, 
  suggestTeamsAIAction 
} from "@/app/actions/project-groups"

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
  "Hardware Specialist"
]

const SQUAD_THEMES = [
  { name: "Fantasy Adventurers 🧙‍♂️", id: "fantasy", description: "Guilds of Mages, Rogues, and Warriors." },
  { name: "Sci-Fi Starfleets 🚀", id: "scifi", description: "Cosmic task forces exploring deep space." },
  { name: "Mighty Animals 🦁", id: "animal", description: "Apex predator alliances." },
  { name: "Neon Cyber Hackers 💻", id: "cyber", description: "Consortium of netrunners and coders." },
  { name: "Classic Numbered Squads 📋", id: "classic", description: "Professional, straightforward naming." }
]

const THEME_NAMES: Record<string, { names: string[]; mottos: string[]; descriptions: string[] }> = {
  fantasy: {
    names: ["Aether Wizards", "Shadow Guild", "Crimson Paladins", "Iron Vanguard", "Dragon Sentinels", "Mystic Nomads"],
    mottos: ["Through fire and arcane knowledge!", "We strike from the unseen shadows.", "Valiance is our shield.", "Unbreakable like deep mountain stone."],
    descriptions: [" Esoteric knowledge and strategic planning.", "Agility, deception, and speed.", "Divine defense and support healing."]
  },
  scifi: {
    names: ["Hyperion Crew", "Andromeda Sector", "Nebula Raiders", "Chronos Division", "Solar Sentries"],
    mottos: ["To the edge of the universe!", "Boundless stars, unbroken vision.", "Collect, adapt, and fly."],
    descriptions: ["Interstellar intelligence and warp technology.", "Planetary colonization and resource gathering.", "Aggressive tactical squadron equipped with shields."]
  },
  animal: {
    names: ["Apex Panthers", "Grizzly Syndicate", "Viper Strike Force", "Golden Eagles", "Timber Wolves"],
    mottos: ["Unseen stalkers of the night!", "Raw power, unbreakable resolve.", "One strike, absolute resolve."],
    descriptions: ["Swift, quiet deployment and adaptation.", "Powerhouse squad built to handle heavy workload.", "Calculated precision operations."]
  },
  cyber: {
    names: ["Netrunners Prime", "Buffer Overlords", "Quantum Daemons", "Circuit Breakers", "Zero-Day Syndicate"],
    mottos: ["We code the reality.", "Overriding limits in real time.", "Entangled in superior strategy."],
    descriptions: ["Deep-penetration security and network routing.", "Heavy-compute optimization and pipelines.", "Neural nets and mathematical regressions."]
  },
  classic: {
    names: ["Squad Alpha", "Squad Beta", "Squad Gamma", "Squad Delta", "Squad Epsilon"],
    mottos: ["First in priority, first in result.", "Synergy through continuous balance.", "The solid foundation of operations."],
    descriptions: ["Foundational core squad focused on primary execution.", "Secondary strategic squad specializing in modular support.", "Analytics and verification wing."]
  }
}

export default function ProjectGroupsClient({
  profile,
  initialProjects,
  subjects,
  studentGroups
}: StudentGroupsProps) {
  const router = useRouter()

  // General Tabs
  const [activeTab, setActiveTab] = useState<"projects" | "allocate">("projects")
  
  // Faculty State
  const [projects, setProjects] = useState(initialProjects)
  const [selectedSubjectId, setSelectedSubjectId] = useState("")
  const [projectTitle, setProjectTitle] = useState("")
  const [projectDesc, setProjectDesc] = useState("")
  
  // Roster details
  const [roster, setRoster] = useState<any[]>([])
  const [loadingRoster, setLoadingRoster] = useState(false)
  
  // Separation settings
  const [teamCount, setTeamCount] = useState(3)
  const [themeId, setThemeId] = useState("classic")
  const [focus, setFocus] = useState<"skill_balance" | "role_distribution" | "random">("skill_balance")
  
  // Allocation Outcome
  const [generatedTeams, setGeneratedTeams] = useState<any[]>([])
  const [overallFeedback, setOverallFeedback] = useState("")
  const [allocating, setAllocating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Expandable published projects
  const [expandedProjId, setExpandedProjId] = useState<string | null>(null)

  // Load students when subject is selected
  async function handleSubjectChange(subId: string) {
    setSelectedSubjectId(subId)
    if (!subId) {
      setRoster([])
      return
    }

    setLoadingRoster(true)
    const list = await getSubjectStudentsAction(subId)
    // Enrich list with default roles/skills for interactive allocation preview
    const enriched = list.map((st, i) => ({
      ...st,
      role: POPULAR_ROLES[i % POPULAR_ROLES.length],
      skill: (i % 3) + 3, // 3, 4, or 5 stars
      gender: i % 2 === 0 ? "Male" : "Female"
    }))
    setRoster(enriched)
    setLoadingRoster(false)
  }

  // Update inline role/skill
  function handleRosterUpdate(id: string, field: "role" | "skill", val: any) {
    setRoster(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m))
  }

  // Run Manual Offline Split
  function handleOfflineSplit() {
    if (roster.length === 0) return
    
    const theme = THEME_NAMES[themeId] || THEME_NAMES.classic
    const teams = Array.from({ length: teamCount }, (_, i) => {
      const presetName = theme.names[i % theme.names.length]
      const motto = theme.mottos[i % theme.mottos.length]
      const desc = theme.descriptions[i % theme.descriptions.length]
      return {
        name: `${presetName} ${i >= theme.names.length ? Math.floor(i / theme.names.length) + 1 : ""}`.trim(),
        description: desc,
        motto,
        memberIds: [] as string[],
        synergyScore: 80 + (i % 3) * 5
      }
    })

    if (focus === "random") {
      const shuffled = [...roster].sort(() => Math.random() - 0.5)
      shuffled.forEach((m, idx) => {
        teams[idx % teamCount].memberIds.push(m.id)
      })
    } else if (focus === "skill_balance") {
      const sorted = [...roster].sort((a, b) => b.skill - a.skill)
      sorted.forEach(m => {
        let minTeam = teams[0]
        let minSkill = Infinity
        for (const t of teams) {
          const tSkill = t.memberIds.reduce((sum, id) => sum + (roster.find(r => r.id === id)?.skill || 0), 0)
          if (tSkill < minSkill) {
            minSkill = tSkill
            minTeam = t
          }
        }
        minTeam.memberIds.push(m.id)
      })
    } else {
      // Role distribution
      const rolesMap: Record<string, any[]> = {}
      roster.forEach(m => {
        if (!rolesMap[m.role]) rolesMap[m.role] = []
        rolesMap[m.role].push(m)
      })
      Object.keys(rolesMap).forEach((role, idx) => {
        rolesMap[role].forEach((m, mIdx) => {
          teams[(idx + mIdx) % teamCount].memberIds.push(m.id)
        })
      })
    }

    setGeneratedTeams(teams)
    setOverallFeedback("Offline structural split completed successfully.")
  }

  // Run Gemini AI Split
  async function handleAISplit() {
    if (roster.length === 0) return
    setAllocating(true)
    
    const membersData = roster.map(r => ({
      id: r.id,
      name: r.name,
      role: r.role,
      skill: r.skill,
      gender: r.gender
    }))

    const res = (await suggestTeamsAIAction(membersData, {
      teamCount,
      theme: themeId,
      focus
    })) as any

    if (res.success && res.data) {
      setGeneratedTeams(res.data.teams || [])
      setOverallFeedback(res.data.overallFeedback || "AI split complete.")
    } else {
      // Fallback to offline if API Key is not set or failed
      handleOfflineSplit()
    }
    setAllocating(false)
  }

  // Save allocations to Database
  async function handlePublish() {
    if (!projectTitle.trim()) {
      alert("Please enter a project title.")
      return
    }
    if (generatedTeams.length === 0) {
      alert("No teams generated to publish.")
      return
    }

    setSaving(true)
    const selectedSub = subjects.find(s => s.section_id === selectedSubjectId)
    const subjectId = selectedSub?.id || ""

    const result = await createProjectWithGroupsAction({
      title: projectTitle,
      description: projectDesc,
      subject_id: subjectId,
      faculty_id: profile.id,
      groups: generatedTeams
    })

    if (result.success) {
      alert("Project Group Allocations published successfully!")
      router.refresh()
      // Reset
      setProjectTitle("")
      setProjectDesc("")
      setGeneratedTeams([])
      setRoster([])
      setSelectedSubjectId("")
      setActiveTab("projects")
      window.location.reload()
    } else {
      alert(`Failed to save: ${result.error}`)
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.04),_transparent_25%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.03),_transparent_20%)] p-6 lg:p-8">
      
      {/* Header Banner */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Project Group Allocation</h1>
          <p className="mt-2 text-sm text-slate-500">Divide, balance, and configure project groups with Google Gemini AI integration.</p>
        </div>
      </div>

      {/* Shared Tabs Navigation */}
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
            AI Segregation Workspace
          </button>
        )}
      </div>

      {/* Workspace Area */}
      {activeTab === "projects" && (
        <div className="space-y-6">
          {profile.role === ROLES.STUDENT ? (
            studentGroups.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <Users className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-base font-semibold text-slate-900">No project groups yet</h3>
                <p className="mt-2 text-sm text-slate-500">You haven't been assigned to any project groups yet by your faculty.</p>
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
            /* Faculty or Admin Projects List */
            projects.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <FolderOpen className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-base font-semibold text-slate-900">No projects created yet</h3>
                <p className="mt-2 text-sm text-slate-500">Switch to the Segregation Workspace tab to auto-allocate students using Gemini.</p>
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
                              <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3">
                                {group.group_name}
                              </h4>
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
          {/* Settings panel */}
          <div className="space-y-6 lg:col-span-4">
            <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm backdrop-blur-xl">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Sliders size={18} className="text-indigo-600" />
                Segregation Parameters
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Subject & Enrolled Batch
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
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="Enter project name..."
                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Project Description
                  </label>
                  <textarea
                    rows={3}
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    placeholder="Brief description..."
                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Target Squad Count
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={12}
                    value={teamCount}
                    onChange={(e) => setTeamCount(parseInt(e.target.value) || 2)}
                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Designation Theme
                  </label>
                  <select
                    value={themeId}
                    onChange={(e) => setThemeId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    {SQUAD_THEMES.map(theme => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Balance Metric Focus
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFocus("skill_balance")}
                      className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold transition border ${
                        focus === "skill_balance"
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      Skill Balanced
                    </button>
                    <button
                      onClick={() => setFocus("role_distribution")}
                      className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold transition border ${
                        focus === "role_distribution"
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      Role Distribution
                    </button>
                    <button
                      onClick={() => setFocus("random")}
                      className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold transition border ${
                        focus === "random"
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      Random
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                  <button
                    onClick={handleAISplit}
                    disabled={roster.length === 0 || allocating}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    <Sparkles size={16} />
                    {allocating ? "Running AI Allocation..." : "Allocate via Gemini AI"}
                  </button>

                  <button
                    onClick={handleOfflineSplit}
                    disabled={roster.length === 0}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    Manual Offline Split
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* Student details grid & Allocation Preview */}
          <div className="space-y-6 lg:col-span-8">
            {/* Student list grid */}
            <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Users size={18} className="text-indigo-600" />
                  Roster Profiles
                </h2>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  {roster.length} students enrolled
                </span>
              </div>

              {loadingRoster ? (
                <div className="py-12 text-center text-sm text-slate-400">Loading student roster...</div>
              ) : roster.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  Select a subject on the left to configure roles & skill ratings.
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto border border-slate-100 rounded-2xl">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Name</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Designated Role</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Self Rating (Skill)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {roster.map((student) => (
                        <tr key={student.id}>
                          <td className="px-4 py-2 font-semibold text-slate-800">{student.name}</td>
                          <td className="px-4 py-2">
                            <select
                              value={student.role}
                              onChange={(e) => handleRosterUpdate(student.id, "role", e.target.value)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none"
                            >
                              {POPULAR_ROLES.map(role => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={student.skill}
                              onChange={(e) => handleRosterUpdate(student.id, "skill", parseInt(e.target.value) || 3)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none"
                            >
                              <option value="1">1 Star</option>
                              <option value="2">2 Stars</option>
                              <option value="3">3 Stars</option>
                              <option value="4">4 Stars</option>
                              <option value="5">5 Stars</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Generated Teams results */}
            {generatedTeams.length > 0 && (
              <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm backdrop-blur-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Layers size={18} className="text-indigo-600" />
                      Allocation Preview
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">{overallFeedback}</p>
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
                      <p className="text-xs text-slate-400 italic mb-3">"{team.motto}"</p>
                      
                      <div className="space-y-1.5 mt-4">
                        {team.memberIds.map((memId: string) => {
                          const student = roster.find(r => r.id === memId)
                          if (!student) return null
                          return (
                            <div key={memId} className="flex items-center justify-between rounded-xl bg-white p-2 border border-slate-100 text-xs">
                              <span className="font-semibold text-slate-700">{student.name}</span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                {student.role}
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
