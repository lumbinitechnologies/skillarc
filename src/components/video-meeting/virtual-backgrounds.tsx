"use client"

import React from "react"
import { EyeOff, AlertCircle, Sparkles, X } from "lucide-react"

export interface VirtualBg {
  id: string
  name: string
  url?: string
}

interface VirtualBackgroundsProps {
  currentBg: VirtualBg
  onChangeBg: (bg: VirtualBg) => void
  onClose: () => void
}

const BG_OPTIONS: VirtualBg[] = [
  { id: "none", name: "None (Real Camera)" },
  { id: "blur", name: "Blur Background" },
  {
    id: "classroom",
    name: "Lecture Hall",
    url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&q=80",
  },
  {
    id: "office",
    name: "Modern Library",
    url: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&q=80",
  },
  {
    id: "abstract",
    name: "Warm Study",
    url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&q=80",
  },
]

export default function VirtualBackgrounds({ currentBg, onChangeBg, onClose }: VirtualBackgroundsProps) {
  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-white/10 text-white font-sans text-left">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Sparkles size={16} className="text-[#E57D37]" />
          Virtual Backgrounds
        </h3>
        <button
          onClick={onClose}
          type="button"
          className="cursor-pointer text-slate-400 hover:text-white p-1 rounded-lg transition-all"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-grow p-5 overflow-y-auto space-y-5">
        <div className="p-4 bg-[#EAAD62]/10 border border-[#EAAD62]/20 rounded-2xl flex gap-2.5 text-[#EAAD62] text-xs font-semibold leading-normal">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-[#EAAD62]" />
          <p>
            Choose a virtual background or subtle blur to maintain lecture focus and privacy.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {BG_OPTIONS.map((bg) => {
            const isActive = bg.id === currentBg.id
            return (
              <button
                key={bg.id}
                onClick={() => onChangeBg(bg)}
                className={`flex flex-col border rounded-2xl overflow-hidden text-left bg-slate-950/40 hover:bg-slate-950/80 transition-all cursor-pointer ${
                  isActive ? "border-[#E57D37] ring-2 ring-[#E57D37]/40 shadow-lg shadow-[#E57D37]/15" : "border-white/10 hover:border-white/25"
                }`}
              >
                {bg.url ? (
                  <div
                    className="h-20 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url('${bg.url}')` }}
                  />
                ) : (
                  <div className="h-20 w-full bg-slate-950 flex items-center justify-center text-slate-500">
                    <EyeOff size={22} className={isActive ? "text-[#E57D37]" : "text-slate-500"} />
                  </div>
                )}
                <div className={`p-2.5 text-[11px] font-bold ${isActive ? "text-[#EAAD62]" : "text-slate-200"}`}>
                  {bg.name}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

