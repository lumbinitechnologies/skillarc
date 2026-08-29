import { randomUUID } from "node:crypto"
import { createClient } from "@supabase/supabase-js"

const APPLY = process.argv.includes("--apply")
const DRY_RUN = !APPLY

const DEMO_ORGANIZATION = "Test Organization"
const DEMO_INSTITUTION = "Test Institution"
const PROGRAM_NAME = "B tech CSE AIML"
const DEPARTMENT_NAME = "Computer Science and Engineering"
const SECTION_NAME = "CSE AIML A"
const SEMESTER = 1
const ACADEMIC_YEAR = "2026-2027"

const EMAILS = {
  SUPER_ADMIN: "lumbini.tech01@gmail.com",
  ORG_ADMIN: "nikhilkrishnatest3@gmail.com",
  INSTITUTION_ADMIN: "nikhilkrishnatest4@gmail.com",
  FACULTY: "chitrasuchistudios@gmail.com",
  STUDENT: "juug24btech18460@jainuniversity.ac.in",
  PARENT: "ksathyanarayana1963@gmail.com",
}

const DISPLAY_NAMES = {
  SUPER_ADMIN: "Lumbini Technologies",
  ORG_ADMIN: "Test Org Admin",
  INSTITUTION_ADMIN: "Test Institution Admin",
  FACULTY: "Test Faculty",
  STUDENT: "Sai Kiran",
  PARENT: "K. Sathyanarayana",
}

const SUBJECTS = [
  { code: "CSE101", name: "Data Structures", credits: 4, subject_type: "THEORY" },
  { code: "CSE202", name: "Database Management Systems", credits: 4, subject_type: "THEORY" },
  { code: "CSE203", name: "Machine Learning Fundamentals", credits: 4, subject_type: "THEORY" },
  { code: "CSE204", name: "Web Technologies", credits: 3, subject_type: "LAB" },
  { code: "CSE205", name: "Computer Networks", credits: 3, subject_type: "THEORY" },
]

const PERIOD_TIMINGS = [
  { id: "P1", label: "Period 1", time: "08:45 - 09:45" },
  { id: "P2", label: "Period 2", time: "09:45 - 10:45" },
  { id: "P3", label: "Period 3", time: "11:00 - 12:00" },
  { id: "P4", label: "Period 4", time: "13:00 - 14:00" },
  { id: "P5", label: "Period 5", time: "14:00 - 15:00" },
]

const SCHEDULE = [
  ["Monday", 1, 0],
  ["Monday", 2, 1],
  ["Tuesday", 1, 2],
  ["Tuesday", 2, 3],
  ["Wednesday", 1, 4],
  ["Wednesday", 2, 0],
  ["Thursday", 1, 1],
  ["Thursday", 2, 2],
  ["Friday", 1, 3],
  ["Friday", 2, 4],
]

const log = (message) => console.log(`${DRY_RUN ? "[dry-run]" : "[apply]"} ${message}`)
const counters = { inserted: 0, updated: 0, unchanged: 0 }

function valuesEqual(left, right) {
  if (left === right) return true
  if (left && right && typeof left === "object" && typeof right === "object") {
    return JSON.stringify(left) === JSON.stringify(right)
  }
  return false
}

function requireEnvironment() {
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!process.env[key]) throw new Error(`${key} is required`)
  }
}

function formatDate(date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date, days) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function currentMonday() {
  const today = new Date()
  const day = today.getUTCDay()
  const daysSinceMonday = day === 0 ? 6 : day - 1
  return addDays(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())), -daysSinceMonday)
}

function isoDateOffset(days) {
  const today = new Date()
  const base = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 12, 0, 0))
  // PostgREST returns timestamp-without-time-zone values in this canonical form.
  return `${formatDate(addDays(base, days))}T12:00:00`
}

function isoDateValueOffset(dateValue, days) {
  const base = new Date(`${dateValue.slice(0, 10)}T12:00:00Z`)
  return `${formatDate(addDays(base, days))}T12:00:00`
}

function isEmptyPeriodTimings(value) {
  return !Array.isArray(value) || value.length === 0
}

async function findOne(db, table, filters) {
  let query = db.from(table).select("*").limit(1)
  for (const [column, value] of Object.entries(filters)) {
    query = value === null ? query.is(column, null) : query.eq(column, value)
  }
  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(`${table} lookup failed: ${error.message}`)
  return data ?? null
}

