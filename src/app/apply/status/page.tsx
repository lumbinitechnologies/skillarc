"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  GraduationCap,
  Search,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  AlertCircle,
  Building2,
  Calendar,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Download,
  ArrowUpRight,
  Sparkles,
  Check,
  Send,
} from "lucide-react"
import { SignaturePad } from "@/components/admissions/signature-pad"

type ApplicationData = {
  id: string
  reference_number?: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  status: "APPLIED" | "UNDER_REVIEW" | "APPROVED" | "OFFER_SENT" | "OFFER_ACCEPTED" | "DECLINED" | "ENROLLED"
  course_start_date: string | null
  course_end_date: string | null
  created_at: string
  institution?: { id: string; name: string; domain?: string } | null
  program?: { id: string; name: string } | null
  intake?: { id: string; name: string; start_date: string; end_date: string } | null
  offer_letters?: Array<{
    id: string
    version: number
    status: string
    course_fees: number
    term_start: string
    term_end: string
    rendered_html?: string | null
    signed_at?: string | null
    acceptance_reference?: string | null
  }>
}

function StatusContent() {
  const searchParams = useSearchParams()
  const initialId = searchParams.get("id") || ""

  const [lookupQuery, setLookupQuery] = useState(initialId)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [application, setApplication] = useState<ApplicationData | null>(null)

  // E-Signature state
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [isAgreed, setIsAgreed] = useState(false)
  const [signing, setSigning] = useState(false)
  const [decisionMsg, setDecisionMsg] = useState("")

  async function fetchStatus(idOrEmail: string) {
    if (!idOrEmail.trim()) return
    setLoading(true)
    setErrorMsg("")
    setDecisionMsg("")

    try {
      const isEmail = idOrEmail.includes("@")
      const param = isEmail ? `email=${encodeURIComponent(idOrEmail.trim())}` : `id=${encodeURIComponent(idOrEmail.trim())}`
      const res = await fetch(`/api/admissions/public-status?${param}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Application not found.")
      }

      setApplication(data.application)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load application status.")
      setApplication(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialId) {
      fetchStatus(initialId)
    }
  }, [initialId])

  async function handleAcceptOffer(decision: "accept" | "decline") {
    if (!application) return
    if (decision === "accept" && (!signatureData || !isAgreed)) {
      setErrorMsg("Please provide your digital signature and check the agreement box before accepting.")
      return
    }

    setSigning(true)
    setErrorMsg("")

    try {
      const latestOffer = application.offer_letters?.[0]
      const res = await fetch("/api/admissions/public-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: application.id,
          applicationId: application.id,
          decision,
          signature_data_url: signatureData,
          signatureDataUrl: signatureData,
          signer_name: `${application.first_name} ${application.last_name}`,
          offer_letter_id: latestOffer?.id,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to process decision.")
      }

      setDecisionMsg(
        decision === "accept"
          ? `Offer successfully accepted! Acceptance Reference: ${data.acceptance_reference || "ACC-2026-CONFIRMED"}`
          : "Application has been updated as declined."
      )

      // Refresh status
      await fetchStatus(application.id)
    } catch (err: any) {
      setErrorMsg(err.message || "Error accepting offer.")
    } finally {
      setSigning(false)
    }
  }

  const statusSteps = [
    { key: "APPLIED", label: "Application Received" },
    { key: "UNDER_REVIEW", label: "Academic Review" },
    { key: "APPROVED", label: "Assessment Approved" },
    { key: "OFFER_SENT", label: "Offer Issued" },
    { key: "OFFER_ACCEPTED", label: "Offer Accepted" },
    { key: "ENROLLED", label: "Officially Enrolled" },
  ]

  const currentStepIdx = statusSteps.findIndex((s) => s.key === application?.status)
  const latestOffer = application?.offer_letters?.[0]

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800;900&family=Space+Mono:wght@400;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen bg-[#0B132B] text-[#EFEAD8] font-['Plus_Jakarta_Sans',sans-serif] selection:bg-[#E57D37] selection:text-[#EFEAD8] relative overflow-hidden">
        {/* Background Glowing Ambient Orbs */}
        <div className="fixed inset-0 pointer-events-none opacity-30">
          <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-[#6C63FF] to-[#E57D37] blur-[140px]" />
          <div className="absolute top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-[#00C2A8] to-[#14234B] blur-[140px]" />
        </div>

        {/* Top Branded Navbar */}
        <header className="sticky top-0 z-40 border-b border-[#3A6DAF]/20 bg-[#0B132B]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 lg:px-12 py-4">
            <Link href="/apply" className="group flex items-center gap-3">
              <img
                src="/skillarc_logo.svg"
                alt="SkillArc Logo"
                className="h-9 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
              />
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#3A6DAF]/30 bg-[#14234B]/60 text-[#EAAD62] font-['Space_Mono',monospace] text-[10px] uppercase tracking-widest font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C2A8] animate-pulse" />
                Live Status & E-Sign
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/apply"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#3A6DAF]/40 bg-[#14234B]/60 hover:bg-[#14234B] text-[#ECDFCB] hover:border-[#EAAD62] hover:text-[#EAAD62] backdrop-blur-md transition-all font-['Space_Mono',monospace] text-xs uppercase tracking-wider font-bold"
              >
                <span>Browse Colleges</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Main Tracker Body */}
        <main className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6 space-y-8">
          {/* Lookup Input Card */}
          <div className="rounded-3xl border border-[#3A6DAF]/30 bg-[#14234B]/70 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest font-['Space_Mono',monospace] text-[#EAAD62]">
                Application Tracking
              </span>
              <h1 className="text-2xl font-black font-['Space_Grotesk',sans-serif] text-[#EFEAD8]">
                Find Your Admission File
              </h1>
              <p className="text-xs text-slate-300 font-sans">
                Enter your Application Reference Code (e.g. <span className="font-mono text-[#EAAD62]">APP-2026-XXXX</span>) or your registered email address.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                fetchStatus(lookupQuery)
              }}
              className="flex flex-col sm:flex-row gap-3 pt-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="Enter Reference Code (APP-2026-...) or email"
                  className="w-full rounded-2xl border border-[#3A6DAF]/40 bg-[#0B132B]/70 py-3 pl-11 pr-4 text-xs font-['Space_Mono',monospace] text-[#EFEAD8] placeholder:text-slate-500 outline-none focus:border-[#E57D37] focus:ring-2 focus:ring-[#E57D37]/20"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E57D37] to-[#FF5500] px-6 py-3 text-xs font-bold text-[#EFEAD8] font-['Space_Grotesk',sans-serif] uppercase tracking-wider shadow-lg shadow-[#FF5500]/25 hover:opacity-95 disabled:opacity-50 transition-all shrink-0"
              >
                {loading ? <Clock className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span>Track Application</span>
              </button>
            </form>

            {errorMsg && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs font-semibold text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {decisionMsg && (
              <div className="rounded-2xl border border-[#00C2A8]/40 bg-[#00C2A8]/10 p-4 text-xs font-semibold text-[#00C2A8] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00C2A8]" />
                <span>{decisionMsg}</span>
              </div>
            )}
          </div>

          {/* Application Details & Progress */}
          {application && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Application Summary Header */}
              <div className="rounded-3xl border border-[#3A6DAF]/30 bg-gradient-to-r from-[#14234B]/90 via-[#0B132B]/90 to-[#14234B]/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-[#0B132B] border border-[#3A6DAF]/40 px-3 py-0.5 text-[10px] font-['Space_Mono',monospace] font-bold text-[#EAAD62] uppercase tracking-wider">
                      {application.reference_number || application.id}
                    </span>
                    <span className="rounded-full bg-[#00C2A8]/20 border border-[#00C2A8]/40 px-3 py-0.5 text-[10px] font-['Space_Mono',monospace] font-bold text-[#00C2A8] uppercase tracking-wider">
                      {application.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black font-['Space_Grotesk',sans-serif] text-[#EFEAD8]">
                    {application.first_name} {application.last_name}
                  </h2>

                  <p className="text-xs text-slate-300 font-sans">
                    Enrolling in <span className="font-bold text-[#EFEAD8]">{application.program?.name}</span> at{" "}
                    <span className="font-bold text-[#EFEAD8]">{application.institution?.name}</span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-[#3A6DAF]/30 bg-[#0B132B]/80 text-xs font-['Space_Mono',monospace] space-y-1 shrink-0">
                  <div className="text-slate-400">Intake Term:</div>
                  <div className="font-bold text-[#EAAD62]">{application.intake?.name || "Standard Intake"}</div>
                  <div className="text-[10px] text-slate-400">
                    Commencing: {application.course_start_date || application.intake?.start_date || "To be confirmed"}
                  </div>
                </div>
              </div>

              {/* Lifecycle Progress Flow */}
              <div className="rounded-3xl border border-[#3A6DAF]/30 bg-[#14234B]/70 p-6 backdrop-blur-xl shadow-xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest font-['Space_Mono',monospace] text-[#EAAD62]">
                  Admission Progress Pipeline
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {statusSteps.map((step, idx) => {
                    const isDone = currentStepIdx >= idx
                    const isCurrent = currentStepIdx === idx

                    return (
                      <div
                        key={step.key}
                        className={`p-3.5 rounded-2xl border transition-all text-center space-y-1.5 ${
                          isCurrent
                            ? "border-[#E57D37] bg-[#E57D37]/10 ring-1 ring-[#E57D37] shadow-lg shadow-[#E57D37]/15"
                            : isDone
                            ? "border-[#00C2A8]/40 bg-[#00C2A8]/10 text-[#00C2A8]"
                            : "border-[#3A6DAF]/20 bg-[#0B132B]/40 text-slate-500"
                        }`}
                      >
                        <div
                          className={`mx-auto flex h-7 w-7 items-center justify-center rounded-xl text-xs font-bold font-['Space_Mono',monospace] ${
                            isCurrent
                              ? "bg-gradient-to-tr from-[#E57D37] to-[#FF5500] text-[#EFEAD8]"
                              : isDone
                              ? "bg-[#00C2A8]/20 text-[#00C2A8]"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          {isDone ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                        </div>
                        <p
                          className={`text-[10px] font-bold font-['Space_Grotesk',sans-serif] uppercase tracking-wider ${
                            isCurrent
                              ? "text-[#EFEAD8]"
                              : isDone
                              ? "text-[#00C2A8]"
                              : "text-slate-500"
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Offer Letter & Digital Acceptance Section */}
              {latestOffer && (
                <div className="rounded-3xl border border-[#3A6DAF]/30 bg-[#14234B]/70 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3A6DAF]/20 pb-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest font-['Space_Mono',monospace] text-[#00C2A8]">
                        Official Legal Document
                      </span>
                      <h3 className="text-xl font-black font-['Space_Grotesk',sans-serif] text-[#EFEAD8]">
                        Formal Letter of Offer & Enrolment Agreement
                      </h3>
                      <p className="text-xs text-slate-300 font-sans">
                        Issued by the Admissions Directorate of {application.institution?.name}.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#3A6DAF]/40 bg-[#0B132B]/60 hover:bg-[#0B132B] text-slate-300 hover:text-[#EFEAD8] text-xs font-bold font-['Space_Grotesk',sans-serif] uppercase tracking-wider transition-all"
                      >
                        <Download className="h-3.5 w-3.5" /> Print / Save PDF
                      </button>
                    </div>
                  </div>

                  {/* Rendered Offer Document in Clean Viewport */}
                  <div className="rounded-2xl border border-slate-700 bg-white p-6 sm:p-10 text-slate-900 overflow-y-auto max-h-[500px] shadow-2xl font-serif">
                    {latestOffer.rendered_html ? (
                      <div
                        className="prose max-w-none text-xs leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: latestOffer.rendered_html }}
                      />
                    ) : (
                      <div className="space-y-4 text-xs font-sans text-slate-800">
                        <div className="border-b pb-4 flex justify-between">
                          <div>
                            <h2 className="text-lg font-bold text-slate-900">{application.institution?.name}</h2>
                            <p className="text-slate-500">Letter of Offer & Student Agreement</p>
                          </div>
                          <div className="text-right font-mono text-slate-500">
                            Ref: {application.id}
                          </div>
                        </div>
                        <p>Dear {application.first_name} {application.last_name},</p>
                        <p>
                          We are pleased to offer you a place in <strong>{application.program?.name}</strong> commencing on <strong>{application.course_start_date || "the specified intake date"}</strong>.
                        </p>
                        <p>
                          Total Tuition & Enrolment Fees: <strong>${latestOffer.course_fees?.toLocaleString()} AUD</strong>
                        </p>
                        <p>
                          To accept this offer, please complete the digital signature declaration below.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* E-Signature & Decision Form */}
                  {application.status === "OFFER_SENT" && (
                    <div className="space-y-6 pt-4 border-t border-[#3A6DAF]/20">
                      <SignaturePad
                        signerName={`${application.first_name} ${application.last_name}`}
                        onSignatureChange={(dataUrl, agreed) => {
                          setSignatureData(dataUrl)
                          setIsAgreed(agreed)
                        }}
                      />

                      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          disabled={signing}
                          onClick={() => handleAcceptOffer("decline")}
                          className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-bold font-['Space_Grotesk',sans-serif] uppercase tracking-wider transition-all"
                        >
                          Decline Offer
                        </button>

                        <button
                          type="button"
                          disabled={signing || !signatureData || !isAgreed}
                          onClick={() => handleAcceptOffer("accept")}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#00C2A8] to-[#059669] text-[#0B132B] text-xs font-black font-['Space_Grotesk',sans-serif] uppercase tracking-widest shadow-lg shadow-[#00C2A8]/25 hover:opacity-95 disabled:opacity-50 transition-all"
                        >
                          {signing ? (
                            <span>Executing Legal Acceptance...</span>
                          ) : (
                            <>
                              <span>Accept & Sign Agreement</span>
                              <Send className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Already Accepted Confirmation */}
                  {(application.status === "OFFER_ACCEPTED" || application.status === "ENROLLED") && (
                    <div className="rounded-2xl border border-[#00C2A8]/40 bg-[#00C2A8]/10 p-5 flex items-center gap-3 text-xs text-[#00C2A8]">
                      <CheckCircle2 className="h-6 w-6 shrink-0 text-[#00C2A8]" />
                      <div className="space-y-0.5 font-sans">
                        <p className="font-bold text-sm text-[#00C2A8]">Offer Legally Accepted & Executed</p>
                        <p className="text-slate-300">
                          Your digital acceptance is on file. The institution registrar will finalize your student portal credentials shortly.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </main>
      </div>
    </>
  )
}

export default function ApplicationStatusPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B132B] text-[#EFEAD8] flex items-center justify-center font-mono text-xs">Loading Application Tracker...</div>}>
      <StatusContent />
    </Suspense>
  )
}
