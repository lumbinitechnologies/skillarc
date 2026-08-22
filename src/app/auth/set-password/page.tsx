'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { Lock } from 'lucide-react'

export default function SetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle')
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [inviteEmail, setInviteEmail] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const emailFromQuery = searchParams.get('inviteEmail')
    setInviteEmail(emailFromQuery)

    let ready = false
    const handleSession = async (session: any | null) => {
      const sessionEmail = session?.user?.email
      setSessionReady(true)
      setHasSession(Boolean(session))

      if (sessionEmail) {
        setUserEmail(sessionEmail)
      }

      if (!session) {
        setStatus('idle')
        setError('')
        return
      }

      if (emailFromQuery && sessionEmail && sessionEmail.toLowerCase() !== emailFromQuery.toLowerCase()) {
        console.warn('⚠️ Set-password page session mismatch', { inviteEmail: emailFromQuery, sessionEmail })
        setError('You are signed in as a different user than the invited email. Signing out and retrying...')
        setStatus('error')
        await supabase.auth.signOut()
        window.location.replace(`/auth/callback?inviteEmail=${encodeURIComponent(emailFromQuery)}&retry=1`)
        return
      }

      setStatus('idle')
      setError('')
    }

    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession()
      console.debug('set-password initial getSession', { session })
      ready = true
      await handleSession(session)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.debug('set-password onAuthStateChange', { event, session })
      if (!ready) return
      await handleSession(session)
    })

    getSession()

    return () => subscription?.unsubscribe()
  }, [router, searchParams])

  useEffect(() => {
    const fallbackTimer = window.setTimeout(() => {
      if (!hasSession) {
        setError(
          'No active invite session was detected. Please open the invite link again in a browser where you are not signed in.'
        )
        setStatus('error')
      }
    }, 5000)

    return () => window.clearTimeout(fallbackTimer)
  }, [hasSession])

  useEffect(() => {
    console.debug('set-password mounted', { inviteEmail })
  }, [inviteEmail])

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
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-editorial-navy via-[#1a2f5a] to-editorial-navy -z-10" />
      <div className="fixed inset-0 opacity-40 -z-10 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(58, 109, 175, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(58, 109, 175, 0.08) 1px, transparent 1px)",
        backgroundSize: '44px 44px',
      }} />

      {/* Accent glows */}
      <div className="fixed top-20 right-1/3 w-96 h-96 bg-editorial-orange opacity-5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="fixed bottom-32 left-1/4 w-96 h-96 bg-editorial-amber opacity-5 rounded-full blur-3xl -z-10 pointer-events-none" />

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
            <EditorialMetaTag>{ 'ACCOUNT_SETUP' }</EditorialMetaTag>
            <h1 className="ed-headline text-3xl">Set Password</h1>
            <p className="text-editorial-sky text-sm leading-relaxed">
              Create a secure password to activate your account.
            </p>
          </motion.div>

          {/* Account Info */}
          {(inviteEmail || userEmail) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-lg border border-editorial-blue border-opacity-30 bg-editorial-navy bg-opacity-40 text-editorial-cream text-sm space-y-2"
            >
              <p>Invite for: <span className="font-semibold text-editorial-orange">{inviteEmail ?? 'Unknown'}</span></p>
              {userEmail && (
                <p>Signed in as: <span className="font-semibold text-editorial-amber">{userEmail}</span></p>
              )}
            </motion.div>
          )}

          {/* Success Message */}
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-center space-y-3"
            >
              <p className="font-semibold text-lg">✓ Password Set</p>
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
            <EditorialCard variant="bordered">
              <EditorialCardContent className="space-y-6">
                {/* New Password */}
                <EditorialInput
                  label="New Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={status === 'loading' || status === 'success'}
                  icon={<Lock className="w-4 h-4" />}
                  meta="Min. 6 characters"
                />

                {/* Confirm Password */}
                <EditorialInput
                  label="Confirm Password"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  disabled={status === 'loading' || status === 'success'}
                  icon={<Lock className="w-4 h-4" />}
                />

                {/* Submit Button */}
                <EditorialButton
                  variant={status === 'success' ? 'secondary' : 'primary'}
                  size="md"
                  onClick={handleSubmit}
                  isLoading={status === 'loading'}
                  disabled={status === 'success' || !sessionReady || !hasSession}
                  className="w-full mt-6"
                >
                  {status === 'loading'
                    ? 'Setting up...'
                    : status === 'success'
                    ? 'Account Ready'
                    : !sessionReady
                    ? 'Checking session...'
                    : !hasSession
                    ? 'No active session'
                    : 'Set Password & Login'}
                </EditorialButton>
              </EditorialCardContent>
            </EditorialCard>
          </motion.div>

          {/* Footer Meta */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 text-center text-xs text-editorial-sky/60"
          >
            { 'SECURE_ACCOUNT_ACTIVATION' }
          </motion.div>
        </div>
      </div>
    </div>
  )
}