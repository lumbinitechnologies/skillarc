"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ArrowDown, ArrowRight } from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

export default function BookScrollAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawDimsRef = useRef<{
    x: number
    y: number
    drawWidth: number
    drawHeight: number
  }>({ x: 0, y: 0, drawWidth: 0, drawHeight: 0 })

  const [images, setImages] = useState<HTMLImageElement[]>([])
  const [loading, setLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)

  const startFrame = 26
  const endFrame = 137
  const totalFrames = endFrame - startFrame + 1

  // Preload and asynchronously decode all frames for zero-stutter rendering
  useEffect(() => {
    let isCancelled = false
    let loadedCount = 0
    const loadedImages: HTMLImageElement[] = new Array(totalFrames)

    const preloadFrames = async () => {
      const promises = []

      for (let i = startFrame; i <= endFrame; i++) {
        const index = i - startFrame
        const frameNum = String(i).padStart(3, "0")
        const img = new Image()
        img.src = `/sequence/ezgif-frame-${frameNum}.jpg`

        const p = (async () => {
          try {
            await img.decode()
          } catch {
            if (!img.complete) {
              await new Promise<void>((resolve) => {
                img.onload = () => resolve()
                img.onerror = () => resolve()
              })
            }
          } finally {
            if (!isCancelled) {
              loadedImages[index] = img
              loadedCount++
              setLoadProgress(Math.round((loadedCount / totalFrames) * 100))
            }
          }
        })()

        promises.push(p)
      }

      await Promise.all(promises)

      if (!isCancelled) {
        setImages(loadedImages)
        setLoading(false)
      }
    }

    preloadFrames()

    return () => {
      isCancelled = true
    }
  }, [totalFrames])

  // Setup GSAP Timeline and Continuous RAF Lerp Canvas Rendering
  useEffect(() => {
    if (loading || images.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) return

    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2)
    
    // Lerp state for physics-based frame momentum
    const targetFrameRef = { current: 0 }
    const renderedFrameRef = { current: 0 }
    let rafId: number | null = null

    // Calculate containment dimensions once on resize instead of every frame
    const resizeCanvas = () => {
      const w = window.innerWidth
      const h = window.innerHeight

      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      const sampleImg = images[0]
      const imgRatio = sampleImg ? sampleImg.width / sampleImg.height : 16 / 9
      const screenRatio = w / h

      let drawWidth = w * dpr
      let drawHeight = h * dpr

      if (screenRatio > imgRatio) {
        drawWidth = h * imgRatio * dpr
      } else {
        drawHeight = (w / imgRatio) * dpr
      }

      const x = (canvas.width - drawWidth) / 2
      const y = (canvas.height - drawHeight) / 2

      drawDimsRef.current = { x, y, drawWidth, drawHeight }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"

      render(renderedFrameRef.current)
    }

    // High-fidelity sub-frame interpolation renderer with smoothstep crossfade
    const render = (frameFloat: number) => {
      const total = images.length
      if (total === 0) return

      const clamped = Math.max(0, Math.min(total - 1, frameFloat))
      const baseIndex = Math.floor(clamped)
      const nextIndex = Math.min(total - 1, baseIndex + 1)
      const fraction = clamped - baseIndex

      // Hermite smoothstep curve for zero-tangent boundary blending
      const smoothFraction = fraction * fraction * (3 - 2 * fraction)

      const img1 = images[baseIndex]
      const img2 = images[nextIndex]
      const dims = drawDimsRef.current

      // Clear full canvas area
      ctx.fillStyle = "#050505"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw primary base frame
      if (img1) {
        ctx.globalAlpha = 1
        ctx.drawImage(img1, dims.x, dims.y, dims.drawWidth, dims.drawHeight)
      }

      // Smooth temporal crossfade between adjacent frames
      if (img2 && smoothFraction > 0.002 && baseIndex !== nextIndex) {
        ctx.globalAlpha = smoothFraction
        ctx.drawImage(img2, dims.x, dims.y, dims.drawWidth, dims.drawHeight)
      }

      ctx.globalAlpha = 1
    }

    // Continuous RAF Lerp loop for display-refresh synchronized rendering
    const renderLoop = () => {
      const delta = targetFrameRef.current - renderedFrameRef.current
      if (Math.abs(delta) > 0.0005) {
        // High-precision lerp smoothing (14% convergence per frame)
        renderedFrameRef.current += delta * 0.14
        render(renderedFrameRef.current)
      }
      rafId = requestAnimationFrame(renderLoop)
    }

    // Initialize layout sizing and start render loop
    resizeCanvas()
    rafId = requestAnimationFrame(renderLoop)

    // Single ScrollTrigger timeline with explicit duration units to guarantee 0% overlap
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "+=380%",
        scrub: 0.8,
        pin: true,
        pinSpacing: true,
      },
    })

    // 1. Frame progression from 0 to 10 units
    tl.to(targetFrameRef, { current: totalFrames - 1, ease: "none", duration: 10 }, 0)

    // 2. Scroll indicator fade out (0 -> 0.8)
    tl.to(".scroll-indicator", { opacity: 0, y: 15, ease: "none", duration: 0.8 }, 0)

    // 3. Beat A: Visible at start, clean fade out from 1.0 -> 1.8
    tl.to(".beat-a-top", { opacity: 0, y: -25, ease: "power1.in", duration: 0.8 }, 1.0)
    tl.to(".beat-a-bottom", { opacity: 0, y: 25, ease: "power1.in", duration: 0.8 }, 1.0)

    // 4. Beat B: Fades in at 2.2 -> 3.0, stays until 4.2, fades out completely 4.2 -> 5.0
    tl.fromTo(".beat-b", { opacity: 0, y: 30 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.8 }, 2.2)
    tl.to(".beat-b", { opacity: 0, y: -25, ease: "power1.in", duration: 0.8 }, 4.2)

    // 5. Beat C: Fades in at 5.4 -> 6.2, stays until 7.2, fades out completely 7.2 -> 8.0
    tl.fromTo(".beat-c", { opacity: 0, y: 30 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.8 }, 5.4)
    tl.to(".beat-c", { opacity: 0, y: -25, ease: "power1.in", duration: 0.8 }, 7.2)

    // 6. Beat D: Fades in at 8.2 -> 9.0, stays until 10.0
    tl.fromTo(".beat-d-top", { opacity: 0, y: -25 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.8 }, 8.2)
    tl.fromTo(".beat-d-bottom", { opacity: 0, y: 25 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.8 }, 8.2)

    window.addEventListener("resize", resizeCanvas)

    return () => {
      tl.kill()
      if (rafId !== null) cancelAnimationFrame(rafId)
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [loading, images, totalFrames])

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

      {/* --- PURE EDITORIAL SCROLLYTELLING OVERLAYS --- */}

      {/* Beat A (0% - 18%) - Top Title: Positioned high in the upper third */}
      <div className="beat-a-top absolute inset-x-6 top-16 sm:top-20 md:top-24 flex flex-col items-center text-center pointer-events-none z-20">
        <h2 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight text-white leading-none drop-shadow-2xl">
          KNOWLEDGE <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#E57D37] to-[#EAAD62]">UNFOLDS.</span>
        </h2>
      </div>

      {/* Beat A (0% - 18%) - Bottom Subtitle: Positioned cleanly on the lower third */}
      <div className="beat-a-bottom absolute inset-x-6 bottom-16 sm:bottom-20 md:bottom-24 flex flex-col items-center text-center pointer-events-none z-20">
        <p className="text-xs sm:text-sm md:text-base text-white/70 max-w-md font-medium leading-relaxed">
          A living database architecture for modern universities and colleges.
        </p>
      </div>

      {/* Beat B (22% - 50%) - Responsive: Top on mobile, Left on desktop */}
      <div className="beat-b absolute left-6 sm:left-10 md:left-20 top-20 md:top-1/2 md:-translate-y-1/2 max-w-xs sm:max-w-sm md:max-w-md pointer-events-none opacity-0 z-20 text-left">
        <span className="text-xs uppercase tracking-[0.25em] text-[#E57D37] font-bold block mb-2 sm:mb-3">
          01 // SCHEDULING
        </span>
        <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white mb-3 sm:mb-4 leading-tight">
          FLUID <br className="hidden sm:inline" />TIMETABLES
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-white/70 leading-relaxed font-normal">
          Interactive visual timetable scheduling with automated conflict detection. Zero room clashes, balanced faculty workloads.
        </p>
      </div>

      {/* Beat C (54% - 80%) - Responsive: Top on mobile, Right on desktop */}
      <div className="beat-c absolute right-6 sm:right-10 md:right-20 top-20 md:top-1/2 md:-translate-y-1/2 max-w-xs sm:max-w-sm md:max-w-md pointer-events-none opacity-0 z-20 text-left md:text-right ml-auto">
        <span className="text-xs uppercase tracking-[0.25em] text-[#38BDF8] font-bold block mb-2 sm:mb-3">
          02 // TELEMETRY
        </span>
        <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white mb-3 sm:mb-4 leading-tight">
          REAL-TIME <br className="hidden sm:inline" />INTELLIGENCE
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-white/70 leading-relaxed font-normal">
          Automated class attendance, direct student engagement telemetry, and real-time corporate recruitment sync.
        </p>
      </div>

      {/* Beat D (82% - 100%) - Top Headline & Bottom CTA */}
      <div className="beat-d-top absolute inset-x-6 top-16 sm:top-20 md:top-24 flex flex-col items-center text-center pointer-events-none opacity-0 z-20 max-w-2xl mx-auto">
        <span className="text-xs uppercase tracking-[0.25em] text-[#E57D37] font-bold mb-3">
          INTEGRATE SKILLARC
        </span>
        <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tight text-white leading-tight">
          ELEVATE YOUR <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#E57D37] to-[#EAAD62]">
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
