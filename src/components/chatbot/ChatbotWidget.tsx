"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { useChat } from "@ai-sdk/react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, FileText, History, Maximize2, MessageSquarePlus, Minimize2, Send, Square, Terminal, User, X } from "lucide-react"
import ReactMarkdown, { type Components } from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import remarkGfm from "remark-gfm"

import { Button } from "@/components/ui/button"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import { MessageScroller } from "@/components/ui/message-scroller"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import type { AssistantUIMessage, SourceCitation, WorkflowDefinition } from "@/lib/assistant/types"

type ChatProfile = {
  id: string
  actorId: string
  name: string
  role: string
  institution_id?: string | null
  organization_id?: string | null
}

type ConversationSummary = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

const STORAGE_PREFIX = "arca-assistant"

function textFromMessage(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("")
}

function sourcesFromMessage(message: AssistantUIMessage): SourceCitation[] {
  return message.parts.flatMap((part) => {
    if (part.type !== "data-sources" || !Array.isArray(part.data)) return []
    return part.data as SourceCitation[]
  })
}

function workflowFromMessage(message: AssistantUIMessage): WorkflowDefinition | null {
  const part = message.parts.find((candidate) => candidate.type === "data-workflow")
  return part?.type === "data-workflow" && part.data ? part.data as WorkflowDefinition : null
}

function navigationFromMessage(message: AssistantUIMessage): { label: string; href: string }[] {
  const part = message.parts.find((candidate) => candidate.type === "data-navigation")
  return part?.type === "data-navigation" && Array.isArray(part.data) ? part.data : []
}

function welcomeFor(profile: ChatProfile | null): string {
  if (!profile) return "Hi! I’m Arca, SkillArc’s product guide. Ask me about the platform, its services, or how to get started. Sign in when you’re ready for account-specific academic help."
  switch (profile.role) {
    case "STUDENT":
      return `Hi ${profile.name} 👋! I am Arca, your AI learning companion. Ask me about your courses, homework, timetable, or authorized syllabus documents.`
    case "FACULTY":
    case "HOD":
    case "PROGRAM_HEAD":
      return `Welcome, Professor ${profile.name} 📚! I am Arca, your read-only teaching companion. Ask me about your dashboard or how to use SkillArc features.`
    case "INSTITUTION_ADMIN":
      return `Welcome, Administrator ${profile.name} 🏛️! I can help with authorized campus data and explain where to find SkillArc features.`
    default:
      return `Hello ${profile.name}! I am Arca, your read-only SkillArc copilot. How can I help you today?`
  }
}

function welcomeMessage(profile: ChatProfile | null): AssistantUIMessage {
  return { id: "welcome", role: "assistant", parts: [{ type: "text", text: welcomeFor(profile) }] }
}

