# V1 Schema Migration - Breaking Changes & Fixes Required

## ⚠️ Critical Breaking Changes

### Fields Moved from `users` to `students` table:
- `registration_number` 
- `admission_year`
- `dob` (date of birth)
- `gender`

**Impact**: Any query selecting these fields directly from `users` will fail with "column does not exist" error.

---

## 📋 Files Already Fixed

✅ [src/app/dashboard/student/attendance/page.tsx](src/app/dashboard/student/attendance/page.tsx)
- Changed: Now queries `students` table separately, then merges with `users` data

✅ [src/app/dashboard/faculty/attendance/page.tsx](src/app/dashboard/faculty/attendance/page.tsx)
- Changed: Queries `students` table, joins with `users` to get name/email

✅ [src/app/dashboard/student/page.tsx](src/app/dashboard/student/page.tsx)
- Changed: Queries `students` table for student-specific fields

---

## 🔴 Files Still Requiring Updates

### 1. Student Service Module
**File**: [src/modules/students/services/studentService.ts](src/modules/students/services/studentService.ts)

**Issues**:
- Line ~41: `getStudentById()` queries `users` table and expects student fields
- Line ~20: `getStudentsByInstitution()` queries `users` table
- Line ~55: `createStudent()` tries to create on `users` table only
- Line ~85: `updateStudent()` updates `users` table instead of `students`
- Line ~95: `deleteStudent()` deletes from `users` only (cascade should handle `students`)

**Fix Required**:
Replace all queries to use the `students` table directly:
```typescript
// OLD (BROKEN)
const { data } = await supabase
  .from("users")
  .select("*, section:section_id(...)")
  .eq("id", studentId)
  .single()

// NEW (CORRECT)
const { data } = await supabase
  .from("students")
  .select("id, institution_id, program_id, section_id, registration_number, admission_year, dob, gender, semester")
  .eq("id", studentId)
  .single()

// Then fetch user data separately
const { data: user } = await supabase
  .from("users")
  .select("id, name, email, role, organization_id, institution_id")
  .eq("id", studentId)
  .single()
```

---

### 2. User Types Module
**File**: [src/modules/users/types.ts](src/modules/users/types.ts)

**Issues**:
- `UserProfile` interface includes `section_id` and `semester` which are now only in `students` table
- These should be optional on UserProfile since not all users are students

**Note**: Already partially correct (fields are optional), but should be clarified:
```typescript
// CURRENT (acceptable but confusing)
export interface UserProfile {
  section_id: string | null    // Only students have this
  semester: number | null      // Only students have this
}

// CLEARER OPTION
export interface UserProfile {
  id: string
  name: string | null
  email: string
  role: UserRole
  institution_id: string | null
  organization_id: string | null
  created_at: string
  is_active?: boolean | null
}

export interface StudentUserProfile extends UserProfile {
  section_id: string
  semester: number
  registration_number: string
  admission_year: number | null
  dob: date | null
  gender: string | null
}
```

---

### 3. Pages Still Querying Old Fields
These pages query `section_id` and `semester` from `users` which still exist on users, but the student-specific fields are broken:

- [src/app/api/students/route.ts](src/app/api/students/route.ts) - Line 8: Uses `.select("*")` which won't include moved fields
- [src/app/dashboard/student/report-card/page.tsx](src/app/dashboard/student/report-card/page.tsx) - Line 18: Queries `section_id` from users (should still work)
- [src/app/dashboard/student/subjects/page.tsx](src/app/dashboard/student/subjects/page.tsx) - Line 20: Queries `section_id` from users (should still work)
- [src/app/dashboard/student/todo/page.tsx](src/app/dashboard/student/todo/page.tsx) - Line 68: Queries `section_id` from users (should still work)

**Status**: These are OK for now since `section_id` and `semester` still exist on `users` table. But should eventually migrate to query from `students` table for consistency.

---

## ✅ Migration Checklist

- [ ] Fix `src/modules/students/services/studentService.ts` to query `students` table
- [ ] Update student type definitions to reflect actual database structure
- [ ] Test all student dashboard pages load without errors
- [ ] Test student creation/update endpoints
- [ ] Test student attendance marking flow
- [ ] Search codebase for any remaining direct queries to student-specific fields
- [ ] Update API endpoints that return student data

---

## 📦 New Tables Created

These are now available and should be populated:

- `students` - 1:1 with users (student-specific data)
- `staff` - 1:1 with users (faculty/staff-specific data)  
- `enrolments` - Student lifecycle history
- `intakes` - Admission batches
- `files` - Storage tracking
- CHECK constraints added to status columns

---

## 🚀 Next Steps

1. **Immediate**: Fix the student service module
2. **Short-term**: Update type definitions for clarity
3. **Long-term**: Migrate staff-related code to use `staff` table
4. **Future**: Implement proper RLS policies for all new tables

