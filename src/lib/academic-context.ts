/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

export const ACADEMIC_CONTEXT_LIMITS = {
  maxQueries: 12,
  maxRows: 50,
  maxContextChars: 2500,
  academicWindowDays: 180,
  queryTimeoutMs: 2000,
  maxSubjects: 12,
  maxTimetableSlots: 12,
  maxAssignments: 12,
  maxGrades: 12,
  maxAnnouncements: 5,
  maxChildren: 3,
} as const;

export type AcademicContextProfile = {
  id: string;
  role: string;
  institution_id: string | null;
  department_id?: string | null;
  name: string;
};

type QueryResult = { data: any; error: any };
type QueryFn = () => PromiseLike<QueryResult>;

const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Student",
  FACULTY: "Faculty",
  HOD: "Head of Department",
  PROGRAM_HEAD: "Program Head",
  INSTITUTION_ADMIN: "Institution Admin",
  ORG_ADMIN: "Organisation Admin",
  SUPER_ADMIN: "Super Admin",
  PARENT: "Parent",
};

function cutoffDate(): string {
  const date = new Date();
  date.setUTCDate(
    date.getUTCDate() - ACADEMIC_CONTEXT_LIMITS.academicWindowDays,
  );
  return date.toISOString().slice(0, 10);
}

function clip(value: unknown, max: number): string {
  return Array.from(String(value ?? ""), (character) =>
    character.charCodeAt(0) >= 32 || "\n\r\t".includes(character)
      ? character
      : "",
  )
    .join("")
    .trim()
    .slice(0, max);
}

export function boundAcademicContext(lines: string[]): string | null {
  const output: string[] = [];
  let size = 0;
  for (const line of lines) {
    const cleanLine = Array.from(line, (character) =>
      character.charCodeAt(0) >= 32 || "\n\r\t".includes(character)
        ? character
        : "",
    ).join("");
    const next = `${cleanLine}\n`;
    if (size + next.length > ACADEMIC_CONTEXT_LIMITS.maxContextChars) break;
    output.push(cleanLine);
    size += next.length;
  }
  const text = output.join("\n").trim();
  return text || null;
}

async function safeQuery(
  label: string,
  fn: QueryFn,
  state: { queries: number; rows: number },
): Promise<any[] | Record<string, any> | null> {
  if (state.queries >= ACADEMIC_CONTEXT_LIMITS.maxQueries) return null;
  state.queries += 1;
  try {
    const result = await Promise.race([
      Promise.resolve(fn()),
      new Promise<QueryResult>((resolve) =>
        setTimeout(
          () => resolve({ data: null, error: new Error("timeout") }),
          ACADEMIC_CONTEXT_LIMITS.queryTimeoutMs,
        ),
      ),
    ]);
    if (result.error) {
      console.error(
        `[chatbot-context] ${label} failed: ${clip(result.error.message, 160)}`,
      );
      return null;
    }
    if (Array.isArray(result.data)) {
      state.rows += result.data.length;
      if (state.rows > ACADEMIC_CONTEXT_LIMITS.maxRows)
        return result.data.slice(
          0,
          Math.max(
            0,
            ACADEMIC_CONTEXT_LIMITS.maxRows - (state.rows - result.data.length),
          ),
        );
    }
    return result.data;
  } catch {
    console.error(`[chatbot-context] ${label} threw`);
    return null;
  }
}

async function departmentLines(
  supabase: SupabaseClient,
  profile: AcademicContextProfile,
  state: { queries: number; rows: number },
): Promise<string[]> {
  if (!profile.department_id) return [];
  const [dept, hod] = await Promise.all([
    safeQuery(
      "department",
      () =>
        supabase
          .from("departments")
          .select("name")
          .eq("id", profile.department_id)
          .maybeSingle(),
      state,
    ),
    safeQuery(
      "department head",
      () =>
        supabase
          .from("users")
          .select("name")
          .eq("department_id", profile.department_id)
          .eq("role", "HOD")
          .neq("id", profile.id)
          .limit(1),
      state,
    ),
  ]);
  const lines: string[] = [];
  if (dept && !Array.isArray(dept) && dept.name)
    lines.push(`- Department: ${clip(dept.name, 80)}`);
  if (Array.isArray(hod) && hod[0]?.name)
    lines.push(`- Department Head: ${clip(hod[0].name, 80)}`);
  return lines;
}

