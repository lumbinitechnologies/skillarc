"use client"

import { useCallback, useEffect, useState } from "react"
import { Search, Plus, X, Loader2, Printer } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import InvoicePrintModal from "@/modules/billing/components/InvoicePrintModal"
import { useDashboardSession } from "@/components/dashboard-session-provider"

type Invoice = {
  id: string
  amount_due: number | string
  due_date: string
  status: string
}

type BillingPlan = {
  id: string
  studentId: string
  studentName: string
  program: string
  total: number
  paid: number
  installments: Array<{
    id: string
    amount: number
    due: string
    status: string
  }>
}

type StudentOption = {
  id: string
  name: string
  email: string
  institution_id: string
}

export default function BillingPage() {
  const session = useDashboardSession()
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [search, setSearch] = useState("")
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [printInvoiceData, setPrintInvoiceData] = useState<any | null>(null)

  // Create Plan Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [allStudents, setAllStudents] = useState<StudentOption[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [totalAmountInput, setTotalAmountInput] = useState("15000")
  const [installmentCount, setInstallmentCount] = useState(3)
  const [isCreatingPlan, setIsCreatingPlan] = useState(false)

  const selectedPlan = plans.find((p) => p.id === selectedPlanId)

  // Fetch payment plans and invoices from DB
  const loadBillingData = useCallback(async () => {
    try {
      setLoading(true)
      if (!session?.institution_id) return

      const { data, error } = await supabase
        .from("payment_plans")
        .select("id, total_amount, student_id")
        .eq("institution_id", session.institution_id)
        .order("created_at", { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        const studentIds = data.map(p => p.student_id)
        const [studentsResult, usersResult] = await Promise.all([
          studentIds.length
            ? supabase.from("students").select("id, program_id").in("id", studentIds)
            : Promise.resolve({ data: [] }),
          studentIds.length
            ? supabase.from("users").select("id, name").in("id", studentIds)
            : Promise.resolve({ data: [] }),
        ])
        const students = studentsResult.data ?? []
        const users = usersResult.data ?? []

        const programIds = Array.from(new Set((students || []).map(s => s.program_id).filter(Boolean))) as string[]
        const planIds = data.map(p => p.id)
        const [programsResult, invoicesResult] = await Promise.all([
          programIds.length
            ? supabase.from("programs").select("id, name").in("id", programIds)
            : Promise.resolve({ data: [] }),
          planIds.length
            ? supabase
                .from("invoices")
                .select("id, payment_plan_id, amount_due, due_date, status")
                .in("payment_plan_id", planIds)
                .order("due_date", { ascending: true })
            : Promise.resolve({ data: [] }),
        ])
        const programs = programsResult.data ?? []
        const invoices = invoicesResult.data ?? []

        const formatted = data.map((d: any) => {
          const student = (students || []).find(s => s.id === d.student_id)
          const user = (users || []).find(u => u.id === d.student_id)
          const program = (programs || []).find(p => p.id === student?.program_id)
          const planInvoices = (invoices || []).filter(i => i.payment_plan_id === d.id)
          
          const paidAmt = planInvoices
            .filter((inv: any) => inv.status === "PAID")
            .reduce((s: number, inv: any) => s + Number(inv.amount_due), 0)
          
          return {
            id: d.id,
            studentId: d.student_id,
            studentName: user?.name || "Student",
            program: program?.name || "Enrolled Program",
            total: Number(d.total_amount),
            paid: paidAmt,
            installments: planInvoices.map((inv: any) => ({
              id: inv.id,
              amount: Number(inv.amount_due),
              due: inv.due_date,
              status: inv.status,
            })),
          }
        })
        setPlans(formatted)
        setSelectedPlanId((current) => {
          if (current) return current
          return formatted.length > 0 ? formatted[0].id : null
        })
      } else {
        setPlans([])
        setSelectedPlanId(null)
      }
    } catch (err: unknown) {
      console.error("Failed to load billing:", err instanceof Error ? err.message : err)
      setPlans([])
      setSelectedPlanId(null)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBillingData()
  }, [loadBillingData])

  // Fetch student options for Create Plan modal
  const openCreateModal = async () => {
    setShowCreateModal(true)
    try {
      if (!session?.institution_id) return

      const { data: studentsRes } = await supabase
        .from("students")
        .select("id")
        .eq("institution_id", session.institution_id)

      const sIds = (studentsRes || []).map(s => s.id)
      if (sIds.length > 0) {
        const { data: usersRes } = await supabase
          .from("users")
          .select("id, name, email, institution_id")
          .in("id", sIds)
          .order("name")

        setAllStudents((usersRes || []) as StudentOption[])
        if (usersRes && usersRes.length > 0) {
          setSelectedStudentId(usersRes[0].id)
        }
      }
    } catch (err) {
      console.error("Failed to load students for plan creation:", err)
    }
  }

  // Handle dynamic creation of payment plan & invoices
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentId) return
    const totalFee = Number(totalAmountInput)
    if (isNaN(totalFee) || totalFee <= 0) return

    setIsCreatingPlan(true)
    try {
      if (!session?.institution_id) return

      // Insert payment plan
      const { data: newPlan, error: planErr } = await supabase
        .from("payment_plans")
        .insert({
          student_id: selectedStudentId,
          institution_id: session.institution_id,
          total_amount: totalFee,
        })
        .select()
        .single()

      if (planErr) throw planErr

      if (newPlan) {
        // Calculate dynamic installments
        const baseAmount = Math.floor(totalFee / installmentCount)
        const remainder = totalFee - (baseAmount * installmentCount)
        const today = new Date()

        const invoicesToInsert = Array.from({ length: installmentCount }).map((_, idx) => {
          const amt = idx === 0 ? baseAmount + remainder : baseAmount
          const dueDate = new Date(today.getFullYear(), today.getMonth() + (idx * 2), 15).toISOString().split("T")[0]
          return {
            payment_plan_id: newPlan.id,
            amount_due: amt,
            due_date: dueDate,
            status: "UNPAID",
          }
        })

        await supabase.from("invoices").insert(invoicesToInsert)

        setShowCreateModal(false)
        await loadBillingData()
        setSelectedPlanId(newPlan.id)
      }
    } catch (err) {
      console.error("Failed to create plan:", err)
      alert("Error creating payment plan.")
    } finally {
      setIsCreatingPlan(false)
    }
  }

  // Record payment installment live in DB with dynamic amount
  const handleMarkPaid = async (inv: { id: string; amount: number }) => {
    try {
      setPlans((prev) =>
        prev.map((plan) => {
          const foundInv = plan.installments.find((i) => i.id === inv.id)
          if (foundInv) {
            const updatedInvs = plan.installments.map((i) =>
              i.id === inv.id ? { ...i, status: "PAID" } : i
            )
            const newPaid = updatedInvs
              .filter((i) => i.status === "PAID")
              .reduce((s: number, i) => s + i.amount, 0)
            return {
              ...plan,
              paid: newPaid,
              installments: updatedInvs,
            }
          }
          return plan
        })
      )

      // Record transaction dynamically
      await supabase.from("payments").insert({
        invoice_id: inv.id,
        amount_paid: inv.amount,
        payment_method: "BANK_TRANSFER",
      })

      // Update invoice status
      await supabase
        .from("invoices")
        .update({ status: "PAID" })
        .eq("id", inv.id)
      
      loadBillingData()
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = plans.filter((p) =>
    p.studentName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 p-6 font-sans">
      <div className="flex flex-col gap-2 rounded-3xl bg-white p-6 border border-slate-100 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">Billing Installment Desk</h1>
          <p className="text-xs text-slate-500 mt-1">Manage payment plans, log student payments, and generate tuition invoices dynamically</p>
        </div>
        <Button
          onClick={openCreateModal}
          className="rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white text-xs font-bold px-4 py-2.5 shadow-sm hover:opacity-95 transition"
        >
          <Plus size={16} className="mr-1.5" /> Create Payment Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plans List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
            <Search size={18} className="text-slate-400 self-center ml-2" />
            <input
              type="text"
              placeholder="Search student ledger..."
              className="w-full text-sm outline-none border-none bg-transparent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#6C63FF] mx-auto" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No billing plans found. Click &quot;Create Payment Plan&quot; to assign a tuition plan to a student.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider pl-6">Student Account</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plan Total</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Paid Amount</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Remaining Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((plan) => (
                    <tr
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${
                        selectedPlanId === plan.id ? "bg-indigo-50/30" : ""
                      }`}
                    >
                      <td className="p-4 pl-6">
                        <div className="font-semibold text-slate-800 text-sm">{plan.studentName}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{plan.program}</div>
                      </td>
                      <td className="p-4 text-xs font-bold font-['Space_Grotesk'] text-slate-700">₹{plan.total.toLocaleString()}</td>
                      <td className="p-4 text-xs font-bold font-['Space_Grotesk'] text-emerald-600">₹{plan.paid.toLocaleString()}</td>
                      <td className="p-4 text-xs font-bold font-['Space_Grotesk'] text-rose-600">₹{(plan.total - plan.paid).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Ledger Installments View */}
        <div className="space-y-6">
          {selectedPlan ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Ledger Installments</h3>
                <p className="text-xs text-slate-400 mt-1">Track schedules and record transactions</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Student</div>
                <div className="text-sm font-semibold text-slate-800">{selectedPlan.studentName}</div>
                <div className="text-xs text-slate-500 font-medium font-['Space_Grotesk']">Balance Due: ₹{(selectedPlan.total - selectedPlan.paid).toLocaleString()}</div>
              </div>

              <div className="space-y-3">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Installments Schedule</div>
                {selectedPlan.installments.map((inv, idx) => (
                  <div key={inv.id} className="p-3.5 border border-slate-100 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-xs font-bold text-slate-700">Installment #{idx + 1}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Due: {inv.due}</div>
                      </div>
                      <span className={`text-[10px] font-bold py-0.5 px-2 rounded-md ${
                        inv.status === "PAID" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      }`}>
                        {inv.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-50">
                      <span className="text-sm font-extrabold font-['Space_Grotesk'] text-slate-800">₹{inv.amount.toLocaleString()}</span>
                      {inv.status === "UNPAID" ? (
                        <button
                          onClick={() => handleMarkPaid(inv)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition shadow-xs"
                        >
                          Record Payment
                        </button>
                      ) : (
                        <button
                          onClick={() => setPrintInvoiceData({
                            invoiceId: inv.id,
                            amount: inv.amount,
                            dueDate: inv.due,
                            installmentNumber: idx + 1,
                            studentName: selectedPlan.studentName,
                            studentEmail: `${selectedPlan.studentName.toLowerCase().replace(/\s+/g, '')}@skillarc.edu`,
                            studentId: selectedPlan.studentId,
                            remainingBalance: selectedPlan.total - selectedPlan.paid,
                            paymentMethod: "Bank Transfer / Counter Deposit",
                          })}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold transition font-sans"
                        >
                          <Printer size={12} className="text-[#6C63FF]" /> Receipt PDF
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center text-slate-400 text-xs">
              Select student ledger to view invoices
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Create Payment Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C63FF]">Finance Registry</span>
                <h2 className="text-lg font-extrabold text-slate-900">Create Tuition Payment Plan</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  required
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C63FF] focus:bg-white transition font-medium"
                >
                  {allStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Total Tuition Fee (₹ INR)</label>
                <input
                  type="number"
                  value={totalAmountInput}
                  onChange={(e) => setTotalAmountInput(e.target.value)}
                  placeholder="e.g. 15000"
                  required
                  min={100}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C63FF] focus:bg-white transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Installments Count</label>
                <select
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(Number(e.target.value))}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C63FF] focus:bg-white transition font-medium"
                >
                  <option value={1}>1 Single Payment</option>
                  <option value={2}>2 Installments</option>
                  <option value={3}>3 Installments</option>
                  <option value={4}>4 Installments</option>
                  <option value={6}>6 Installments</option>
                </select>
              </div>

              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 space-y-1">
                <div className="font-bold">Estimated Breakdown:</div>
                <div>{installmentCount} installments of ~₹{Math.round(Number(totalAmountInput || 0) / installmentCount).toLocaleString()} due bi-monthly.</div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl text-xs font-semibold border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingPlan || !selectedStudentId}
                  className="flex-1 rounded-xl bg-[#6C63FF] hover:bg-[#5b52e0] text-xs font-bold text-white shadow-sm"
                >
                  {isCreatingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create & Issue Plan"}
                </Button>
              </div>
            </form>
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
          paymentMethod={printInvoiceData.paymentMethod}
        />
      )}
    </div>
  )
}
