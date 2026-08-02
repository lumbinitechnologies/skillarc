import { redirect } from "next/navigation"
import { BookOpen, Mail, School, UserCircle2 } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"

export const dynamic = "force-dynamic"

export default async function FacultyProfilePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, role, institution_id, created_at")
    .eq("id", user.id)
    .single()

  if (!profile || ![ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD].includes(profile.role)) redirect("/dashboard")

  const { data: institution } = await supabase
    .from("institutions")
    .select("name")
    .eq("id", profile.institution_id)
    .single()

  const { data: assignmentRows } = await supabase
    .from("faculty_subjects")
    .select("subject_id")
    .eq("faculty_id", user.id)

  const assignedSubjectIds = new Set(
    ((assignmentRows ?? []).map((row: any) => row.subject_id).filter(Boolean) as string[]),
  )

  const { data: subjectsData = [] } = await supabase
    .from("subjects")
    .select("id, name, faculty_id")
    .eq("institution_id", profile?.institution_id)
    .order("name")

  const subjects = Array.isArray(subjectsData)
    ? subjectsData.filter((subject: any) => subject.faculty_id === user.id || assignedSubjectIds.has(subject.id))
    : []

  const { data: timetableRows = [] } = await supabase
    .from("timetable_slots")
    .select("section_id, sections!inner(name)")
    .eq("institution_id", profile.institution_id)
    .eq("faculty_id", user.id)

  const sectionNames = Array.from(
    new Set(
      (timetableRows as Array<any>)
        .map((slot) => slot.sections?.name)
        .filter(Boolean) as string[],
    ),
  )

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <p style={{ margin: 0, color: "#4f46e5", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 12 }}>
          Faculty profile
        </p>
        <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, color: "#111827" }}>
          {profile.name ?? "Faculty member"}
        </h1>
        <p style={{ margin: "6px 0 0", color: "#6b7280", maxWidth: 640 }}>
          Manage your teaching details and keep track of the classes and subjects tied to your account.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <div style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", borderRadius: 20, padding: 22, color: "#fff", boxShadow: "0 12px 30px rgba(79,70,229,0.18)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.85 }}>Profile</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{profile.name ?? "Faculty member"}</div>
            </div>
            <UserCircle2 size={28} />
          </div>
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Mail size={16} />
            <span>{profile.email ?? "Email unavailable"}</span>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #ece7ff", borderRadius: 20, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#4f46e5", fontWeight: 700 }}>
            <School size={18} />
            Institution
          </div>
          <div style={{ marginTop: 12, fontSize: 18, fontWeight: 700, color: "#111827" }}>{institution?.name ?? "Institution"}</div>
          <p style={{ margin: "8px 0 0", color: "#6b7280" }}>Your account is linked to this institution and its academic structure.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <div style={{ background: "#fff", border: "1px solid #ece7ff", borderRadius: 20, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#4f46e5", fontWeight: 700 }}>
            <BookOpen size={18} />
            Assigned subjects
          </div>
          <div style={{ marginTop: 10, fontSize: 30, fontWeight: 800, color: "#111827" }}>{subjects.length}</div>
          <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
            {subjects.length > 0 ? "Active teaching assignments are available for review." : "No subjects are assigned yet."}
          </p>
        </div>

        <div style={{ background: "#fff", border: "1px solid #ece7ff", borderRadius: 20, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#4f46e5", fontWeight: 700 }}>
            <UserCircle2 size={18} />
            Sections in schedule
          </div>
          <div style={{ marginTop: 10, fontSize: 30, fontWeight: 800, color: "#111827" }}>{sectionNames.length}</div>
          <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
            {sectionNames.length > 0 ? sectionNames.join(", ") : "No section allocations are available yet."}
          </p>
        </div>
      </div>
    </div>
  )
}
