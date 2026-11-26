import React, { useState, useEffect, useCallback } from "react";
import { getTasks, updateTask, getInternProjects } from "../../services/timesheets";

const TASK_STATUS_THEME = {
  TODO:        { color: "#94a3b8", bg: "rgba(148,163,184,0.1)",  border: "rgba(148,163,184,0.25)" },
  IN_PROGRESS: { color: "#facc15", bg: "rgba(250,204,21,0.1)",   border: "rgba(250,204,21,0.25)"  },
  COMPLETED:   { color: "#39ff14", bg: "rgba(57,255,20,0.1)",    border: "rgba(57,255,20,0.25)"   },
  CANCELLED:   { color: "#f87171", bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.25)" },
};

const PRIORITY_THEME = {
  LOW:    { color: "#94a3b8" },
  MEDIUM: { color: "#facc15" },
  HIGH:   { color: "#fb923c" },
  URGENT: { color: "#f87171" },
};

export default function TasksView({ internId }) {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [msg, setMsg] = useState(null);

  const loadData = useCallback(async () => {
    if (!internId) return;
    setLoading(true);
    const [tasksRes, projRes] = await Promise.all([
      getTasks({ internId, status: filterStatus }),
      getInternProjects(internId),
    ]);
    if (tasksRes.data) setTasks(tasksRes.data);
    if (projRes.data) setProjects(projRes.data);
    setLoading(false);
  }, [internId, filterStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (taskId, newStatus) => {
    setActionLoading(true);
    const { error } = await updateTask(taskId, {
      status: newStatus,
      completed_at: newStatus === "COMPLETED" ? new Date().toISOString() : null,
    });
    setActionLoading(false);
    if (error) {
      setMsg({ type: "error", text: error });
    } else {
      setMsg({ type: "success", text: `Task updated to ${newStatus}` });
      loadData();
    }
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <style>{`
        .ud-task-card {
          background: rgba(255,255,255,0.015);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; padding: 16px 20px;
          margin-bottom: 12px; transition: all 0.2s;
        }
        .ud-task-card:hover {
          border-color: rgba(250,204,21,0.25);
          background: rgba(255,255,255,0.025);
        }
        .ud-task-top {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 12px; margin-bottom: 8px; flex-wrap: wrap;
        }
        .ud-task-title {
          font-family: 'Orbitron', monospace; font-size: 0.82rem;
          font-weight: 700; color: #fff; letter-spacing: 0.5px;
        }
        .ud-task-proj {
          font-size: 0.6rem; color: rgba(57,255,20,0.5);
          text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 4px;
        }
        .ud-task-desc {
          font-size: 0.68rem; color: rgba(255,255,255,0.6);
          line-height: 1.5; margin-bottom: 12px;
        }
        .ud-task-bottom {
          display: flex; justify-content: space-between; align-items: center;
          gap: 10px; flex-wrap: wrap;
        }
        .ud-task-select {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px; padding: 4px 8px; color: #fff;
          font-family: 'Share Tech Mono', monospace; font-size: 0.62rem;
          outline: none; cursor: pointer;
        }
        .ud-task-select option { background: #0c121d; color: #fff; }
      `}</style>

      {/* ── Active Projects Strip ── */}
      {projects.length > 0 && (
        <div className="ud-detail">
          <div className="ud-section-title">
            <span>// ASSIGNED PROJECTS</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
            {projects.map((p) => (
              <div
                key={p.id}
                style={{
                  background: "rgba(250,204,21,0.02)",
                  border: "1px solid rgba(250,204,21,0.15)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "0.58rem", color: "rgba(250,204,21,0.6)", letterSpacing: "0.1em" }}>
                  // {p.code || "PROJECT"}
                </div>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "0.82rem", fontWeight: 700, color: "#fff", marginTop: "4px" }}>
                  {p.name}
                </div>
                <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
                  {p.description || "Active engineering project"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tasks Detail ── */}
      <div className="ud-detail">
        <div className="ud-detail-header">
          <div>
            <div className="ud-detail-title">ASSIGNED TASKS</div>
            <div className="ud-detail-sub">Manage sprint tasks, track priorities, and update completion status</div>
          </div>
        </div>

        {msg && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "14px",
              fontSize: "0.7rem",
              background: msg.type === "success" ? "rgba(57,255,20,0.08)" : "rgba(248,113,113,0.08)",
              border: `1px solid ${msg.type === "success" ? "rgba(57,255,20,0.3)" : "rgba(248,113,113,0.3)"}`,
              color: msg.type === "success" ? "#39ff14" : "#f87171",
            }}
          >
            {msg.text}
          </div>
        )}

        <div className="ud-ts-header">
          <div className="ud-ts-filters">
            {["ALL", "TODO", "IN_PROGRESS", "COMPLETED"].map((st) => (
              <button
                key={st}
                className={"ud-ts-filter-btn" + (filterStatus === st ? " active" : "")}
                onClick={() => setFilterStatus(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ color: "#facc15", padding: "18px 0", fontSize: "0.72rem" }}>
            // LOADING ASSIGNED TASKS...
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.25)", padding: "18px 0", fontSize: "0.72rem" }}>
            No tasks assigned under status "{filterStatus}".
          </div>
        ) : (
          <div>
            {tasks.map((task) => {
              const theme = TASK_STATUS_THEME[task.status] || TASK_STATUS_THEME.TODO;
              const pTheme = PRIORITY_THEME[task.priority] || PRIORITY_THEME.MEDIUM;
              return (
                <div key={task.id} className="ud-task-card">
                  <div className="ud-task-top">
                    <div>
                      <div className="ud-task-proj">// {task.projects?.name || "General"}</div>
                      <div className="ud-task-title">{task.title}</div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "0.6rem", color: pTheme.color, fontWeight: 700 }}>
                        ● {task.priority}
                      </span>
                      <span
                        className="ud-status-badge"
                        style={{
                          "--sc": theme.color,
                          "--sc-bg": theme.bg,
                          "--sc-border": theme.border,
                        }}
                      >
                        <span className="ud-badge-dot" /> {task.status}
                      </span>
                    </div>
                  </div>

                  {task.description && (
                    <div className="ud-task-desc">{task.description}</div>
                  )}

                  <div className="ud-task-bottom">
                    <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)" }}>
                      Due: {fmtDate(task.due_date)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "0.6rem", color: "rgba(250,204,21,0.5)" }}>
                        UPDATE STATUS:
                      </span>
                      <select
                        className="ud-task-select"
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        disabled={actionLoading}
                      >
                        <option value="TODO">TODO</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

