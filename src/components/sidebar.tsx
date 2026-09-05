"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
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
  UserCircle2,
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
  [ROLES.SUPER_ADMIN]: { bg: "rgba(234,173,98,0.15)", color: "#EAAD62" },
  [ROLES.ORG_ADMIN]: { bg: "rgba(139,92,246,0.15)", color: "#A78BFA" },
  [ROLES.INSTITUTION_ADMIN]: { bg: "rgba(56,189,248,0.15)", color: "#38BDF8" },
  [ROLES.HOD]: { bg: "rgba(16,185,129,0.15)", color: "#34D399" },
  [ROLES.PROGRAM_HEAD]: { bg: "rgba(236,72,153,0.15)", color: "#F472B6" },
  [ROLES.FACULTY]: { bg: "rgba(14,165,233,0.15)", color: "#38BDF8" },
  [ROLES.STUDENT]: { bg: "rgba(229,125,55,0.15)", color: "#E57D37" },
  [ROLES.PARENT]: { bg: "rgba(168,85,247,0.15)", color: "#C084FC" },
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
    window.location.replace("/auth/login")
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
    if (item.name === "Report Card" || item.name === "Grades") {
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
    <>
      <div className="sidebar-backdrop" onClick={() => document.body.classList.remove("sidebar-open")} />
      <aside className="sidebar-mobile sticky top-0 flex h-screen w-72 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white px-6 py-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden self-start">
        <div className="mb-6 mt-1 flex items-center justify-center px-1">
          <img src="/skillarc_logo.svg" alt="SkillArc Logo" className="h-24 w-auto max-w-[240px] object-contain drop-shadow-[0_0_18px_rgba(229,125,55,0.25)] transition-transform duration-200 hover:scale-[1.02]" />
        </div>

        {profile && (
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#3A6DAF]/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ background: accent.bg, color: accent.color }}
          >
            <ShieldCheck size={10} />
            {roleLabel}
          </div>
        )}

        <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-gray-500">Navigation</div>

        <nav className="flex flex-col gap-2 pb-2">
          <AnimatePresence>
            {!profile ? (
              [1, 2, 3, 4].map((item) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -30, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.5, delay: item * 0.08, ease: [0.34, 1.56, 0.64, 1] }}
                  className="h-11 rounded-2xl bg-gray-100"
                />
              ))
            ) : menu.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-3xl bg-gray-100 p-4 text-sm text-gray-600"
              >
                No menu for role: {profile.role}
              </motion.div>
            ) : (
              <motion.div
                className="flex flex-col gap-2"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.09,
                      delayChildren: 0.15,
                    },
                  },
                }}
              >
                {menu.map((item, idx) => {
                  const Icon = item.icon
                  const isActive = pathname === item.path || (item.path === "/dashboard" && pathname === "/dashboard")

                  return (
                    <motion.div
                      key={item.path}
                      variants={{
                        hidden: { opacity: 0, x: -35, y: 8, filter: "blur(6px)" },
                        visible: {
                          opacity: 1,
                          x: 0,
                          y: 0,
                          filter: "blur(0px)",
                          transition: {
                            duration: 0.6,
                            type: "spring",
                            stiffness: 80,
                            damping: 12,
                          },
                        },
                      }}
                    >
                      <motion.div
                        whileHover={{ x: 3 }}
                        transition={{ type: "spring", stiffness: 250, damping: 15 }}
                      >
                        <Link
                          href={item.path}
                          onClick={() => document.body.classList.remove("sidebar-open")}
                          className={`group flex items-center gap-3 py-3 px-4 text-sm font-semibold tracking-[0.01em] rounded-2xl transition-all duration-200 ${
                            isActive
                              ? "border-l-4 border-l-[#E57D37] rounded-r-2xl bg-gray-100 text-gray-900 shadow-[0_4px_12px_rgba(229,125,55,0.12)] pl-3.5"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:pl-5"
                          }`}
                        >
                          <motion.div
                            whileHover={{ scale: 1.15, rotate: 5 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 300, damping: 12 }}
                          >
                            <Icon className={`h-4 w-4 ${isActive ? "text-[#E57D37]" : "text-gray-600 group-hover:text-gray-900"}`} />
                          </motion.div>
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                          >
                            {item.name}
                          </motion.span>
                          {!isActive && (
                            <motion.div
                              className="ml-auto"
                              whileHover={{ x: 6, opacity: 1 }}
                              initial={{ opacity: 0.5 }}
                              transition={{ type: "spring", stiffness: 250, damping: 15 }}
                            >
                              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                            </motion.div>
                          )}
                        </Link>
                      </motion.div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        <motion.div
          className="mt-6 h-px bg-[#3A6DAF]/30"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        />

        <motion.div
          initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, delay: 0.45, type: "spring", stiffness: 80, damping: 12 }}
        >
          <motion.div
            whileHover={{ scale: 1.02, x: 3 }}
            transition={{ type: "spring", stiffness: 250, damping: 15 }}
          >
            <Link
              href="/dashboard/account/profile"
              onClick={() => document.body.classList.remove("sidebar-open")}
              className={`mt-5 flex items-center gap-3 py-3 px-4 text-sm font-semibold tracking-[0.01em] rounded-2xl transition-all duration-200 ${
                pathname.startsWith("/dashboard/account")
                  ? "border-l-4 border-l-[#E57D37] rounded-r-2xl bg-gray-100 text-gray-900 shadow-[0_4px_12px_rgba(229,125,55,0.12)] pl-3.5"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:pl-5"
              }`}
            >
              <motion.div whileHover={{ scale: 1.15, rotate: 5 }} whileTap={{ scale: 0.9 }} transition={{ type: "spring", stiffness: 300, damping: 12 }}>
                <UserCircle2 className="h-4 w-4 text-gray-600" />
              </motion.div>
              Account
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, delay: 0.5, type: "spring", stiffness: 80, damping: 12 }}
        >
          <motion.button
            type="button"
            onClick={async () => {
              document.body.classList.remove("sidebar-open")
              await handleLogout()
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-5 flex w-full cursor-pointer items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition-all duration-200 hover:bg-gray-50 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} transition={{ type: "spring", stiffness: 300, damping: 12 }}>
              <LogOut className="h-4 w-4 text-gray-600" />
            </motion.div>
            Log out
          </motion.button>
        </motion.div>

        <motion.div
          className="mt-6 h-px bg-[#3A6DAF]/30"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
        />

        <motion.div
          className="mt-6 flex items-center gap-3 rounded-[24px] border border-gray-200 bg-gray-50 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
          initial={{ opacity: 0, scale: 0.85, y: 20, filter: "blur(6px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: 0.6, type: "spring", stiffness: 70, damping: 12 }}
          whileHover={{ scale: 1.03, y: -2 }}
        >
          <motion.div
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E57D37] to-[#EAAD62] text-[#14234B] shadow-md font-semibold"
            whileHover={{ rotateZ: 8, scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 250, damping: 12 }}
          >
            {initials}
          </motion.div>
          <div className="min-w-0">
            <motion.p
              className="truncate text-sm font-semibold text-gray-900"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
            >
              {profile ? profile.name : "Loading..."}
            </motion.p>
            <motion.p
              className="text-xs text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {roleLabel}
            </motion.p>
          </div>
        </motion.div>
      </aside>
    </>
  )
}