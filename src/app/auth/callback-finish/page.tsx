'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AuthCard, AuthLink, AuthShell } from '@/components/auth/auth-ui'

export default function AuthCallbackFinishPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Loading…')

  useEffect(() => {
    let redirected = false
    let retryAttempted = false
    const inviteEmail = searchParams.get('inviteEmail')
    const retry = searchParams.get('retry')
    const nextPath = searchParams.get('next') || '/auth/set-password'
    const callbackQuery = inviteEmail ? `?inviteEmail=${encodeURIComponent(inviteEmail)}` : ''

    const redirectToSetPassword = () => {
      if (redirected) return
      redirected = true
      setStatus('Redirecting…')
      router.replace(`${nextPath}${callbackQuery}`)
    }

    async function waitForSessionPersistence() {
      for (let i = 0; i < 10; i += 1) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) return true
        await new Promise((resolve) => window.setTimeout(resolve, 100))
      }
      return false
    }

    function parseHashSession() {
      try {
        const hash = window.location.hash || ''
        if (!hash) return null
        const query = new URLSearchParams(hash.replace(/^#/, ''))
        const accessToken = query.get('access_token')
        const refreshToken = query.get('refresh_token')
        if (accessToken) return { access_token: accessToken, refresh_token: refreshToken ?? '' }
      } catch (error) {
        console.debug('Failed to parse hash for session', error)
      }
      return null
    }

    async function verifySession() {
      setStatus('Verifying invitation…')

      const hash = window.location.hash || ''
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
      const errorParam = searchParams.get('error') || hashParams.get('error')
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description')

      if (errorParam) {
        console.error('Auth redirect error:', errorParam, errorDescription)
        setStatus(`Verification failed: ${errorDescription || errorParam}`)
        redirected = true
        return
      }

      const code = searchParams.get('code')
      const { data: { session: initialSession }, error: initialError } = await supabase.auth.getSession()
      if (initialError) console.warn('Callback session initialization error:', initialError)

      const initialSessionEmail = initialSession?.user?.email
      const isMismatched = inviteEmail && initialSessionEmail && initialSessionEmail.toLowerCase() !== inviteEmail.toLowerCase()

      if (initialSession && !isMismatched && !code) {
        redirectToSetPassword()
        return
      }

      if (code) {
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          console.error('Error exchanging code for session:', exchangeError)
          setStatus(`Invite link verification failed: ${exchangeError.message}`)
          redirected = true
          return
        }

        if (exchangeData?.session) {
          setStatus('Establishing your invitation…')
          await waitForSessionPersistence()
          redirectToSetPassword()
          return
        }
      }

      const hashTokens = parseHashSession()
      if (hashTokens) {
        const { error: setError } = await supabase.auth.setSession(hashTokens)
        if (setError) {
          console.error('Failed to set session from hash:', setError)
        } else {
          await waitForSessionPersistence()
          redirectToSetPassword()
          return
        }
      }

      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) console.warn('Callback session error:', error)

      const sessionEmail = session?.user?.email
      if (inviteEmail && sessionEmail && sessionEmail.toLowerCase() !== inviteEmail.toLowerCase()) {
        if (retry !== '1') {
          setStatus('Clearing the previous session…')
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
        redirectToSetPassword()
        return
      }

      setStatus('Waiting for your invitation session…')
    }

    void verifySession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) redirectToSetPassword()
    })

    const fallbackTimer = window.setTimeout(async () => {
      if (redirected) return
      if (retry || retryAttempted) {
        setStatus('Invite session not found. Open the invite link again in a fresh browser or private window.')
        return
      }

      retryAttempted = true
      if (!searchParams.get('retry')) {
        const reloadUrl = new URL(window.location.href)
        reloadUrl.searchParams.set('retry', '1')
        window.location.replace(reloadUrl.toString())
      }
    }, 5000)

    return () => {
      subscription?.unsubscribe()
      window.clearTimeout(fallbackTimer)
    }
  }, [router, searchParams])

  const hasFailed = /failed|mismatch|not found/i.test(status)

  return (
    <AuthShell
      title="Verifying your access"
      description="We’re checking your invitation and preparing your SkillArc university workspace."
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
          {hasFailed ? 'Return to sign in and open the invitation link again when you are ready.' : 'Keep this window open while we finish setting up your access.'}
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
