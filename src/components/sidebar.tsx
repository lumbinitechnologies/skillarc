"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
import type { DashboardSession } from "@/lib/dashboard-session"

type Role = typeof ROLES[keyof typeof ROLES]

type MenuItem = {
  name: string
  icon: React.ElementType
  path: string
  badge?: number | null
  prefetch?: boolean
}

const roleMenus: Record<Role, MenuItem[]> = {
  [ROLES.SUPER_ADMIN]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/super-admin", prefetch: true },
    { name: "Organizations", icon: Building2, path: "/dashboard/super-admin/organizations" },
    { name: "Org Admins", icon: UserCog, path: "/dashboard/super-admin/org-admins" },
    { name: "Institutions", icon: School, path: "/dashboard/super-admin/institutions" },
    { name: "Analytics", icon: BarChart3, path: "/dashboard/super-admin/analytics" },
    { name: "Audit Logs", icon: ClipboardList, path: "/dashboard/super-admin/audit-logs" },
    { name: "Settings", icon: Settings, path: "/dashboard/super-admin/settings" },
  ],

  [ROLES.ORG_ADMIN]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/org-admin", prefetch: true },
  ],

  [ROLES.INSTITUTION_ADMIN]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/institution-admin", prefetch: true },
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
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/hod", prefetch: true },
    { name: "Events", icon: Calendar, path: "/dashboard/hod/events" },
    { name: "Placements", icon: Briefcase, path: "/dashboard/hod/placements" },
  ],

  [ROLES.PROGRAM_HEAD]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/program-head", prefetch: true },
    { name: "Events", icon: Calendar, path: "/dashboard/program-head/events" },
    { name: "Placements", icon: Briefcase, path: "/dashboard/program-head/placements" },
  ],

  [ROLES.FACULTY]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/faculty", prefetch: true },
    { name: "Courses", icon: BookOpen, path: "/dashboard/faculty/subjects" },
    { name: "Timetable", icon: Calendar, path: "/dashboard/faculty/timetable" },
    { name: "Events", icon: Calendar, path: "/dashboard/faculty/events" },
    { name: "Placements", icon: Briefcase, path: "/dashboard/faculty/placements" },
    { name: "Profile", icon: User, path: "/dashboard/faculty/profile" },
  ],

  [ROLES.STUDENT]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/student", prefetch: true },
    { name: "Attendance", icon: UserCheck, path: "/dashboard/student/attendance" },
    { name: "Courses", icon: BookOpen, path: "/dashboard/student/subjects" },
    { name: "To Do Lists", icon: ListTodo, path: "/dashboard/student/todo" },
    { name: "Timetable", icon: Calendar, path: "/dashboard/student/timetable" },
    { name: "Grades", icon: Award, path: "/dashboard/student/report-card" },
    { name: "Admissions", icon: FileSignature, path: "/dashboard/student/admissions" },
    { name: "Fees & Billing", icon: CreditCard, path: "/dashboard/student/billing" },
    { name: "Events", icon: Calendar, path: "/dashboard/student/events" },
    { name: "Placements", icon: Briefcase, path: "/dashboard/student/placements" },
  ],

  [ROLES.PARENT]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/parent", prefetch: true },
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
  [ROLES.ORG_ADMIN]: { bg: "rgba(58,109,175,0.15)", color: "#3A6DAF" },
  [ROLES.INSTITUTION_ADMIN]: { bg: "rgba(56,189,248,0.15)", color: "#38BDF8" },
  [ROLES.HOD]: { bg: "rgba(16,185,129,0.15)", color: "#34D399" },
  [ROLES.PROGRAM_HEAD]: { bg: "rgba(229,125,55,0.15)", color: "#E57D37" },
  [ROLES.FACULTY]: { bg: "rgba(14,165,233,0.15)", color: "#38BDF8" },
  [ROLES.STUDENT]: { bg: "rgba(229,125,55,0.15)", color: "#E57D37" },
  [ROLES.PARENT]: { bg: "rgba(234,173,98,0.15)", color: "#EAAD62" },
}

