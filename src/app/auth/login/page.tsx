'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/app/actions/auth'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Terminal, Check, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()

  async function handleLogin() {
    setError('')
    setLoading(true)

    try {
      const result = await loginAction(email, password)

      if (result?.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      window.dispatchEvent(new Event('skillarc-auth-changed'))
      router.push('/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      setLoading(false)
    }
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,600;1,700&family=Space+Grotesk:wght@500;700;800;900&family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen w-full grid grid-cols-12 bg-[#0B132B] font-['Space_Grotesk',sans-serif] text-[#ECDFCB] overflow-hidden selection:bg-[#E57D37] selection:text-[#EFEAD8]">
        
        {/* Left Column: Visual Panel (Visible on Desktop) */}
        <div className="hidden lg:flex lg:col-span-6 bg-[#14234B] p-16 flex-col justify-between relative overflow-hidden border-r border-[#3A6DAF]/20">
          
          {/* Glowing Background Blobs */}
          <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-[#3A6DAF]/10 blur-[80px]" />
          <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-[#E57D37]/10 blur-[100px]" />

          {/* Top Branding Tag */}
          <div className="flex items-center gap-3 relative z-10 font-['Space_Mono',monospace] text-xs uppercase tracking-widest text-[#94BAC4] font-bold">
            <Link href="/" className="flex items-center gap-2 group">
              <img
                src="/skillarc_logo.svg"
                alt="SkillArc Logo"
                className="h-8 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
              />
              <span className="text-[#ECDFCB] hover:text-[#EAAD62] transition-colors">SKILLARC OS</span>
            </Link>
            <span>//</span>
            <span>AUTH_GATEWAY</span>
          </div>

          {/* Main Typographic Headline */}
          <div className="relative z-10 my-auto py-10 space-y-6">
            <h2 className="text-5xl xl:text-6xl font-black uppercase tracking-tight leading-none text-[#ECDFCB]">
              Unifying <br />
              <span className="font-['Playfair_Display',serif] italic font-bold text-[#E57D37] lowercase text-6xl xl:text-7xl">
                academic{" "}
              </span>
              <br />
              operations.
            </h2>
            <p className="font-['Space_Mono',monospace] text-xs text-[#94BAC4] leading-relaxed max-w-sm uppercase font-bold">
              {"{ Visual timetable engines, direct placement telemetry, and course coordination dashboards on a singular platform. }"}
            </p>
          </div>

          {/* Floating Live Logs Terminal */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full bg-[#0B132B]/80 backdrop-blur-md rounded-2xl p-5 border border-[#3A6DAF]/30 shadow-2xl relative z-10"
          >
            <div className="flex justify-between items-center pb-3 border-b border-white/10 text-[10px] font-['Space_Mono',monospace] text-[#94BAC4] font-bold tracking-wider">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#E57D37] animate-pulse" />
                <span>SECURE DAEMON UPLINK</span>
              </div>
              <span>PORT 443 // SSL</span>
            </div>

            <div className="pt-4 space-y-2.5 font-['Space_Mono',monospace] text-[10px] leading-none text-[#94BAC4] font-bold">
              <div className="flex justify-between">
                <span>[11:02:40] AUTH_AGENT</span>
                <span className="text-[#00C2A8]">READY</span>
              </div>
              <div className="flex justify-between">
                <span>[11:02:41] NETWORK_RELAY</span>
                <span className="text-[#EAAD62]">SECURE</span>
              </div>
              <div className="flex justify-between">
                <span>[11:02:42] ENCRYPTION_SYS</span>
                <span className="text-[#ECDFCB]">TLS_1.3</span>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Right Column: Sign In Form Pane */}
        <div className="col-span-12 lg:col-span-6 flex flex-col justify-between p-8 sm:p-16 min-h-screen relative bg-[#0B132B]">
          
          {/* Top Navigation Row (Mobile Brand Visible) */}
          <div className="flex justify-between items-center w-full relative z-10">
            <div className="lg:hidden flex items-center gap-2 font-['Space_Mono',monospace] text-xs uppercase tracking-widest text-[#94BAC4] font-bold">
              <img
                src="/skillarc_logo.svg"
                alt="SkillArc Logo"
                className="h-7 w-auto object-contain"
              />
              <span className="text-[#ECDFCB]">SKILLARC OS</span>
            </div>
            <Link
              href="/"
              className="text-xs font-['Space_Mono',monospace] text-[#94BAC4] hover:text-[#EAAD62] transition-colors uppercase tracking-widest font-bold flex items-center gap-1.5 ml-auto"
            >
              ← Back to Home
            </Link>
          </div>

          {/* Form Area Container */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="my-auto py-10 max-w-[420px] w-full mx-auto relative z-10"
          >
            {/* Header info */}
            <div className="space-y-2 mb-8">
              <span className="font-['Space_Mono',monospace] text-[10px] text-[#EAAD62] tracking-[0.25em] uppercase font-bold">
                [ AUTHENTICATION PORTAL ]
              </span>
              <h1 className="text-4xl font-black uppercase tracking-tight text-[#ECDFCB]">
                Sign In.
              </h1>
              <p className="font-['Space_Mono',monospace] text-xs text-[#94BAC4] font-bold">
                Enter your institutional coordinates to access the OS dashboard.
              </p>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="mb-6 p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-['Space_Mono',monospace] font-bold"
                >
                  ERROR // {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Inputs & Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void handleLogin()
              }}
              className="space-y-5"
            >
              
              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#94BAC4]">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="institutional.email@edu.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 rounded-2xl border border-[#3A6DAF]/30 bg-[#14234B]/30 text-white placeholder-slate-500 focus:border-[#EAAD62] focus:ring-2 focus:ring-[#EAAD62]/20 transition-all duration-300 outline-none text-sm font-medium"
                    required
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94BAC4] w-4.5 h-4.5" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#94BAC4]">Password</label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-[10px] font-bold uppercase tracking-wider text-[#EAAD62] hover:text-[#E57D37] transition-colors"
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 pl-11 pr-12 rounded-2xl border border-[#3A6DAF]/30 bg-[#14234B]/30 text-white placeholder-slate-500 focus:border-[#EAAD62] focus:ring-2 focus:ring-[#EAAD62]/20 transition-all duration-300 outline-none text-sm font-medium"
                    required
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94BAC4] w-4.5 h-4.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/5 transition-all text-[#94BAC4] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 mt-4 rounded-full bg-[#E57D37] text-white hover:bg-[#EAAD62] font-bold text-xs uppercase tracking-widest transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-[#E57D37]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none outline-none"
              >
                <span>{loading ? 'Authenticating...' : 'Establish Connection'}</span>
                {!loading && <ArrowRight size={14} className="text-[#ECDFCB]" />}
              </button>

            </form>

            {/* Bottom links */}
            <div className="mt-8 pt-5 border-t border-[#3A6DAF]/20 text-center font-['Space_Mono',monospace] text-xs text-[#94BAC4]">
              <span>No access credentials?</span>{" "}
              <Link
                href="/auth/signup"
                className="text-[#EAAD62] hover:text-[#E57D37] font-bold transition-colors"
              >
                Request Access
              </Link>
            </div>

          </motion.div>

          {/* Footer Row */}
          <div className="w-full flex justify-between items-center text-[10px] font-['Space_Mono',monospace] text-[#94BAC4] pt-8 relative z-10 font-bold border-t border-[#3A6DAF]/10">
            <span>SKILLARC ACADEMIC OS // 2026 EDITION</span>
            <span>STATUS: ONLINE</span>
          </div>

        </div>

      </div>
    </>
  )
}
