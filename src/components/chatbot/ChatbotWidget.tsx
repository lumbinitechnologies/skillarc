"use client"

import React, { useEffect, useRef, useState, useMemo } from "react"
import { Sparkles, Send, X, User, FileText, Trash2, Square, Terminal } from "lucide-react"
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

interface ChatProfile {
  id: string
  name: string
  role: string
  institution_id?: string | null
  organization_id?: string | null
}

type StreamEvent = Record<string, unknown>

function messageFromStored(value: unknown): Message | null {
  if (!value || typeof value !== "object") return null
  const item = value as Record<string, unknown>
  const text = typeof item.text === "string" ? item.text : typeof item.content === "string" ? item.content : ""
  const from = item.from === "user" || item.role === "user" ? "user" : "bot"
  if (!text) return null
  return {
    id: typeof item.id === "string" ? item.id : `${from}-${crypto.randomUUID()}`,
    from,
    text,
    sources: Array.isArray(item.sources) ? item.sources as SourceCitation[] : undefined,
    timestamp: new Date(typeof item.timestamp === "string" || typeof item.timestamp === "number" ? item.timestamp : Date.now()),
  }
}

function parseStreamPayload(raw: string): { text?: string; sessionId?: string; sources?: SourceCitation[]; done?: boolean; error?: string } {
  let value: unknown = raw
  try { value = JSON.parse(raw) } catch { /* Some backends send plain text SSE data. */ }
  if (typeof value === "string") return { text: value }
  if (!value || typeof value !== "object") return {}
  const event = value as StreamEvent
  const text = [event.delta, event.token, event.text, event.content, event.answer].find((item) => typeof item === "string") as string | undefined
  return {
    text,
    sessionId: typeof event.session_id === "string" ? event.session_id : typeof event.sessionId === "string" ? event.sessionId : undefined,
    sources: Array.isArray(event.sources) ? event.sources as SourceCitation[] : undefined,
    done: event.done === true || event.type === "done" || event.event === "done",
    error: typeof event.error === "string" ? event.error : undefined,
  }
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const tokens = text.split(/(`[^`]*`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]*\))/g)
  return tokens.map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={`${keyPrefix}-b-${index}`}>{token.slice(2, -2)}</strong>
    if (token.startsWith("`") && token.endsWith("`")) return <code key={`${keyPrefix}-c-${index}`} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em]">{token.slice(1, -1)}</code>
    const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
    if (link) return <a key={`${keyPrefix}-a-${index}`} href={link[2]} target="_blank" rel="noreferrer" className="text-[var(--primary)] underline">{link[1]}</a>
    return <React.Fragment key={`${keyPrefix}-t-${index}`}>{token}</React.Fragment>
  })
}

function renderMarkdown(text: string) {
  const lines = text.split(/\r?\n/)
  const blocks: React.ReactNode[] = []
  let list: string[] = []
  const flushList = () => {
    if (!list.length) return
    blocks.push(<ul key={`list-${blocks.length}`} className="ml-4 list-disc space-y-1 text-slate-700">{list.map((item, index) => <li key={index}>{renderInline(item, `li-${blocks.length}-${index}`)}</li>)}</ul>)
    list = []
  }
  let inCode = false
  let code = ""
  let language = ""
  lines.forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      if (inCode) blocks.push(<pre key={`code-${index}`} className="overflow-x-auto rounded-lg bg-slate-900 p-2 text-[10px] text-slate-100"><code>{code.replace(/\n$/, "")}</code></pre>)
      else { flushList(); language = line.trim().slice(3); void language; }
      inCode = !inCode; code = ""; return
    }
    if (inCode) { code += `${line}\n`; return }
    const bullet = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/)
    if (bullet) { list.push(bullet[1]); return }
    flushList()
    if (!line.trim()) return
    blocks.push(<p key={`p-${index}`} className="leading-relaxed text-slate-700">{renderInline(line, `p-${index}`)}</p>)
  })
  if (inCode) blocks.push(<pre key="code-final" className="overflow-x-auto rounded-lg bg-slate-900 p-2 text-[10px] text-slate-100"><code>{code}</code></pre>)
  flushList()
  return <div className="space-y-1.5">{blocks}</div>
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // User profile context state
  const [profile, setProfile] = useState<ChatProfile | null>(null)
  const [profileStatus, setProfileStatus] = useState<"loading" | "authenticated" | "guest">("loading")

  const listRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const storageKey = profile ? `arca-chat-session:${profile.id}:${profile.institution_id || profile.organization_id || "unscoped"}` : null

  // Fetch active user profile context on load
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/auth/profile")

        if (!res.ok) {
          if (res.status === 401) {
            setProfileStatus("guest")
            return
          }
          throw new Error(`Profile fetch failed: ${res.status}`)
        }

        const contentType = res.headers.get("content-type") || ""
        if (!contentType.includes("application/json")) {
          console.warn("Expected JSON from /api/auth/profile but got:", contentType)
          return
        }

        const data = await res.json()
        setProfile({
          id: data.id,
          name: data.name || data.email?.split("@")[0] || "User",
          role: data.role || "STUDENT",
          institution_id: data.institution_id,
          organization_id: data.organization_id,
        })
        setProfileStatus("authenticated")
      } catch (err) {
        console.error("Failed to load profile for chatbot widget:", err)
        // A failed profile lookup must never grant private access. Fall back
        // to the restricted product-help experience.
        setProfileStatus("guest")
      }
    }
    loadProfile()
  }, [])

  // Restore the scoped session only after the authenticated profile is known.
  useEffect(() => {
    if (!storageKey || !profile) return
    let cancelled = false
    const saved = window.localStorage.getItem(storageKey)
    if (!saved) return
    queueMicrotask(() => setSessionId(saved))
    fetch(`/api/chatbot/chat?session_id=${encodeURIComponent(saved)}`, { cache: "no-store" })
      .then(async (res) => res.ok ? res.json() : null)
      .then((data) => {
        if (cancelled || !data) return
        const rawMessages = Array.isArray(data) ? data : data.messages
        const restored = Array.isArray(rawMessages) ? rawMessages.map(messageFromStored).filter(Boolean) as Message[] : []
        if (restored.length) setMessages(restored)
      })
      .catch(() => { /* A stale/expired session is harmless; start a fresh one. */ })
    return () => { cancelled = true }
  }, [storageKey, profile])

  // Welcome message based on active role
  const welcomeMessage = useMemo(() => {
    if (!profile) return "Hi! I’m Arca, SkillArc’s product guide. Ask me about the platform, its services, or how to get started. Sign in when you’re ready for account-specific academic help."
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
    if (messages.length !== 0 || profileStatus === "loading") return
    let active = true
    queueMicrotask(() => {
      if (!active) return
      setMessages([
        {
          id: "welcome",
          from: "bot",
          text: welcomeMessage,
          timestamp: new Date()
        }
      ])
    })
    return () => { active = false }
  }, [profile, profileStatus, welcomeMessage, messages.length])

  // Auto Scroll
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, open, loading])

  const handleSend = async () => {
    if (!input.trim() || loading || profileStatus === "loading") return
    const userMsgText = input.trim()
    setInput("")

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      from: "user",
      text: userMsgText,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    setLoading(true)
    const assistantId = `bot-${Date.now()}`
    const controller = new AbortController()
    let timedOut = false
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 90_000)
    abortRef.current = controller
    setMessages((prev) => [...prev, { id: assistantId, from: "bot", text: "", timestamp: new Date() }])

    try {
      const endpoint = profileStatus === "authenticated" ? "/api/chatbot/chat" : "/api/chatbot/public"
      const body = profileStatus === "authenticated"
        ? { question: userMsgText, session_id: sessionId }
        : { question: userMsgText }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        let friendlyErrText = ""
        try {
          const contentType = res.headers.get("content-type") || ""
          if (contentType.includes("application/json")) {
            const json = await res.json()
            if (json && json.error) {
              if (json.error.includes("fetch failed") || json.error.toLowerCase().includes("backend failure")) {
                friendlyErrText = "Arca AI chatbot service is currently offline. Please try again in a few moments."
              } else {
                friendlyErrText = json.error
              }
            } else {
              friendlyErrText = JSON.stringify(json)
            }
          } else {
            friendlyErrText = await res.text()
          }
      } catch {
          friendlyErrText = `Failed to connect (Status ${res.status})`
        }

        if (!friendlyErrText) {
          friendlyErrText = "An unexpected error occurred while communicating with the AI service. Please try again."
        }

        setMessages((prev) => prev.map((message) => message.id === assistantId ? { ...message, text: friendlyErrText } : message))

        return
      }

      if (!res.body) throw new Error("The assistant returned no stream")
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let answer = ""
      let sources: SourceCitation[] | undefined
      const consume = (rawEvent: string) => {
        const dataLines = rawEvent.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart())
        if (!dataLines.length) return
        const parsed = parseStreamPayload(dataLines.join("\n"))
        if (parsed.sessionId) {
          setSessionId(parsed.sessionId)
          if (storageKey) window.localStorage.setItem(storageKey, parsed.sessionId)
        }
        if (parsed.sources) {
          sources = parsed.sources
          setMessages((prev) => prev.map((message) => message.id === assistantId ? { ...message, sources } : message))
        }
        if (parsed.error) throw new Error(parsed.error)
        if (parsed.text) {
          answer += parsed.text
          setMessages((prev) => prev.map((message) => message.id === assistantId ? { ...message, text: answer, sources } : message))
        }
      }
      while (true) {
        const { value, done } = await reader.read()
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
        const events = buffer.split(/\r?\n\r?\n/)
        buffer = events.pop() || ""
        events.forEach(consume)
        if (done) break
      }
      if (buffer.trim()) consume(buffer)
      if (!answer) setMessages((prev) => prev.map((message) => message.id === assistantId ? { ...message, text: "The assistant returned an empty response." } : message))
    } catch (err: unknown) {
      if (timedOut) {
        setMessages((prev) => prev.map((message) => message.id === assistantId ? { ...message, text: message.text ? `${message.text}\n\n_Response timed out. Please try again._` : "The assistant timed out. Please try again." } : message))
      } else if (controller.signal.aborted) {
        setMessages((prev) => prev.map((message) => message.id === assistantId && message.text ? { ...message, text: `${message.text}\n\n_Response stopped._` } : message))
      } else {
        console.error("Chat stream error", err instanceof Error ? err.message : err)
        setMessages((prev) => prev.map((message) => message.id === assistantId ? { ...message, text: "Unable to connect to the assistant. Please try again." } : message))
      }
    } finally {
      window.clearTimeout(timeoutId)
      abortRef.current = null
      setLoading(false)
    }
  }

  const handleCancel = () => abortRef.current?.abort()

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
    if (storageKey) window.localStorage.removeItem(storageKey)
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
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-[#EAAD62] rounded-full animate-pulse" />
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider font-['Space_Mono',monospace]">Secure Uplink Connected</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleClear}
                  title="Reset conversation"
                  className="w-8 h-8 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 flex items-center justify-center transition active:scale-95 text-slate-400 hover:text-slate-700"
                >
                  <Trash2 size={13} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close AI assistant"
                  className="w-8 h-8 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 flex items-center justify-center transition active:scale-95 text-slate-400 hover:text-slate-700"
                >
                  <X size={14} />
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
                      {m.from === "user" ? m.text : renderMarkdown(m.text)}

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

              {/* Loader Skeleton (Glass 2.0 feel) */}
              {loading && messages[messages.length - 1]?.text === "" && (
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
                className="flex-1 bg-white border border-slate-200/85 text-xs text-slate-800 rounded-2xl px-4 py-3 outline-none hover:border-slate-300 focus:border-slate-900 transition-all duration-300 font-medium placeholder-slate-400"
              />
              <button
                onClick={loading ? handleCancel : handleSend}
                disabled={!loading && (!input.trim() || profileStatus === "loading")}
                aria-label={loading ? "Stop response" : "Send message"}
                className="w-10 h-10 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-100 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer border-none outline-none"
              >
                {loading ? <Square size={12} fill="currentColor" /> : <Send size={14} />}
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
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <X size={20} />
              </motion.div>
            ) : (
              <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
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
