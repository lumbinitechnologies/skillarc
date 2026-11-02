"use client"

type InvoicePrintData = Omit<React.ComponentProps<typeof InvoicePrintModal>, "isOpen" | "onClose">

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, ShieldCheck, Loader2, Printer } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import InvoicePrintModal from "@/modules/billing/components/InvoicePrintModal"
import { useDashboardSession } from "@/components/dashboard-session-provider"

type InvoicePrintData = Omit<React.ComponentProps<typeof InvoicePrintModal>, "isOpen" | "onClose">

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
  const session = useDashboardSession()
  const [ledger, setLedger] = useState<LedgerState>({ total: 0, paid: 0, installments: [] })
  const [loading, setLoading] = useState(true)
  const [studentInfo, setStudentInfo] = useState({ name: "Student Account", email: "", id: "" })
  const [printInvoiceData, setPrintInvoiceData] = useState<InvoicePrintData | null>(null)

  // Load only the billing schedule assigned to the authenticated student.
  const loadFeesSchedule = useCallback(async () => {
    try {
      setLoading(true)
      if (!session) {
        setLedger({ total: 0, paid: 0, installments: [] })
        return
      }

      setStudentInfo({
        name: session.name || "Student Account",
        email: session.email || "",
        id: session.id,
      })

      // 2. Fetch payment plans for this student
      const { data: plansRes, error: plansErr } = await supabase
        .from("payment_plans")
        .select("id, total_amount, institution_id")
        .eq("student_id", session.id)
        .order("created_at", { ascending: false })

      if (plansErr) {
        console.error("Failed to load student billing plans:", plansErr.message)
      }

      const activePlan = plansRes && plansRes.length > 0 ? plansRes[0] : null

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

      const invoices = (invoicesRes || []).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

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
  }, [session])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFeesSchedule()
  }, [loadFeesSchedule])

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
                            disabled
                            title="Online payment is not available yet"
                            className="rounded-xl px-3.5 py-1.5 text-xs font-bold"
                          >
                            Payment unavailable
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
            <p className="text-[10px] text-slate-400">Payment status and receipts</p>
          </div>

          <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100/40 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={16} className="text-[#6C63FF] shrink-0 mt-0.5" />
              <div className="text-[11px] text-indigo-950 leading-relaxed font-medium">
                Online payment processing is not available yet. Your institution’s billing office can confirm payment options and update your ledger.
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={16} className="text-slate-400 shrink-0 mt-0.5" />
              <div className="text-[10px] text-slate-500 leading-relaxed font-medium">
                Contact the registrar office if you need to check a due date, payment status, or receipt.
              </div>
            </div>
          </div>
        </div>
      </div>

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
