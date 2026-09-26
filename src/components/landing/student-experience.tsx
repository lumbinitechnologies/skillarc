"use client"

import { useState } from "react"
import { Clock, Calendar, BookMarked, ClipboardCheck, ArrowRight, Plus, X } from "lucide-react"

interface PanelData {
  id: string
  title: string
  tagline: string
  desc: string
  headline: string
  iconColor: string
  color: string
  mockup: React.ReactNode
}

export default function StudentExperience() {
  const [activePanel, setActivePanel] = useState<number | null>(null)

  const panels: PanelData[] = [
    {
      id: "01",
      title: "Student Workspace",
      tagline: "STUDENT PORTAL",
      headline: "A personal academic dashboard.",
      desc: "Enable students to manage active courses, check timetables, submit reports, and track term GPA metrics from a unified visual dashboard.",
      iconColor: "#38BDF8",
      color: "from-[#38BDF8]/10 to-transparent",
      mockup: (
        <div className="bg-[#050B1E]/90 border border-[#EFEAD8]/15 rounded-2xl overflow-hidden w-full max-w-md shadow-2xl backdrop-blur-xl">
          <div className="bg-[#0B132B]/60 px-5 py-3.5 border-b border-[#EFEAD8]/10 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-black text-[#EFEAD8]">Good morning, Sathvik 👋</h4>
              <p className="text-[9px] text-[#EFEAD8]/50 font-mono font-black">B.Tech Computer Science • Sem 6</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-[#FF5500] animate-ping" />
          </div>
          <div className="p-5 space-y-4">
            <span className="text-[9px] font-black text-[#EFEAD8]/50 uppercase tracking-widest block font-mono">
              [ TODAY'S CLASSES ]
            </span>
            <div className="space-y-2.5">
              {[
                { time: "09:00 AM", name: "Data Networks", prof: "Dr. Sen", room: "Room 302" },
                { time: "11:00 AM", name: "Web Tech", prof: "Dr. Minus", room: "Lab 2" },
                { time: "02:00 PM", name: "Algorithms", prof: "Prof. Roy", room: "Room 104" },
              ].map((cls, idx) => (
                <div key={idx} className="flex gap-4 items-center bg-[#EFEAD8]/5 border border-[#EFEAD8]/10 p-3 rounded-xl">
                  <div className="flex items-center gap-1 text-[9px] font-black text-[#38BDF8] shrink-0 font-mono w-16">
                    <Clock size={11} />
                    <span>{cls.time}</span>
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-black text-[#EFEAD8] truncate">{cls.name}</p>
                    <p className="text-[9px] text-[#EFEAD8]/50 truncate">{cls.prof} • {cls.room}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "02",
      title: "Faculty Console",
      tagline: "TEACHER CONSOLE",
      headline: "Everything faculty need to teach.",
      desc: "Give teachers administrative consoles to record roll call, coordinate course blueprints, publish assignment specifications, and update grades instantly.",
      iconColor: "#FF5500",
      color: "from-[#FF5500]/10 to-transparent",
      mockup: (
        <div className="bg-[#050B1E]/90 border border-[#EFEAD8]/15 rounded-2xl overflow-hidden w-full max-w-md shadow-2xl backdrop-blur-xl">
          <div className="bg-[#0B132B]/60 px-5 py-3.5 border-b border-[#EFEAD8]/10 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-black text-[#EFEAD8]">Dr. Roy 🎓</h4>
              <p className="text-[9px] text-[#EFEAD8]/50 font-mono font-black">Associate Professor • Computer Science</p>
            </div>
            <span className="text-[8px] border border-[#FF5500]/30 text-[#FF5500] bg-[#FF5500]/10 px-2 py-0.5 rounded font-black uppercase font-mono">
              Council
            </span>
          </div>
          <div className="p-5 space-y-3">
            <span className="text-[9px] font-black text-[#EFEAD8]/50 uppercase tracking-widest block font-mono">
              [ ACTIVITIES FEED ]
            </span>
            <div className="space-y-2">
              {[
                { label: "Today's Schedule", val: "3 lectures periods assigned", icon: <Calendar size={13} className="text-[#FF5500]" /> },
                { label: "Pending Assessments", val: "42 Lab reports to review", icon: <ClipboardCheck size={13} className="text-[#FF5500]" /> },
                { label: "Active Subjects", val: "CS-302 (DAA), CS-501 (DBMS)", icon: <BookMarked size={13} className="text-[#38BDF8]" /> },
              ].map((act, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-[#EFEAD8]/5 border border-[#EFEAD8]/10 p-2.5 rounded-xl">
                  <div className="h-7 w-7 rounded-lg bg-[#0B132B] border border-[#EFEAD8]/10 flex items-center justify-center">
                    {act.icon}
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#EFEAD8]">{act.label}</p>
                    <p className="text-[9px] text-[#EFEAD8]/50 font-mono">{act.val}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "03",
      title: "Administration Hub",
      tagline: "ADMIN BLUEPRINT",
      headline: "Configure settings centrally.",
      desc: "Synchronize department Blueprints, track syllabus completion benchmarks across divisions, resolve timetable clashes, and review global academic telemetry.",
      iconColor: "#38BDF8",
      color: "from-[#38BDF8]/10 to-transparent",
      mockup: (
        <div className="bg-[#050B1E]/90 border border-[#EFEAD8]/15 rounded-2xl overflow-hidden w-full max-w-md shadow-2xl backdrop-blur-xl">
          <div className="bg-[#0B132B]/60 px-5 py-3.5 border-b border-[#EFEAD8]/10 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-black text-[#EFEAD8]">Central Command</h4>
              <p className="text-[9px] text-[#EFEAD8]/50 font-mono font-black">Institution Admin Console</p>
            </div>
            <span className="text-[8px] border border-[#38BDF8]/30 text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-0.5 rounded font-black uppercase font-mono">
              Live OS
            </span>
          </div>
          <div className="p-5 space-y-4">
            <span className="text-[9px] font-black text-[#EFEAD8]/50 uppercase tracking-widest block font-mono">
              [ TELEMETRY ALERTS ]
            </span>
            <div className="space-y-2.5">
              {[
                { title: "Conflict Resolution", desc: "No conflicts detected in Semester 6 drafts" },
                { title: "Syllabus Sync", desc: "Batch A Computer Science synced (80% complete)" },
              ].map((alert, idx) => (
                <div key={idx} className="bg-[#EFEAD8]/5 border border-[#EFEAD8]/10 p-3 rounded-xl flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-[#FF5500] mt-1.5 shrink-0" />
                  <div>
                    <h5 className="text-xs font-black text-[#EFEAD8]">{alert.title}</h5>
                    <p className="text-[9px] text-[#EFEAD8]/50 mt-0.5 font-mono">{alert.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ]

  const isOpen = activePanel !== null

  return (
    <section className="relative bg-[#0B132B] text-[#EFEAD8] border-t border-[#EFEAD8]/10 overflow-hidden py-16 font-['Space_Grotesk',sans-serif]">

      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-16 text-center md:text-left">
        <span className="text-[10px] font-mono tracking-[0.25em] text-[#38BDF8] uppercase bg-[#EFEAD8]/5 px-4 py-1.5 rounded-full border border-[#EFEAD8]/10 inline-block mb-4 font-black">
          [ ACADEMIC PORTALS ]
        </span>
        <h2 className="text-3xl sm:text-5xl font-sans font-black uppercase tracking-tight text-[#EFEAD8] leading-none">
          One system. Dedicated consoles.
        </h2>
        <p className="text-[#EFEAD8]/70 text-sm max-w-xl mt-3 font-mono uppercase tracking-wider font-black">
          Explore customized dashboard workspaces designed to align academic operations across different organizational layers.
        </p>
      </div>

      {/* Horizontal Accordion Container */}
      <div className="relative flex flex-col md:flex-row items-stretch w-full min-h-[580px] h-auto md:h-[680px] gap-0 overflow-hidden bg-[#0B132B] border-t border-b border-[#EFEAD8]/10 font-sans">

        {panels.map((panel, idx) => {
          const isActive = activePanel === idx

          return (
            <div
              key={panel.id}
              onClick={() => setActivePanel(isActive ? null : idx)}
              className={`relative flex-shrink-0 md:min-w-0 md:h-full border-b md:border-b-0 md:border-r border-[#EFEAD8]/10 cursor-pointer overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] ${isActive
                ? "flex-[10] cursor-default h-[480px] md:h-full"
                : isOpen
                  ? "flex-[1] h-[72px] md:h-full md:flex-[0.8]"
                  : "flex-[1] h-[72px] md:h-full md:hover:flex-[1.8]"
                }`}
            >
              {/* Desaturated mesh color gradient background layers */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${panel.color} opacity-40 transition-opacity duration-700`}
                style={{ mixBlendMode: "screen" }}
              />

              {/* Collapsed Side Rail */}
              <div
                className={`absolute inset-0 flex flex-row md:flex-col items-center justify-between p-4 md:py-8 z-10 transition-opacity duration-300 pointer-events-none ${isActive ? "opacity-0 pointer-events-none" : "opacity-100"
                  }`}
              >
                <div className="hidden md:flex flex-col items-center gap-4 w-full">
                  <span className="text-sm font-black text-[#EFEAD8]/30 font-mono">{panel.id}</span>
                  <div className="w-[1px] h-16 bg-[#EFEAD8]/10" />
                </div>

                <div className="flex items-center gap-4 md:block">
                  <span className="md:hidden text-xs font-black text-[#EFEAD8]/40 font-mono mr-2">{panel.id}</span>
                  <span className="text-xs md:text-sm font-black tracking-[0.2em] uppercase text-[#EFEAD8]/70 whitespace-nowrap font-mono md:[writing-mode:vertical-lr] md:rotate-180">
                    [ {panel.tagline} ]
                  </span>
                </div>

                <div className="h-8 w-8 rounded-full bg-[#EFEAD8]/5 border border-[#EFEAD8]/10 flex items-center justify-center text-[#EFEAD8]/60">
                  <Plus size={14} />
                </div>
              </div>

              {/* Expanded Content Wrapper */}
              <div
                className={`w-full h-full flex flex-col justify-center px-6 py-12 md:p-16 transition-all duration-500 relative bg-[#050B1E]/95 md:bg-transparent ${isActive
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
                  }`}
              >
                {/* Close Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActivePanel(null)
                  }}
                  className="absolute top-6 right-6 md:top-8 md:right-8 h-10 w-10 rounded-full bg-[#EFEAD8]/5 border border-[#EFEAD8]/10 hover:border-[#FF5500] flex items-center justify-center text-[#EFEAD8]/70 hover:text-[#FF5500] transition-colors z-20 cursor-pointer"
                >
                  <X size={16} />
                </button>

                {/* 12-Column Interior Grid */}
                <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-8 md:pt-0">

                  {/* Left Column: Descriptions */}
                  <div className="col-span-12 md:col-span-5 space-y-6">
                    <span
                      className="text-[10px] font-black tracking-[0.2em] uppercase font-mono px-3 py-1 rounded-full border bg-[#EFEAD8]/5 inline-block"
                      style={{ color: panel.iconColor, borderColor: `${panel.iconColor}30` }}
                    >
                      [ {panel.tagline} ]
                    </span>
                    <h3 className="text-3xl sm:text-4xl md:text-5xl font-sans font-black uppercase tracking-tight text-[#EFEAD8] leading-none">
                      {panel.title}
                    </h3>
                    <p className="text-[#EFEAD8]/70 text-sm leading-relaxed max-w-sm font-mono font-black">
                      {panel.desc}
                    </p>

                    <button
                      onClick={() => setActivePanel(idx)}
                      className="flex items-center gap-2 text-xs font-black uppercase tracking-widest font-mono hover:underline cursor-pointer"
                      style={{ color: panel.iconColor }}
                    >
                      <span>Explore Portal Workspace</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  {/* Right Column: Console Mockup Panel */}
                  <div className="col-span-12 md:col-span-7 flex justify-center w-full">
                    {panel.mockup}
                  </div>

                </div>
              </div>

            </div>
          )
        })}

      </div>

    </section>
  )
}