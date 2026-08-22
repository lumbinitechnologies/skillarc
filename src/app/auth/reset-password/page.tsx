'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ROLES } from '@/constants/roles'
import {
  EditorialButton,
  EditorialInput,
  EditorialCard,
  EditorialCardContent,
  EditorialMetaTag,
} from '@/components/editorial'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle')
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      setSessionReady(true)
      if (session) {
        setHasSession(true)
        setUserEmail(session.user?.email ?? '')
      } else {
        setHasSession(false)
        setError('No active reset session detected. Please open the link from your password reset email.')
        setStatus('error')
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setHasSession(true)
        setUserEmail(session.user?.email ?? '')
      }
    })

    checkSession()
    return () => subscription?.unsubscribe()
  }, [])

  async function handleSubmit() {
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setStatus('error')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      setStatus('error')
      return
    }

    setStatus('loading')
    setError('')

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
        setStatus('error')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      let redirectPath = '/dashboard'

      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === ROLES.STUDENT) redirectPath = '/dashboard/student'
        else if (profile?.role === ROLES.FACULTY) redirectPath = '/dashboard/faculty'
        else if (profile?.role === ROLES.INSTITUTION_ADMIN) redirectPath = '/dashboard/institution-admin'
        else if (profile?.role === ROLES.ORG_ADMIN) redirectPath = '/dashboard/org-admin'
        else if (profile?.role === ROLES.HOD) redirectPath = '/dashboard/hod'
        else if (profile?.role === ROLES.PROGRAM_HEAD) redirectPath = '/dashboard/program-head'
        else if (profile?.role === ROLES.SUPER_ADMIN) redirectPath = '/dashboard/super-admin'
        else if (profile?.role === ROLES.PARENT) redirectPath = '/dashboard/parent'
      }

      setStatus('success')
      setTimeout(() => router.push(redirectPath), 1200)
    } catch (err) {
      setError('An unexpected error occurred')
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
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 space-y-2"
          >
            <h1 className="ed-headline text-3xl text-slate-50">New Password</h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Create a secure password to access your account.
            </p>
          </motion.div>

          {/* Account Info */}
          {userEmail && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 rounded-xl border border-[#2f4d73] bg-[#101d33]/80 p-4 text-sm text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              Resetting for: <span className="font-semibold text-[#F4B77F]">{userEmail}</span>
            </motion.div>
          )}

          {/* Success Message */}
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-center space-y-3"
            >
              <p className="font-semibold text-lg">✓ Password Updated</p>
              <p className="text-sm">Redirecting to dashboard...</p>
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void handleSubmit()
              }}
            >
              <EditorialCard variant="bordered">
                <EditorialCardContent className="space-y-6">
                  {/* New Password */}
                  <EditorialInput
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={status === 'loading' || status === 'success' || !hasSession}
                    icon={<Lock className="w-4 h-4" />}
                    rightSlot={
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        disabled={status === 'loading' || status === 'success' || !hasSession}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                    meta="Min. 6 characters"
                  />

                  {/* Confirm Password */}
                  <EditorialInput
                    label="Confirm Password"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={status === 'loading' || status === 'success' || !hasSession}
                    icon={<Lock className="w-4 h-4" />}
                    rightSlot={
                      <button
                        type="button"
                        onClick={() => setShowConfirm((prev) => !prev)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                        disabled={status === 'loading' || status === 'success' || !hasSession}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />

                  {/* Submit Button */}
                  <EditorialButton
                    variant={status === 'success' ? 'secondary' : 'primary'}
                    size="md"
                    type="submit"
                    isLoading={status === 'loading'}
                    disabled={status === 'success' || !sessionReady || !hasSession}
                    className="w-full mt-6"
                  >
                    {status === 'loading'
                      ? 'Updating...'
                      : status === 'success'
                      ? 'Password Updated'
                      : !sessionReady
                      ? 'Checking session...'
                      : !hasSession
                      ? 'No active session'
                      : 'Reset Password'}
                  </EditorialButton>
                </EditorialCardContent>
              </EditorialCard>
            </form>
          </motion.div>

          {/* Back to Home Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 text-center"
          >
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-sm text-slate-400 transition-colors hover:text-slate-200"
            >
              ← Back to Home
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}