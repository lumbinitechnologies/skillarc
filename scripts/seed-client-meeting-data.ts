import { createHash } from "node:crypto"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { searchPermittedDocuments } from "../src/lib/assistant/read-service"
import { knowledgeEmbeddingProfile } from "../src/lib/knowledge/config"
import { runKnowledgeWorker } from "../src/lib/knowledge/worker"

const APPLY = process.argv.includes("--apply")
const CLEANUP = process.argv.includes("--cleanup")
const DRY_RUN = !APPLY

const TARGET_ORGANIZATION_ID = "018e3a8e-c1b6-4182-a076-c0ac4c59989e"
const TARGET_INSTITUTION_ID = "8f4aef21-5135-47a5-9ddd-7e7ff08f79af"
const TARGET_INSTITUTION_NAME = "Test Institution"
const PRIMARY_STUDENT_ID = "f8b2f4d2-4928-425d-9592-72a582dcbd38"
const PRIMARY_STUDENT_NAME = "Sai Kiran"

const FIXTURE_IDS = {
  companies: [
    "b1000000-0000-0000-0000-000000000001",
    "b1000000-0000-0000-0000-000000000002",
    "b1000000-0000-0000-0000-000000000003",
  ],
  jobPosts: [
    "b2000000-0000-0000-0000-000000000001",
    "b2000000-0000-0000-0000-000000000002",
    "b2000000-0000-0000-0000-000000000003",
    "b2000000-0000-0000-0000-000000000004",
  ],
  applications: Array.from({ length: 12 }, (_, index) => `b3${String(index + 1).padStart(6, "0")}-0000-0000-0000-000000000001`),
  warning: "b4000000-0000-0000-0000-000000000001",
  paymentPlan: "b5000000-0000-0000-0000-000000000001",
  invoices: [
    "b5100000-0000-0000-0000-000000000001",
    "b5100000-0000-0000-0000-000000000002",
    "b5100000-0000-0000-0000-000000000003",
  ],
  payment: "b5200000-0000-0000-0000-000000000001",
  periods: [
    "b6000000-0000-0000-0000-000000000001",
    "b6000000-0000-0000-0000-000000000002",
    "b6000000-0000-0000-0000-000000000003",
    "b6000000-0000-0000-0000-000000000004",
    "b6000000-0000-0000-0000-000000000005",
  ],
  calendarEvents: [
    "b7000000-0000-0000-0000-000000000001",
    "b7000000-0000-0000-0000-000000000002",
    "b7000000-0000-0000-0000-000000000003",
    "b7000000-0000-0000-0000-000000000004",
  ],
  knowledgeDocument: "b8000000-0000-0000-0000-000000000001",
} as const

const KNOWLEDGE_BUCKET = "knowledge-documents"
const KNOWLEDGE_ROLES = [
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "INSTITUTION_ADMIN",
  "HOD",
  "PROGRAM_HEAD",
  "FACULTY",
  "STUDENT",
  "PARENT",
]
const FIXTURE_MARKER = "[Synthetic client-meeting fixture]"

type FixtureContext = {
  organizationId: string
  institutionId: string
  primaryStudentId: string
  ownerId: string
  cohortIds: string[]
}

type StudentRow = {
  id: string
  registration_number: string | null
  program_id: string | null
  section_id: string | null
}

const counters = { inserted: 0, updated: 0, unchanged: 0, deleted: 0 }

function log(message: string): void {
  console.log(`${DRY_RUN ? "[dry-run]" : "[apply]"} ${message}`)
}

function requireEnvironment(): void {
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!process.env[key]) throw new Error(`${key} is required`)
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("https://")) {
    throw new Error("The client-meeting fixture requires the hosted Supabase URL from .env")
  }
  if (CLEANUP && !APPLY) throw new Error("Cleanup requires --apply")
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(base: Date, days: number): Date {
  const value = new Date(base)
  value.setUTCDate(value.getUTCDate() + days)
  return value
}

