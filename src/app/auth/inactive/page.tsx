'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { AuthButton, AuthCard, AuthShell } from '@/components/auth/auth-ui'

export default function InactivePage() {
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
    <AuthShell
      title="Your portal access is inactive"
      description="Your student portal access is currently inactive. Contact your HOD or institution administrator to review your access."
      utilityLabel="Account access"
    >
      <AuthCard className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#F2D8A7] bg-[#FFF9EA] text-[#A66314]" aria-hidden="true">
          <ShieldAlert size={27} />
        </div>

        <p className="text-sm leading-6 text-[#5B708A]">
          Once your university confirms your access, you can return here and sign in again.
        </p>

        <div className="mt-6 space-y-3">
          <AuthButton type="button" variant="danger" isLoading={loading} onClick={() => void handleSignOut()} className="w-full">
            {loading ? 'Signing out' : 'Sign out of session'}
          </AuthButton>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-[#5B708A] hover:bg-[#F4F8FB] hover:text-[#14234B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E]"
          >
            Return to home
          </Link>
        </div>
      </AuthCard>
    </AuthShell>
  )
}
