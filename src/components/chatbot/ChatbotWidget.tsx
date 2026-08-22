"use client"

import React, { useEffect, useRef, useState, useMemo } from "react"
import { Sparkles, Send, X, Bot, User, FileText, Trash2, Square } from "lucide-react"

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

  const listRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const storageKey = profile ? `arca-chat-session:${profile.id}:${profile.institution_id || profile.organization_id || "unscoped"}` : null

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
          id: data.id,
          name: data.name || data.email?.split("@")[0] || "User",
          role: data.role || "STUDENT",
          institution_id: data.institution_id,
          organization_id: data.organization_id,
        })
      } catch (err) {
        console.error("Failed to load profile for chatbot widget:", err)
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
      const res = await fetch("/api/chatbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
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
      <div className="flex items-end flex-col gap-3">

        {/* Chat Window Panel */}
        {open && (
          <div className="w-full sm:w-[360px] h-[calc(100vh-140px)] sm:h-[520px] max-h-[560px] bg-white/75 backdrop-blur-xl border border-white/40 shadow-2xl rounded-[32px] overflow-hidden flex flex-col transition-all duration-300 animate-in slide-in-from-bottom-6">

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
                    <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/[0.04] text-[var(--primary)] border border-[var(--primary)]/10 flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <Bot size={14} />
                    </div>
                  )}

                  <div className="max-w-[78%] space-y-1">
                    <div
                      className={`text-xs p-3.5 shadow-sm rounded-2xl ${
                        m.from === "user"
                          ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white rounded-tr-none font-medium"
                          : "bg-white border border-slate-100 text-slate-800 rounded-tl-none"
                      }`}
                    >
                      {m.from === "user" ? m.text : renderMarkdown(m.text)}

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
                                className="text-[9px] font-bold text-[var(--primary)] bg-[var(--primary)]/[0.05] border border-[var(--primary)]/10 rounded px-1.5 py-0.5 cursor-help max-w-[140px] truncate block"
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
              {loading && messages[messages.length - 1]?.text === "" && (
                <div className="flex items-start gap-2.5 animate-pulse">
                  <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/[0.04] border border-[var(--primary)]/10 flex items-center justify-center shrink-0 shadow-sm mt-1">
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
                className="flex-1 bg-slate-50 border border-slate-100 text-xs text-slate-800 rounded-2xl px-4 py-2.5 outline-none hover:border-slate-200 focus:border-[var(--primary)] focus:bg-white transition"
              />
              <button
                onClick={loading ? handleCancel : handleSend}
                disabled={!loading && !input.trim()}
                aria-label={loading ? "Stop response" : "Send message"}
                className="w-9 h-9 rounded-2xl bg-[var(--primary)] hover:bg-[var(--accent)] text-white flex items-center justify-center shadow-md transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                {loading ? <Square size={12} fill="currentColor" /> : <Send size={14} />}
              </button>
            </div>

          </div>
        )}

        {/* Pulsing Floating Action Button (Glass 2.0 glow) */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Open AI assistant"
          className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] hover:from-[var(--accent)] hover:to-[#0f5f89] shadow-xl flex items-center justify-center text-white transition-all duration-300 active:scale-90 hover:scale-105 shadow-[var(--primary)]/20 group border-4 border-white/80"
        >
          <Bot size={22} className="group-hover:rotate-12 transition duration-300" />
        </button>

      </div>
    </div>
  )
}

export default ChatbotWidget
