import type { SupabaseClient } from "@supabase/supabase-js"

import { ACADEMIC_CONTEXT_LIMITS, fetchAcademicContext } from "@/lib/academic-context"
import type { AssistantPrincipal, AssistantReadResult, AssistantReadScope, SourceCitation } from "@/lib/assistant/types"

/**
 * The only dashboard-data entry point exposed to assistant orchestration.
 *
 * The existing context builder already contains role-specific queries and
 * bounded output. Keeping it behind this service prevents the model and tools
 * from acquiring a generic Supabase/SQL capability while it is being replaced
 * by narrower read methods.
 */
export async function readAuthorizedDashboard(
  supabase: SupabaseClient,
  principal: AssistantPrincipal,
  scope: AssistantReadScope = "all",
): Promise<AssistantReadResult> {
  if (scope === "profile") {
    return {
      context: [
        "Current SkillArc profile:",
        `- Name: ${principal.name || "Name unavailable"}`,
        `- Role: ${principal.role}`,
        `- User scope: ${principal.userId}`,
        `- Institution scope: ${principal.institutionId ?? "none"}`,
        `- Organisation scope: ${principal.organizationId ?? "none"}`,
        `- Department scope: ${principal.departmentId ?? "none"}`,
      ].join("\n"),
      sources: [{
        id: "current-profile",
        title: "Your SkillArc account profile",
        sourceType: "dashboard",
        href: "/dashboard/account/profile",
      }],
    }
  }

  const academicProfile = {
    id: principal.userId,
    role: principal.role,
    organization_id: principal.organizationId,
    institution_id: principal.institutionId,
    department_id: principal.departmentId,
    name: principal.name || "the current user",
  }
  const context = await fetchAcademicContext(supabase, academicProfile, scope, principal)
  const domain = await readAuthorizedDomainData(supabase, principal, scope)

  return {
    context: [context, domain.context].filter(Boolean).join("\n").slice(0, 6000) || null,
    sources: [...(context
      ? [
          {
            id: "dashboard-context",
            title: "Your SkillArc dashboard",
            sourceType: "dashboard" as const,
            href: "/dashboard",
          },
        ]
      : []), ...domain.sources],
  }
}