function isoAtNoon(base: Date, days: number): string {
  return `${dateOnly(addDays(base, days))}T12:00:00`
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

async function fetchOne<T = Record<string, unknown>>(db: SupabaseClient, table: string, id: string): Promise<T | null> {
  const { data, error } = await db.from(table).select("*").eq("id", id).maybeSingle()
  if (error) throw new Error(`${table} lookup failed: ${error.message}`)
  return (data as T | null) ?? null
}

async function fetchCount(db: SupabaseClient, table: string, filters: Record<string, string>): Promise<number> {
  let query = db.from(table).select("*", { count: "exact", head: true })
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value)
  const { count, error } = await query
  if (error) throw new Error(`${table} count failed: ${error.message}`)
  return count ?? 0
}

function assertCompatible(table: string, existing: Record<string, unknown>, payload: Record<string, unknown>, keys: string[]): void {
  for (const key of keys) {
    if (existing[key] !== undefined && existing[key] !== payload[key]) {
      throw new Error(`${table} fixture ID is already used by a different record (${key})`)
    }
  }
}

async function ensureRow(
  db: SupabaseClient,
  table: string,
  payload: Record<string, unknown>,
  identifyWith: string[],
): Promise<void> {
  const id = String(payload.id)
  const existing = await fetchOne(db, table, id)
  if (existing) {
    assertCompatible(table, existing, payload, identifyWith)
    if (DRY_RUN) {
      counters.unchanged += 1
      log(`would keep/update ${table} ${id}`)
      return
    }
    const { error } = await db.from(table).update(payload).eq("id", id)
    if (error) throw new Error(`${table} update failed: ${error.message}`)
    counters.updated += 1
    return
  }
  if (DRY_RUN) {
    counters.inserted += 1
    log(`would insert ${table} ${id}`)
    return
  }
  const { error } = await db.from(table).insert(payload)
  if (error) throw new Error(`${table} insert failed: ${error.message}`)
  counters.inserted += 1
}

async function validateTarget(db: SupabaseClient): Promise<FixtureContext> {
  const { data: institution, error: institutionError } = await db
    .from("institutions")
    .select("id, name, organization_id")
    .eq("id", TARGET_INSTITUTION_ID)
    .maybeSingle()
  if (institutionError) throw new Error(`Institution lookup failed: ${institutionError.message}`)
  if (!institution) throw new Error(`Target institution does not exist: ${TARGET_INSTITUTION_ID}`)
  if (institution.name !== TARGET_INSTITUTION_NAME || institution.organization_id !== TARGET_ORGANIZATION_ID) {
    throw new Error("Target institution identity did not match the expected Test Institution tenant")
  }

  const { data: primaryStudent, error: primaryError } = await db
    .from("students")
    .select("id, institution_id")
    .eq("id", PRIMARY_STUDENT_ID)
    .maybeSingle()
  if (primaryError) throw new Error(`Primary student lookup failed: ${primaryError.message}`)
  if (!primaryStudent || primaryStudent.institution_id !== TARGET_INSTITUTION_ID) {
    throw new Error(`Primary student is not in the target institution: ${PRIMARY_STUDENT_ID}`)
  }

  const { data: primaryUser, error: primaryUserError } = await db
    .from("users")
    .select("id, name, role, institution_id, organization_id")
    .eq("id", PRIMARY_STUDENT_ID)
    .maybeSingle()
  if (primaryUserError) throw new Error(`Primary user lookup failed: ${primaryUserError.message}`)
  if (!primaryUser || primaryUser.name !== PRIMARY_STUDENT_NAME || primaryUser.role !== "STUDENT") {
    throw new Error("Primary student identity did not match the expected existing account")
  }
  if (primaryUser.organization_id !== TARGET_ORGANIZATION_ID || primaryUser.institution_id !== TARGET_INSTITUTION_ID) {
    throw new Error("Primary student is outside the expected organization/institution scope")
  }

  const { data: admins, error: adminError } = await db
    .from("users")
    .select("id")
    .eq("institution_id", TARGET_INSTITUTION_ID)
    .eq("role", "INSTITUTION_ADMIN")
    .order("id")
    .limit(1)
  if (adminError) throw new Error(`Institution-admin lookup failed: ${adminError.message}`)
  if (!admins?.[0]?.id) throw new Error("No existing institution admin is available as the knowledge owner")

  const { data: studentRows, error: studentError } = await db
    .from("students")
    .select("id, registration_number, program_id, section_id")
    .eq("institution_id", TARGET_INSTITUTION_ID)
    .not("program_id", "is", null)
    .not("section_id", "is", null)
    .order("registration_number", { ascending: true, nullsFirst: false })
  if (studentError) throw new Error(`Student cohort lookup failed: ${studentError.message}`)

  const cohort = [
    { id: PRIMARY_STUDENT_ID } as StudentRow,
    ...((studentRows ?? []) as StudentRow[]).filter((student) => student.id !== PRIMARY_STUDENT_ID),
  ].slice(0, 6)
  if (cohort.length < 6) throw new Error(`Expected at least six existing students with academic scope; found ${cohort.length}`)

  return {
    organizationId: TARGET_ORGANIZATION_ID,
    institutionId: TARGET_INSTITUTION_ID,
    primaryStudentId: PRIMARY_STUDENT_ID,
    ownerId: admins[0].id,
    cohortIds: cohort.map((student) => student.id),
  }
}

