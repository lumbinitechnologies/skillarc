"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function StudentAdmissionsPage() {
  const [status, setStatus] = useState("OFFER_GENERATED") // 'OFFER_GENERATED' | 'OFFER_ACCEPTED' | 'ENROLLED'
  const [signature, setSignature] = useState("")
  const [appId, setAppId] = useState<string | null>(null)
  const [fees, setFees] = useState(12500)

  // Fetch active student applicant status from DB
  const loadStudentAdmissions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: appData } = await supabase
          .from("admissions_applications")
          .select(`
            id,
            status,
            offer_letters (
              id,
              course_fees,
              status
            )
          `)
          .eq("email", user.email)
          .single()

        if (appData) {
          setAppId(appData.id)
          setStatus(appData.status)
          if (appData.offer_letters?.[0]) {
            setFees(Number(appData.offer_letters[0].course_fees))
          }
        }
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStudentAdmissions()
  }, [loadStudentAdmissions])

  // Sign & accept offer in DB
  const handleAccept = async () => {
    if (!signature.trim()) return
    try {
      setStatus("OFFER_ACCEPTED")

      if (!appId) return

      // Sign offer letter
      await supabase
        .from("offer_letters")
        .update({
          status: "ACCEPTED",
          signed_at: new Date().toISOString(),
          signature_url: signature.trim(),
        })
        .eq("application_id", appId)

      // Update application stage
      await supabase
        .from("admissions_applications")
        .update({ status: "OFFER_ACCEPTED" })
        .eq("id", appId)
    } catch (err) {
      console.error(err)
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
                { title: "Offer Dispatched", desc: "Review conditions and sign code of conduct contract.", active: status === "OFFER_GENERATED", done: status !== "OFFER_GENERATED" },
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
          {status === "OFFER_GENERATED" || status === "APPLIED" ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Offer Letter Pending</h3>
                <p className="text-[10px] text-slate-400 mt-1">Graduate Diploma of Management (GDM)</p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/40 text-indigo-900 space-y-2">
                <div className="text-[10px] text-indigo-600/80 font-bold uppercase tracking-wider">Tuition Fees</div>
                <div className="text-lg font-extrabold">₹{fees.toLocaleString()} INR</div>
                <div className="text-[10px] text-indigo-600/80 font-medium">Installment plans option available</div>
              </div>

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
                  disabled={!signature.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition"
                >
                  Accept & Enrol
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4 text-center">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Offer Accepted</h3>
                <p className="text-[10px] text-slate-400 mt-1">GDM enrollment contract confirmed on {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
