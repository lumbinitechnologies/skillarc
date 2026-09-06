"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Check,
  Move,
  Sparkles,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageCropperModalProps {
  isOpen: boolean
  imageSrc: string | null
  fileName?: string
  onClose: () => void
  onCropComplete: (croppedFile: File) => void
}

export function ImageCropperModal({
  isOpen,
  imageSrc,
  fileName = "avatar.jpg",
  onClose,
  onCropComplete,
}: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [saving, setSaving] = useState(false)

  const imageRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Reset state when a new image is loaded
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1)
      setRotation(0)
      setPosition({ x: 0, y: 0 })
    }
  }, [isOpen, imageSrc])

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    imageRef.current = img
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }

  // Handle Dragging / Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    },
    [isDragging, dragStart]
  )

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    })
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom((prev) => Math.min(Math.max(0.5, prev + delta), 4))
  }

  const handleReset = () => {
    setZoom(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }

  // Generate cropped output canvas
  const generateCroppedBlob = async (): Promise<Blob | null> => {
    if (!imageRef.current || !containerRef.current) return null

    const CROP_SIZE = 512 // High quality avatar size
    const canvas = document.createElement("canvas")
    canvas.width = CROP_SIZE
    canvas.height = CROP_SIZE
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    // Set high quality interpolation
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"

    const img = imageRef.current
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const viewportSize = rect.width // Square viewport (e.g. 280px)

    // Center canvas coordinate system
    ctx.save()
    ctx.translate(CROP_SIZE / 2, CROP_SIZE / 2)
    ctx.rotate((rotation * Math.PI) / 180)

    // Scale calculation from preview container to output canvas
    const scaleFactor = CROP_SIZE / viewportSize
    ctx.scale(zoom * scaleFactor, zoom * scaleFactor)

    // Translation relative to image center
    // In preview container: image is centered, offset by position.x and position.y
    const imgAspect = img.naturalWidth / img.naturalHeight
    let drawWidth = viewportSize
    let drawHeight = viewportSize

    if (imgAspect > 1) {
      drawWidth = viewportSize * imgAspect
      drawHeight = viewportSize
    } else {
      drawWidth = viewportSize
      drawHeight = viewportSize / imgAspect
    }

    ctx.drawImage(
      img,
      -drawWidth / 2 + position.x / zoom,
      -drawHeight / 2 + position.y / zoom,
      drawWidth,
      drawHeight
    )

    ctx.restore()

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob)
        },
        "image/jpeg",
        0.92
      )
    })
  }

  const handleApply = async () => {
    setSaving(true)
    try {
      const blob = await generateCroppedBlob()
      if (blob) {
        const cleanName = fileName.replace(/\.[^/.]+$/, "") + "-cropped.jpg"
        const croppedFile = new File([blob], cleanName, { type: "image/jpeg" })
        onCropComplete(croppedFile)
        onClose()
      }
    } catch (err) {
      console.error("Cropping failed:", err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !imageSrc) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col gap-5"
        onMouseUp={handleMouseUp}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-['Plus_Jakarta_Sans'] text-lg font-black text-slate-900 flex items-center gap-2">
              <span>Adjust & Crop Photo</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Drag to position, pinch or scroll to zoom, and frame your picture.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Crop Viewport */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          {/* Crop Box with Circular Mask */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className="relative h-64 w-64 sm:h-72 sm:w-72 shrink-0 cursor-grab active:cursor-grabbing select-none overflow-hidden rounded-2xl bg-slate-900 shadow-inner flex items-center justify-center touch-none"
          >
            {/* The Image being transformed */}
            <div
              className="absolute pointer-events-none transition-transform duration-75 ease-out"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
              }}
            >
              <img
                src={imageSrc}
                alt="Crop preview"
                onLoad={handleImageLoad}
                className="max-h-none max-w-none pointer-events-none select-none"
                style={{
                  width: imageSize.width >= imageSize.height ? "280px" : "auto",
                  height: imageSize.height > imageSize.width ? "280px" : "auto",
                }}
                draggable={false}
              />
            </div>

            {/* Dark Vignette Overlay with transparent circular hole */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at center, transparent 96px, rgba(15, 23, 42, 0.75) 98px)",
              }}
            />

            {/* Circular Guide Ring */}
            <div className="pointer-events-none absolute h-48 w-48 rounded-full border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.4)]" />

            {/* Subtle Helper Badge */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-sm pointer-events-none flex items-center gap-1">
              <Move size={10} /> Drag to adjust position
            </div>
          </div>

          {/* Live Previews Sidebar */}
          <div className="flex sm:flex-col items-center justify-center gap-4">
            <div className="text-center">
              <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-[#E57D37] shadow-md bg-slate-100 flex items-center justify-center">
                <div
                  className="absolute pointer-events-none"
                  style={{
                    transform: `translate(${(position.x * 80) / 280}px, ${(position.y * 80) / 280}px) scale(${(zoom * 80) / 196}) rotate(${rotation}deg)`,
                    transformOrigin: "center center",
                  }}
                >
                  <img
                    src={imageSrc}
                    alt="Preview"
                    className="max-h-none max-w-none"
                    style={{
                      width: imageSize.width >= imageSize.height ? "280px" : "auto",
                      height: imageSize.height > imageSize.width ? "280px" : "auto",
                    }}
                  />
                </div>
              </div>
              <span className="mt-1.5 block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Profile View
              </span>
            </div>

            <div className="text-center">
              <div className="relative mx-auto h-11 w-11 overflow-hidden rounded-full border border-slate-300 shadow-sm bg-slate-100 flex items-center justify-center">
                <div
                  className="absolute pointer-events-none"
                  style={{
                    transform: `translate(${(position.x * 44) / 280}px, ${(position.y * 44) / 280}px) scale(${(zoom * 44) / 196}) rotate(${rotation}deg)`,
                    transformOrigin: "center center",
                  }}
                >
                  <img
                    src={imageSrc}
                    alt="Preview small"
                    className="max-h-none max-w-none"
                    style={{
                      width: imageSize.width >= imageSize.height ? "280px" : "auto",
                      height: imageSize.height > imageSize.width ? "280px" : "auto",
                    }}
                  />
                </div>
              </div>
              <span className="mt-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Navbar
              </span>
            </div>
          </div>
        </div>

        {/* Adjustment Controls */}
        <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
              className="p-1.5 text-slate-500 hover:text-[#E57D37] hover:bg-white rounded-lg transition"
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-[#E57D37] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              className="p-1.5 text-slate-500 hover:text-[#E57D37] hover:bg-white rounded-lg transition"
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
            <span className="font-['Space_Grotesk'] text-xs font-bold text-slate-700 w-12 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Action Row: Rotate & Reset */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRotation((r) => (r - 90) % 360)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition font-medium"
              >
                <RotateCcw size={13} /> -90°
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition font-medium"
              >
                <RotateCw size={13} /> +90°
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white transition font-semibold"
            >
              <RefreshCw size={12} /> Reset
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={saving}
            className="rounded-xl bg-[#E57D37] hover:bg-[#d46b28] text-white font-bold text-xs gap-1.5 px-5 shadow-sm"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Applying...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Apply & Save Photo</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
