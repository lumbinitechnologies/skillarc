import { MobileAuthError, requireMobilePrincipal, type MobilePrincipal } from "@/lib/mobile-auth"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { readAcademicScope, requireStudent } from "./academic-scope"
import { InvalidAcademicSelector, readCourses, readTasks, readTimetable, readTimetableSelectors } from "./academic-reads"

type AcademicRead = "courses" | "timetable" | "tasks"

export function academicHandler(
  operation: AcademicRead,
  dependencies: {
    authenticate: (request: Request) => Promise<MobilePrincipal>
    database: typeof createSupabaseAdminClient
    now: () => Date
  } = {
    authenticate: request => requireMobilePrincipal(request, { distinguishAuthOutage: true }),
    database: createSupabaseAdminClient,
    now: () => new Date(),
  },
) {
  return async function GET(request: Request) {
    const requestId = crypto.randomUUID()
    const headers = { "Cache-Control": "private, no-store", "X-Request-Id": requestId }
    try {
      const student = requireStudent(await dependencies.authenticate(request))
      const selectors = operation === "timetable" ? readTimetableSelectors(new URL(request.url)) : null
      const db = dependencies.database()
      const scope = await readAcademicScope(db, student, dependencies.now())
      const data = selectors ? await readTimetable(db, scope, selectors)
        : operation === "courses" ? await readCourses(db, scope) : await readTasks(db, scope)
      return Response.json({ data, request_id: requestId }, { headers })
    } catch (error) {
      const known = error instanceof MobileAuthError ? error
        : error instanceof InvalidAcademicSelector ? { status: 400, code: "INVALID_SELECTOR", message: error.message }
        : { status: 503, code: "SERVICE_UNAVAILABLE", message: "Academic information is temporarily unavailable" }
      return Response.json(
        { error: { code: known.code, message: known.message }, request_id: requestId },
        { headers, status: known.status },
      )
    }
  }
}
