import {
  academicTimeContext,
  isAcademicTimeZone,
} from "@/lib/academic-time-zone"

export type AcademicTimeZoneActor = {
  id: string
  role: string
  is_active: boolean | null
  institution_id: string | null
  organization_id: string | null
}

export class AcademicTimeZoneError extends Error {
  constructor(
    public status: 400 | 403 | 503,
    message: string,
  ) {
    super(message)
  }
}

type Dependencies = {
  actor: () => Promise<AcademicTimeZoneActor | null>
  save: (
    actor: AcademicTimeZoneActor,
    zone: string | null,
  ) => Promise<string | null>
}

/** Kept separate from the Next route so the real HTTP boundary is testable. */
export function createAcademicTimeZoneHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const headers = { "Cache-Control": "private, no-store" }
    const json = (body: unknown, status = 200) =>
      Response.json(body, { status, headers })
    try {
      const actor = await deps.actor()
      if (!actor) return json({ error: "Unauthorized" }, 401)
      if (
        actor.is_active !== true ||
        actor.role !== "INSTITUTION_ADMIN" ||
        !actor.institution_id ||
        !actor.organization_id
      ) {
        return json({ error: "Forbidden" }, 403)
      }
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return json({ error: "Invalid JSON" }, 400)
      }
      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).length !== 1 ||
        !("academic_time_zone" in body)
      ) {
        return json({ error: "Provide only academic_time_zone" }, 400)
      }
      const zone = body.academic_time_zone
      if (zone !== null && !isAcademicTimeZone(zone)) {
        return json({ error: "Use a supported IANA timezone or null" }, 400)
      }
      const saved = await deps.save(actor, zone)
      return json({
        academic_time_zone: saved,
        academic_time_zone_status: academicTimeContext(saved, new Date())
          .status,
      })
    } catch (error) {
      if (error instanceof AcademicTimeZoneError)
        return json({ error: error.message }, error.status)
      return json(
        { error: "Institution timezone is temporarily unavailable" },
        503,
      )
    }
  }
}
