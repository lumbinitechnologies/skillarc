# 🐛 Student Data Fix - Complete Guide

## Problem Summary

You're seeing **empty student lists** and **zero student data** because of a missing connection between the old `users` table and the new `students` table.

### Root Causes:
1. ❌ **New students table wasn't populated** from existing users
2. ❌ **Student creation process only updates `users` table**, not `students`
3. ❌ **Queries expect data in `students` table**, but it's empty

---

## ✅ Solution: 3-Step Fix

### Step 1: Apply the Database Migration

1. Go to **Supabase Dashboard** → **SQL Editor**
   - URL: https://app.supabase.com/project/sjyotfnhdfmjkulyssps/sql

2. **Create a new query** and copy the entire contents of:
   ```
   migrations/002_populate_students_table.sql
   ```

3. **Run the query** (Ctrl+Enter or Cmd+Enter)

   **Expected results:**
   - ✅ `students` table created
   - ✅ Existing STUDENT users migrated to `students` table
   - ✅ Indexes and RLS policies applied

### Step 2: Verify the Migration Worked

In the same SQL editor, run this verification query:

```sql
-- Check students table was populated
SELECT COUNT(*) as students_count FROM public.students;

-- Should be > 0 if you have existing students
SELECT COUNT(*) as student_users FROM public.users WHERE role IN ('STUDENT', 'student');

-- View sample student
SELECT * FROM public.students LIMIT 3;
```

### Step 3: Restart Your App

1. **Stop the dev server** (Ctrl+C)
2. **Start it again**:
   ```bash
   npm run dev
   ```
3. **Refresh your browser**

---

## 🎯 What Gets Fixed

After applying these steps:

✅ **Institution Admin Students Page** - Will show all students
✅ **Student Dashboard** - Will display real data (subjects, section, semester)
✅ **New Students** - Will automatically populate `students` table when invited

---

## 📝 Code Changes Made

### 1. **`/src/lib/invite-user.ts`** (Updated)
When inviting a new STUDENT user, it now:
- ✅ Creates user in `users` table (existing)
- ✅ Creates record in `students` table (NEW)

### 2. **`/src/app/dashboard/institution-admin/students/page.tsx`** (Fixed)
Query pattern now:
```typescript
// Query students table for student data
const { data: studentRecords } = await supabase
  .from("students")
  .select("id, institution_id, program_id, section_id, semester, registration_number")

// Query users table for user data
const { data: userRecords } = await supabase
  .from("users")
  .select("id, name, email, role")
  .in("id", studentIds)

// Merge the results
const students = studentRecords.map(s => ({
  ...s,
  ...(userRecords.find(u => u.id === s.id))
}))
```

### 3. **`migrations/002_populate_students_table.sql`** (New)
Comprehensive migration that:
- Creates `students` table with proper schema
- Populates from existing `users` where role='STUDENT'
- Creates supporting tables: `intakes`, `staff`, `files`, `enrolments`
- Sets up indexes and RLS policies

---

## 🧪 Test It

After the fix, try this:

### Test 1: Check Institution Admin Students
1. Login as institution admin
2. Go to **Dashboard → Students**
3. Should see all students listed ✅

### Test 2: Check Student Dashboard
1. Login as a student
2. Go to **Dashboard**
3. Should see your:
   - ✅ Enrollment status
   - ✅ Subjects/Timetable
   - ✅ Section info
   - ✅ Semester

### Test 3: Invite New Student
1. As institution admin, create a new student
2. They should appear immediately in students list ✅

---

## 🔧 Troubleshooting

### Issue: Still showing empty students
- [ ] Did you run the migration from `002_populate_students_table.sql`?
- [ ] Did you restart the dev server after migration?
- [ ] Check browser DevTools Console for API errors
- [ ] Run verification query above to confirm table has data

### Issue: New students not appearing
- [ ] Verify `students` table exists: Run `SELECT COUNT(*) FROM public.students;`
- [ ] Check recent errors in server logs
- [ ] The fix to `invite-user.ts` should create `students` record automatically

### Issue: Can't see subjects or timetable
- Check that `section_id` is set for your student record
- Verify `timetable_slots` has entries for your section

---

## 📚 Schema Overview (After Fix)

```
users (base user info)
├── id, name, email, role, institution_id, organization_id

students (student-specific info)
├── id (FK → users.id)
├── institution_id, program_id, section_id, semester
├── registration_number, admission_year, dob, gender

sections
├── program_id, institution_id
└── name, semester, faculty_advisor_id

programs
├── name, department_id

institutions
└── name, organization_id
```

---

## ✨ Summary

| Component | Status | Notes |
|-----------|--------|-------|
| App Code (page.tsx) | ✅ Fixed | Now queries correct tables |
| Student Creation (invite-user.ts) | ✅ Fixed | Creates students records |
| Database Migration | ⏳ Needs manual run | Run `002_populate_students_table.sql` |
| New Students | ✅ Will work | After migration + app restart |

---

**Next: Run Step 1 above, then let me know if you see students! 🎉**