async function findMany(db, table, filters) {
  let query = db.from(table).select("*")
  for (const [column, value] of Object.entries(filters)) {
    query = value === null ? query.is(column, null) : query.eq(column, value)
  }
  const { data, error } = await query
  if (error) throw new Error(`${table} lookup failed: ${error.message}`)
  return data ?? []
}

async function applyInsert(db, table, payload) {
  const { data, error } = await db.from(table).insert(payload).select("*").single()
  if (error) throw new Error(`${table} insert failed: ${error.message}`)
  counters.inserted += 1
  return data
}

async function applyUpdate(db, table, id, payload) {
  const { data, error } = await db.from(table).update(payload).eq("id", id).select("*").single()
  if (error) throw new Error(`${table} update failed: ${error.message}`)
  counters.updated += 1
  return data
}

async function ensureByFilters(db, table, filters, payload, label = table) {
  const existing = await findOne(db, table, filters)
  if (existing) {
    const changes = Object.fromEntries(
      Object.entries(payload).filter(([key, value]) => key !== "id" && !valuesEqual(existing[key], value)),
    )
    if (Object.keys(changes).length === 0) {
      counters.unchanged += 1
      return existing
    }
    log(`update ${label} ${existing.id}`)
    if (DRY_RUN) {
      counters.updated += 1
      return { ...existing, ...changes }
    }
    return applyUpdate(db, table, existing.id, changes)
  }

  const row = { id: payload.id ?? randomUUID(), ...payload }
  log(`insert ${label} ${row.id}`)
  if (DRY_RUN) {
    counters.inserted += 1
    return row
  }
  return applyInsert(db, table, row)
}

async function ensureUser(db, authUser, role, scope) {
  const payload = {
    id: authUser.id,
    email: authUser.email,
    name: DISPLAY_NAMES[role],
    role,
    ...scope,
  }
  return ensureByFilters(db, "users", { id: authUser.id }, payload, `user ${authUser.email}`)
}

async function resolveAuthUsers(db) {
  const users = []
  let page = 1
  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`Auth lookup failed: ${error.message}`)
    users.push(...(data.users ?? []))
    if (!data.users || data.users.length < 1000) break
    page += 1
  }

  const byEmail = new Map(users.map((user) => [user.email?.toLowerCase(), user]))
  const resolved = {}
  for (const [role, email] of Object.entries(EMAILS)) {
    const authUser = byEmail.get(email.toLowerCase())
    if (!authUser) throw new Error(`Required Auth account is missing: ${email}`)
    resolved[role] = authUser
  }
  return resolved
}

async function ensureOrganizationAndInstitution(db) {
  const organization = await findOne(db, "organizations", { name: DEMO_ORGANIZATION })
  if (!organization) throw new Error(`Demo organization not found: ${DEMO_ORGANIZATION}`)

  const features = Array.isArray(organization.features) ? organization.features : []
  if (!features.includes("multi_week_timetable")) {
    log(`enable multi_week_timetable on ${DEMO_ORGANIZATION}`)
    if (DRY_RUN) {
      counters.updated += 1
    } else {
      await applyUpdate(db, "organizations", organization.id, { features: [...features, "multi_week_timetable"] })
    }
    organization.features = [...features, "multi_week_timetable"]
  } else {
    counters.unchanged += 1
  }

  const institution = await findOne(db, "institutions", {
    name: DEMO_INSTITUTION,
    organization_id: organization.id,
  })
  if (!institution) throw new Error(`Demo institution not found: ${DEMO_INSTITUTION}`)
  return { organization, institution }
}

