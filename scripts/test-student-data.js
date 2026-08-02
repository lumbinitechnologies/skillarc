#!/usr/bin/env node

/**
 * Test script to check student data in database
 * Usage: node scripts/test-student-data.js
 */

const https = require("https");

const SUPABASE_URL = "https://sjyotfnhdfmjkulyssps.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!ANON_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in environment");
  process.exit(1);
}

async function querySupabase(table, query) {
  return new Promise((resolve, reject) => {
    const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const req = https.get(
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
            resolve({
              status: res.status,
              data: JSON.parse(data),
              headers: res.headers,
            });
          } catch {
            resolve({ status: res.status, data, headers: res.headers });
          }
        });
      }
    );

    req.on("error", reject);
  });
}

async function main() {
  console.log("🔍 Checking SkillArc Student Data...\n");

  try {
    // Check users count
    console.log("📊 Checking users table...");
    const usersRes = await querySupabase("users", { "select": "id,role,institution_id", "limit": "0", "count": "exact" });
    const usersCount = parseInt(usersRes.headers["content-range"]?.split("/")[1] || "0");
    console.log(`   Total users: ${usersCount}`);

    // Get sample users
    const sampleRes = await querySupabase("users", { "select": "id,name,role,institution_id,section_id,semester", "limit": "10" });
    if (sampleRes.data?.length > 0) {
      const students = sampleRes.data.filter((u) => u.role === "STUDENT" || u.role === "student");
      const withInst = sampleRes.data.filter((u) => u.institution_id).length;
      console.log(`   Students (STUDENT role): ${students.length}`);
      console.log(`   With institution_id: ${withInst}`);

      if (students.length > 0) {
        console.log("\n   Sample student:");
        console.log(`     - ID: ${students[0].id}`);
        console.log(`     - Name: ${students[0].name}`);
        console.log(`     - Institution: ${students[0].institution_id}`);
        console.log(`     - Section: ${students[0].section_id}`);
        console.log(`     - Semester: ${students[0].semester}`);
      }
    }

    // Check students table
    console.log("\n📚 Checking students table...");
    const studentsRes = await querySupabase("students", { "select": "id", "limit": "0", "count": "exact" });
    if (studentsRes.status === 401) {
      console.log("   ❌ Access denied - check API key");
    } else if (studentsRes.status === 404) {
      console.log("   ⚠️  Table doesn't exist yet - run migration!");
    } else {
      const studentsCount = parseInt(studentsRes.headers["content-range"]?.split("/")[1] || "0");
      console.log(`   Total students: ${studentsCount}`);

      if (studentsCount === 0) {
        console.log("   ⚠️  Students table is empty!");
      }
    }

    console.log("\n✅ Diagnostic complete!");
    console.log("\n📝 Next steps:");
    console.log("   1. Open Supabase Dashboard: https://app.supabase.com/project/sjyotfnhdfmjkulyssps/sql");
    console.log("   2. Copy & paste content from: migrations/002_populate_students_table.sql");
    console.log("   3. Run the SQL to create and populate the students table");
    console.log("   4. Then refresh your app");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
