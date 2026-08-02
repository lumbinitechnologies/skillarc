#!/usr/bin/env node

/**
 * Quick script to verify students are in database
 * Run: node scripts/verify-students.js
 */

const https = require("https");

const SUPABASE_URL = "https://sjyotfnhdfmjkulyssps.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!ANON_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

async function query(table, select, limit = 10) {
  return new Promise((resolve, reject) => {
    const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);
    url.searchParams.set("select", select);
    url.searchParams.set("limit", String(limit));

    https
      .get(
        url,
        {
          headers: {
            apikey: ANON_KEY,
            "Content-Type": "application/json",
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve({ status: res.status, data: JSON.parse(data) });
            } catch {
              resolve({ status: res.status, data });
            }
          });
        }
      )
      .on("error", reject);
  });
}

async function main() {
  console.log("🔍 Verifying Student Data...\n");

  try {
    // Check users with STUDENT role
    console.log("📝 Users with STUDENT role:");
    const usersRes = await query("users", "id,name,role,institution_id", 100);
    if (usersRes.status === 200) {
      const students = usersRes.data.filter(
        (u) => u.role === "STUDENT" || u.role === "student"
      );
      console.log(`   Total: ${students.length}`);
      if (students.length > 0) {
        console.log("   Sample:");
        students.slice(0, 3).forEach((s) => {
          console.log(
            `     - ${s.name || "No name"} (${s.id.slice(0, 8)}...) in institution ${s.institution_id?.slice(0, 8) || "None"}...`
          );
        });
      }
    } else {
      console.log(`   ❌ Error: ${usersRes.status}`);
    }

    // Check students table
    console.log("\n📚 Students table:");
    const studentsRes = await query(
      "students",
      "id,institution_id,section_id,semester",
      100
    );
    if (studentsRes.status === 200) {
      console.log(`   Total: ${studentsRes.data.length}`);
      if (studentsRes.data.length > 0) {
        console.log("   Sample:");
        studentsRes.data.slice(0, 3).forEach((s) => {
          console.log(
            `     - ${s.id.slice(0, 8)}... institution: ${s.institution_id?.slice(0, 8) || "None"}..., section: ${s.section_id || "None"}, semester: ${s.semester || "None"}`
          );
        });
      } else {
        console.log("   ⚠️  EMPTY - Migration didn't populate!");
      }
    } else if (studentsRes.status === 404) {
      console.log("   ❌ Table doesn't exist");
    } else {
      console.log(`   ❌ Error: ${studentsRes.status}`);
    }

    console.log("\n✅ Check complete!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