async function studentContext(
  supabase: SupabaseClient,
  profile: AcademicContextProfile,
  state: { queries: number; rows: number },
): Promise<string[]> {
  const student = await safeQuery(
    "student profile",
    () =>
      supabase
        .from("students")
        .select(
          "section_id, semester, program_id, section:section_id(name), program:program_id(name, department_id)",
        )
        .eq("id", profile.id)
        .maybeSingle(),
    state,
  );
  if (!student || Array.isArray(student)) return [];
  const sectionId = student.section_id;
  const semester = student.semester;
  const programId = student.program_id;
  const [dept, subjects, slots, attendance, grades, assignments, submissions] =
    await Promise.all([
      departmentLines(
        supabase,
        {
          ...profile,
          department_id:
            student.program?.department_id ?? profile.department_id,
        },
        state,
      ),
      safeQuery(
        "student subjects",
        () =>
          supabase
            .from("subjects")
            .select("name, code, credits")
            .eq("program_id", programId)
            .eq("semester", semester)
            .order("code")
            .limit(ACADEMIC_CONTEXT_LIMITS.maxSubjects),
        state,
      ),
      safeQuery(
        "student timetable",
        () =>
          supabase
            .from("timetable_slots")
            .select(
              "day, period, subjects(name, code), faculty:faculty_id(name)",
            )
            .eq("institution_id", profile.institution_id)
            .eq("section_id", sectionId)
            .eq("semester", semester)
            .order("day")
            .order("period")
            .limit(ACADEMIC_CONTEXT_LIMITS.maxTimetableSlots),
        state,
      ),
      safeQuery(
        "student attendance summary",
        () =>
          supabase.rpc("get_student_attendance_summary", {
            p_student_id: profile.id,
            p_since: cutoffDate(),
            p_limit: ACADEMIC_CONTEXT_LIMITS.maxSubjects,
          }),
        state,
      ),
      safeQuery(
        "student grades",
        () =>
          supabase
            .from("submissions")
            .select(
              "grade, feedback, status, submitted_at, assignment:assignment_id(title, max_score, type, subjects(name, code))",
            )
            .eq("student_id", profile.id)
            .eq("status", "graded")
            .order("submitted_at", { ascending: false })
            .limit(ACADEMIC_CONTEXT_LIMITS.maxGrades),
        state,
      ),
      sectionId
        ? safeQuery(
            "section assignments",
            () =>
              supabase
                .from("assignments")
                .select(
                  "id, title, due_date, max_score, type, subjects(name, code)",
                )
                .contains("section_ids", [sectionId])
                .order("due_date")
                .limit(ACADEMIC_CONTEXT_LIMITS.maxAssignments),
            state,
          )
        : Promise.resolve(null),
      safeQuery(
        "student submissions",
        () =>
          supabase
            .from("submissions")
            .select("assignment_id")
            .eq("student_id", profile.id)
            .limit(ACADEMIC_CONTEXT_LIMITS.maxAssignments),
        state,
      ),
    ]);
  const lines = [
    `\nAcademic Details:`,
    `- Program: ${clip(student.program?.name || "N/A", 80)}`,
    `- Section: ${clip(student.section?.name || "N/A", 50)}`,
    `- Semester: ${student.semester ?? "N/A"}`,
    ...dept,
  ];
  if (Array.isArray(subjects) && subjects.length)
    lines.push(
      "\nCourses/Subjects:",
      ...subjects.map(
        (s: any) =>
          `- ${clip(s.name, 70)} (${clip(s.code || "No Code", 20)}) [Credits: ${s.credits || 0}]`,
      ),
    );
  if (Array.isArray(slots) && slots.length)
    lines.push(
      "\nTimetable:",
      ...slots.map(
        (s: any) =>
          `- ${clip(s.day, 15)}, Period ${s.period}: ${clip(s.subjects?.name || "Free Period", 70)}${s.faculty?.name ? ` taught by ${clip(s.faculty.name, 60)}` : ""}`,
      ),
    );
  if (Array.isArray(attendance) && attendance.length)
    lines.push(
      "\nAttendance (last 180 days):",
      ...attendance.map(
        (v: any) =>
          `- ${clip(v.subject_name, 70)} (${clip(v.subject_code || "", 20)}): ${v.total_count ? ((v.present_count / v.total_count) * 100).toFixed(1) : "0"}% (${v.present_count}/${v.total_count})`,
      ),
    );
  if (Array.isArray(grades) && grades.length)
    lines.push(
      "\nGraded Assignments:",
      ...grades.map(
        (s: any) =>
          `- ${clip(s.assignment?.title, 80)} (${clip(s.assignment?.subjects?.name || "Unknown subject", 60)}): ${s.grade}/${s.assignment?.max_score}${s.feedback ? ` — ${clip(s.feedback, 120)}` : ""}`,
      ),
    );
  if (Array.isArray(assignments) && assignments.length) {
    const submitted = new Set(
      (submissions || []).map((s: any) => s.assignment_id),
    );
    const pending = assignments.filter((a: any) => !submitted.has(a.id));
    if (pending.length)
      lines.push(
        "\nPending Assignments:",
        ...pending.map(
          (a: any) =>
            `- ${clip(a.title, 80)} (${clip(a.subjects?.name || "Unknown subject", 60)}) — Due: ${a.due_date ? new Date(a.due_date).toISOString() : "No due date"}${a.due_date && new Date(a.due_date) < new Date() ? " [OVERDUE]" : ""}`,
        ),
      );
  }
  return lines;
}

