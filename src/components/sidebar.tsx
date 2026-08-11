"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Settings,
  Sparkles,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Layers,
  UserCog,
  School,
  ClipboardList,
  BarChart3,
  User,
  Briefcase,
  ListTodo,
  Award,
  UserCheck,
  ClipboardCheck,
  FileText,
  FolderKanban,
  CreditCard,
  AlertTriangle,
  FileSignature,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ROLES } from "@/constants/roles"
import type { UserContext } from "@/lib/user-context"

type Role = typeof ROLES[keyof typeof ROLES]

type MenuItem = {
  name: string
  icon: React.ElementType
  path: string
  badge?: number | null
}

const roleMenus: Record<Role, MenuItem[]> = {
  [ROLES.SUPER_ADMIN]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/super-admin" },
    { name: "Organizations", icon: Building2, path: "/dashboard/super-admin/organizations" },
    { name: "Org Admins", icon: UserCog, path: "/dashboard/super-admin/org-admins" },
    { name: "Institutions", icon: School, path: "/dashboard/super-admin/institutions" },
    { name: "Analytics", icon: BarChart3, path: "/dashboard/super-admin/analytics" },
    { name: "Audit Logs", icon: ClipboardList, path: "/dashboard/super-admin/audit-logs" },
    { name: "Settings", icon: Settings, path: "/dashboard/super-admin/settings" },
  ],

  [ROLES.ORG_ADMIN]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/org-admin" },
  ],

  [ROLES.INSTITUTION_ADMIN]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/institution-admin" },
    { name: "Admissions", icon: FileText, path: "/dashboard/institution-admin/admissions" },
    { name: "Intake Cohorts", icon: FolderKanban, path: "/dashboard/institution-admin/intakes" },
    { name: "Billing Desk", icon: CreditCard, path: "/dashboard/institution-admin/billing" },
    { name: "Interventions", icon: AlertTriangle, path: "/dashboard/institution-admin/warnings" },
    { name: "Departments", icon: Layers, path: "/dashboard/institution-admin/departments" },
    { name: "Programs", icon: ClipboardList, path: "/dashboard/institution-admin/programs" },
    { name: "Sections", icon: BookOpen, path: "/dashboard/institution-admin/sections" },
    { name: "Faculty", icon: GraduationCap, path: "/dashboard/institution-admin/faculty" },
    { name: "Assign Courses", icon: UserCheck, path: "/dashboard/institution-admin/faculty-subjects" },
    { name: "Students", icon: Users, path: "/dashboard/institution-admin/students" },
    { name: "Parents", icon: Users, path: "/dashboard/institution-admin/parents" },
    { name: "Courses", icon: BookOpen, path: "/dashboard/institution-admin/subjects" },
    { name: "Timetable", icon: Calendar, path: "/dashboard/institution-admin/timetable" },
    { name: "Attendance", icon: ClipboardCheck, path: "/dashboard/institution-admin/attendance" },
    { name: "Events", icon: Calendar, path: "/dashboard/institution-admin/events" },
    { name: "Placements", icon: Briefcase, path: "/dashboard/institution-admin/placements" },
  ],

  [ROLES.HOD]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/hod" },
    { name: "Events", icon: Calendar, path: "/dashboard/hod/events" },
    { name: "Placements", icon: Briefcase, path: "/dashboard/hod/placements" },
  ],

  [ROLES.PROGRAM_HEAD]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/program-head" },
    { name: "Events", icon: Calendar, path: "/dashboard/program-head/events" },
    { name: "Placements", icon: Briefcase, path: "/dashboard/program-head/placements" },
  ],

  [ROLES.FACULTY]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/faculty" },
    { name: "Courses", icon: BookOpen, path: "/dashboard/faculty/subjects" },
    { name: "Timetable", icon: Calendar, path: "/dashboard/faculty/timetable" },
    { name: "Events", icon: Calendar, path: "/dashboard/faculty/events" },
    { name: "Placements", icon: Briefcase, path: "/dashboard/faculty/placements" },
    { name: "Profile", icon: User, path: "/dashboard/faculty/profile" },
  ],

  [ROLES.STUDENT]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/student" },
    { name: "Admissions", icon: FileSignature, path: "/dashboard/student/admissions" },
    { name: "Fees & Billing", icon: CreditCard, path: "/dashboard/student/billing" },
    { name: "Courses", icon: BookOpen, path: "/dashboard/student/subjects" },
    { name: "To Do Lists", icon: ListTodo, path: "/dashboard/student/todo" },
    { name: "Timetable", icon: Calendar, path: "/dashboard/student/timetable" },
    { name: "Grades", icon: Award, path: "/dashboard/student/report-card" },
    { name: "Events", icon: Calendar, path: "/dashboard/student/events" },
    { name: "Placements", icon: Briefcase, path: "/dashboard/student/placements" },
  ],

  [ROLES.PARENT]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/parent" },
    { name: "Events", icon: Calendar, path: "/dashboard/parent/events" },
  ],
}

const roleLabels: Record<Role, string> = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ORG_ADMIN]: "Org Admin",
  [ROLES.INSTITUTION_ADMIN]: "Institution Admin",
  [ROLES.HOD]: "Head of Dept",
  [ROLES.PROGRAM_HEAD]: "Program Head",
  [ROLES.FACULTY]: "Faculty",
  [ROLES.STUDENT]: "Student",
  [ROLES.PARENT]: "Parent",
}

