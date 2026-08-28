"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { useDashboardSession } from "@/components/dashboard-session-provider"

export default function StudentAdmissionsPage() {
  const session = useDashboardSession()
  const [status, setStatus] = useState("APPLIED")
  const [signature, setSignature] = useState("")
  const [appId, setAppId] = useState<string | null>(null)
  const [fees, setFees] = useState<number | null>(null)
  const [feeCurrency, setFeeCurrency] = useState("AUD")
  const [offerHtml, setOfferHtml] = useState<string | null>(null)
  const [agreementHtml, setAgreementHtml] = useState<string | null>(null)
  const [confirmedDocuments, setConfirmedDocuments] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [busy, setBusy] = useState(false)

  // Fetch active student applicant status from DB
  const loadStudentAdmissions = useCallback(async () => {
    try {
      if (!session) return
      const response = await fetch("/api/admissions/my")
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Unable to load admission")
      const appData = result.application
      if (!appData) return
      setAppId(appData.id)
      setStatus(appData.status)
      const offer = Array.isArray(appData.offer_letters) ? appData.offer_letters[0] : appData.offer_letters
      if (offer) {
        setFees(Number(offer.course_fees))
        setFeeCurrency(offer.currency ?? "AUD")
        setOfferHtml(offer.rendered_html ?? null)
      }
      const agreement = Array.isArray(appData.admission_documents_v2) ? appData.admission_documents_v2.find((document: { document_type?: string }) => document.document_type === "AGREEMENT") : null
      setAgreementHtml(agreement?.rendered_html ?? null)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to load admission")
    }
  }, [session])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStudentAdmissions()
  }, [loadStudentAdmissions])

  // Sign & accept offer in DB
  const handleAccept = async () => {
    if (!signature.trim()) return
    setBusy(true)
    setErrorMessage("")
    try {
      if (!appId) return
      const response = await fetch(`/api/admissions/${appId}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: "accept", reference: signature.trim() }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Offer acceptance failed")
      setStatus(result.application.status)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Offer acceptance failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 p-6 font-sans max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Student Admission Center</h1>
        <p className="text-xs text-slate-500">View admission statuses, offer letter proposals, and sign enrollment agreements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Tracker */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
            <h3 className="font-bold text-slate-800 text-sm">Enrollment Timeline</h3>
            <div className="space-y-4">
              {[
                { title: "Application Submitted", desc: "Visa, passport, transcripts uploaded.", active: true, done: true },
                { title: "Academic Review", desc: "Registrar compliance check completed.", active: true, done: true },
                { title: "Offer Dispatched", desc: "Review conditions and sign code of conduct contract.", active: status === "OFFER_SENT", done: ["OFFER_ACCEPTED", "ENROLLED"].includes(status) },
                { title: "Confirmation of Enrollment (CoE)", desc: "Enrolled in Graduate Diploma of Management (GDM).", active: status === "ENROLLED", done: status === "ENROLLED" },
              ].map((step, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.done ? "bg-emerald-500 text-white" : step.active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
                    }`}>
                      {step.done ? "✓" : idx + 1}
                    </div>
                    {idx < 3 && <div className="w-0.5 h-12 bg-slate-100 mt-1" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-xs leading-none">{step.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Offer Letter Signature Box */}
        <div>
          {status === "OFFER_SENT" ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Offer Letter Pending</h3>
                <p className="text-[10px] text-slate-400 mt-1">Graduate Diploma of Management (GDM)</p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/40 text-indigo-900 space-y-2">
                <div className="text-[10px] text-indigo-600/80 font-bold uppercase tracking-wider">Tuition Fees</div>
                <div className="text-lg font-extrabold">{fees === null ? "Fee pending" : `${fees.toLocaleString()} ${feeCurrency}`}</div>
                <div className="text-[10px] text-indigo-600/80 font-medium">Installment plans option available</div>
              </div>

              {offerHtml && <details className="rounded-xl border p-3"><summary className="cursor-pointer text-xs font-semibold">View offer document</summary><iframe title="Offer document" sandbox="" srcDoc={offerHtml} className="mt-3 h-96 w-full rounded-lg border" /></details>}

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Digital Signature</label>
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Type your full name to sign"
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none"
                  />
                </div>
                <button
                  onClick={handleAccept}
                  disabled={!signature.trim() || !confirmedDocuments || busy}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition"
                >
                  {busy ? "Saving…" : "Accept offer"}
                </button>
                <label className="flex items-start gap-2 text-[10px] text-slate-500"><input type="checkbox" checked={confirmedDocuments} onChange={(event) => setConfirmedDocuments(event.target.checked)} className="mt-0.5" />I have reviewed the offer and agreement documents.</label>
              </div>
              {agreementHtml && <details className="rounded-xl border p-3"><summary className="cursor-pointer text-xs font-semibold">View enrolment agreement</summary><iframe title="Enrolment agreement" sandbox="" srcDoc={agreementHtml} className="mt-3 h-96 w-full rounded-lg border" /></details>}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4 text-center">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{status === "ENROLLED" ? "Enrolment confirmed" : status === "OFFER_ACCEPTED" ? "Offer accepted" : "Admission status"}</h3>
                <p className="text-[10px] text-slate-400 mt-1">GDM enrollment contract confirmed on {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {errorMessage && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
    </div>
  )
}
