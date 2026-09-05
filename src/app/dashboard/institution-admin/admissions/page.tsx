"use client"

import React, { FormEvent, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText,
  Search,
  Plus,
  Settings,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  UserCheck,
  GraduationCap,
  Calendar,
  AlertCircle,
  Building2,
  Eye,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  FileCheck,
  ArrowRight,
  Users,
  Award,
  Copy,
  Check,
  Globe,
  Link2,
} from "lucide-react"

type Option = { id: string; name: string; start_date?: string; end_date?: string }

type Application = {
  id: string
  reference_number?: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  date_of_birth?: string | null
  gender?: string | null
  nationality?: string | null
  country_of_birth?: string | null
  address?: string | null
  usi?: string | null
  passport_number?: string | null
  passport_expiry?: string | null
  visa_type?: string | null
  visa_expiry?: string | null
  english_evidence?: string | null
  application_data?: Record<string, any> | null
  status: "APPLIED" | "UNDER_REVIEW" | "APPROVED" | "OFFER_SENT" | "OFFER_ACCEPTED" | "DECLINED" | "REJECTED" | "ENROLLED"
  program_id?: string
  intake_id?: string
  course_start_date?: string
  course_end_date?: string
  created_at?: string
  programs?: Option | Option[] | null
  intakes?: Option | Option[] | null
  admission_documents?: Array<{
    id: string
    document_name: string
    file_url: string
    status: string
  }>
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

type EnrolmentOptions = {
  application: Application
  sections: Array<Option & { semester: number; program_id: string }>
  trainers: Array<Option & { email: string }>
  subjects: Array<Option & { code?: string; semester?: number }>
  timetable: Array<{
    id: string
    day: string
    period: number
    subject_id: string
    faculty_id: string
    section_id: string
  }>
  fee?: { amount: number; currency: string } | null
}

type UnitDraft = {
  subject_id: string
  planned_start: string
  planned_end: string
  trainer_id: string
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  APPLIED: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  UNDER_REVIEW: { bg: "#e0e7ff", text: "#3730a3", border: "#c7d2fe" },
  APPROVED: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
  OFFER_SENT: { bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe" },
  OFFER_ACCEPTED: { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" },
  ENROLLED: { bg: "#ccfbf1", text: "#115e59", border: "#99f6e4" },
  DECLINED: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
  REJECTED: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
}

export default function AdmissionsPage() {
  const [institution, setInstitution] = useState<{ id: string; name: string; domain?: string } | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [programs, setPrograms] = useState<Option[]>([])
  const [intakes, setIntakes] = useState<Option[]>([])
  const [fees, setFees] = useState<Array<Option & { program_id: string; intake_id: string; amount: number; currency: string }>>([])
  const [templates, setTemplates] = useState<Array<{ id: string; document_type: "OFFER" | "AGREEMENT"; name: string; version: number }>>([])
  const [copied, setCopied] = useState(false)

  const [activeTab, setActiveTab] = useState<string>("ALL")
  const [search, setSearch] = useState("")
  const [busy, setBusy] = useState(false)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string } | null>(null)

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [enrolment, setEnrolment] = useState<EnrolmentOptions | null>(null)
  const [enrolmentForm, setEnrolmentForm] = useState<{
    section_id: string
    trainer_id: string
    course_start: string
    course_end: string
    units: UnitDraft[]
    timetable: Array<{ subject_id: string; slot_id: string }>
  }>({ section_id: "", trainer_id: "", course_start: "", course_end: "", units: [], timetable: [] })
  const [enrolmentError, setEnrolmentError] = useState("")

  // New Application Form
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    program_id: "",
    intake_id: "",
    fee_configuration_id: "",
  })

  // Fee & Template Config Drafts
  const [feeDraft, setFeeDraft] = useState({ program_id: "", intake_id: "", amount: "", currency: "AUD" })
  const [templateDraft, setTemplateDraft] = useState({
    document_type: "OFFER" as "OFFER" | "AGREEMENT",
    name: "",
    body: "",
    merge_fields: "student_name,qualification,intake_name,course_start_date,course_end_date,fee_amount,fee_currency",
  })

  async function loadData() {
    try {
      const [appsRes, configRes] = await Promise.all([
        fetch("/api/admissions"),
        fetch("/api/admissions/configuration"),
      ])

      if (appsRes.ok) {
        const json = await appsRes.json()
        setApplications(json.applications || [])
      }

      if (configRes.ok) {
        const data = await configRes.json()
        setInstitution(data.institution || null)
        setPrograms(data.programs || [])
        setIntakes(data.intakes || [])
        setFees(data.fees || [])
        setTemplates(data.templates || [])
      }
    } catch (err) {
      console.error("Failed to load admissions data:", err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Public Apply URL for this institution
  const instSlug = institution?.name
    ? institution.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    : institution?.id || ""
  const publicApplyUrl = typeof window !== "undefined" && instSlug
    ? `${window.location.origin}/apply/${instSlug}`
    : `/apply/${instSlug}`

  function handleCopyLink() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(publicApplyUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  async function handleCreateApplication(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        setIsCreateOpen(false)
        setForm({
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          program_id: "",
          intake_id: "",
          fee_configuration_id: "",
        })
        await loadData()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to create application.")
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleAction(id: string, actionName: string) {
    if (actionName === "ENROLMENT") {
      await openEnrolmentModal(id)
      return
    }

    setBusy(true)
    try {
      const endpoint =
        actionName === "OFFER"
          ? `/api/admissions/${id}/offer`
          : actionName === "ACCEPT" || actionName === "DECLINE"
          ? `/api/admissions/${id}/accept`
          : `/api/admissions/${id}`

      const method =
        actionName === "OFFER" || actionName === "ACCEPT" || actionName === "DECLINE"
          ? "POST"
          : "PATCH"

      const body =
        actionName === "ACCEPT"
          ? { decision: "accept" }
          : actionName === "DECLINE"
          ? { decision: "decline" }
          : actionName === "OFFER"
          ? undefined
          : { status: actionName }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (res.ok) {
        await loadData()
        if (selectedApp?.id === id) {
          const updated = applications.find((a) => a.id === id)
          if (updated) setSelectedApp(updated)
        }
      }
    } finally {
      setBusy(false)
    }
  }

  async function openEnrolmentModal(id: string) {
    setBusy(true)
    setEnrolmentError("")
    try {
      const res = await fetch(`/api/admissions/${id}/enrolment`)
      const data = await res.json()
      if (!res.ok) {
        setEnrolmentError(data.error || "Unable to load enrolment options")
        return
      }

      const app = data.application
      const intake = Array.isArray(app.intakes) ? app.intakes[0] : app.intakes
      const start = app.course_start_date || intake?.start_date || new Date().toISOString().split("T")[0]
      const end = app.course_end_date || intake?.end_date || new Date().toISOString().split("T")[0]

      setEnrolment(data)

      // Prepopulate sequential dates for each unit
      const subjects = data.subjects || []
      const unitDrafts: UnitDraft[] = subjects.map((sub: any, idx: number) => {
        // Divide course term into equal sequential blocks for units
        const startDateObj = new Date(start)
        const endDateObj = new Date(end)
        const totalDurationDays = Math.max(30, (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24))
        const daysPerUnit = Math.floor(totalDurationDays / Math.max(1, subjects.length))

        const unitStart = new Date(startDateObj.getTime() + idx * daysPerUnit * 24 * 60 * 60 * 1000)
        const unitEnd = new Date(startDateObj.getTime() + (idx + 1) * daysPerUnit * 24 * 60 * 60 * 1000)

        return {
          subject_id: sub.id,
          planned_start: unitStart.toISOString().split("T")[0],
          planned_end: unitEnd.toISOString().split("T")[0],
          trainer_id: "",
        }
      })

      setEnrolmentForm({
        section_id: data.sections?.[0]?.id || "",
        trainer_id: data.trainers?.[0]?.id || "",
        course_start: start,
        course_end: end,
        units: unitDrafts,
        timetable: [],
      })
    } catch (err: any) {
      setEnrolmentError(err.message || "Failed to open enrolment dialog.")
    } finally {
      setBusy(false)
    }
  }

  async function submitEnrolment(e: FormEvent) {
    e.preventDefault()
    if (
      !enrolment ||
      !enrolmentForm.section_id ||
      !enrolmentForm.trainer_id ||
      enrolmentForm.units.some((u) => !u.planned_start || !u.planned_end) ||
      enrolmentForm.timetable.length !== enrolmentForm.units.length
    ) {
      setEnrolmentError("Please select a section, trainer, valid unit dates, and a timetable slot for each unit.")
      return
    }

    setBusy(true)
    setEnrolmentError("")

    try {
      const selectedSection = enrolment.sections.find((s) => s.id === enrolmentForm.section_id)

      const res = await fetch(`/api/admissions/${enrolment.application.id}/enrolment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_id: enrolment.application.program_id,
          intake_id: enrolment.application.intake_id,
          section_id: enrolmentForm.section_id,
          trainer_id: enrolmentForm.trainer_id,
          course_start: enrolmentForm.course_start,
          course_end: enrolmentForm.course_end,
          semester: selectedSection?.semester || 1,
          units: enrolmentForm.units,
          timetable: enrolmentForm.timetable,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm enrolment.")
      }

      setEnrolment(null)
      setSelectedApp(null)
      await loadData()
    } catch (err: any) {
      setEnrolmentError(err.message || "Failed to finalize qualification enrolment.")
    } finally {
      setBusy(false)
    }
  }

  // Filter applications by search and tab
  const filtered = applications.filter((app) => {
    const matchSearch =
      `${app.first_name} ${app.last_name} ${app.email}`.toLowerCase().includes(search.toLowerCase())

    if (activeTab === "ALL") return matchSearch
    if (activeTab === "APPLIED") return matchSearch && app.status === "APPLIED"
    if (activeTab === "UNDER_REVIEW") return matchSearch && app.status === "UNDER_REVIEW"
    if (activeTab === "OFFER_SENT") return matchSearch && (app.status === "OFFER_SENT" || app.status === "APPROVED")
    if (activeTab === "OFFER_ACCEPTED") return matchSearch && app.status === "OFFER_ACCEPTED"
    if (activeTab === "ENROLLED") return matchSearch && app.status === "ENROLLED"
    return matchSearch
  })

  // Metrics
  const totalCount = applications.length
  const appliedCount = applications.filter((a) => a.status === "APPLIED").length
  const reviewCount = applications.filter((a) => a.status === "UNDER_REVIEW").length
  const offerCount = applications.filter((a) => a.status === "OFFER_SENT" || a.status === "APPROVED").length
  const acceptedCount = applications.filter((a) => a.status === "OFFER_ACCEPTED").length
  const enrolledCount = applications.filter((a) => a.status === "ENROLLED").length

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 font-['Inter',sans-serif] space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
              Admissions & Enrolment Desk
            </h1>
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-0.5 text-xs font-bold text-[#6C63FF]">
              {totalCount} Total Applicants
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review online applications, issue legally compliant offer letters, and finalize academic course enrolments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Settings className="h-4 w-4" /> Configure Fees & Letters
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-200 hover:scale-[1.02] transition-all"
          >
            <Plus className="h-4 w-4" /> New Application
          </button>
        </div>
      </div>

      {/* Dedicated Public Apply Portal Link Banner */}
      <div className="rounded-3xl border border-indigo-100/80 bg-gradient-to-r from-white via-indigo-50/25 to-purple-50/20 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-[#6C63FF] border border-indigo-100">
              <Globe className="h-3.5 w-3.5" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C63FF]">
              Public Student Admissions Portal
            </span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
            Direct Application Link for {institution?.name || "Your Institution"}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Embed this link on your official website’s <span className="font-semibold text-slate-700">"Apply Now"</span> button or marketing brochures. Prospective students who click this link are routed directly into your institution's admissions flow.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-sm px-3.5 py-2 text-xs font-mono text-slate-700 shadow-sm overflow-x-auto max-w-xs sm:max-w-sm">
            <Link2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{publicApplyUrl}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-200 hover:text-[#6C63FF]"
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy Link
                </>
              )}
            </button>

            <a
              href={publicApplyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#6C63FF] px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Preview Portal
            </a>
          </div>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        {[
          { label: "All Applicants", count: totalCount, key: "ALL", color: "#6C63FF" },
          { label: "New Applied", count: appliedCount, key: "APPLIED", color: "#d97706" },
          { label: "Under Review", count: reviewCount, key: "UNDER_REVIEW", color: "#4f46e5" },
          { label: "Offers Issued", count: offerCount, key: "OFFER_SENT", color: "#7c3aed" },
          { label: "Offer Accepted", count: acceptedCount, key: "OFFER_ACCEPTED", color: "#059669" },
          { label: "Enrolled", count: enrolledCount, key: "ENROLLED", color: "#0d9488" },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setActiveTab(m.key)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              activeTab === m.key
                ? "bg-white border-[#6C63FF] shadow-md shadow-indigo-50 ring-2 ring-indigo-100"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{m.label}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 font-['Space_Grotesk']" style={{ color: activeTab === m.key ? m.color : "#0f172a" }}>
              {m.count}
            </p>
          </button>
        ))}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs font-medium text-slate-900 outline-none focus:border-[#6C63FF]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {["ALL", "APPLIED", "UNDER_REVIEW", "OFFER_SENT", "OFFER_ACCEPTED", "ENROLLED"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === t
                  ? "bg-[#6C63FF] text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Applications Table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Applicant</th>
                <th className="py-3.5 px-4">Qualification / Intake</th>
                <th className="py-3.5 px-4">Term Dates</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((a) => {
                const program = Array.isArray(a.programs) ? a.programs[0] : a.programs
                const intake = Array.isArray(a.intakes) ? a.intakes[0] : a.intakes
                const color = statusColors[a.status] || { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" }

                return (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{a.first_name} {a.last_name}</div>
                      <div className="text-slate-400 font-medium">{a.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{program?.name || "Qualification"}</div>
                      <div className="text-slate-400">{intake?.name || "Standard Intake"}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {intake?.start_date ? `${intake.start_date} – ${intake.end_date}` : "Flexible"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className="inline-block rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider"
                        style={{ backgroundColor: color.bg, color: color.text, border: `1px solid ${color.border}` }}
                      >
                        {a.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedApp(a)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Details
                        </button>

                        {a.status === "APPLIED" && (
                          <button
                            disabled={busy}
                            onClick={() => handleAction(a.id, "UNDER_REVIEW")}
                            className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                          >
                            Start Review
                          </button>
                        )}

                        {a.status === "UNDER_REVIEW" && (
                          <button
                            disabled={busy}
                            onClick={() => handleAction(a.id, "APPROVED")}
                            className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                          >
                            Approve
                          </button>
                        )}

                        {(a.status === "APPROVED" || a.status === "UNDER_REVIEW") && (
                          <button
                            disabled={busy}
                            onClick={() => handleAction(a.id, "OFFER")}
                            className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                          >
                            <Send className="h-3 w-3" /> Issue Offer
                          </button>
                        )}

                        {a.status === "OFFER_SENT" && (
                          <button
                            disabled={busy}
                            onClick={() => handleAction(a.id, "ACCEPT")}
                            className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                          >
                            Mark Accepted
                          </button>
                        )}

                        {a.status === "OFFER_ACCEPTED" && (
                          <button
                            disabled={busy}
                            onClick={() => openEnrolmentModal(a.id)}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700"
                          >
                            <GraduationCap className="h-3.5 w-3.5" /> Finalize Enrolment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-semibold">No applications found in this category.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── APPLICATION INSPECTOR MODAL ── */}
      {selectedApp && (() => {
        const prog = Array.isArray(selectedApp.programs) ? selectedApp.programs[0] : selectedApp.programs
        const intk = Array.isArray(selectedApp.intakes) ? selectedApp.intakes[0] : selectedApp.intakes
        const color = statusColors[selectedApp.status] || { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" }
        const latestOffer = selectedApp.offer_letters?.[0]

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-4xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto border border-slate-100">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-0.5 text-xs font-mono font-bold text-slate-800">
                      {selectedApp.reference_number || selectedApp.id}
                    </span>
                    <span
                      className="rounded-full px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider"
                      style={{ backgroundColor: color.bg, color: color.text, border: `1px solid ${color.border}` }}
                    >
                      {selectedApp.status.replace("_", " ")}
                    </span>
                    {selectedApp.created_at && (
                      <span className="text-xs text-slate-400 font-medium">
                        Applied: {new Date(selectedApp.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                    {selectedApp.first_name} {selectedApp.last_name}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedApp.email} · {selectedApp.phone || "No phone provided"}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedApp(null)}
                  className="rounded-2xl p-2 text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* 1. Academic Target Information */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-[#6C63FF]" /> Academic Qualification & Intake
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Applied Qualification</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{prog?.name || "Target Qualification"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Intake Commencement</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{intk?.name || "Standard Intake"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Term Dates</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">
                      {selectedApp.course_start_date || intk?.start_date || "TBD"} – {selectedApp.course_end_date || intk?.end_date || "TBD"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Applicant Profile & Compliance */}
              {(() => {
                const appDob = selectedApp.date_of_birth || selectedApp.application_data?.date_of_birth || selectedApp.application_data?.dob || "—"
                const appGender = selectedApp.gender || selectedApp.application_data?.gender || "—"
                const appNationality = selectedApp.nationality || selectedApp.application_data?.nationality || "—"
                const appCountryOfBirth = selectedApp.country_of_birth || selectedApp.application_data?.country_of_birth || selectedApp.application_data?.countryOfBirth || "—"
                const appAddress = selectedApp.address || selectedApp.application_data?.address || "—"
                const appUsi = selectedApp.usi || selectedApp.application_data?.usi || "—"
                const appPassport = selectedApp.passport_number || selectedApp.application_data?.passport_number || "—"
                const appVisa = selectedApp.visa_type || selectedApp.application_data?.visa_type || "—"
                const appEnglish = selectedApp.english_evidence || selectedApp.application_data?.english_evidence || selectedApp.application_data?.englishEvidence || "—"

                const allDocs = (selectedApp.admission_documents && selectedApp.admission_documents.length > 0)
                  ? selectedApp.admission_documents
                  : (selectedApp.application_data?.documents && Array.isArray(selectedApp.application_data.documents))
                  ? selectedApp.application_data.documents.map((d: any, idx: number) => ({
                      id: `doc-${idx}`,
                      document_name: d.name || d.file_name || d.document_type || "Supporting Document",
                      file_url: d.file_url || d.url || null,
                      status: "UPLOADED",
                    }))
                  : []

                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Contact & Personal */}
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                          <Users className="h-4 w-4 text-indigo-600" /> Personal & Contact Details
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-slate-400 font-semibold text-[10px] uppercase">Date of Birth</p>
                            <p className="font-bold text-slate-800">{appDob}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-semibold text-[10px] uppercase">Gender</p>
                            <p className="font-bold text-slate-800 capitalize">{appGender.replace(/_/g, " ")}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-semibold text-[10px] uppercase">Nationality</p>
                            <p className="font-bold text-slate-800">{appNationality}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-semibold text-[10px] uppercase">Country of Birth</p>
                            <p className="font-bold text-slate-800">{appCountryOfBirth}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-slate-400 font-semibold text-[10px] uppercase">Residential Address</p>
                            <p className="font-bold text-slate-800">{appAddress}</p>
                          </div>
                        </div>
                      </div>

                      {/* Identification & Regulatory */}
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" /> Identification & Compliance
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-slate-400 font-semibold text-[10px] uppercase">USI Number</p>
                            <p className="font-bold font-mono text-slate-800">{appUsi}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-semibold text-[10px] uppercase">Passport / ID</p>
                            <p className="font-bold font-mono text-slate-800">{appPassport}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-semibold text-[10px] uppercase">Visa Subclass</p>
                            <p className="font-bold text-slate-800">{appVisa}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-semibold text-[10px] uppercase">English Evidence</p>
                            <p className="font-bold text-slate-800">{appEnglish}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Attached Verification Documents */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-amber-600" /> Attached Verification Documents ({allDocs.length})
                      </h3>

                      {allDocs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No verification files attached to this application record.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {allDocs.map((doc: any) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs"
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <FileText className="h-4 w-4 text-[#6C63FF] shrink-0" />
                                <span className="font-bold text-slate-800 truncate">{doc.document_name}</span>
                              </div>

                              {doc.file_url ? (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewDoc({ name: doc.document_name, url: doc.file_url })}
                                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 shadow-sm transition-all"
                                  >
                                    <Eye className="h-3 w-3" />
                                    <span>Preview</span>
                                  </button>
                                  <a
                                    href={doc.file_url}
                                    download={doc.document_name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold uppercase">Pending</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}

              {/* 4. Offer Letter & Legal Agreement (if issued) */}
              {latestOffer && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C63FF] flex items-center gap-2">
                    <FileCheck className="h-4 w-4" /> Letter of Offer & Student Enrolment Agreement
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400 font-semibold text-[10px] uppercase">Offer Status</p>
                      <p className="font-bold text-indigo-900">{latestOffer.status}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold text-[10px] uppercase">Tuition Fee</p>
                      <p className="font-bold text-slate-900">${latestOffer.course_fees?.toLocaleString()} AUD</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold text-[10px] uppercase">Signed At</p>
                      <p className="font-bold text-slate-900">
                        {latestOffer.signed_at ? new Date(latestOffer.signed_at).toLocaleString() : "Pending Applicant Signature"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold text-[10px] uppercase">Acceptance Ref</p>
                      <p className="font-bold text-slate-900 truncate">{latestOffer.acceptance_reference || "—"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Toolbar Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedApp.status === "APPLIED" && (
                    <button
                      disabled={busy}
                      onClick={() => handleAction(selectedApp.id, "UNDER_REVIEW")}
                      className="rounded-2xl bg-indigo-50 border border-indigo-200 px-5 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all shadow-sm"
                    >
                      Start Academic Review
                    </button>
                  )}

                  {selectedApp.status === "UNDER_REVIEW" && (
                    <button
                      disabled={busy}
                      onClick={() => handleAction(selectedApp.id, "APPROVED")}
                      className="rounded-2xl bg-blue-50 border border-blue-200 px-5 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all shadow-sm"
                    >
                      Approve Academic Assessment
                    </button>
                  )}

                  {(selectedApp.status === "APPROVED" || selectedApp.status === "UNDER_REVIEW") && (
                    <button
                      disabled={busy}
                      onClick={() => handleAction(selectedApp.id, "OFFER")}
                      className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:opacity-95 transition-all"
                    >
                      <Send className="h-3.5 w-3.5" /> Issue Formal Offer Letter
                    </button>
                  )}

                  {selectedApp.status === "OFFER_SENT" && (
                    <button
                      disabled={busy}
                      onClick={() => handleAction(selectedApp.id, "ACCEPT")}
                      className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-all shadow-sm"
                    >
                      Mark Offer Accepted
                    </button>
                  )}

                  {selectedApp.status === "OFFER_ACCEPTED" && (
                    <button
                      disabled={busy}
                      onClick={() => openEnrolmentModal(selectedApp.id)}
                      className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                    >
                      <GraduationCap className="h-4 w-4" /> Finalize Qualification Enrolment
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── ENROLMENT CONVERSION MODAL ── */}
      {enrolment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <form
            onSubmit={submitEnrolment}
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6"
          >
            <div className="border-b border-slate-100 pb-4 flex items-start justify-between">
              <div>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Academic Enrolment Wizard
                </span>
                <h2 className="text-2xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] mt-2">
                  Enrol {enrolment.application.first_name} {enrolment.application.last_name}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Allocate class section, primary trainer, unit dates, and timetable slots to officially activate the student account.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEnrolment(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {enrolmentError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                {enrolmentError}
              </div>
            )}

            {/* Section & Trainer Allocation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Assigned Class Cohort / Section *
                </label>
                <select
                  required
                  value={enrolmentForm.section_id}
                  onChange={(e) => setEnrolmentForm({ ...enrolmentForm, section_id: e.target.value, timetable: [] })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-900 outline-none focus:border-[#6C63FF]"
                >
                  <option value="">Select class section</option>
                  {enrolment.sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} (Semester {sec.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Lead Faculty Trainer *
                </label>
                <select
                  required
                  value={enrolmentForm.trainer_id}
                  onChange={(e) => setEnrolmentForm({ ...enrolmentForm, trainer_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-900 outline-none focus:border-[#6C63FF]"
                >
                  <option value="">Select lead trainer</option>
                  {enrolment.trainers.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.name} ({tr.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Course Start Date
                </label>
                <input
                  type="date"
                  required
                  value={enrolmentForm.course_start}
                  onChange={(e) => setEnrolmentForm({ ...enrolmentForm, course_start: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-900 outline-none focus:border-[#6C63FF]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Course End Date
                </label>
                <input
                  type="date"
                  required
                  value={enrolmentForm.course_end}
                  onChange={(e) => setEnrolmentForm({ ...enrolmentForm, course_end: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-900 outline-none focus:border-[#6C63FF]"
                />
              </div>
            </div>

            {/* Unit Dates & Timetable Mapping */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="h-4 w-4 text-[#6C63FF]" /> Enrolled Units & Timetable Schedule Allocation
              </h3>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {enrolment.subjects.map((sub, idx) => (
                  <div
                    key={sub.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{sub.code || "Unit"}</p>
                      <p className="text-[11px] text-slate-500 truncate">{sub.name}</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Start Date</span>
                      <input
                        type="date"
                        required
                        value={enrolmentForm.units[idx]?.planned_start || ""}
                        onChange={(e) => {
                          const u = [...enrolmentForm.units]
                          u[idx] = { ...u[idx], planned_start: e.target.value }
                          setEnrolmentForm({ ...enrolmentForm, units: u })
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">End Date</span>
                      <input
                        type="date"
                        required
                        value={enrolmentForm.units[idx]?.planned_end || ""}
                        onChange={(e) => {
                          const u = [...enrolmentForm.units]
                          u[idx] = { ...u[idx], planned_end: e.target.value }
                          setEnrolmentForm({ ...enrolmentForm, units: u })
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Timetable Slot</span>
                      <select
                        required
                        value={enrolmentForm.timetable.find((t) => t.subject_id === sub.id)?.slot_id || ""}
                        onChange={(e) => {
                          const t = enrolmentForm.timetable.filter((item) => item.subject_id !== sub.id)
                          t.push({ subject_id: sub.id, slot_id: e.target.value })
                          setEnrolmentForm({ ...enrolmentForm, timetable: t })
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900"
                      >
                        <option value="">Select slot</option>
                        {enrolment.timetable
                          .filter((slot) => slot.subject_id === sub.id && slot.section_id === enrolmentForm.section_id)
                          .map((slot) => (
                            <option key={slot.id} value={slot.id}>
                              {slot.day} · Period {slot.period}
                            </option>
                          ))}
                        {/* Fallback general slot if specific not mapped */}
                        <option value={sub.id}>Monday · Period 1 (Assigned)</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEnrolment(null)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-200 hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {busy ? "Finalizing Transaction…" : "Commit Enrolment & Activate Student Portal"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── CREATE APPLICATION MODAL ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateApplication}
            className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-4"
          >
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                Create New Student Application
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="First name"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#6C63FF]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Last name"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#6C63FF]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="applicant@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#6C63FF]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Phone</label>
                <input
                  type="tel"
                  placeholder="+61 400 000 000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#6C63FF]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Qualification *</label>
                <select
                  required
                  value={form.program_id}
                  onChange={(e) => setForm({ ...form, program_id: e.target.value, fee_configuration_id: "" })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#6C63FF]"
                >
                  <option value="">Select qualification</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Intake Term *</label>
                <select
                  required
                  value={form.intake_id}
                  onChange={(e) => setForm({ ...form, intake_id: e.target.value, fee_configuration_id: "" })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#6C63FF]"
                >
                  <option value="">Select intake</option>
                  {intakes.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-[#6C63FF] px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700"
              >
                {busy ? "Creating…" : "Create Application"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── DOCUMENT PREVIEW LIGHTBOX MODAL ── */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:px-6 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-[#6C63FF]" />
                <h3 className="text-sm font-bold text-slate-900 truncate max-w-lg">{previewDoc.name}</h3>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  download={previewDoc.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open / Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-4 sm:p-6 overflow-y-auto flex items-center justify-center min-h-[400px]">
              {previewDoc.url.startsWith("data:image/") || previewDoc.url.endsWith(".png") || previewDoc.url.endsWith(".jpg") || previewDoc.url.endsWith(".jpeg") ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-lg border border-slate-200"
                />
              ) : previewDoc.url.startsWith("data:application/pdf") || previewDoc.url.endsWith(".pdf") ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.name}
                  className="w-full h-[70vh] rounded-2xl border border-slate-200 bg-white shadow-lg"
                />
              ) : (
                <div className="text-center space-y-3 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md">
                  <FileText className="h-12 w-12 text-[#6C63FF] mx-auto" />
                  <h4 className="font-bold text-slate-900 text-sm">{previewDoc.name}</h4>
                  <p className="text-xs text-slate-500">
                    This file format cannot be rendered inline. Click below to download or view in a dedicated viewer.
                  </p>
                  <a
                    href={previewDoc.url}
                    download={previewDoc.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#6C63FF] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all"
                  >
                    <span>Download File</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
