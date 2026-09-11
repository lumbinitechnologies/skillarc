/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssistantPrincipal, AssistantReadScope } from "@/lib/assistant/types";

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
  organization_id: string | null;
  institution_id: string | null;
  department_id?: string | null;
  name: string;
};

export type AcademicContextPrincipal = Pick<
  AssistantPrincipal,
  | "userId"
  | "actorUserId"
  | "organizationId"
  | "institutionId"
  | "departmentId"
  | "role"
  | "isImpersonating"
>;

type QueryResult = { data: any; error: any };
type QueryFn = () => PromiseLike<QueryResult>;

function includesScope(scope: AssistantReadScope, ...scopes: AssistantReadScope[]): boolean {
  return scope === "all" || scopes.includes(scope);
}

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

type AttendanceSummary = {
  subject_name: string;
  subject_code: string | null;
  present_count: number;
  total_count: number;
};

function summarizeAttendance(rows: any[], institutionId?: string | null): AttendanceSummary[] {
  const grouped = new Map<string, AttendanceSummary>();
  for (const row of rows) {
    const session = row?.attendance_sessions && typeof row.attendance_sessions === "object"
      ? row.attendance_sessions
      : {};
    const subject = session.subject && typeof session.subject === "object"
      ? session.subject
      : {};
    if (institutionId && subject.institution_id !== institutionId) continue;
    const name = String(subject.name ?? "Unknown subject");
    const code = subject.code == null ? null : String(subject.code);
    const key = `${name}:${code ?? ""}`;
    const summary = grouped.get(key) ?? {
      subject_name: name,
      subject_code: code,
      present_count: 0,
      total_count: 0,
    };
    summary.total_count += 1;
    if (row?.status === "PRESENT" || row?.status === "LATE") summary.present_count += 1;
    grouped.set(key, summary);
  }
  return [...grouped.values()]
    .sort((left, right) => `${left.subject_name}:${left.subject_code ?? ""}`.localeCompare(`${right.subject_name}:${right.subject_code ?? ""}`))
    .slice(0, ACADEMIC_CONTEXT_LIMITS.maxSubjects);
}

