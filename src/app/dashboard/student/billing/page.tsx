"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, CreditCard, ShieldCheck, Zap, Building2, Download, ArrowRight, Loader2, X, Printer } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import InvoicePrintModal from "@/modules/billing/components/InvoicePrintModal"

type LedgerInstallment = {
  id: string
  amount: number
  due: string
  status: string
}

type LedgerState = {
  total: number
  paid: number
  installments: LedgerInstallment[]
  planId?: string
}

export default function StudentBillingPage() {
  const [ledger, setLedger] = useState<LedgerState>({ total: 0, paid: 0, installments: [] })
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<LedgerInstallment | null>(null)
  const [studentInfo, setStudentInfo] = useState({ name: "Student Account", email: "", id: "" })
  const [printInvoiceData, setPrintInvoiceData] = useState<any | null>(null)
  
  // Payment Modal State
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi")
  const [upiId, setUpiId] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")
  const [cardName, setCardName] = useState("")
  const [selectedBank, setSelectedBank] = useState("HDFC Bank")

  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState<{ txnId: string; amount: number } | null>(null)

  // Fetch or Auto-Provision active student fees from DB
  const loadFeesSchedule = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLedger({ total: 0, paid: 0, installments: [] })
        return
      }

      // 1. Fetch user & student profile for institution_id
      const { data: userProfile } = await supabase
        .from("users")
        .select("institution_id, name")
        .eq("id", user.id)
        .single()

      setStudentInfo({
        name: userProfile?.name || "Student Account",
        email: user.email || "",
        id: user.id,
      })

      // 2. Fetch payment plans for this student
      const { data: plansRes, error: plansErr } = await supabase
        .from("payment_plans")
        .select("id, total_amount, institution_id")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })

      if (plansErr) {
        console.error("Failed to load student billing plans:", plansErr.message)
      }

      let activePlan = plansRes && plansRes.length > 0 ? plansRes[0] : null

      // If no plan exists yet for student, auto-provision one dynamically for their institution
      if (!activePlan && userProfile?.institution_id) {
        // Check if student has an offer letter with course_fees
        const { data: appData } = await supabase
          .from("admissions_applications")
          .select("offer_letters(course_fees)")
          .eq("email", user.email || "")
          .maybeSingle()

        const offerFee = appData?.offer_letters?.[0]?.course_fees ? Number(appData.offer_letters[0].course_fees) : 12500

        const { data: newPlan } = await supabase
          .from("payment_plans")
          .insert({
            student_id: user.id,
            institution_id: userProfile.institution_id,
            total_amount: offerFee,
          })
          .select()
          .single()

        if (newPlan) {
          activePlan = newPlan
          const today = new Date()
          const inst1 = Math.round(offerFee * 0.4)
          const inst2 = Math.round(offerFee * 0.3)
          const inst3 = offerFee - inst1 - inst2

          const due1 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15).toISOString().split("T")[0]
          const due2 = new Date(today.getFullYear(), today.getMonth() + 2, 15).toISOString().split("T")[0]
          const due3 = new Date(today.getFullYear(), today.getMonth() + 4, 15).toISOString().split("T")[0]

          await supabase.from("invoices").insert([
            { payment_plan_id: newPlan.id, amount_due: inst1, due_date: due1, status: "UNPAID" },
            { payment_plan_id: newPlan.id, amount_due: inst2, due_date: due2, status: "UNPAID" },
            { payment_plan_id: newPlan.id, amount_due: inst3, due_date: due3, status: "UNPAID" },
          ])
        }
      }

      if (!activePlan) {
        setLedger({ total: 0, paid: 0, installments: [] })
        return
      }

      // Fetch invoices for active plan
      const { data: invoicesRes } = await supabase
        .from("invoices")
        .select("id, amount_due, due_date, status")
        .eq("payment_plan_id", activePlan.id)
        .order("due_date", { ascending: true })

      const invoices = (invoicesRes || []).sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

      const paidAmt = invoices
        .filter((inv: { status: string; amount_due: number | string }) => inv.status === "PAID")
        .reduce((s: number, inv: { status: string; amount_due: number | string }) => s + Number(inv.amount_due), 0)

      setLedger({
        planId: activePlan.id,
        total: Number(activePlan.total_amount),
        paid: paidAmt,
        installments: invoices.map((inv: { id: string; amount_due: number | string; due_date: string; status: string }) => ({
          id: inv.id,
          amount: Number(inv.amount_due),
          due: inv.due_date,
          status: inv.status,
        })),
      })
    } catch (err) {
      console.error("Failed to load student billing:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFeesSchedule()
  }, [loadFeesSchedule])

  // Handle Online Fee Payment Submission
  const handleProcessPayment = async () => {
    if (!selectedInvoice) return
    setIsProcessing(true)

    try {
      // Simulate gateway processing delay for realism
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const refNo = `TXN_${Math.floor(100000000 + Math.random() * 900000000)}`
      const methodLabel = paymentMethod === "upi" ? `UPI (${upiId || "Instant"})` : paymentMethod === "card" ? "Credit/Debit Card" : `NetBanking (${selectedBank})`

      // 1. Insert transaction into payments table
      await supabase.from("payments").insert({
        invoice_id: selectedInvoice.id,
        amount_paid: selectedInvoice.amount,
        payment_method: methodLabel,
        reference_no: refNo,
      })

      // 2. Update invoice status to PAID
      await supabase
        .from("invoices")
        .update({ status: "PAID" })
        .eq("id", selectedInvoice.id)

      setPaymentSuccess({
        txnId: refNo,
        amount: selectedInvoice.amount,
      })

      // Refresh ledger
      await loadFeesSchedule()
    } catch (err) {
      console.error("Payment processing error:", err)
      alert("Payment processing failed. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const closeModal = () => {
    setSelectedInvoice(null)
    setPaymentSuccess(null)
    setUpiId("")
    setCardNumber("")
    setCardExpiry("")
    setCardCvv("")
    setCardName("")
  }

  return (
    <div className="space-y-6 p-6 font-sans max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col gap-2 rounded-3xl bg-white p-6 border border-slate-100 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6C63FF]">Financial Services</p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">Tuition Account & Fees</h1>
          <p className="text-xs text-slate-500 mt-1">View payment schedules, settle installments online, and access receipts</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-indigo-50/80 border border-indigo-100/60 px-4 py-2.5 text-xs font-bold text-[#6C63FF] self-start md:self-auto">
          <ShieldCheck size={16} /> 256-Bit SSL Encrypted
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-5 border border-slate-100 rounded-3xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Plan Total</div>
          <div className="text-2xl font-black font-['Space_Grotesk'] text-slate-900">₹{ledger.total.toLocaleString()}</div>
        </div>
        <div className="bg-white p-5 border border-slate-100 rounded-3xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Paid</div>
          <div className="text-2xl font-black font-['Space_Grotesk'] text-emerald-600">₹{ledger.paid.toLocaleString()}</div>
        </div>
        <div className="bg-white p-5 border border-slate-100 rounded-3xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Outstanding Balance</div>
          <div className="text-2xl font-black font-['Space_Grotesk'] text-rose-600">₹{(ledger.total - ledger.paid).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Installment History */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between pl-2">
            <h3 className="font-bold text-slate-800 text-sm">Fees Schedule</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {ledger.installments.filter(i => i.status === "PAID").length}/{ledger.installments.length} Paid
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#6C63FF]" />
              </div>
            ) : ledger.installments.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No installments found for your account.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider pl-6">Installment</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Due Date</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right pr-6">Action / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {ledger.installments.map((inv, idx) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 pl-6 text-sm font-semibold text-slate-800">Term Installment #{idx + 1}</td>
                      <td className="p-4 text-xs font-medium text-slate-500">{inv.due}</td>
                      <td className="p-4 text-sm font-bold font-['Space_Grotesk'] text-slate-900">₹{inv.amount.toLocaleString()}</td>
                      <td className="p-4 text-right pr-6">
                        {inv.status === "PAID" ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold py-1 px-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                              <CheckCircle2 size={12} /> PAID
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPrintInvoiceData({
                                invoiceId: inv.id,
                                amount: inv.amount,
                                dueDate: inv.due,
                                installmentNumber: idx + 1,
                                studentName: studentInfo.name,
                                studentEmail: studentInfo.email,
                                studentId: studentInfo.id,
                                remainingBalance: ledger.total - ledger.paid,
                              })}
                              className="rounded-xl text-[10px] font-bold border-slate-200 text-slate-700 hover:bg-slate-50 py-1 px-2.5 h-auto"
                            >
                              <Printer size={12} className="mr-1 text-[#6C63FF]" /> Receipt PDF
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setSelectedInvoice(inv)}
                            className="rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:shadow-md hover:opacity-95 active:scale-95 transition"
                          >
                            Pay Now <ArrowRight size={12} className="ml-1" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Support & Security Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6 h-fit">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm">Payment Security</h3>
            <p className="text-[10px] text-slate-400">Instant Online Settlements</p>
          </div>

          <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100/40 space-y-3">
            <div className="flex items-start gap-2.5">
              <Zap size={16} className="text-[#6C63FF] shrink-0 mt-0.5" />
              <div className="text-[11px] text-indigo-950 leading-relaxed font-medium">
                Installments paid online update your tuition ledger balance instantly. Official receipts are issued immediately upon transaction confirmation.
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={16} className="text-slate-400 shrink-0 mt-0.5" />
              <div className="text-[10px] text-slate-500 leading-relaxed font-medium">
                Prefer offline payments? You can also present a direct bank transfer reference to the registrar office for manual verification.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SkillArc Online Fee Payment Modal (Glass 2.0 aesthetics) */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 border border-slate-200/80 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden backdrop-blur-md">
            
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between relative">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">SkillArc Fee Gateway</span>
                <h2 className="text-xl font-extrabold mt-0.5">Settle Installment</h2>
              </div>
              <button
                onClick={closeModal}
                disabled={isProcessing}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition"
              >
                <X size={18} />
              </button>
            </div>

            {paymentSuccess ? (
              /* Success State */
              <div className="p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Payment Successful!</h3>
                  <p className="text-xs text-slate-500 mt-1">Your tuition installment has been recorded in the registry ledger.</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Transaction ID</span>
                    <span className="font-bold font-['Space_Grotesk'] text-slate-800">{paymentSuccess.txnId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount Paid</span>
                    <span className="font-extrabold text-emerald-600 font-['Space_Grotesk']">₹{paymentSuccess.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date & Time</span>
                    <span className="font-medium text-slate-700">{new Date().toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setPrintInvoiceData({
                      invoiceId: selectedInvoice?.id || "REC",
                      amount: paymentSuccess.amount,
                      dueDate: selectedInvoice?.due || "",
                      installmentNumber: ledger.installments.findIndex(i => i.id === selectedInvoice?.id) + 1 || 1,
                      studentName: studentInfo.name,
                      studentEmail: studentInfo.email,
                      studentId: studentInfo.id,
                      remainingBalance: ledger.total - ledger.paid,
                      txnId: paymentSuccess.txnId,
                      paymentMethod: paymentMethod === "upi" ? `UPI (${upiId || "Instant"})` : paymentMethod === "card" ? "Credit/Debit Card" : `NetBanking (${selectedBank})`,
                    })}
                    className="flex-1 rounded-2xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Download size={14} className="mr-1.5" /> Receipt PDF
                  </Button>
                  <Button
                    onClick={closeModal}
                    className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              /* Payment Form State */
              <div className="p-6 space-y-6">
                
                {/* Summary Banner */}
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Installment Due</div>
                    <div className="text-sm font-semibold text-indigo-950 mt-0.5">Term Due Date: {selectedInvoice.due}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black font-['Space_Grotesk'] text-[#6C63FF]">₹{selectedInvoice.amount.toLocaleString()}</div>
                  </div>
                </div>

                {/* Payment Method Tabs */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 block">Select Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("upi")}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                        paymentMethod === "upi"
                          ? "bg-indigo-50/80 border-[#6C63FF] text-[#6C63FF]"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Zap size={18} /> UPI / GPay
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                        paymentMethod === "card"
                          ? "bg-indigo-50/80 border-[#6C63FF] text-[#6C63FF]"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <CreditCard size={18} /> Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("netbanking")}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                        paymentMethod === "netbanking"
                          ? "bg-indigo-50/80 border-[#6C63FF] text-[#6C63FF]"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Building2 size={18} /> NetBanking
                    </button>
                  </div>
                </div>

                {/* Tab Specific Inputs */}
                {paymentMethod === "upi" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <label className="text-xs font-semibold text-slate-700 block">VPA / UPI ID</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. student@okaxis or 9876543210@paytm"
                      className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C63FF] focus:bg-white transition"
                    />
                    <div className="flex gap-2 text-[10px] text-slate-400 font-medium pt-1">
                      <span className="bg-slate-100 px-2 py-0.5 rounded">GPay</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded">PhonePe</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded">Paytm</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded">BHIM</span>
                    </div>
                  </div>
                )}

                {paymentMethod === "card" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4532 •••• •••• 8921"
                        maxLength={19}
                        className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C63FF] focus:bg-white transition font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="08/28"
                          maxLength={5}
                          className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C63FF] focus:bg-white transition font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">CVV</label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="•••"
                          maxLength={4}
                          className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C63FF] focus:bg-white transition font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Name on Card</label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="As printed on card"
                        className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C63FF] focus:bg-white transition"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === "netbanking" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <label className="text-xs font-semibold text-slate-700 block">Select Bank</label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C63FF] focus:bg-white transition font-medium"
                    >
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="State Bank of India">State Bank of India (SBI)</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                    </select>
                  </div>
                )}

                {/* Submit Action Button */}
                <Button
                  onClick={handleProcessPayment}
                  disabled={isProcessing}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] py-4 text-sm font-bold text-white shadow-md hover:shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing Payment...
                    </>
                  ) : (
                    `Pay ₹${selectedInvoice.amount.toLocaleString()} Now`
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      {printInvoiceData && (
        <InvoicePrintModal
          isOpen={!!printInvoiceData}
          onClose={() => setPrintInvoiceData(null)}
          studentName={printInvoiceData.studentName}
          studentEmail={printInvoiceData.studentEmail}
          studentId={printInvoiceData.studentId}
          invoiceId={printInvoiceData.invoiceId}
          amount={printInvoiceData.amount}
          dueDate={printInvoiceData.dueDate}
          installmentNumber={printInvoiceData.installmentNumber}
          remainingBalance={printInvoiceData.remainingBalance}
          txnId={printInvoiceData.txnId}
          paymentMethod={printInvoiceData.paymentMethod}
        />
      )}
    </div>
  )
}
