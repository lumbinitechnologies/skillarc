"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies, headers } from "next/headers"
import { ROLES } from "@/constants/roles"
import { DASHBOARD_ROUTES } from "@/constants/routes"
import { checkAuthRateLimit } from "@/lib/rate-limit"

export async function loginAction(email: string, password: string) {
  const tTotalStart = performance.now()
  const headerList = await headers()
  const clientIp = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || null

  const tRateStart = performance.now()
  const rateLimitStatus = await checkAuthRateLimit(clientIp, email)
  const tRateEnd = performance.now()
  if (!rateLimitStatus.allowed) {
    return { error: rateLimitStatus.message || "Too many attempts. Please try again later." }
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const tGoTrueStart = performance.now()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  const tGoTrueEnd = performance.now()

  if (error || !data.user) {
    console.info(`[loginAction:Failed] email: ${email} | GoTrue: ${(tGoTrueEnd - tGoTrueStart).toFixed(2)}ms | Total: ${(performance.now() - tTotalStart).toFixed(2)}ms | Error: ${error?.message}`)
    return { error: error?.message || "Invalid login credentials." }
  }

  // Resolve user role to eliminate intermediate redirect hop
  let destination = "/dashboard"
  const tRoleStart = performance.now()
  try {
    const metaRole = (data.user.user_metadata?.role || data.user.app_metadata?.role) as keyof typeof DASHBOARD_ROUTES | undefined
    if (metaRole && DASHBOARD_ROUTES[metaRole]) {
      destination = DASHBOARD_ROUTES[metaRole]
    } else {
      const { data: userProfile } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle()

      const role = userProfile?.role as keyof typeof DASHBOARD_ROUTES | undefined
      if (role && DASHBOARD_ROUTES[role]) {
        destination = DASHBOARD_ROUTES[role]
      }
    }
  } catch {
    destination = "/dashboard"
  }
  const tRoleEnd = performance.now()
  const tTotalEnd = performance.now()

  console.info(
    `[loginAction:Success] email: ${email} | RateLimit: ${(tRateEnd - tRateStart).toFixed(2)}ms | GoTrue (bcrypt+JWT): ${(tGoTrueEnd - tGoTrueStart).toFixed(2)}ms | RoleLookup: ${(tRoleEnd - tRoleStart).toFixed(2)}ms | Total: ${(tTotalEnd - tTotalStart).toFixed(2)}ms -> ${destination}`
  )

  return { success: true, destination }
}

export async function signupAction(
  name: string,
  email: string,
  password: string,
  role: string
) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // Create auth user
  const { data, error: signupError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role,
      },
    },
  })

  if (signupError) {
    return { error: signupError.message }
  }

  const user = data.user
  if (!user) {
    return { error: "Signup failed. Please try again." }
  }

  // Insert into users table
  const { error: insertError } = await supabase.from("users").upsert({
    id: user.id,
    name,
    email,
    role,
    institution_id: process.env.NEXT_PUBLIC_INSTITUTION_ID,
  }, { onConflict: "id" })

  if (insertError) {
    return { error: insertError.message }
  }

  return { success: true }
}