async function impersonatedAttendance(
  supabase: SupabaseClient,
  profile: AcademicContextProfile,
  state: { queries: number; rows: number },
  mode: "student" | "faculty",
): Promise<AttendanceSummary[]> {
  const rows = await safeQuery(
    `${mode} attendance summary`,
    () => {
      let query = supabase
        .from("attendance_records")
        .select("status, attendance_sessions!inner(attendance_date, faculty_id, subject:subject_id!inner(name, code, institution_id))")
        .gte("attendance_sessions.attendance_date", cutoffDate())
        .eq("attendance_sessions.subject.institution_id", profile.institution_id)
        .limit(ACADEMIC_CONTEXT_LIMITS.maxRows);
      query = mode === "student"
        ? query.eq("student_id", profile.id)
        : query.eq("attendance_sessions.faculty_id", profile.id);
      return query;
    },
    state,
  );
  return Array.isArray(rows) ? summarizeAttendance(rows, profile.institution_id) : [];
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
          .eq("institution_id", profile.institution_id)
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
          .eq("institution_id", profile.institution_id)
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
  scope: AssistantReadScope,
  useEffectivePrincipal: boolean,
): Promise<string[]> {
  const needsStudentRecord = includesScope(scope, "program_subjects", "timetable", "assignments");
  const student = needsStudentRecord
    ? await safeQuery(
        "student profile",
        () =>
          supabase
            .from("students")
            .select(
              "section_id, semester, program_id, section:section_id(name), program:program_id(name, department_id)",
            )
            .eq("id", profile.id)
            .eq("institution_id", profile.institution_id)
            .maybeSingle(),
        state,
      )
    : null;
  if (needsStudentRecord && (!student || Array.isArray(student))) return [];
  const studentRecord = student && !Array.isArray(student) ? student : null;
  const sectionId = studentRecord?.section_id;
  const semester = studentRecord?.semester;
  const programId = studentRecord?.program_id;
  const [dept, subjects, slots, attendance, grades, assignments, submissions] =
    await Promise.all([
      includesScope(scope, "program_subjects")
        ? departmentLines(
            supabase,
            {
              ...profile,
              department_id:
                studentRecord?.program?.department_id ?? profile.department_id,
            },
            state,
          )
        : Promise.resolve([]),
      includesScope(scope, "program_subjects")
        ? safeQuery(
            "student subjects",
            () =>
              supabase
                .from("subjects")
                .select("name, code, credits")
                .eq("institution_id", profile.institution_id)
                .eq("program_id", programId)
                .eq("semester", semester)
                .order("code")
                .limit(ACADEMIC_CONTEXT_LIMITS.maxSubjects),
            state,
          )
        : Promise.resolve(null),
      includesScope(scope, "timetable")
        ? safeQuery(
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
          )
        : Promise.resolve(null),
      includesScope(scope, "attendance")
        ? useEffectivePrincipal
          ? impersonatedAttendance(supabase, profile, state, "student")
          : safeQuery(
              "student attendance summary",
              () =>
                supabase.rpc("get_student_attendance_summary", {
                  p_student_id: profile.id,
                  p_since: cutoffDate(),
                  p_limit: ACADEMIC_CONTEXT_LIMITS.maxSubjects,
                }),
              state,
            )
        : Promise.resolve(null),
      includesScope(scope, "quizzes_grades")
        ? safeQuery(
            "student grades",
            () =>
              supabase
                .from("submissions")
                .select(
                  "grade, feedback, status, submitted_at, assignment:assignment_id(title, max_score, type, subjects!inner(name, code, institution_id))",
                )
                .eq("student_id", profile.id)
                .eq("status", "graded")
                .eq("assignment.subjects.institution_id", profile.institution_id)
                .order("submitted_at", { ascending: false })
                .limit(ACADEMIC_CONTEXT_LIMITS.maxGrades),
            state,
          )
        : Promise.resolve(null),
      includesScope(scope, "assignments") && sectionId
        ? safeQuery(
            "section assignments",
            () =>
              supabase
                .from("assignments")
                .select(
                  "id, title, due_date, max_score, type, subjects!inner(name, code, institution_id)",
                )
                .eq("subjects.institution_id", profile.institution_id)
                .contains("section_ids", [sectionId])
                .order("due_date")
                .limit(ACADEMIC_CONTEXT_LIMITS.maxAssignments),
            state,
          )
        : Promise.resolve(null),
      includesScope(scope, "assignments")
        ? safeQuery(
            "student submissions",
            () =>
              supabase
                .from("submissions")
                .select("assignment_id")
                .eq("student_id", profile.id)
                .limit(ACADEMIC_CONTEXT_LIMITS.maxAssignments),
            state,
          )
        : Promise.resolve(null),
    ]);
  const lines = [
    ...(studentRecord
      ? [
          `\nAcademic Details:`,
          `- Program: ${clip(studentRecord.program?.name || "N/A", 80)}`,
          `- Section: ${clip(studentRecord.section?.name || "N/A", 50)}`,
          `- Semester: ${studentRecord.semester ?? "N/A"}`,
        ]
      : []),
    ...(includesScope(scope, "program_subjects") ? dept : []),
  ];
  if (includesScope(scope, "program_subjects") && Array.isArray(subjects) && subjects.length)
    lines.push(
      "\nCourses/Subjects:",
      ...subjects.map(
        (s: any) =>
          `- ${clip(s.name, 70)} (${clip(s.code || "No Code", 20)}) [Credits: ${s.credits || 0}]`,
      ),
    );
  if (includesScope(scope, "timetable") && Array.isArray(slots) && slots.length)
    lines.push(
      "\nTimetable:",
      ...slots.map(
        (s: any) =>
          `- ${clip(s.day, 15)}, Period ${s.period}: ${clip(s.subjects?.name || "Free Period", 70)}${s.faculty?.name ? ` taught by ${clip(s.faculty.name, 60)}` : ""}`,
      ),
    );
  if (includesScope(scope, "attendance") && Array.isArray(attendance) && attendance.length)
    lines.push(
      "\nAttendance (last 180 days):",
      ...attendance.map(
        (v: any) =>
          `- ${clip(v.subject_name, 70)} (${clip(v.subject_code || "", 20)}): ${v.total_count ? ((v.present_count / v.total_count) * 100).toFixed(1) : "0"}% (${v.present_count}/${v.total_count})`,
      ),
    );
  if (includesScope(scope, "quizzes_grades") && Array.isArray(grades) && grades.length)
    lines.push(
      "\nGraded Assignments:",
      ...grades.map(
        (s: any) =>
          `- ${clip(s.assignment?.title, 80)} (${clip(s.assignment?.subjects?.name || "Unknown subject", 60)}): ${s.grade}/${s.assignment?.max_score}${s.feedback ? ` — ${clip(s.feedback, 120)}` : ""}`,
      ),
    );
  if (includesScope(scope, "assignments") && Array.isArray(assignments) && assignments.length) {
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
  scope: AssistantReadScope,
  useEffectivePrincipal: boolean,
): Promise<string[]> {
  const [taught, slots, assignments, attendance] = await Promise.all([
    includesScope(scope, "program_subjects", "faculty_sections")
      ? safeQuery(
          "faculty subjects",
          () =>
            supabase
              .from("faculty_subjects")
              .select(
                "semester, academic_year, subject:subject_id(name, code), section:section_id(name)",
              )
              .eq("institution_id", profile.institution_id)
              .eq("faculty_id", profile.id)
              .limit(ACADEMIC_CONTEXT_LIMITS.maxSubjects),
          state,
        )
      : Promise.resolve(null),
    includesScope(scope, "timetable")
      ? safeQuery(
          "faculty timetable",
          () =>
            supabase
              .from("timetable_slots")
              .select("day, period, subjects(name, code), section:section_id(name)")
              .eq("institution_id", profile.institution_id)
              .eq("faculty_id", profile.id)
              .order("day")
              .order("period")
              .limit(ACADEMIC_CONTEXT_LIMITS.maxTimetableSlots),
          state,
        )
      : Promise.resolve(null),
    includesScope(scope, "assignments")
      ? safeQuery(
          "faculty assignments",
          () =>
            supabase
              .from("assignments")
              .select("id, title, subjects!inner(name, institution_id)")
              .eq("faculty_id", profile.id)
              .eq("subjects.institution_id", profile.institution_id)
              .order("created_at", { ascending: false })
              .limit(ACADEMIC_CONTEXT_LIMITS.maxAssignments),
          state,
        )
      : Promise.resolve(null),
      includesScope(scope, "attendance")
        ? useEffectivePrincipal
          ? impersonatedAttendance(supabase, profile, state, "faculty")
          : safeQuery(
              "faculty attendance summary",
              () =>
                supabase.rpc("get_faculty_attendance_summary", {
                  p_faculty_id: profile.id,
                  p_since: cutoffDate(),
                  p_limit: ACADEMIC_CONTEXT_LIMITS.maxSubjects,
                }),
              state,
            )
        : Promise.resolve(null),
  ]);
  const lines = [
    `\nDepartment Affiliation:`,
    ...(includesScope(scope, "program_subjects") ? await departmentLines(supabase, profile, state) : []),
  ];
  if (includesScope(scope, "program_subjects", "faculty_sections") && Array.isArray(taught) && taught.length)
    lines.push(
      "\nSubjects Taught:",
      ...taught.map(
        (s: any) =>
          `- ${clip(s.subject?.name, 70)} (${clip(s.subject?.code || "", 20)})`,
      ),
    );
  if (includesScope(scope, "timetable") && Array.isArray(slots) && slots.length)
    lines.push(
      "\nTeaching Schedule:",
      ...slots.map(
        (s: any) =>
          `- ${clip(s.day, 15)}, Period ${s.period}: ${clip(s.subjects?.name || "Class", 70)}${s.section?.name ? ` for ${clip(s.section.name, 50)}` : ""}`,
      ),
    );
  if (includesScope(scope, "assignments") && Array.isArray(assignments) && assignments.length)
    lines.push(
      "\nAssignments:",
      ...assignments.map(
        (a: any) =>
          `- ${clip(a.title, 80)} (${clip(a.subjects?.name || "Unknown subject", 60)})`,
      ),
    );
  if (includesScope(scope, "attendance") && Array.isArray(attendance) && attendance.length)
    lines.push(
      "\nAttendance Overview (last 180 days):",
      ...attendance.map(
        (v: any) =>
          `- ${clip(v.subject_name, 70)}: ${v.total_count ? ((v.present_count / v.total_count) * 100).toFixed(1) : "0"}% (${v.present_count}/${v.total_count})`,
      ),
    );
  return lines;
}

function parentScopeIncludes(scope: AssistantReadScope, requested: AssistantReadScope): boolean {
  return scope === "all" || scope === requested;
}

/**
 * Service-role reads cannot satisfy auth.uid()-based parent RPCs. This path
 * repeats the parent/child and institution checks before aggregating only the
 * display-safe academic fields needed by the assistant.
 */
async function impersonatedParentContext(
  supabase: SupabaseClient,
  profile: AcademicContextProfile,
  state: { queries: number; rows: number },
  scope: AssistantReadScope,
): Promise<string[]> {
  const relationData = await safeQuery(
    "impersonated parent relationships",
    () =>
      supabase
        .from("parent_student_relations")
        .select("student_id, relationship")
        .eq("parent_id", profile.id)
        .limit(ACADEMIC_CONTEXT_LIMITS.maxChildren),
    state,
  );
  const relations = Array.isArray(relationData) ? relationData : [];
  const childIds = relations.map((row) => row?.student_id).filter(Boolean);
  if (!childIds.length) return [];

  const childData = await safeQuery(
    "impersonated parent children",
    () =>
      supabase
        .from("students")
        .select("id, institution_id, section_id, semester, program_id, users!inner(name, role), program:program_id(name), section:section_id(name)")
        .in("id", childIds)
        .eq("institution_id", profile.institution_id)
        .limit(ACADEMIC_CONTEXT_LIMITS.maxChildren),
    state,
  );
  const children = Array.isArray(childData) ? childData : [];
  const validChildren = children.filter((child) => {
    const user = child?.users && typeof child.users === "object" ? child.users : {};
    return user.role === "STUDENT" && child.institution_id === profile.institution_id;
  });
  if (!validChildren.length) return [];

  const validChildIds = validChildren.map((child) => child.id).filter(Boolean);
  const sectionIds = validChildren.map((child) => child.section_id).filter(Boolean);
  const programIds = validChildren.map((child) => child.program_id).filter(Boolean);
  const since = cutoffDate();
  const [subjectsResult, attendanceResult, gradesResult, assignmentsResult, submittedResult, timetableResult] = await Promise.all([
    parentScopeIncludes(scope, "program_subjects") && programIds.length
      ? safeQuery(
          "impersonated parent subjects",
          () =>
            supabase
              .from("subjects")
              .select("id, institution_id, name, code, program_id, semester")
              .eq("institution_id", profile.institution_id)
              .in("program_id", programIds)
              .limit(ACADEMIC_CONTEXT_LIMITS.maxSubjects * ACADEMIC_CONTEXT_LIMITS.maxChildren),
          state,
        )
      : Promise.resolve(null),
    parentScopeIncludes(scope, "attendance")
      ? safeQuery(
          "impersonated parent attendance",
          () =>
            supabase
              .from("attendance_records")
              .select("student_id, status, attendance_sessions!inner(attendance_date, subject:subject_id!inner(name, code, institution_id))")
              .in("student_id", validChildIds)
              .gte("attendance_sessions.attendance_date", since)
              .eq("attendance_sessions.subject.institution_id", profile.institution_id)
              .limit(ACADEMIC_CONTEXT_LIMITS.maxSubjects * ACADEMIC_CONTEXT_LIMITS.maxChildren),
          state,
        )
      : Promise.resolve(null),
    parentScopeIncludes(scope, "quizzes_grades")
      ? safeQuery(
          "impersonated parent grades",
          () =>
            supabase
              .from("submissions")
              .select("student_id, grade, feedback, status, submitted_at, assignment:assignment_id(title, max_score, subjects!inner(name, code, institution_id))")
              .in("student_id", validChildIds)
              .eq("status", "graded")
              .eq("assignment.subjects.institution_id", profile.institution_id)
              .order("submitted_at", { ascending: false })
              .limit(ACADEMIC_CONTEXT_LIMITS.maxGrades * ACADEMIC_CONTEXT_LIMITS.maxChildren),
          state,
        )
      : Promise.resolve(null),
    parentScopeIncludes(scope, "assignments") && sectionIds.length
      ? safeQuery(
          "impersonated parent assignments",
          () =>
            supabase
              .from("assignments")
              .select("id, title, due_date, type, section_ids, subjects!inner(name, code, institution_id)")
              .eq("subjects.institution_id", profile.institution_id)
              .overlaps("section_ids", sectionIds)
              .order("due_date")
              .limit(ACADEMIC_CONTEXT_LIMITS.maxAssignments * ACADEMIC_CONTEXT_LIMITS.maxChildren),
          state,
        )
      : Promise.resolve(null),
    parentScopeIncludes(scope, "assignments")
      ? safeQuery(
          "impersonated parent submissions",
          () =>
            supabase
              .from("submissions")
              .select("student_id, assignment_id")
              .in("student_id", validChildIds)
              .limit(ACADEMIC_CONTEXT_LIMITS.maxAssignments * ACADEMIC_CONTEXT_LIMITS.maxChildren),
          state,
        )
      : Promise.resolve(null),
    parentScopeIncludes(scope, "timetable") && sectionIds.length
      ? safeQuery(
          "impersonated parent timetable",
          () =>
            supabase
              .from("timetable_slots")
              .select("section_id, semester, day, period, subjects!inner(name, code, institution_id)")
              .eq("institution_id", profile.institution_id)
              .eq("subjects.institution_id", profile.institution_id)
              .in("section_id", sectionIds)
              .limit(ACADEMIC_CONTEXT_LIMITS.maxTimetableSlots * ACADEMIC_CONTEXT_LIMITS.maxChildren),
          state,
        )
      : Promise.resolve(null),
  ]);

  const subjects = (Array.isArray(subjectsResult) ? subjectsResult : [])
    .filter((subject) => subject.institution_id === profile.institution_id);
  const attendance = Array.isArray(attendanceResult) ? attendanceResult : [];
  const grades = Array.isArray(gradesResult) ? gradesResult : [];
  const assignments = Array.isArray(assignmentsResult) ? assignmentsResult : [];
  const submitted = Array.isArray(submittedResult) ? submittedResult : [];
  const timetable = Array.isArray(timetableResult) ? timetableResult : [];
  const relationByChild = new Map(relations.map((row) => [row.student_id, row.relationship]));
  const lines: string[] = [
    "User Profile Summary:",
    `- Name: ${clip(profile.name, 80)}`,
    "- Role: Parent",
  ];

  for (const child of validChildren) {
    const user = child.users && typeof child.users === "object" ? child.users : {};
    const program = child.program && typeof child.program === "object" ? child.program : {};
    const section = child.section && typeof child.section === "object" ? child.section : {};
    const relationship = relationByChild.get(child.id);
    if (parentScopeIncludes(scope, "program_subjects")) {
      lines.push(
        `\nChild: ${clip(user.name, 80)}${relationship ? ` (${clip(relationship, 40)})` : ""}`,
        `- Program: ${clip(program.name || "N/A", 70)}`,
        `- Section: ${clip(section.name || "N/A", 50)}`,
        `- Semester: ${child.semester ?? "N/A"}`,
        ...subjects
          .filter((subject) => subject.program_id === child.program_id && (child.semester == null || subject.semester === child.semester))
          .slice(0, ACADEMIC_CONTEXT_LIMITS.maxSubjects)
          .map((subject) => `- Subject: ${clip(subject.name, 70)} (${clip(subject.code || "No code", 20)})`),
      );
    }
    if (parentScopeIncludes(scope, "attendance")) {
      const childAttendance = attendance.filter((row) => row.student_id === child.id);
      const summaries = summarizeAttendance(childAttendance, profile.institution_id);
      if (summaries.length) {
        lines.push(
          "- Attendance:",
          ...summaries.map((item) => `  - ${clip(item.subject_name, 60)}: ${item.total_count ? ((item.present_count / item.total_count) * 100).toFixed(1) : "0"}% (${item.present_count}/${item.total_count})`),
        );
      }
    }
    if (parentScopeIncludes(scope, "quizzes_grades")) {
      const childGrades = grades.filter((row) => row.student_id === child.id && row.assignment?.subjects?.institution_id === profile.institution_id);
      if (childGrades.length) {
        lines.push(
          "- Graded work:",
          ...childGrades.slice(0, ACADEMIC_CONTEXT_LIMITS.maxGrades).map((row) => {
            const assignment = row.assignment && typeof row.assignment === "object" ? row.assignment : {};
            return `  - ${clip(assignment.title || "Assignment", 70)}: ${row.grade ?? "N/A"}/${assignment.max_score ?? "N/A"}${row.feedback ? ` — ${clip(row.feedback, 100)}` : ""}`;
          }),
        );
      }
    }
    if (parentScopeIncludes(scope, "assignments")) {
      const childSubmitted = new Set(submitted.filter((row) => row.student_id === child.id).map((row) => row.assignment_id));
      const pending = assignments.filter((assignment) => assignment.subjects?.institution_id === profile.institution_id && Array.isArray(assignment.section_ids) && assignment.section_ids.includes(child.section_id) && !childSubmitted.has(assignment.id));
      if (pending.length) {
        lines.push(
          "- Pending work:",
          ...pending.slice(0, ACADEMIC_CONTEXT_LIMITS.maxAssignments).map((assignment) => `  - ${clip(assignment.title, 70)} — Due: ${assignment.due_date ? new Date(assignment.due_date).toISOString() : "No due date"}`),
        );
      }
    }
    if (parentScopeIncludes(scope, "timetable")) {
      const childSlots = timetable.filter((slot) => slot.subjects?.institution_id === profile.institution_id && slot.section_id === child.section_id && slot.semester === child.semester);
      if (childSlots.length) {
        lines.push(
          "- Timetable:",
          ...childSlots.slice(0, ACADEMIC_CONTEXT_LIMITS.maxTimetableSlots).map((slot) => {
            const subject = slot.subjects && typeof slot.subjects === "object" ? slot.subjects : {};
            return `  - ${clip(slot.day, 15)}, Period ${slot.period}: ${clip(subject.name || "Class", 60)}`;
          }),
        );
      }
    }
  }
  return lines;
}

async function parentContext(
  supabase: SupabaseClient,
  profile: AcademicContextProfile,
  state: { queries: number; rows: number },
  scope: AssistantReadScope,
): Promise<string[]> {
  const children = await safeQuery(
    "parent academic context",
    () =>
      supabase.rpc(scope === "all" ? "get_parent_academic_context" : "get_parent_academic_context_scoped", {
        p_parent_id: profile.id,
        p_since: cutoffDate(),
        p_limit: ACADEMIC_CONTEXT_LIMITS.maxChildren,
        ...(scope === "all" ? {} : { p_scope: scope }),
      }),
    state,
  );
  if (!Array.isArray(children)) return [];
  const lines: string[] = [];
  for (const child of children) {
    if (includesScope(scope, "program_subjects")) lines.push(
      `\nChild: ${clip(child.child_name, 80)}${child.relationship ? ` (${clip(child.relationship, 40)})` : ""}`,
      `- Program: ${clip(child.program_name || "N/A", 70)}`,
      `- Section: ${clip(child.section_name || "N/A", 50)}`,
      `- Semester: ${child.semester ?? "N/A"}`,
    );
    if (includesScope(scope, "attendance") && Array.isArray(child.attendance) && child.attendance.length)
      lines.push(
        "- Attendance:",
        ...child.attendance.map(
          (v: any) =>
            `  - ${clip(v.subject_name, 60)}: ${v.total_count ? ((v.present_count / v.total_count) * 100).toFixed(1) : "0"}% (${v.present_count}/${v.total_count})`,
        ),
      );
    if (includesScope(scope, "quizzes_grades") && Array.isArray(child.grades) && child.grades.length)
      lines.push(
        "- Graded work:",
        ...child.grades.map(
          (v: any) =>
            `  - ${clip(v.title, 70)}: ${v.grade}/${v.max_score}${v.feedback ? ` — ${clip(v.feedback, 100)}` : ""}`,
        ),
      );
    if (
      includesScope(scope, "assignments") &&
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
    if (includesScope(scope, "timetable") && Array.isArray(child.timetable) && child.timetable.length)
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
        .select("title, description, created_at, subjects!inner(name, institution_id)")
        .eq("subjects.institution_id", profile.institution_id)
        .order("created_at", { ascending: false })
        .limit(ACADEMIC_CONTEXT_LIMITS.maxAnnouncements),
    state,
  );
  if (!Array.isArray(rows)) return [];
  return [
    "\nRecent Notices:",
    ...rows.map(
      (a: any) =>
        `- ${clip(a.title, 80)}: ${clip(a.description, 220)}${a.subjects?.name ? ` [${clip(a.subjects.name, 60)}]` : ""} (${new Date(a.created_at).toISOString().slice(0, 10)})`,
    ),
  ];
}

export async function fetchAcademicContext(
  supabase: SupabaseClient,
  profile: AcademicContextProfile,
  scope: AssistantReadScope = "all",
  principal?: AcademicContextPrincipal,
): Promise<string | null> {
  const impersonated = principal?.isImpersonating === true;
  if (
    impersonated &&
    (!principal ||
      principal.userId !== profile.id ||
      principal.role !== profile.role ||
      principal.organizationId !== profile.organization_id ||
      principal.institutionId !== profile.institution_id ||
      !principal.institutionId ||
      !principal.actorUserId ||
      principal.actorUserId === principal.userId)
  ) {
    console.error("[chatbot-context] invalid impersonated academic principal");
    return null;
  }

  const state = { queries: 0, rows: 0 };
  const roleLines =
    profile.role === "STUDENT"
      ? studentContext(supabase, profile, state, scope, impersonated)
      : ["FACULTY", "HOD", "PROGRAM_HEAD"].includes(profile.role)
        ? facultyContext(supabase, profile, state, scope, impersonated)
        : profile.role === "PARENT"
          ? ["all", "program_subjects", "timetable", "assignments", "quizzes_grades", "attendance"].includes(scope)
            ? impersonated
              ? impersonatedParentContext(supabase, profile, state, scope)
              : parentContext(supabase, profile, state, scope)
            : Promise.resolve([])
          : Promise.resolve([]);
  const [academic, noticeLines] = await Promise.all([
    roleLines,
    includesScope(scope, "announcements_events") ? announcements(supabase, profile, state) : Promise.resolve([]),
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