function placementPayloads(context: FixtureContext, today: Date) {
  const companies = [
    {
      id: FIXTURE_IDS.companies[0],
      institution_id: context.institutionId,
      name: "AsterByte Labs",
      website: "asterbyte.example",
      description: `${FIXTURE_MARKER} Product engineering and cloud platforms.`,
    },
    {
      id: FIXTURE_IDS.companies[1],
      institution_id: context.institutionId,
      name: "Northstar Analytics",
      website: "northstar.example",
      description: `${FIXTURE_MARKER} Data products and applied analytics.`,
    },
    {
      id: FIXTURE_IDS.companies[2],
      institution_id: context.institutionId,
      name: "OrbitStack Systems",
      website: "orbitstack.example",
      description: `${FIXTURE_MARKER} Quality engineering and developer tooling.`,
    },
  ]
  const jobs = [
    {
      id: FIXTURE_IDS.jobPosts[0], institution_id: context.institutionId, company_id: companies[0].id,
      title: "Graduate Software Engineer", description: `${FIXTURE_MARKER} Backend APIs, testing, and cloud fundamentals.`, deadline: dateOnly(addDays(today, 11)),
    },
    {
      id: FIXTURE_IDS.jobPosts[1], institution_id: context.institutionId, company_id: companies[1].id,
      title: "Data Analyst Associate", description: `${FIXTURE_MARKER} SQL, dashboards, and exploratory analysis.`, deadline: dateOnly(addDays(today, 18)),
    },
    {
      id: FIXTURE_IDS.jobPosts[2], institution_id: context.institutionId, company_id: companies[2].id,
      title: "QA Automation Engineer", description: `${FIXTURE_MARKER} API automation, CI checks, and quality systems.`, deadline: dateOnly(addDays(today, -8)),
    },
    {
      id: FIXTURE_IDS.jobPosts[3], institution_id: context.institutionId, company_id: companies[0].id,
      title: "Machine Learning Intern", description: `${FIXTURE_MARKER} Model evaluation, Python, and responsible experimentation.`, deadline: dateOnly(addDays(today, 25)),
    },
  ]
  const statuses = ["SHORTLISTED", "APPLIED", "REJECTED", "SELECTED", "SHORTLISTED", "APPLIED", "SHORTLISTED", "SELECTED", "APPLIED", "REJECTED", "WITHDRAWN", "APPLIED"]
  const jobIndexes = [0, 1, 2, 0, 1, 0, 2, 1, 3, 2, 3, 1]
  const studentIndexes = [0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 5, 5]
  const applications = FIXTURE_IDS.applications.map((id, index) => ({
    id,
    job_post_id: jobs[jobIndexes[index]].id,
    student_id: context.cohortIds[studentIndexes[index]],
    status: statuses[index],
    resume_url: `https://files.example/${context.cohortIds[studentIndexes[index]]}/resume.pdf`,
  }))
  return { companies, jobs, applications }
}