async function ensureAcademicStructure(db, institution, facultyId, studentId) {
  let department = await findOne(db, "departments", {
    institution_id: institution.id,
    name: DEPARTMENT_NAME,
  })
  if (!department) {
    department = await ensureByFilters(
      db,
      "departments",
      { institution_id: institution.id, name: DEPARTMENT_NAME },
      { institution_id: institution.id, name: DEPARTMENT_NAME },
      "CSE department",
    )
  }

  let program = await findOne(db, "programs", {
    institution_id: institution.id,
    name: PROGRAM_NAME,
  })
  if (!program) {
    program = await ensureByFilters(
      db,
      "programs",
      { institution_id: institution.id, name: PROGRAM_NAME },
      { institution_id: institution.id, department_id: department.id, name: PROGRAM_NAME },
      "CSE program",
    )
  } else if (program.department_id !== department.id) {
    program = await applyOrPreviewUpdate(db, "programs", program, { department_id: department.id }, "CSE program department")
  }

  let section = await findOne(db, "sections", {
    institution_id: institution.id,
    program_id: program.id,
    name: SECTION_NAME,
  })
  if (!section) {
    section = await ensureByFilters(
      db,
      "sections",
      { institution_id: institution.id, program_id: program.id, name: SECTION_NAME },
      {
        institution_id: institution.id,
        program_id: program.id,
        name: SECTION_NAME,
        semester: SEMESTER,
        faculty_advisor_id: facultyId,
      },
      "CSE section",
    )
  } else {
    section = await applyOrPreviewUpdate(
      db,
      "sections",
      section,
      { semester: SEMESTER, faculty_advisor_id: facultyId },
      "CSE section advisor",
    )
  }

  const student = await applyOrPreviewUpdate(
    db,
    "students",
    await findOne(db, "students", { id: studentId }),
    {
      institution_id: institution.id,
      program_id: program.id,
      section_id: section.id,
      semester: SEMESTER,
      registration_number: "24BTECH18460",
      admission_year: 2026,
    },
    "student academic profile",
  )

  const subjects = []
  for (const definition of SUBJECTS) {
    let subject = await findOne(db, "subjects", {
      institution_id: institution.id,
      program_id: program.id,
      code: definition.code,
    })
    if (!subject && definition.name === "Data Structures") {
      subject = await findOne(db, "subjects", {
        institution_id: institution.id,
        program_id: program.id,
        name: definition.name,
      })
    }
    subject = subject
      ? await applyOrPreviewUpdate(db, "subjects", subject, {
          ...definition,
          institution_id: institution.id,
          program_id: program.id,
          semester: SEMESTER,
        }, `subject ${definition.code}`)
      : await ensureByFilters(
          db,
          "subjects",
          { institution_id: institution.id, program_id: program.id, code: definition.code },
          {
            ...definition,
            institution_id: institution.id,
            program_id: program.id,
            semester: SEMESTER,
          },
          `subject ${definition.code}`,
        )
    subjects.push(subject)

    await ensureByFilters(
      db,
      "faculty_subjects",
      {
        institution_id: institution.id,
        faculty_id: facultyId,
        subject_id: subject.id,
        section_id: section.id,
      },
      {
        institution_id: institution.id,
        faculty_id: facultyId,
        subject_id: subject.id,
        section_id: section.id,
        semester: SEMESTER,
        academic_year: ACADEMIC_YEAR,
      },
      `faculty assignment ${definition.code}`,
    )
  }

  await ensureByFilters(
    db,
    "staff",
    { id: facultyId },
    { id: facultyId, institution_id: institution.id, employee_id: "FAC-DEMO-001" },
    "faculty staff profile",
  )

  return { department, program, section, student, subjects }
}

async function applyOrPreviewUpdate(db, table, existing, changes, label) {
  if (!existing) throw new Error(`${label} target record is missing`)
  const changed = Object.fromEntries(
    Object.entries(changes).filter(([key, value]) => !valuesEqual(existing[key], value)),
  )
  if (Object.keys(changed).length === 0) {
    counters.unchanged += 1
    return existing
  }
  log(`update ${label} ${existing.id}`)
  if (DRY_RUN) {
    counters.updated += 1
    return { ...existing, ...changed }
  }
  return applyUpdate(db, table, existing.id, changed)
}

async function ensureSettings(db, institutionId) {
  const existing = await findOne(db, "institution_timetable_settings", { institution_id: institutionId })
  if (!existing) {
    const payload = {
      institution_id: institutionId,
      start_time: "08:45:00",
      end_time: "15:00:00",
      period_duration_minutes: 60,
      number_of_periods: 5,
      period_timings: PERIOD_TIMINGS,
    }
    log(`insert timetable settings ${institutionId}`)
    if (DRY_RUN) counters.inserted += 1
    else await applyInsert(db, "institution_timetable_settings", payload)
  } else if (isEmptyPeriodTimings(existing.period_timings)) {
    const changes = { number_of_periods: 5, period_timings: PERIOD_TIMINGS }
    log(`update timetable settings ${institutionId}`)
    if (DRY_RUN) {
      counters.updated += 1
    } else {
      const { error } = await db
        .from("institution_timetable_settings")
        .update(changes)
        .eq("institution_id", institutionId)
      if (error) throw new Error(`timetable settings update failed: ${error.message}`)
      counters.updated += 1
    }
  } else {
    counters.unchanged += 1
  }
}

