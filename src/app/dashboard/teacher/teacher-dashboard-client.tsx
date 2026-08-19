"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, Users, Clock, ChevronRight, GraduationCap, LayoutGrid } from "lucide-react"
import { motion } from "framer-motion"
import gsap from "gsap"

interface Subject { id: string; name: string; code: string }

export default function TeacherDashboardClient({
  teacher,
  subjects,
  studentCount,
}: {
  teacher: { email: string; institution: string }
  subjects: Subject[]
  studentCount: number
}) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Title split letters reveal animation
      gsap.fromTo(
        ".welcome-title-char",
        { y: 35, opacity: 0, filter: "blur(4px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.8,
          stagger: 0.04,
          ease: "power3.out",
        }
      )

      // 2. Stats cards reveal
      gsap.fromTo(
        ".teacher-stat-card",
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.08,
          ease: "power2.out",
          delay: 0.2,
        }
      )

      // 3. Main layout sections
      gsap.fromTo(
        ".teacher-section",
        { y: 35, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.12,
          ease: "power3.out",
          delay: 0.4,
        }
      )
    }, containerRef)

    return () => ctx.revert()
  }, [])

  const quickActions = [
    { label: "My Subjects",  desc: "View assigned subjects",  icon: "📘", href: "/dashboard/teacher/subjects" },
    { label: "Timetable",    desc: "View your schedule",      icon: "📅", href: "/dashboard/teacher/timetable" },
    { label: "Students",     desc: "View your students",      icon: "👩‍🎓", href: "/dashboard/teacher" },
    { label: "Attendance",   desc: "Mark attendance",         icon: "✅", href: "/dashboard/teacher/attendance" },
  ]

  const welcomeText = `${greeting}, faculty`
  const words = welcomeText.split(" ")

  return (
    <div ref={containerRef} className="mx-auto w-full max-w-[960px] flex flex-col gap-5 px-3 pb-8 pt-5 sm:px-5">
      
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 32, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[28px] border border-[#3A6DAF]/25 bg-gradient-to-br from-[#1A2E4D] to-[#14234B] p-6 shadow-[0_20px_50px_rgba(20,35,75,0.25)] backdrop-blur-xl flex items-center gap-4"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#065f46] to-[#059669] text-white shadow-md shadow-[#059669]/20 animate-pulse">
          <GraduationCap size={22} />
        </div>
        <div className="min-w-0">
          <h1 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.24em] text-[#ECDFCB]">
            Faculty Dashboard
          </h1>
          <p className="mt-2 text-2xl sm:text-3xl font-black tracking-[-0.04em] text-[#ECDFCB] flex flex-wrap">
            {words.map((word, idx) => (
              <span key={idx} className="inline-block overflow-hidden mr-2">
                <span className="welcome-title-char inline-block">
                  {word}
                </span>
              </span>
            ))}
          </p>
          <p className="mt-2 text-xs text-[#94BAC4]/90 font-mono uppercase tracking-wider">
            {teacher.institution}
          </p>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Subjects Assigned", value: subjects.length, accent: "bg-gray-100 text-gray-700 border-gray-200", icon: <BookOpen size={18} className="text-gray-600" /> },
          { label: "Students",          value: studentCount,    accent: "bg-gray-100 text-gray-700 border-gray-200", icon: <Users size={18} className="text-gray-600" /> },
          { label: "Classes Today",     value: 0,               accent: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock size={18} className="text-amber-600" /> },
        ].map((s, idx) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 + idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6 }}
            className="teacher-stat-card dashboard-card p-5 rounded-[24px] border border-[#3A6DAF]/20 bg-[#FFFFFF] shadow-[0_8px_24px_rgba(20,35,75,0.08)] flex items-center gap-4 transition-all duration-300"
          >
            <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 ${s.accent} border`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold leading-none text-[#14234B]">{s.value}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E57D37] mt-2">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="teacher-section dashboard-card p-6 rounded-[28px] border border-[#3A6DAF]/20 bg-[#FFFFFF] shadow-[0_12px_32px_rgba(20,35,75,0.08)]"
      >
        <div className="flex items-center gap-3 mb-4">
          <LayoutGrid size={15} className="text-[#E57D37]" />
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#14234B]">Quick Actions</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map(a => (
            <motion.div
              key={a.label}
              onClick={() => router.push(a.href)}
              whileHover={{ y: -4, x: 3 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-between border border-[#3A6DAF]/20 rounded-2xl p-4 cursor-pointer bg-[#F8FAFD] transition hover:border-[#E57D37]/40 hover:bg-[#F0F5FB]"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-[#14234B]">{a.label}</p>
                  <p className="text-xs text-[#94BAC4] mt-1">{a.desc}</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-[#94BAC4]" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Assigned Subjects */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
        className="teacher-section dashboard-card p-6 rounded-[28px] border border-[#3A6DAF]/20 bg-[#FFFFFF] shadow-[0_12px_32px_rgba(20,35,75,0.08)]"
      >
        <div className="flex items-center gap-3 mb-4">
          <BookOpen size={15} className="text-[#E57D37]" />
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#14234B]">My Subjects</p>
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-[#3A6DAF]/30 rounded-2xl bg-[#F0F5FB] text-[#94BAC4]">
            <p className="text-sm">No subjects assigned yet</p>
            <p className="text-xs mt-1">Contact your institution admin</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {subjects.map((s, idx) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 18, x: idx % 2 === 0 ? -15 : 15 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ delay: 0.7 + idx * 0.1, duration: 0.5 }}
                whileHover={{ y: -4, scale: 1.01 }}
                className="flex items-center gap-4 border border-[#3A6DAF]/20 rounded-2xl p-4 bg-[#F8FAFD] transition hover:border-[#E57D37]/40 hover:bg-[#F0F5FB]"
              >
                <div className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-[#3A6DAF]/15 border border-[#3A6DAF]/25 text-[#E57D37]">
                  <BookOpen size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#14234B] truncate">{s.name}</p>
                  <p className="text-xs text-[#94BAC4] mt-1">{s.code}</p>
                </div>
                <ChevronRight size={14} className="text-[#94BAC4]" />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}