async function seedPlacements(db: SupabaseClient, context: FixtureContext, today: Date): Promise<void> {
  const { companies, jobs, applications } = placementPayloads(context, today)
  for (const company of companies) await ensureRow(db, "companies", company, ["name", "institution_id"])
  for (const job of jobs) await ensureRow(db, "job_posts", job, ["title", "company_id", "institution_id"])
  for (const application of applications) await ensureRow(db, "applications", application, ["job_post_id", "student_id"])
}

async function seedBillingAndWarning(db: SupabaseClient, context: FixtureContext, today: Date): Promise<void> {
  await ensureRow(db, "payment_plans", {
    id: FIXTURE_IDS.paymentPlan,
    student_id: context.primaryStudentId,
    institution_id: context.institutionId,
    total_amount: 120000,
  }, ["student_id", "institution_id"])

  const invoices = [
    { id: FIXTURE_IDS.invoices[0], payment_plan_id: FIXTURE_IDS.paymentPlan, amount_due: 48000, due_date: dateOnly(addDays(today, -30)), status: "PAID" },
    { id: FIXTURE_IDS.invoices[1], payment_plan_id: FIXTURE_IDS.paymentPlan, amount_due: 36000, due_date: dateOnly(addDays(today, 30)), status: "UNPAID" },
    { id: FIXTURE_IDS.invoices[2], payment_plan_id: FIXTURE_IDS.paymentPlan, amount_due: 36000, due_date: dateOnly(addDays(today, 90)), status: "UNPAID" },
  ]
  for (const invoice of invoices) await ensureRow(db, "invoices", invoice, ["payment_plan_id", "amount_due"])
  await ensureRow(db, "payments", {
    id: FIXTURE_IDS.payment,
    invoice_id: FIXTURE_IDS.invoices[0],
    amount_paid: 48000,
    paid_at: isoAtNoon(today, -20),
    payment_method: "BANK_TRANSFER",
    reference_no: "MEETING-DEMO-TXN-001",
  }, ["invoice_id", "amount_paid"])

  await ensureRow(db, "warning_letters", {
    id: FIXTURE_IDS.warning,
    student_id: context.primaryStudentId,
    institution_id: context.institutionId,
    current_rate: 68.5,
    level: "WARNING",
    sent_at: isoAtNoon(today, -1),
    signed_by_admin: "Test Institution Admin",
  }, ["student_id", "institution_id", "level"])
}

