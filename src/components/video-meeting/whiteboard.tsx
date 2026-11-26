"use client"

import React, { useRef, useState, useEffect } from "react"
import { Trash2, Download, Eraser, Pencil, Maximize2, Minimize2, X, Columns, Undo } from "lucide-react"

interface WhiteboardProps {
  onToast: (msg: string, type: "info" | "success" | "warning" | "error") => void
  onClose: () => void
  isFullScreen?: boolean
  onToggleFullScreen?: () => void
}

const BRAND_PALETTE = [
  { color: "#E57D37", label: "Terracotta" },
  { color: "#14234B", label: "Navy" },
  { color: "#10B981", label: "Emerald" },
  { color: "#F04438", label: "Crimson" },
  { color: "#EAAD62", label: "Amber" },
  { color: "#0F172A", label: "Dark Slate" },
]

export default function Whiteboard({
  onToast,
  onClose,
  isFullScreen = false,
  onToggleFullScreen,
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [color, setColor] = useState("#E57D37")
  const [lineWidth, setLineWidth] = useState(4)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<"pencil" | "eraser">("pencil")
  const lastX = useRef(0)
  const lastY = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas sizes based on bounding box
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      const newWidth = rect?.width || 800
      const newHeight = rect?.height || 500

      // Only resize and preserve content if dimensions actually change
      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        // Save current canvas data
        const tempCanvas = document.createElement("canvas")
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height
        const tempCtx = tempCanvas.getContext("2d")
        if (tempCtx && canvas.width > 0 && canvas.height > 0) {
          tempCtx.drawImage(canvas, 0, 0)
        }

        canvas.width = newWidth
        canvas.height = newHeight
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        if (tempCtx && tempCanvas.width > 0) {
          ctx.drawImage(tempCanvas, 0, 0)
        }
      }
    }

    resizeCanvas()
    const timer = setTimeout(resizeCanvas, 100)
    window.addEventListener("resize", resizeCanvas)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [isFullScreen])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    setIsDrawing(true)
    const pos = getPos(e)
    lastX.current = pos.x
    lastY.current = pos.y
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const pos = getPos(e)

    ctx.beginPath()
    ctx.moveTo(lastX.current, lastY.current)
    ctx.lineTo(pos.x, pos.y)

    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color
    ctx.lineWidth = lineWidth
    ctx.stroke()

    lastX.current = pos.x
    lastY.current = pos.y
  }

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    
    // Check if touch or mouse
    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 }
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    onToast("Whiteboard cleared", "info")
  }

  const downloadImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const image = canvas.toDataURL("image/png")
    const link = document.createElement("a")
    link.download = `lecture-whiteboard-${Date.now()}.png`
    link.href = image
    link.click()
    onToast("Whiteboard saved as PNG", "success")
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden relative font-sans text-left rounded-3xl border border-white/10 shadow-2xl">
      {/* Board Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950/95 border-b border-white/10 z-10 flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E57D37] animate-pulse" />
            <span className="text-white text-xs font-extrabold uppercase tracking-wider">Whiteboard</span>
          </div>
          
          <div className="hidden sm:block w-px h-5 bg-white/20" />

          {/* Color pickers */}
          <div className="flex items-center gap-1.5">
            {BRAND_PALETTE.map(({ color: c, label }) => (
              <button
                key={c}
                onClick={() => {
                  setTool("pencil")
                  setColor(c)
                }}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                  color === c && tool === "pencil" ? "border-white scale-110 shadow-md" : "border-transparent opacity-85 hover:opacity-100"
                }`}
                style={{ backgroundColor: c }}
                title={label}
              />
            ))}
          </div>

          <div className="hidden sm:block w-px h-5 bg-white/20" />

          {/* Tool pickers */}
          <div className="flex items-center gap-1 bg-slate-900 border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setTool("pencil")}
              className={`p-1.5 rounded-lg text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                tool === "pencil" ? "bg-[#E57D37] shadow" : "text-slate-400 hover:text-white"
              }`}
              title="Draw / Pen"
            >
              <Pencil size={13} />
              <span className="hidden md:inline text-[11px]">Pen</span>
            </button>
            <button
              onClick={() => setTool("eraser")}
              className={`p-1.5 rounded-lg text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                tool === "eraser" ? "bg-[#E57D37] shadow" : "text-slate-400 hover:text-white"
              }`}
              title="Eraser"
            >
              <Eraser size={13} />
              <span className="hidden md:inline text-[11px]">Eraser</span>
            </button>
          </div>

          {/* Brush thickness slider */}
          <div className="hidden lg:flex items-center gap-2 text-white text-xs font-semibold bg-slate-900 border border-white/10 px-2.5 py-1 rounded-xl">
            <span className="text-slate-400 text-[11px]">Size:</span>
            <input
              type="range"
              min={2}
              max={28}
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-16 accent-[#E57D37] cursor-pointer"
            />
            <span className="font-mono text-[11px] text-[#EAAD62]">{lineWidth}px</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className="cursor-pointer p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              title={isFullScreen ? "Side-by-side with video" : "Maximize whiteboard"}
            >
              {isFullScreen ? (
                <>
                  <Columns size={13} className="text-[#EAAD62]" />
                  <span className="hidden md:inline text-[11px]">Split View</span>
                </>
              ) : (
                <>
                  <Maximize2 size={13} className="text-[#EAAD62]" />
                  <span className="hidden md:inline text-[11px]">Expand</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={clearCanvas}
            className="cursor-pointer p-2 bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 text-slate-300 hover:text-red-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Clear all drawings"
          >
            <Trash2 size={13} />
            <span className="hidden md:inline text-[11px]">Clear</span>
          </button>
          
          <button
            onClick={downloadImage}
            className="cursor-pointer p-2 bg-[#E57D37] hover:bg-[#d46b28] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
            title="Export drawing as PNG"
          >
            <Download size={13} />
            <span className="hidden md:inline text-[11px]">Save</span>
          </button>

          <button
            onClick={onClose}
            className="cursor-pointer p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
            title="Close Whiteboard"
          >
            <X size={14} />
            <span className="hidden sm:inline text-[11px]">Close</span>
          </button>
        </div>
      </div>

      {/* Canvas workspace container */}
      <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center p-2 sm:p-4">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={() => setIsDrawing(false)}
          onMouseLeave={() => setIsDrawing(false)}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={() => setIsDrawing(false)}
          className="bg-white rounded-2xl cursor-crosshair shadow-2xl transition-all w-full h-full touch-none"
        />
      </div>
    </div>
  )
}

