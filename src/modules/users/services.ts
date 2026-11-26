import { createSupabaseServerClient } from "@/lib/supabase-server"
import { UserProfile } from "./types"

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single()

  if (error || !data) return null
  return data as UserProfile
}
