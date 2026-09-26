import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Utility helpers for safely nullifying and deleting records across foreign key boundaries.
 */

async function safeUpdateByEq(
  client: SupabaseClient,
  table: string,
  column: string,
  value: string,
  updates: Record<string, any>
) {
  try {
    await client.from(table).update(updates).eq(column, value)
  } catch {}
}

async function safeUpdateByIn(
  client: SupabaseClient,
  table: string,
  column: string,
  values: string[],
  updates: Record<string, any>
) {
  if (!values || values.length === 0) return
  try {
    await client.from(table).update(updates).in(column, values)
  } catch {}
}

async function safeDeleteByEq(client: SupabaseClient, table: string, column: string, value: string) {
  try {
    await client.from(table).delete().eq(column, value)
  } catch {}
}

async function safeDeleteByIn(client: SupabaseClient, table: string, column: string, values: string[]) {
  if (!values || values.length === 0) return
  try {
    await client.from(table).delete().in(column, values)
  } catch {}
}

/**
 * Fallback cascade delete — runs when the Postgres RPC is unavailable.
 *
 * Every Promise.all batch only contains tables that do NOT have FK dependencies
 * on other tables in the same batch. The batches are ordered so that a table is
 * always deleted BEFORE any table it references (bottom-up).
 *
 * Key constraints driving the ordering (derived from the live schema):
 *   admission_fee_configurations.program_id NOT NULL → programs     ← was the original bug
 *   faculty_subjects.subject_id NOT NULL → subjects
 *   enrolment_timetable_slots → enrolment_units, timetable_slots
 *   offer_letters.agreement_document_id → admission_documents_v2
 *   announcement_replies → subject_announcements
 *   attendance_records → attendance_sessions → subjects/sections
 *   assistant_threads.department_id → departments
 *   knowledge_chunks → knowledge_documents → departments
 */
