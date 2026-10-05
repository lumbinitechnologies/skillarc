"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CreditCard, CheckCircle2, AlertTriangle, Clock } from "lucide-react"
import { PageShell, PageHeader, itemVariants } from "@/components/ui/page-shell"

interface FeeRecord {
  id: string
  feeType: string
  description: string
  amount: number
  paidAmount: number
  dueDate: string | null
  status: string
  createdAt: string
}

interface ChildWithBilling {
  id: string
  name: string
  relationship: string
  programName: string
  semester: number | null
  records: FeeRecord[]
  stats: { totalDue: number; totalPaid: number; outstanding: number; overdue: number }
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 18 } } }

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  PAID: { label: "Paid", cls: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  PENDING: { label: "Pending", cls: "bg-amber-50 text-amber-600 border-amber-100", icon: <Clock className="h-3.5 w-3.5" /> },
  OVERDUE: { label: "Overdue", cls: "bg-red-50 text-red-600 border-red-100", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  PARTIAL: { label: "Partial", cls: "bg-blue-50 text-blue-600 border-blue-100", icon: <CreditCard className="h-3.5 w-3.5" /> },
}

function fmt(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
}

export default function ParentBillingClient({
  parentName,
  children,
}: {
  parentName: string
  children: ChildWithBilling[]
}) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const child = children[selectedIdx] ?? null

  return (
    <PageShell>
      <PageHeader
        icon={<CreditCard className="h-5 w-5" />}
        eyebrow="Parent Portal"
        title="Fees & Billing"
        subtitle="Track fee payment status and outstanding dues for your child."
        actions={
          children.length > 1 ? (
            <select
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(Number(e.target.value))}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[var(--primary)] transition"
            >
              {children.map((c, i) => <option key={c.id} value={i}>{c.name}</option>)}
            </select>
          ) : undefined
        }
      />

      {!child ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <CreditCard className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No student linked yet.</p>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={child.id} variants={container} initial="hidden" animate="show" className="space-y-5">
            {/* Student bar */}
            <motion.div variants={item} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-3.5 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-black text-sm">{child.name.charAt(0)}</div>
              <div>
                <p className="text-sm font-bold text-slate-900">{child.name}</p>
                <p className="text-[11px] text-slate-400">{child.relationship} · {child.programName}</p>
              </div>
            </motion.div>

            {/* Summary cards */}
            <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Fees", val: fmt(child.stats.totalDue), cls: "border-slate-100 bg-white", textCls: "text-slate-900" },
                { label: "Paid", val: fmt(child.stats.totalPaid), cls: "border-emerald-100 bg-emerald-50", textCls: "text-emerald-700" },
                { label: "Outstanding", val: fmt(child.stats.outstanding), cls: child.stats.outstanding > 0 ? "border-red-100 bg-red-50" : "border-emerald-100 bg-emerald-50", textCls: child.stats.outstanding > 0 ? "text-red-600" : "text-emerald-600" },
                { label: "Overdue Items", val: child.stats.overdue.toString(), cls: child.stats.overdue > 0 ? "border-red-100 bg-red-50" : "border-slate-100 bg-white", textCls: child.stats.overdue > 0 ? "text-red-600" : "text-slate-600" },
              ].map(({ label, val, cls, textCls }) => (
                <div key={label} className={`rounded-2xl border p-4 shadow-sm ${cls}`}>
                  <p className={`text-xl font-black font-['Space_Grotesk'] ${textCls}`}>{val}</p>
                  <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </motion.div>

            {/* Payment progress */}
            {child.stats.totalDue > 0 && (
              <motion.div variants={item} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-slate-700">Payment Progress</p>
                  <p className="text-sm font-black text-slate-900 font-['Space_Grotesk']">
                    {Math.round((child.stats.totalPaid / child.stats.totalDue) * 100)}%
                  </p>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${Math.min(100, (child.stats.totalPaid / child.stats.totalDue) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-[11px] text-slate-400 font-medium">
                  <span>Paid: {fmt(child.stats.totalPaid)}</span>
                  <span>Total: {fmt(child.stats.totalDue)}</span>
                </div>
              </motion.div>
            )}

            {/* Fee records */}
            <motion.div variants={item} className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">Billing</p>
                <h2 className="mt-0.5 text-base font-bold text-slate-900">Fee Records ({child.records.length})</h2>
              </div>

              {child.records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <CreditCard className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-400">No fee records found.</p>
                  <p className="text-xs text-slate-400 mt-1">Contact the institution for billing details.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {child.records.map((r) => {
                    const isOverdue = r.status === "PENDING" && r.dueDate && new Date(r.dueDate) < new Date()
                    const displayStatus = isOverdue ? "OVERDUE" : r.status
                    const sc = STATUS_CONFIG[displayStatus] ?? STATUS_CONFIG.PENDING
                    return (
                      <div key={r.id} className="flex items-center gap-4 px-6 py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/8 text-[var(--primary)]">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900">{r.feeType}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                            {r.description && <p className="text-[11px] text-slate-400">{r.description}</p>}
                            {r.dueDate && <p className={`text-[11px] font-medium ${isOverdue ? "text-red-500" : "text-slate-400"}`}>Due: {new Date(r.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <p className="text-base font-black text-slate-900 font-['Space_Grotesk']">{fmt(r.amount)}</p>
                          <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${sc.cls}`}>
                            {sc.icon} {sc.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </PageShell>
  )
}
