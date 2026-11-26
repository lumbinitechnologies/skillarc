"use client"

import React, { useState } from "react"
import { Users, Power, Play, X, Sparkles } from "lucide-react"

interface BreakoutRoomsProps {
  onToast: (msg: string, type: "info" | "success" | "warning" | "error") => void
  onClose: () => void
}

export default function BreakoutRooms({ onToast, onClose }: BreakoutRoomsProps) {
  const [roomCount, setRoomCount] = useState(2)
  const [duration, setDuration] = useState(10) // minutes
  const [isActive, setIsActive] = useState(false)

  const handleStartBreakout = () => {
    setIsActive(true)
    onToast(`Breakout Rooms started: ${roomCount} rooms for ${duration} minutes.`, "success")
  }

  const handleStopBreakout = () => {
    setIsActive(false)
    onToast("Breakout rooms ended. All students returned to the main room.", "info")
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-white/10 text-white font-sans text-left">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Users size={16} className="text-[#E57D37]" />
          Breakout Rooms
        </h3>
        <button
          onClick={onClose}
          type="button"
          className="cursor-pointer text-slate-400 hover:text-white p-1 rounded-lg transition-all"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-grow p-5 overflow-y-auto space-y-6">
        {isActive ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl text-center space-y-3">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <h4 className="font-extrabold text-sm text-emerald-300">Breakout Rooms are Live</h4>
              <p className="text-xs text-slate-400">
                Students are currently grouped into {roomCount} sub-rooms for collaborative worksheet discussion.
              </p>
            </div>
            
            <div className="space-y-2.5">
              {Array.from({ length: roomCount }).map((_, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-slate-950/40 border border-white/5 rounded-xl text-xs font-semibold">
                  <span className="text-slate-300">Room {i + 1}</span>
                  <span className="text-[10px] text-slate-500">Auto-distributed participants</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleStopBreakout}
              className="w-full py-3 bg-red-600 hover:bg-red-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
            >
              <Power size={14} /> End Breakout Rooms
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Number of Rooms</label>
              <select
                value={roomCount}
                onChange={(e) => setRoomCount(Number(e.target.value))}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none"
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} Rooms
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Session Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none"
              >
                {[5, 10, 15, 20, 30].map((t) => (
                  <option key={t} value={t}>
                    {t} minutes
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleStartBreakout}
              className="w-full py-3 bg-[#E57D37] hover:bg-[#d46b28] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all text-white"
            >
              <Play size={14} /> Start Breakout Rooms
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
