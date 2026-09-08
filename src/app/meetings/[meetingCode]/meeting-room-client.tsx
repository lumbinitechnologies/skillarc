"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Users,
  MessageSquare,
  Copy,
  Circle,
  Clock,
  Pencil,
  X,
  Play,
  Loader2,
  CheckCircle2,
  MonitorUp,
  MonitorX,
  LayoutGrid,
  Hand,
  Sparkles,
  Split,
  ShieldCheck,
  UserCheck,
  Search,
  ExternalLink
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import {
  endMeetingAction,
  postMeetingMessageAction,
  getMeetingMessagesAction,
  recordJoinMeetingAction,
  recordLeaveMeetingAction,
  getMeetingAnalyticsAction
} from "@/app/actions/meetings"

import Whiteboard from "@/components/video-meeting/whiteboard"
import VirtualBackgrounds, { VirtualBg } from "@/components/video-meeting/virtual-backgrounds"
import BreakoutRooms from "@/components/video-meeting/breakout-rooms"
import FloatingReactions, { ReactionItem } from "@/components/video-meeting/floating-reactions"

// Extend window interface for Jitsi Meet external script
declare global {
  interface Window {
    JitsiMeetExternalAPI: any
  }
}

interface UserSession {
  id: string
  name: string
  email: string
  role: "faculty" | "student"
  institutionId: string
}

interface MeetingRoomClientProps {
  user: UserSession
  meeting: any
}

const JAAS_APP_ID = process.env.NEXT_PUBLIC_JAAS_APP_ID || "vpaas-magic-cookie-d08c4a10b6d548079ff833f1e0db5ffc"
const JAAS_DOMAIN = "8x8.vc"

