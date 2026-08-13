import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

type NotificationCategory = {
  key: string
  label: string
  description: string
  facultyOnly?: boolean
}

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    key: "due_date",
    label: "Due Date",
    description: "Assignment due date change",
  },
  {
    key: "grading_policy",
    label: "Grading Policies",
    description: "Course grading policy change",
  },
  {
    key: "course_content",
    label: "Course Content",
    description: "Change to course content: pages, quizzes, assignments",
  },
  {
    key: "files",
    label: "Files",
    description: "New file added to your course",
  },
  {
    key: "announcements",
    label: "Announcements",
    description: "New announcement in your course",
  },
  {
    key: "grading",
    label: "Grading",
    description: "Assignment or submission grade entered or changed",
  },
  {
    key: "invitations",
    label: "Invitations",
    description: "Web conference, group, or collaboration invitations",
  },
  {
    key: "submissions",
    label: "All Submissions",
    description: "Assignment submission or resubmission (faculty only)",
    facultyOnly: true,
  },
  {
    key: "late_grading",
    label: "Late Grading",
    description: "Late assignment submission (faculty only)",
    facultyOnly: true,
  },
] as const

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()

  const { data: overrides } = await supabase
    .from("notification_preferences")
    .select("category, email_enabled, push_enabled")
    .eq("user_id", user.id)

  const overrideMap = new Map((overrides ?? []).map((o) => [o.category, o]))

  const isFaculty = ["FACULTY", "HOD", "PROGRAM_HEAD", "INSTITUTION_ADMIN", "SUPER_ADMIN"].includes(
    profile?.role ?? ""
  )

  const categories = NOTIFICATION_CATEGORIES.filter((c) => !c.facultyOnly || isFaculty).map((c) => {
    const override = overrideMap.get(c.key)
    return {
      key: c.key,
      label: c.label,
      description: c.description,
      email_enabled: override?.email_enabled ?? true,
      push_enabled: override?.push_enabled ?? true,
    }
  })

  return NextResponse.json({ categories })
}

export async function PUT(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { category, channel, enabled } = body as {
    category: string
    channel: "email" | "push"
    enabled: boolean
  }

  const validCategory = NOTIFICATION_CATEGORIES.some((c) => c.key === category)
  if (!validCategory || !["email", "push"].includes(channel) || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from("notification_preferences")
    .select("email_enabled, push_enabled")
    .eq("user_id", user.id)
    .eq("category", category)
    .maybeSingle()

  const nextRow = {
    user_id: user.id,
    category,
    email_enabled: existing?.email_enabled ?? true,
    push_enabled: existing?.push_enabled ?? true,
    updated_at: new Date().toISOString(),
  }
  if (channel === "email") nextRow.email_enabled = enabled
  if (channel === "push") nextRow.push_enabled = enabled

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(nextRow, { onConflict: "user_id,category" })

  if (error) {
    console.error("Failed to update notification preference:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