async function ensureWeeks(db, institutionId, sectionId) {
  const existing = await findMany(db, "timetable_weeks", {
    institution_id: institutionId,
    section_id: sectionId,
    semester: SEMESTER,
  })
  const byNumber = new Map(existing.map((week) => [week.week_number, week]))
  const monday = currentMonday()
  const weeks = []
  for (let number = 1; number <= 12; number += 1) {
    const start = addDays(monday, (number - 1) * 7)
    const end = addDays(start, 5)
    const payload = {
      institution_id: institutionId,
      section_id: sectionId,
      semester: SEMESTER,
      week_number: number,
      title: `Week ${number}`,
      start_date: formatDate(start),
      end_date: formatDate(end),
    }
    const prior = byNumber.get(number)
    const week = prior
      ? await applyOrPreviewUpdate(db, "timetable_weeks", prior, payload, `week ${number}`)
      : await ensureByFilters(
          db,
          "timetable_weeks",
          { institution_id: institutionId, section_id: sectionId, semester: SEMESTER, week_number: number },
          payload,
          `week ${number}`,
        )
    weeks.push(week)
  }
  return weeks
}

async function ensureSlot(db, payload, label) {
  const filters = {
    institution_id: payload.institution_id,
    section_id: payload.section_id,
    semester: payload.semester,
    day: payload.day,
    period: payload.period,
  }
  let query = db.from("timetable_slots").select("*").match(filters).limit(1)
  query = payload.week_id === null ? query.is("week_id", null) : query.eq("week_id", payload.week_id)
  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(`timetable slot lookup failed: ${error.message}`)
  if (data) return applyOrPreviewUpdate(db, "timetable_slots", data, payload, label)

  // The live database currently has a legacy unique constraint that does not
  // include week_id. If a static slot occupies this cell, move that target
  // section slot to the active week instead of attempting a duplicate insert.
  if (payload.week_id !== null) {
    const { data: legacySlot, error: legacyError } = await db
      .from("timetable_slots")
      .select("*")
      .match(filters)
      .limit(1)
      .maybeSingle()
    if (legacyError) throw new Error(`legacy timetable slot lookup failed: ${legacyError.message}`)
    if (legacySlot) return applyOrPreviewUpdate(db, "timetable_slots", legacySlot, payload, label)
  }

  return ensureByFilters(db, "timetable_slots", { ...filters, week_id: payload.week_id }, payload, label)
}

async function ensureTimetables(db, organizationId, institutionId, sectionId, facultyId, subjects, activeWeekId) {
  for (const [day, period, subjectIndex] of SCHEDULE) {
    const subjectId = subjects[subjectIndex].id
    const base = {
      institution_id: institutionId,
      organization_id: organizationId,
      section_id: sectionId,
      semester: SEMESTER,
      day,
      period,
      subject_id: subjectId,
      faculty_id: facultyId,
    }
    // The live timetable_slots_unique_slot constraint predates week_id and
    // allows only one row per logical cell. Seed the active demo week, moving
    // any existing target-section static row into that week when necessary.
    await ensureSlot(db, { ...base, week_id: activeWeekId }, `active timetable ${day} P${period}`)
  }
}

async function ensurePortalAndRelations(db, institutionId, studentId, parentId, actorId) {
  const existingPortal = await findOne(db, "student_portal_access", { student_id: studentId })
  await ensureByFilters(
    db,
    "student_portal_access",
    { student_id: studentId },
    {
      student_id: studentId,
      institution_id: institutionId,
      auth_user_id: studentId,
      status: "ACTIVE",
      activated_at: existingPortal?.activated_at ?? new Date().toISOString(),
      activated_by: actorId,
      deactivated_at: null,
      deactivated_by: null,
    },
    "student portal access",
  )

  const relations = await findMany(db, "parent_student_relations", { student_id: studentId })
  if (relations.length === 0) {
    await ensureByFilters(
      db,
      "parent_student_relations",
      { parent_id: parentId, student_id: studentId },
      { parent_id: parentId, student_id: studentId, relationship: "Parent" },
      "parent-student relation",
    )
  } else {
    for (const relation of relations) {
      await applyOrPreviewUpdate(db, "parent_student_relations", relation, {
        parent_id: parentId,
        relationship: relation.relationship || "Parent",
      }, "parent-student relation")
    }
  }
}

