import type { TableRow } from "@/lib/database-row"
import { createSupabaseServerClient } from "@/lib/supabase-server"
type FacultyProfile = Pick<TableRow<"users">, "name" | "role" | "institution_id"> | null
type FacultySubject = Pick<TableRow<"subjects">, "id" | "name" | "code">
type FacultyTimetable = {
  day: string
  period: string
  section_id: string | null
  subjects: FacultySubject | undefined
  sections: { name: string } | undefined
}

const CACHE_DEBUG = process.env.CACHE_DEBUG === "1"
function debugLog(...args: unknown[]) {
  if (CACHE_DEBUG) console.debug("[faculty-cache]", ...args)
}

function createTTLCache<T>(ttlMs: number) {
  const store = new Map<string, { value: T; expiresAt: number }>()

  return {
    get(key: string) {
      const entry = store.get(key)
      if (!entry) return undefined
      if (Date.now() > entry.expiresAt) {
        store.delete(key)
        return undefined
      }
      return entry.value
    },
    set(key: string, value: T) {
      store.set(key, { value, expiresAt: Date.now() + ttlMs })
    },
    delete(key: string) {
      store.delete(key)
    },
  }
}

const facultyProfileCache = createTTLCache<FacultyProfile>(300_000)
const institutionNameCache = createTTLCache<string | null>(300_000)
const facultySubjectsCache = createTTLCache<FacultySubject[]>(60_000)
const facultyTimetableCache = createTTLCache<FacultyTimetable[]>(30_000)
// In-flight request maps to dedupe concurrent fetches for the same key
const facultyProfileInFlight = new Map<string, Promise<FacultyProfile>>()
const institutionNameInFlight = new Map<string, Promise<string | null>>()
const facultySubjectsInFlight = new Map<string, Promise<FacultySubject[]>>()
const facultyTimetableInFlight = new Map<string, Promise<FacultyTimetable[]>>()

export async function getFacultyProfile(userId: string) {
  const cached = facultyProfileCache.get(userId)
  if (cached !== undefined) {
    debugLog("hit profile", userId)
    return cached
  }

  const inFlight = facultyProfileInFlight.get(userId)
  if (inFlight) {
    debugLog("reusing in-flight profile fetch for", userId)
    return inFlight
  }

  debugLog("miss -> fetching profile for", userId)
  const promise = (async () => {
    try {
      const supabase = await createSupabaseServerClient()
      const { data } = await supabase
        .from("users")
        .select("name, role, institution_id")
        .eq("id", userId)
        .single()

      facultyProfileCache.set(userId, data)
      return data
    } finally {
      facultyProfileInFlight.delete(userId)
    }
  })()

  facultyProfileInFlight.set(userId, promise)
  return promise
}

export async function getInstitutionName(institutionId: string | null | undefined) {
  if (!institutionId) return null
  const cached = institutionNameCache.get(institutionId)
  if (cached !== undefined) {
    debugLog("hit institution name", institutionId)
    return cached
  }

  debugLog("miss -> fetching institution name for", institutionId)
  const inFlight = institutionNameInFlight.get(institutionId)
  if (inFlight) {
    debugLog("reusing in-flight institution fetch for", institutionId)
    return inFlight
  }

  const promise = (async () => {
    try {
      const supabase = await createSupabaseServerClient()
      const { data } = await supabase
        .from("institutions")
        .select("name")
        .eq("id", institutionId)
        .single()

      const name = data?.name ?? null
      institutionNameCache.set(institutionId, name)
      return name
    } finally {
      institutionNameInFlight.delete(institutionId)
    }
  })()

  institutionNameInFlight.set(institutionId, promise)
  return promise
}

export async function getFacultySubjects(userId: string) {
  const cached = facultySubjectsCache.get(userId)
  if (cached !== undefined) {
    debugLog("hit subjects", userId)
    return cached
  }

  const inFlight = facultySubjectsInFlight.get(userId)
  if (inFlight) {
    debugLog("reusing in-flight subjects fetch for", userId)
    return inFlight
  }

  debugLog("miss -> fetching subjects for", userId)
  const promise = (async () => {
    try {
      const supabase = await createSupabaseServerClient()
      const { data: assignedSubjects } = await supabase
        .from("faculty_subjects")
        .select("subject_id")
        .eq("faculty_id", userId)
        .limit(10)

      const subjectIds = (assignedSubjects ?? []).map((row) => row.subject_id)
      if (subjectIds.length === 0) {
        facultySubjectsCache.set(userId, [])
        return []
      }

      const { data: subjects } = await supabase
        .from("subjects")
        .select("id, name, code")
        .in("id", subjectIds)

      const resolved = subjects ?? []
      facultySubjectsCache.set(userId, resolved)
      return resolved
    } finally {
      facultySubjectsInFlight.delete(userId)
    }
  })()

  facultySubjectsInFlight.set(userId, promise)
  return promise
}

export async function getFacultyTimetable(userId: string, institutionId: string | null | undefined) {
  const cacheKey = `${userId}:${institutionId}`
  const cached = facultyTimetableCache.get(cacheKey)
  if (cached !== undefined) {
    debugLog("hit timetable", cacheKey)
    return cached
  }

  const inFlight = facultyTimetableInFlight.get(cacheKey)
  if (inFlight) {
    debugLog("reusing in-flight timetable fetch for", cacheKey)
    return inFlight
  }

  if (!institutionId) {
    facultyTimetableCache.set(cacheKey, [])
    return []
  }

  debugLog("miss -> fetching timetable for", cacheKey)
  const promise = (async () => {
    try {
      const supabase = await createSupabaseServerClient()
      const { data: timetableRows } = await supabase
    .from("timetable_slots")
    .select(`
      day,
      period,
      section_id,
      subjects!inner(id, name, code),
      sections!inner(name)
    `)
    .eq("institution_id", institutionId)
    .eq("faculty_id", userId)
    .order("day")
    .order("period")
    .limit(12)
      const resolved = (timetableRows ?? []).map((slot) => ({
        day: slot.day,
        period: slot.period,
        section_id: slot.section_id,
        subjects: Array.isArray(slot.subjects) ? slot.subjects[0] : slot.subjects,
        sections: Array.isArray(slot.sections) ? slot.sections[0] : slot.sections,
      }))

      facultyTimetableCache.set(cacheKey, resolved)
      return resolved
    } finally {
      facultyTimetableInFlight.delete(cacheKey)
    }
  })()

  facultyTimetableInFlight.set(cacheKey, promise)
  return promise
}

// Invalidation helpers
export function clearFacultyProfile(userId: string) {
  facultyProfileCache.delete(userId)
  debugLog("invalidated profile", userId)
}

export function clearInstitutionName(institutionId: string) {
  institutionNameCache.delete(institutionId)
  debugLog("invalidated institution", institutionId)
}

export function clearFacultySubjects(userId: string) {
  facultySubjectsCache.delete(userId)
  debugLog("invalidated subjects", userId)
}

export function clearFacultyTimetable(userId: string, institutionId: string | null | undefined) {
  const cacheKey = `${userId}:${institutionId}`
  facultyTimetableCache.delete(cacheKey)
  debugLog("invalidated timetable", cacheKey)
}
