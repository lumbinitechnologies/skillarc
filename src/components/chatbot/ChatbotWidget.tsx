"use client"

import React, { useEffect, useRef, useState, useMemo } from "react"
import { Sparkles, Send, X, Bot, User, FileText, Trash2 } from "lucide-react"

interface SourceCitation {
  document_id: string
  filename: string
  chunk_index: number
  snippet: string
  score?: number
}

interface Message {
  id: string
  from: "user" | "bot"
  text: string
  sources?: SourceCitation[]
  timestamp: Date
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // User profile context state
  const [profile, setProfile] = useState<{ name: string; role: string } | null>(null)

  const listRef = useRef<HTMLDivElement | null>(null)

  // Fetch active user profile context on load
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/auth/profile")

        if (!res.ok) {
          if (res.status === 401) return
          throw new Error(`Profile fetch failed: ${res.status}`)
        }

        const contentType = res.headers.get("content-type") || ""
        if (!contentType.includes("application/json")) {
          console.warn("Expected JSON from /api/auth/profile but got:", contentType)
          return
        }

        const data = await res.json()
        setProfile({
          name: data.name || data.email?.split("@")[0] || "User",
          role: data.role || "STUDENT"
        })
      } catch (err) {
        console.error("Failed to load profile for chatbot widget:", err)
      }
    }
    loadProfile()
  }, [])

  // Welcome message based on active role
  const welcomeMessage = useMemo(() => {
    if (!profile) return "Hello! How can I help you today?"
    const nameStr = profile.name
    switch (profile.role) {
      case "STUDENT":
        return `Hi ${nameStr} 👋! I am Arca, your AI learning companion. Ask me anything about your courses, homework, or syllabus documents!`
      case "FACULTY":
      case "HOD":
      case "PROGRAM_HEAD":
        return `Welcome, Professor ${nameStr} 📚! I am Arca, your AI teaching companion. Ask me to lookup reference files or search course materials.`
      case "INSTITUTION_ADMIN":
        return `Welcome, Administrator ${nameStr} 🏛️! I am Arca, your AI campus companion. I can assist you with queries regarding departments, timetables, or attendance stats.`
      default:
        return `Hello ${nameStr}! I am Arca, your AI companion. How can I help you today?`
    }
  }, [profile])

  // Setup initial message when profile is loaded
  useEffect(() => {
    if (messages.length === 0 && profile) {
      setMessages([
        {
          id: "welcome",
          from: "bot",
          text: welcomeMessage,
          timestamp: new Date()
        }
      ])
    }
  }, [profile, welcomeMessage, messages.length])

  // Auto Scroll
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, open, loading])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsgText = input
    setInput("")

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      from: "user",
      text: userMsgText,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    setLoading(true)

    try {
      const res = await fetch("/api/chatbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMsgText,
          session_id: sessionId
        })
      })

      if (!res.ok) {
        // Try to extract a helpful error message from the response body
        let bodyText = ""
        try {
          const contentType = res.headers.get("content-type") || ""
          if (contentType.includes("application/json")) {
            const json = await res.json()
            bodyText = typeof json === "string" ? json : JSON.stringify(json)
          } else {
            bodyText = await res.text()
          }
        } catch (e) {
          bodyText = `Status ${res.status} (failed to read body)`
        }

        const errMsg = `Assistant error ${res.status}: ${bodyText}`

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-err-${Date.now()}`,
            from: "bot",
            text: errMsg,
            timestamp: new Date()
          }
        ])

        // Return early so we don't attempt to parse a success body
        return
      }

      const data = await res.json()

      // Store session ID if provided by the backend to maintain context
      if (data.session_id) {
        setSessionId(data.session_id)
      }

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        from: "bot",
        text: data.answer || "I parsed the database but couldn't find a response.",
        sources: data.sources || [],
        timestamp: new Date()
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (err: any) {
      console.error(err)
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          from: "bot",
          text: `Error connecting to assistant: ${err.message || "FastAPI offline"}`,
          timestamp: new Date()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setMessages([
      {
        id: "welcome",
        from: "bot",
        text: welcomeMessage,
        timestamp: new Date()
      }
    ])
    setSessionId(null)
  }

  // Format simple markdown lists and bold text
  const formatText = (text: string) => {
    if (!text) return ""
    return text.split("\n").map((line, i) => {
      let content = line

      // Handle bold tags (**text**)
      const boldRegex = /\*\*(.*?)\*\*/g
      const parts = []
      let lastIndex = 0
      let match

      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index))
        }
        parts.push(<strong key={match.index} className="font-extrabold text-slate-900">{match[1]}</strong>)
        lastIndex = boldRegex.lastIndex
      }
      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex))
      }

      const parsedLine = parts.length > 0 ? parts : content

      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={i} className="ml-4 list-disc text-slate-700 mt-1 pl-1">
            {parsedLine}
          </li>
        )
      }
      return <p key={i} className="mt-1.5 leading-relaxed text-slate-700">{parsedLine}</p>
    })
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <div className="flex items-end flex-col gap-3">

        {/* Chat Window Panel */}
        {open && (
          <div className="w-[360px] h-[520px] bg-white/75 backdrop-blur-xl border border-white/40 shadow-2xl rounded-[32px] overflow-hidden flex flex-col transition-all duration-300 animate-in slide-in-from-bottom-6">

            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
                  <Sparkles size={20} className="text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-sm font-['Plus_Jakarta_Sans'] tracking-tight">Arca AI</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-[#00C2A8] rounded-full animate-ping" />
                    <span className="text-[10px] text-white/80 font-medium">Learn smarter. Go further.</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleClear}
                  title="Reset conversation"
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition active:scale-95"
                >
                  <Trash2 size={14} className="text-white" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition active:scale-95"
                >
                  <X size={15} className="text-white" />
                </button>
              </div>
            </div>

            {/* Message Area */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50/50 to-slate-100/30"
              style={{ scrollBehavior: "smooth" }}
            >
              {messages.map((m) => (
                <div key={m.id} className={`flex items-start gap-2.5 ${m.from === "user" ? "justify-end" : "justify-start"}`}>

                  {/* Bot Avatar */}
                  {m.from === "bot" && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#6C63FF] border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <Bot size={14} />
                    </div>
                  )}

                  <div className="max-w-[78%] space-y-1">
                    <div
                      className={`text-xs p-3.5 shadow-sm rounded-2xl ${
                        m.from === "user"
                          ? "bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] text-white rounded-tr-none font-medium"
                          : "bg-white border border-slate-100 text-slate-800 rounded-tl-none"
                      }`}
                    >
                      {m.from === "user" ? m.text : formatText(m.text)}

                      {/* Cited Sources */}
                      {m.from === "bot" && m.sources && m.sources.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <FileText size={10} /> Sources Cited:
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Array.from(new Set(m.sources.map(s => s.filename))).map((filename, sidx) => (
                              <span
                                key={sidx}
                                title={m.sources?.filter(s => s.filename === filename).map(s => s.snippet).join("\n\n")}
                                className="text-[9px] font-bold text-[#6C63FF] bg-indigo-50/70 border border-indigo-100/50 rounded px-1.5 py-0.5 cursor-help max-w-[140px] truncate block"
                              >
                                {filename}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 block px-1">
                      {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* User Avatar */}
                  {m.from === "user" && (
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <User size={13} />
                    </div>
                  )}

                </div>
              ))}

              {/* Loader Skeleton (Glass 2.0 feel) */}
              {loading && (
                <div className="flex items-start gap-2.5 animate-pulse">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm mt-1">
                    <Bot size={14} className="text-slate-400" />
                  </div>
                  <div className="max-w-[78%] bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3.5 space-y-2 w-full shadow-sm">
                    <div className="h-2 bg-slate-150 rounded w-5/6" />
                    <div className="h-2 bg-slate-150 rounded w-4/6" />
                    <div className="h-2 bg-slate-150 rounded w-2/6" />
                  </div>
                </div>
              )}
            </div>

            {/* Input Box */}
            <div className="p-3.5 border-t border-slate-100 bg-white/90 backdrop-blur-md rounded-b-[32px] flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask EduRAG a question..."
                className="flex-1 bg-slate-50 border border-slate-100 text-xs text-slate-800 rounded-2xl px-4 py-2.5 outline-none hover:border-slate-200 focus:border-[#6C63FF] focus:bg-white transition"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-2xl bg-[#6C63FF] hover:bg-[#5b52e0] text-white flex items-center justify-center shadow-md transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Send size={14} />
              </button>
            </div>

          </div>
        )}

        {/* Pulsing Floating Action Button (Glass 2.0 glow) */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Open AI assistant"
          className="w-14 h-14 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#8B5CF6] hover:from-[#5b52e0] hover:to-[#7a4be5] shadow-xl flex items-center justify-center text-white transition-all duration-300 active:scale-90 hover:scale-105 shadow-indigo-200/50 group border-4 border-white/80"
        >
          <Bot size={22} className="group-hover:rotate-12 transition duration-300" />
        </button>

      </div>
    </div>
  )
}

export default ChatbotWidget
