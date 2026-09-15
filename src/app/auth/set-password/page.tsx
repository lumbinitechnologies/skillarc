'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ROLES } from '@/constants/roles'
import {
  AuthButton,
  AuthCard,
  AuthField,
  AuthMessage,
  AuthShell,
} from '@/components/auth/auth-ui'
import { Lock } from 'lucide-react'

export default function SetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteEmail = searchParams.get('inviteEmail')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle')
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const emailFromQuery = inviteEmail

    let ready = false
    const handleSession = async (session: { user?: { email?: string | null } } | null) => {
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
        console.warn('Set-password page session mismatch', { inviteEmail: emailFromQuery, sessionEmail })
        setError('You are signed in as a different user than the invited email. Signing out and retrying…')
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
      ready = true
      await handleSession(session)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!ready) return
      await handleSession(session)
    })

    void getSession()

    return () => subscription?.unsubscribe()
  }, [inviteEmail])

  useEffect(() => {
    const fallbackTimer = window.setTimeout(() => {
      if (!hasSession) {
        setError('No active invite session was detected. Please open the invite link again in a browser where you are not signed in.')
        setStatus('error')
      }
    }, 5000)

    return () => window.clearTimeout(fallbackTimer)
  }, [hasSession])

  async function handleSubmit() {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setStatus('error')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setError('')

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
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
      window.setTimeout(() => router.push(redirectPath), 1200)
    } catch (err) {
      console.error('Password setup error:', err)
      setError('An unexpected error occurred. Please try again.')
      setStatus('error')
    }
  }

  return (
    <AuthShell
      title="Set your SkillArc password"
      description="Create a password to activate your invitation and continue to your university workspace."
    >
      {(inviteEmail || userEmail) ? (
        <div className="mb-5 space-y-1 rounded-xl border border-[#DCE6EE] bg-[#F8FBFD] px-4 py-3 text-sm text-[#5B708A]">
          {inviteEmail ? <p>Invitation for <span className="font-bold text-[#31547A]">{inviteEmail}</span></p> : null}
          {userEmail ? <p>Signed in as <span className="font-bold text-[#31547A]">{userEmail}</span></p> : null}
        </div>
      ) : null}

      {status === 'success' ? (
        <AuthMessage tone="success" title="Account ready">
          Your password has been set. Redirecting to your workspace…
        </AuthMessage>
      ) : null}
      {status === 'error' ? <AuthMessage>{error}</AuthMessage> : null}

      <AuthCard>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit()
          }}
          className="space-y-5"
        >
          <AuthField
            label="New password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            disabled={status === 'loading' || status === 'success'}
            hint="Use at least 6 characters."
            icon={<Lock size={17} aria-hidden="true" />}
          />

          <AuthField
            label="Confirm password"
            type="password"
            placeholder="Re-enter your password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            disabled={status === 'loading' || status === 'success'}
            icon={<Lock size={17} aria-hidden="true" />}
          />

          <AuthButton
            type="submit"
            isLoading={status === 'loading'}
            disabled={status === 'success' || !sessionReady || !hasSession}
            className="w-full"
            variant={status === 'success' ? 'secondary' : 'primary'}
          >
            {status === 'loading'
              ? 'Setting password'
              : status === 'success'
                ? 'Account ready'
                : !sessionReady
                  ? 'Checking invitation'
                  : !hasSession
                    ? 'No active invitation'
                    : 'Set password and continue'}
          </AuthButton>
        </form>
      </AuthCard>
    </AuthShell>
  )
}