export default function Sidebar({ profile: initialProfile }: { profile: DashboardSession | null }) {
  const pathname = usePathname()
  const profile = initialProfile
    ? {
        name: initialProfile.name,
        role: initialProfile.role as Role,
        profile_image_url: initialProfile.profile_image_url,
        is_timetable_builder: initialProfile.is_timetable_builder,
        features: initialProfile.features,
      }
    : null

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.replace("/auth/login")
  }

  const baseItems = profile ? [...(roleMenus[profile.role] ?? [])] : []

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
    const enabledFeatures = profile?.features
    if (!enabledFeatures) return true
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
  const accent = profile ? roleAccents[profile.role] : { bg: "rgba(229,125,55,0.15)", color: "#E57D37" }
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
                {menu.map((item) => {
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
                          prefetch={item.prefetch ?? false}
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

        <div className="mt-auto pt-4 space-y-2.5">
          <div className="h-px bg-slate-100" />

          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gray-400 px-1">
            Account & Session
          </div>

          {/* Highlighted Account Item */}
          <Link
            href="/dashboard/account/profile"
            prefetch={false}
            onClick={() => document.body.classList.remove("sidebar-open")}
            className={`group flex items-center justify-between py-2.5 px-3.5 text-sm font-semibold rounded-2xl transition-all duration-200 border ${
              pathname.startsWith("/dashboard/account")
                ? "bg-gradient-to-r from-amber-50 to-orange-50/60 border-amber-300/80 text-[#E57D37] shadow-sm font-bold"
                : "bg-slate-50/90 hover:bg-amber-50/50 border-slate-200/70 hover:border-amber-200 text-slate-700 hover:text-slate-900 shadow-xs"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-xl transition-colors ${
                pathname.startsWith("/dashboard/account")
                  ? "bg-[#E57D37] text-white shadow-xs"
                  : "bg-white text-slate-500 group-hover:text-[#E57D37] shadow-xs border border-slate-100"
              }`}>
                <UserCircle2 className="h-4 w-4" />
              </div>
              <span className="tracking-[0.01em]">Account</span>
            </div>
            <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${
              pathname.startsWith("/dashboard/account") ? "text-[#E57D37]" : "text-slate-400 group-hover:text-slate-600"
            }`} />
          </Link>

          {/* Highlighted Log out Button */}
          <button
            type="button"
            onClick={async () => {
              document.body.classList.remove("sidebar-open")
              await handleLogout()
            }}
            className="group flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200/80 bg-white hover:bg-red-50/70 hover:border-red-200/80 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:text-red-600 transition-all duration-200 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-xl bg-slate-100 text-slate-500 group-hover:bg-red-100/90 group-hover:text-red-600 transition-colors shadow-xs">
                <LogOut className="h-4 w-4" />
              </div>
              <span className="tracking-[0.01em]">Log out</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-red-500 uppercase tracking-wider transition-colors">
              Exit
            </span>
          </button>

          {/* User Profile Card with DP at the Very Bottom */}
          <Link
            href="/dashboard/account/profile"
            prefetch={false}
            onClick={() => document.body.classList.remove("sidebar-open")}
            className="block group cursor-pointer pt-1"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm hover:shadow-md hover:border-amber-200/80 hover:bg-amber-50/20 transition-all duration-200">
              <div className="relative shrink-0">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#E57D37] to-[#EAAD62] text-white shadow-sm font-bold text-sm">
                  {profile?.profile_image_url ? (
                    <img
                      src={profile.profile_image_url}
                      alt={profile.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                {/* Active status indicator dot */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-xs" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900 group-hover:text-[#E57D37] transition-colors">
                  {profile ? profile.name : "Loading..."}
                </p>
                <p className="truncate text-[11px] text-slate-500 font-medium">
                  {roleLabel}
                </p>
              </div>

              <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#E57D37] group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </Link>
        </div>
      </aside>
    </>
  )
}