async function seedTimetableAndCalendar(db: SupabaseClient, context: FixtureContext, today: Date): Promise<void> {
  const timings = [
    [1, "08:45:00", "09:45:00"],
    [2, "09:45:00", "10:45:00"],
    [3, "11:00:00", "12:00:00"],
    [4, "13:00:00", "14:00:00"],
    [5, "14:00:00", "15:00:00"],
  ] as const
  for (let index = 0; index < timings.length; index += 1) {
    const [periodNumber, startTime, endTime] = timings[index]
    await ensureRow(db, "periods", {
      id: FIXTURE_IDS.periods[index],
      institution_id: context.institutionId,
      period_number: periodNumber,
      start_time: startTime,
      end_time: endTime,
    }, ["institution_id", "period_number"])
  }

  const settingsPayload = {
      start_time: "08:45:00",
      end_time: "15:00:00",
      period_duration_minutes: 60,
      number_of_periods: 5,
      period_timings: timings.map(([periodNumber, startTime, endTime]) => ({
        id: `P${periodNumber}`,
        label: `Period ${periodNumber}`,
          time: `${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`,
      })),
  }
  if (DRY_RUN) {
    counters.unchanged += 1
    log("would synchronize institution timetable settings")
  } else {
    const { error: settingsError } = await db
      .from("institution_timetable_settings")
      .update(settingsPayload)
      .eq("institution_id", context.institutionId)
    if (settingsError) throw new Error(`Timetable settings update failed: ${settingsError.message}`)
    counters.updated += 1
    log("synchronize institution timetable settings")
  }

  const events = [
    {
      id: FIXTURE_IDS.calendarEvents[0], institution_id: context.institutionId, title: "Orientation & Induction",
      event_type: "ORIENTATION", start_date: dateOnly(addDays(today, 1)), end_date: dateOnly(addDays(today, 1)),
      description: `${FIXTURE_MARKER} New-student orientation and academic onboarding.`, affects_classes: false, color: "#2563EB",
    },
    {
      id: FIXTURE_IDS.calendarEvents[1], institution_id: context.institutionId, title: "Founders Day Holiday",
      event_type: "PUBLIC_HOLIDAY", start_date: dateOnly(addDays(today, 10)), end_date: dateOnly(addDays(today, 10)),
      description: `${FIXTURE_MARKER} Campus closed for the public holiday.`, affects_classes: true, color: "#DC2626",
    },
    {
      id: FIXTURE_IDS.calendarEvents[2], institution_id: context.institutionId, title: "Industry Connect & Placement Fair",
      event_type: "CAMPUS_EVENT", start_date: dateOnly(addDays(today, 23)), end_date: dateOnly(addDays(today, 23)),
      description: `${FIXTURE_MARKER} Employer networking and placement preparation session.`, affects_classes: false, color: "#7C3AED",
    },
    {
      id: FIXTURE_IDS.calendarEvents[3], institution_id: context.institutionId, title: "Mid-Semester Assessment Week",
      event_type: "EXAM_PERIOD", start_date: dateOnly(addDays(today, 35)), end_date: dateOnly(addDays(today, 40)),
      description: `${FIXTURE_MARKER} Scheduled mid-semester assessment window.`, affects_classes: true, color: "#EA580C",
    },
  ]
  for (const event of events) await ensureRow(db, "academic_calendar_events", event, ["title", "institution_id"])
}

function knowledgeText(): string {
  return [
    "Synthetic client-meeting briefing",
    "",
    "This document contains synthetic SkillArc demo data only. It is not an institutional policy or a real employer record.",
    "",
    "Placement demo: AsterByte Labs offers Graduate Software Engineer and Machine Learning Intern roles. Northstar Analytics offers a Data Analyst Associate role. OrbitStack Systems offers a QA Automation Engineer role.",
    "Billing demo: the primary student account has a synthetic tuition plan of INR 120000 split across three installments, with the first installment paid.",
    "Academic demo: orientation is scheduled for the day after the fixture is created, followed by a public holiday, an industry-connect event, and a mid-semester assessment period.",
    "",
    "When answering from this document, clearly state that these are synthetic meeting fixtures.",
  ].join("\n")
}

