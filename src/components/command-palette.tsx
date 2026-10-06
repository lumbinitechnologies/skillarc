"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  Search,
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Settings,
  Briefcase,
  CreditCard,
  FileText,
  Layers,
  ClipboardCheck,
  UserCheck,
  FolderKanban,
  AlertTriangle,
  ArrowRight,
  Command,
  Hash,
  User,
  Award,
  ListTodo,
  FileSignature,
} from "lucide-react"
import { ROLES } from "@/constants/roles"

type Role = typeof ROLES[keyof typeof ROLES]

interface NavItem {
  name: string
  icon: React.ElementType
  path: string
  keywords?: string[]
}

interface SearchResult {
  id: string
  type: string
  title: string
  subtitle: string
  href: string
}

const roleNavItems: Record<string, NavItem[]> = {
  [ROLES.INSTITUTION_ADMIN]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/institution-admin", keywords: ["home", "dashboard"] },
    { name: "Admissions", icon: FileText, path: "/dashboard/institution-admin/admissions", keywords: ["apply", "applications"] },
    { name: "Intake Cohorts", icon: FolderKanban, path: "/dashboard/institution-admin/intakes", keywords: ["batch", "cohort"] },
    { name: "Billing Desk", icon: CreditCard, path: "/dashboard/institution-admin/billing", keywords: ["fees", "payment"] },
    { name: "Interventions", icon: AlertTriangle, path: "/dashboard/institution-admin/warnings", keywords: ["alerts", "issues"] },
    { name: "Departments", icon: Layers, path: "/dashboard/institution-admin/departments", keywords: ["dept"] },
    { name: "Programs", icon: BookOpen, path: "/dashboard/institution-admin/programs", keywords: ["degree", "course"] },
    { name: "Sections", icon: BookOpen, path: "/dashboard/institution-admin/sections", keywords: ["class", "division"] },
    { name: "Faculty", icon: GraduationCap, path: "/dashboard/institution-admin/faculty", keywords: ["teacher", "professor"] },
    { name: "Assign Courses", icon: UserCheck, path: "/dashboard/institution-admin/faculty-subjects", keywords: ["allocate", "map"] },
    { name: "Students", icon: Users, path: "/dashboard/institution-admin/students", keywords: ["learner", "pupil"] },
    { name: "Parents", icon: Users, path: "/dashboard/institution-admin/parents", keywords: ["guardian"] },
    { name: "Courses", icon: BookOpen, path: "/dashboard/institution-admin/subjects", keywords: ["subject"] },
    { name: "Timetable", icon: Calendar, path: "/dashboard/institution-admin/timetable", keywords: ["schedule"] },
    { name: "Attendance", icon: ClipboardCheck, path: "/dashboard/institution-admin/attendance", keywords: ["present", "absent"] },
    { name: "Events", icon: Calendar, path: "/dashboard/institution-admin/events", keywords: ["calendar", "activity"] },
    { name: "Placements", icon: Briefcase, path: "/dashboard/institution-admin/placements", keywords: ["job", "career"] },
    { name: "Account", icon: Settings, path: "/dashboard/account/profile", keywords: ["profile", "settings"] },
  ],
  [ROLES.FACULTY]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/faculty", keywords: ["home", "dashboard"] },
    { name: "Courses", icon: BookOpen, path: "/dashboard/faculty/subjects", keywords: ["subject", "teach", "assignment", "quiz", "homework", "grade", "marks", "syllabus", "module"] },
    { name: "Attendance", icon: ClipboardCheck, path: "/dashboard/faculty/attendance", keywords: ["present", "absent", "roll"] },
    { name: "Timetable", icon: Calendar, path: "/dashboard/faculty/timetable", keywords: ["schedule", "period", "class"] },
    { name: "Events", icon: Calendar, path: "/dashboard/faculty/events", keywords: ["calendar", "activity", "exam"] },
    { name: "Placements", icon: Briefcase, path: "/dashboard/faculty/placements", keywords: ["job", "career", "interview"] },
    { name: "Profile", icon: User, path: "/dashboard/faculty/profile", keywords: ["account", "settings"] },
  ],
  [ROLES.STUDENT]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/student", keywords: ["home", "dashboard"] },
    { name: "Attendance", icon: UserCheck, path: "/dashboard/student/attendance", keywords: ["present", "absent", "roll"] },
    { name: "Courses", icon: BookOpen, path: "/dashboard/student/subjects", keywords: ["subject", "assignment", "quiz", "homework", "syllabus", "module"] },
    { name: "To Do Lists", icon: ListTodo, path: "/dashboard/student/todo", keywords: ["task", "pending", "deadline"] },
    { name: "Timetable", icon: Calendar, path: "/dashboard/student/timetable", keywords: ["schedule", "period", "class"] },
    { name: "Grades", icon: Award, path: "/dashboard/student/report-card", keywords: ["marks", "result", "score", "report"] },
    { name: "Admissions", icon: FileSignature, path: "/dashboard/student/admissions", keywords: ["apply", "application", "enroll"] },
    { name: "Fees & Billing", icon: CreditCard, path: "/dashboard/student/billing", keywords: ["payment", "fee", "invoice", "receipt"] },
    { name: "Events", icon: Calendar, path: "/dashboard/student/events", keywords: ["calendar", "activity", "exam"] },
    { name: "Placements", icon: Briefcase, path: "/dashboard/student/placements", keywords: ["job", "career", "interview"] },
  ],
  [ROLES.PARENT]: [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard/parent", keywords: ["home", "dashboard"] },
    { name: "Attendance", icon: UserCheck, path: "/dashboard/parent/attendance", keywords: ["present", "absent"] },
    { name: "Timetable", icon: Calendar, path: "/dashboard/parent/timetable", keywords: ["schedule", "class"] },
    { name: "Assignments", icon: BookOpen, path: "/dashboard/parent/assignments", keywords: ["homework", "task", "quiz"] },
    { name: "Grades", icon: Award, path: "/dashboard/parent/grades", keywords: ["marks", "result", "score"] },
    { name: "Fees & Billing", icon: CreditCard, path: "/dashboard/parent/billing", keywords: ["payment", "fee"] },
    { name: "Events", icon: Calendar, path: "/dashboard/parent/events", keywords: ["calendar", "exam"] },
  ],
}

