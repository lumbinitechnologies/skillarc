// @ts-nocheck
import { createClient } from "@supabase/supabase-js"
import ws from "ws"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const appUrl = "http://localhost:3001"

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  realtime: {
    transport: ws,
  },
})

async function testRoute(name: string, path: string, cookie: string, iterations = 3) {
  console.log(`\n================ Testing ${name}: ${path} ================`)
  const latencies: number[] = []

  for (let i = 1; i <= iterations; i++) {
    const t0 = performance.now()
    const res = await fetch(`${appUrl}${path}`, {
      headers: {
        Cookie: cookie,
        "User-Agent": "Benchmarker/1.0",
      },
      redirect: "manual",
    })
    const elapsed = performance.now() - t0
    latencies.push(elapsed)
    console.log(`  Hit ${i}: status=${res.status} elapsed=${elapsed.toFixed(1)}ms`)
  }

  const avg = latencies.slice(1).reduce((a, b) => a + b, 0) / (latencies.length - 1 || 1)
  console.log(`  => Warmed Average (hits 2..${iterations}): ${avg.toFixed(1)}ms`)
  return { path, latencies, warmedAvg: avg }
}

async function getAuthCookie(user: { id: string; email: string; role: string; institution_id?: string; organization_id?: string }) {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    realtime: { transport: ws },
  })

  const { data, error } = await authClient.auth.signInWithPassword({
    email: user.email,
    password: "TestPassword123!",
  })

  if (error || !data.session) {
    throw new Error(`Failed to sign in as ${user.email}: ${error?.message}`)
  }

  const token = data.session.access_token
  const refreshToken = data.session.refresh_token
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0]
  const payload = JSON.stringify([token, refreshToken, null, null, null])
  const base64Cookie = `base64-${Buffer.from(payload).toString("base64")}`

  return {
    userId: user.id,
    cookie: `sb-${projectRef}-auth-token=${base64Cookie}`,
  }
}

async function main() {
  const { data: users } = await supabase
    .from("users")
    .select("id, email, role, name, institution_id")
    .eq("is_active", true)

  if (!users) {
    console.error("No users found")
    return
  }

  console.log(`Found ${users.length} active users.`)
  const student = users.find((u) => u.role === "STUDENT")
  const faculty = users.find((u) => u.role === "FACULTY")
  const instAdmin = users.find((u) => u.role === "INSTITUTION_ADMIN")
  const superAdmin = users.find((u) => u.role === "SUPER_ADMIN")
  const teacher = users.find((u) => u.role === "TEACHER") || faculty
  const parent = users.find((u) => u.role === "PARENT")

  console.log("Selected test accounts:")
  console.log("  STUDENT:", student?.email)
  console.log("  FACULTY:", faculty?.email)
  console.log("  INST_ADMIN:", instAdmin?.email)
  console.log("  SUPER_ADMIN:", superAdmin?.email)
  console.log("  TEACHER:", teacher?.email)
  console.log("  PARENT:", parent?.email)

  // Test PARENT dashboard
  if (parent) {
    try {
      const auth = await getAuthCookie(parent)
      await testRoute("Parent Dashboard", "/dashboard/parent", auth.cookie, 4)
    } catch (e: any) {
      console.error("Parent test error:", e.message)
    }
  }

  // Test STUDENT dashboard & subpages
  if (student) {
    try {
      const auth = await getAuthCookie(student)
      await testRoute("Student Dashboard", "/dashboard/student", auth.cookie, 4)
      await testRoute("Student Attendance", "/dashboard/student/attendance", auth.cookie, 3)
      await testRoute("Student Timetable", "/dashboard/student/timetable", auth.cookie, 3)
      await testRoute("Student Subjects", "/dashboard/student/subjects", auth.cookie, 3)
      await testRoute("Student Report Card", "/dashboard/student/report-card", auth.cookie, 3)
    } catch (e: any) {
      console.error("Student test error:", e.message)
    }
  }

  // Test FACULTY dashboard & subpages
  if (faculty) {
    try {
      const auth = await getAuthCookie(faculty)
      await testRoute("Faculty Dashboard", "/dashboard/faculty", auth.cookie, 4)
      await testRoute("Faculty Attendance", "/dashboard/faculty/attendance", auth.cookie, 3)
      await testRoute("Faculty Timetable", "/dashboard/faculty/timetable", auth.cookie, 3)
    } catch (e: any) {
      console.error("Faculty test error:", e.message)
    }
  }

  // Test INSTITUTION ADMIN dashboard & subpages
  if (instAdmin) {
    try {
      const auth = await getAuthCookie(instAdmin)
      await testRoute("Inst Admin Dashboard", "/dashboard/institution-admin", auth.cookie, 4)
      await testRoute("Inst Admin Students", "/dashboard/institution-admin/students", auth.cookie, 3)
      await testRoute("Inst Admin Faculty", "/dashboard/institution-admin/faculty", auth.cookie, 3)
      await testRoute("Inst Admin Attendance", "/dashboard/institution-admin/attendance", auth.cookie, 3)
      await testRoute("Inst Admin Departments", "/dashboard/institution-admin/departments", auth.cookie, 3)
      await testRoute("Inst Admin Programs", "/dashboard/institution-admin/programs", auth.cookie, 3)
      await testRoute("Inst Admin Sections", "/dashboard/institution-admin/sections", auth.cookie, 3)
      await testRoute("Inst Admin Subjects", "/dashboard/institution-admin/subjects", auth.cookie, 3)
    } catch (e: any) {
      console.error("Inst Admin test error:", e.message)
    }
  }

  // Test SUPER ADMIN dashboard
  if (superAdmin) {
    try {
      const auth = await getAuthCookie(superAdmin)
      await testRoute("Super Admin Dashboard", "/dashboard/super-admin", auth.cookie, 4)
    } catch (e: any) {
      console.error("Super Admin test error:", e.message)
    }
  }
}

main()