async function facultyContext(
  supabase: SupabaseClient,
  profile: AcademicContextProfile,
  state: { queries: number; rows: number },
): Promise<string[]> {
  const [taught, slots, assignments, attendance] = await Promise.all([
    safeQuery(
      "faculty subjects",
      () =>
        supabase
          .from("faculty_subjects")
          .select(
            "semester, academic_year, subject:subject_id(name, code), section:section_id(name)",
          )
          .eq("faculty_id", profile.id)
          .limit(ACADEMIC_CONTEXT_LIMITS.maxSubjects),
      state,
    ),
    safeQuery(
      "faculty timetable",
      () =>
        supabase
          .from("timetable_slots")
          .select("day, period, subjects(name, code), section:section_id(name)")
          .eq("faculty_id", profile.id)
          .order("day")
          .order("period")
          .limit(ACADEMIC_CONTEXT_LIMITS.maxTimetableSlots),
      state,
    ),
    safeQuery(
      "faculty assignments",
      () =>
        supabase
          .from("assignments")
          .select("id, title, subjects(name)")
          .eq("faculty_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(ACADEMIC_CONTEXT_LIMITS.maxAssignments),
      state,
    ),
    safeQuery(
      "faculty attendance summary",
      () =>
        supabase.rpc("get_faculty_attendance_summary", {
          p_faculty_id: profile.id,
          p_since: cutoffDate(),
          p_limit: ACADEMIC_CONTEXT_LIMITS.maxSubjects,
        }),
      state,
    ),
  ]);
  const lines = [
    `\nDepartment Affiliation:`,
    ...(await departmentLines(supabase, profile, state)),
  ];
  if (Array.isArray(taught) && taught.length)
    lines.push(
      "\nSubjects Taught:",
      ...taught.map(
        (s: any) =>
          `- ${clip(s.subject?.name, 70)} (${clip(s.subject?.code || "", 20)})`,
      ),
    );
  if (Array.isArray(slots) && slots.length)
    lines.push(
      "\nTeaching Schedule:",
      ...slots.map(
        (s: any) =>
          `- ${clip(s.day, 15)}, Period ${s.period}: ${clip(s.subjects?.name || "Class", 70)}${s.section?.name ? ` for ${clip(s.section.name, 50)}` : ""}`,
      ),
    );
  if (Array.isArray(assignments) && assignments.length)
    lines.push(
      "\nAssignments:",
      ...assignments.map(
        (a: any) =>
          `- ${clip(a.title, 80)} (${clip(a.subjects?.name || "Unknown subject", 60)})`,
      ),
    );
  if (Array.isArray(attendance) && attendance.length)
    lines.push(
      "\nAttendance Overview (last 180 days):",
      ...attendance.map(
        (v: any) =>
          `- ${clip(v.subject_name, 70)}: ${v.total_count ? ((v.present_count / v.total_count) * 100).toFixed(1) : "0"}% (${v.present_count}/${v.total_count})`,
      ),
    );
  return lines;
}

async function parentContext(
  supabase: SupabaseClient,
  profile: AcademicContextProfile,
  state: { queries: number; rows: number },
): Promise<string[]> {
  const children = await safeQuery(
    "parent academic context",
    () =>
      supabase.rpc("get_parent_academic_context", {
        p_parent_id: profile.id,
        p_since: cutoffDate(),
        p_limit: ACADEMIC_CONTEXT_LIMITS.maxChildren,
      }),
    state,
  );
  if (!Array.isArray(children)) return [];
  const lines: string[] = [];
  for (const child of children) {
    lines.push(
      `\nChild: ${clip(child.child_name, 80)}${child.relationship ? ` (${clip(child.relationship, 40)})` : ""}`,
      `- Program: ${clip(child.program_name || "N/A", 70)}`,
      `- Section: ${clip(child.section_name || "N/A", 50)}`,
      `- Semester: ${child.semester ?? "N/A"}`,
    );
    if (Array.isArray(child.attendance) && child.attendance.length)
      lines.push(
        "- Attendance:",
        ...child.attendance.map(
          (v: any) =>
            `  - ${clip(v.subject_name, 60)}: ${v.total_count ? ((v.present_count / v.total_count) * 100).toFixed(1) : "0"}% (${v.present_count}/${v.total_count})`,
        ),
      );
    if (Array.isArray(child.grades) && child.grades.length)
      lines.push(
        "- Graded work:",
        ...child.grades.map(
          (v: any) =>
            `  - ${clip(v.title, 70)}: ${v.grade}/${v.max_score}${v.feedback ? ` — ${clip(v.feedback, 100)}` : ""}`,
        ),
      );
    if (
      Array.isArray(child.pending_assignments) &&
      child.pending_assignments.length
    )
      lines.push(
        "- Pending work:",
        ...child.pending_assignments.map(
          (v: any) =>
            `  - ${clip(v.title, 70)} — Due: ${v.due_date ? new Date(v.due_date).toISOString() : "No due date"}`,
        ),
      );
    if (Array.isArray(child.timetable) && child.timetable.length)
      lines.push(
        "- Timetable:",
        ...child.timetable.map(
          (v: any) =>
            `  - ${clip(v.day, 15)}, Period ${v.period}: ${clip(v.subject_name || "Class", 60)}`,
        ),
      );
  }
  return lines;
}

async function announcements(
  supabase: SupabaseClient,
  profile: AcademicContextProfile,
  state: { queries: number; rows: number },
): Promise<string[]> {
  const rows = await safeQuery(
    "announcements",
    () =>
      supabase
        .from("subject_announcements")
        .select("title, content, created_at, subjects(name)")
        .eq("institution_id", profile.institution_id)
        .order("created_at", { ascending: false })
        .limit(ACADEMIC_CONTEXT_LIMITS.maxAnnouncements),
    state,
  );
  if (!Array.isArray(rows)) return [];
  return [
    "\nRecent Notices:",
    ...rows.map(
      (a: any) =>
        `- ${clip(a.title, 80)}: ${clip(a.content, 220)}${a.subjects?.name ? ` [${clip(a.subjects.name, 60)}]` : ""} (${new Date(a.created_at).toISOString().slice(0, 10)})`,
    ),
  ];
}

export async function fetchAcademicContext(
  supabase: SupabaseClient,
  profile: AcademicContextProfile,
): Promise<string | null> {
  const state = { queries: 0, rows: 0 };
  const roleLines =
    profile.role === "STUDENT"
      ? studentContext(supabase, profile, state)
      : ["FACULTY", "HOD", "PROGRAM_HEAD"].includes(profile.role)
        ? facultyContext(supabase, profile, state)
        : profile.role === "PARENT"
          ? parentContext(supabase, profile, state)
          : Promise.resolve([]);
  const [academic, noticeLines] = await Promise.all([
    roleLines,
    announcements(supabase, profile, state),
  ]);
  // Email is intentionally absent: the model only needs the effective role/name
  // and academic facts to answer the chatbot request.
  return boundAcademicContext([
    "User Profile Summary:",
    `- Name: ${clip(profile.name, 80)}`,
    `- Role: ${ROLE_LABELS[profile.role] ?? clip(profile.role, 40)}`,
    ...academic,
    ...noticeLines,
  ]);
}
