"use client"

import React, { useEffect, useRef, useState, useMemo } from "react"
import { Sparkles, Send, X, Bot, User, FileText, Trash2, Terminal } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

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
        let friendlyErrText = ""
        try {
          const contentType = res.headers.get("content-type") || ""
          if (contentType.includes("application/json")) {
            const json = await res.json()
            if (json && json.error) {
              if (json.error.includes("fetch failed") || json.error.toLowerCase().includes("backend failure")) {
                friendlyErrText = "Arca AI chatbot service is currently offline. Please ensure the backend server is running and try again in a few moments."
              } else {
                friendlyErrText = json.error
              }
            } else {
              friendlyErrText = JSON.stringify(json)
            }
          } else {
            friendlyErrText = await res.text()
          }
        } catch (e) {
          friendlyErrText = `Failed to connect (Status ${res.status})`
        }

        if (!friendlyErrText) {
          friendlyErrText = "An unexpected error occurred while communicating with the AI service. Please try again."
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-err-${Date.now()}`,
            from: "bot",
            text: friendlyErrText,
            timestamp: new Date()
          }
        ])

        return
      }

      const data = await res.json()

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
          text: "Unable to connect to assistant: FastAPI database service is offline.",
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
          <li key={i} className="ml-4 list-disc text-slate-700 mt-1 pl-0.5">
            {parsedLine}
          </li>
        )
      }
      return <p key={i} className="mt-1 leading-relaxed text-slate-700">{parsedLine}</p>
    })
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 font-sans">
      <div className="flex items-end flex-col gap-3.5">

        {/* Chat Window Panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 250, damping: 25 }}
              className="w-full sm:w-[380px] h-[calc(100vh-140px)] sm:h-[550px] max-h-[580px] bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-[28px] overflow-hidden flex flex-col relative"
            >

              {/* Header */}
              <div className="px-5 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-center shadow-sm">
                    <Sparkles size={18} className="text-slate-800" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm font-['Plus_Jakarta_Sans'] text-slate-900 tracking-tight leading-none">Arca AI</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-1.5 h-1.5 bg-[#EAAD62] rounded-full animate-pulse" />
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider font-['Space_Mono',monospace]">Secure Uplink Connected</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleClear}
                    title="Reset conversation"
                    className="w-8 h-8 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-250 flex items-center justify-center transition active:scale-95 text-slate-400 hover:text-slate-700"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Message Area */}
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/20"
                style={{ scrollBehavior: "smooth" }}
              >
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-start gap-2.5 ${m.from === "user" ? "justify-end" : "justify-start"}`}
                  >

                    {/* Bot Avatar */}
                    {m.from === "bot" && (
                      <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                        <Terminal size={12} />
                      </div>
                    )}

                    <div className="max-w-[78%] space-y-1">
                      <div
                        className={`text-xs p-3.5 leading-relaxed rounded-2xl ${
                          m.from === "user"
                            ? "bg-slate-900 text-white rounded-tr-none font-semibold shadow-sm"
                            : "bg-slate-50/70 border border-slate-200/50 text-slate-800 rounded-tl-none font-medium"
                        }`}
                      >
                        {m.from === "user" ? m.text : formatText(m.text)}

                        {/* Cited Sources */}
                        {m.from === "bot" && m.sources && m.sources.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-slate-200/60 space-y-1">
                            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <FileText size={10} /> Sources Cited:
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Array.from(new Set(m.sources.map(s => s.filename))).map((filename, sidx) => (
                                <span
                                  key={sidx}
                                  title={m.sources?.filter(s => s.filename === filename).map(s => s.snippet).join("\n\n")}
                                  className="text-[9px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 cursor-help max-w-[140px] truncate block hover:bg-slate-200 transition-colors"
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
                      <div className="w-7 h-7 rounded-xl bg-slate-900 text-[#ECDFCB] border border-slate-800 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                        <User size={12} />
                      </div>
                    )}

                  </motion.div>
                ))}

                {/* Loader Skeleton */}
                {loading && (
                  <div className="flex items-start gap-2.5 animate-pulse">
                    <div className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <Terminal size={12} className="text-slate-400" />
                    </div>
                    <div className="max-w-[78%] bg-slate-50/70 border border-slate-200/50 rounded-2xl rounded-tl-none p-3.5 space-y-2 w-full shadow-sm">
                      <div className="h-2 bg-slate-200 rounded w-5/6" />
                      <div className="h-2 bg-slate-200 rounded w-4/6" />
                      <div className="h-2 bg-slate-200 rounded w-2/6" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input Box */}
              <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 rounded-b-[28px] flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type a message or query..."
                  className="flex-1 bg-white border border-slate-200/85 text-xs text-slate-800 rounded-2xl px-4 py-3 outline-none hover:border-slate-350 focus:border-slate-900 transition-all duration-300 font-medium placeholder-slate-400"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-100 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer border-none outline-none"
                >
                  <Send size={13} />
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulsing Floating Action Button */}
        <motion.button
          onClick={() => setOpen((o) => !o)}
          aria-label="Open AI assistant"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 rounded-full bg-slate-900 border-2 border-slate-800 text-[#ECDFCB] shadow-xl flex items-center justify-center transition-all duration-300 shadow-slate-950/20 group cursor-pointer"
        >
          <AnimatePresence mode="wait">
            {open ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X size={20} />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Sparkles size={20} className="text-[#EAAD62] animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

      </div>
    </div>
  )
}

export default ChatbotWidget
