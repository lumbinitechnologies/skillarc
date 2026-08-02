import { createSupabaseAdminClient } from "./src/lib/supabase-admin"

async function run() {
  console.log("Testing parent-student relation insert...")
  try {
    const admin = createSupabaseAdminClient()
    
    const parentId = "689b2763-2bbb-4bae-8431-c09ad7cd7263" // Rani
    const studentId = "6b0f7f6c-911c-4860-8f8e-46e79c64040f" // Nikhil Krishna Sathvik
    
    // Check if parent exists in users
    const { data: p } = await admin.from("users").select("*").eq("id", parentId).single()
    console.log("Parent in DB:", p ? "YES" : "NO")

    // Check if student exists in students table
    const { data: s } = await admin.from("students").select("*").eq("id", studentId).single()
    console.log("Student in students table:", s ? "YES" : "NO")

    // Check if student exists in users table
    const { data: su } = await admin.from("users").select("*").eq("id", studentId).single()
    console.log("Student in users table:", su ? "YES" : "NO")

    // Try inserting relation
    console.log("Inserting parent_student_relations row...")
    const { data: rel, error: insertError } = await admin
      .from("parent_student_relations")
      .insert({
        parent_id: parentId,
        student_id: studentId,
        relationship: "Mother"
      })
      .select()
      
    if (insertError) {
      console.error("Insert failed with error:", insertError)
    } else {
      console.log("Insert succeeded!", rel)
      
      // Cleanup
      const { error: delErr } = await admin
        .from("parent_student_relations")
        .delete()
        .eq("id", rel[0].id)
      console.log("Cleanup status:", delErr ? "FAILED: " + delErr.message : "SUCCESS")
    }

  } catch (err) {
    console.error("Unexpected error:", err)
  }
}

run()