const roleAccents: Record<Role, { bg: string; color: string }> = {
  [ROLES.SUPER_ADMIN]: { bg: "#fef3c7", color: "#92400e" },
  [ROLES.ORG_ADMIN]: { bg: "#ede9fe", color: "#5b21b6" },
  [ROLES.INSTITUTION_ADMIN]: { bg: "#dbeafe", color: "#1e40af" },
  [ROLES.HOD]: { bg: "#d1fae5", color: "#065f46" },
  [ROLES.PROGRAM_HEAD]: { bg: "#fce7f3", color: "#9d174d" },
  [ROLES.FACULTY]: { bg: "#e0f2fe", color: "#0c4a6e" },
  [ROLES.STUDENT]: { bg: "#f0fdf4", color: "#166534" },
  [ROLES.PARENT]: { bg: "#fdf4ff", color: "#701a75" },
}

export default function Sidebar({ profile: initialProfile }: { profile: UserContext | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [enabledFeatures, setEnabledFeatures] = useState<string[] | null>(null)
  const profile = initialProfile
    ? {
        name: initialProfile.name,
        role: initialProfile.role as Role,
        is_timetable_builder: initialProfile.is_timetable_builder,
      }
    : null

  useEffect(() => {
    async function getFeatures() {
      try {
        const res = await fetch("/api/org-features")
        const json = await res.json()
        setEnabledFeatures(json.features || [])
      } catch (err) {
        console.error("Failed to load org features on sidebar:", err)
      }
    }

    getFeatures()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  let baseItems = profile ? [...(roleMenus[profile.role] ?? [])] : []

  if (profile && (profile.role === ROLES.HOD || profile.role === ROLES.PROGRAM_HEAD || profile.is_timetable_builder)) {
    const facultyItems = roleMenus[ROLES.FACULTY] || []
    facultyItems.forEach((facItem) => {
      if (facItem.name === "Overview") return
      const exists = baseItems.some((item) => item.path === facItem.path)
      if (!exists) {
        baseItems.push(facItem)
      }
    })
  }

  let menu: MenuItem[] = baseItems.filter((item) => {
    if (!enabledFeatures) return true // Allow items to render while loading features
    if (item.name === "Admissions") {
      return enabledFeatures.includes("admissions_workflow")
    }
    if (item.name === "Billing Desk" || item.name === "Fees & Billing") {
      return enabledFeatures.includes("billing")
    }
    if (item.name === "Placements") {
      return enabledFeatures.includes("placements")
    }
    if (item.name === "Report Card") {
      return enabledFeatures.includes("report_cards")
    }
    if (item.name === "Intake Cohorts") {
      return enabledFeatures.includes("intake_cohorts")
    }
    if (item.name === "Interventions") {
      return enabledFeatures.includes("interventions")
    }
    return true
  })

  // Dynamic injection of Timetable Builder for HOD, Program Head, or Builder faculty
  if (profile && (profile.is_timetable_builder || profile.role === ROLES.HOD || profile.role === ROLES.PROGRAM_HEAD)) {
    const hasTimetableBuilder = menu.some(item => item.path === "/dashboard/institution-admin/timetable")
    if (!hasTimetableBuilder) {
      menu = [
        ...menu,
        {
          name: "Timetable Builder",
          icon: Calendar,
          path: "/dashboard/institution-admin/timetable"
        }
      ]
    }
  }
  const accent = profile ? roleAccents[profile.role] : { bg: "#ede9fe", color: "#5b21b6" }
  const roleLabel = profile ? roleLabels[profile.role] : "Loading..."
  const initials = profile
    ? profile.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U"

  return (
    <aside className="sticky top-0 h-screen w-72 shrink-0 overflow-y-auto border-r border-slate-200/70 bg-white/90 px-6 py-8 shadow-[0_32px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mb-10 mt-2 flex items-center justify-center px-2">
        <img src="/skillarc_logo.svg" alt="SkillArc Logo" className="h-28 w-28 object-contain transition-transform duration-200 hover:scale-[1.03]" />
      </div>

      {profile && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ background: accent.bg, color: accent.color }}
        >
          <ShieldCheck size={10} />
          {roleLabel}
        </div>
      )}

      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Navigation</div>

      <nav className="flex flex-col gap-2">
        {!profile ? (
          [1, 2, 3, 4].map((item) => (
            <div key={item} className="h-11 rounded-2xl bg-slate-100/80" />
          ))
        ) : menu.length === 0 ? (
          <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-500">No menu for role: {profile.role}</div>
        ) : (
          menu.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.path || (item.path === "/dashboard" && pathname === "/dashboard")

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${isActive ? "border border-indigo-100 bg-indigo-50 text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-600"}`} />
                <span>{item.name}</span>
                {!isActive && <ChevronRight className="ml-auto h-4 w-4 text-slate-300 transition group-hover:text-indigo-500" />}
              </Link>
            )
          })
        )}
      </nav>

      <div className="mt-6 h-px bg-slate-200/80" />

      <button
        type="button"
        onClick={handleLogout}
        className="mt-5 flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>

      <div className="mt-6 h-px bg-slate-200/80" />

      <div className="mt-6 flex items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{profile ? profile.name : "Loading..."}</p>
          <p className="text-xs text-slate-500">{roleLabel}</p>
        </div>
      </div>
    </aside>
  )
}