"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ArrowDown, ArrowRight } from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

type DrawableFrame = ImageBitmap | HTMLImageElement

export default function BookScrollAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const framesRef = useRef<DrawableFrame[]>([])
  const drawDimsRef = useRef<{
    x: number
    y: number
    drawWidth: number
    drawHeight: number
  }>({ x: 0, y: 0, drawWidth: 0, drawHeight: 0 })

  const [loading, setLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)

  const startFrame = 26
  const endFrame = 137
  const totalFrames = endFrame - startFrame + 1

  // Preload frames with touch/tablet detection, GPU ImageBitmap acceleration and memory cleanup
  useEffect(() => {
    let isCancelled = false
    let loadedCount = 0
    const loadedFrames: DrawableFrame[] = new Array(totalFrames)

    const isMobile =
      typeof window !== "undefined" &&
      (window.matchMedia("(max-width: 1024px)").matches ||
        "ontouchstart" in window ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0))

    const basePath = isMobile ? "/sequence/mobile" : "/sequence"

    const loadSingleFrame = async (frameNumber: number, index: number): Promise<void> => {
      const frameNum = String(frameNumber).padStart(3, "0")
      const src = `${basePath}/ezgif-frame-${frameNum}.jpg`

      try {
        const img = new Image()
        img.src = src

        if (!img.complete) {
          await new Promise<void>((resolve) => {
            img.onload = () => resolve()
            img.onerror = () => resolve()
          })
        }

        // Create zero-copy GPU bitmap preserving true source aspect ratio
        if (typeof createImageBitmap !== "undefined") {
          try {
            const targetWidth = 720
            const targetHeight =
              img.width > 0 && img.height > 0
                ? Math.round(targetWidth * (img.height / img.width))
                : 405

            const bitmap = isMobile
              ? await createImageBitmap(img, {
                  resizeWidth: targetWidth,
                  resizeHeight: targetHeight,
                  resizeQuality: "high",
                })
              : await createImageBitmap(img)

            if (!isCancelled) {
              loadedFrames[index] = bitmap
            } else {
              bitmap.close()
            }
          } catch {
            if (!isCancelled) loadedFrames[index] = img
          }
        } else {
          try {
            await img.decode()
          } catch {
            // Fallback for older browsers
          }
          if (!isCancelled) loadedFrames[index] = img
        }
      } catch {
        // Fallback placeholder
      } finally {
        if (!isCancelled) {
          loadedCount++
          setLoadProgress(Math.round((loadedCount / totalFrames) * 100))
        }
      }
    }

    const preloadAll = async () => {
      const batchSize = isMobile ? 8 : 16
      for (let i = startFrame; i <= endFrame; i += batchSize) {
        if (isCancelled) break
        const batchPromises = []
        for (let j = i; j < Math.min(i + batchSize, endFrame + 1); j++) {
          batchPromises.push(loadSingleFrame(j, j - startFrame))
        }
        await Promise.all(batchPromises)
      }

      if (!isCancelled) {
        framesRef.current = loadedFrames
        setLoading(false)
      }
    }

    void preloadAll()

    return () => {
      isCancelled = true
      loadedFrames.forEach((frame) => {
        if (frame && "close" in frame && typeof frame.close === "function") {
          try {
            frame.close()
          } catch {}
        }
      })
    }
  }, [totalFrames])

  // Explicitly close GPU ImageBitmap buffers ONLY on component unmount
  useEffect(() => {
    return () => {
      framesRef.current.forEach((frame) => {
        if (frame && "close" in frame && typeof frame.close === "function") {
          try {
            frame.close()
          } catch {}
        }
      })
      framesRef.current = []
    }
  }, [])

  // Setup GSAP Timeline and Zero-Jank Hardware Canvas Rendering
  useEffect(() => {
    if (loading || framesRef.current.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: false })
    if (!ctx) return

    const isMobile =
      typeof window !== "undefined" &&
      (window.matchMedia("(max-width: 1024px)").matches ||
        "ontouchstart" in window ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0))

    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, isMobile ? 1.5 : 2)
    
    let currentFrameIndex = -1
    const targetFrameRef = { current: 0 }

    // Calculate containment dimensions once on resize instead of every frame
    const resizeCanvas = () => {
      const w = window.innerWidth
      const h = window.innerHeight

      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      const sampleFrame = framesRef.current[0]
      const imgRatio = sampleFrame ? sampleFrame.width / sampleFrame.height : 16 / 9
      const screenRatio = w / h

      let drawWidth = w * dpr
      let drawHeight = h * dpr

      if (screenRatio > imgRatio) {
        drawWidth = h * imgRatio * dpr
      } else {
        drawHeight = (w / imgRatio) * dpr
      }

      const x = Math.round((canvas.width - drawWidth) / 2)
      const y = Math.round((canvas.height - drawHeight) / 2)

      drawDimsRef.current = { x, y, drawWidth, drawHeight }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"

      currentFrameIndex = -1
      render(targetFrameRef.current)
    }

    // High-performance single-pass GPU hardware blit (skips redundant draws)
    const render = (frameFloat: number) => {
      const currentFrames = framesRef.current
      const total = currentFrames.length
      if (total === 0) return

      const index = Math.max(0, Math.min(total - 1, Math.round(frameFloat)))
      if (index === currentFrameIndex) return
      currentFrameIndex = index

      const frame = currentFrames[index]
      if (!frame) return

      const dims = drawDimsRef.current
      ctx.drawImage(frame, dims.x, dims.y, dims.drawWidth, dims.drawHeight)
    }

    // Single ScrollTrigger timeline with smooth Apple-style scrub
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "+=220%",
        scrub: 0.4,
        pin: true,
        pinSpacing: true,
      },
    })

    // 1. Frame progression with direct frame update
    tl.to(
      targetFrameRef,
      {
        current: totalFrames - 1,
        ease: "none",
        duration: 10,
        onUpdate: () => {
          render(targetFrameRef.current)
        },
      },
      0
    )

    // 2. Scroll indicator fade out (0 -> 0.8)
    tl.to(".scroll-indicator", { opacity: 0, y: 15, ease: "none", duration: 0.8 }, 0)

    // 3. Beat A: Visible at start, clean slide-out to flanks from 1.0 -> 1.8
    tl.to(".beat-a-left", { opacity: 0, x: -40, ease: "power1.in", duration: 0.8 }, 1.0)
    tl.to(".beat-a-right", { opacity: 0, x: 40, ease: "power1.in", duration: 0.8 }, 1.0)

    // 4. Beat B: Fades in at 2.2 -> 3.0, stays until 4.2, fades out completely 4.2 -> 5.0
    tl.fromTo(".beat-b", { opacity: 0, y: 30 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.8 }, 2.2)
    tl.to(".beat-b", { opacity: 0, y: -25, ease: "power1.in", duration: 0.8 }, 4.2)

    // 5. Beat C: Fades in at 5.4 -> 6.2, stays until 7.2, fades out completely 7.2 -> 8.0
    tl.fromTo(".beat-c", { opacity: 0, y: 30 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.8 }, 5.4)
    tl.to(".beat-c", { opacity: 0, y: -25, ease: "power1.in", duration: 0.8 }, 7.2)

    // 6. Beat D: Fades in at 8.2 -> 9.0, stays until 10.0
    tl.fromTo(".beat-d-top", { opacity: 0, y: -25 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.8 }, 8.2)
    tl.fromTo(".beat-d-bottom", { opacity: 0, y: 25 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.8 }, 8.2)

    // Initialize layout sizing and initial frame
    resizeCanvas()

    window.addEventListener("resize", resizeCanvas)

    return () => {
      tl.kill()
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [loading, totalFrames])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-[#050505] text-white overflow-hidden select-none font-sans"
      id="scrollytelling-section"
    >
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505]">
          <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden mb-4">
            <div
              className="bg-gradient-to-r from-[#1690C7] to-[#E57D37] h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
          <span className="text-xs uppercase tracking-widest text-white/60 font-semibold">
            Loading Knowledge Base // {loadProgress}%
          </span>
        </div>
      )}

      {/* Canvas Centered Container */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden z-10">
        <canvas ref={canvasRef} className="block pointer-events-none" />
      </div>

      {/* Ambient Void Overlay & Warm Radial Light */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#050505]/20 to-[#050505]/75 pointer-events-none z-[15]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#E57D37]/10 rounded-full blur-[170px] pointer-events-none z-[12]" />

      {/* Perfectly Centered Scroll Indicator */}
      <div className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-none z-20">
        <div className="scroll-indicator flex flex-col items-center gap-1.5 text-white/60 animate-bounce transition-all duration-300">
          <span className="text-[11px] tracking-widest uppercase font-semibold text-white/50">
            Scroll to Explore
          </span>
          <ArrowDown size={13} className="text-[#E57D37]" />
        </div>
      </div>

      {/* --- PURE EDITORIAL SCROLLYTELLING OVERLAYS WITH GLASSMORPHIC TYPOGRAPHY --- */}

      {/* Beat A (0% - 18%) - Left Flank: "KNOWLEDGE" */}
      <div className="beat-a-left absolute left-6 sm:left-10 md:left-12 lg:left-16 xl:left-24 top-24 md:top-[46%] md:-translate-y-1/2 flex flex-col items-start text-left max-w-[240px] sm:max-w-xs md:max-w-sm pointer-events-none z-20">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10 mb-3 sm:mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EAAD62] animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#EAAD62] font-mono font-bold">
            ARCH // CORE
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black uppercase tracking-tight leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white/95 via-white/40 to-white/10 [-webkit-text-stroke:1px_rgba(255,255,255,0.25)]">
            KNOWLEDGE
          </span>
        </h2>
        <p className="mt-4 text-xs sm:text-sm text-white/60 font-mono font-medium max-w-[240px] leading-relaxed hidden sm:block">
          A living database architecture for modern universities and colleges.
        </p>
      </div>

      {/* Beat A (0% - 18%) - Right Flank: "UNFOLDS." */}
      <div className="beat-a-right absolute right-6 sm:right-10 md:right-12 lg:right-16 xl:right-24 bottom-24 md:top-[46%] md:-translate-y-1/2 md:bottom-auto flex flex-col items-start md:items-end text-left md:text-right max-w-[240px] sm:max-w-xs md:max-w-sm pointer-events-none z-20 ml-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E57D37]/15 backdrop-blur-md border border-[#E57D37]/30 mb-3 sm:mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E57D37] animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#E57D37] font-mono font-bold">
            OS // TELEMETRY
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black uppercase tracking-tight leading-none drop-shadow-[0_10px_30px_rgba(229,125,55,0.3)]">
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#FFB074]/95 via-[#E57D37]/50 to-[#E57D37]/10 [-webkit-text-stroke:1px_rgba(229,125,55,0.35)]">
            UNFOLDS.
          </span>
        </h2>
        <p className="mt-4 text-xs sm:text-sm text-[#ECDFCB]/60 font-mono font-medium max-w-[240px] leading-relaxed hidden sm:block">
          Unified operational engine orchestrating schedules, placements & telemetry.
        </p>
      </div>

      {/* Beat B (22% - 50%) - Responsive: Top on mobile, Left on desktop */}
      <div className="beat-b absolute left-6 sm:left-10 md:left-20 top-20 md:top-1/2 md:-translate-y-1/2 max-w-xs sm:max-w-sm md:max-w-md pointer-events-none opacity-0 z-20 text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E57D37]/15 backdrop-blur-md border border-[#E57D37]/30 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E57D37] animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#EAAD62] font-mono font-bold">
            01 // SCHEDULING
          </span>
        </div>
        <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight mb-3 sm:mb-4 leading-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white/95 via-white/60 to-white/20 [-webkit-text-stroke:1px_rgba(255,255,255,0.2)]">
            FLUID <br className="hidden sm:inline" />TIMETABLES
          </span>
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-white/70 leading-relaxed font-normal">
          Interactive visual timetable scheduling with automated conflict detection. Zero room clashes, balanced faculty workloads.
        </p>
      </div>

      {/* Beat C (54% - 80%) - Responsive: Top on mobile, Right on desktop */}
      <div className="beat-c absolute right-6 sm:right-10 md:right-20 top-20 md:top-1/2 md:-translate-y-1/2 max-w-xs sm:max-w-sm md:max-w-md pointer-events-none opacity-0 z-20 text-left md:text-right ml-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#38BDF8]/15 backdrop-blur-md border border-[#38BDF8]/30 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#7DD3FC] font-mono font-bold">
            02 // TELEMETRY
          </span>
        </div>
        <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight mb-3 sm:mb-4 leading-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white/95 via-white/60 to-white/20 [-webkit-text-stroke:1px_rgba(255,255,255,0.2)]">
            REAL-TIME <br className="hidden sm:inline" />INTELLIGENCE
          </span>
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-white/70 leading-relaxed font-normal">
          Automated class attendance, direct student engagement telemetry, and real-time corporate recruitment sync.
        </p>
      </div>

      {/* Beat D (82% - 100%) - Top Headline & Bottom CTA */}
      <div className="beat-d-top absolute inset-x-6 top-16 sm:top-20 md:top-24 flex flex-col items-center text-center pointer-events-none opacity-0 z-20 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/[0.05] backdrop-blur-md border border-white/15 mb-3">
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#EAAD62] font-mono font-bold">
            INTEGRATE SKILLARC
          </span>
        </div>
        <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tight leading-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white/90 via-white/40 to-white/10 [-webkit-text-stroke:1px_rgba(255,255,255,0.2)]">
            ELEVATE YOUR <br />
          </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#FFA366] via-[#E57D37]/50 to-[#E57D37]/10 [-webkit-text-stroke:1px_rgba(229,125,55,0.35)]">
            ACADEMICS.
          </span>
        </h2>
      </div>

      <div className="beat-d-bottom absolute inset-x-6 bottom-16 sm:bottom-20 md:bottom-24 flex flex-col items-center text-center pointer-events-none opacity-0 z-20 max-w-md mx-auto">
        <p className="text-xs sm:text-sm text-white/70 mb-5 sm:mb-6 leading-relaxed font-normal">
          Deploy SkillArc across your institution with unified curriculum structures and zero operational downtime.
        </p>
        <button
          onClick={() => {
            window.location.href = "/auth/login"
          }}
          className="pointer-events-auto px-8 sm:px-9 py-3.5 sm:py-4 rounded-full bg-[#E57D37] text-white hover:bg-white hover:text-[#0B132B] font-bold text-xs uppercase tracking-wider shadow-[0_0_35px_rgba(229,125,55,0.6)] hover:shadow-[0_0_50px_rgba(255,255,255,0.8)] transition-all duration-300 transform hover:scale-105 active:scale-95 border-none cursor-pointer flex items-center gap-2.5"
        >
          <span>Access Gateway</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
