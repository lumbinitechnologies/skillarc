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
  const framesRef = useRef<(DrawableFrame | null)[]>([])
  const drawDimsRef = useRef<{
    x: number
    y: number
    drawWidth: number
    drawHeight: number
  }>({ x: 0, y: 0, drawWidth: 0, drawHeight: 0 })

  const [isInitialReady, setIsInitialReady] = useState(false)

  const startFrame = 26
  const endFrame = 137
  const totalFrames = endFrame - startFrame + 1

  // 2-Pass Interleaved Ingestion: Instant Keyframe Spine + Bounded Concurrency Infill
  useEffect(() => {
    let isCancelled = false
    const loadedFrames: (DrawableFrame | null)[] = new Array(totalFrames).fill(null)
    framesRef.current = loadedFrames

    const isMobile =
      typeof window !== "undefined" &&
      (window.matchMedia("(max-width: 1024px)").matches ||
        "ontouchstart" in window ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0))

    const basePath = isMobile ? "/sequence/mobile" : "/sequence"

    const loadSingleFrame = async (frameNumber: number, index: number): Promise<void> => {
      if (loadedFrames[index] || isCancelled) return

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

        if (typeof createImageBitmap !== "undefined") {
          try {
            const targetWidth = isMobile ? 600 : 960
            const targetHeight =
              img.width > 0 && img.height > 0
                ? Math.round(targetWidth * (img.height / img.width))
                : Math.round(targetWidth * 0.5625)

            const bitmap = await createImageBitmap(img, {
              resizeWidth: targetWidth,
              resizeHeight: targetHeight,
              resizeQuality: "high",
            })

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
          } catch {}
          if (!isCancelled) loadedFrames[index] = img
        }
      } catch {
        // Silent graceful fallback
      }
    }

    // Bounded concurrency pool to prevent network congestion and transient mobile memory spikes
    const runConcurrentPool = async (tasks: (() => Promise<void>)[], concurrency: number) => {
      let taskIdx = 0
      const executeWorker = async () => {
        while (taskIdx < tasks.length && !isCancelled) {
          const current = tasks[taskIdx++]
          if (current) await current()
        }
      }
      const workers = []
      for (let i = 0; i < Math.min(concurrency, tasks.length); i++) {
        workers.push(executeWorker())
      }
      await Promise.all(workers)
    }

    const startStreaming = async () => {
      // 1. FAST INITIAL PAINT: Load frame 0 immediately (< 40ms) and activate canvas
      await loadSingleFrame(startFrame, 0)
      if (isCancelled) return

      setIsInitialReady(true)

      // 2. PASS 1 (Keyframe Spine): Fetch keyframes every 6th frame across timeline
      // This creates an immediate 15fps skeleton end-to-end so rapid scrolls on slow 3G never freeze
      const stride = 6
      const spineTasks: (() => Promise<void>)[] = []
      for (let i = 0; i < totalFrames; i += stride) {
        if (i !== 0) {
          const frameNum = startFrame + i
          const frameIdx = i
          spineTasks.push(() => loadSingleFrame(frameNum, frameIdx))
        }
      }
      // Ensure the very last frame is also in the spine
      if (!loadedFrames[totalFrames - 1]) {
        spineTasks.push(() => loadSingleFrame(endFrame, totalFrames - 1))
      }

      // Concurrency bounded to 3 on mobile / 6 on desktop (preserves HTTP bandwidth for fonts/CSS)
      const maxConcurrency = isMobile ? 3 : 6
      await runConcurrentPool(spineTasks, maxConcurrency)
      if (isCancelled) return

      // 3. PASS 2 (High-Density 60fps Infill): Stream remaining intermediate frames in the background
      const infillTasks: (() => Promise<void>)[] = []
      for (let i = 1; i < totalFrames; i++) {
        if (!loadedFrames[i]) {
          const frameNum = startFrame + i
          const frameIdx = i
          infillTasks.push(() => loadSingleFrame(frameNum, frameIdx))
        }
      }

      await runConcurrentPool(infillTasks, maxConcurrency)
    }

    void startStreaming()

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
    if (!isInitialReady) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true, willReadFrequently: false })
    if (!ctx) return

    const isMobile =
      typeof window !== "undefined" &&
      (window.matchMedia("(max-width: 1024px)").matches ||
        "ontouchstart" in window ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0))

    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, isMobile ? 1.5 : 2)

    let currentFrameIndex = -1
    let lastRenderedFrame: DrawableFrame | null = null
    const targetFrameRef = { current: 0 }

    // Calculate containment dimensions once on resize instead of every frame
    const resizeCanvas = () => {
      const w = window.innerWidth
      const h = window.innerHeight

      const sampleFrame = framesRef.current[0]
      const imgRatio = sampleFrame ? sampleFrame.width / sampleFrame.height : 16 / 9
      const screenRatio = w / h

      let cssWidth = w
      let cssHeight = h

      if (screenRatio > imgRatio) {
        cssHeight = h
        cssWidth = Math.round(h * imgRatio)
      } else {
        cssWidth = w
        cssHeight = Math.round(w / imgRatio)
      }

      canvas.width = Math.round(cssWidth * dpr)
      canvas.height = Math.round(cssHeight * dpr)
      canvas.style.width = `${cssWidth}px`
      canvas.style.height = `${cssHeight}px`

      drawDimsRef.current = {
        x: 0,
        y: 0,
        drawWidth: canvas.width,
        drawHeight: canvas.height,
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"

      currentFrameIndex = -1
      lastRenderedFrame = null
      render(targetFrameRef.current)
    }

    // High-performance single-pass GPU hardware blit with smart nearest-frame fallback
    const render = (frameFloat: number) => {
      const currentFrames = framesRef.current
      const total = totalFrames
      if (total === 0) return

      const targetIndex = Math.max(0, Math.min(total - 1, Math.round(frameFloat)))

      // Find exact target frame or closest loaded frame
      let frame = currentFrames[targetIndex]
      if (!frame) {
        for (let offset = 1; offset < total; offset++) {
          if (targetIndex - offset >= 0 && currentFrames[targetIndex - offset]) {
            frame = currentFrames[targetIndex - offset]
            break
          }
          if (targetIndex + offset < total && currentFrames[targetIndex + offset]) {
            frame = currentFrames[targetIndex + offset]
            break
          }
        }
      }

      if (!frame) return
      if (targetIndex === currentFrameIndex && frame === lastRenderedFrame) return

      currentFrameIndex = targetIndex
      lastRenderedFrame = frame

      const dims = drawDimsRef.current
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(frame, dims.x, dims.y, dims.drawWidth, dims.drawHeight)
    }

    // Single ScrollTrigger timeline tuned for a smooth, natural cinematic scroll pass
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: isMobile ? "+=125%" : "+=145%",
        scrub: 0.55,
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

    // 2. Scroll indicator fade out (0 -> 0.6)
    tl.to(".scroll-indicator", { opacity: 0, y: 15, ease: "none", duration: 0.6 }, 0)

    // 3. Beat A: Visible at start, clean slide-out to flanks from 0.8 -> 1.8
    tl.to(".beat-a-left", { opacity: 0, x: -35, ease: "power1.in", duration: 0.9 }, 0.8)
    tl.to(".beat-a-right", { opacity: 0, x: 35, ease: "power1.in", duration: 0.9 }, 0.8)

    // 4. Beat B: Fades in at 2.0 -> 2.8, holds until 4.0, fades out completely 4.0 -> 4.8
    tl.fromTo(".beat-b", { opacity: 0, y: 25 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.8 }, 2.0)
    tl.to(".beat-b", { opacity: 0, y: -20, ease: "power1.in", duration: 0.8 }, 4.0)

    // 5. Beat C: Fades in at 5.0 -> 5.8, holds until 7.0, fades out completely 7.0 -> 7.8
    tl.fromTo(".beat-c", { opacity: 0, y: 25 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.8 }, 5.0)
    tl.to(".beat-c", { opacity: 0, y: -20, ease: "power1.in", duration: 0.8 }, 7.0)

    // 6. Beat D: Fades in at 8.0 -> 8.8, stays until 10.0
    tl.fromTo(".beat-d-top", { opacity: 0, y: -20 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.8 }, 8.0)
    tl.fromTo(".beat-d-bottom", { opacity: 0, y: 20 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.8 }, 8.0)

    // Initialize layout sizing and initial frame
    resizeCanvas()

    window.addEventListener("resize", resizeCanvas)

    return () => {
      tl.kill()
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [isInitialReady, totalFrames])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-[#050505] text-white overflow-hidden select-none font-sans"
      id="scrollytelling-section"
    >
      {/* Canvas Centered Container with GPU Radial Edge Dissolve Mask */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden z-10 pointer-events-none">
        <canvas
          ref={canvasRef}
          className="block pointer-events-none"
          style={{
            WebkitMaskImage:
              "radial-gradient(ellipse 88% 80% at 50% 50%, #000 45%, rgba(0,0,0,0.5) 75%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%), linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
            WebkitMaskComposite: "source-in",
            maskImage:
              "radial-gradient(ellipse 88% 80% at 50% 50%, #000 45%, rgba(0,0,0,0.5) 75%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%), linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
            maskComposite: "intersect",
          }}
        />
      </div>

      {/* Soft Edge Dissolve Overlays (Top, Bottom, and Lateral Feathering) */}
      <div className="absolute top-0 inset-x-0 h-24 sm:h-36 bg-gradient-to-b from-[#050505] via-[#050505]/70 to-transparent pointer-events-none z-[14]" />
      <div className="absolute bottom-0 inset-x-0 h-28 sm:h-44 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent pointer-events-none z-[14]" />
      <div className="absolute inset-y-0 left-0 w-12 sm:w-28 bg-gradient-to-r from-[#050505] to-transparent pointer-events-none z-[14]" />
      <div className="absolute inset-y-0 right-0 w-12 sm:w-28 bg-gradient-to-l from-[#050505] to-transparent pointer-events-none z-[14]" />

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

      {/* Beat A (0% - 18%) - Left Flank: "KNOWLEDGE" (Lowered closer to animation) */}
      <div className="beat-a-left absolute left-6 sm:left-10 md:left-12 lg:left-16 xl:left-24 top-36 sm:top-40 md:top-[46%] md:-translate-y-1/2 flex flex-col items-start text-left max-w-[260px] sm:max-w-xs md:max-w-sm pointer-events-none z-20">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/15 backdrop-blur-md border border-amber-400/40 mb-3 sm:mb-4 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FCD34D] animate-pulse shadow-[0_0_8px_#FCD34D]" />
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#FCD34D] font-mono font-bold">
            SKILLARC // UNIVERSITY
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black uppercase tracking-tight leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white/95 via-white/40 to-white/10 [-webkit-text-stroke:1px_rgba(255,255,255,0.25)]">
            KNOWLEDGE
          </span>
        </h2>
        <p className="mt-4 text-xs sm:text-sm text-white/75 font-mono font-medium max-w-[260px] leading-[1.65] hidden sm:block">
          A clearer way to bring university work together.
        </p>
      </div>

      {/* Beat A (0% - 18%) - Right Flank: "UNFOLDS." (Raised closer to animation) */}
      <div className="beat-a-right absolute right-6 sm:right-10 md:right-12 lg:right-16 xl:right-24 bottom-36 sm:bottom-40 md:top-[46%] md:-translate-y-1/2 md:bottom-auto flex flex-col items-start md:items-end text-left md:text-right max-w-[260px] sm:max-w-xs md:max-w-sm pointer-events-none z-20 ml-auto">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E57D37]/20 backdrop-blur-md border border-[#E57D37]/60 mb-3 sm:mb-4 shadow-[0_0_15px_rgba(229,125,55,0.3)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFA366] animate-pulse shadow-[0_0_8px_#FFA366]" />
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#FFA366] font-mono font-bold">
            CONNECTED // WORKFLOWS
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black uppercase tracking-tight leading-none drop-shadow-[0_10px_30px_rgba(229,125,55,0.3)]">
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#FFB074]/95 via-[#E57D37]/50 to-[#E57D37]/10 [-webkit-text-stroke:1px_rgba(229,125,55,0.35)]">
            UNFOLDS.
          </span>
        </h2>
        <p className="mt-4 text-xs sm:text-sm text-[#ECDFCB]/75 font-mono font-medium max-w-[260px] leading-[1.65] hidden sm:block">
          One workspace for admissions, academics, student support, and placements.
        </p>
      </div>

      {/* Beat B (22% - 50%) - Responsive: Top on mobile, Left on desktop */}
      <div className="beat-b absolute left-6 sm:left-10 md:left-20 top-36 sm:top-40 md:top-1/2 md:-translate-y-1/2 max-w-xs sm:max-w-sm md:max-w-md pointer-events-none opacity-0 z-20 text-left">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E57D37]/20 backdrop-blur-md border border-[#E57D37]/60 mb-3.5 shadow-[0_0_15px_rgba(229,125,55,0.3)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFB074] animate-pulse shadow-[0_0_8px_#FFB074]" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#FFB074] font-mono font-bold">
            01 // TIMETABLES
          </span>
        </div>
        <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight mb-3 sm:mb-4 leading-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white/95 via-white/60 to-white/20 [-webkit-text-stroke:1px_rgba(255,255,255,0.2)]">
            FLUID <br className="hidden sm:inline" />TIMETABLES
          </span>
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-white/80 leading-[1.65] font-normal">
          Build timetables visually, catch clashes before publishing, and share the finished schedule with staff and students.
        </p>
      </div>

      {/* Beat C (54% - 80%) - Responsive: Top on mobile, Right on desktop */}
      <div className="beat-c absolute right-6 sm:right-10 md:right-20 top-36 sm:top-40 md:top-1/2 md:-translate-y-1/2 max-w-xs sm:max-w-sm md:max-w-md pointer-events-none opacity-0 z-20 text-left md:text-right ml-auto">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-500/20 backdrop-blur-md border border-sky-400/60 mb-3.5 shadow-[0_0_15px_rgba(56,189,248,0.35)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse shadow-[0_0_8px_#38BDF8]" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#38BDF8] font-mono font-bold">
            02 // STUDENT PROGRESS
          </span>
        </div>
        <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight mb-3 sm:mb-4 leading-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white/95 via-white/60 to-white/20 [-webkit-text-stroke:1px_rgba(255,255,255,0.2)]">
            REAL-TIME <br className="hidden sm:inline" />INTELLIGENCE
          </span>
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-white/80 leading-[1.65] font-normal">
          Bring attendance, assignments, grades, fees, events, and placement opportunities into a student&apos;s everyday view.
        </p>
      </div>

      {/* Beat D (82% - 100%) - Top Headline & Bottom CTA */}
      <div className="beat-d-top absolute inset-x-6 top-36 sm:top-40 md:top-28 flex flex-col items-center text-center pointer-events-none opacity-0 z-20 max-w-2xl mx-auto">
        <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tight leading-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white/90 via-white/40 to-white/10 [-webkit-text-stroke:1px_rgba(255,255,255,0.2)]">
            ELEVATE YOUR <br />
          </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#FFA366] via-[#E57D37]/50 to-[#E57D37]/10 [-webkit-text-stroke:1px_rgba(229,125,55,0.35)]">
            ACADEMICS.
          </span>
        </h2>
      </div>

      <div className="beat-d-bottom absolute inset-x-6 bottom-20 sm:bottom-24 md:bottom-20 flex flex-col items-center text-center pointer-events-none opacity-0 z-20 max-w-sm sm:max-w-lg mx-auto">
        <p className="text-xs sm:text-sm md:text-base text-white/85 mb-5 sm:mb-6 leading-[1.65] font-normal max-w-xs sm:max-w-md">
          See how SkillArc can help your university connect the work behind every student journey.
        </p>
        <a
          href="https://www.lumbinitechnologies.com/Contact"
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto px-8 sm:px-9 py-3.5 sm:py-4 rounded-full bg-[#E57D37] text-white hover:bg-white hover:text-[#0B132B] font-bold text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_35px_rgba(229,125,55,0.6)] hover:shadow-[0_0_50px_rgba(255,255,255,0.8)] transition-all duration-300 transform hover:scale-105 active:scale-95 border-none cursor-pointer flex items-center gap-2.5"
        >
          <span>Book a demo</span>
          <ArrowRight size={14} />
        </a>
      </div>
    </div>
  )
}