export function MeetingRoomClient({ user, meeting }: MeetingRoomClientProps) {
  const router = useRouter()
  
  // Call status bindings (linked directly with Jitsi/8x8 JaaS)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  
  const jitsiApiRef = useRef<any>(null)
  const [duration, setDuration] = useState(0)

  // Side panels toggles
  const [activePanel, setActivePanel] = useState<"chat" | "participants" | "whiteboard" | "backgrounds" | "breakout" | null>(null)
  const [whiteboardMode, setWhiteboardMode] = useState<"split" | "fullscreen">("split")
  const [currentBg, setCurrentBg] = useState<VirtualBg>({ id: "none", name: "None (Real Camera)" })

  // Synchronized chat feed
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [messageInput, setMessageInput] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Synchronized participant list
  const [activeParticipants, setActiveParticipants] = useState<any[]>([])
  const [participantSearch, setParticipantSearch] = useState("")

  // Floating reactions emitter
  const [reactions, setReactions] = useState<ReactionItem[]>([])
  const channelRef = useRef<any>(null)

  // Notifications
  const [toast, setToast] = useState<{ message: string; type: "info" | "success" | "warning" | "error" } | null>(null)
  const [meetingSummary, setMeetingSummary] = useState<any | null>(null)
  const [showMeetingSummary, setShowMeetingSummary] = useState(false)
  const joinRecordedRef = useRef(false)
  const leaveRecordedRef = useRef(false)

  const addToast = (msg: string, type: "info" | "success" | "warning" | "error" = "info") => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // 1. Load 8x8 JaaS external script and initialize room
  useEffect(() => {
    let isDisposed = false
    const scriptSrc = `https://${JAAS_DOMAIN}/${JAAS_APP_ID}/external_api.js`

    function initJaaS() {
      if (isDisposed || !window.JitsiMeetExternalAPI) return
      const container = document.getElementById("jaas-container")
      if (!container) return

      // Prevent duplicate iframe creation
      if (container.children.length > 0 && jitsiApiRef.current) return

      // Scope room name under tenant app ID for isolated room security
      const roomName = `${JAAS_APP_ID}/skillarc-lecture-${meeting.meeting_code}`
      const options = {
        roomName,
        width: "100%",
        height: "100%",
        parentNode: container,
        userInfo: {
          displayName: user.name,
          email: user.email,
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          hideConferenceSubject: true,
          disablePolls: true,
          toolbarButtons: [
            "microphone",
            "camera",
            "desktop",
            "hangup",
            "videoquality",
            "tileview",
            "raisehand",
            "participants-pane",
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          TOOLBAR_BUTTONS: [
            "microphone",
            "camera",
            "desktop",
            "hangup",
            "videoquality",
            "tileview",
            "raisehand",
            "participants-pane",
          ],
        },
      }

      try {
        const api = new window.JitsiMeetExternalAPI(JAAS_DOMAIN, options)

        api.addEventListener("videoMuteStatusChanged", (e: any) => {
          setIsVideoOn(!e.muted)
        })
        api.addEventListener("audioMuteStatusChanged", (e: any) => {
          setIsMuted(e.muted)
        })
        api.addEventListener("screenSharingStatusChanged", (e: any) => {
          setIsScreenSharing(e.on)
        })
        api.addEventListener("raiseHandUpdated", (e: any) => {
          setIsHandRaised(Boolean(e?.handRaised))
        })
        api.addEventListener("participantJoined", (e: any) => {
          addToast(`${e.displayName || "A participant"} joined the lecture`, "info")
          refreshParticipants()
        })
        api.addEventListener("participantLeft", () => {
          refreshParticipants()
        })
        api.addEventListener("readyToClose", () => {
          handleEndCall()
        })

        jitsiApiRef.current = api
      } catch (err) {
        console.error("Failed to initialize 8x8 JaaS:", err)
      }
    }

    const existingScript = document.querySelector(`script[src="${scriptSrc}"]`)
    if (window.JitsiMeetExternalAPI) {
      initJaaS()
    } else if (existingScript) {
      existingScript.addEventListener("load", initJaaS)
    } else {
      const script = document.createElement("script")
      script.src = scriptSrc
      script.async = true
      script.onload = () => {
        initJaaS()
      }
      document.body.appendChild(script)
    }

    return () => {
      isDisposed = true
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose()
        } catch {}
      }
    }
  }, [meeting.meeting_code, user.name, user.email])

  // Custom Toolbar Controls linked to Jitsi Meet Commands
  const toggleCamera = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand("toggleVideo")
    }
  }

  const toggleMute = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand("toggleAudio")
    }
  }

  const toggleScreenShare = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand("toggleShareScreen")
    }
  }

  const toggleTileView = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand("toggleTileView")
      addToast("Toggled view layout", "info")
    }
  }

  const toggleRaiseHand = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand("toggleRaiseHand")
    }
    const nextHand = !isHandRaised
    setIsHandRaised(nextHand)
    if (nextHand) {
      emitReaction("✋")
      addToast("Hand raised", "info")
    }
  }

  const handleSelectBackground = (bg: VirtualBg) => {
    setCurrentBg(bg)
    if (jitsiApiRef.current) {
      try {
        jitsiApiRef.current.executeCommand("toggleVirtualBackgroundDialog")
      } catch {}
    }
    addToast(`Selected background: ${bg.name}`, "info")
  }

  const refreshParticipants = async () => {
    if (!meeting?.id) return
    const res = await getMeetingAnalyticsAction(meeting.id)
    if (res.success && Array.isArray(res.logs)) {
      setActiveParticipants(res.logs)
    }
  }

  useEffect(() => {
    const registerJoin = async () => {
      if (!meeting?.id || !user?.id || joinRecordedRef.current) return
      joinRecordedRef.current = true
      await recordJoinMeetingAction(meeting.id, user.id)
      refreshParticipants()
    }

    void registerJoin()
  }, [meeting?.id, user?.id])

  useEffect(() => {
    return () => {
      if (!meeting?.id || !user?.id || leaveRecordedRef.current) return
      leaveRecordedRef.current = true
      void recordLeaveMeetingAction(meeting.id, user.id)
    }
  }, [meeting?.id, user?.id])

  // 2. Fetch Chat messages and subscribe to supabase Realtime Channel
  useEffect(() => {
    const fetchMessages = async () => {
      const res = await getMeetingMessagesAction(meeting.id)
      if (res.success && res.messages) {
        setChatMessages(res.messages)
      }
    }

    fetchMessages()
    refreshParticipants()

    const channel = supabase
      .channel(`meeting:${meeting.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "meeting_messages",
          filter: `meeting_id=eq.${meeting.id}`,
        },
        (payload) => {
          const newMsg = payload.new as any
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        const rid = `reaction-${Date.now()}-${Math.random()}`
        setReactions(prev => [...prev, { id: rid, emoji: payload.emoji, x: payload.x }])
        setTimeout(() => setReactions(prev => prev.filter(r => r.id !== rid)), 4000)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [meeting.id])

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  // Emit Reaction to all peers
  const emitReaction = (emoji: string) => {
    const randomX = Math.floor(Math.random() * 60) + 20
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "reaction",
        payload: { emoji, x: randomX }
      })
    }
    const rid = `reaction-${Date.now()}-${Math.random()}`
    setReactions(prev => [...prev, { id: rid, emoji, x: randomX }])
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== rid)), 4000)
  }

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim()) return

    const msg = messageInput.trim()
    setMessageInput("")

    await postMeetingMessageAction(
      meeting.id,
      user.institutionId,
      user.id,
      user.name,
      msg
    )
  }

  // Meeting timer loop
  useEffect(() => {
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const buildMeetingSummary = async () => {
    if (!meeting?.id) return

    try {
      const [leaveResult, analyticsResult] = await Promise.all([
        recordLeaveMeetingAction(meeting.id, user.id),
        getMeetingAnalyticsAction(meeting.id),
      ])

      if (!leaveResult.success && !leaveRecordedRef.current) {
        leaveRecordedRef.current = true
      }

      if (!analyticsResult.success || !Array.isArray(analyticsResult.logs)) {
        return null
      }

      const logs = analyticsResult.logs as any[]
      const participants = logs.map((log) => {
        const joinedAt = log.joined_at ? new Date(log.joined_at).getTime() : null
        const leftAt = log.left_at ? new Date(log.left_at).getTime() : null
        const durationSeconds = joinedAt && leftAt ? Math.max(0, Math.round((leftAt - joinedAt) / 1000)) : 0

        return {
          id: log.user_id,
          name: log.user?.name || "Unknown",
          email: log.user?.email || "",
          role: log.user?.role || "student",
          joinedAt: log.joined_at,
          leftAt: log.left_at,
          durationSeconds,
          isPresent: log.is_present !== false,
        }
      })

      const totalDurationSeconds = participants.reduce((sum, participant) => sum + participant.durationSeconds, 0)
      const averageDurationSeconds = participants.length > 0 ? Math.round(totalDurationSeconds / participants.length) : 0
      const presentCount = participants.filter((participant) => participant.isPresent).length

      return {
        totalParticipants: participants.length,
        presentCount,
        averageDurationSeconds,
        totalDurationSeconds,
        participants,
      }
    } catch (error) {
      console.error("Error building meeting summary:", error)
      return null
    }
  }

  // End / Leave call
  const handleEndCall = async () => {
    if (leaveRecordedRef.current) {
      setShowMeetingSummary(true)
      return
    }

    leaveRecordedRef.current = true
    await recordLeaveMeetingAction(meeting.id, user.id)

    if (user.role === "faculty") {
      await endMeetingAction(meeting.id, meeting.subject_id)
    }

    const summary = await buildMeetingSummary()
    setMeetingSummary(summary)
    setShowMeetingSummary(true)

    if (jitsiApiRef.current) {
      try { jitsiApiRef.current.dispose() } catch (e) {}
    }

    window.setTimeout(() => {
      router.push(`/dashboard/${user.role}/subjects/${meeting.subject_id}`)
    }, 1400)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(meeting.meeting_code)
    addToast("Meeting code copied to clipboard!", "success")
  }

  const filteredParticipants = activeParticipants.filter((p) => {
    const name = p.user?.name || ""
    const email = p.user?.email || ""
    const term = participantSearch.toLowerCase()
    return name.toLowerCase().includes(term) || email.toLowerCase().includes(term)
  })

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden">
      
      {/* 1. Meeting Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-950/95 border-b border-white/10 z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${
            isRecording ? "bg-red-500/15 border-red-500/35 text-red-300 animate-pulse" : "bg-emerald-500/12 border-emerald-500/25 text-emerald-400"
          }`}>
            <Circle className={`w-2.5 h-2.5 fill-current ${isRecording ? "text-red-500 animate-pulse" : "text-emerald-500"}`} />
            {isRecording ? "RECORDING" : "LIVE CLASS"}
          </div>
          <div className="w-px h-5 bg-white/10" />
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm text-white tracking-tight">{meeting.title}</h1>
              {user.role === "faculty" && (
                <span className="bg-[#E57D37] border border-[#EAAD62]/30 text-[9px] font-extrabold px-1.5 py-0.5 rounded text-white uppercase tracking-wider">Host</span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
              {meeting.subject?.name} ({meeting.subject?.code}) • Code: <span className="font-mono text-[#E57D37] select-all cursor-pointer font-bold" onClick={handleCopyLink}>{meeting.meeting_code}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-white/5 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-400 font-mono">
            <Clock size={13} className="text-slate-500" />
            {formatTimer(duration)}
          </div>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer text-slate-200"
            title="Copy Meeting Code"
          >
            <Copy size={13} />
            Copy Code
          </button>
        </div>
      </div>

      {/* 2. Meeting Body Workspace */}
      <div className="flex-grow flex overflow-hidden relative">
        <FloatingReactions reactions={reactions} />

        {showMeetingSummary && meetingSummary && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <div className="w-[92%] max-w-2xl rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#EAAD62]">Meeting analysis</p>
                  <h2 className="text-xl font-bold text-white">Attendance and duration summary</h2>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Completed
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3 mb-5">
                <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Joined</p>
                  <p className="text-xl font-bold text-white">{meetingSummary.presentCount}/{meetingSummary.totalParticipants}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Avg. duration</p>
                  <p className="text-xl font-bold text-white">{Math.floor(meetingSummary.averageDurationSeconds / 60)}m</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Total session</p>
                  <p className="text-xl font-bold text-white">{Math.floor(meetingSummary.totalDurationSeconds / 60)}m</p>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Participants</p>
                <div className="space-y-2">
                  {meetingSummary.participants.map((participant: any) => (
                    <div key={participant.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/70 px-3 py-2 text-sm">
                      <div>
                        <p className="font-semibold text-white">{participant.name}</p>
                        <p className="text-xs text-slate-500">{participant.email || participant.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-200">{participant.isPresent ? "Joined" : "Left"}</p>
                        <p className="text-xs text-slate-500">{Math.floor(participant.durationSeconds / 60)}m</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video feed canvas + Whiteboard Workspace */}
        <div className="flex-grow flex p-3 md:p-5 gap-4 items-center justify-center relative overflow-hidden bg-slate-900/40">
          
          {/* Whiteboard in Split View Mode */}
          {activePanel === "whiteboard" && whiteboardMode === "split" && (
            <div className="flex-1 h-full min-w-0 animate-in fade-in zoom-in-95 duration-200">
              <Whiteboard
                onToast={addToast}
                onClose={() => setActivePanel(null)}
                isFullScreen={false}
                onToggleFullScreen={() => setWhiteboardMode("fullscreen")}
              />
            </div>
          )}

          {/* Video Container (ALWAYS MOUNTED IN DOM - RESIZES SMOOTHLY WITHOUT CALL DROPS) */}
          <div
            className={`h-full transition-all duration-300 relative border border-white/10 rounded-3xl overflow-hidden shadow-2xl bg-slate-950 ${
              activePanel === "whiteboard" && whiteboardMode === "split"
                ? "w-[360px] lg:w-[480px] flex-shrink-0"
                : activePanel === "whiteboard" && whiteboardMode === "fullscreen"
                ? "fixed bottom-24 right-8 w-80 h-48 z-40 ring-2 ring-[#E57D37]/50 shadow-2xl"
                : "w-full flex-grow"
            }`}
          >
            {/* JaaS 8x8 Meet Mount Node */}
            <div id="jaas-container" className="w-full h-full" />
          </div>

          {/* Whiteboard in Fullscreen Mode */}
          {activePanel === "whiteboard" && whiteboardMode === "fullscreen" && (
            <div className="absolute inset-3 md:inset-5 z-20 animate-in fade-in zoom-in-95 duration-200">
              <Whiteboard
                onToast={addToast}
                onClose={() => setActivePanel(null)}
                isFullScreen={true}
                onToggleFullScreen={() => setWhiteboardMode("split")}
              />
            </div>
          )}
        </div>

        {/* Dynamic side drawers */}
        {activePanel && activePanel !== "whiteboard" && (
          <div className="w-full md:w-80 border-l border-white/10 bg-slate-950 flex flex-col flex-shrink-0 z-30 animate-in slide-in-from-right duration-200">
            
            {/* 1. Supabase synced Chat sidebar */}
            {activePanel === "chat" && (
              <div className="flex flex-col h-full text-left">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare size={16} className="text-[#E57D37]" /> Meeting Chat
                  </h3>
                  <button onClick={() => setActivePanel(null)} className="cursor-pointer text-slate-400 hover:text-white p-1"><X size={16} /></button>
                </div>

                <div className="flex-grow p-4 overflow-y-auto space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-12 text-slate-600 text-xs">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                      No messages sent yet. Share lecture references here!
                    </div>
                  ) : (
                    chatMessages.map((m, idx) => {
                      const isMe = m.sender_id === user.id
                      return (
                        <div key={idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <span className="text-[9px] font-bold text-slate-500 mb-0.5">{m.sender_name}</span>
                          <div className={`px-3 py-2 rounded-xl text-xs max-w-[85%] font-medium leading-relaxed break-words ${
                            isMe ? "bg-[#E57D37] text-white rounded-tr-none shadow-sm" : "bg-slate-900 text-slate-200 rounded-tl-none border border-white/5"
                          }`}>
                            {m.message}
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-slate-950 flex-shrink-0">
                  <div className="flex gap-2 bg-slate-900 border border-white/5 rounded-xl px-3 py-1.5 focus-within:border-[#E57D37]/50 transition-all">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-transparent border-none text-xs outline-none focus:ring-0 text-white placeholder:text-slate-500"
                    />
                    <button type="submit" className="text-[#E57D37] hover:text-[#EAAD62] font-bold text-xs px-2 py-1 cursor-pointer">Send</button>
                  </div>
                </form>
              </div>
            )}

            {/* 2. Participants & Attendance Sidebar */}
            {activePanel === "participants" && (
              <div className="flex flex-col h-full text-left">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Users size={16} className="text-[#E57D37]" /> Participants ({activeParticipants.length || 1})
                  </h3>
                  <button onClick={() => setActivePanel(null)} className="cursor-pointer text-slate-400 hover:text-white p-1"><X size={16} /></button>
                </div>

                <div className="p-3 border-b border-white/10">
                  <div className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs">
                    <Search size={14} className="text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search participants..."
                      value={participantSearch}
                      onChange={(e) => setParticipantSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-white placeholder:text-slate-500 flex-1 text-xs"
                    />
                  </div>
                </div>

                <div className="flex-grow p-4 overflow-y-auto space-y-2.5">
                  {/* Current user */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#E57D37]/10 border border-[#E57D37]/30">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#E57D37] text-white flex items-center justify-center font-bold text-xs shadow">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          {user.name} <span className="text-[10px] text-[#EAAD62] font-semibold">(You)</span>
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize">{user.role}</p>
                      </div>
                    </div>
                    {user.role === "faculty" ? (
                      <span className="px-2 py-0.5 rounded-md bg-[#E57D37] text-[9px] font-extrabold text-white uppercase">Host</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">Active</span>
                    )}
                  </div>

                  {/* Other participants */}
                  {filteredParticipants
                    .filter((p) => p.user_id !== user.id)
                    .map((p, idx) => (
                      <div key={p.id || idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-white/15 transition-all">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xs border border-white/10">
                            {(p.user?.name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-200">{p.user?.name || "Attendee"}</p>
                            <p className="text-[10px] text-slate-500">{p.user?.email || p.user?.role || "Student"}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                          p.is_present !== false ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" : "bg-slate-800 text-slate-400"
                        }`}>
                          {p.is_present !== false ? "Joined" : "Left"}
                        </span>
                      </div>
                    ))}

                  {filteredParticipants.length === 0 && (
                    <div className="text-center py-8 text-slate-600 text-xs">
                      No participants match your search.
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-white/10 bg-slate-950 flex flex-col gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    <Copy size={13} />
                    Copy Meeting Link
                  </button>
                </div>
              </div>
            )}

            {/* 3. Virtual background options list */}
            {activePanel === "backgrounds" && (
              <VirtualBackgrounds
                currentBg={currentBg}
                onChangeBg={handleSelectBackground}
                onClose={() => setActivePanel(null)}
              />
            )}

            {/* 4. Breakout configuration settings */}
            {activePanel === "breakout" && (
              <BreakoutRooms
                onToast={addToast}
                onClose={() => setActivePanel(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* 3. Custom Controls Overlay */}
      <div className="px-6 py-4 bg-slate-950 border-t border-white/10 flex items-center justify-between z-30 flex-shrink-0">
        
        {/* Left: User identity & Reaction Emitters */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-white/10 rounded-2xl px-3 py-1.5">
            <div className="w-5 h-5 rounded-full bg-[#E57D37] text-white flex items-center justify-center font-extrabold text-[10px]">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-bold text-slate-300 truncate max-w-[100px]">{user.name}</span>
          </div>

          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl px-2 py-1">
            {["👍", "👏", "❤️", "🎉", "💡"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => emitReaction(emoji)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-all text-lg cursor-pointer hover:scale-110 active:scale-95"
                title={`React ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Core Meeting Controls (Mic, Cam, Screen Share, Grid, Raise Hand, Hangup) */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Microphone Toggle */}
          <button
            onClick={toggleMute}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              isMuted ? "bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/20" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={toggleCamera}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              !isVideoOn ? "bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/20" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
            title={isVideoOn ? "Turn Camera Off" : "Turn Camera On"}
          >
            {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
          </button>

          {/* Screen Share Toggle (FIXED: Monitor icon instead of speaker) */}
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              isScreenSharing ? "bg-[#3A6DAF] border-[#3A6DAF] text-white shadow-lg shadow-blue-500/20" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
            title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
          >
            {isScreenSharing ? <MonitorX size={18} /> : <MonitorUp size={18} />}
          </button>

          {/* Grid View Toggle */}
          <button
            onClick={toggleTileView}
            className="p-3 rounded-2xl border bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            title="Toggle Grid / Speaker View"
          >
            <LayoutGrid size={18} />
          </button>

          {/* Raise Hand Toggle */}
          <button
            onClick={toggleRaiseHand}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              isHandRaised ? "bg-amber-500/20 border-amber-400 text-amber-300" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
            title={isHandRaised ? "Lower Hand" : "Raise Hand"}
          >
            <Hand size={18} className={isHandRaised ? "fill-amber-400 text-amber-400" : ""} />
          </button>

          <div className="w-px h-8 bg-white/10" />

          {/* End / Leave Call Button */}
          <button
            onClick={handleEndCall}
            className="p-3 bg-red-600 hover:bg-red-700 border border-red-500 text-white rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-95 cursor-pointer"
            title="Leave Meeting Room"
          >
            <PhoneOff size={18} />
          </button>
        </div>

        {/* Right: Interactive Panels Toggle (Whiteboard, Virtual Bg, Breakout, Participants, Chat) */}
        <div className="flex items-center gap-2">
          {/* Whiteboard Toggle */}
          <button
            onClick={() => setActivePanel(prev => prev === "whiteboard" ? null : "whiteboard")}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              activePanel === "whiteboard" ? "bg-[#E57D37] border-[#EAAD62] text-white shadow-lg shadow-[#E57D37]/20" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
            title="Lecture Whiteboard"
          >
            <Pencil size={18} />
          </button>

          {/* Virtual Backgrounds Toggle (FIXED: Sparkles icon instead of volume) */}
          <button
            onClick={() => setActivePanel(prev => prev === "backgrounds" ? null : "backgrounds")}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              activePanel === "backgrounds" ? "bg-[#E57D37] border-[#EAAD62] text-white shadow-lg shadow-[#E57D37]/20" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
            title="Virtual Backgrounds & Effects"
          >
            <Sparkles size={18} />
          </button>

          {/* Breakout Rooms Toggle (Faculty Only - FIXED: Split icon) */}
          {user.role === "faculty" && (
            <button
              onClick={() => setActivePanel(prev => prev === "breakout" ? null : "breakout")}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                activePanel === "breakout" ? "bg-[#E57D37] border-[#EAAD62] text-white shadow-lg shadow-[#E57D37]/20" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}
              title="Breakout Discussion Rooms"
            >
              <Split size={18} />
            </button>
          )}

          {/* Participants List Toggle */}
          <button
            onClick={() => setActivePanel(prev => prev === "participants" ? null : "participants")}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              activePanel === "participants" ? "bg-[#E57D37] border-[#EAAD62] text-white shadow-lg shadow-[#E57D37]/20" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
            title="Class Participants"
          >
            <Users size={18} />
          </button>

          <div className="w-px h-8 bg-white/10" />

          {/* Chat Panel Toggle */}
          <button
            onClick={() => setActivePanel(prev => prev === "chat" ? null : "chat")}
            className={`p-3 rounded-2xl border transition-all relative cursor-pointer ${
              activePanel === "chat" ? "bg-[#E57D37] border-[#EAAD62] text-white shadow-lg shadow-[#E57D37]/20" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
            title="Live Lecture Chat"
          >
            <MessageSquare size={18} />
            {chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 border border-slate-950 text-[9px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center text-white">{chatMessages.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Local Toast Alert overlay */}
      {toast && (
        <div className="fixed bottom-24 right-6 z-50 bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-slide-in max-w-sm text-white">
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}
    </div>
  )
}

