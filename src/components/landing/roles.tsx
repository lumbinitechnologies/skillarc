"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, Building, Users, Calendar, Award, BookOpen, Heart, ArrowRight } from "lucide-react"

export default function Roles() {
  const [activeRole, setActiveRole] = useState(0)

  const rolesData = [
    {
      title: "University Leadership",
      tagline: "See the bigger picture.",
      desc: "Understand what is happening across institutions, teams, and student services without requesting separate updates from every campus.",
      icon: <Shield size={24} className="text-[#FF5500]" />,
      color: "from-[#FF5500]/10 to-transparent",
      tag: "leadership_workspace",
      mockup: (
        <div className="bg-[#111111]/80 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5 shadow-2xl backdrop-blur-xl h-full flex flex-col justify-between w-full font-mono">
          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <span className="text-xs font-bold text-white/40 tracking-wider">[ LEADERSHIP OVERVIEW ]</span>
            <span className="text-[10px] border border-[#FF5500]/20 text-[#FF5500] bg-[#FF5500]/5 px-3 py-1 rounded font-bold uppercase">Active</span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/40">Institutions</span>
              <span className="font-bold text-[#F4F4F0] text-base">6 Campuses</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/40">Administrators</span>
              <span className="font-bold text-[#F4F4F0] text-base">4 Members</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/40">Total Community</span>
              <span className="font-bold text-[#F4F4F0] text-base">14,280</span>
            </div>
          </div>
          <div className="bg-[#FF5500]/5 border border-[#FF5500]/20 p-3 rounded-xl text-xs text-[#FF5500] text-center font-bold">
            // Multi-institution overview up to date
          </div>
        </div>
      ),
    },
    {
      title: "Institution Administrator",
      tagline: "Run your institution.",
      desc: "Manage admissions, programs, departments, faculty, students, fees, schedules, attendance, events, and placements from one workspace.",
      icon: <Building size={24} className="text-[#38BDF8]" />,
      color: "from-[#38BDF8]/10 to-transparent",
      tag: "campus_operations",
      mockup: (
        <div className="bg-[#111111]/80 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5 shadow-2xl backdrop-blur-xl h-full flex flex-col justify-between w-full font-mono">
          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <span className="text-xs font-bold text-white/40 tracking-wider">[ CAMPUS OPERATIONS ]</span>
            <span className="text-[10px] border border-white/20 text-white/70 px-3 py-1 rounded font-bold uppercase">Main Campus</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center text-sm">
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
              <span className="text-[10px] text-white/40 block uppercase">Departments</span>
              <span className="text-lg font-bold text-[#38BDF8] mt-1 block">12</span>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
              <span className="text-[10px] text-white/40 block uppercase">Programs</span>
              <span className="text-lg font-bold text-[#38BDF8] mt-1 block">48</span>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div className="bg-[#38BDF8] h-full w-[80%]" />
            </div>
            <span className="text-white/40 block text-right">80% term syllabus completed</span>
          </div>
        </div>
      ),
    },
    {
      title: "Department Head",
      tagline: "Keep your department on track.",
      desc: "Coordinate courses, sections, faculty assignments, schedules, events, and student progress across your department.",
      icon: <Users size={24} className="text-[#FF5500]" />,
      color: "from-[#FF5500]/10 to-transparent",
      tag: "department_hub",
      mockup: (
        <div className="bg-[#111111]/80 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5 shadow-2xl backdrop-blur-xl h-full flex flex-col justify-between w-full font-mono">
          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <span className="text-xs font-bold text-white/40 tracking-wider">[ DEPARTMENT HUB ]</span>
            <span className="text-[10px] border border-[#FF5500]/20 text-[#FF5500] bg-[#FF5500]/5 px-3 py-1 rounded font-bold uppercase">Active</span>
          </div>
          <div className="space-y-3 text-sm">
            {[
              { label: "Faculty", val: "24 Members" },
              { label: "Semesters", val: "4 Active" },
            ].map((stat) => (
              <div key={stat.label} className="flex justify-between items-center">
                <span className="text-white/40">{stat.label}</span>
                <span className="font-bold text-[#F4F4F0]">{stat.val}</span>
              </div>
            ))}
          </div>
          <div className="bg-white/5 border border-white/10 p-3 rounded-xl text-xs text-white/60 text-center">
            // Faculty assignments & schedules ready
          </div>
        </div>
      ),
    },
    {
      title: "Program Head",
      tagline: "Coordinate cohorts and courses.",
      desc: "Oversee cohort milestones, evaluate course mappings, publish semester schedules, and coordinate student placement readiness.",
      icon: <Award size={24} className="text-[#38BDF8]" />,
      color: "from-[#38BDF8]/10 to-transparent",
      tag: "program_workspace",
      mockup: (
        <div className="bg-[#111111]/80 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5 shadow-2xl backdrop-blur-xl h-full flex flex-col justify-between w-full font-mono">
          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <span className="text-xs font-bold text-white/40 tracking-wider">[ PROGRAM OVERVIEW ]</span>
            <span className="text-[10px] border border-[#38BDF8]/20 text-[#38BDF8] bg-[#38BDF8]/5 px-3 py-1 rounded font-bold uppercase">Supervised</span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-white/40">Sections</span>
              <span className="font-bold text-[#F4F4F0]">3 Sections</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40">Courses</span>
              <span className="font-bold text-[#F4F4F0]">12 Modules</span>
            </div>
          </div>
          <div className="p-3 bg-[#38BDF8]/5 border border-[#38BDF8]/20 rounded-xl text-xs text-[#38BDF8] text-center font-bold">
            ✓ Cohort requirements on track
          </div>
        </div>
      ),
    },
    {
      title: "Faculty",
      tagline: "Teach with less administration.",
      desc: "View your timetable, share course materials, take attendance, create assignments, review submissions, and update grades.",
      icon: <BookOpen size={24} className="text-[#FF5500]" />,
      color: "from-[#FF5500]/10 to-transparent",
      tag: "faculty_workspace",
      mockup: (
        <div className="bg-[#111111]/80 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5 shadow-2xl backdrop-blur-xl h-full flex flex-col justify-between w-full font-mono">
          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <span className="text-xs font-bold text-white/40 tracking-wider">[ FACULTY WORKSPACE ]</span>
            <span className="text-[10px] border border-white/20 text-white/70 px-3 py-1 rounded font-bold uppercase">CS-302</span>
          </div>
          <div className="space-y-2">
            <div className="text-sm bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#F4F4F0]">Algorithms</p>
                <p className="text-[10px] text-white/40">RM 304 • 09:00 AM</p>
              </div>
              <span className="text-[9px] border border-[#FF5500]/30 text-[#FF5500] bg-[#FF5500]/5 px-2.5 py-0.5 rounded font-bold uppercase">
                Active
              </span>
            </div>
          </div>
          <div className="w-full py-3 bg-[#FF5500] text-[#0A0A0A] text-xs font-bold uppercase tracking-wider rounded-xl text-center">
            Mark Attendance
          </div>
        </div>
      ),
    },
    {
      title: "Student",
      tagline: "Know what comes next.",
      desc: "View timetables, courses, assignments, attendance, grades, fees, events, and placement opportunities in one straightforward experience.",
      icon: <Calendar size={24} className="text-[#38BDF8]" />,
      color: "from-[#38BDF8]/10 to-transparent",
      tag: "student_workspace",
      mockup: (
        <div className="bg-[#111111]/80 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5 shadow-2xl backdrop-blur-xl h-full flex flex-col justify-between w-full font-mono">
          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <span className="text-xs font-bold text-white/40 tracking-wider">[ STUDENT WORKSPACE ]</span>
            <span className="text-[10px] border border-[#38BDF8]/20 text-[#38BDF8] bg-[#38BDF8]/5 px-3 py-1 rounded font-bold uppercase">Active</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Academic GPA</span>
              <span className="font-bold text-[#F4F4F0]">3.95</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Attendance</span>
              <span className="font-bold text-[#38BDF8]">94.2%</span>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
            <span className="text-[9px] font-bold text-white/40 block uppercase">UPCOMING DUE</span>
            <span className="text-xs font-bold text-[#F4F4F0] block truncate">Lab Assignment 4</span>
          </div>
        </div>
      ),
    },
    {
      title: "Parent & Family",
      tagline: "Stay connected to progress.",
      desc: "Keep track of academic schedules, attendance updates, grade reports, and campus communications without the guesswork.",
      icon: <Heart size={24} className="text-[#FF5500]" />,
      color: "from-[#FF5500]/10 to-transparent",
      tag: "family_portal",
      mockup: (
        <div className="bg-[#111111]/80 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5 shadow-2xl backdrop-blur-xl h-full flex flex-col justify-between w-full font-mono">
          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <span className="text-xs font-bold text-white/40 tracking-wider">[ FAMILY PORTAL ]</span>
            <span className="text-[10px] border border-white/20 text-white/70 px-3 py-1 rounded font-bold uppercase">Linked</span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-white/40">Attendance</span>
              <span className="font-semibold text-[#F4F4F0]">Today, 9:02 AM</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40">Grade Reports</span>
              <span className="font-semibold text-[#FF5500]">A+ (Midterms)</span>
            </div>
          </div>
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white/60 text-center">
            // Real-time notifications enabled
          </div>
        </div>
      ),
    },
  ]

  const role = rolesData[activeRole]

  return (
    <section className="relative py-28 bg-[#0B132B] text-[#F4F4F0] overflow-hidden border-t border-white/10 font-['Space_Grotesk',sans-serif]">
      {/* Background ambient glow */}
      <div className="absolute top-[20%] left-10 w-96 h-96 bg-[#FF5500]/5 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 pb-6 border-b border-white/15">
          <div>
            <div className="font-mono text-xs text-[#EAAD62] tracking-[0.2em] uppercase mb-2 flex items-center gap-2 font-bold">
              <span className="text-[#FF5500]">//</span>
              <span>[ ROLE-BASED WORKSPACES ]</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-[#F4F4F0]">
              Everyone sees the work that matters to them.
            </h2>
          </div>
          <p className="font-mono text-xs text-[#94BAC4] max-w-xs mt-4 md:mt-0 uppercase font-bold">
            Keep the university connected while leadership, administrators, department heads, faculty, students, and families each get a focused workspace.
          </p>
        </div>

        {/* Main Grid Layout: Interactive List on Left, Sticky Live Console on Right */}
        <div className="grid lg:grid-cols-12 gap-12 items-start">

          {/* Left Column: Role Selector Cards */}
          <div className="lg:col-span-6 flex flex-col gap-3">
            {rolesData.map((item, idx) => {
              const isActive = activeRole === idx
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  onMouseEnter={() => setActiveRole(idx)}
                  onClick={() => setActiveRole(idx)}
                  className={`cursor-pointer p-5 rounded-2xl transition-all duration-300 border-2 flex items-center justify-between ${isActive
                      ? "bg-white/10 text-[#F4F4F0] border-[#FF5500] shadow-2xl scale-[1.01]"
                      : "bg-transparent text-[#94BAC4] border-white/10 hover:border-white/30 hover:text-[#F4F4F0]"
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl border ${isActive ? "bg-[#FF5500] text-[#0A0A0A] border-[#FF5500]" : "bg-white/5 border-white/10 text-[#94BAC4]"}`}>
                      {Icon}
                    </div>
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#EAAD62] font-bold block mb-0.5">
                        [ {item.tagline} ]
                      </span>
                      <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-[#F4F4F0]">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full border ${isActive ? "bg-[#FF5500] border-[#FF5500]" : "border-white/20"}`} />
                </div>
              )
            })}
          </div>

          {/* Right Column: Sticky Live Workspace Preview Console */}
          <div className="lg:col-span-6 lg:sticky lg:top-32">
            <div className="w-full bg-[#111111]/80 text-[#F4F4F0] border-2 border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col justify-between relative backdrop-blur-xl min-h-[460px]">

              {/* Console Top Bar */}
              <div className="flex justify-between items-center pb-4 border-b border-white/15">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#FF5500]" />
                  <span className="w-3 h-3 rounded-full bg-[#EAAD62]" />
                  <span className="w-3 h-3 rounded-full bg-[#38BDF8]" />
                  <span className="text-xs font-mono text-[#94BAC4] uppercase tracking-widest ml-2 font-bold">
                    {role.tag}
                  </span>
                </div>
                <span className="text-[10px] border border-[#FF5500]/40 bg-[#FF5500]/20 px-3 py-1 rounded-full font-mono text-[#EAAD62] font-bold">
                  ACTIVE MODULE
                </span>
              </div>

              {/* Dynamic Console Content */}
              <div className="py-6 flex-1 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={role.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-6"
                  >
                    <div>
                      <span className="text-[10px] text-[#EAAD62] font-mono font-bold uppercase tracking-widest block mb-1">
                        [ {role.tagline} ]
                      </span>
                      <h4 className="text-2xl md:text-3xl font-black text-[#F4F4F0] uppercase tracking-tight mb-2">
                        {role.title} Workspace
                      </h4>
                      <p className="text-xs md:text-sm text-[#94BAC4] leading-relaxed font-mono font-bold">
                        {role.desc}
                      </p>
                    </div>

                    {/* Inner Mockup Card */}
                    <div className="mt-4">
                      {role.mockup}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Console Footer */}
              <div className="pt-4 border-t border-white/15 flex justify-between items-center text-[10px] font-mono text-[#94BAC4] font-bold">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
                  <span>Role-Based Workspace Ready</span>
                </span>
                <span className="text-[#EAAD62]">ACCESS: VERIFIED</span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  )
}