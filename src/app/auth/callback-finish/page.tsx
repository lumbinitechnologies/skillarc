"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackFinishPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState("Loading...")

  useEffect(() => {
    let redirected = false
    let retryAttempted = false
    const inviteEmail = searchParams.get("inviteEmail")
    const retry = searchParams.get("retry")
    const callbackQuery = inviteEmail ? `?inviteEmail=${encodeURIComponent(inviteEmail)}` : ""

    const redirectToSetPassword = () => {
      if (redirected) return
      redirected = true
      setStatus("Redirecting...")
      router.replace(`/auth/set-password${callbackQuery}`)
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
        const hash = window.location.hash || ""
        if (!hash) return null
        const q = new URLSearchParams(hash.replace(/^#/, ""))
        const access_token = q.get("access_token")
        const refresh_token = q.get("refresh_token")
        if (access_token) return { access_token, refresh_token }
      } catch (e) {
        console.debug("failed to parse hash for session", e)
      }
      return null
    }

    async function verifySession() {
      setStatus("Verifying invite link...")

      const hash = window.location.hash || ""
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""))
      const errorParam = searchParams.get("error") || hashParams.get("error")
      const errorDesc = searchParams.get("error_description") || hashParams.get("error_description")

      if (errorParam) {
        console.error("❌ Auth redirect error:", errorParam, errorDesc)
        setStatus(`Verification failed: ${errorDesc || errorParam}`)
        redirected = true
        return
      }

      const code = searchParams.get("code")

      console.debug("auth callback params", {
        code,
        inviteEmail,
        retry,
      })
      const {
        data: { session: initialSession },
        error: initialError,
      } = await supabase.auth.getSession()

      if (initialError) {
        console.warn("⚠️ Callback session initialization error:", initialError)
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
          console.error("❌ Error exchanging code for session:", exchangeError)
          setStatus(`Invite link verification failed: ${exchangeError.message}`)
          redirected = true
          return
        }

        if (exchangeData?.session) {
          setStatus("Establishing invite session...")
          const persisted = await waitForSessionPersistence()
          if (!persisted) {
            console.warn("⚠️ Session exchange succeeded but persisted session was not immediately available")
          }
          redirectToSetPassword()
          return
        }
      }

      const hashTokens = parseHashSession()
      if (hashTokens) {
        console.debug("Found tokens in hash, setting session via auth.setSession")
        const payload = {
          access_token: hashTokens.access_token,
          refresh_token: hashTokens.refresh_token ?? "",
        }
        const { data: setData, error: setError } = await supabase.auth.setSession(payload)
        if (setError) {
          console.error("❌ Failed to set session from hash:", setError)
        } else {
          const persisted = await waitForSessionPersistence()
          if (!persisted) console.warn("⚠️ setSession succeeded but persisted session not immediately available")
          redirectToSetPassword()
          return
        }
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.warn("⚠️ Callback session error:", error)
      }

      const sessionEmail = session?.user?.email
      if (inviteEmail && sessionEmail && sessionEmail.toLowerCase() !== inviteEmail.toLowerCase()) {
        if (retry !== "1") {
          console.warn(
            "⚠️ Invite email mismatch detected, clearing the current session and retrying",
            { inviteEmail, sessionEmail }
          )
          setStatus("Clearing previous session...")
          await supabase.auth.signOut()
          const currentUrl = new URL(window.location.href)
          currentUrl.searchParams.set("retry", "1")
          window.location.replace(currentUrl.toString())
          return
        }

        console.error(
          "❌ Invite link came through with a mismatched session after retry.",
          { inviteEmail, sessionEmail }
        )
        setStatus("Invite session mismatch. Please log in with the invited email.")
        redirected = true
        return
      }

      if (session) {
        redirectToSetPassword()
        return
      }

      setStatus("Waiting for invite session...")
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
        setStatus("Invite session not found. Open the invite link again in a fresh browser or private window.")
        return
      }

      retryAttempted = true
      if (!searchParams.get("retry")) {
        const reloadUrl = new URL(window.location.href)
        reloadUrl.searchParams.set("retry", "1")
        window.location.replace(reloadUrl.toString())
      }
    }, 5000)

    return () => {
      subscription?.unsubscribe()
      window.clearTimeout(fallbackTimer)
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.08),_transparent_20%),linear-gradient(180deg,#f8fbff,#eff6ff)] px-4 py-10">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white/90 p-10 shadow-[0_28px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-3xl">⏳</div>
        <h1 className="text-xl font-semibold text-slate-900">Processing your invite</h1>
        <p className="mt-4 text-sm leading-7 text-slate-500">{status}</p>
      </div>
    </div>
  )
}
