import { getParentContext } from "@/lib/parent-context"
import ParentBillingClient from "./billing-client"

export const dynamic = "force-dynamic"

export default async function ParentBillingPage() {
  const { profile, children, admin } = await getParentContext()

  const studentIds = children.map((c) => c.id)

  // Correct schema: payment_plans → invoices (same as student billing + admin billing desk)
  const plansRes = studentIds.length
    ? await admin
        .from("payment_plans")
        .select(`
          id, student_id, total_amount, created_at,
          invoices(id, amount_due, due_date, status, created_at)
        `)
        .in("student_id", studentIds)
        .order("created_at", { ascending: false })
    : { data: [] }

  const raw = (plansRes.data ?? []) as any[]

  const childBilling = children.map((child) => {
    const plans = raw.filter((p) => p.student_id === child.id)

    const records = plans.flatMap((plan: any) => {
      const invoices = Array.isArray(plan.invoices) ? plan.invoices : plan.invoices ? [plan.invoices] : []
      return invoices.map((inv: any) => ({
        id: inv.id,
        feeType: "Tuition",
        description: "Payment Plan",
        amount: Number(inv.amount_due ?? 0),
        paidAmount: inv.status === "paid" ? Number(inv.amount_due ?? 0) : 0,
        dueDate: inv.due_date ?? null,
        status: (inv.status ?? "PENDING").toUpperCase(),
        createdAt: inv.created_at,
      }))
    })

    const totalDue = records.reduce((a, r) => a + r.amount, 0)
    const totalPaid = records.filter((r) => r.status === "PAID").reduce((a, r) => a + r.amount, 0)
    const outstanding = totalDue - totalPaid
    const overdue = records.filter((r) => r.status !== "PAID" && r.dueDate && new Date(r.dueDate) < new Date()).length

    return { ...child, records, stats: { totalDue, totalPaid, outstanding, overdue } }
  })

  return (
    <ParentBillingClient
      parentName={profile.name ?? "Parent"}
      children={childBilling}
    />
  )
}
