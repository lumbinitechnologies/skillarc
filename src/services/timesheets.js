import { supabase } from "./supabase";

/**
 * ============================================================
 * ATTENDANCE SERVICES
 * ============================================================
 */

// Fetch today's attendance record for an intern
export async function getTodayAttendance(internId) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("intern_id", internId)
      .eq("date", today)
      .eq("is_deleted", false)
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Attendance] Get today attendance error:", err);
    return { data: null, error: err.message };
  }
}

// Fetch attendance history for an intern
export async function getAttendanceHistory(internId, limit = 30) {
  try {
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("intern_id", internId)
      .eq("is_deleted", false)
      .order("date", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error("[Attendance] Get history error:", err);
    return { data: [], error: err.message };
  }
}

// Clock-in
export async function clockIn({ internId, notes = "" }) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    // Check if record already exists for today
    const { data: existing } = await supabase
      .from("attendance_records")
      .select("id, check_in")
      .eq("intern_id", internId)
      .eq("date", today)
      .eq("is_deleted", false)
      .maybeSingle();

    if (existing?.check_in) {
      throw new Error("Already clocked in today.");
    }

    if (existing?.id) {
      const { data, error } = await supabase
        .from("attendance_records")
        .update({
          check_in: now,
          status: "PRESENT",
          notes,
          updated_at: now,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .insert([
        {
          intern_id: internId,
          date: today,
          check_in: now,
          status: "PRESENT",
          notes,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Attendance] Clock-in error:", err);
    return { data: null, error: err.message };
  }
}

// Clock-out
export async function clockOut({ recordId, notes = "" }) {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("attendance_records")
      .update({
        check_out: now,
        notes: notes || undefined,
        updated_at: now,
      })
      .eq("id", recordId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Attendance] Clock-out error:", err);
    return { data: null, error: err.message };
  }
}

// Admin: Fetch all attendance with filters
export async function getAllAttendance({ date, status, internId } = {}) {
  try {
    let query = supabase
      .from("attendance_records")
      .select("*, interns(id, intern_id, name, email)")
      .eq("is_deleted", false)
      .order("date", { ascending: false });

    if (date) query = query.eq("date", date);
    if (status && status !== "ALL") query = query.eq("status", status);
    if (internId) query = query.eq("intern_id", internId);

    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error("[Attendance] Get all attendance error:", err);
    return { data: [], error: err.message };
  }
}

// Admin: Update attendance record
export async function adminUpdateAttendance(recordId, updates) {
  try {
    const { data, error } = await supabase
      .from("attendance_records")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recordId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Attendance] Admin update attendance error:", err);
    return { data: null, error: err.message };
  }
}

/**
 * ============================================================
 * TIMESHEET SERVICES
 * ============================================================
 */

// Fetch timesheets (optionally filtered by intern, project, status)
export async function getTimesheets({ internId, projectId, status } = {}) {
  try {
    let query = supabase
      .from("timesheets")
      .select(`
        *,
        projects (id, name, code),
        tasks (id, title),
        interns (id, intern_id, name, email)
      `)
      .eq("is_deleted", false)
      .order("date", { ascending: false });

    if (internId) query = query.eq("intern_id", internId);
    if (projectId) query = query.eq("project_id", projectId);
    if (status && status !== "ALL") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error("[Timesheets] Get timesheets error:", err);
    return { data: [], error: err.message };
  }
}

// Create timesheet draft
export async function createTimesheet({
  internId,
  projectId,
  taskId = null,
  date,
  startTime = null,
  endTime = null,
  netWorkMinutes = 0,
  description = "",
}) {
  try {
    const { data, error } = await supabase
      .from("timesheets")
      .insert([
        {
          intern_id: internId,
          project_id: projectId,
          task_id: taskId || null,
          date,
          start_time: startTime,
          end_time: endTime,
          net_work_minutes: netWorkMinutes,
          description,
          status: "DRAFT",
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Timesheets] Create timesheet error:", err);
    return { data: null, error: err.message };
  }
}

// Update timesheet
export async function updateTimesheet(timesheetId, updates) {
  try {
    const { data, error } = await supabase
      .from("timesheets")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", timesheetId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Timesheets] Update timesheet error:", err);
    return { data: null, error: err.message };
  }
}

// Submit timesheet for review
export async function submitTimesheet(timesheetId) {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("timesheets")
      .update({
        status: "SUBMITTED",
        submitted_at: now,
        updated_at: now,
      })
      .eq("id", timesheetId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Timesheets] Submit timesheet error:", err);
    return { data: null, error: err.message };
  }
}

// Admin: Approve timesheet
export async function approveTimesheet(timesheetId, { remarks = "", reviewerEmail = "" } = {}) {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("timesheets")
      .update({
        status: "APPROVED",
        reviewed_by: reviewerEmail,
        reviewed_at: now,
        review_remarks: remarks,
        updated_at: now,
      })
      .eq("id", timesheetId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Timesheets] Approve timesheet error:", err);
    return { data: null, error: err.message };
  }
}

// Admin: Reject timesheet
export async function rejectTimesheet(timesheetId, { remarks = "", reviewerEmail = "" } = {}) {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("timesheets")
      .update({
        status: "REJECTED",
        reviewed_by: reviewerEmail,
        reviewed_at: now,
        review_remarks: remarks,
        updated_at: now,
      })
      .eq("id", timesheetId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Timesheets] Reject timesheet error:", err);
    return { data: null, error: err.message };
  }
}

