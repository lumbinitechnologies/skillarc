"use client"

import { useState, useEffect } from "react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { STUDENT_DOCUMENT_CATEGORIES, type StudentDocument } from "@/modules/students/types/document.types"
import type { StudentProfile } from "@/modules/students/types/profile.types"
import type { StudentWithSection } from "@/modules/students/types/student.types"

interface StudentDrawerProps {
  open: boolean
  student: StudentWithSection | null
  onClose: () => void
}

export default function StudentDrawer({
  open,
  student,
  onClose,
}: StudentDrawerProps) {
  const [guardian, setGuardian] = useState<{ parent?: { name?: string; phone?: string; email?: string }; relationship?: string } | null>(null)
  const [isLoadingGuardian, setIsLoadingGuardian] = useState(false)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [documents, setDocuments] = useState<StudentDocument[]>([])
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState("")
  const [profileSaved, setProfileSaved] = useState(false)
  const [isSavingTimeline, setIsSavingTimeline] = useState(false)
  const [documentBusy, setDocumentBusy] = useState(false)
  const [portalAccess, setPortalAccess] = useState<{
    status: "NOT_INVITED" | "INVITED" | "ACTIVE" | "DEACTIVATED"
    last_invited_at: string | null
    activated_at: string | null
  } | null>(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const [portalError, setPortalError] = useState("")

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

  useEffect(() => {
    if (!student?.id) return
    Promise.all([
      fetch(`/api/students/${student.id}/profile`).then((response) => response.ok ? response.json() : null),
      fetch(`/api/students/${student.id}/documents`).then((response) => response.ok ? response.json() : { documents: [] }),
      fetch(`/api/students/${student.id}/portal-access`).then((response) => response.ok ? response.json() : { access: null }),
    ]).then(([nextProfile, nextDocuments, nextPortal]) => {
      setProfile(nextProfile)
      setDocuments(nextDocuments.documents ?? [])
      setPortalAccess(nextPortal.access ?? null)
    }).catch((error) => console.error("Failed to load student profile", error))
  }, [student?.id])

  async function changePortalAccess(action: "invite" | "resend" | "deactivate") {
    if (!student?.id) return
    setPortalBusy(true)
    setPortalError("")
    try {
      const response = await fetch(`/api/students/${student.id}/portal-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Portal access action failed")
      setPortalAccess(result.access)
    } catch (error) {
      setPortalError(error instanceof Error ? error.message : "Portal access action failed")
    } finally {
      setPortalBusy(false)
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!student?.id || !profile) return
    setIsSavingProfile(true)
    setProfileError("")
    setProfileSaved(false)
    const form = new FormData(event.currentTarget)
    const address = (type: "RESIDENTIAL" | "POSTAL") => {
      const prefix = type.toLowerCase()
      const existing = profile.addresses.find((item) => item.type === type)
      const value = (field: string) => form.get(`${prefix}_${field}`)?.toString().trim() ?? ""
      if (!value("address_line_1") && !value("locality") && !value("postal_code") && !value("country")) return null
      return {
        ...(existing?.id ? { id: existing.id } : {}), type,
        address_line_1: value("address_line_1"), address_line_2: value("address_line_2") || null,
        locality: value("locality"), state_province: value("state_province") || null,
        postal_code: value("postal_code"), country: value("country"), is_current: true,
      }
    }
    const emergency_contacts = Array.from({ length: 3 }, (_, index) => {
      const existing = profile.emergency_contacts[index]
      const value = (field: string) => form.get(`emergency_${index}_${field}`)?.toString().trim() ?? ""
      if (!value("name") && !value("relationship") && !value("email") && !value("phone")) return null
      return {
        ...(existing?.id ? { id: existing.id } : {}), name: value("name"), relationship: value("relationship"),
        email: value("email") || null, phone: value("phone") || null, address: value("address") || null,
        priority: Number(value("priority") || index + 1), is_primary: index === 0,
      }
    }).filter((contact): contact is NonNullable<typeof contact> => Boolean(contact))

    try {
      const result = await fetch(`/api/students/${student.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: { name: form.get("name"), phone: form.get("phone") || null },
          academic: { registration_number: form.get("registration_number") || null, admission_year: form.get("admission_year") ? Number(form.get("admission_year")) : null, dob: form.get("dob") || null, gender: form.get("gender") || null },
          details: {
            citizenship: form.get("citizenship") || null, country_of_birth: form.get("country_of_birth") || null,
            passport_number: form.get("passport_number") || null, passport_country: form.get("passport_country") || null,
            passport_expiry: form.get("passport_expiry") || null, visa_type: form.get("visa_type") || null,
            visa_number: form.get("visa_number") || null, visa_expiry: form.get("visa_expiry") || null,
            english_evidence_type: form.get("english_evidence_type") || null, english_evidence_reference: form.get("english_evidence_reference") || null,
            english_evidence_date: form.get("english_evidence_date") || null, usi: form.get("usi") || null,
            other_identifiers: form.get("other_identifiers") ? { value: form.get("other_identifiers") } : null,
            education_agent_id: form.get("education_agent_id") || null, marketing_staff_id: form.get("marketing_staff_id") || null,
          },
          addresses: [address("RESIDENTIAL"), address("POSTAL")].filter(Boolean),
          emergency_contacts,
        }),
      })
      const data = await result.json()
      if (!result.ok) throw new Error(data.error || "Profile update failed")
      setProfile(data)
      setProfileSaved(true)
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Profile update failed")
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function saveTimeline(event: React.FormEvent<HTMLFormElement>, type: "note" | "communication") {
    event.preventDefault()
    if (!student?.id) return
    setIsSavingTimeline(true)
    const form = new FormData(event.currentTarget)
    const payload = type === "note"
      ? { note: { body: form.get("body")?.toString().trim() } }
      : { communication: { summary: form.get("summary")?.toString().trim(), channel: form.get("channel")?.toString().trim() } }
    try {
      const response = await fetch(`/api/students/${student.id}/profile`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Timeline update failed")
      setProfile(data)
      event.currentTarget.reset()
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Timeline update failed")
    } finally {
      setIsSavingTimeline(false)
    }
  }

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
            <TabsTrigger value="documents"  className="rounded-md text-sm data-[state=active]:bg-muted">Documents</TabsTrigger>
            <TabsTrigger value="portal" className="rounded-md text-sm data-[state=active]:bg-muted">Portal</TabsTrigger>
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

            {profile ? profile.access_scope === "ACADEMIC_STAFF" ? <div className="space-y-4"><p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Academic staff can view identity and academic placement only.</p><div className="grid grid-cols-2 gap-3"><InfoCard label="Name" value={profile.identity.name} /><InfoCard label="Email" value={profile.identity.email} /><InfoCard label="Program" value={student.section?.program?.name} /><InfoCard label="Semester" value={profile.academic.semester ? `Semester ${profile.academic.semester}` : null} /></div></div> : <form key={profile.identity.id} onSubmit={saveProfile} className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name" name="name" defaultValue={profile.identity.name} />
                <Field label="Phone" name="phone" defaultValue={profile.identity.phone ?? ""} />
                <Field label="Date of birth" name="dob" type="date" defaultValue={profile.academic.dob ?? ""} />
                <Field label="Gender" name="gender" defaultValue={profile.academic.gender ?? ""} />
                <Field label="Registration number" name="registration_number" defaultValue={profile.academic.registration_number ?? ""} />
                <Field label="Admission year" name="admission_year" type="number" defaultValue={profile.academic.admission_year?.toString() ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InfoCard label="Program" value={student.section?.program?.name} />
                <InfoCard label="Semester" value={profile.academic.semester ? `Semester ${profile.academic.semester}` : null} />
              </div>
              <ProfileGroup title="Immigration and identifiers">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Citizenship" name="citizenship" defaultValue={profile.details?.citizenship ?? ""} />
                  <Field label="Country of birth" name="country_of_birth" defaultValue={profile.details?.country_of_birth ?? ""} />
                  <Field label="Passport number" name="passport_number" defaultValue={profile.details?.passport_number ?? ""} />
                  <Field label="Passport country" name="passport_country" defaultValue={profile.details?.passport_country ?? ""} />
                  <Field label="Passport expiry" name="passport_expiry" type="date" defaultValue={profile.details?.passport_expiry ?? ""} />
                  <Field label="Visa type" name="visa_type" defaultValue={profile.details?.visa_type ?? ""} />
                  <Field label="Visa number" name="visa_number" defaultValue={profile.details?.visa_number ?? ""} />
                  <Field label="Visa expiry" name="visa_expiry" type="date" defaultValue={profile.details?.visa_expiry ?? ""} />
                  <Field label="English evidence type" name="english_evidence_type" defaultValue={profile.details?.english_evidence_type ?? ""} />
                  <Field label="English evidence reference" name="english_evidence_reference" defaultValue={profile.details?.english_evidence_reference ?? ""} />
                  <Field label="English evidence date" name="english_evidence_date" type="date" defaultValue={profile.details?.english_evidence_date ?? ""} />
                  <Field label="USI" name="usi" defaultValue={profile.details?.usi ?? ""} />
                  <Field label="Other identifiers" name="other_identifiers" defaultValue={profile.details?.other_identifiers ? Object.values(profile.details.other_identifiers).join(", ") : ""} />
                  <label className="block rounded-xl border p-3"><span className="block text-xs uppercase tracking-wide text-muted-foreground">Education agent</span><select name="education_agent_id" defaultValue={profile.details?.education_agent_id ?? ""} className="mt-1 w-full bg-transparent text-sm outline-none"><option value="">Unassigned</option>{profile.options?.education_agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label>
                  <label className="block rounded-xl border p-3"><span className="block text-xs uppercase tracking-wide text-muted-foreground">Marketing staff</span><select name="marketing_staff_id" defaultValue={profile.details?.marketing_staff_id ?? ""} className="mt-1 w-full bg-transparent text-sm outline-none"><option value="">Unassigned</option>{profile.options?.marketing_staff.map((staff) => <option key={staff.id} value={staff.id}>{staff.name} · {staff.email}</option>)}</select></label>
                </div>
              </ProfileGroup>
              <ProfileGroup title="Addresses">
                {(["RESIDENTIAL", "POSTAL"] as const).map((type) => {
                  const address = (profile.addresses ?? []).find((item) => item.type === type)
                  const prefix = type.toLowerCase()
                  return <div key={type} className="space-y-2 rounded-xl border p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{type.toLowerCase()}</p><div className="grid grid-cols-2 gap-2"><Field label="Address line 1" name={`${prefix}_address_line_1`} defaultValue={address?.address_line_1 ?? ""} /><Field label="Address line 2" name={`${prefix}_address_line_2`} defaultValue={address?.address_line_2 ?? ""} /><Field label="Locality" name={`${prefix}_locality`} defaultValue={address?.locality ?? ""} /><Field label="State/province" name={`${prefix}_state_province`} defaultValue={address?.state_province ?? ""} /><Field label="Postal code" name={`${prefix}_postal_code`} defaultValue={address?.postal_code ?? ""} /><Field label="Country" name={`${prefix}_country`} defaultValue={address?.country ?? ""} /></div></div>
                })}
              </ProfileGroup>
              <ProfileGroup title="Emergency contacts">
                {Array.from({ length: Math.max(1, Math.min(3, (profile.emergency_contacts ?? []).length + 1)) }, (_, index) => {
                  const contact = (profile.emergency_contacts ?? [])[index]
                  return <div key={index} className="space-y-2 rounded-xl border p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact {index + 1}</p><div className="grid grid-cols-2 gap-2"><Field label="Name" name={`emergency_${index}_name`} defaultValue={contact?.name ?? ""} /><Field label="Relationship" name={`emergency_${index}_relationship`} defaultValue={contact?.relationship ?? ""} /><Field label="Email" name={`emergency_${index}_email`} defaultValue={contact?.email ?? ""} /><Field label="Phone" name={`emergency_${index}_phone`} defaultValue={contact?.phone ?? ""} /><Field label="Address" name={`emergency_${index}_address`} defaultValue={contact?.address ?? ""} /><Field label="Priority" name={`emergency_${index}_priority`} type="number" defaultValue={contact?.priority?.toString() ?? `${index + 1}`} /></div></div>
                })}
              </ProfileGroup>
              {profileError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{profileError}</p>}
              {profileSaved && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">Profile saved.</p>}
              <button disabled={isSavingProfile} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{isSavingProfile ? "Saving…" : "Save profile"}</button>
            </form> : <Placeholder label="Loading profile…" />}

          </TabsContent>

          <TabsContent value="documents" className="flex-1 overflow-y-auto p-6 mt-0">
            {profile?.access_scope === "ACADEMIC_STAFF" ? <Placeholder label="Document access is restricted to the student and authorized administrators." /> : <DocumentsPanel studentId={student.id} documents={documents} setDocuments={setDocuments} busy={documentBusy} setBusy={setDocumentBusy} />}
          </TabsContent>

          <TabsContent value="portal" className="flex-1 overflow-y-auto p-6 mt-0">
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-base">Student portal access</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Invitation and activation are separate audited steps.</p>
              </div>
              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current status</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{portalAccess?.status ?? "NOT_INVITED"}</p>
                {portalAccess?.last_invited_at && <p className="mt-1 text-xs text-slate-500">Last invited {new Date(portalAccess.last_invited_at).toLocaleString()}</p>}
                {portalAccess?.activated_at && <p className="mt-1 text-xs text-slate-500">Activated {new Date(portalAccess.activated_at).toLocaleString()}</p>}
              </div>
              {portalError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{portalError}</p>}
              <div className="flex flex-wrap gap-2">
                <button disabled={portalBusy || portalAccess?.status === "ACTIVE"} onClick={() => changePortalAccess(portalAccess?.status === "INVITED" ? "resend" : "invite")} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {portalBusy ? "Working…" : portalAccess?.status === "INVITED" ? "Resend invitation" : "Send invitation"}
                </button>
                {(portalAccess?.status === "ACTIVE" || portalAccess?.status === "INVITED") && <button disabled={portalBusy} onClick={() => changePortalAccess("deactivate")} className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50">Deactivate</button>}
              </div>
              <p className="text-xs text-slate-500">The account becomes active only after the Supabase Auth callback succeeds. No invitation token is stored here.</p>
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
              {profile?.access_scope !== "ACADEMIC_STAFF" && <><form onSubmit={(event) => void saveTimeline(event, "note")} className="space-y-2 rounded-xl border p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add note</p><textarea name="body" required maxLength={4000} placeholder="Internal note" className="min-h-20 w-full rounded-md border p-2 text-sm" /><button disabled={isSavingTimeline} className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Save note</button></form><form onSubmit={(event) => void saveTimeline(event, "communication")} className="space-y-2 rounded-xl border p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add communication</p><div className="grid grid-cols-2 gap-2"><Field label="Channel" name="channel" defaultValue="EMAIL" /><Field label="Summary" name="summary" defaultValue="" /></div><button disabled={isSavingTimeline} className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Save communication</button></form></>}
              {profile?.activity?.length ? profile.activity.map((event) => <ActivityItem key={event.id} label={event.action} date={new Date(event.created_at).toLocaleString()} />) : <Placeholder label="No recorded activity." />}
            </div>
          </TabsContent>

        </Tabs>

      </div>
    </>
  )
}

// ── Small reusable pieces ────────────────────────────────────────────────────

function InfoCard({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold text-sm">{value ?? "-"}</p>
    </div>
  )
}

function Field({ label, name, type = "text", defaultValue }: { label: string; name: string; type?: string; defaultValue: string }) {
  return <label className="block rounded-xl border p-3"><span className="block text-xs uppercase tracking-wide text-muted-foreground">{label}</span><input name={name} type={type} defaultValue={defaultValue} className="mt-1 w-full bg-transparent text-sm outline-none" /></label>
}

function ProfileGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3 rounded-2xl bg-slate-50/70 p-3"><h3 className="text-sm font-semibold text-slate-800">{title}</h3>{children}</section>
}

function DocumentsPanel({ studentId, documents, setDocuments, busy, setBusy }: { studentId: string; documents: StudentDocument[]; setDocuments: (docs: StudentDocument[]) => void; busy: boolean; setBusy: (busy: boolean) => void }) {
  const [category, setCategory] = useState<typeof STUDENT_DOCUMENT_CATEGORIES[number]>("OTHER_SUPPORTING_EVIDENCE")
  const [filterCategory, setFilterCategory] = useState("ALL")
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [title, setTitle] = useState("")
  const [error, setError] = useState("")

  async function reload() {
    const response = await fetch(`/api/students/${studentId}/documents`)
    if (!response.ok) throw new Error("Unable to refresh documents")
    const data = await response.json()
    setDocuments(data.documents ?? [])
  }

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const file = new FormData(event.currentTarget).get("file")
    if (!(file instanceof File) || !title.trim()) return
    setBusy(true)
    setError("")
    try {
      const body = new FormData()
      body.set("file", file)
      body.set("category", category)
      body.set("title", title.trim())
      const latest = documents.find((document) => document.category === category && document.title === title.trim() && ["PENDING", "APPROVED"].includes(document.status))
      if (latest?.application_id) body.set("application_id", latest.application_id)
      if (latest?.application_document_id) body.set("application_document_id", latest.application_document_id)
      const response = await fetch(`/api/students/${studentId}/documents`, { method: "POST", body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Document upload failed")
      await reload()
      event.currentTarget.reset()
      setTitle("")
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Document upload failed")
    } finally {
      setBusy(false)
    }
  }

  async function review(document: StudentDocument, status: string) {
    setBusy(true)
    setError("")
    try {
      const response = await fetch(`/api/students/${studentId}/documents/${document.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Document review failed")
      await reload()
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Document review failed")
    } finally {
      setBusy(false)
    }
  }

  async function download(document: StudentDocument) {
    setError("")
    try {
      const response = await fetch(`/api/students/${studentId}/documents/${document.id}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Unable to create download link")
      window.open(data.url, "_blank", "noopener,noreferrer")
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download document")
    }
  }

  const filteredDocuments = documents.filter((document) => (filterCategory === "ALL" || document.category === filterCategory) && (filterStatus === "ALL" || document.status === filterStatus))
  return <div className="space-y-5"><div><h3 className="font-semibold">Supporting documents</h3><p className="mt-1 text-sm text-muted-foreground">Uploads are private, versioned, and remain available for audit.</p></div>
    <form onSubmit={upload} className="space-y-2 rounded-xl border p-4"><div className="flex gap-2"><select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className="min-w-0 flex-1 rounded-md border bg-white px-2 py-2 text-sm">{STUDENT_DOCUMENT_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Document title" className="min-w-0 flex-1 rounded-md border px-2 py-2 text-sm" /></div><input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/heic,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required className="block w-full text-sm" /><button disabled={busy} className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Upload document</button></form>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex gap-2"><select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)} className="min-w-0 flex-1 rounded-md border px-2 py-2 text-xs"><option value="ALL">All categories</option>{STUDENT_DOCUMENT_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="rounded-md border px-2 py-2 text-xs"><option value="ALL">All statuses</option>{["PENDING", "APPROVED", "REJECTED", "EXPIRED", "ARCHIVED"].map((item) => <option key={item}>{item}</option>)}</select></div>
    <div className="space-y-3">{filteredDocuments.length === 0 ? <Placeholder label={documents.length === 0 ? "No documents uploaded yet." : "No documents match these filters."} /> : filteredDocuments.map((document) => <div key={document.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-sm">{document.title}</p><p className="text-xs text-muted-foreground">{document.category} · version {document.version} · {document.original_filename}</p>{document.application_id && <p className="text-xs text-muted-foreground">Linked application: {document.application_id}</p>}{document.review_feedback && <p className="mt-2 text-xs text-slate-600">Review feedback: {document.review_feedback}</p>}</div><span className="rounded-full bg-muted px-2 py-1 text-xs">{document.status}</span></div><div className="mt-3 flex gap-2"><button onClick={() => void download(document)} className="text-xs text-violet-700 underline">Download</button>{document.status === "PENDING" && <><button onClick={() => void review(document, "APPROVED")} disabled={busy} className="text-xs text-green-700">Approve</button><button onClick={() => void review(document, "REJECTED")} disabled={busy} className="text-xs text-red-700">Reject</button></>}</div></div>)}</div></div>
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
