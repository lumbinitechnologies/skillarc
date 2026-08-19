'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'

export default function AuthCallbackFinishPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Loading...')

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
      setStatus('Redirecting...')
      router.replace(`${nextPath}${callbackQuery}`)
    }

    async function waitForSessionPersistence() {
      for (let i = 0; i < 10; i += 1) {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session) {
          return true
        }
        await new Promise((resolve) => window.setTimeout(resolve, 100))
      }
      return false
    }

    function parseHashSession() {
      try {
        const hash = window.location.hash || ''
        if (!hash) return null
        const q = new URLSearchParams(hash.replace(/^#/, ''))
        const access_token = q.get('access_token')
        const refresh_token = q.get('refresh_token')
        if (access_token) return { access_token, refresh_token }
      } catch (e) {
        console.debug('failed to parse hash for session', e)
      }
      return null
    }

    async function verifySession() {
      setStatus('Verifying invite link...')

      const hash = window.location.hash || ''
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
      const errorParam = searchParams.get('error') || hashParams.get('error')
      const errorDesc = searchParams.get('error_description') || hashParams.get('error_description')

      if (errorParam) {
        console.error('❌ Auth redirect error:', errorParam, errorDesc)
        setStatus(`Verification failed: ${errorDesc || errorParam}`)
        redirected = true
        return
      }

      const code = searchParams.get('code')

      console.debug('auth callback params', {
        code,
        inviteEmail,
        retry,
      })
      const {
        data: { session: initialSession },
        error: initialError,
      } = await supabase.auth.getSession()

      if (initialError) {
        console.warn('⚠️ Callback session initialization error:', initialError)
      }

      const initialSessionEmail = initialSession?.user?.email
      const isMismatched = inviteEmail && initialSessionEmail && initialSessionEmail.toLowerCase() !== inviteEmail.toLowerCase()

      if (initialSession && !isMismatched && !code) {
        redirectToSetPassword()
        return
      }

      if (code) {
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          console.error('❌ Error exchanging code for session:', exchangeError)
          setStatus(`Invite link verification failed: ${exchangeError.message}`)
          redirected = true
          return
        }

        if (exchangeData?.session) {
          setStatus('Establishing invite session...')
          const persisted = await waitForSessionPersistence()
          if (!persisted) {
            console.warn('⚠️ Session exchange succeeded but persisted session was not immediately available')
          }
          redirectToSetPassword()
          return
        }
      }

      const hashTokens = parseHashSession()
      if (hashTokens) {
        console.debug('Found tokens in hash, setting session via auth.setSession')
        const payload = {
          access_token: hashTokens.access_token,
          refresh_token: hashTokens.refresh_token ?? '',
        }
        const { data: setData, error: setError } = await supabase.auth.setSession(payload)
        if (setError) {
          console.error('❌ Failed to set session from hash:', setError)
        } else {
          const persisted = await waitForSessionPersistence()
          if (!persisted) console.warn('⚠️ setSession succeeded but persisted session not immediately available')
          redirectToSetPassword()
          return
        }
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.warn('⚠️ Callback session error:', error)
      }

      const sessionEmail = session?.user?.email
      if (inviteEmail && sessionEmail && sessionEmail.toLowerCase() !== inviteEmail.toLowerCase()) {
        if (retry !== '1') {
          console.warn(
            '⚠️ Invite email mismatch detected, clearing the current session and retrying',
            { inviteEmail, sessionEmail }
          )
          setStatus('Clearing previous session...')
          await supabase.auth.signOut()
          const currentUrl = new URL(window.location.href)
          currentUrl.searchParams.set('retry', '1')
          window.location.replace(currentUrl.toString())
          return
        }

        console.error(
          '❌ Invite link came through with a mismatched session after retry.',
          { inviteEmail, sessionEmail }
        )
        setStatus('Invite session mismatch. Please log in with the invited email.')
        redirected = true
        return
      }

      if (session) {
        redirectToSetPassword()
        return
      }

      setStatus('Waiting for invite session...')
    }

    verifySession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        redirectToSetPassword()
      }
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
          {/* Loading Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            {/* Loading Icon */}
            <div className="flex justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 rounded-full border-2 border-editorial-blue border-t-editorial-orange"
              />
            </div>

            {/* Header */}
            <div className="space-y-2">
              <h1 className="ed-headline text-2xl">Verifying Access</h1>
              <p className="text-editorial-sky text-sm">{status}</p>
            </div>

            {/* Status Box */}
            <div className="p-4 rounded-lg border border-editorial-blue border-opacity-20 bg-editorial-navy bg-opacity-40">
              <p className="text-editorial-cream text-xs leading-relaxed">
                { 'PROCESSING_INVITE_LINK' }
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}