function isStoredMessage(value: unknown): value is AssistantUIMessage {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<AssistantUIMessage>
  return typeof item.id === "string" && (item.role === "user" || item.role === "assistant") && Array.isArray(item.parts)
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="my-2 whitespace-pre-wrap break-words first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-amber-500/50">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:font-semibold marker:text-amber-500/50">{children}</ol>,
  li: ({ children }) => <li className="break-words whitespace-pre-wrap pl-0.5">{children}</li>,
  table: ({ children }) => (
    <div className="my-3 max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-white/10 bg-slate-900/80">
      <table className="min-w-[520px] w-full border-collapse text-left text-[12px] leading-5">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-amber-500/10 text-[#ECDFCB]">{children}</thead>,
  th: ({ children }) => <th className="border-b border-white/10 px-3 py-2 font-bold whitespace-normal break-words">{children}</th>,
  td: ({ children }) => <td className="border-b border-white/5 px-3 py-2 align-top whitespace-normal break-words text-slate-300">{children}</td>,
  tr: ({ children }) => <tr className="last:[&>td]:border-b-0">{children}</tr>,
  pre: ({ children }) => <pre className="my-3 max-w-full overflow-x-auto rounded-xl bg-slate-950 p-3 text-[12px] leading-5 text-slate-100 ring-1 ring-white/10">{children}</pre>,
  code: ({ children, className }) => <code className={className ? "font-mono text-[12px]" : "rounded bg-white/10 px-1 py-0.5 font-mono text-[12px] text-amber-300"}>{children}</code>,
  a: ({ children, href }) => <a href={href} className="font-semibold text-amber-400 underline underline-offset-2 hover:text-amber-300">{children}</a>,
  strong: ({ children }) => <strong className="font-bold text-[#ECDFCB]">{children}</strong>,
  h1: ({ children }) => <h1 className="mt-4 mb-2 text-base font-extrabold text-[#ECDFCB] first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-3 mb-2 text-sm font-extrabold text-[#ECDFCB] first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-3 mb-1 text-[13px] font-bold text-[#ECDFCB]/90 first:mt-0">{children}</h3>,
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-amber-500/40 pl-3 text-slate-400 italic">{children}</blockquote>,
  hr: () => <hr className="my-3 border-white/10" />,
}

function formatConversationDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [profile, setProfile] = useState<ChatProfile | null>(null)
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "authenticated" | "guest">("idle")
  const [threadId, setThreadId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<ConversationSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [chatGeneration, setChatGeneration] = useState(0)
  const listRef = useRef<HTMLDivElement | null>(null)
  const profileRequestRef = useRef(0)
  const chatGenerationRef = useRef(0)
  const storageKey = profile ? `${STORAGE_PREFIX}:${profile.actorId}:${profile.id}:${profile.role}:${profile.institution_id ?? profile.organization_id ?? "unscoped"}` : null

  const privateTransport = useMemo(() => new DefaultChatTransport<AssistantUIMessage>({ api: "/api/assistant/chat" }), [])
  const publicTransport = useMemo(() => new DefaultChatTransport<AssistantUIMessage>({ api: "/api/assistant/public" }), [])
  const privateChat = useChat<AssistantUIMessage>({ id: `arca-private-widget:${chatGeneration}`, transport: privateTransport, onError: (error) => console.error("Arca assistant error", error.message) })
  const publicChat = useChat<AssistantUIMessage>({ id: `arca-public-widget:${chatGeneration}`, transport: publicTransport, onError: (error) => console.error("Arca public assistant error", error.message) })
  const setPrivateMessages = privateChat.setMessages
  const setPublicMessages = publicChat.setMessages
  const sendPrivateMessage = privateChat.sendMessage
  const sendPublicMessage = publicChat.sendMessage
  const stopPrivate = privateChat.stop
  const stopPublic = publicChat.stop
  const stopPrivateRef = useRef(stopPrivate)
  const stopPublicRef = useRef(stopPublic)
  const messages = profileStatus === "authenticated" ? privateChat.messages : publicChat.messages
  const status = profileStatus === "authenticated" ? privateChat.status : publicChat.status
  const error = profileStatus === "authenticated" ? privateChat.error : publicChat.error
  const loading = status === "submitted" || status === "streaming"

  useEffect(() => {
    stopPrivateRef.current = stopPrivate
    stopPublicRef.current = stopPublic
  }, [stopPrivate, stopPublic])

  const loadProfile = useCallback(async () => {
    const requestId = ++profileRequestRef.current
    setProfileStatus("loading")
    try {
      const response = await fetch("/api/auth/profile", { cache: "no-store" })
      if (!response.ok) {
        if (response.status === 401 && requestId === profileRequestRef.current) {
          setProfile(null)
          setProfileStatus("guest")
        }
        return
      }
      const data = await response.json()
      if (requestId !== profileRequestRef.current) return
      setProfile({
        id: data.id,
        actorId: data.original_id || data.id,
        name: data.name || data.email?.split("@")[0] || "User",
        role: data.role || "STUDENT",
        institution_id: data.institution_id,
        organization_id: data.organization_id,
      })
      setProfileStatus("authenticated")
    } catch {
      if (requestId !== profileRequestRef.current) return
      setProfile(null)
      setProfileStatus("guest")
    }
  }, [])

  // Profile work is deferred until the widget is opened. Auth transitions clear
  // the local thread before resolving the next principal.
  useEffect(() => {
    if (open && profileStatus === "idle") {
      const generation = chatGeneration
      queueMicrotask(() => {
        if (generation !== chatGenerationRef.current) return
        void loadProfile()
      })
    }
  }, [chatGeneration, loadProfile, open, profileStatus])

  useEffect(() => {
    const resetForAuthChange = () => {
      const nextChatGeneration = chatGenerationRef.current + 1
      chatGenerationRef.current = nextChatGeneration
      profileRequestRef.current += 1
      void stopPrivateRef.current()
      void stopPublicRef.current()
      setPrivateMessages([])
      setPublicMessages([])
      setChatGeneration(nextChatGeneration)
      setProfile(null)
      setThreadId(null)
      setHistory([])
      setHistoryOpen(false)
      setProfileStatus("idle")
    }
    window.addEventListener("skillarc-auth-changed", resetForAuthChange)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(resetForAuthChange)
    return () => {
      window.removeEventListener("skillarc-auth-changed", resetForAuthChange)
      subscription.unsubscribe()
    }
  }, [setPrivateMessages, setPublicMessages])

  useEffect(() => {
    if (profileStatus === "loading") return
    const generation = chatGeneration
    queueMicrotask(() => {
      if (generation !== chatGenerationRef.current) return
      if (!profile) {
      setThreadId(null)
      setPublicMessages([welcomeMessage(null)])
      return
      }
      const saved = storageKey ? window.localStorage.getItem(storageKey) : null
      const savedValue = saved ? (() => {
        try { return JSON.parse(saved) as { threadId?: string; messages?: unknown } } catch { return null }
      })() : null
      const savedMessages = Array.isArray(savedValue?.messages) ? savedValue.messages.filter(isStoredMessage) : []
      setThreadId(savedValue?.threadId ?? crypto.randomUUID())
      setPrivateMessages(savedMessages.length ? savedMessages : [welcomeMessage(profile)])
    })
  }, [chatGeneration, profile, profileStatus, setPrivateMessages, setPublicMessages, storageKey])

  useEffect(() => {
    if (!storageKey || !threadId || !messages.length || profileStatus !== "authenticated") return
    window.localStorage.setItem(storageKey, JSON.stringify({ threadId, messages }))
  }, [messages, profileStatus, storageKey, threadId])

  useEffect(() => {
    if (!historyOpen || profileStatus !== "authenticated") return
    let cancelled = false
    setHistoryLoading(true)
    setHistoryError(null)
    void fetch("/api/assistant/threads", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Conversation history is unavailable right now.")
        return response.json() as Promise<{ threads?: ConversationSummary[] }>
      })
      .then((data) => {
        if (!cancelled) setHistory(data.threads ?? [])
      })
      .catch((error: unknown) => {
        if (!cancelled) setHistoryError(error instanceof Error ? error.message : "Conversation history is unavailable right now.")
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => { cancelled = true }
  }, [historyOpen, profileStatus])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, open, loading])

  const handleSend = async () => {
    const question = input.trim()
    if (!question || loading || profileStatus === "loading") return
    setInput("")
    if (profileStatus === "authenticated") {
      if (!threadId) return
      await sendPrivateMessage({ text: question }, { body: { threadId, clientTurnId: crypto.randomUUID() } })
    } else {
      await sendPublicMessage({ text: question }, { body: { clientTurnId: crypto.randomUUID() } })
    }
  }

  const handleNewConversation = () => {
    if (profileStatus === "authenticated") stopPrivate()
    else stopPublic()
    const nextMessages = [welcomeMessage(profile)]
    if (profileStatus !== "authenticated") {
      setPublicMessages(nextMessages)
      return
    }
    setPrivateMessages(nextMessages)
    const nextThreadId = crypto.randomUUID()
    setThreadId(nextThreadId)
    setHistoryOpen(false)
    if (storageKey) window.localStorage.setItem(storageKey, JSON.stringify({ threadId: nextThreadId, messages: nextMessages }))
  }

  const handleOpenConversation = async (conversationId: string) => {
    if (loading || profileStatus !== "authenticated") return
    stopPrivate()
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const response = await fetch(`/api/assistant/threads/${conversationId}`, { cache: "no-store" })
      if (!response.ok) throw new Error("That conversation could not be opened.")
      const data = await response.json() as { messages?: unknown[] }
      const restoredMessages = (data.messages ?? []).filter(isStoredMessage)
      setThreadId(conversationId)
      setPrivateMessages(restoredMessages.length ? restoredMessages : [welcomeMessage(profile)])
      setHistoryOpen(false)
    } catch (error: unknown) {
      setHistoryError(error instanceof Error ? error.message : "That conversation could not be opened.")
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <div className="skillarc-chatbot-root fixed bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] left-4 right-4 z-50 font-sans sm:bottom-6 sm:left-auto sm:right-6 pointer-events-none">
      <div className="flex flex-col items-end gap-3.5">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 250, damping: 25 }}
              className={`pointer-events-auto relative flex h-[min(680px,calc(100dvh-96px))] max-h-[680px] w-full max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[28px] bg-[#0B1120] shadow-2xl shadow-amber-900/10 ring-1 ring-amber-500/10 backdrop-blur-xl transition-[width] duration-200 ${expanded ? "sm:w-[min(92vw,700px)]" : "sm:w-[min(92vw,460px)]"}`}
            >
              <div className="flex items-center justify-between border-b border-amber-500/10 bg-slate-950 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-amber-500/20 shadow-lg shadow-amber-500/10">
                    <img src="/animations/energy-orb.gif" alt="Arca" className="h-full w-full object-cover scale-110" draggable={false} />
                  </div>
                  <div>
                    <h3 className="font-['Plus_Jakarta_Sans'] text-sm font-extrabold leading-none tracking-tight text-[#ECDFCB]">Arca AI</h3>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => setExpanded((value) => !value)} title={expanded ? "Use compact width" : "Expand assistant"} aria-label={expanded ? "Use compact width" : "Expand assistant"} aria-pressed={expanded} className="h-8 w-8 rounded-xl text-[#ECDFCB]/60 hover:bg-white/5 hover:text-[#ECDFCB]">{expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</Button>
                  {profileStatus === "authenticated" && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setHistoryOpen((value) => !value)} title="Conversation history" aria-label="Conversation history" className="h-8 w-8 rounded-xl text-[#ECDFCB]/60 hover:bg-white/5 hover:text-[#ECDFCB]"><History size={14} /></Button>
                  )}
                  <Button type="button" variant="ghost" size="icon" onClick={handleNewConversation} title="New conversation" aria-label="New conversation" className="h-8 w-8 rounded-xl text-[#ECDFCB]/60 hover:bg-white/5 hover:text-[#ECDFCB]"><MessageSquarePlus size={14} /></Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close AI assistant" className="h-8 w-8 rounded-xl text-[#ECDFCB]/60 hover:bg-white/5 hover:text-[#ECDFCB]"><X size={14} /></Button>
                </div>
              </div>

              {historyOpen ? (
                <div className="min-h-0 flex-1 overflow-y-auto bg-[#0D1526] p-4">
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setHistoryOpen(false)} aria-label="Back to conversation" className="h-8 w-8 rounded-xl text-[#ECDFCB]/60 hover:bg-white/5 hover:text-[#ECDFCB]"><ArrowLeft size={15} /></Button>
                    <div>
                      <h4 className="text-sm font-bold text-[#ECDFCB]">Conversation history</h4>
                      <p className="text-[11px] text-slate-400">Your saved Arca conversations</p>
                    </div>
                  </div>
                  {historyLoading && <div className="space-y-2 p-1"><div className="h-14 animate-pulse rounded-2xl bg-white/5" /><div className="h-14 animate-pulse rounded-2xl bg-white/5" /></div>}
                  {!historyLoading && historyError && <p className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">{historyError}</p>}
                  {!historyLoading && !historyError && !history.length && <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-center"><MessageSquarePlus className="mx-auto mb-2 h-5 w-5 text-slate-500" /><p className="text-sm font-semibold text-[#ECDFCB]/80">No saved conversations yet</p><p className="mt-1 text-xs text-slate-400">Start asking Arca a question and it will appear here.</p></div>}
                  {!historyLoading && !historyError && history.length > 0 && <div className="space-y-2">{history.map((conversation) => <button key={conversation.id} type="button" onClick={() => void handleOpenConversation(conversation.id)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 text-left transition hover:border-amber-500/20 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60" disabled={historyLoading}><span className="block truncate text-xs font-bold text-[#ECDFCB]/90">{conversation.title}</span><span className="mt-1 block text-[11px] text-slate-500">{formatConversationDate(conversation.updatedAt)}</span></button>)}</div>}
                </div>
              ) : <MessageScroller ref={listRef} className="space-y-4 bg-[#0D1526] p-5" style={{ scrollBehavior: "smooth" }}>
                {messages.map((message) => {
                  const isUser = message.role === "user"
                  const text = textFromMessage(message)
                  const sources = message.role === "assistant" ? sourcesFromMessage(message) : []
                  const workflow = message.role === "assistant" ? workflowFromMessage(message) : null
                  const navigation = message.role === "assistant" ? navigationFromMessage(message) : []
                  if (!text && !sources.length && !workflow && !navigation.length) return null
                  return (
                    <Message key={message.id} className={isUser ? "justify-end" : "justify-start"}>
                      {!isUser && <MessageAvatar className="border border-amber-500/20 bg-slate-900 text-[#ECDFCB] shadow-lg shadow-amber-500/5"><Terminal size={12} /></MessageAvatar>}
                      <div className={isUser ? "max-w-[82%] space-y-1" : "min-w-0 flex-1 space-y-1"}>
                        <MessageContent className={isUser ? "max-w-full rounded-tr-none bg-gradient-to-br from-amber-600 to-amber-700 font-semibold text-white shadow-lg shadow-amber-900/20" : "w-full max-w-full min-w-0 rounded-tl-none border border-white/10 bg-white/5 backdrop-blur-sm font-medium text-slate-200"}>
                          {isUser ? <div className="whitespace-pre-wrap break-words">{text}</div> : <div className="min-w-0 break-words text-[13px] leading-5 text-slate-200"><ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{text}</ReactMarkdown></div>}
                          {sources.length > 0 && (
                            <details className="mt-3 border-t border-white/10 pt-2.5">
                              <summary className="flex cursor-pointer list-none items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-[#ECDFCB]/50"><FileText size={10} /> Sources cited ({sources.length})</summary>
                              <div className="mt-2 space-y-1.5">{sources.map((source) => <div key={source.id} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] text-slate-300"><a href={source.href ?? "#"} className="font-bold text-amber-400 underline" onClick={(event) => { if (!source.href) event.preventDefault() }}>{source.title}</a>{source.snippet && <p className="mt-0.5 text-slate-400">{source.snippet}</p>}</div>)}</div>
                            </details>
                          )}
                          {workflow && (
                            <div className="mt-3 space-y-2 border-t border-white/10 pt-2.5">
                              <p className="text-[10px] font-extrabold text-[#ECDFCB]">{workflow.title}</p>
                              {workflow.prerequisites.length > 0 && <p className="text-[10px] text-slate-400"><span className="font-bold">Before you start:</span> {workflow.prerequisites.join(" ")}</p>}
                              <ol className="list-decimal space-y-1 pl-4 text-[10px] text-slate-300">{workflow.steps.map((step) => <li key={step.title}><span className="font-bold text-[#ECDFCB]/80">{step.title}:</span> {step.description}{step.href && <a href={step.href} className="ml-1 font-bold text-amber-400 underline">Go to…</a>}</li>)}</ol>
                              <p className="text-[10px] italic text-slate-500">Arca provides guidance only. Complete the action manually in SkillArc.</p>
                            </div>
                          )}
                          {navigation.length > 0 && !workflow && (
                            <div className="mt-3 flex flex-wrap gap-1 border-t border-white/10 pt-2.5">{navigation.map((item) => <a key={item.href} href={item.href} className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-500/20 transition-colors">{item.label}</a>)}</div>
                          )}
                        </MessageContent>
                        <span className="block px-1 text-[9px] text-slate-500">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {isUser && <MessageAvatar className="border border-slate-800 bg-slate-900 text-[#ECDFCB] shadow-sm"><User size={12} /></MessageAvatar>}
                    </Message>
                  )
                })}
                {loading && (
                  <Message className="justify-start">
                    <MessageAvatar className="border-0 bg-transparent shadow-none overflow-hidden p-0 flex items-center justify-center">
                      <img src="/animations/thinking.gif" alt="Arca is thinking…" className="h-full w-full object-contain" draggable={false} />
                    </MessageAvatar>
                    <MessageContent className="rounded-tl-none border border-white/10 bg-white/5 backdrop-blur-sm shadow-sm px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-[#ECDFCB]/70">Arca is thinking</span>
                        <span className="flex gap-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500/70 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500/70 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    </MessageContent>
                  </Message>
                )}
                {error && <p className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">{error.message || "The assistant could not complete that response."}</p>}
                {profileStatus === "loading" && <div className="flex justify-center p-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-400" /></div>}
              </MessageScroller>}

              <div className="flex items-center gap-2 rounded-b-[28px] border-t border-amber-500/10 bg-slate-950 p-3.5">
                <Textarea rows={1} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSend() } }} placeholder={profileStatus === "authenticated" ? "Ask about your dashboard or SkillArc..." : "Ask about SkillArc..."} disabled={profileStatus === "loading" || loading} className="min-h-10 flex-1 resize-none rounded-2xl border-white/10 bg-white/5 px-4 py-3 text-xs font-medium leading-4 text-[#ECDFCB] outline-none transition-all duration-300 placeholder:text-slate-500 hover:border-amber-500/20 focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60" />
                <Button type="button" size="icon-lg" onClick={loading ? (profileStatus === "authenticated" ? stopPrivate : stopPublic) : () => void handleSend()} disabled={!loading && (!input.trim() || profileStatus === "loading")} aria-label={loading ? "Stop response" : "Send message"} className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500">{loading ? <Square size={12} fill="currentColor" /> : <Send size={14} />}</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button 
          onClick={() => setOpen((value) => !value)} 
          aria-label="Open AI assistant" 
          whileHover={{ scale: 1.08 }} 
          whileTap={{ scale: 0.92 }} 
          className="pointer-events-auto group relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-950 shadow-2xl shadow-slate-950/30 transition-all"
        >
          <AnimatePresence mode="wait">
            {open
              ? <motion.div key="close" initial={{ rotate: -90, opacity: 0, scale: 0.7 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.7 }} className="flex items-center justify-center">
                  <X size={22} className="text-[#ECDFCB]" />
                </motion.div>
              : <motion.div key="orb" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} className="h-full w-full">
                  <img
                    src="/animations/energy-orb.gif"
                    alt="Open Arca AI"
                    className="h-full w-full object-cover scale-110"
                    draggable={false}
                  />
                </motion.div>
            }
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  )
}

export default ChatbotWidget