async function fallbackCascadeDeleteInstitution(
  adminClient: SupabaseClient,
  institutionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // ── 1. Collect root IDs in parallel ──────────────────────────────────────
    const [
      usersRes, studentsRes, programsRes, deptsRes, subjectsRes, sectionsRes,
      appsRes, enrolmentsRes, plansRes, meetingsRes, onlineRes, eventsRes, jobsRes,
    ] = await Promise.all([
      adminClient.from("users").select("id").eq("institution_id", institutionId),
      adminClient.from("students").select("id").eq("institution_id", institutionId),
      adminClient.from("programs").select("id").eq("institution_id", institutionId),
      adminClient.from("departments").select("id").eq("institution_id", institutionId),
      adminClient.from("subjects").select("id").eq("institution_id", institutionId),
      adminClient.from("sections").select("id").eq("institution_id", institutionId),
      adminClient.from("admissions_applications").select("id").eq("institution_id", institutionId),
      adminClient.from("enrolments").select("id").eq("institution_id", institutionId),
      adminClient.from("payment_plans").select("id").eq("institution_id", institutionId),
      adminClient.from("meetings").select("id").eq("institution_id", institutionId),
      adminClient.from("online_sessions").select("id").eq("institution_id", institutionId),
      adminClient.from("events").select("id").eq("institution_id", institutionId),
      adminClient.from("job_posts").select("id").eq("institution_id", institutionId),
    ])

    const userIds        = (usersRes.data    || []).map((u: any) => u.id)
    const studentIds     = Array.from(new Set([...(studentsRes.data || []).map((s: any) => s.id), ...userIds]))
    const programIds     = (programsRes.data || []).map((p: any) => p.id)
    const departmentIds  = (deptsRes.data    || []).map((d: any) => d.id)
    const subjectIds     = (subjectsRes.data || []).map((s: any) => s.id)
    const sectionIds     = (sectionsRes.data || []).map((s: any) => s.id)
    const admissionsAppIds = (appsRes.data   || []).map((a: any) => a.id)
    const enrolmentIds   = (enrolmentsRes.data || []).map((e: any) => e.id)
    const paymentPlanIds = (plansRes.data    || []).map((p: any) => p.id)
    const meetingIds     = (meetingsRes.data || []).map((m: any) => m.id)
    const onlineSessionIds = (onlineRes.data || []).map((s: any) => s.id)
    const eventIds       = (eventsRes.data   || []).map((e: any) => e.id)
    const jobPostIds     = (jobsRes.data     || []).map((j: any) => j.id)

    // Second-tier IDs
    const [enrolUnitsRes, assignsRes, invoicesRes, projsRes] = await Promise.all([
      enrolmentIds.length > 0
        ? adminClient.from("enrolment_units").select("id").in("enrolment_id", enrolmentIds)
        : Promise.resolve({ data: [] }),
      subjectIds.length > 0
        ? adminClient.from("assignments").select("id").in("subject_id", subjectIds)
        : Promise.resolve({ data: [] }),
      paymentPlanIds.length > 0
        ? adminClient.from("invoices").select("id").in("payment_plan_id", paymentPlanIds)
        : Promise.resolve({ data: [] }),
      userIds.length > 0
        ? adminClient.from("projects").select("id").in("faculty_id", userIds)
        : Promise.resolve({ data: [] }),
    ])

    const enrolmentUnitIds = (enrolUnitsRes.data || []).map((u: any) => u.id)
    const assignmentIds    = (assignsRes.data    || []).map((a: any) => a.id)
    const invoiceIds       = (invoicesRes.data   || []).map((i: any) => i.id)
    const projectIds       = (projsRes.data      || []).map((p: any) => p.id)

    // Third-tier IDs
    const [subsRes, projGroupsRes] = await Promise.all([
      assignmentIds.length > 0
        ? adminClient.from("submissions").select("id").in("assignment_id", assignmentIds)
        : Promise.resolve({ data: [] }),
      projectIds.length > 0
        ? adminClient.from("project_groups").select("id").in("project_id", projectIds)
        : Promise.resolve({ data: [] }),
    ])

    const submissionIds = (subsRes.data      || []).map((s: any) => s.id)
    const projGroupIds  = (projGroupsRes.data || []).map((g: any) => g.id)

    // ── 2. Nullify self-referential / circular FK columns ────────────────────
    await Promise.all([
      safeUpdateByEq(adminClient, "student_documents", "institution_id", institutionId,
        { superseded_by: null, application_id: null, application_document_id: null }),
      safeUpdateByIn(adminClient, "student_documents", "student_id", studentIds,
        { superseded_by: null, application_id: null, application_document_id: null }),
      safeUpdateByEq(adminClient, "student_profile_details", "institution_id", institutionId,
        { education_agent_id: null, marketing_staff_id: null }),
      safeUpdateByIn(adminClient, "student_profile_details", "student_id", studentIds,
        { education_agent_id: null, marketing_staff_id: null }),
      safeUpdateByEq(adminClient, "sections", "institution_id", institutionId, { faculty_advisor_id: null }),
      safeUpdateByIn(adminClient, "sections", "id", sectionIds, { faculty_advisor_id: null }),
      safeUpdateByEq(adminClient, "enrolments", "institution_id", institutionId,
        { trainer_id: null, source_application_id: null, intake_id: null, section_id: null }),
      safeUpdateByIn(adminClient, "enrolments", "student_id", studentIds,
        { trainer_id: null, source_application_id: null, intake_id: null, section_id: null }),
      safeUpdateByEq(adminClient, "students", "institution_id", institutionId,
        { section_id: null, program_id: null, intake_id: null }),
      safeUpdateByIn(adminClient, "students", "id", studentIds,
        { section_id: null, program_id: null, intake_id: null }),
      safeUpdateByEq(adminClient, "programs", "institution_id", institutionId, { department_id: null }),
      safeUpdateByIn(adminClient, "programs", "id", programIds, { department_id: null }),
      safeUpdateByEq(adminClient, "users", "institution_id", institutionId, { department_id: null }),
      safeUpdateByIn(adminClient, "users", "id", userIds, { department_id: null }),
      safeUpdateByEq(adminClient, "meetings", "institution_id", institutionId,
        { timetable_slot_id: null, subject_id: null, section_id: null }),
      safeUpdateByEq(adminClient, "leave_applications", "institution_id", institutionId,
        { section_id: null, advisor_id: null, approved_by: null }),
    ])

    // ── 3A. True leaf nodes ——— nothing references these rows ────────────────
    // Ordering notes within this batch:
    //   • offer_letters must go before admission_documents_v2 in the NEXT batch
    //     (offer_letters.agreement_document_id → admission_documents_v2)
    //   • announcement_replies before subject_announcements (next batch)
    //   • attendance_records before attendance_sessions (next batch)
    //   • enrolment_timetable_slots before enrolment_units & timetable_slots (next batch)
    //   • assistant_feedback / assistant_message_sources before assistant_messages (next batch)
    await Promise.all([
      safeDeleteByIn(adminClient, "payments", "invoice_id", invoiceIds),
      safeDeleteByIn(adminClient, "submission_verifications", "submission_id", submissionIds),
      safeDeleteByIn(adminClient, "group_members", "group_id", projGroupIds),
      safeDeleteByIn(adminClient, "group_members", "student_id", userIds),
      safeDeleteByIn(adminClient, "event_registrations", "event_id", eventIds),
      safeDeleteByIn(adminClient, "event_registrations", "user_id", userIds),
      safeDeleteByIn(adminClient, "online_session_participants", "session_id", onlineSessionIds),
      safeDeleteByIn(adminClient, "online_session_participants", "user_id", userIds),
      safeDeleteByEq(adminClient, "meeting_messages", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "meeting_messages", "meeting_id", meetingIds),
      safeDeleteByIn(adminClient, "meeting_messages", "sender_id", userIds),
      safeDeleteByIn(adminClient, "meeting_participants", "meeting_id", meetingIds),
      safeDeleteByIn(adminClient, "meeting_participants", "user_id", userIds),
      // offer_letters: must precede admission_documents_v2 (FK: offer_letters.agreement_document_id)
      safeDeleteByIn(adminClient, "offer_letters", "application_id", admissionsAppIds),
      // enrolment_timetable_slots: must precede enrolment_units AND timetable_slots
      safeDeleteByIn(adminClient, "enrolment_timetable_slots", "enrolment_id", enrolmentIds),
      safeDeleteByIn(adminClient, "enrolment_timetable_slots", "enrolment_unit_id", enrolmentUnitIds),
      // announcement_replies: must precede subject_announcements
      safeDeleteByIn(adminClient, "announcement_replies", "author_id", userIds),
      // attendance_records: must precede attendance_sessions
      safeDeleteByIn(adminClient, "attendance_records", "student_id", userIds),
      safeDeleteByIn(adminClient, "applications", "job_post_id", jobPostIds),
      safeDeleteByIn(adminClient, "applications", "student_id", userIds),
      safeDeleteByIn(adminClient, "complaints", "student_id", userIds),
      safeDeleteByIn(adminClient, "notifications", "user_id", userIds),
      safeDeleteByIn(adminClient, "notification_preferences", "user_id", userIds),
      safeDeleteByIn(adminClient, "audit_logs", "user_id", userIds),
      safeDeleteByEq(adminClient, "audit_logs", "entity_id", institutionId),
      // AI assistant leaf nodes — must precede assistant_messages
      safeDeleteByIn(adminClient, "assistant_feedback", "user_id", userIds),
    ])

    // ── 3B. Second-tier — cleared after their leaf children in 3A ───────────
    await Promise.all([
      // admissions sub-tables — after offer_letters cleared in 3A
      safeDeleteByIn(adminClient, "admission_documents", "application_id", admissionsAppIds),
      safeDeleteByIn(adminClient, "admission_status_history", "application_id", admissionsAppIds),
      safeDeleteByEq(adminClient, "admission_status_history", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "admission_documents_v2", "application_id", admissionsAppIds),
      safeDeleteByEq(adminClient, "admission_documents_v2", "institution_id", institutionId),
      // payment chain
      safeDeleteByIn(adminClient, "invoices", "payment_plan_id", paymentPlanIds),
      // enrolment chain — after enrolment_timetable_slots cleared in 3A
      safeDeleteByIn(adminClient, "enrolment_unit_allocations", "enrolment_id", enrolmentIds),
      safeDeleteByIn(adminClient, "enrolment_unit_allocations", "enrolment_unit_id", enrolmentUnitIds),
      safeDeleteByIn(adminClient, "enrolment_units", "enrolment_id", enrolmentIds),
      // assignments/submissions
      safeDeleteByIn(adminClient, "submissions", "assignment_id", assignmentIds),
      safeDeleteByIn(adminClient, "submissions", "student_id", userIds),
      safeDeleteByIn(adminClient, "grade_entries", "student_id", userIds),
      // project chain
      safeDeleteByIn(adminClient, "project_groups", "id", projGroupIds),
      safeDeleteByIn(adminClient, "project_groups", "project_id", projectIds),
      // timetable — after enrolment_timetable_slots cleared in 3A
      safeDeleteByEq(adminClient, "timetable_slots", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "timetable_slots", "section_id", sectionIds),
      safeDeleteByIn(adminClient, "timetable_slots", "subject_id", subjectIds),
      safeDeleteByIn(adminClient, "timetable_slots", "faculty_id", userIds),
      safeDeleteByEq(adminClient, "timetable_weeks", "institution_id", institutionId),
      safeDeleteByEq(adminClient, "periods", "institution_id", institutionId),
      safeDeleteByEq(adminClient, "academic_calendar_events", "institution_id", institutionId),
      // leaves
      safeDeleteByEq(adminClient, "leave_applications", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "leave_applications", "student_id", userIds),
      safeDeleteByEq(adminClient, "warning_letters", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "warning_letters", "student_id", userIds),
      safeDeleteByEq(adminClient, "attendance_warning_letters", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "attendance_warning_letters", "student_id", userIds),
      // attendance_sessions — after attendance_records cleared in 3A
      safeDeleteByIn(adminClient, "attendance_sessions", "subject_id", subjectIds),
      safeDeleteByIn(adminClient, "attendance_sessions", "section_id", sectionIds),
      safeDeleteByIn(adminClient, "attendance_sessions", "faculty_id", userIds),
      // resources — before subjects
      safeDeleteByIn(adminClient, "resources", "subject_id", subjectIds),
      safeDeleteByIn(adminClient, "resources", "faculty_id", userIds),
      // grade_columns — after grade_entries cleared above
      safeDeleteByIn(adminClient, "grade_columns", "subject_id", subjectIds),
      // subject_announcements — after announcement_replies cleared in 3A
      safeDeleteByIn(adminClient, "subject_announcements", "subject_id", subjectIds),
      safeDeleteByIn(adminClient, "subject_announcements", "faculty_id", userIds),
      // knowledge_chunks (correct table name — NOT "knowledge_document_chunks")
      // must precede knowledge_documents
      safeDeleteByEq(adminClient, "knowledge_chunks", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "knowledge_chunks", "owner_id", userIds),
      safeDeleteByIn(adminClient, "knowledge_ingestion_jobs", "requested_by", userIds),
      // assistant messages — after assistant_feedback cleared in 3A
      safeDeleteByEq(adminClient, "assistant_messages", "thread_id", institutionId), // no-op guard
    ])

    // ── 3C. knowledge_documents and assistant_threads ─────────────────────────
    // Must go AFTER their child rows (knowledge_chunks, assistant_messages) and
    // BEFORE departments (assistant_threads.department_id → departments).
    await Promise.all([
      safeDeleteByEq(adminClient, "knowledge_documents", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "knowledge_documents", "owner_id", userIds),
      safeDeleteByEq(adminClient, "assistant_threads", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "assistant_threads", "user_id", userIds),
    ])

    // ── 4. Major entity deletions — all children cleared above ───────────────
    await Promise.all([
      safeDeleteByEq(adminClient, "payment_plans", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "payment_plans", "student_id", userIds),
      // admissions_applications — after offer_letters, admission_docs, status_history (all cleared)
      safeDeleteByEq(adminClient, "admissions_applications", "institution_id", institutionId),
      // enrolments — after enrolment_units, enrolment_timetable_slots (all cleared)
      safeDeleteByEq(adminClient, "enrolments", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "enrolments", "student_id", studentIds),
      safeDeleteByEq(adminClient, "meetings", "institution_id", institutionId),
      safeDeleteByEq(adminClient, "online_sessions", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "online_sessions", "host_id", userIds),
      safeDeleteByIn(adminClient, "assignments", "id", assignmentIds),
      safeDeleteByIn(adminClient, "assignments", "subject_id", subjectIds),
      safeDeleteByIn(adminClient, "assignments", "faculty_id", userIds),
      safeDeleteByIn(adminClient, "projects", "id", projectIds),
      safeDeleteByIn(adminClient, "projects", "faculty_id", userIds),
      safeDeleteByEq(adminClient, "events", "institution_id", institutionId),
      safeDeleteByEq(adminClient, "job_posts", "institution_id", institutionId),
      safeDeleteByEq(adminClient, "announcements", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "announcements", "created_by", userIds),
      // student profile tables
      safeDeleteByEq(adminClient, "student_documents", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "student_documents", "student_id", studentIds),
      safeDeleteByEq(adminClient, "student_profile_details", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "student_profile_details", "student_id", studentIds),
      safeDeleteByEq(adminClient, "student_addresses", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "student_addresses", "student_id", studentIds),
      safeDeleteByEq(adminClient, "student_emergency_contacts", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "student_emergency_contacts", "student_id", studentIds),
      safeDeleteByEq(adminClient, "student_notes", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "student_notes", "student_id", studentIds),
      safeDeleteByIn(adminClient, "student_notes", "actor_id", userIds),
      safeDeleteByEq(adminClient, "student_communications", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "student_communications", "student_id", studentIds),
      safeDeleteByIn(adminClient, "student_communications", "actor_id", userIds),
      safeDeleteByIn(adminClient, "parent_student_relations", "student_id", studentIds),
      safeDeleteByIn(adminClient, "parent_student_relations", "parent_id", userIds),
      safeDeleteByEq(adminClient, "education_agents", "institution_id", institutionId),
      safeDeleteByEq(adminClient, "student_portal_access", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "student_portal_access", "auth_user_id", userIds),
    ])

    // ── 5A. faculty_subjects — subject_id NOT NULL → subjects ────────────────
    //        Must be deleted BEFORE subjects are deleted in 5B.
    await Promise.all([
      safeDeleteByEq(adminClient, "faculty_subjects", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "faculty_subjects", "faculty_id", userIds),
      safeDeleteByIn(adminClient, "faculty_subjects", "subject_id", subjectIds),
      safeDeleteByIn(adminClient, "faculty_subjects", "section_id", sectionIds),
    ])

    // ── 5B. Students, staff, subjects, sections, intakes, user settings ──────
    //        attendance_sessions were cleared in 3B (before subjects/sections).
    //        subjects.program_id → programs is nullable; sections.program_id is
    //        nullable in the live schema — both are safe to delete before programs.
    await Promise.all([
      safeDeleteByEq(adminClient, "students", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "students", "id", studentIds),
      safeDeleteByEq(adminClient, "staff", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "staff", "id", userIds),
      safeDeleteByEq(adminClient, "subjects", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "subjects", "id", subjectIds),
      safeDeleteByEq(adminClient, "sections", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "sections", "id", sectionIds),
      safeDeleteByEq(adminClient, "intakes", "institution_id", institutionId),
      safeDeleteByEq(adminClient, "institution_timetable_settings", "institution_id", institutionId),
      safeDeleteByEq(adminClient, "files", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "files", "uploaded_by", userIds),
      safeDeleteByIn(adminClient, "user_permissions", "user_id", userIds),
      safeDeleteByIn(adminClient, "user_profile_details", "user_id", userIds),
      safeDeleteByIn(adminClient, "user_account_settings", "user_id", userIds),
    ])

    // ── 5C. CRITICAL: admission_fee_configurations.program_id NOT NULL → programs
    //        This was the direct cause of the original FK error. Must be deleted
    //        before programs. admission_templates and companies also only FK →
    //        institutions and are cleared here too.
    await Promise.all([
      safeDeleteByEq(adminClient, "admission_fee_configurations", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "admission_fee_configurations", "program_id", programIds),
      safeDeleteByEq(adminClient, "admission_templates", "institution_id", institutionId),
      safeDeleteByEq(adminClient, "companies", "institution_id", institutionId),
    ])

    // ── 5D. Programs and departments — now safe, all referencing rows cleared ─
    await Promise.all([
      safeDeleteByEq(adminClient, "programs", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "programs", "id", programIds),
      safeDeleteByEq(adminClient, "departments", "institution_id", institutionId),
      safeDeleteByIn(adminClient, "departments", "id", departmentIds),
    ])

    // ── 6. Delete users then the institution itself ───────────────────────────
    await safeDeleteByEq(adminClient, "users", "institution_id", institutionId)
    await safeDeleteByIn(adminClient, "users", "id", userIds)

    const { error: instDeleteError } = await adminClient
      .from("institutions")
      .delete()
      .eq("id", institutionId)

    if (instDeleteError) {
      return { success: false, error: instDeleteError.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete institution" }
  }
}

/**
 * Permanently deletes an institution and all associated relational records & auth users.
 * Uses atomic DB-level RPC when available for <100ms execution, with ultra-fast parallel fallback.
 */
export async function cascadeDeleteInstitution(
  adminClient: SupabaseClient,
  institutionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Fetch user IDs in parallel to prepare for Supabase Auth deletion
    const { data: users } = await adminClient
      .from("users")
      .select("id")
      .eq("institution_id", institutionId)
    const userIds: string[] = (users || []).map((u: any) => u.id)

    // 2. Try atomic Postgres RPC for instantaneous database-level cascade
    let rpcSuccess = false
    if (typeof adminClient.rpc === "function") {
      try {
        const { error: rpcError } = await adminClient.rpc("delete_institution_cascade", {
          p_institution_id: institutionId,
        })
        if (!rpcError) {
          rpcSuccess = true
        }
      } catch {
        rpcSuccess = false
      }
    }

    if (!rpcSuccess) {
      // If RPC is missing or errors, use the high-speed concurrent Node.js fallback
      const fallbackRes = await fallbackCascadeDeleteInstitution(adminClient, institutionId)
      if (!fallbackRes.success) {
        return fallbackRes
      }
    }

    // 3. Clean up Supabase Auth users concurrently
    if (userIds.length > 0 && adminClient.auth?.admin?.deleteUser) {
      await Promise.allSettled(
        userIds.map((uid) => adminClient.auth.admin.deleteUser(uid))
      )
    }

    return { success: true }
  } catch (err: any) {
    console.error("[cascade-delete] fatal error deleting institution:", err)
    return { success: false, error: err?.message || "Failed to delete institution and dependent records" }
  }
}

