"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { ROLES } from "@/constants/roles"

export async function loginAction(email: string, password: string) {
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

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
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