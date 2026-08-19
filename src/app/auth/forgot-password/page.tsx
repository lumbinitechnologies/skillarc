'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  EditorialButton,
  EditorialInput,
  EditorialCard,
  EditorialCardContent,
  EditorialMetaTag,
} from '@/components/editorial'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!email) {
      setError('Please enter your email address')
      setStatus('error')
      return
    }

    setStatus('loading')
    setError('')

    try {
      const redirectToUrl = `${window.location.origin}/auth/callback?next=/auth/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectToUrl,
      })

      if (error) {
        setError(error.message)
        setStatus('error')
        return
      }

      setStatus('success')
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a1324]">
      {/* Background */}
      <div className="fixed inset-0 bg-[#0a1324] -z-10" />
      <div className="fixed left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1b2d4f]/30 blur-3xl -z-10" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            type="button"
            onClick={() => router.push('/')}
            className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#F4B77F] hover:text-[#F7C98E] transition-colors"
          >
            <ArrowLeft size={14} /> Back to Home
          </motion.button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8 space-y-2"
          >
            <h1 className="ed-headline text-3xl text-slate-50">Forgot Password?</h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Enter your email and we'll send a secure reset link.
            </p>
          </motion.div>

          {/* Success Message */}
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-sm space-y-3 text-center"
            >
              <p className="font-semibold text-lg">✓ Email Sent</p>
              <p className="text-sm">
                Check your inbox (and spam folder) for password reset instructions.
              </p>
              <EditorialButton
                variant="outlined"
                size="sm"
                onClick={() => router.push('/auth/login')}
                className="w-full mt-4"
              >
                Return to Login
              </EditorialButton>
            </motion.div>
          )}

          {/* Error Message */}
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Form Card */}
          {status !== 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <EditorialCard variant="bordered">
                <EditorialCardContent className="space-y-6">
                  {/* Email Input */}
                  <EditorialInput
                    label="Email Address"
                    type="email"
                    placeholder="institutional.email@edu.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    disabled={status === 'loading'}
                    icon={<Mail className="w-4 h-4" />}
                  />

                  {/* Submit Button */}
                  <EditorialButton
                    variant="primary"
                    size="md"
                    onClick={handleSubmit}
                    isLoading={status === 'loading'}
                    className="w-full mt-6"
                  >
                    Send Reset Link
                  </EditorialButton>
                </EditorialCardContent>
              </EditorialCard>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}