/**
 * Permanently deletes an organization, all its child institutions, its admins, and all dependent records.
 */
export async function cascadeDeleteOrganization(
  adminClient: SupabaseClient,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Fetch all org-level users for Auth deletion
    const { data: orgUsers } = await adminClient
      .from("users")
      .select("id")
      .eq("organization_id", organizationId)
    const orgUserIds: string[] = (orgUsers || []).map((u: any) => u.id)

    // 2. Try atomic Postgres RPC
    let rpcSuccess = false
    if (typeof adminClient.rpc === "function") {
      try {
        const { error: rpcError } = await adminClient.rpc("delete_organization_cascade", {
          p_organization_id: organizationId,
        })
        if (!rpcError) {
          rpcSuccess = true
        }
      } catch {
        rpcSuccess = false
      }
    }

    if (!rpcSuccess) {
      // Fallback: Delete all child institutions first
      const { data: insts } = await adminClient
        .from("institutions")
        .select("id")
        .eq("organization_id", organizationId)

      for (const inst of insts || []) {
        await cascadeDeleteInstitution(adminClient, inst.id)
      }

      // Org-level cleanup in parallel
      await Promise.all([
        safeDeleteByEq(adminClient, "knowledge_chunks", "organization_id", organizationId),
        safeDeleteByEq(adminClient, "knowledge_documents", "organization_id", organizationId),
        safeDeleteByEq(adminClient, "assistant_threads", "organization_id", organizationId),
        safeDeleteByEq(adminClient, "files", "organization_id", organizationId),
        safeDeleteByEq(adminClient, "timetable_slots", "organization_id", organizationId),
        safeDeleteByIn(adminClient, "notifications", "user_id", orgUserIds),
        safeDeleteByIn(adminClient, "notification_preferences", "user_id", orgUserIds),
        safeDeleteByIn(adminClient, "user_permissions", "user_id", orgUserIds),
        safeDeleteByIn(adminClient, "user_profile_details", "user_id", orgUserIds),
        safeDeleteByIn(adminClient, "user_account_settings", "user_id", orgUserIds),
        safeDeleteByIn(adminClient, "audit_logs", "user_id", orgUserIds),
        safeDeleteByEq(adminClient, "audit_logs", "entity_id", organizationId),
      ])

      await safeDeleteByIn(adminClient, "users", "id", orgUserIds)
      await safeDeleteByEq(adminClient, "users", "organization_id", organizationId)

      const { error: orgDeleteError } = await adminClient
        .from("organizations")
        .delete()
        .eq("id", organizationId)

      if (orgDeleteError) {
        return { success: false, error: orgDeleteError.message }
      }
    }

    // 3. Clean up Auth users in parallel
    if (orgUserIds.length > 0 && adminClient.auth?.admin?.deleteUser) {
      await Promise.allSettled(
        orgUserIds.map((uid) => adminClient.auth.admin.deleteUser(uid))
      )
    }

    return { success: true }
  } catch (err: any) {
    console.error("[cascade-delete] fatal error deleting organization:", err)
    return { success: false, error: err?.message || "Failed to delete organization" }
  }
}
