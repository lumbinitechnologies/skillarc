'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function InactivePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      await supabase.auth.signOut()
      window.location.replace('/auth/login')
    } catch (err) {
      console.error('Sign out error:', err)
      setLoading(false)
    }
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800;900&family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen w-full flex items-center justify-center bg-[#0B132B] font-['Space_Grotesk',sans-serif] text-[#ECDFCB] overflow-hidden selection:bg-[#E57D37] selection:text-[#EFEAD8] relative px-4">
        {/* Glowing Background Blobs */}
        <div className="absolute -top-12 -left-12 w-80 h-80 rounded-full bg-[#3A6DAF]/10 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-96 h-96 rounded-full bg-[#E57D37]/10 blur-[120px] pointer-events-none" />

        <div className="max-w-[480px] w-full bg-[#14234B]/40 backdrop-blur-xl border border-[#3A6DAF]/20 rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 text-center">
          {/* Logo / Header */}
          <div className="flex items-center justify-center gap-2 font-['Space_Mono',monospace] text-xs uppercase tracking-widest text-[#94BAC4] font-bold mb-8">
            <img
              src="/skillarc_logo.svg"
              alt="SkillArc Logo"
              className="h-8 w-auto object-contain"
            />
            <span>SKILLARC OS</span>
          </div>

          {/* Warning Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-[#EAAD62] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/5"
          >
            <ShieldAlert size={32} />
          </motion.div>

          {/* Typography */}
          <h1 className="text-3xl font-black uppercase tracking-tight text-[#ECDFCB] mb-4">
            Portal Inactive
          </h1>
          <p className="font-['Space_Mono',monospace] text-xs text-[#EAAD62] uppercase tracking-wider mb-6 font-bold">
            [ HTTP_403 // ACCESS_DENIED ]
          </p>

          <p className="text-sm text-[#94BAC4] leading-relaxed mb-8 font-medium">
            Your student portal access is currently inactive. This usually means your account is pending approval, or access has been temporarily suspended by system administration. Please contact your HOD or Institution Admin to reactivate your access.
          </p>

          {/* Action Button */}
          <div className="space-y-4">
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full h-12 rounded-full bg-rose-500 text-white hover:bg-rose-600 font-bold text-xs uppercase tracking-widest transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none outline-none"
            >
              <LogOut size={14} />
              <span>{loading ? 'Disconnecting...' : 'Sign Out of Session'}</span>
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-['Space_Mono',monospace] text-[#94BAC4] hover:text-[#EAAD62] transition-colors uppercase tracking-widest font-bold pt-2"
            >
              <ArrowLeft size={12} />
              Back to Home
            </Link>
          </div>

          {/* Footer Line */}
          <div className="mt-8 pt-6 border-t border-[#3A6DAF]/10 flex justify-between text-[9px] font-['Space_Mono',monospace] text-[#94BAC4] font-bold">
            <span>UPLINK_RESTRICTED</span>
            <span>STATUS: BLOCKED</span>
          </div>
        </div>
      </div>
    </>
  )
}
