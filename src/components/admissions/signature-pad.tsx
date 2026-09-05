"use client"

import React, { useRef, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Edit3, Type, RotateCcw, CheckCircle, ShieldCheck } from "lucide-react"

interface SignaturePadProps {
  signerName: string
  onSignatureChange: (signatureDataUrl: string | null, isAgreed: boolean) => void
  disabled?: boolean
}

export function SignaturePad({ signerName, onSignatureChange, disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [mode, setMode] = useState<"DRAW" | "TYPE">("DRAW")
  const [typedName, setTypedName] = useState(signerName || "")
  const [agreed, setAgreed] = useState(false)
  const [selectedFont, setSelectedFont] = useState<"cursive" | "serif" | "monospace">("cursive")

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // High DPI scaling
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    ctx.strokeStyle = "#0B132B"
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
  }, [mode])

  // Handle typing mode generation
  useEffect(() => {
    if (mode === "TYPE" && typedName.trim()) {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      ctx.fillStyle = "#0B132B"
      ctx.font = selectedFont === "cursive"
        ? "italic 32px 'Brush Script MT', 'Dancing Script', cursive"
        : selectedFont === "serif"
        ? "italic 28px 'Georgia', serif"
        : "26px 'Courier New', monospace"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(typedName, rect.width / 2, rect.height / 2)

      const dataUrl = canvas.toDataURL("image/png")
      setHasSignature(true)
      onSignatureChange(dataUrl, agreed)
    } else if (mode === "TYPE" && !typedName.trim()) {
      setHasSignature(false)
      onSignatureChange(null, agreed)
    }
  }, [mode, typedName, selectedFont, agreed, onSignatureChange])

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (disabled || mode !== "DRAW") return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    setIsDrawing(true)
    const rect = canvas.getBoundingClientRect()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing || disabled || mode !== "DRAW") return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
    setHasSignature(true)
  }

  function stopDrawing() {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL("image/png")
    onSignatureChange(dataUrl, agreed)
  }

  function handleClear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width * dpr, rect.height * dpr)
    setHasSignature(false)
    onSignatureChange(null, agreed)
  }

  function handleAgreementToggle(checked: boolean) {
    setAgreed(checked)
    const canvas = canvasRef.current
    const dataUrl = hasSignature && canvas ? canvas.toDataURL("image/png") : null
    onSignatureChange(dataUrl, checked)
  }

  return (
    <div className="space-y-4 rounded-3xl border border-[#3A6DAF]/30 bg-[#0B132B]/80 p-5 sm:p-6 backdrop-blur-xl shadow-xl">
      {/* Header and Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3A6DAF]/20 pb-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest font-['Space_Mono',monospace] text-[#EAAD62] flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#E57D37]" />
            Legal Digital E-Signature
          </h4>
          <p className="text-xs text-slate-300 font-sans mt-0.5">
            Provide your verified signature to execute this Student Enrolment Agreement.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-[#3A6DAF]/30 bg-[#14234B]/60 p-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setMode("DRAW")
              handleClear()
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold font-['Space_Grotesk',sans-serif] uppercase tracking-wider transition-all ${
              mode === "DRAW"
                ? "bg-gradient-to-r from-[#E57D37] to-[#FF5500] text-[#EFEAD8] shadow-sm"
                : "text-slate-400 hover:text-[#EFEAD8]"
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" /> Draw
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setMode("TYPE")
              handleClear()
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold font-['Space_Grotesk',sans-serif] uppercase tracking-wider transition-all ${
              mode === "TYPE"
                ? "bg-gradient-to-r from-[#E57D37] to-[#FF5500] text-[#EFEAD8] shadow-sm"
                : "text-slate-400 hover:text-[#EFEAD8]"
            }`}
          >
            <Type className="h-3.5 w-3.5" /> Type Name
          </button>
        </div>
      </div>

      {/* Type-To-Sign Inputs */}
      {mode === "TYPE" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-slate-400 block mb-1">
              Full Legal Name
            </label>
            <input
              type="text"
              disabled={disabled}
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full rounded-xl border border-[#3A6DAF]/40 bg-[#14234B]/60 px-3.5 py-2 text-xs font-bold text-[#EFEAD8] outline-none focus:border-[#E57D37]"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-slate-400 block mb-1">
              Calligraphic Style
            </label>
            <div className="flex gap-2">
              {[
                { id: "cursive", label: "Script" },
                { id: "serif", label: "Formal" },
                { id: "monospace", label: "Modern" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFont(f.id as any)}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all border ${
                    selectedFont === f.id
                      ? "border-[#EAAD62] bg-[#EAAD62]/10 text-[#EAAD62]"
                      : "border-[#3A6DAF]/30 bg-[#14234B]/40 text-slate-400 hover:text-[#EFEAD8]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Signature Canvas Box */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`h-36 w-full rounded-2xl border-2 border-dashed ${
            hasSignature ? "border-[#00C2A8]" : "border-[#3A6DAF]/40"
          } bg-[#FDFBF7] cursor-crosshair shadow-inner transition-colors`}
        />

        {/* Canvas Guideline */}
        <div className="pointer-events-none absolute bottom-8 left-6 right-6 border-b border-slate-300 flex justify-between text-[10px] font-mono text-slate-400">
          <span>Sign above the line</span>
          <span>X ________________</span>
        </div>

        {/* Clear Action Button */}
        {hasSignature && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-3 flex items-center gap-1 rounded-xl bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold text-slate-200 hover:bg-slate-900 transition-all shadow-md"
          >
            <RotateCcw className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Legal Acknowledgment Checkbox */}
      <label className="flex items-start gap-3 rounded-2xl border border-[#3A6DAF]/30 bg-[#14234B]/40 p-4 cursor-pointer hover:border-[#EAAD62]/50 transition-all">
        <input
          type="checkbox"
          disabled={disabled}
          checked={agreed}
          onChange={(e) => handleAgreementToggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-[#0B132B] text-[#E57D37] focus:ring-[#E57D37] accent-[#E57D37]"
        />
        <div className="space-y-0.5 text-xs text-slate-300">
          <p className="font-bold text-[#EFEAD8] font-['Space_Grotesk',sans-serif]">
            Electronic Signature & Binding Enrolment Agreement
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            By checking this box and providing my signature, I acknowledge that I have read, understood, and agree to the Terms of Enrolment, Refund Policy, and Academic Code of Conduct. I agree that this electronic signature is the legally binding equivalent of a handwritten signature under the Electronic Transactions Act.
          </p>
        </div>
      </label>
    </div>
  )
}
