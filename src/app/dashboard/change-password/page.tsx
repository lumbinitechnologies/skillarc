"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Lock, CheckCircle2 } from "lucide-react"

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setStatus("error")
      return
    }

    if (password !== confirm) {
      setError("Passwords do not match")
      setStatus("error")
      return
    }

    setStatus("loading")
    setError("")

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
        setStatus("error")
        return
      }

      setStatus("success")
      setPassword("")
      setConfirm("")
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      setStatus("error")
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)]">Change Password</h1>
        <p className="text-sm text-slate-500 mt-1">Update your password to keep your account secure.</p>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        {status === "success" && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-emerald-800">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Password updated successfully</p>
              <p className="text-emerald-700 mt-0.5">You can now use your new password next time you sign in.</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700">New Password</label>
              <div className="relative mt-2">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  disabled={status === "loading"}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-70"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Confirm New Password</label>
              <div className="relative mt-2">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  disabled={status === "loading"}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-70"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {status === "loading" ? "Updating password..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
