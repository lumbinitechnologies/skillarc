"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { loginAction } from "@/app/actions/auth"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const router = useRouter()

  async function handleLogin() {
    setError("")
    setLoading(true)

    try {
      const result = await loginAction(email, password)

      if (result?.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      router.push("/dashboard")
    } catch (err) {
      console.error("Login error:", err)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.08),_transparent_20%),linear-gradient(180deg,#f8fbff,#eff6ff)] flex items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl grid-cols-1 gap-8 overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_32px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:grid-cols-[1.2fr_0.8fr]">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-600 p-10 text-white">
          <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),_transparent_55%)]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div>
              <div className="mb-8 flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white">
                  SkillArc Platform
                </span>
              </div>
              <h2 className="text-3xl font-black tracking-[-0.04em] text-white">Academic Operations, simplified.</h2>
              <p className="mt-4 max-w-sm text-sm leading-7 text-slate-100/90">Manage timetables, faculty workloads, and student schedules with a premium academic dashboard experience.</p>
            </div>
            <div className="space-y-4 rounded-[26px] bg-white/10 p-6 backdrop-blur">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">Ready for impact</div>
              <div className="space-y-3">
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-sm font-semibold text-white">Fast login</p>
                  <p className="mt-2 text-sm text-slate-200/90">Secure access with clear sign-in flow.</p>
                </div>
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-sm font-semibold text-white">Educational focus</p>
                  <p className="mt-2 text-sm text-slate-200/90">Designed around classrooms, schedules, and attendance.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-10">
          <div className="mb-8 flex justify-center px-1">
            <img src="/skillarc_logo.svg" alt="SkillArc Logo" className="h-24 w-24 object-contain transition-transform duration-200 hover:scale-[1.03]" />
          </div>
          <div className="mb-8 space-y-3">
            <h1 className="text-3xl font-black text-slate-950">Sign in to your account</h1>
            <p className="text-sm text-slate-500">Enter your email and password to sign in.</p>
          </div>
          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Email address</label>
              <input
                type="email"
                placeholder="you@institution.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => router.push("/auth/forgot-password")}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="mt-10 inline-flex w-full cursor-pointer items-center justify-center rounded-3xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  )
}
