"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { Activity, BookOpen, CalendarDays, ChevronRight, Clock, GraduationCap } from "lucide-react"
import { motion } from "framer-motion"
import gsap from "gsap"

interface Subject {
  id: string
  name: string
  code: string
  facultyName: string
}

interface ScheduleItem {
  day: string
  period: number
  subjectName: string
  subjectCode: string
  facultyName: string
}

interface AttendanceSummary {
  rate: number
  total: number
  present: number
  absent: number
  late: number
}

export default function StudentPage({
  student,
  subjects,
  schedule,
  upcomingSchedule,
  attendance,
}: {
  student: {
    name: string
    email: string
    institution: string
    sectionName: string
    programName: string
    semester: number | null
    registrationNumber: string
    phone: string
    admissionYear: number | null
  }
  subjects: Subject[]
  schedule: ScheduleItem[]
  upcomingSchedule: ScheduleItem[]
  attendance: AttendanceSummary
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Text reveal animation for the welcome greeting
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

      // 2. Stats cards stagger reveal
      gsap.fromTo(
        ".student-stat-card",
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

      // 3. Grid blocks slide-up
      gsap.fromTo(
        ".student-grid-section",
        { y: 35, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.12,
          ease: "power3.out",
          delay: 0.4,
        }
      )
    }, containerRef)

    return () => ctx.revert()
  }, [])

  const stats = [
    {
      label: "Attendance rate",
      value: `${attendance.rate}%`,
      sublabel: `${attendance.present}/${attendance.total} marked`,
      accent: "bg-gray-100 text-gray-700 border-gray-200",
      icon: <Activity size={18} className="text-gray-600" />,
    },
    {
      label: "Courses enrolled",
      value: subjects.length,
      sublabel: "Live subject list",
      accent: "bg-gray-100 text-gray-700 border-gray-200",
      icon: <BookOpen size={18} className="text-editorial-orange" />,
    },
    {
      label: "Today’s classes",
      value: schedule.length,
      sublabel: "From your section timetable",
      accent: "bg-gray-100 text-gray-700 border-gray-200",
      icon: <CalendarDays size={18} className="text-gray-600" />,
    },
    {
      label: "Section",
      value: student.sectionName || "—",
      sublabel: student.programName || "Program pending",
      accent: "bg-gray-100 text-gray-700 border-gray-200",
      icon: <GraduationCap size={18} className="text-editorial-amber" />,
    },
  ]

  const welcomeText = `Welcome back, ${student.name}`
  const words = welcomeText.split(" ")

  return (
    <div ref={containerRef} className="mx-auto flex w-full max-w-[1360px] flex-col gap-5 px-3 pb-8 pt-5 sm:px-5 lg:px-8 lg:pt-7">
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
        className="relative overflow-hidden rounded-[30px] border border-[#3A6DAF]/25 bg-gradient-to-br from-[#1A2E4D] to-[#14234B] p-5 shadow-[0_20px_50px_rgba(20,35,75,0.25)] backdrop-blur-xl sm:p-7 lg:p-8"
      >
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#E57D37]/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-[#3A6DAF]/25 text-[#E57D37] shadow-[inset_0_0_0_1px_rgba(58,109,175,0.3)]">
              <GraduationCap size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ECDFCB]">Student dashboard</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#ECDFCB] sm:text-3xl flex flex-wrap">
                {words.map((word, idx) => (
                  <span key={idx} className="inline-block overflow-hidden mr-2">
                    <span className="welcome-title-char inline-block">
                      {word}
                    </span>
                  </span>
                ))}
              </h1>
              <p className="mt-2 text-sm text-[#94BAC4]/90">{student.institution} · {student.programName} · Semester {student.semester ?? "—"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/student/todo" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#3A6DAF]/30 bg-[#1A2E4D]/70 px-4 py-2.5 text-[11px] font-bold text-[#ECDFCB] shadow-sm transition hover:-translate-y-0.5 hover:border-[#E57D37]/50 hover:bg-[#1C3F73]">
              📋 To-Do List
            </Link>
            <Link href="/dashboard/student/report-card" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#3A6DAF]/30 bg-[#1A2E4D]/70 px-4 py-2.5 text-[11px] font-bold text-[#ECDFCB] shadow-sm transition hover:-translate-y-0.5 hover:border-[#E57D37]/50 hover:bg-[#1C3F73]">
              🏆 Report Card
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 + idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6 }}
            className="student-stat-card dashboard-card p-5 rounded-[24px] border border-[#3A6DAF]/25 bg-[#FFFFFF] shadow-[0_8px_24px_rgba(20,35,75,0.08)] transition-all duration-300"
          >
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-[16px] ${item.accent} border`}>
              {item.icon}
            </div>
            <p className="mt-4 text-2xl font-bold leading-none text-[#14234B]">{item.value}</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#E57D37]">{item.label}</p>
            <p className="mt-1 text-xs font-medium text-[#94BAC4]">{item.sublabel}</p>
          </motion.div>
        ))}
      </div>

      {/* Grid Content */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)]">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="student-grid-section dashboard-card p-4 sm:p-6 lg:p-7 xl:p-8 rounded-[28px] border border-[#3A6DAF]/20 bg-[#FFFFFF] shadow-[0_12px_32px_rgba(20,35,75,0.08)]"
        >
          <div className="flex items-center justify-between gap-3 pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#E57D37]">Today's classes</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-[#14234B] sm:text-2xl">Your schedule</h2>
            </div>
            <span className="rounded-full border border-[#E57D37]/30 bg-[#E57D37]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#E57D37] animate-pulse">Live</span>
          </div>

          <div className="space-y-4">
            {schedule.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[#3A6DAF]/30 bg-[#F0F5FB] p-8 text-center text-sm text-[#94BAC4] shadow-sm">
                No class sessions are scheduled for today yet.
              </div>
            ) : (
              schedule.map((item) => (
                <div key={`${item.day}-${item.period}`} className="rounded-[22px] border border-[#3A6DAF]/20 bg-[#F8FAFD] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#E57D37]/40 hover:bg-[#F0F5FB]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#14234B]">{item.subjectCode} · {item.subjectName}</p>
                      <p className="mt-2 text-sm text-[#94BAC4]">Faculty: {item.facultyName}</p>
                    </div>
                    <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#3A6DAF]/30 bg-[#F0F5FB] px-3 py-2 text-[11px] font-semibold text-[#14234B] shadow-sm sm:self-auto">
                      <Clock size={14} className="text-[#E57D37]" /> Period {item.period}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
          className="student-grid-section dashboard-card p-4 sm:p-6 lg:p-7 rounded-[28px] border border-[#3A6DAF]/20 bg-[#FFFFFF] shadow-[0_12px_32px_rgba(20,35,75,0.08)]"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#E57D37]">Attendance</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-[#14234B] sm:text-2xl">Session summary</h2>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[22px] border border-[#1A7C67]/30 bg-[#1A7C67]/10 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#34D399]">Present</p>
              <p className="mt-2 text-2xl font-bold text-[#34D399] sm:text-3xl">{attendance.present}</p>
            </div>
            <div className="rounded-[22px] border border-[#C85850]/30 bg-[#C85850]/10 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FB7185]">Absent</p>
              <p className="mt-2 text-2xl font-bold text-[#FB7185] sm:text-3xl">{attendance.absent}</p>
            </div>
            <div className="rounded-[22px] border border-[#BD8A20]/30 bg-[#BD8A20]/10 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FBBF24]">Late</p>
              <p className="mt-2 text-2xl font-bold text-[#FBBF24] sm:text-3xl">{attendance.late}</p>
            </div>
          </div>

          <div className="mt-5 rounded-[22px] border border-[#3A6DAF]/15 bg-[#F8FAFD] p-4 shadow-sm">
            <p className="text-xs font-bold text-[#14234B]">Student details</p>
            <div className="mt-4 grid gap-3">
              {[
                ["Email", student.email],
                ["Registration", student.registrationNumber],
                ["Phone", student.phone],
                ["Admission year", student.admissionYear ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[18px] border border-[#3A6DAF]/15 bg-[#FFFFFF] p-3.5 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E57D37]">{label}</p>
                  <p className="mt-1 break-all text-xs font-semibold text-[#14234B]">{value || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  )
}
