import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { getMeetingByCodeAction } from "@/app/actions/meetings"
import { MeetingRoomClient } from "./meeting-room-client"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{
    meetingCode: string
  }>
}

export default async function MeetingPage({ params }: PageProps) {
  const { meetingCode } = await params
  const supabase = await createSupabaseServerClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  // 2. Fetch user profile
  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, role, institution_id")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/dashboard")

  // 3. Fetch active meeting details from database
  const res = await getMeetingByCodeAction(meetingCode)

  if (!res.success || !res.meeting) {
    // If meeting doesn't exist or is not active, redirect back to dashboard
    redirect(profile.role === "faculty" ? "/dashboard/faculty/subjects" : "/dashboard/student/subjects")
  }

  const meeting = res.meeting

  // Resolve custom user details for call
  const caller = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as "faculty" | "student",
    institutionId: profile.institution_id,
  }

  return (
    <MeetingRoomClient
      user={caller}
      meeting={meeting}
    />
  )
}