async function ensureAttendance(db, institutionId, sectionId, facultyId, studentId, subjects) {
  const monday = currentMonday()
  const statuses = ["PRESENT", "PRESENT", "ABSENT", "PRESENT"]
  for (let subjectIndex = 0; subjectIndex < subjects.length; subjectIndex += 1) {
    for (let offset = 1; offset <= 4; offset += 1) {
      const date = formatDate(addDays(monday, -offset * 7 + 1))
      const period = (subjectIndex % 5) + 1
      const existing = await findOne(db, "attendance_sessions", {
        subject_id: subjects[subjectIndex].id,
        faculty_id: facultyId,
        section_id: sectionId,
        attendance_date: date,
        period,
      })
      const session = existing
        ? await applyOrPreviewUpdate(db, "attendance_sessions", existing, {}, "attendance session")
        : await ensureByFilters(
            db,
            "attendance_sessions",
            {
              subject_id: subjects[subjectIndex].id,
              faculty_id: facultyId,
              section_id: sectionId,
              attendance_date: date,
              period,
            },
            {
              subject_id: subjects[subjectIndex].id,
              faculty_id: facultyId,
              section_id: sectionId,
              attendance_date: date,
              period,
            },
            "attendance session",
          )
      await ensureByFilters(
        db,
        "attendance_records",
        { session_id: session.id, student_id: studentId },
        { session_id: session.id, student_id: studentId, status: statuses[(subjectIndex + offset - 1) % statuses.length] },
        "attendance record",
      )
    }
  }
}

function assignmentDefinitions(subjects) {
  return [
    {
      subject_id: subjects[0].id,
      title: "Arrays & Complexity Analysis",
      description: "Compare array, linked-list, stack, and queue operations with complexity analysis.",
      due_date: isoDateOffset(-14),
      type: "Assignment",
      max_score: 100,
      graded: true,
      grade: 86,
      feedback: "Strong analysis. Add one more example for amortized complexity.",
    },
    {
      subject_id: subjects[1].id,
      title: "SQL Schema Design Exercise",
      description: "Design a normalized schema for a university course-registration workflow.",
      due_date: isoDateOffset(-10),
      type: "Assignment",
      max_score: 100,
      graded: true,
      grade: 78,
      feedback: "Good normalization choices; review foreign-key indexing.",
    },
    {
      subject_id: subjects[2].id,
      title: "Exploratory Data Analysis Notebook",
      description: "Prepare a short notebook that cleans, summarizes, and visualizes a dataset.",
      due_date: isoDateOffset(-7),
      type: "Project",
      max_score: 100,
      graded: true,
      grade: 92,
      feedback: "Excellent visualizations and clear interpretation of the findings.",
    },
    {
      subject_id: subjects[3].id,
      title: "Responsive Learning Portal Prototype",
      description: "Build a responsive landing page for a student learning portal.",
      due_date: isoDateOffset(5),
      type: "Project",
      max_score: 100,
      graded: false,
    },
    {
      subject_id: subjects[4].id,
      title: "Network Security Brief",
      description: "Summarize three practical controls for securing a campus network.",
      due_date: isoDateOffset(-2),
      type: "Assignment",
      max_score: 100,
      graded: false,
    },
  ]
}

