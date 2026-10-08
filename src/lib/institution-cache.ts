/**
 * Cached institution data helpers.
 *
 * Queries that return data that changes infrequently (programs, sections, subjects,
 * faculty rosters) are wrapped in Next.js unstable_cache with a 60-second TTL.
 * This means the first request for an institution builds the cache; subsequent
 * requests within 60 s get served from the in-process cache with zero DB round-trips.
 *
 * Data that must be real-time (attendance records, live audit logs, today's timetable)
 * is NOT cached here — fetch those directly in the page.
 */

import { unstable_cache } from "next/cache"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { ROLES } from "@/constants/roles"

const TTL = 60 // seconds

// ─── Sections ────────────────────────────────────────────────────────────────
export const getCachedSections = unstable_cache(
  async (institutionId: string) => {
    const admin = createSupabaseAdminClient()
    const { data } = await admin
      .from("sections")
      .select("id, name, semester, program_id, programs:program_id(id, name), faculty_advisor_id")
      .eq("institution_id", institutionId)
      .order("name")
    return (data ?? []) as any[]
  },
  ["institution-sections"],
  { revalidate: TTL, tags: ["sections"] }
)

// ─── Programs ─────────────────────────────────────────────────────────────────
export const getCachedPrograms = unstable_cache(
  async (institutionId: string) => {
    const admin = createSupabaseAdminClient()
    const { data } = await admin
      .from("programs")
      .select("id, name, duration_years, department_id")
      .eq("institution_id", institutionId)
      .order("name")
    return (data ?? []) as any[]
  },
  ["institution-programs"],
  { revalidate: TTL, tags: ["programs"] }
)

// ─── Subjects ─────────────────────────────────────────────────────────────────
export const getCachedSubjects = unstable_cache(
  async (institutionId: string) => {
    const admin = createSupabaseAdminClient()
    const { data } = await admin
      .from("subjects")
      .select("id, name, code, program_id, faculty_id, users:faculty_id(id, name)")
      .eq("institution_id", institutionId)
      .order("name")
    return (data ?? []) as any[]
  },
  ["institution-subjects"],
  { revalidate: TTL, tags: ["subjects"] }
)

// ─── Faculty roster ───────────────────────────────────────────────────────────
export const getCachedFaculty = unstable_cache(
  async (institutionId: string) => {
    const admin = createSupabaseAdminClient()
    const { data } = await admin
      .from("users")
      .select("id, name, email, phone, role, department_id, created_at")
      .eq("institution_id", institutionId)
      .in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD])
      .order("name")
    return (data ?? []) as any[]
  },
  ["institution-faculty"],
  { revalidate: TTL, tags: ["faculty"] }
)

// ─── Departments ──────────────────────────────────────────────────────────────
export const getCachedDepartments = unstable_cache(
  async (institutionId: string) => {
    const admin = createSupabaseAdminClient()
    const { data } = await admin
      .from("departments")
      .select("id, name, code, hod_id")
      .eq("institution_id", institutionId)
      .order("name")
    return (data ?? []) as any[]
  },
  ["institution-departments"],
  { revalidate: TTL, tags: ["departments"] }
)