// Delete timesheet (soft delete)
export async function deleteTimesheet(timesheetId) {
  try {
    const { data, error } = await supabase
      .from("timesheets")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", timesheetId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Timesheets] Delete timesheet error:", err);
    return { data: null, error: err.message };
  }
}

/**
 * ============================================================
 * LEAVE SERVICES
 * ============================================================
 */

// Fetch leaves
export async function getLeaves({ internId, status } = {}) {
  try {
    let query = supabase
      .from("leave_applications")
      .select("*, interns(id, intern_id, name, email)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (internId) query = query.eq("intern_id", internId);
    if (status && status !== "ALL") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error("[Leaves] Get leaves error:", err);
    return { data: [], error: err.message };
  }
}

// Apply for leave
export async function applyLeave({
  internId,
  leaveType = "CASUAL",
  startDate,
  endDate,
  totalDays,
  reason,
}) {
  try {
    const { data, error } = await supabase
      .from("leave_applications")
      .insert([
        {
          intern_id: internId,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          total_days: totalDays,
          reason,
          status: "PENDING",
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Leaves] Apply leave error:", err);
    return { data: null, error: err.message };
  }
}

// Cancel leave request
export async function cancelLeave(leaveId) {
  try {
    const { data, error } = await supabase
      .from("leave_applications")
      .update({
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", leaveId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Leaves] Cancel leave error:", err);
    return { data: null, error: err.message };
  }
}

// Admin: Approve leave
export async function approveLeave(leaveId, { remarks = "", reviewerEmail = "" } = {}) {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("leave_applications")
      .update({
        status: "APPROVED",
        reviewed_by: reviewerEmail,
        reviewed_at: now,
        review_remarks: remarks,
        updated_at: now,
      })
      .eq("id", leaveId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Leaves] Approve leave error:", err);
    return { data: null, error: err.message };
  }
}

// Admin: Reject leave
export async function rejectLeave(leaveId, { remarks = "", reviewerEmail = "" } = {}) {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("leave_applications")
      .update({
        status: "REJECTED",
        reviewed_by: reviewerEmail,
        reviewed_at: now,
        review_remarks: remarks,
        updated_at: now,
      })
      .eq("id", leaveId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Leaves] Reject leave error:", err);
    return { data: null, error: err.message };
  }
}

/**
 * ============================================================
 * PROJECTS & TASKS SERVICES
 * ============================================================
 */

// Fetch all active projects
export async function getProjects() {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error("[Projects] Get projects error:", err);
    return { data: [], error: err.message };
  }
}

// Fetch projects assigned to an intern
export async function getInternProjects(internId) {
  try {
    const { data, error } = await supabase
      .from("intern_projects")
      .select("*, projects(*)")
      .eq("intern_id", internId)
      .eq("is_deleted", false);

    if (error) throw error;
    const projects = (data || []).map((row) => row.projects).filter(Boolean);
    return { data: projects, error: null };
  } catch (err) {
    console.error("[Projects] Get intern projects error:", err);
    return { data: [], error: err.message };
  }
}

// Admin: Create project
export async function createProject({ name, code, description = "", startDate = null, endDate = null, status = "ACTIVE" }) {
  try {
    const { data, error } = await supabase
      .from("projects")
      .insert([
        {
          name,
          code,
          description,
          start_date: startDate,
          end_date: endDate,
          status,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Projects] Create project error:", err);
    return { data: null, error: err.message };
  }
}

// Admin: Assign intern to project
export async function assignInternToProject({ projectId, internId, roleInProject = "Contributor" }) {
  try {
    const { data, error } = await supabase
      .from("intern_projects")
      .insert([
        {
          project_id: projectId,
          intern_id: internId,
          role_in_project: roleInProject,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Projects] Assign intern error:", err);
    return { data: null, error: err.message };
  }
}

// Fetch tasks
export async function getTasks({ projectId, internId, status } = {}) {
  try {
    let query = supabase
      .from("tasks")
      .select("*, projects(id, name, code)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (projectId) query = query.eq("project_id", projectId);
    if (internId) query = query.eq("intern_id", internId);
    if (status && status !== "ALL") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error("[Tasks] Get tasks error:", err);
    return { data: [], error: err.message };
  }
}

// Create task
export async function createTask({
  projectId,
  internId,
  title,
  description = "",
  priority = "MEDIUM",
  dueDate = null,
  status = "TODO",
}) {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          project_id: projectId,
          intern_id: internId,
          title,
          description,
          priority,
          due_date: dueDate,
          status,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Tasks] Create task error:", err);
    return { data: null, error: err.message };
  }
}

// Update task
export async function updateTask(taskId, updates) {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("[Tasks] Update task error:", err);
    return { data: null, error: err.message };
  }
}

