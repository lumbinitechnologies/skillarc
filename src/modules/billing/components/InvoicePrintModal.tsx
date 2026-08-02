"use client"

import { Printer, X, Download, CheckCircle2, ShieldCheck, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InvoicePrintModalProps {
  isOpen: boolean
  onClose: () => void
  studentName: string
  studentEmail?: string
  studentId?: string
  programName?: string
  institutionName?: string
  invoiceId: string
  txnId?: string
  amount: number
  paymentMethod?: string
  paidDate?: string
  dueDate?: string
  installmentNumber?: number
  remainingBalance?: number
}

export default function InvoicePrintModal({
  isOpen,
  onClose,
  studentName,
  studentEmail = "student@skillarc.edu",
  studentId = "STU-REG-2026",
  programName = "Graduate Program",
  institutionName = "SkillArc Academy",
  invoiceId,
  txnId = `TXN_${Math.floor(100000000 + Math.random() * 900000000)}`,
  amount,
  paymentMethod = "Online Banking / Gateway",
  paidDate = new Date().toLocaleDateString(),
  dueDate = new Date().toLocaleDateString(),
  installmentNumber = 1,
  remainingBalance = 0,
}: InvoicePrintModalProps) {
  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  const receiptNumber = `INV-${invoiceId.slice(0, 8).toUpperCase()}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden my-8 max-h-[90vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:rounded-none print:my-0 print:p-0">
        
        {/* Modal Header Bar (Hidden on print) */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C63FF]">Official Financial Document</span>
              <h2 className="text-lg font-extrabold text-slate-900">Tax Invoice & Fee Receipt</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handlePrint}
              className="rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] text-white text-xs font-bold px-4 py-2 shadow-sm hover:opacity-95 transition"
            >
              <Printer size={15} className="mr-2" /> Print / Save PDF
            </Button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Document Body */}
        <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible font-sans space-y-6" id="printable-invoice-area">
          
          {/* Institution & Invoice Header */}
          <div className="border-b-2 border-slate-900 pb-6 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-7 h-7 rounded-lg bg-[#6C63FF] text-white flex items-center justify-center font-black text-sm">S</span>
                <span className="font-extrabold text-xl text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">{institutionName}</span>
              </div>
              <p className="text-xs text-slate-500">Finance & Student Accounts Registry</p>
              <p className="text-[10px] text-slate-400 mt-0.5">256-Bit SSL Encrypted Ledger Record</p>
            </div>
            <div className="text-right space-y-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={12} /> OFFICIAL RECEIPT (PAID)
              </span>
              <div className="text-xs font-mono font-bold text-slate-800 pt-1">Receipt #: {receiptNumber}</div>
              <div className="text-xs text-slate-500">Issued On: <span className="font-semibold text-slate-700">{paidDate}</span></div>
            </div>
          </div>

          {/* Billed To / Billed By Grid */}
          <div className="grid grid-cols-2 gap-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs print:bg-white print:border-slate-300">
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Student Details</div>
              <div className="font-extrabold text-sm text-slate-900">{studentName}</div>
              <div className="text-slate-600 font-medium">{studentEmail}</div>
              <div className="text-slate-500 font-mono">Reg ID: {studentId}</div>
              <div className="text-slate-500 font-medium">Program: {programName}</div>
            </div>
            <div className="space-y-1 text-right sm:text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Audit</div>
              <div className="font-semibold text-slate-800">Txn Ref: <span className="font-mono font-bold text-[#6C63FF]">{txnId}</span></div>
              <div className="text-slate-600">Method: <span className="font-medium text-slate-800">{paymentMethod}</span></div>
              <div className="text-slate-600">Installment #: <span className="font-medium text-slate-800">Term Installment #{installmentNumber}</span></div>
              <div className="text-slate-600">Due Date: <span className="font-medium text-slate-800">{dueDate}</span></div>
            </div>
          </div>

          {/* Fee Itemization Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden print:border-slate-300">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 print:bg-slate-200">
                  <th className="p-3.5 w-12 text-center border-r border-slate-200">#</th>
                  <th className="p-3.5 border-r border-slate-200">Description</th>
                  <th className="p-3.5 border-r border-slate-200">Transaction Status</th>
                  <th className="p-3.5 text-right font-bold">Amount Paid (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-3.5 text-center font-mono text-slate-500 border-r border-slate-200">1</td>
                  <td className="p-3.5 border-r border-slate-200">
                    <div className="font-bold text-slate-900">Tuition Fee Settlement - Installment #{installmentNumber}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Payment for {programName} academic term</div>
                  </td>
                  <td className="p-3.5 border-r border-slate-200 font-medium text-emerald-700">
                    SETTLED & CLEARED
                  </td>
                  <td className="p-3.5 text-right font-bold font-['Space_Grotesk'] text-slate-900 text-sm">
                    ₹{amount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Amount</span>
                <span className="font-semibold font-['Space_Grotesk'] text-slate-800">₹{amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxes & Educational Surcharge</span>
                <span className="font-semibold text-emerald-600">₹0.00 (Exempt)</span>
              </div>
              <div className="border-t-2 border-slate-900 pt-2 flex justify-between font-extrabold text-sm text-slate-900">
                <span>Total Settled Amount</span>
                <span className="font-['Space_Grotesk'] text-emerald-600 text-base">₹{amount.toLocaleString()}</span>
              </div>
              {remainingBalance > 0 && (
                <div className="flex justify-between text-[11px] text-rose-600 font-bold pt-1 border-t border-slate-100">
                  <span>Remaining Ledger Balance</span>
                  <span className="font-['Space_Grotesk']">₹{remainingBalance.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Verification & Signatures */}
          <div className="pt-8 grid grid-cols-2 gap-12 text-xs border-t border-slate-200 mt-6 print:break-inside-avoid">
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-indigo-900 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 text-[10px] font-medium">
                <ShieldCheck size={16} className="text-[#6C63FF] shrink-0" />
                This is a computer-generated official tax invoice and fee payment receipt. No physical signature is required.
              </div>
            </div>
            <div className="space-y-8 text-right flex flex-col items-end">
              <div className="h-10 border-b border-dashed border-slate-400 w-48"></div>
              <div>
                <p className="font-bold text-slate-800">Finance Registrar & Accounts Officer</p>
                <p className="text-[10px] text-slate-500">{institutionName} Student Registry</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Embedded CSS for Print Styling */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice-area, #printable-invoice-area * {
            visibility: visible;
          }
          #printable-invoice-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  )
}
