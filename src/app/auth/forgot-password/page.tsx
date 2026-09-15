'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  AuthButton,
  AuthCard,
  AuthField,
  AuthLink,
  AuthMessage,
  AuthShell,
} from '@/components/auth/auth-ui'
import { Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!email) {
      setError('Please enter your email address.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setError('')

    try {
      const redirectToUrl = `${window.location.origin}/auth/callback?next=/auth/reset-password`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectToUrl,
      })

      if (resetError) {
        setError(resetError.message)
        setStatus('error')
        return
      }

      setStatus('success')
    } catch (err) {
      console.error('Password reset request error:', err)
      setError('An unexpected error occurred. Please try again.')
      setStatus('error')
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      description="Enter the email connected to your SkillArc account and we’ll send a secure reset link."
    >
      {status === 'success' ? (
        <AuthCard>
          <AuthMessage tone="success" title="Reset link sent">
            Check your inbox and spam folder for password reset instructions.
          </AuthMessage>
          <AuthButton type="button" variant="secondary" className="w-full" onClick={() => window.location.assign('/auth/login')}>
            Return to sign in
          </AuthButton>
        </AuthCard>
      ) : (
        <AuthCard>
          {status === 'error' ? <AuthMessage>{error}</AuthMessage> : null}

          <form
            onSubmit={(event) => {
              event.preventDefault()
              void handleSubmit()
            }}
            className="space-y-5"
          >
            <AuthField
              label="Email address"
              type="email"
              placeholder="institutional.email@edu.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={status === 'loading'}
              icon={<Mail size={17} aria-hidden="true" />}
            />

            <AuthButton type="submit" isLoading={status === 'loading'} className="w-full">
              {status === 'loading' ? 'Sending reset link' : 'Send reset link'}
            </AuthButton>
          </form>

          <p className="mt-6 text-center text-sm text-[#70849A]">
            Remember your password? <AuthLink href="/auth/login">Sign in</AuthLink>
          </p>
        </AuthCard>
      )}
    </AuthShell>
  )
}