const typeIcons: Record<string, React.ElementType> = {
  Student: Users,
  Faculty: GraduationCap,
  Course: BookOpen,
  Department: Layers,
  Program: Hash,
}

export default function CommandPalette({ role }: { role: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const [dataResults, setDataResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("")
      setDataResults([])
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Filter navigation items
  const navItems = roleNavItems[role] ?? roleNavItems[ROLES.STUDENT] ?? []
  const lowerQ = query.toLowerCase()
  const filteredNav = query.length > 0
    ? navItems.filter(item =>
        item.name.toLowerCase().includes(lowerQ) ||
        (item.keywords?.some(kw => kw.includes(lowerQ)))
      )
    : navItems.slice(0, 6) // Show top 6 when empty

  // Debounced live data search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) {
      setDataResults([])
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const json = await res.json()
          setDataResults(json.results ?? [])
        }
      } catch {
        // ignore
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // Combine results
  const allResults: { type: "nav" | "data"; item: any }[] = [
    ...filteredNav.map(item => ({ type: "nav" as const, item })),
    ...dataResults.map(item => ({ type: "data" as const, item })),
  ]

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, allResults.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && allResults[activeIndex]) {
      e.preventDefault()
      const result = allResults[activeIndex]
      const href = result.type === "nav" ? result.item.path : result.item.href
      router.push(href)
      setOpen(false)
    }
  }, [allResults, activeIndex, router])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  // Reset active index on query change
  useEffect(() => { setActiveIndex(0) }, [query])

  function navigate(href: string) {
    router.push(href)
    setOpen(false)
  }

  return (
    <>
      {/* Trigger button in navbar */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden sm:flex min-w-0 flex-1 items-center gap-3 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 transition hover:border-gray-300 hover:bg-white cursor-pointer group"
      >
        <Search size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
        <span className="flex-1 text-left text-sm text-gray-400 group-hover:text-gray-500 transition-colors">Search anything…</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-gray-400 shadow-sm">
          <Command size={10} />K
        </kbd>
      </button>

      {/* Mobile search icon */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sm:hidden inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-100"
        aria-label="Search"
      >
        <Search size={16} />
      </button>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed left-1/2 top-[15vh] z-[61] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_25px_65px_rgba(0,0,0,0.2)]"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <Search size={18} className="shrink-0 text-[#E57D37]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages, students, faculty, courses…"
                  className="flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                  autoComplete="off"
                  spellCheck="false"
                />
                <kbd
                  onClick={() => setOpen(false)}
                  className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[min(420px,50vh)] overflow-y-auto overscroll-contain py-2">
                {/* Navigation results */}
                {filteredNav.length > 0 && (
                  <>
                    <div className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      {query ? "Pages" : "Quick Navigation"}
                    </div>
                    {filteredNav.map((item, idx) => {
                      const Icon = item.icon
                      const globalIdx = idx
                      return (
                        <button
                          key={item.path}
                          type="button"
                          onClick={() => navigate(item.path)}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          className={`flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                            activeIndex === globalIdx
                              ? "bg-[#E57D37]/8 text-slate-900"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                            activeIndex === globalIdx
                              ? "bg-[#E57D37]/15 text-[#E57D37]"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            <Icon size={14} />
                          </div>
                          <span className="flex-1 text-sm font-semibold">{item.name}</span>
                          {activeIndex === globalIdx && (
                            <ArrowRight size={12} className="text-[#E57D37]" />
                          )}
                        </button>
                      )
                    })}
                  </>
                )}

                {/* Data results */}
                {dataResults.length > 0 && (
                  <>
                    <div className="mt-1 border-t border-slate-100 px-5 py-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      Results
                    </div>
                    {dataResults.map((result, idx) => {
                      const globalIdx = filteredNav.length + idx
                      const TypeIcon = typeIcons[result.type] ?? Hash
                      return (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => navigate(result.href)}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          className={`flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                            activeIndex === globalIdx
                              ? "bg-[#E57D37]/8 text-slate-900"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                            activeIndex === globalIdx
                              ? "bg-[#E57D37]/15 text-[#E57D37]"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            <TypeIcon size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{result.title}</p>
                            <p className="truncate text-[11px] text-slate-400">{result.type}{result.subtitle ? ` · ${result.subtitle}` : ""}</p>
                          </div>
                          {activeIndex === globalIdx && (
                            <ArrowRight size={12} className="shrink-0 text-[#E57D37]" />
                          )}
                        </button>
                      )
                    })}
                  </>
                )}

                {/* Loading state */}
                {searching && query.length >= 2 && (
                  <div className="flex items-center gap-2 px-5 py-3">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-[#E57D37]" />
                    <span className="text-xs font-medium text-slate-400">Searching…</span>
                  </div>
                )}

                {/* Empty state */}
                {query.length >= 2 && !searching && filteredNav.length === 0 && dataResults.length === 0 && (
                  <div className="px-5 py-8 text-center">
                    <Search size={24} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-500">No results found</p>
                    <p className="mt-0.5 text-xs text-slate-400">Try a different search term</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50/50 px-5 py-2.5 text-[10px] font-semibold text-slate-400">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[9px] font-bold shadow-sm">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[9px] font-bold shadow-sm">↵</kbd>
                  Open
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[9px] font-bold shadow-sm">esc</kbd>
                  Close
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
