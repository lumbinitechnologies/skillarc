# Phase 1 Schema Upgrade - Code Changes

## Summary

Your SkillArc database has been upgraded to Phase 1 with a new section-based hierarchy. This document outlines all the code changes made to support the new schema.

## New Database Tables

Created via Supabase SQL:
```sql
-- Sections table
CREATE TABLE sections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  semester integer NOT NULL,
  program_id uuid REFERENCES programs(id),
  institution_id uuid REFERENCES institutions(id),
  faculty_advisor_id uuid REFERENCES users(id)
);

-- Parent-student relations
CREATE TABLE parent_student_relations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id uuid REFERENCES users(id),
  student_id uuid REFERENCES users(id),
  relationship text
);
```

## Modified Columns

Users table:
```sql
ALTER TABLE users ADD COLUMN section_id uuid REFERENCES sections(id);
ALTER TABLE users ADD COLUMN semester integer;
```

Subjects table:
```sql
ALTER TABLE subjects ADD COLUMN section_id uuid REFERENCES sections(id);
ALTER TABLE subjects ADD COLUMN program_id uuid REFERENCES programs(id);
```

Timetable slots table:
```sql
ALTER TABLE timetable_slots ADD COLUMN section_id uuid REFERENCES sections(id);
-- Removed: section text column (now use section_id instead)
```

## New TypeScript Modules

### 1. Sections Module
**Location**: `src/modules/sections/`

**Types** (`sections.types.ts`):
- `Section` - Base section interface
- `SectionWithFacultyAdvisor` - Section with advisor details
- `SectionWithProgram` - Section with program details
- `SectionFull` - Complete section data
- `CreateSectionInput` - Input for creating sections
- `UpdateSectionInput` - Input for updating sections

**Service** (`sectionsService.ts`):
- `getSectionsByProgram()` - Fetch sections for a program
- `getSectionsByInstitution()` - Fetch all sections in institution
- `getSectionById()` - Get single section
- `createSection()` - Create new section
- `updateSection()` - Update section
- `deleteSection()` - Remove section
- `assignFacultyAdvisor()` - Assign faculty advisor to section
- `getSectionStudents()` - Get students in section
- `getSectionCount()` - Count sections

### 2. Parent-Student Relations Module
**Location**: `src/modules/parent-student/`

**Types** (`parent-student.types.ts`):
- `ParentStudentRelation` - Relation between parent and student
- `ParentStudentRelationWithDetails` - Relation with user details
- `CreateParentStudentRelationInput` - Input for creating relations

**Service** (`parentStudentService.ts`):
- `getStudentsByParent()` - Get all students for a parent
- `getParentsByStudent()` - Get all parents for a student
- `createParentStudentRelation()` - Create parent-student link
- `deleteParentStudentRelation()` - Remove relation
- `getStudentCount()` - Count students for a parent

### 3. Updated Subjects Module
**Location**: `src/modules/subjects/`

**New Types** (`subject.types.ts`):
- `Subject` - Base subject (now includes section_id & program_id)
- `SubjectWithFaculty` - Subject with faculty details
- `SubjectWithSection` - Subject with section details
- `SubjectFull` - Complete subject data
- `CreateSubjectInput` - Updated for new fields
- `UpdateSubjectInput` - Updated for new fields

## Updated User Types

**Location**: `src/modules/users/types.ts`

```typescript
interface UserProfile {
  // ... existing fields
  section_id: string | null        // NEW
  semester: number | null          // NEW
}

interface StudentProfile extends UserProfile {
  department_id: string | null
  program_id: string | null
  section_id: string               // Required for students
  semester: number                 // Required for students
}

interface ParentProfile extends UserProfile {
  // Parents don't have institution/section/semester
}

interface FacultyProfile extends UserProfile {
  department_id: string | null
}
```

## Updated Timetable Types

**Location**: `src/modules/timetable/types/timetable.types.ts`

```typescript
interface TimeTableSlot {
  id?: string
  day: string
  period: string
  subject?: Subject
  section_id: string | null        // NEW - replaces text section
  subject_id: string | null        // NEW
  created_at?: string
  updated_at?: string
}

interface Section {
  id: string
  name: string
  semester: number
  program_id?: string
  institution_id?: string
}
```

## Database Schema Documentation

**Location**: `src/DATABASE_SCHEMA.md`

Complete reference for:
- All table structures
- User roles & permissions
- Hierarchy visualization
- Development phases
- Migration notes
- Future enhancements

## Using the New Services

### Example: Working with Sections

```typescript
import { getSectionsByProgram, assignFacultyAdvisor } from '@/modules/sections'

// Get all sections in a program
const sections = await getSectionsByProgram(programId)

// Assign faculty advisor to section
await assignFacultyAdvisor(sectionId, facultyId)

// Get students in section
const students = await getSectionStudents(sectionId)
```

### Example: Working with Parent-Student Relations

```typescript
import { getStudentsByParent, createParentStudentRelation } from '@/modules/parent-student'

// Get parent's children
const relations = await getStudentsByParent(parentId)

// Link parent to student
await createParentStudentRelation({
  parent_id: parentId,
  student_id: studentId,
  relationship: 'Father'
})
```

## What's Next (Phase 2)

To continue development:

1. **Create Section Management Dashboard**
   - View sections by institution
   - Create/edit sections
   - Assign faculty advisors

2. **Build Student Management**
   - Assign students to sections
   - Set student semester
   - Update student profiles

3. **Implement Parent Management**
   - Create parent accounts
   - Link parents to students
   - Parent dashboard

4. **Update Existing Dashboards**
   - HOD dashboard - filter by section
   - Faculty dashboard - show assigned sections
   - Timetable - use section_id instead of text

## Import Paths

All modules have index.ts files for clean imports:

```typescript
// Instead of
import { Section } from '@/modules/sections/types/sections.types'

// Use
import { Section } from '@/modules/sections'
```

## Migration Helpers

When migrating existing data:

```typescript
// Create a section for each program-semester combo
await createSection({
  name: 'Section A',
  semester: 5,
  program_id: programId,
  institution_id: institutionId,
  faculty_advisor_id: advisorId
})

// Assign students
// Update: users.section_id = sectionId, users.semester = 5

// Link parents to students
await createParentStudentRelation({
  parent_id: parentId,
  student_id: studentId,
  relationship: 'Mother'
})
```

---

**Last Updated**: May 29, 2026
**Phase**: 1 Complete - Ready for Phase 2 (User Management)
