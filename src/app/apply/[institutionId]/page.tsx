"use client"

import React, { useState, useEffect, use } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  GraduationCap,
  Building2,
  Calendar,
  User,
  Mail,
  Phone,
  FileText,
  Upload,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Shield,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Award,
  Globe,
  Lock,
  ArrowUpRight,
  Check,
} from "lucide-react"

type Institution = { id: string; name: string; domain?: string }
type Program = { id: string; name: string; department_id?: string; institution_id: string }
type Intake = { id: string; name: string; start_date: string; end_date: string; institution_id: string }

export default function InstitutionApplyPage({
  params,
}: {
  params: Promise<{ institutionId: string }>
}) {
  const resolvedParams = use(params)
  const instSlugOrId = resolvedParams.institutionId

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [intakes, setIntakes] = useState<Intake[]>([])

  // Form State
  const [selectedProgramId, setSelectedProgramId] = useState("")
  const [selectedIntakeId, setSelectedIntakeId] = useState("")

  // Personal Info
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [dob, setDob] = useState("")
  const [gender, setGender] = useState("prefer_not_to_say")
  const [nationality, setNationality] = useState("Australian")
  const [countryOfBirth, setCountryOfBirth] = useState("Australia")
  const [address, setAddress] = useState("")

  // Identification & Compliance
  const [usi, setUsi] = useState("")
  const [passportNumber, setPassportNumber] = useState("")
  const [passportExpiry, setPassportExpiry] = useState("")
  const [visaType, setVisaType] = useState("Student Visa (Subclass 500)")
  const [visaExpiry, setVisaExpiry] = useState("")
  const [englishEvidence, setEnglishEvidence] = useState("IELTS")

  // Documents
  type DocumentItem = {
    id: string
    name: string
    type: string
    required: boolean
    fileName?: string
    fileSize?: string
    fileData?: string
    uploadedAt?: string
  }

  const [documents, setDocuments] = useState<DocumentItem[]>([
    { id: "doc-1", name: "Passport / Photo Identification", type: "ID_DOCUMENT", required: true },
    { id: "doc-2", name: "Academic Transcripts & Certificates", type: "ACADEMIC_TRANSCRIPT", required: true },
    { id: "doc-3", name: "English Language Proficiency Evidence (IELTS/PTE)", type: "ENGLISH_TEST", required: false },
    { id: "doc-4", name: "Resume / Curriculum Vitae", type: "RESUME_CV", required: false },
  ])

  function handleFileSelected(docId: string, file: File) {
    if (!file) return
    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(file.size / 1024)} KB`

    const reader = new FileReader()
    reader.onload = () => {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                fileName: file.name,
                fileSize: sizeStr,
                fileData: reader.result as string,
                uploadedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              }
            : d
        )
      )
    }
    reader.readAsDataURL(file)
  }

  function handleRemoveFile(docId: string) {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId
          ? { ...d, fileName: undefined, fileSize: undefined, fileData: undefined, uploadedAt: undefined }
          : d
      )
    )
  }

  function handleAddCustomDocument() {
    const customId = `custom-doc-${Date.now()}`
    setDocuments((prev) => [
      ...prev,
      {
        id: customId,
        name: "Additional Supporting Document",
        type: "SUPPORTING_DOCUMENT",
        required: false,
      },
    ])
  }

  // Result state
  const [submittedApp, setSubmittedApp] = useState<{
    referenceCode: string
    applicationId: string
    program_name: string
    intake_name: string
  } | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  // Load Institution-Specific Meta
  useEffect(() => {
    async function loadMeta() {
      try {
        setLoading(true)
        const res = await fetch(`/api/admissions/public-apply?institution_slug=${encodeURIComponent(instSlugOrId)}`)
        const data = await res.json()

        if (res.ok) {
          const target = data.targetInstitution || (data.institutions && data.institutions[0])
          setInstitution(target || null)
          setPrograms(data.programs || [])
          setIntakes(data.intakes || [])

          if (data.programs?.length > 0) {
            setSelectedProgramId(data.programs[0].id)
          }
          if (data.intakes?.length > 0) {
            setSelectedIntakeId(data.intakes[0].id)
          }
        }
      } catch (err) {
        console.error("Failed to load admissions setup:", err)
      } finally {
        setLoading(false)
      }
    }
    loadMeta()
  }, [instSlugOrId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg("")

    try {
      const payload = {
        institution_id: institution?.id,
        institution_slug: instSlugOrId,
        program_id: selectedProgramId,
        intake_id: selectedIntakeId || undefined,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        date_of_birth: dob,
        gender,
        nationality,
        country_of_birth: countryOfBirth,
        address,
        usi,
        passport_number: passportNumber,
        passport_expiry: passportExpiry,
        visa_type: visaType,
        visa_expiry: visaExpiry,
        english_evidence: englishEvidence,
        documents: documents
          .filter((d) => d.fileName)
          .map((d) => ({
            name: d.name,
            document_type: d.type,
            file_name: d.fileName,
            file_url: d.fileData || `/uploads/admissions/${d.type.toLowerCase()}.pdf`,
          })),
      }

      const res = await fetch("/api/admissions/public-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application.")
      }

      setSubmittedApp({
        referenceCode: data.referenceCode,
        applicationId: data.applicationId,
        program_name: data.application.program_name,
        intake_name: data.application.intake_name,
      })
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while submitting your application.")
    } finally {
      setSubmitting(false)
    }
  }

  const steps = [
    { num: 1, label: "Course Selection" },
    { num: 2, label: "Personal Details" },
    { num: 3, label: "Compliance & ID" },
    { num: 4, label: "Documents" },
    { num: 5, label: "Review & Submit" },
  ]

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
                <span className="w-1.5 h-1.5 rounded-full bg-[#E57D37] animate-pulse" />
                Dedicated Application Portal
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/apply/status"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#3A6DAF]/40 bg-[#14234B]/60 hover:bg-[#14234B] text-[#ECDFCB] hover:border-[#EAAD62] hover:text-[#EAAD62] backdrop-blur-md transition-all font-['Space_Mono',monospace] text-xs uppercase tracking-wider font-bold"
              >
                <span>Track Application</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6 space-y-8">
          {/* Institution Verified Header Banner */}
          <div className="rounded-3xl border border-[#3A6DAF]/30 bg-gradient-to-r from-[#14234B]/90 via-[#0B132B]/90 to-[#14234B]/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#E57D37] to-[#FF5500] text-[#EFEAD8] shadow-lg shadow-[#E57D37]/30 text-2xl font-black font-['Space_Grotesk',sans-serif]">
                {institution?.name?.charAt(0) || "A"}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded-full bg-[#0B132B] border border-[#3A6DAF]/40 px-2.5 py-0.5 text-[10px] font-['Space_Mono',monospace] font-bold text-[#00C2A8] uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Official Enrolment Portal
                  </span>
                  {institution?.domain && (
                    <span className="text-xs text-slate-400 font-['Space_Mono',monospace]">
                      {institution.domain}
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-black font-['Space_Grotesk',sans-serif] text-[#EFEAD8]">
                  {institution?.name || "Official Institution Application"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-[#3A6DAF]/30 bg-[#0B132B]/80 px-4 py-2 text-xs font-['Space_Mono',monospace] text-[#EAAD62] shrink-0">
              <Lock className="h-3.5 w-3.5 text-[#E57D37]" />
              <span>Direct Encrypted Gateway</span>
            </div>
          </div>

          {/* Success Screen after Submission */}
          {submittedApp ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl border border-[#00C2A8]/40 bg-[#14234B]/80 p-8 sm:p-12 backdrop-blur-xl text-center space-y-6 shadow-2xl"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00C2A8]/20 text-[#00C2A8] border border-[#00C2A8]/40 shadow-lg shadow-[#00C2A8]/10">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <span className="font-['Space_Mono',monospace] text-xs uppercase tracking-widest text-[#00C2A8] font-bold">
                  Application Submitted Successfully
                </span>
                <h2 className="text-2xl sm:text-3xl font-black font-['Space_Grotesk',sans-serif] text-[#EFEAD8]">
                  Welcome to {institution?.name || "the College"}!
                </h2>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  Your admission file has been logged in the institution's Admissions Desk. Keep your reference code safe to track your review status and sign your upcoming offer letter.
                </p>
              </div>

              {/* Reference Box */}
              <div className="max-w-md mx-auto rounded-2xl border border-[#3A6DAF]/40 bg-[#0B132B]/80 p-5 space-y-2 shadow-inner">
                <p className="text-[10px] font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-[#EAAD62]">
                  Official Application Reference Code
                </p>
                <p className="text-2xl font-black font-['Space_Mono',monospace] text-[#EFEAD8] tracking-widest">
                  {submittedApp.referenceCode}
                </p>
                <p className="text-[11px] text-slate-400 font-sans">
                  Applied for: <span className="font-semibold text-[#EFEAD8]">{submittedApp.program_name}</span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  href={`/apply/status?id=${encodeURIComponent(submittedApp.referenceCode)}`}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E57D37] to-[#FF5500] px-6 py-3.5 text-xs font-bold text-[#EFEAD8] shadow-lg shadow-[#FF5500]/25 hover:opacity-95 font-['Space_Grotesk',sans-serif] uppercase tracking-wider"
                >
                  <span>Track Status & Sign Offer</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/apply"
                  className="w-full sm:w-auto rounded-2xl border border-[#3A6DAF]/40 bg-[#14234B]/60 hover:bg-[#14234B] px-6 py-3.5 text-xs font-bold text-slate-300 hover:text-[#EFEAD8] font-['Space_Grotesk',sans-serif] uppercase tracking-wider transition-all"
                >
                  Return to Admissions Hub
                </Link>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Step Progress Tracker */}
              <div className="rounded-3xl border border-[#3A6DAF]/30 bg-[#14234B]/70 p-4 sm:p-5 backdrop-blur-xl shadow-xl">
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 sm:pb-0">
                  {steps.map((s) => (
                    <div
                      key={s.num}
                      onClick={() => s.num < step && setStep(s.num)}
                      className={`flex items-center gap-2 cursor-pointer transition-all ${
                        step === s.num
                          ? "text-[#E57D37]"
                          : step > s.num
                          ? "text-[#00C2A8]"
                          : "text-slate-500"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-xl font-['Space_Mono',monospace] text-xs font-bold transition-all ${
                          step === s.num
                            ? "bg-gradient-to-tr from-[#E57D37] to-[#FF5500] text-[#EFEAD8] shadow-md shadow-[#E57D37]/30"
                            : step > s.num
                            ? "bg-[#00C2A8]/20 border border-[#00C2A8]/40 text-[#00C2A8]"
                            : "border border-[#3A6DAF]/30 bg-[#0B132B]/60 text-slate-500"
                        }`}
                      >
                        {step > s.num ? <Check className="h-4 w-4" /> : s.num}
                      </div>
                      <span className="hidden sm:inline text-xs font-bold font-['Space_Grotesk',sans-serif] uppercase tracking-wider whitespace-nowrap">
                        {s.label}
                      </span>
                      {s.num < steps.length && (
                        <div className="hidden lg:block h-0.5 w-6 bg-[#3A6DAF]/30" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Application Form Wizard */}
              <form onSubmit={handleSubmit} className="rounded-3xl border border-[#3A6DAF]/30 bg-[#14234B]/70 p-6 sm:p-10 backdrop-blur-xl shadow-2xl space-y-8">
                {errorMsg && (
                  <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs font-semibold text-rose-300 flex items-center gap-2">
                    <Shield className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* STEP 1: Program & Intake Selection */}
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="border-b border-[#3A6DAF]/20 pb-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest font-['Space_Mono',monospace] text-[#EAAD62]">
                        Step 01 / 05
                      </span>
                      <h2 className="text-xl font-black font-['Space_Grotesk',sans-serif] text-[#EFEAD8] mt-0.5">
                        Select Academic Qualification & Intake Term
                      </h2>
                      <p className="text-xs text-slate-300 mt-1">
                        Choose your primary qualification and preferred commencement period.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-slate-300 mb-2">
                          Available Programs at {institution?.name || "this College"} *
                        </label>
                        {programs.length === 0 ? (
                          <div className="p-4 rounded-2xl bg-[#0B132B]/60 border border-[#3A6DAF]/30 text-xs text-slate-400">
                            No active programs currently open for direct admissions.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {programs.map((p) => (
                              <div
                                key={p.id}
                                onClick={() => setSelectedProgramId(p.id)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                                  selectedProgramId === p.id
                                    ? "border-[#E57D37] bg-[#E57D37]/10 shadow-lg shadow-[#E57D37]/10 ring-1 ring-[#E57D37]"
                                    : "border-[#3A6DAF]/30 bg-[#0B132B]/60 hover:border-[#EAAD62]/60"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-sm text-[#EFEAD8] font-['Space_Grotesk',sans-serif]">
                                    {p.name}
                                  </span>
                                  {selectedProgramId === p.id && (
                                    <CheckCircle2 className="h-4 w-4 text-[#E57D37]" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {intakes.length > 0 && (
                        <div className="pt-2">
                          <label className="block text-xs font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-slate-300 mb-2">
                            Select Commencement Intake *
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {intakes.map((intake) => (
                              <div
                                key={intake.id}
                                onClick={() => setSelectedIntakeId(intake.id)}
                                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                                  selectedIntakeId === intake.id
                                    ? "border-[#E57D37] bg-[#E57D37]/10 ring-1 ring-[#E57D37]"
                                    : "border-[#3A6DAF]/30 bg-[#0B132B]/60 hover:border-[#EAAD62]/60"
                                }`}
                              >
                                <div className="font-bold text-xs text-[#EFEAD8] font-['Space_Grotesk',sans-serif]">
                                  {intake.name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-['Space_Mono',monospace] mt-1">
                                  Starts: {intake.start_date}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Personal & Contact Information */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="border-b border-[#3A6DAF]/20 pb-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest font-['Space_Mono',monospace] text-[#EAAD62]">
                        Step 02 / 05
                      </span>
                      <h2 className="text-xl font-black font-['Space_Grotesk',sans-serif] text-[#EFEAD8] mt-0.5">
                        Applicant Personal & Contact Information
                      </h2>
                      <p className="text-xs text-slate-300 mt-1">
                        Please provide your legal name matching your passport or primary identification.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-slate-300 mb-1.5">
                          First / Given Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="e.g. Alex"
                          className="w-full rounded-2xl border border-[#3A6DAF]/40 bg-[#0B132B]/60 p-3.5 text-xs text-[#EFEAD8] placeholder:text-slate-500 outline-none focus:border-[#E57D37] focus:ring-2 focus:ring-[#E57D37]/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-slate-300 mb-1.5">
                          Last / Family Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="e.g. Morgan"
                          className="w-full rounded-2xl border border-[#3A6DAF]/40 bg-[#0B132B]/60 p-3.5 text-xs text-[#EFEAD8] placeholder:text-slate-500 outline-none focus:border-[#E57D37] focus:ring-2 focus:ring-[#E57D37]/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-slate-300 mb-1.5">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="alex.morgan@example.com"
                          className="w-full rounded-2xl border border-[#3A6DAF]/40 bg-[#0B132B]/60 p-3.5 text-xs text-[#EFEAD8] placeholder:text-slate-500 outline-none focus:border-[#E57D37] focus:ring-2 focus:ring-[#E57D37]/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-slate-300 mb-1.5">
                          Phone / Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+61 400 000 000"
                          className="w-full rounded-2xl border border-[#3A6DAF]/40 bg-[#0B132B]/60 p-3.5 text-xs text-[#EFEAD8] placeholder:text-slate-500 outline-none focus:border-[#E57D37] focus:ring-2 focus:ring-[#E57D37]/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-slate-300 mb-1.5">
                          Date of Birth *
                        </label>
                        <input
                          type="date"
                          required
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full rounded-2xl border border-[#3A6DAF]/40 bg-[#0B132B]/60 p-3.5 text-xs text-[#EFEAD8] outline-none focus:border-[#E57D37] focus:ring-2 focus:ring-[#E57D37]/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-slate-300 mb-1.5">
                          Gender
                        </label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full rounded-2xl border border-[#3A6DAF]/40 bg-[#0B132B]/60 p-3.5 text-xs text-[#EFEAD8] outline-none focus:border-[#E57D37]"
                        >
                          <option value="male" className="bg-[#0B132B]">Male</option>
                          <option value="female" className="bg-[#0B132B]">Female</option>
                          <option value="non_binary" className="bg-[#0B132B]">Non-binary</option>
                          <option value="prefer_not_to_say" className="bg-[#0B132B]">Prefer not to say</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-slate-300 mb-1.5">
                          Residential Address *
                        </label>
                        <input
                          type="text"
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Street Address, City, State, Postcode"
                          className="w-full rounded-2xl border border-[#3A6DAF]/40 bg-[#0B132B]/60 p-3.5 text-xs text-[#EFEAD8] placeholder:text-slate-500 outline-none focus:border-[#E57D37] focus:ring-2 focus:ring-[#E57D37]/20"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Identification & Compliance */}
                {step === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="border-b border-[#3A6DAF]/20 pb-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest font-['Space_Mono',monospace] text-[#EAAD62]">
                        Step 03 / 05
                      </span>
                      <h2 className="text-xl font-black font-['Space_Grotesk',sans-serif] text-[#EFEAD8] mt-0.5">
                        Identification & Regulatory Compliance
                      </h2>
                      <p className="text-xs text-slate-300 mt-1">
                        Required for student identification and statutory reporting.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-slate-300 mb-1.5">
                          Unique Student Identifier (USI) (Optional)
                        </label>
                        <input
                          type="text"
                          value={usi}
                          onChange={(e) => setUsi(e.target.value)}
                          placeholder="10-digit alphanumeric USI"
                          className="w-full rounded-2xl border border-[#3A6DAF]/40 bg-[#0B132B]/60 p-3.5 text-xs text-[#EFEAD8] placeholder:text-slate-500 outline-none focus:border-[#E57D37]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-slate-300 mb-1.5">
                          Passport / National ID Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={passportNumber}
                          onChange={(e) => setPassportNumber(e.target.value)}
                          placeholder="e.g. PA1234567"
                          className="w-full rounded-2xl border border-[#3A6DAF]/40 bg-[#0B132B]/60 p-3.5 text-xs text-[#EFEAD8] placeholder:text-slate-500 outline-none focus:border-[#E57D37]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-slate-300 mb-1.5">
                          Visa Status
                        </label>
                        <select
                          value={visaType}
                          onChange={(e) => setVisaType(e.target.value)}
                          className="w-full rounded-2xl border border-[#3A6DAF]/40 bg-[#0B132B]/60 p-3.5 text-xs text-[#EFEAD8] outline-none focus:border-[#E57D37]"
                        >
                          <option value="Citizen / PR" className="bg-[#0B132B]">Citizen / Permanent Resident</option>
                          <option value="Student Visa (Subclass 500)" className="bg-[#0B132B]">Student Visa (Subclass 500)</option>
                          <option value="Graduate Visa (Subclass 485)" className="bg-[#0B132B]">Graduate Visa (Subclass 485)</option>
                          <option value="Work / Other Visa" className="bg-[#0B132B]">Work / Other Visa</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-slate-300 mb-1.5">
                          English Proficiency Evidence
                        </label>
                        <select
                          value={englishEvidence}
                          onChange={(e) => setEnglishEvidence(e.target.value)}
                          className="w-full rounded-2xl border border-[#3A6DAF]/40 bg-[#0B132B]/60 p-3.5 text-xs text-[#EFEAD8] outline-none focus:border-[#E57D37]"
                        >
                          <option value="IELTS" className="bg-[#0B132B]">IELTS Academic (6.0+)</option>
                          <option value="PTE" className="bg-[#0B132B]">PTE Academic (50+)</option>
                          <option value="TOEFL" className="bg-[#0B132B]">TOEFL iBT</option>
                          <option value="Native Speaker / Prior Aus Studies" className="bg-[#0B132B]">Native Speaker / Australian Studies</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: Documents Upload */}
                {step === 4 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="border-b border-[#3A6DAF]/20 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest font-['Space_Mono',monospace] text-[#EAAD62]">
                          Step 04 / 05
                        </span>
                        <h2 className="text-xl font-black font-['Space_Grotesk',sans-serif] text-[#EFEAD8] mt-0.5">
                          Supporting Verification Documents
                        </h2>
                        <p className="text-xs text-slate-300 mt-1">
                          Attach copies of your identification, prior academic records, and language certificates.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddCustomDocument}
                        className="self-start sm:self-auto flex items-center gap-1.5 rounded-xl border border-[#3A6DAF]/40 bg-[#0B132B]/60 hover:bg-[#0B132B] px-3.5 py-2 text-xs font-bold text-[#EAAD62] font-['Space_Grotesk',sans-serif] uppercase tracking-wider transition-all"
                      >
                        + Add Custom File
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                            doc.fileName
                              ? "border-[#00C2A8]/50 bg-[#00C2A8]/5 shadow-lg shadow-[#00C2A8]/5"
                              : "border-[#3A6DAF]/30 bg-[#0B132B]/60 hover:border-[#EAAD62]/40"
                          }`}
                        >
                          {/* Hidden Real File Input */}
                          <input
                            type="file"
                            id={`file-input-${doc.id}`}
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleFileSelected(doc.id, e.target.files[0])
                              }
                            }}
                            className="hidden"
                          />

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start sm:items-center gap-3.5">
                              <div
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                                  doc.fileName
                                    ? "bg-[#00C2A8]/20 text-[#00C2A8] border-[#00C2A8]/40"
                                    : "bg-[#14234B] text-[#EAAD62] border-[#3A6DAF]/30"
                                }`}
                              >
                                {doc.fileName ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                              </div>

                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-xs sm:text-sm text-[#EFEAD8] font-['Space_Grotesk',sans-serif]">
                                    {doc.name}
                                  </p>
                                  {doc.required && (
                                    <span className="text-[10px] font-bold text-[#E57D37] uppercase font-['Space_Mono',monospace]">
                                      *Required
                                    </span>
                                  )}
                                </div>

                                {doc.fileName ? (
                                  <div className="flex items-center gap-2 text-xs font-['Space_Mono',monospace] text-[#00C2A8]">
                                    <span className="font-semibold truncate max-w-xs">{doc.fileName}</span>
                                    <span>•</span>
                                    <span className="text-slate-400">{doc.fileSize}</span>
                                    {doc.uploadedAt && <span className="text-slate-500">({doc.uploadedAt})</span>}
                                  </div>
                                ) : (
                                  <p className="text-[11px] font-['Space_Mono',monospace] text-slate-400">
                                    PDF, DOC, JPG or PNG (Max 15MB)
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              {doc.fileName ? (
                                <>
                                  <label
                                    htmlFor={`file-input-${doc.id}`}
                                    className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#3A6DAF]/40 bg-[#14234B]/80 text-xs font-bold text-slate-300 hover:text-[#EFEAD8] hover:border-[#EAAD62] transition-all font-['Space_Grotesk',sans-serif] uppercase tracking-wider"
                                  >
                                    <Upload className="h-3 w-3" /> Replace
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile(doc.id)}
                                    className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all font-['Space_Grotesk',sans-serif] uppercase tracking-wider"
                                  >
                                    Remove
                                  </button>
                                </>
                              ) : (
                                <label
                                  htmlFor={`file-input-${doc.id}`}
                                  className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#E57D37] to-[#FF5500] text-xs font-bold text-[#EFEAD8] font-['Space_Grotesk',sans-serif] uppercase tracking-wider shadow-md shadow-[#FF5500]/20 hover:opacity-95 transition-all"
                                >
                                  <Upload className="h-3.5 w-3.5" />
                                  <span>Browse & Attach File</span>
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* STEP 5: Final Review & Submission */}
                {step === 5 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="border-b border-[#3A6DAF]/20 pb-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest font-['Space_Mono',monospace] text-[#EAAD62]">
                        Step 05 / 05
                      </span>
                      <h2 className="text-xl font-black font-['Space_Grotesk',sans-serif] text-[#EFEAD8] mt-0.5">
                        Review Summary & Formal Declaration
                      </h2>
                      <p className="text-xs text-slate-300 mt-1">
                        Please review your application summary and attached documents carefully before final submission.
                      </p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-2xl border border-[#3A6DAF]/30 bg-[#0B132B]/60 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-[#EAAD62]">
                          Selected Qualification
                        </span>
                        <p className="font-bold text-sm text-[#EFEAD8]">
                          {programs.find((p) => p.id === selectedProgramId)?.name || "Selected Program"}
                        </p>
                        <p className="text-slate-400 font-['Space_Mono',monospace]">
                          Institution: {institution?.name}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl border border-[#3A6DAF]/30 bg-[#0B132B]/60 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-[#EAAD62]">
                          Applicant Contact
                        </span>
                        <p className="font-bold text-sm text-[#EFEAD8]">{firstName} {lastName}</p>
                        <p className="text-slate-400 font-['Space_Mono',monospace]">{email} • {phone}</p>
                      </div>
                    </div>

                    {/* Attached Documents Review */}
                    <div className="p-4 rounded-2xl border border-[#3A6DAF]/30 bg-[#0B132B]/60 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider font-['Space_Mono',monospace] text-[#00C2A8]">
                        Attached Verification Documents ({documents.filter((d) => d.fileName).length})
                      </span>
                      <div className="space-y-1.5 pt-1">
                        {documents.filter((d) => d.fileName).length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No files attached yet.</p>
                        ) : (
                          documents
                            .filter((d) => d.fileName)
                            .map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between text-xs text-slate-300">
                                <span className="font-semibold text-[#EFEAD8] flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-[#00C2A8]" />
                                  {doc.name}
                                </span>
                                <span className="font-['Space_Mono',monospace] text-slate-400 text-[11px]">
                                  {doc.fileName} ({doc.fileSize})
                                </span>
                              </div>
                            ))
                        )}
                      </div>
                    </div>

                    {/* Legal Declaration */}
                    <div className="p-4 rounded-2xl border border-[#EAAD62]/30 bg-[#EAAD62]/5 text-xs text-slate-300 space-y-2">
                      <p className="font-bold text-[#EAAD62] uppercase tracking-wider font-['Space_Mono',monospace] text-[10px]">
                        Applicant Declaration & Privacy Notice:
                      </p>
                      <p className="leading-relaxed">
                        I declare that the information provided in this application and all attached documents are true, correct, and complete. I understand that submitting false or misleading information may lead to rejection or cancellation of enrolment.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Wizard Controls */}
                <div className="flex items-center justify-between pt-6 border-t border-[#3A6DAF]/20">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={() => setStep(step - 1)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-[#3A6DAF]/40 bg-[#0B132B]/60 text-slate-300 hover:text-[#EFEAD8] text-xs font-bold font-['Space_Grotesk',sans-serif] uppercase tracking-wider transition-all"
                    >
                      <ChevronLeft className="h-4 w-4" /> Back
                    </button>
                  ) : (
                    <div />
                  )}

                  {step < 5 ? (
                    <button
                      type="button"
                      onClick={() => setStep(step + 1)}
                      className="flex items-center gap-1.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#E57D37] to-[#FF5500] text-[#EFEAD8] text-xs font-bold font-['Space_Grotesk',sans-serif] uppercase tracking-wider shadow-lg shadow-[#FF5500]/25 hover:opacity-95 transition-all"
                    >
                      <span>Continue</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#00C2A8] to-[#059669] text-[#0B132B] text-xs font-black font-['Space_Grotesk',sans-serif] uppercase tracking-widest shadow-lg shadow-[#00C2A8]/25 hover:opacity-95 disabled:opacity-50 transition-all"
                    >
                      {submitting ? (
                        <span>Processing Application...</span>
                      ) : (
                        <>
                          <span>Submit Official Application</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </main>
      </div>
    </>
  )
}
