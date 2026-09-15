'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ROLES } from '@/constants/roles'
import {
  AuthButton,
  AuthCard,
  AuthField,
  AuthMessage,
  AuthShell,
} from '@/components/auth/auth-ui'
import { Eye, EyeOff, Lock } from 'lucide-react'

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

    void checkSession()
    return () => subscription?.unsubscribe()
  }, [])

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
      console.error('Password update error:', err)
      setError('An unexpected error occurred. Please try again.')
      setStatus('error')
    }
  }

  return (
    <AuthShell
      title="Choose a new password"
      description="Create a new password to continue to your SkillArc university workspace."
    >
      {userEmail ? (
        <div className="mb-5 rounded-xl border border-[#DCE6EE] bg-[#F8FBFD] px-4 py-3 text-sm text-[#5B708A]">
          Resetting access for <span className="font-bold text-[#31547A]">{userEmail}</span>
        </div>
      ) : null}

      {status === 'success' ? (
        <AuthMessage tone="success" title="Password updated">
          Your password has been updated. Redirecting to your workspace…
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
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter a new password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            disabled={status === 'loading' || status === 'success' || !hasSession}
            hint="Use at least 6 characters."
            icon={<Lock size={17} aria-hidden="true" />}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={status === 'loading' || status === 'success' || !hasSession}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7890A7] hover:bg-[#F0F5F8] hover:text-[#14234B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            }
          />

          <AuthField
            label="Confirm new password"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Re-enter your new password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            disabled={status === 'loading' || status === 'success' || !hasSession}
            icon={<Lock size={17} aria-hidden="true" />}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowConfirm((visible) => !visible)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                disabled={status === 'loading' || status === 'success' || !hasSession}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7890A7] hover:bg-[#F0F5F8] hover:text-[#14234B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showConfirm ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            }
          />

          <AuthButton
            type="submit"
            isLoading={status === 'loading'}
            disabled={status === 'success' || !sessionReady || !hasSession}
            className="w-full"
            variant={status === 'success' ? 'secondary' : 'primary'}
          >
            {status === 'loading'
              ? 'Updating password'
              : status === 'success'
                ? 'Password updated'
                : !sessionReady
                  ? 'Checking session'
                  : !hasSession
                    ? 'No active session'
                    : 'Update password'}
          </AuthButton>
        </form>
      </AuthCard>
    </AuthShell>
  )
}
