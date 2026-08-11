"use client"

import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_18%),linear-gradient(180deg,#f8fbff,#eff6ff)] py-14 px-4 sm:px-6 lg:px-10">
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 rounded-full bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.22),_transparent_54%)] blur-3xl" />

        <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_32px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="grid gap-8 lg:grid-cols-[1.35fr_0.9fr] lg:items-center">

            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-700">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                Academic LMS, redesigned
              </span>

              <h1 className="text-5xl font-black tracking-[-0.05em] text-slate-950 sm:text-6xl">
                Run academic operations with premium clarity.
              </h1>

              <p className="max-w-2xl text-base leading-8 text-slate-600">
                Build timetables, manage faculty, capture attendance, and deliver smooth student workflows in one elegant platform.
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => router.push("/signup")}
                  className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Get started
                </button>
                <button
                  onClick={() => router.push("/auth/login")}
                  className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                >
                  Sign in
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-slate-950/95 p-8 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
              <div className="space-y-5">
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-100">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-200">🚀</span>
                  Designed for education teams
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl bg-slate-900/80 p-5">
                    <p className="text-sm font-semibold text-slate-100">Timetable Builder</p>
                    <p className="mt-3 text-sm text-slate-400">Smart conflict checks and an easy publish workflow for schedules.</p>
                  </div>

                  <div className="rounded-3xl bg-slate-900/80 p-5">
                    <p className="text-sm font-semibold text-slate-100">Attendance analytics</p>
                    <p className="mt-3 text-sm text-slate-400">Auto capture presence for meetings and sessions, then review participation stats.</p>
                  </div>

                  <div className="rounded-3xl bg-slate-900/80 p-5">
                    <p className="text-sm font-semibold text-slate-100">Student experience</p>
                    <p className="mt-3 text-sm text-slate-400">Clear schedules, subject resources, and progress reports for learners.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Smart scheduling",
                details: "Drag-and-drop timetable creation with conflict alerts.",
              },
              {
                title: "Meeting attendance",
                details: "Track who joined and how long they stayed in live sessions.",
              },
              {
                title: "Intuitive reporting",
                details: "Analytics for students, faculty and institutional operations.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.details}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
