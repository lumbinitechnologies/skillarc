"use client"

import { useEffect, useState, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Terminal, Send, Sparkles } from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

interface Message {
  sender: "user" | "arca"
  text: string
  isTyping?: boolean
}

export default function AiSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [hasStarted, setHasStarted] = useState(false)

  const conversation = [
    { sender: "user" as const, text: "What's my timetable today?" },
    { sender: "arca" as const, text: "Good morning Sathvik! You have 3 classes scheduled today:\n\n1. Data Communication Networks at 09:00 AM (Room 302)\n2. Web Technology at 11:00 AM (Lab 2)\n3. Design & Analysis of Algorithms at 02:00 PM (Room 104)" },
    { sender: "user" as const, text: "Who teaches DAA?" },
    { sender: "arca" as const, text: "Dr. Roy teaches Design & Analysis of Algorithms (CS-302)." },
  ]

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top 70%",
      onEnter: () => {
        if (!hasStarted) {
          setHasStarted(true)
          runSimulation()
        }
      },
    })

    return () => trigger.kill()
  }, [hasStarted])

  const runSimulation = async () => {
    for (let i = 0; i < conversation.length; i++) {
      const step = conversation[i]

      if (step.sender === "user") {
        setMessages((prev) => [...prev, { sender: "user", text: "", isTyping: true }])
        await typeMessage(step.text, i)
      } else {
        setMessages((prev) => [...prev, { sender: "arca", text: "...", isTyping: true }])
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setMessages((prev) => {
          const next = [...prev]
          next[i] = { sender: "arca", text: step.text }
          return next
        })
        await new Promise((resolve) => setTimeout(resolve, 800))
      }
    }
  }

  const typeMessage = (fullText: string, index: number): Promise<void> => {
    return new Promise((resolve) => {
      let currentText = ""
      let charIdx = 0
      const interval = setInterval(() => {
        if (charIdx < fullText.length) {
          currentText += fullText[charIdx]
          setMessages((prev) => {
            const next = [...prev]
            next[index] = { sender: "user", text: currentText, isTyping: true }
            return next
          })
          charIdx++
        } else {
          clearInterval(interval)
          setMessages((prev) => {
            const next = [...prev]
            next[index] = { sender: "user", text: fullText }
            return next
          })
          resolve()
        }
      }, 55)
    })
  }

  return (
    <section
      ref={containerRef}
      className="py-28 bg-[#EFEAD8] text-[#0B132B] border-t border-[#0B132B]/20 relative overflow-hidden font-['Space_Grotesk',sans-serif]"
    >
      {/* Background Ambient Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#E57D37]/10 blur-[150px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-16 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-[10px] font-['Space_Mono',monospace] tracking-[0.25em] text-[#3A6DAF] uppercase font-bold">
            [ INTELLIGENT TELEMETRY ]
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-[#0B132B]">
            An intelligent assistant for your academic ecosystem.
          </h2>
          <p className="font-['Space_Mono',monospace] text-xs text-[#0B132B]/80 leading-relaxed uppercase tracking-wider font-bold">
            {"{ SkillArc brings intelligent assistance directly into the academic experience. }"}
          </p>
        </div>

        {/* Chat Widget Wrapper - High Contrast Dark Console Card */}
        <div className="max-w-lg mx-auto bg-[#0B132B] text-[#EFEAD8] border-2 border-[#0B132B] rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[380px] font-['Space_Mono',monospace]">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-white/15 bg-black/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#94BAC4] font-bold">
              <Terminal size={14} className="text-[#E57D37]" />
              <span>arca-prompt@skillarc:~</span>
            </div>
            <div className="flex gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E57D37]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#EAAD62]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3A6DAF]" />
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 flex flex-col text-xs">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 text-[#94BAC4]">
                <Sparkles size={20} className="text-[#E57D37] animate-pulse" />
                <p className="text-[9px] font-bold">Initializing system telemetry...</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col max-w-[85%] ${msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                  }`}
              >
                <div
                  className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap font-bold ${msg.sender === "user"
                      ? "bg-white/10 border border-white/15 text-[#EFEAD8] rounded-br-none"
                      : "bg-[#E57D37]/20 border border-[#E57D37]/40 text-[#EAAD62] rounded-bl-none"
                    }`}
                >
                  {msg.sender === "user" ? `> ${msg.text}` : msg.text}
                </div>
                <span className="text-[8px] text-[#94BAC4] mt-1 block px-1 uppercase tracking-widest font-bold">
                  {msg.sender === "user" ? "user-query" : "arca-response"}
                </span>
              </div>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3.5 border-t border-white/15 bg-black/20 flex gap-2 items-center">
            <span className="text-[#E57D37] text-xs pl-1 font-bold">&gt;</span>
            <input
              disabled
              placeholder="Ask Arca anything about your schedule..."
              className="flex-1 bg-transparent text-[#EFEAD8] text-xs px-2 py-2 outline-none placeholder:text-[#94BAC4] cursor-not-allowed font-bold"
            />
            <button
              disabled
              className="h-9 w-9 bg-[#E57D37]/20 border border-[#E57D37]/40 text-[#E57D37] rounded-xl flex items-center justify-center shrink-0 opacity-50 cursor-not-allowed"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}