async function seedKnowledgeDocument(db: SupabaseClient, context: FixtureContext): Promise<void> {
  const content = knowledgeText()
  const contentHash = sha256(content)
  const storagePath = `${context.organizationId}/${context.institutionId}/${FIXTURE_IDS.knowledgeDocument}.txt`
  const existing = await fetchOne<Record<string, unknown>>(db, "knowledge_documents", FIXTURE_IDS.knowledgeDocument)
  const profile = knowledgeEmbeddingProfile()

  if (existing && existing.content_hash === contentHash && existing.status === "ready" && existing.embedding_profile === profile) {
    counters.unchanged += 1
    log("keep ready synthetic knowledge document")
    return
  }
  if (existing) assertCompatible("knowledge_documents", existing, { id: FIXTURE_IDS.knowledgeDocument }, [])

  if (DRY_RUN) {
    counters.inserted += existing ? 0 : 1
    log(`would upload and queue knowledge document ${FIXTURE_IDS.knowledgeDocument}`)
    return
  }

  const { error: uploadError } = await db.storage.from(KNOWLEDGE_BUCKET).upload(storagePath, new TextEncoder().encode(content), {
    contentType: "text/plain",
    upsert: true,
  })
  if (uploadError) throw new Error(`Knowledge document upload failed: ${uploadError.message}`)

  const documentPayload = {
    id: FIXTURE_IDS.knowledgeDocument,
    organization_id: context.organizationId,
    institution_id: context.institutionId,
    department_id: null,
    subject_id: null,
    section_id: null,
    owner_id: context.ownerId,
    title: "Synthetic client-meeting demo brief",
    original_filename: "synthetic-client-meeting-demo-brief.txt",
    storage_bucket: KNOWLEDGE_BUCKET,
    storage_path: storagePath,
    visibility: "institution",
    allowed_roles: KNOWLEDGE_ROLES,
    document_version: 1,
    source_type: "upload",
    source_id: FIXTURE_IDS.knowledgeDocument,
    content_hash: contentHash,
    mime_type: "text/plain",
    embedding_provider: process.env.KNOWLEDGE_EMBEDDING_PROVIDER || "huggingface-local",
    embedding_model: process.env.KNOWLEDGE_EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2",
    embedding_revision: process.env.KNOWLEDGE_EMBEDDING_REVISION || "751bff3",
    embedding_dimensions: 384,
    embedding_profile: profile,
    status: "pending",
    failure_reason: null,
    updated_at: new Date().toISOString(),
  }
  if (existing) {
    const { error } = await db.from("knowledge_documents").update(documentPayload).eq("id", FIXTURE_IDS.knowledgeDocument)
    if (error) throw new Error(`Knowledge document update failed: ${error.message}`)
    counters.updated += 1
  } else {
    const { error } = await db.from("knowledge_documents").insert(documentPayload)
    if (error) throw new Error(`Knowledge document insert failed: ${error.message}`)
    counters.inserted += 1
  }

  const { data: activeJobs, error: jobLookupError } = await db
    .from("knowledge_ingestion_jobs")
    .select("id, status")
    .eq("document_id", FIXTURE_IDS.knowledgeDocument)
    .in("status", ["queued", "running"])
  if (jobLookupError) throw new Error(`Knowledge job lookup failed: ${jobLookupError.message}`)
  if (!activeJobs?.length) {
    const { error } = await db.from("knowledge_ingestion_jobs").insert({
      document_id: FIXTURE_IDS.knowledgeDocument,
      requested_by: context.ownerId,
      status: "queued",
      attempts: 0,
      max_attempts: 5,
      available_at: new Date().toISOString(),
    })
    if (error) throw new Error(`Knowledge job insert failed: ${error.message}`)
    counters.inserted += 1
  }
}