async function ensureAssignmentsAndGrades(db, sectionId, facultyId, studentId, subjects) {
  const assignments = []
  for (const definition of assignmentDefinitions(subjects)) {
    const existing = await findOne(db, "assignments", {
      subject_id: definition.subject_id,
      title: definition.title,
    })
    const payload = {
      subject_id: definition.subject_id,
      faculty_id: facultyId,
      title: definition.title,
      description: definition.description,
      due_date: definition.due_date,
      type: definition.type,
      max_score: definition.max_score,
      section_ids: [sectionId],
    }
    const assignment = existing
      ? await applyOrPreviewUpdate(db, "assignments", existing, payload, `assignment ${definition.title}`)
      : await ensureByFilters(db, "assignments", { subject_id: definition.subject_id, title: definition.title }, payload, `assignment ${definition.title}`)
    assignments.push({ ...assignment, ...definition })

    if (definition.graded) {
      const submittedAt = isoDateValueOffset(definition.due_date, -2)
      const submission = await ensureByFilters(
        db,
        "submissions",
        { assignment_id: assignment.id, student_id: studentId },
        {
          assignment_id: assignment.id,
          student_id: studentId,
          submitted_at: submittedAt,
          grade: definition.grade,
          feedback: definition.feedback,
          status: "graded",
        },
        `graded submission ${definition.title}`,
      )

      const column = await ensureByFilters(
        db,
        "grade_columns",
        { subject_id: definition.subject_id, title: "Midterm Assessment" },
        {
          subject_id: definition.subject_id,
          created_by: facultyId,
          title: "Midterm Assessment",
          type: "custom",
          max_score: 100,
          weight: 20,
          display_order: 1,
          is_active: true,
        },
        `grade column ${subjects.find((subject) => subject.id === definition.subject_id)?.code}`,
      )
      await ensureByFilters(
        db,
        "grade_entries",
        { column_id: column.id, student_id: studentId },
        {
          column_id: column.id,
          student_id: studentId,
          score: definition.grade,
          feedback: definition.feedback,
          graded_by: facultyId,
          graded_at: submittedAt,
        },
        `grade entry ${definition.title}`,
      )
      void submission
    }
  }
  return assignments
}

async function ensureAnnouncements(db, institutionId, sectionId, facultyId, subjects, studentId) {
  const definitions = [
    [subjects[0], "Welcome to CSE AIML Semester 1", "Welcome to the new semester. Review the timetable and bring your laptop to the first Data Structures lab."],
    [subjects[1], "Database design clinic", "A database design clinic will run this Friday during Period 4. Bring your schema exercise for feedback."],
    [subjects[2], "Machine learning notebook checkpoint", "The EDA notebook checkpoint is due this week. Submit your cleaned dataset and a short interpretation of two visualizations."],
  ]
  for (const [subject, title, content] of definitions) {
    await ensureByFilters(
      db,
      "subject_announcements",
      { subject_id: subject.id, title },
      {
        subject_id: subject.id,
        faculty_id: facultyId,
        title,
        description: content,
        section_ids: [sectionId],
      },
      `announcement ${title}`,
    )
  }

  const notifications = [
    ["📚 New Assignment Assigned", "You have three graded examples and two upcoming assignments in your CSE AIML courses."],
    ["📢 New Announcement", "Your faculty has posted current semester notices for Data Structures, DBMS, and Machine Learning."],
  ]
  for (const [title, message] of notifications) {
    await ensureByFilters(
      db,
      "notifications",
      { user_id: studentId, title, message },
      { user_id: studentId, title, message, is_read: false },
      `student notification ${title}`,
    )
  }
}

