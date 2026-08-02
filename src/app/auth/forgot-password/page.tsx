"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle")
  const [error, setError] = useState("")

  async function handleSubmit() {
    if (!email) {
      setError("Please enter your email address")
      setStatus("error")
      return
    }

    setStatus("loading")
    setError("")

    try {
      const redirectToUrl = `${window.location.origin}/auth/callback?next=/auth/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectToUrl,
      })

      if (error) {
        setError(error.message)
        setStatus("error")
        return
      }

      setStatus("success")
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      setStatus("error")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.09),_transparent_18%),linear-gradient(180deg,#f8fbff,#eff6ff)] px-4 py-10">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white/95 p-10 shadow-[0_28px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all duration-300">
        <button
          type="button"
          onClick={() => router.push("/auth/login")}
          className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-indigo-600 transition duration-200"
        >
          <ArrowLeft size={14} /> Back to Sign In
        </button>

        <div className="mb-6">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Mail size={22} />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-600">Security</p>
          <h1 className="mt-3 text-3xl font-black text-slate-950">Forgot Password?</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            No worries! Enter your email address below and we'll send you a secure link to reset your password.
          </p>
        </div>

        {status === "success" && (
          <div className="mb-6 rounded-3xl bg-emerald-50 border border-emerald-100 p-5 text-sm text-emerald-800 space-y-2">
            <p className="font-semibold">✓ Reset email sent successfully!</p>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Please check your inbox (and spam folder) for a message containing your password reset link.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="mb-6 rounded-3xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {status !== "success" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="you@institution.com"
                disabled={status === "loading"}
                className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={status === "loading"}
              className="w-full rounded-3xl bg-indigo-600 hover:bg-indigo-700 px-4 py-3 text-sm font-semibold text-white transition duration-200 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {status === "loading" ? "Sending Link..." : "Send Reset Link"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
