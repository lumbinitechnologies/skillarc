'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AuthCard, AuthLink, AuthShell } from '@/components/auth/auth-ui'

export default function AuthCallbackFinishPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Verifying access…')

  useEffect(() => {
    let redirected = false
    let retryAttempted = false

    const inviteEmail = searchParams.get('inviteEmail')
    const retry = searchParams.get('retry')
    const queryType = searchParams.get('type')

    // Parse hash fragment if present
    const hash = typeof window !== 'undefined' ? window.location.hash || '' : ''
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
    const hashType = hashParams.get('type')
    const authType = hashType || queryType

    const defaultNext = authType === 'recovery' ? '/auth/reset-password' : '/auth/set-password'
    const nextPath = searchParams.get('next') || defaultNext
    const callbackQuery = inviteEmail ? `?inviteEmail=${encodeURIComponent(inviteEmail)}` : ''

    const redirectTarget = () => {
      if (redirected) return
      redirected = true
      setStatus('Redirecting…')
      router.replace(`${nextPath}${callbackQuery}`)
    }

    async function waitForSessionPersistence() {
      for (let i = 0; i < 15; i += 1) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) return true
        await new Promise((resolve) => window.setTimeout(resolve, 100))
      }
      return false
    }

    function parseHashSession() {
      try {
        if (!hash) return null
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        if (accessToken) {
          return { access_token: accessToken, refresh_token: refreshToken ?? '' }
        }
      } catch (error) {
        console.debug('Failed to parse hash for session', error)
      }
      return null
    }

    async function verifySession() {
      setStatus('Verifying your credentials…')

      const errorParam = searchParams.get('error') || hashParams.get('error')
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description')

      if (errorParam) {
        console.error('Auth redirect error:', errorParam, errorDescription)
        setStatus(`Verification failed: ${errorDescription || errorParam}`)
        redirected = true
        return
      }

      // Priority 1: Tokens in URL hash (implicit flow for invite / recovery)
      const hashTokens = parseHashSession()
      if (hashTokens) {
        setStatus('Setting up session from link…')
        const { error: setError } = await supabase.auth.setSession(hashTokens)
        if (setError) {
          console.error('Failed to set session from hash:', setError)
          setStatus(`Session initialization error: ${setError.message}`)
        } else {
          await waitForSessionPersistence()
          redirectTarget()
          return
        }
      }

      // Priority 2: Authorization code in query string (PKCE flow)
      const code = searchParams.get('code')
      if (code) {
        setStatus('Exchanging authentication code…')
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          console.error('Error exchanging code for session:', exchangeError)
          setStatus(`Verification failed: ${exchangeError.message}`)
          redirected = true
          return
        }

        if (exchangeData?.session) {
          await waitForSessionPersistence()
          redirectTarget()
          return
        }
      }

      // Priority 3: Check existing session in storage
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) console.warn('Callback getSession error:', sessionError)

      const sessionEmail = session?.user?.email
      if (inviteEmail && sessionEmail && sessionEmail.toLowerCase() !== inviteEmail.toLowerCase()) {
        if (retry !== '1') {
          setStatus('Clearing mismatched session…')
          await supabase.auth.signOut()
          const currentUrl = new URL(window.location.href)
          currentUrl.searchParams.set('retry', '1')
          window.location.replace(currentUrl.toString())
          return
        }

        setStatus('Invite session mismatch. Please sign in with the invited email.')
        redirected = true
        return
      }

      if (session) {
        redirectTarget()
        return
      }

      setStatus('Waiting for authentication session…')
    }

    void verifySession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) redirectTarget()
    })

    const fallbackTimer = window.setTimeout(async () => {
      if (redirected) return
      if (retry || retryAttempted) {
        setStatus('Session not detected. Please open the link again or request a new one.')
        return
      }

      retryAttempted = true
      if (!searchParams.get('retry')) {
        const reloadUrl = new URL(window.location.href)
        reloadUrl.searchParams.set('retry', '1')
        window.location.replace(reloadUrl.toString())
      }
    }, 4000)

    return () => {
      subscription?.unsubscribe()
      window.clearTimeout(fallbackTimer)
    }
  }, [router, searchParams])

  const hasFailed = /failed|mismatch|not detected|error/i.test(status)

  return (
    <AuthShell
      title="Verifying your access"
      description="We're checking your credentials and preparing your SkillArc workspace."
      utilityLabel="Verifying access"
    >
      <AuthCard className="text-center" aria-live="polite">
        <div
          className={hasFailed
            ? 'mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#F0CACA] bg-[#FFF5F5] text-[#9B3B3B]'
            : 'mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#C8DBEB] bg-[#EAF1F7] text-[#31547A]'}
          aria-hidden="true"
        >
          {hasFailed ? (
            <span className="text-xl font-bold">!</span>
          ) : (
            <span className="motion-safe:animate-spin h-5 w-5 rounded-full border-2 border-current border-t-transparent" />
          )}
        </div>
        <p className="mt-5 text-sm font-semibold text-[#31547A]">{status}</p>
        <p className="mt-2 text-sm leading-6 text-[#70849A]">
          {hasFailed ? 'Please return to sign in and open the link again.' : 'Keep this window open while we finish setting up your access.'}
        </p>
        {hasFailed ? (
          <AuthLink href="/auth/login" className="mt-5 inline-flex">
            Return to sign in
          </AuthLink>
        ) : null}
      </AuthCard>
    </AuthShell>
  )
}
