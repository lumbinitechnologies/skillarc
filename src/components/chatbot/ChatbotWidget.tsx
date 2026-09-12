"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { useChat } from "@ai-sdk/react"
import { AnimatePresence, motion } from "framer-motion"
import { FileText, Send, Sparkles, Square, Terminal, Trash2, User, X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import remarkGfm from "remark-gfm"

import { Button } from "@/components/ui/button"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import { MessageScroller } from "@/components/ui/message-scroller"
import { Spinner } from "@/components/ui/spinner"
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

export function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [profile, setProfile] = useState<ChatProfile | null>(null)
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "authenticated" | "guest">("idle")
  const [threadId, setThreadId] = useState<string | null>(null)
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

  const handleClear = () => {
    if (profileStatus === "authenticated") stopPrivate()
    else stopPublic()
    const nextMessages = [welcomeMessage(profile)]
    if (profileStatus !== "authenticated") {
      setPublicMessages(nextMessages)
      return
    }
    setPrivateMessages(nextMessages)
    void fetch("/api/assistant/thread", { method: "POST" })
      .then((response) => response.ok ? response.json() as Promise<{ threadId: string }> : null)
      .then((data) => {
        const nextThreadId = data?.threadId ?? crypto.randomUUID()
        setThreadId(nextThreadId)
        if (storageKey) window.localStorage.setItem(storageKey, JSON.stringify({ threadId: nextThreadId, messages: nextMessages }))
      })
      .catch(() => setThreadId(crypto.randomUUID()))
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 font-sans sm:bottom-6 sm:left-auto sm:right-6">
      <div className="flex flex-col items-end gap-3.5">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 250, damping: 25 }}
              className="relative flex h-[calc(100vh-140px)] max-h-[580px] w-full flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-xl sm:h-[550px] sm:w-[380px]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/60 bg-slate-50 shadow-sm"><Sparkles size={18} className="text-slate-800" /></div>
                  <div>
                    <h3 className="font-['Plus_Jakarta_Sans'] text-sm font-extrabold leading-none tracking-tight text-slate-900">Arca AI</h3>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#EAAD62]" />
                      <span className="font-['Space_Mono',monospace] text-[9px] font-extrabold uppercase tracking-wider text-slate-400">{profileStatus === "authenticated" ? "Secure uplink" : "Product guide"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={handleClear} title="Reset conversation" className="h-8 w-8 rounded-xl text-slate-400 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700"><Trash2 size={13} /></Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close AI assistant" className="h-8 w-8 rounded-xl text-slate-400 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700"><X size={14} /></Button>
                </div>
              </div>

              <MessageScroller ref={listRef} className="space-y-4 bg-slate-50/20 p-5" style={{ scrollBehavior: "smooth" }}>
                {messages.map((message) => {
                  const isUser = message.role === "user"
                  const text = textFromMessage(message)
                  const sources = message.role === "assistant" ? sourcesFromMessage(message) : []
                  const workflow = message.role === "assistant" ? workflowFromMessage(message) : null
                  const navigation = message.role === "assistant" ? navigationFromMessage(message) : []
                  if (!text && !sources.length && !workflow && !navigation.length) return null
                  return (
                    <Message key={message.id} className={isUser ? "justify-end" : "justify-start"}>
                      {!isUser && <MessageAvatar className="border border-slate-200 bg-slate-100 text-slate-700 shadow-sm"><Terminal size={12} /></MessageAvatar>}
                      <div className="max-w-[82%] space-y-1">
                        <MessageContent className={isUser ? "rounded-tr-none bg-slate-900 font-semibold text-white shadow-sm" : "rounded-tl-none border border-slate-200/50 bg-slate-50/70 font-medium text-slate-800"}>
                          {isUser ? text : <div className="prose prose-xs max-w-none prose-slate prose-p:my-1.5 prose-li:my-0.5"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{text}</ReactMarkdown></div>}
                          {sources.length > 0 && (
                            <details className="mt-3 border-t border-slate-200/60 pt-2.5">
                              <summary className="flex cursor-pointer list-none items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400"><FileText size={10} /> Sources cited ({sources.length})</summary>
                              <div className="mt-2 space-y-1.5">{sources.map((source) => <div key={source.id} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-600"><a href={source.href ?? "#"} className="font-bold underline" onClick={(event) => { if (!source.href) event.preventDefault() }}>{source.title}</a>{source.snippet && <p className="mt-0.5 text-slate-500">{source.snippet}</p>}</div>)}</div>
                            </details>
                          )}
                          {workflow && (
                            <div className="mt-3 space-y-2 border-t border-slate-200/60 pt-2.5">
                              <p className="text-[10px] font-extrabold text-slate-700">{workflow.title}</p>
                              {workflow.prerequisites.length > 0 && <p className="text-[10px] text-slate-500"><span className="font-bold">Before you start:</span> {workflow.prerequisites.join(" ")}</p>}
                              <ol className="list-decimal space-y-1 pl-4 text-[10px] text-slate-600">{workflow.steps.map((step) => <li key={step.title}><span className="font-bold">{step.title}:</span> {step.description}{step.href && <a href={step.href} className="ml-1 font-bold underline">Go to…</a>}</li>)}</ol>
                              <p className="text-[10px] italic text-slate-500">Arca provides guidance only. Complete the action manually in SkillArc.</p>
                            </div>
                          )}
                          {navigation.length > 0 && !workflow && (
                            <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-200/60 pt-2.5">{navigation.map((item) => <a key={item.href} href={item.href} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 underline">{item.label}</a>)}</div>
                          )}
                        </MessageContent>
                        <span className="block px-1 text-[9px] text-slate-400">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {isUser && <MessageAvatar className="border border-slate-800 bg-slate-900 text-[#ECDFCB] shadow-sm"><User size={12} /></MessageAvatar>}
                    </Message>
                  )
                })}
                {loading && (
                  <Message className="animate-pulse justify-start">
                    <MessageAvatar className="border border-slate-200 bg-slate-100 text-slate-400 shadow-sm"><Terminal size={12} /></MessageAvatar>
                    <MessageContent className="w-48 rounded-tl-none border border-slate-200/50 bg-slate-50/70 shadow-sm"><div className="space-y-2"><div className="h-2 w-5/6 rounded bg-slate-200" /><div className="h-2 w-4/6 rounded bg-slate-200" /><div className="h-2 w-2/6 rounded bg-slate-200" /></div></MessageContent>
                  </Message>
                )}
                {error && <p className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700">{error.message || "The assistant could not complete that response."}</p>}
                {profileStatus === "loading" && <div className="flex justify-center p-2"><Spinner className="h-4 w-4 text-slate-400" /></div>}
              </MessageScroller>

              <div className="flex items-center gap-2 rounded-b-[28px] border-t border-slate-100 bg-slate-50/50 p-3.5">
                <Textarea rows={1} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSend() } }} placeholder={profileStatus === "authenticated" ? "Ask about your dashboard or SkillArc..." : "Ask about SkillArc..."} disabled={profileStatus === "loading" || loading} className="min-h-10 flex-1 resize-none rounded-2xl border-slate-200/85 bg-white px-4 py-3 text-xs font-medium leading-4 text-slate-800 outline-none transition-all duration-300 placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-900 disabled:cursor-not-allowed disabled:opacity-60" />
                <Button type="button" size="icon-lg" onClick={loading ? (profileStatus === "authenticated" ? stopPrivate : stopPublic) : () => void handleSend()} disabled={!loading && (!input.trim() || profileStatus === "loading")} aria-label={loading ? "Stop response" : "Send message"} className="h-10 w-10 rounded-2xl bg-slate-900 text-white shadow-md hover:bg-slate-800">{loading ? <Square size={12} fill="currentColor" /> : <Send size={14} />}</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button onClick={() => setOpen((value) => !value)} aria-label="Open AI assistant" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="group flex h-14 w-14 items-center justify-center rounded-full border-2 border-slate-800 bg-slate-900 text-[#ECDFCB] shadow-xl shadow-slate-950/20 transition-all">
          <AnimatePresence mode="wait">
            {open ? <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X size={20} /></motion.div> : <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><Sparkles size={20} className="animate-pulse text-[#EAAD62]" /></motion.div>}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  )
}

export default ChatbotWidget
