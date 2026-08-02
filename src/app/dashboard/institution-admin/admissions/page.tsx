"use client"

import { useCallback, useEffect, useState } from "react"
import { FileText, CheckCircle2, XCircle, Clock, Search, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase"

type AdmissionDocument = {
  id: string
  name: string
  file_url?: string | null
  status: string
}

type Applicant = {
  id: string
  name: string
  email: string
  program: string
  status: string
  docs: AdmissionDocument[]
}

type ProgramOption = {
  id: string
  name: string
}
type AdmissionRecord = {
  id: string
  first_name: string
  last_name: string
  email: string
  status: string
  program_id?: string | null
  programs?: { name?: string | null } | Array<{ name?: string | null }> | null
  admission_documents?: Array<{
    id: string
    document_name: string
    file_url?: string | null
    status: string
  }>
}

export default function AdmissionsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [programsList, setProgramsList] = useState<ProgramOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)

  // Add form fields
  const [showAdd, setShowAdd] = useState(false)
  const [newFirst, setNewFirst] = useState("")
  const [newLast, setNewLast] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [selProg, setSelProg] = useState("")

  const selectedApp = applicants.find((a) => a.id === selectedAppId)

  // Load programs list
  const loadPrograms = useCallback(async () => {
    try {
      const { data } = await supabase.from("programs").select("id, name")
      if (data) setProgramsList(data)
    } catch (err) {
      console.error(err)
    }
  }, [])

  // Load applicants from database
  const loadApplicants = useCallback(async () => {
    try {
      const { data: apps, error } = await supabase
        .from("admissions_applications")
        .select(`
          id,
          first_name,
          last_name,
          email,
          status,
          program_id,
          programs (
            name
          ),
          admission_documents (
            id,
            document_name,
            file_url,
            status
          )
        `)
      
      if (error) throw error

      if (apps && apps.length > 0) {
        const formatted = (apps as any[]).map((a: any) => {
          const progName = Array.isArray(a.programs) ? a.programs[0]?.name : a.programs?.name
          return {
            id: a.id,
            name: `${a.first_name} ${a.last_name}`,
            email: a.email,
            program: progName || "Graduate Diploma of Management (GDM)",
            status: a.status,
            docs: (a.admission_documents || []).map((d: any) => ({
              id: d.id,
              name: d.document_name,
              file_url: d.file_url,
              status: d.status,
            })),
          }
        })
        setApplicants(formatted)
        setSelectedAppId((current) => {
          if (current) return current
          return formatted.length > 0 ? formatted[0].id : null
        })
      } else {
        setApplicants([])
        setSelectedAppId(null)
      }
    } catch (err: unknown) {
      console.error("Failed to fetch admissions:", err instanceof Error ? err.message : err)
      setApplicants([])
      setSelectedAppId(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await loadApplicants()
      await loadPrograms()
    })()
  }, [loadApplicants, loadPrograms])

  // Create new live application in DB
  const handleAddApplication = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFirst.trim() || !newLast.trim() || !newEmail.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from("users")
        .select("institution_id")
        .eq("id", user?.id)
        .single()
      
      if (!profile?.institution_id) return

      const { data: newApp, error } = await supabase
        .from("admissions_applications")
        .insert({
          institution_id: profile.institution_id,
          first_name: newFirst.trim(),
          last_name: newLast.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim() || null,
          program_id: selProg || null,
        })
        .select()
        .single()

      if (error) throw error

      if (newApp) {
        // Insert standard checklist documents
        await supabase.from("admission_documents").insert([
          { application_id: newApp.id, document_name: "Passport Scan", status: "PENDING", file_url: "#" },
          { application_id: newApp.id, document_name: "Academic Transcripts", status: "PENDING", file_url: "#" }
        ])
      }

      setNewFirst("")
      setNewLast("")
      setNewEmail("")
      setNewPhone("")
      setSelProg("")
      setShowAdd(false)
      loadApplicants()
    } catch (err) {
      console.error(err)
    }
  }

  // Update doc status live in DB
  const updateDocStatus = async (docId: string, status: "APPROVED" | "REJECTED") => {
    try {
      // Local optimistic update
      setApplicants((prev) =>
        prev.map((app) => ({
          ...app,
          docs: app.docs.map((d) => (d.id === docId ? { ...d, status } : d)),
        }))
      )

      await supabase
        .from("admission_documents")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", docId)
    } catch (err) {
      console.error(err)
    }
  }

  // Generate offer letter in DB
  const handleGenerateOffer = async (appId: string) => {
    try {
      setApplicants((prev) =>
        prev.map((app) =>
          app.id === appId ? { ...app, status: "OFFER_GENERATED" } : app
        )
      )

      const termStart = new Date()
      termStart.setDate(termStart.getDate() + 30)

      // Insert offer letter record
      await supabase.from("offer_letters").insert({
        application_id: appId,
        course_fees: 12500,
        term_start: termStart.toISOString().split("T")[0],
        status: "SENT",
      })

      // Update application stage
      await supabase
        .from("admissions_applications")
        .update({ status: "OFFER_GENERATED" })
        .eq("id", appId)
    } catch (err) {
      console.error(err)
    }
  }

  // Confirm enrollment
  const handleEnroll = async (appId: string) => {
    try {
      setApplicants((prev) =>
        prev.map((app) =>
          app.id === appId ? { ...app, status: "ENROLLED" } : app
        )
      )

      const app = applicants.find((a) => a.id === appId)
      if (!app) return

      await supabase
        .from("admissions_applications")
        .update({ status: "ENROLLED" })
        .eq("id", appId)

      const { data: fullApp } = await supabase
        .from("admissions_applications")
        .select(`
          institution_id, program_id, first_name, last_name, email,
          offer_letters (
            course_fees
          )
        `)
        .eq("id", appId)
        .single()

      if (fullApp) {
        const studentRes = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${fullApp.first_name} ${fullApp.last_name}`.trim(),
            email: fullApp.email,
            institution_id: fullApp.institution_id,
            program_id: fullApp.program_id || null,
            semester: 1,
          }),
        })

        const studentData = await studentRes.json()
        const createdStudentId = studentData?.student?.id || studentData?.id

        if (createdStudentId) {
          const offerFee = fullApp.offer_letters?.[0]?.course_fees ? Number(fullApp.offer_letters[0].course_fees) : 12000
          if (offerFee > 0) {
            const { data: newPlan } = await supabase
              .from("payment_plans")
              .insert({
                student_id: createdStudentId,
                institution_id: fullApp.institution_id,
                total_amount: offerFee,
              })
              .select()
              .single()

            if (newPlan) {
              const today = new Date()
              const installment1 = Math.round(offerFee * 0.4)
              const installment2 = Math.round(offerFee * 0.3)
              const installment3 = offerFee - installment1 - installment2

              const due1 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15).toISOString().split("T")[0]
              const due2 = new Date(today.getFullYear(), today.getMonth() + 2, 15).toISOString().split("T")[0]
              const due3 = new Date(today.getFullYear(), today.getMonth() + 4, 15).toISOString().split("T")[0]

              await supabase.from("invoices").insert([
                { payment_plan_id: newPlan.id, amount_due: installment1, due_date: due1, status: "UNPAID" },
                { payment_plan_id: newPlan.id, amount_due: installment2, due_date: due2, status: "UNPAID" },
                { payment_plan_id: newPlan.id, amount_due: installment3, due_date: due3, status: "UNPAID" },
              ])
            }
          }
        }
      }
    } catch (err) {
      console.error("Enrollment error:", err)
    }
  }

  const filtered = applicants.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 p-6 font-sans">
      <style>{`
        .status-pill {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 99px;
          text-transform: uppercase;
        }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admissions Registrar Desk</h1>
          <p className="text-xs text-slate-500 mt-1">Verify documents, generate student offer letters, and manage enrollments</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-sm animate-fade-in"
        >
          <Plus size={14} /> New Application
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAddApplication} className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm space-y-4 max-w-xl">
          <h3 className="font-bold text-slate-800 text-sm">Create Student Application</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">First Name</label>
              <input
                required
                type="text"
                value={newFirst}
                onChange={(e) => setNewFirst(e.target.value)}
                placeholder="e.g. Aarav"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Last Name</label>
              <input
                required
                type="text"
                value={newLast}
                onChange={(e) => setNewLast(e.target.value)}
                placeholder="e.g. Sharma"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
              <input
                required
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. aarav@gmail.com"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Phone</label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="e.g. +91 99999 99999"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">Select Program</label>
              <select
                value={selProg}
                onChange={(e) => setSelProg(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none cursor-pointer"
              >
                <option value="">Select Program...</option>
                {programsList.map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3.5 py-2 border border-slate-100 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
            >
              Submit Application
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applicants List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
            <Search size={18} className="text-slate-400 self-center ml-2" />
            <input
              type="text"
              placeholder="Search applicant registry..."
              className="w-full text-sm outline-none border-none bg-transparent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading live applications…</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No live applications found yet.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider pl-6">Applicant</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Requested Course</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Pipeline Stage</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((app) => (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedAppId(app.id)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${
                        selectedAppId === app.id ? "bg-indigo-50/20" : ""
                      }`}
                    >
                      <td className="p-4 pl-6">
                        <div className="font-semibold text-slate-800 text-sm">{app.name}</div>
                        <div className="text-xs text-slate-400">{app.email}</div>
                      </td>
                      <td className="p-4 text-xs font-semibold text-slate-500">{app.program}</td>
                      <td className="p-4">
                        <span
                          className={`status-pill ${
                            app.status === "ENROLLED"
                              ? "bg-emerald-50 text-emerald-600"
                              : app.status === "OFFER_ACCEPTED"
                              ? "bg-teal-50 text-teal-600"
                              : app.status === "OFFER_GENERATED"
                              ? "bg-indigo-50 text-indigo-600"
                              : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {app.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-6">
                        {app.status === "APPLIED" || app.status === "UNDER_REVIEW" ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleGenerateOffer(app.id)
                            }}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
                          >
                            Generate Offer
                          </button>
                        ) : app.status === "OFFER_ACCEPTED" ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEnroll(app.id)
                            }}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
                          >
                            Confirm Enrollment
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Ready</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Verification Panel */}
        <div className="space-y-6">
          {selectedApp ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Application Verification</h3>
                <p className="text-xs text-slate-400 mt-1">Review uploads & compliance documents</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Candidate Details</div>
                <div className="text-sm font-semibold text-slate-800">{selectedApp.name}</div>
                <div className="text-xs text-slate-500 font-medium">{selectedApp.program}</div>
              </div>

              <div className="space-y-3">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Document Checklist</div>
                {selectedApp.docs.map((doc) => (
                  <div key={doc.id} className="p-3 border border-slate-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-700">{doc.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {doc.status === "APPROVED" ? (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 size={10} /> Verified
                          </span>
                        ) : doc.status === "REJECTED" ? (
                          <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                            <XCircle size={10} /> Rejected
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                            <Clock size={10} /> Awaiting Review
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => updateDocStatus(doc.id, "APPROVED")}
                        className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                      <button
                        onClick={() => updateDocStatus(doc.id, "REJECTED")}
                        className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {selectedApp.status === "OFFER_GENERATED" && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100/60 rounded-2xl flex items-start gap-3">
                  <FileText className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-semibold text-indigo-900 text-xs">Offer Sent to Applicant</h4>
                    <p className="text-[10px] text-indigo-600/80 mt-1 leading-relaxed">
                      Offer letter and fee structures have been dispatched. Waiting for candidate signature and acceptance.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center text-slate-400 text-xs">
              Select an applicant to review documentation
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