async function readAuthorizedDomainData(
  supabase: SupabaseClient,
  principal: AssistantPrincipal,
  scope: AssistantReadScope,
): Promise<AssistantReadResult> {
  const lines: string[] = []
  const sources: SourceCitation[] = []
  const rows = (value: unknown): Record<string, unknown>[] => Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
    : []

  if (["FACULTY", "HOD", "PROGRAM_HEAD"].includes(principal.role) && scope === "faculty_submission_counts") {
    const { data: assignmentData } = await supabase
      .from("assignments")
      .select("id, title, subjects(name)")
      .eq("faculty_id", principal.userId)
      .limit(ACADEMIC_CONTEXT_LIMITS.maxAssignments)
    const assignments = rows(assignmentData)
    const assignmentIds = assignments.map((assignment) => String(assignment.id)).filter(Boolean)
    const { data: submissionData } = assignmentIds.length
      ? await supabase
          .from("submissions")
          .select("assignment_id")
          .in("assignment_id", assignmentIds)
          .limit(ACADEMIC_CONTEXT_LIMITS.maxRows)
      : { data: [] }
    const counts = new Map<string, number>()
    for (const submission of rows(submissionData)) {
      const id = String(submission.assignment_id ?? "")
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    if (!assignments.length) return { context: null, sources: [] }
    return {
      context: [
        "Faculty assignment submission counts:",
        ...assignments.map((assignment) => {
          const subject = assignment.subjects && typeof assignment.subjects === "object"
            ? assignment.subjects as Record<string, unknown>
            : {}
          return `- ${String(assignment.title ?? "Assignment")} (${String(subject.name ?? "Unknown subject")}): ${counts.get(String(assignment.id)) ?? 0} submission${(counts.get(String(assignment.id)) ?? 0) === 1 ? "" : "s"}`
        }),
      ].join("\n").slice(0, 3500),
      sources: [{
        id: "faculty-submission-counts",
        title: "Your SkillArc assignment submissions",
        sourceType: "dashboard",
        href: "/dashboard/faculty/subjects",
      }],
    }
  }

  if (principal.role === "STUDENT" && (scope === "all" || ["admissions", "placements", "project_groups"].includes(scope))) {
    const [admissionResult, placementResult, groupResult] = await Promise.all([
      scope === "all" || scope === "admissions"
        ? supabase
            .from("admissions_applications")
            .select("id, status, program_id, created_at")
            .eq("student_id", principal.userId)
            .eq("institution_id", principal.institutionId)
            .order("created_at", { ascending: false })
            .limit(3)
        : Promise.resolve({ data: [], error: null }),
      scope === "all" || scope === "placements"
        ? supabase
            .from("applications")
            .select("status, job_post:job_post_id!inner(title, deadline, institution_id, company:company_id(name))")
            .eq("student_id", principal.userId)
            .eq("job_post.institution_id", principal.institutionId)
            .limit(12)
        : Promise.resolve({ data: [], error: null }),
      scope === "all" || scope === "project_groups"
        ? supabase
            .from("group_members")
            .select("group_id, project_groups(id, group_name, project:projects(title, faculty_id))")
            .eq("student_id", principal.userId)
            .limit(12)
        : Promise.resolve({ data: [], error: null }),
    ])
    const admissions = rows(admissionResult.data)
    if (admissions.length) {
      lines.push("\nAdmissions:", ...admissions.map((row) => `- Application ${String(row.id)}: ${String(row.status ?? "status unavailable")}`))
      sources.push({ id: "student-admissions", title: "Your SkillArc admissions", sourceType: "dashboard", href: "/dashboard/student" })
    }
    const placements = rows(placementResult.data).filter((row) => {
      const job = row.job_post && typeof row.job_post === "object" ? row.job_post as Record<string, unknown> : null
      return job?.institution_id === principal.institutionId
    })
    if (placements.length) {
      lines.push("\nPlacement applications:", ...placements.map((row) => {
        const job = row.job_post && typeof row.job_post === "object" ? row.job_post as Record<string, unknown> : {}
        const company = job.company && typeof job.company === "object" ? job.company as Record<string, unknown> : {}
        return `- ${String(company.name ?? "Company")} — ${String(job.title ?? "Role")}: ${String(row.status ?? "status unavailable")}`
      }))
      sources.push({ id: "student-placements", title: "Your SkillArc placement applications", sourceType: "dashboard", href: "/dashboard/placements" })
    }
    const groups = rows(groupResult.data)
    if (groups.length) {
      lines.push("\nProject groups:", ...groups.map((row) => {
        const group = row.project_groups && typeof row.project_groups === "object" ? row.project_groups as Record<string, unknown> : {}
        const project = group.project && typeof group.project === "object" ? group.project as Record<string, unknown> : {}
        return `- ${String(project.title ?? "Project")}: ${String(group.group_name ?? "Group")}`
      }))
      sources.push({ id: "student-project-groups", title: "Your SkillArc project groups", sourceType: "dashboard", href: "/dashboard/project-groups" })
    }
  }

  if (["FACULTY", "HOD", "PROGRAM_HEAD"].includes(principal.role) && (scope === "all" || scope === "project_groups")) {
    const { data } = await supabase
      .from("projects")
      .select("id, title, description, created_at, project_groups(id, group_name)")
      .eq("faculty_id", principal.userId)
      .order("created_at", { ascending: false })
      .limit(12)
    const projects = rows(data)
    if (projects.length) {
      lines.push("\nPublished project teams:", ...projects.map((row) => {
        const groups = rows(row.project_groups)
        return `- ${String(row.title ?? "Project")} (${groups.length} group${groups.length === 1 ? "" : "s"})`
      }))
      sources.push({ id: "faculty-project-groups", title: "Your SkillArc project groups", sourceType: "dashboard", href: "/dashboard/project-groups" })
    }
  }

  if (["SUPER_ADMIN", "ORG_ADMIN", "INSTITUTION_ADMIN"].includes(principal.role) && (scope === "all" || ["admissions", "placements"].includes(scope))) {
    const [admissionResult, jobsResult] = await Promise.all([
      scope === "all" || scope === "admissions"
        ? supabase
            .from("admissions_applications")
            .select("status")
            .eq("institution_id", principal.institutionId)
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
      scope === "all" || scope === "placements"
        ? supabase
            .from("job_posts")
            .select("title, deadline, companies(name)")
            .eq("institution_id", principal.institutionId)
            .order("deadline", { ascending: true })
            .limit(20)
        : Promise.resolve({ data: [], error: null }),
    ])
    const admissions = rows(admissionResult.data)
    if (admissions.length) {
      const counts = new Map<string, number>()
      for (const row of admissions) {
        const status = String(row.status ?? "UNKNOWN")
        counts.set(status, (counts.get(status) ?? 0) + 1)
      }
      lines.push("\nAdmission application counts:", ...[...counts.entries()].map(([status, count]) => `- ${status}: ${count}`))
      sources.push({ id: "institution-admissions", title: "Institution admissions dashboard", sourceType: "dashboard", href: "/dashboard/institution-admin" })
    }
    const jobs = rows(jobsResult.data)
    if (jobs.length) {
      lines.push("\nPlacement opportunities:", ...jobs.map((row) => {
        const company = row.companies && typeof row.companies === "object" ? row.companies as Record<string, unknown> : {}
        return `- ${String(company.name ?? "Company")}: ${String(row.title ?? "Role")} (deadline ${String(row.deadline ?? "not specified")})`
      }))
      sources.push({ id: "institution-placements", title: "Institution placement dashboard", sourceType: "dashboard", href: "/dashboard/placements" })
    }
  }

  return { context: lines.join("\n").slice(0, 3500) || null, sources }
}

export async function searchPermittedDocuments(
  supabase: SupabaseClient,
  principal: AssistantPrincipal,
  query: string,
): Promise<AssistantReadResult> {
  if (!principal.organizationId || !principal.institutionId) return { context: null, sources: [] }
  const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 3).slice(0, 4)
  if (!tokens.length) return { context: null, sources: [] }

  const relationships = await getPermittedDocumentRelationships(supabase, principal)

  let request = supabase
    .from("knowledge_chunks")
    .select("id, document_id, chunk_index, content, owner_id, institution_id, department_id, subject_id, section_id, visibility, allowed_roles, document:document_id(title, original_filename, status)")
    .eq("organization_id", principal.organizationId)
    .or(`institution_id.eq.${principal.institutionId},institution_id.is.null`)
    .limit(100)

  // Keyword filtering is the safe compatibility path while the ingestion
  // worker backfills 384-dimensional pgvector embeddings. Ranking remains
  // bounded and all tenant/audience filtering happens before this ranking.
  for (const token of tokens) request = request.ilike("content", `%${token}%`)
  const { data, error } = await request
  if (error || !data) return { context: null, sources: [] }

  const permitted = (data as unknown as Record<string, unknown>[])
    .filter((row) => {
      const visibility = row.visibility
      const roles = Array.isArray(row.allowed_roles) ? row.allowed_roles.map(String) : []
      const audienceAllowed = roles.length === 0 || roles.includes(principal.role)
      const owner = row.owner_id === principal.userId
      const departmentAllowed = visibility !== "department" || row.department_id === principal.departmentId
      const departmentRelationAllowed = Boolean(row.department_id && row.department_id === principal.departmentId)
      const relationshipAllowed = relationships.isBroad || owner || departmentRelationAllowed || (
        (!row.subject_id || relationships.subjectIds.has(String(row.subject_id))) &&
        (!row.section_id || relationships.sectionIds.has(String(row.section_id)))
      )
      const document = row.document && typeof row.document === "object" ? row.document as Record<string, unknown> : {}
      return document.status === "ready" && audienceAllowed && relationshipAllowed && (owner || visibility === "organization" || visibility === "institution" || departmentAllowed)
    })
    .slice(0, 5)

  const sources: SourceCitation[] = permitted.map((row) => {
    const document = row.document && typeof row.document === "object" ? row.document as Record<string, unknown> : {}
    return {
      id: String(row.id),
      title: String(document.title ?? document.original_filename ?? "Academic document"),
      sourceType: "document",
      snippet: String(row.content ?? "").slice(0, 320),
      documentId: String(row.document_id),
      chunkIndex: Number(row.chunk_index ?? 0),
    }
  })

  return {
    context: permitted.length
      ? permitted.map((row) => `[${String(row.document_id)} chunk ${String(row.chunk_index)}]\n${String(row.content ?? "")}`).join("\n\n").slice(0, 6000)
      : null,
    sources,
  }
}