async function verify(db, ids) {
  const users = await findMany(db, "users", {})
  const targetUsers = users.filter((user) => Object.values(EMAILS).includes(user.email))
  const missing = Object.values(EMAILS).filter((email) => !targetUsers.some((user) => user.email === email))
  if (missing.length) throw new Error(`Verification failed; missing application profiles: ${missing.join(", ")}`)

  const relationRows = await findMany(db, "parent_student_relations", { student_id: ids.student.id })
  if (!relationRows.some((relation) => relation.parent_id === ids.parent.id)) {
    throw new Error("Verification failed; parent relation does not point to the demo parent")
  }

  const [subjectRows, facultyRows, slotRows, attendanceRows, assignmentRows, submissionRows, announcementRows, portalRows] = await Promise.all([
    findMany(db, "subjects", { program_id: ids.program.id }),
    findMany(db, "faculty_subjects", { faculty_id: ids.faculty.id, section_id: ids.section.id }),
    findMany(db, "timetable_slots", { section_id: ids.section.id, semester: SEMESTER }),
    findMany(db, "attendance_records", { student_id: ids.student.id }),
    findMany(db, "assignments", {}),
    findMany(db, "submissions", { student_id: ids.student.id }),
    findMany(db, "subject_announcements", {}),
    findMany(db, "student_portal_access", { student_id: ids.student.id }),
  ])

  const assignmentIds = new Set(assignmentRows.map((assignment) => assignment.id))
  const demoAssignments = submissionRows.filter((submission) => assignmentIds.has(submission.assignment_id))
  if (subjectRows.length < SUBJECTS.length) throw new Error("Verification failed; expected CSE subjects are incomplete")
  if (facultyRows.length < SUBJECTS.length) throw new Error("Verification failed; faculty assignments are incomplete")
  if (slotRows.filter((slot) => slot.week_id === ids.activeWeekId).length < SCHEDULE.length) {
    throw new Error("Verification failed; active timetable coverage is incomplete")
  }
  if (attendanceRows.length < SUBJECTS.length * 4) throw new Error("Verification failed; attendance coverage is incomplete")
  if (demoAssignments.length < 3) throw new Error("Verification failed; graded submissions are incomplete")
  const demoSubjectIds = new Set(ids.subjects.map((subject) => subject.id))
  if (announcementRows.filter((announcement) => demoSubjectIds.has(announcement.subject_id)).length < 3) {
    throw new Error("Verification failed; announcements are incomplete")
  }
  if (!portalRows.some((row) => row.status === "ACTIVE")) throw new Error("Verification failed; student portal is not active")

  return {
    profiles: targetUsers.length,
    subjects: subjectRows.length,
    facultyAssignments: facultyRows.length,
    timetableSlots: slotRows.length,
    attendanceRecords: attendanceRows.length,
    gradedSubmissions: demoAssignments.length,
    announcements: announcementRows.length,
    portalAccess: portalRows[0]?.status ?? null,
  }
}

async function main() {
  requireEnvironment()
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`SkillArc demo data seed (${DRY_RUN ? "dry-run; pass --apply to write" : "apply mode"})`)
  const authUsers = await resolveAuthUsers(db)
  const { organization, institution } = await ensureOrganizationAndInstitution(db)

  const superAdmin = await ensureUser(db, authUsers.SUPER_ADMIN, "SUPER_ADMIN", {})
  const orgAdmin = await ensureUser(db, authUsers.ORG_ADMIN, "ORG_ADMIN", { organization_id: organization.id, institution_id: null })
  const institutionAdmin = await ensureUser(db, authUsers.INSTITUTION_ADMIN, "INSTITUTION_ADMIN", { organization_id: organization.id, institution_id: institution.id })
  const faculty = await ensureUser(db, authUsers.FACULTY, "FACULTY", { organization_id: organization.id, institution_id: institution.id })
  const student = await ensureUser(db, authUsers.STUDENT, "STUDENT", { organization_id: organization.id, institution_id: institution.id })
  const parent = await ensureUser(db, authUsers.PARENT, "PARENT", { organization_id: organization.id, institution_id: institution.id })
  void superAdmin
  void orgAdmin

  const academic = await ensureAcademicStructure(db, institution, faculty.id, student.id)
  await ensureSettings(db, institution.id)
  const weeks = await ensureWeeks(db, institution.id, academic.section.id)
  await ensureTimetables(db, organization.id, institution.id, academic.section.id, faculty.id, academic.subjects, weeks[0].id)
  await ensurePortalAndRelations(db, institution.id, student.id, parent.id, institutionAdmin.id)
  await ensureAttendance(db, institution.id, academic.section.id, faculty.id, student.id, academic.subjects)
  await ensureAssignmentsAndGrades(db, academic.section.id, faculty.id, student.id, academic.subjects)
  await ensureAnnouncements(db, institution.id, academic.section.id, faculty.id, academic.subjects, student.id)

  if (DRY_RUN) {
    console.log("Dry-run complete. No database records were changed.")
    console.log(JSON.stringify({ counters, organizationId: organization.id, institutionId: institution.id }, null, 2))
    return
  }

  const verification = await verify(db, {
    organization,
    institution,
    program: academic.program,
    section: academic.section,
    subjects: academic.subjects,
    activeWeekId: weeks[0].id,
    student,
    parent,
    faculty,
  })
  console.log("Demo data seed and verification complete.")
  console.log(JSON.stringify({ counters, verification }, null, 2))
}

main().catch((error) => {
  console.error(`Seed failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
