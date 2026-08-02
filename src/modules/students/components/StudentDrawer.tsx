"use client"

import { useState, useEffect } from "react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

interface StudentDrawerProps {
  open: boolean
  student: any | null
  onClose: () => void
}

export default function StudentDrawer({
  open,
  student,
  onClose,
}: StudentDrawerProps) {
  const [guardian, setGuardian] = useState<any>(null)
  const [isLoadingGuardian, setIsLoadingGuardian] = useState(false)

  useEffect(() => {
    async function getGuardian() {
      if (!student?.id) return
      setIsLoadingGuardian(true)
      try {
        const res = await fetch(`/api/parents/relations?student_id=${student.id}`)
        if (res.ok) {
          const data = await res.json()
          if (data && data.length > 0) {
            setGuardian(data[0])
          } else {
            setGuardian(null)
          }
        }
      } catch (err) {
        console.error("Failed to load guardian:", err)
      } finally {
        setIsLoadingGuardian(false)
      }
    }
    getGuardian()
  }, [student])

  if (!open || !student) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-screen w-[560px] bg-white shadow-2xl border-l flex flex-col">

        {/* Header */}
        <div className="border-b px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-violet-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
              {student.name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">{student.name}</h2>
              <p className="text-sm text-muted-foreground">{student.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="flex flex-col flex-1 min-h-0">

          <TabsList className="shrink-0 w-full justify-start rounded-none border-b bg-transparent px-6 gap-1 h-11">
            <TabsTrigger value="profile"    className="rounded-md text-sm data-[state=active]:bg-muted">Profile</TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-md text-sm data-[state=active]:bg-muted">Attendance</TabsTrigger>
            <TabsTrigger value="subjects"   className="rounded-md text-sm data-[state=active]:bg-muted">Subjects</TabsTrigger>
            <TabsTrigger value="guardian"   className="rounded-md text-sm data-[state=active]:bg-muted">Guardian</TabsTrigger>
            <TabsTrigger value="activity"   className="rounded-md text-sm data-[state=active]:bg-muted">Activity</TabsTrigger>
          </TabsList>

          {/* ── Profile ── */}
          <TabsContent value="profile" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">

            {/* Large avatar + name block */}
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-full bg-violet-600 text-white flex items-center justify-center text-3xl font-bold shrink-0">
                {student.name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-2xl font-semibold">{student.name}</h3>
                <p className="text-muted-foreground text-sm">{student.email}</p>
                <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium
                  ${student.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                  }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${student.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                  {student.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              <InfoCard label="Registration No" value={student.registration_number} />
              <InfoCard label="Phone"           value={student.phone} />
              <InfoCard label="Program"         value={student.section?.program?.name} />
              <InfoCard label="Semester"        value={student.semester ? `Semester ${student.semester}` : null} />
              <InfoCard label="Section"         value={student.section?.name} />
              <InfoCard label="Admission Year"  value={student.admission_year} />
            </div>

          </TabsContent>

          {/* ── Attendance ── */}
          <TabsContent value="attendance" className="flex-1 overflow-y-auto p-6 mt-0">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base">Overall Attendance</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Attendance summary across all subjects</p>
              </div>
              <Placeholder label="Attendance data will appear here once sessions are marked." />
            </div>
          </TabsContent>

          {/* ── Subjects ── */}
          <TabsContent value="subjects" className="flex-1 overflow-y-auto p-6 mt-0">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base">Assigned Subjects</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Subjects enrolled for this semester</p>
              </div>
              <Placeholder label="Subject assignments will appear here once configured." />
            </div>
          </TabsContent>

          {/* ── Guardian ── */}
          <TabsContent value="guardian" className="flex-1 overflow-y-auto p-6 mt-0">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base">Guardian / Parent</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Primary contact information</p>
              </div>
              {isLoadingGuardian ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-violet-600" />
                </div>
              ) : guardian ? (
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard label="Parent Name"  value={guardian.parent?.name} />
                  <InfoCard label="Phone"        value={guardian.parent?.phone} />
                  <InfoCard label="Email"        value={guardian.parent?.email} />
                  <InfoCard label="Relation"     value={guardian.relationship} />
                </div>
              ) : (
                <Placeholder label="No guardian details linked to this student." />
              )}
            </div>
          </TabsContent>

          {/* ── Activity ── */}
          <TabsContent value="activity" className="flex-1 overflow-y-auto p-6 mt-0">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base">Recent Activity</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Audit trail for this student</p>
              </div>
              <div className="space-y-3">
                <ActivityItem label="Student Created"   date="—" />
                <ActivityItem label="Profile Updated"   date="—" />
                <ActivityItem label="Attendance Marked" date="—" />
              </div>
              <Placeholder label="Live activity log coming soon." />
            </div>
          </TabsContent>

        </Tabs>

      </div>
    </>
  )
}

// ── Small reusable pieces ────────────────────────────────────────────────────

function InfoCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold text-sm">{value ?? "-"}</p>
    </div>
  )
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function ActivityItem({ label, date }: { label: string; date: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-4">
      <div className="h-2 w-2 rounded-full bg-violet-400 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="text-xs text-muted-foreground">{date}</p>
    </div>
  )
}