type DocumentRelationships = {
  isBroad: boolean
  subjectIds: Set<string>
  sectionIds: Set<string>
}

/** Resolve relationship markers before document rows reach the model. */
async function getPermittedDocumentRelationships(
  supabase: SupabaseClient,
  principal: AssistantPrincipal,
): Promise<DocumentRelationships> {
  const broadRoles = new Set(["SUPER_ADMIN", "ORG_ADMIN", "INSTITUTION_ADMIN"])
  if (broadRoles.has(principal.role)) return { isBroad: true, subjectIds: new Set(), sectionIds: new Set() }

  const subjectIds = new Set<string>()
  const sectionIds = new Set<string>()
  const addRows = (rows: unknown, subjectKey = "subject_id", sectionKey = "section_id") => {
    if (!Array.isArray(rows)) return
    for (const row of rows) {
      if (!row || typeof row !== "object") continue
      const record = row as Record<string, unknown>
      if (record[subjectKey]) subjectIds.add(String(record[subjectKey]))
      if (record[sectionKey]) sectionIds.add(String(record[sectionKey]))
    }
  }

  if (principal.role === "FACULTY" || principal.role === "HOD" || principal.role === "PROGRAM_HEAD") {
    const { data } = await supabase
      .from("faculty_subjects")
      .select("subject_id, section_id")
      .eq("faculty_id", principal.userId)
      .eq("institution_id", principal.institutionId)
      .limit(100)
    addRows(data)
    return { isBroad: false, subjectIds, sectionIds }
  }

  if (principal.role === "STUDENT") {
    const { data: student } = await supabase
      .from("students")
      .select("program_id, section_id, semester")
      .eq("id", principal.userId)
      .eq("institution_id", principal.institutionId)
      .maybeSingle()
    if (student?.section_id) sectionIds.add(String(student.section_id))
    if (student?.program_id) {
      const subjectQuery = supabase
        .from("subjects")
        .select("id")
        .eq("institution_id", principal.institutionId)
        .eq("program_id", student.program_id)
      const { data: subjects } = student.semester == null ? await subjectQuery : await subjectQuery.eq("semester", student.semester)
      if (Array.isArray(subjects)) subjects.forEach((subject) => subject?.id && subjectIds.add(String(subject.id)))
    }
    return { isBroad: false, subjectIds, sectionIds }
  }

  if (principal.role === "PARENT") {
    const { data: relations } = await supabase
      .from("parent_student_relations")
      .select("student_id")
      .eq("parent_id", principal.userId)
      .limit(20)
    const childIds = (relations ?? []).map((row) => row.student_id).filter(Boolean)
    if (childIds.length) {
      const { data: children } = await supabase
        .from("students")
        .select("program_id, section_id, semester")
        .in("id", childIds)
        .eq("institution_id", principal.institutionId)
        .limit(20)
      for (const child of children ?? []) {
        if (child?.section_id) sectionIds.add(String(child.section_id))
        if (!child?.program_id) continue
        let subjectQuery = supabase
          .from("subjects")
          .select("id")
          .eq("institution_id", principal.institutionId)
          .eq("program_id", child.program_id)
        if (child.semester != null) subjectQuery = subjectQuery.eq("semester", child.semester)
        const { data: subjects } = await subjectQuery
        for (const subject of subjects ?? []) if (subject?.id) subjectIds.add(String(subject.id))
      }
    }
  }

  return { isBroad: false, subjectIds, sectionIds }
}
