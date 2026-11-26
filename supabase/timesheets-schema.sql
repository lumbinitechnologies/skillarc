-- ============================================================
-- LUMBINI TECHNOLOGIES - WORKFORCE & TIME TRACKING SCHEMA
-- Integrates TIME-SHEETS directly into Supabase PostgreSQL
-- ============================================================

-- 1. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. INTERN_PROJECTS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.intern_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
    role_in_project TEXT DEFAULT 'Contributor',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT intern_projects_project_intern_unique UNIQUE (project_id, intern_id)
);

-- 3. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    intern_id UUID REFERENCES public.interns(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    due_date DATE,
    completed_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ATTENDANCE_RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'ABSENT')),
    notes TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT attendance_intern_date_unique UNIQUE (intern_id, date)
);

-- 5. LEAVE_APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.leave_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL DEFAULT 'CASUAL' CHECK (leave_type IN ('CASUAL', 'SICK', 'ACADEMIC', 'UNPAID')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL DEFAULT 1,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    review_remarks TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. TIMESHEETS TABLE
CREATE TABLE IF NOT EXISTS public.timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    net_work_minutes INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
    submitted_at TIMESTAMPTZ,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    review_remarks TEXT,
    attachment_path TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_attendance_records_intern_date ON public.attendance_records(intern_id, date);
CREATE INDEX IF NOT EXISTS idx_timesheets_intern_date ON public.timesheets(intern_id, date);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON public.timesheets(status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_intern ON public.leave_applications(intern_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON public.leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_tasks_intern ON public.tasks(intern_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_intern_projects_intern ON public.intern_projects(intern_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- Helper function: Is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE email = auth.jwt() ->> 'email'
  );
$$;

-- Helper function: Get Current Intern ID
CREATE OR REPLACE FUNCTION public.get_current_intern_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM public.interns
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Projects: Authenticated users can read, Admins can manage
CREATE POLICY "Projects read for authenticated"
ON public.projects FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Projects admin all"
ON public.projects FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Intern Projects: Read for assigned intern or admin, Admins can manage
CREATE POLICY "Intern projects read"
ON public.intern_projects FOR SELECT
TO authenticated
USING (public.is_admin() OR intern_id = public.get_current_intern_id());

CREATE POLICY "Intern projects admin all"
ON public.intern_projects FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Tasks: Read & update for assigned intern or admin
CREATE POLICY "Tasks read"
ON public.tasks FOR SELECT
TO authenticated
USING (public.is_admin() OR intern_id = public.get_current_intern_id());

CREATE POLICY "Tasks update intern status"
ON public.tasks FOR UPDATE
TO authenticated
USING (public.is_admin() OR intern_id = public.get_current_intern_id())
WITH CHECK (public.is_admin() OR intern_id = public.get_current_intern_id());

CREATE POLICY "Tasks admin all"
ON public.tasks FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Attendance Records: Interns manage their own, Admins manage all
CREATE POLICY "Attendance read"
ON public.attendance_records FOR SELECT
TO authenticated
USING (public.is_admin() OR intern_id = public.get_current_intern_id());

CREATE POLICY "Attendance insert intern"
ON public.attendance_records FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR intern_id = public.get_current_intern_id());

CREATE POLICY "Attendance update intern"
ON public.attendance_records FOR UPDATE
TO authenticated
USING (public.is_admin() OR intern_id = public.get_current_intern_id())
WITH CHECK (public.is_admin() OR intern_id = public.get_current_intern_id());

CREATE POLICY "Attendance admin all"
ON public.attendance_records FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Leave Applications: Interns apply and view their own, Admins manage all
CREATE POLICY "Leave read"
ON public.leave_applications FOR SELECT
TO authenticated
USING (public.is_admin() OR intern_id = public.get_current_intern_id());

CREATE POLICY "Leave insert intern"
ON public.leave_applications FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR intern_id = public.get_current_intern_id());

CREATE POLICY "Leave update intern or admin"
ON public.leave_applications FOR UPDATE
TO authenticated
USING (public.is_admin() OR intern_id = public.get_current_intern_id())
WITH CHECK (public.is_admin() OR intern_id = public.get_current_intern_id());

-- Timesheets: Interns manage draft/submitted, Admins review all
CREATE POLICY "Timesheets read"
ON public.timesheets FOR SELECT
TO authenticated
USING (public.is_admin() OR intern_id = public.get_current_intern_id());

CREATE POLICY "Timesheets insert intern"
ON public.timesheets FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR intern_id = public.get_current_intern_id());

CREATE POLICY "Timesheets update intern or admin"
ON public.timesheets FOR UPDATE
TO authenticated
USING (public.is_admin() OR intern_id = public.get_current_intern_id())
WITH CHECK (public.is_admin() OR intern_id = public.get_current_intern_id());

-- Seed default project for immediate use
INSERT INTO public.projects (name, code, description, status)
VALUES ('Lumbini Tech Core Systems', 'LT-CORE', 'Core website and platform engineering development', 'ACTIVE')
ON CONFLICT DO NOTHING;