async function processKnowledge(db: SupabaseClient, context: FixtureContext): Promise<{ ready: boolean; searchVerified: boolean }> {
  if (DRY_RUN) {
    const queued = await fetchCount(db, "knowledge_ingestion_jobs", { status: "queued" })
    log(`would process ${queued} queued knowledge jobs plus the synthetic briefing`)
    return { ready: false, searchVerified: false }
  }

  let claimed = 0
  let completed = 0
  let failed = 0
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const result = await runKnowledgeWorker(db)
    claimed += result.claimed
    completed += result.completed
    failed += result.failed
    if (result.claimed === 0) break
  }

  const { data: documents, error: documentError } = await db
    .from("knowledge_documents")
    .select("id, status, embedding_profile, document_version")
    .eq("institution_id", context.institutionId)
  if (documentError) throw new Error(`Knowledge readiness lookup failed: ${documentError.message}`)
  const { data: chunks, error: chunkError } = await db
    .from("knowledge_chunks")
    .select("id, document_id, document_version, embedding")
    .eq("institution_id", context.institutionId)
  if (chunkError) throw new Error(`Knowledge chunk lookup failed: ${chunkError.message}`)
  const readyDocuments = (documents ?? []).filter((document) => document.status === "ready" && document.embedding_profile === knowledgeEmbeddingProfile())
  const readyIds = new Set(readyDocuments.map((document) => document.id))
  const usableChunks = (chunks ?? []).filter((chunk) => readyIds.has(chunk.document_id) && chunk.embedding !== null)
  const ready = Boolean(readyDocuments.length && usableChunks.length)

  let searchVerified = false
  if (ready) {
    const previousFlag = process.env.KNOWLEDGE_SEARCH_ENABLED
    process.env.KNOWLEDGE_SEARCH_ENABLED = "true"
    try {
      const result = await searchPermittedDocuments(db, {
        userId: context.ownerId,
        actorUserId: context.ownerId,
        isImpersonating: false,
        organizationId: context.organizationId,
        institutionId: context.institutionId,
        departmentId: null,
        role: "INSTITUTION_ADMIN",
        name: "Test Institution Admin",
      }, "Which companies are included in the synthetic placement demo?", db)
      searchVerified = result.sources.some((source) => source.documentId === FIXTURE_IDS.knowledgeDocument)
    } finally {
      if (previousFlag === undefined) delete process.env.KNOWLEDGE_SEARCH_ENABLED
      else process.env.KNOWLEDGE_SEARCH_ENABLED = previousFlag
    }
  }
  console.log(JSON.stringify({ knowledgeWorker: { claimed, completed, failed }, knowledgeReady: ready, knowledgeSearchVerified: searchVerified }, null, 2))
  if (!ready || !searchVerified) console.warn("Knowledge retrieval is not verified; keep KNOWLEDGE_SEARCH_ENABLED disabled.")
  return { ready, searchVerified }
}

async function verifyFixture(db: SupabaseClient, context: FixtureContext): Promise<void> {
  const [companies, jobs, applications, invoices, payments, warnings, events, periods] = await Promise.all([
    db.from("companies").select("id, institution_id").in("id", [...FIXTURE_IDS.companies]),
    db.from("job_posts").select("id, institution_id, company_id").in("id", [...FIXTURE_IDS.jobPosts]),
    db.from("applications").select("id, job_post_id, student_id, status").in("id", [...FIXTURE_IDS.applications]),
    db.from("invoices").select("id, payment_plan_id, amount_due, status").in("id", [...FIXTURE_IDS.invoices]),
    db.from("payments").select("id, invoice_id, amount_paid").eq("id", FIXTURE_IDS.payment),
    db.from("warning_letters").select("id, institution_id, student_id, current_rate").eq("id", FIXTURE_IDS.warning),
    db.from("academic_calendar_events").select("id, institution_id, start_date, end_date").in("id", [...FIXTURE_IDS.calendarEvents]),
    db.from("periods").select("id, institution_id, period_number").in("id", [...FIXTURE_IDS.periods]),
  ])
  for (const result of [companies, jobs, applications, invoices, payments, warnings, events, periods]) {
    if (result.error) throw new Error(`Fixture verification query failed: ${result.error.message}`)
  }
  if (companies.data?.length !== 3 || companies.data.some((row) => row.institution_id !== context.institutionId)) throw new Error("Fixture verification failed for companies")
  if (jobs.data?.length !== 4 || jobs.data.some((row) => row.institution_id !== context.institutionId || !FIXTURE_IDS.companies.includes(row.company_id as typeof FIXTURE_IDS.companies[number]))) throw new Error("Fixture verification failed for job posts")
  if (applications.data?.length !== 12 || applications.data.some((row) => !context.cohortIds.includes(row.student_id as string))) throw new Error("Fixture verification failed for applications")
  if (new Set(applications.data?.map((row) => row.status)).size < 5) throw new Error("Fixture verification failed for mixed application statuses")
  if (invoices.data?.length !== 3 || invoices.data.reduce((sum, row) => sum + Number(row.amount_due), 0) !== 120000) throw new Error("Fixture verification failed for invoices")
  if (payments.data?.length !== 1 || payments.data[0]?.invoice_id !== FIXTURE_IDS.invoices[0]) throw new Error("Fixture verification failed for payment")
  if (warnings.data?.length !== 1 || warnings.data[0]?.institution_id !== context.institutionId || Number(warnings.data[0]?.current_rate) !== 68.5) throw new Error("Fixture verification failed for warning letter")
  if (events.data?.length !== 4 || events.data.some((row) => row.institution_id !== context.institutionId || row.start_date > row.end_date)) throw new Error("Fixture verification failed for calendar events")
  if (periods.data?.length !== 5 || new Set(periods.data?.map((row) => row.period_number)).size !== 5) throw new Error("Fixture verification failed for periods")
  console.log(JSON.stringify({ fixtureVerification: { companies: 3, jobPosts: 4, applications: 12, invoices: 3, payments: 1, warnings: 1, calendarEvents: 4, periods: 5 } }, null, 2))
}

