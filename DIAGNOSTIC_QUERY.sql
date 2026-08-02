-- Quick diagnostic query to check students data
-- Run this in Supabase SQL Editor

-- 1. Check if students table exists and how many records
SELECT COUNT(*) as students_count FROM public.students;

-- 2. Check if there are users with STUDENT role
SELECT COUNT(*) as student_users FROM public.users WHERE role IN ('STUDENT', 'student');

-- 3. Show sample students
SELECT id, institution_id, section_id, semester FROM public.students LIMIT 5;

-- 4. Show sample student users
SELECT id, name, email, role, institution_id FROM public.users WHERE role IN ('STUDENT', 'student') LIMIT 5;