async function cleanup(db: SupabaseClient): Promise<void> {
  const deletes: Array<[string, string[]]> = [
    ["payments", [FIXTURE_IDS.payment]],
    ["invoices", [...FIXTURE_IDS.invoices]],
    ["payment_plans", [FIXTURE_IDS.paymentPlan]],
    ["applications", [...FIXTURE_IDS.applications]],
    ["job_posts", [...FIXTURE_IDS.jobPosts]],
    ["companies", [...FIXTURE_IDS.companies]],
    ["warning_letters", [FIXTURE_IDS.warning]],
    ["academic_calendar_events", [...FIXTURE_IDS.calendarEvents]],
    ["periods", [...FIXTURE_IDS.periods]],
  ]
  for (const [table, ids] of deletes) {
    if (DRY_RUN) {
      log(`would delete ${table}: ${ids.length} fixture rows`)
      continue
    }
    const { error } = await db.from(table).delete().in("id", ids)
    if (error) throw new Error(`${table} cleanup failed: ${error.message}`)
    counters.deleted += ids.length
  }
  if (DRY_RUN) {
    log(`would remove knowledge storage object ${FIXTURE_IDS.knowledgeDocument}.txt and document ${FIXTURE_IDS.knowledgeDocument}`)
    return
  }
  const storagePath = `${TARGET_ORGANIZATION_ID}/${TARGET_INSTITUTION_ID}/${FIXTURE_IDS.knowledgeDocument}.txt`
  const { error: storageError } = await db.storage.from(KNOWLEDGE_BUCKET).remove([storagePath])
  if (storageError) throw new Error(`Knowledge storage cleanup failed: ${storageError.message}`)
  const { error: documentError } = await db.from("knowledge_documents").delete().eq("id", FIXTURE_IDS.knowledgeDocument)
  if (documentError) throw new Error(`Knowledge document cleanup failed: ${documentError.message}`)
  counters.deleted += 1
}

async function main(): Promise<void> {
  requireEnvironment()
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  console.log(`SkillArc client-meeting fixture (${CLEANUP ? "cleanup" : DRY_RUN ? "dry-run" : "apply"})`)
  const context = await validateTarget(db)
  console.log(JSON.stringify({ targetInstitution: TARGET_INSTITUTION_NAME, institutionId: context.institutionId, organizationId: context.organizationId, primaryStudent: PRIMARY_STUDENT_NAME, cohortSize: context.cohortIds.length }, null, 2))

  if (CLEANUP) {
    await cleanup(db)
    console.log(JSON.stringify({ counters }, null, 2))
    return
  }

  const today = new Date()
  await seedPlacements(db, context, today)
  await seedBillingAndWarning(db, context, today)
  await seedTimetableAndCalendar(db, context, today)
  await seedKnowledgeDocument(db, context)
  const knowledge = await processKnowledge(db, context)

  if (DRY_RUN) {
    console.log("Dry-run complete. No database or storage records were changed.")
    console.log(JSON.stringify({ counters, knowledge }, null, 2))
    return
  }
  await verifyFixture(db, context)
  console.log(JSON.stringify({ counters, knowledge }, null, 2))
}

main().catch((error) => {
  console.error(`Client-meeting fixture failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
