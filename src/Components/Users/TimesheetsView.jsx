import React, { useState, useEffect, useCallback } from "react";
import {
  getTimesheets,
  createTimesheet,
  submitTimesheet,
  deleteTimesheet,
  getProjects,
  getTasks,
} from "../../services/timesheets";

const STATUS_THEME = {
  DRAFT:     { color: "#94a3b8", bg: "rgba(148,163,184,0.1)",  border: "rgba(148,163,184,0.25)" },
  SUBMITTED: { color: "#facc15", bg: "rgba(250,204,21,0.1)",   border: "rgba(250,204,21,0.25)"  },
  APPROVED:  { color: "#39ff14", bg: "rgba(57,255,20,0.1)",    border: "rgba(57,255,20,0.25)"   },
  REJECTED:  { color: "#f87171", bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.25)" },
};

export default function TimesheetsView({ internId }) {
  const [timesheets, setTimesheets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [modalEnlarged, setModalEnlarged] = useState(false);
  const [viewDialog, setViewDialog] = useState(null); // { title: string, subtitle: string, content: string, tag: string }
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // Form State
  const [form, setForm] = useState({
    projectId: "",
    taskId: "",
    date: new Date().toISOString().split("T")[0],
    hours: "",
    description: "",
  });

  const loadData = useCallback(async () => {
    if (!internId) return;
    setLoading(true);
    const [tsRes, projRes, tasksRes] = await Promise.all([
      getTimesheets({ internId, status: statusFilter }),
      getProjects(),
      getTasks({ internId }),
    ]);

    if (tsRes.data) setTimesheets(tsRes.data);
    if (projRes.data) setProjects(projRes.data);
    if (tasksRes.data) setTasks(tasksRes.data);
    setLoading(false);
  }, [internId, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.projectId) {
      setMsg({ type: "error", text: "Please select a project." });
      return;
    }
    if (!form.hours || isNaN(form.hours) || Number(form.hours) <= 0) {
      setMsg({ type: "error", text: "Please enter valid work hours." });
      return;
    }

    setActionLoading(true);
    setMsg(null);
    const netWorkMinutes = Math.round(Number(form.hours) * 60);

    const { error } = await createTimesheet({
      internId,
      projectId: form.projectId,
      taskId: form.taskId || null,
      date: form.date,
      netWorkMinutes,
      description: form.description,
    });

    setActionLoading(false);
    if (error) {
      setMsg({ type: "error", text: error });
    } else {
      setMsg({ type: "success", text: "Timesheet draft saved successfully!" });
      setShowModal(false);
      setForm({
        projectId: "",
        taskId: "",
        date: new Date().toISOString().split("T")[0],
        hours: "",
        description: "",
      });
      loadData();
    }
  };

  const handleSubmit = async (id) => {
    setActionLoading(true);
    setMsg(null);
    const { error } = await submitTimesheet(id);
    setActionLoading(false);
    if (error) {
      setMsg({ type: "error", text: error });
    } else {
      setMsg({ type: "success", text: "Timesheet submitted for Admin approval!" });
      loadData();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this timesheet entry?")) return;
    setActionLoading(true);
    setMsg(null);
    const { error } = await deleteTimesheet(id);
    setActionLoading(false);
    if (error) {
      setMsg({ type: "error", text: error });
    } else {
      setMsg({ type: "success", text: "Timesheet entry removed." });
      loadData();
    }
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <style>{`
        .ud-ts-header {
          display: flex; justify-content: space-between; align-items: center;
          gap: 12px; flex-wrap: wrap; margin-bottom: 16px;
        }
        .ud-ts-filters {
          display: flex; gap: 6px; flex-wrap: wrap;
        }
        .ud-ts-filter-btn {
          padding: 6px 12px; border-radius: 6px; font-size: 0.65rem;
          font-family: 'Share Tech Mono', monospace; letter-spacing: 0.08em;
          text-transform: uppercase; background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06); color: rgba(255,255,255,0.4);
          cursor: pointer; transition: all 0.2s;
        }
        .ud-ts-filter-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .ud-ts-filter-btn.active {
          background: rgba(250,204,21,0.08); border-color: rgba(250,204,21,0.3); color: #facc15;
        }
        .ud-ts-table {
          width: 100%; border-collapse: collapse; font-size: 0.7rem; margin-top: 8px;
        }
        .ud-ts-table th {
          text-align: left; padding: 10px 12px;
          color: rgba(250,204,21,0.5); font-size: 0.58rem;
          text-transform: uppercase; letter-spacing: 0.14em;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .ud-ts-table td {
          padding: 12px 12px; border-bottom: 1px solid rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.7); vertical-align: top;
        }
        .ud-ts-table tr:hover td { background: rgba(255,255,255,0.015); }
        .ud-ts-action-btn {
          padding: 4px 10px; border-radius: 4px; font-size: 0.62rem;
          font-family: 'Share Tech Mono', monospace; font-weight: 700;
          cursor: pointer; border: 1px solid transparent; transition: all 0.2s;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .ud-ts-btn-sub {
          background: rgba(250,204,21,0.1); border-color: rgba(250,204,21,0.3); color: #facc15;
        }
        .ud-ts-btn-sub:hover { background: rgba(250,204,21,0.2); }
        .ud-ts-btn-del {
          background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.3); color: #f87171;
        }
        .ud-ts-btn-del:hover { background: rgba(248,113,113,0.2); }

        /* Modal */
        .ud-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8);
          z-index: 999; display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px); padding: 20px;
        }
        .ud-modal {
          background: #080c12; border: 1px solid rgba(250,204,21,0.2);
          border-radius: 12px; padding: 24px; width: 100%; max-width: 480px;
          animation: fadeUp 0.25s ease;
        }
        .ud-modal-field { margin-bottom: 14px; }
        .ud-modal-field label {
          display: block; font-size: 0.6rem; color: rgba(250,204,21,0.6);
          text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px;
        }
        .ud-modal-input, .ud-modal-select, .ud-modal-textarea {
          width: 100%; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;
          padding: 9px 12px; color: #fff; font-family: 'Share Tech Mono', monospace;
          font-size: 0.75rem; outline: none; transition: border-color 0.2s;
        }
        .ud-modal-input:focus, .ud-modal-select:focus, .ud-modal-textarea:focus {
          border-color: rgba(250,204,21,0.4);
        }
        .ud-modal-select option { background: #0c121d; color: #fff; }
      `}</style>

      {/* ── Main Detail Card ── */}
      <div className="ud-detail">
        <div className="ud-detail-header">
          <div>
            <div className="ud-detail-title">WORK TIMESHEETS</div>
            <div className="ud-detail-sub">Log daily work hours, track status, and submit for Admin approval</div>
          </div>
          <button className="ud-apply-btn" onClick={() => setShowModal(true)}>
            + LOG HOURS
          </button>
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
            {["ALL", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED"].map((st) => (
              <button
                key={st}
                className={"ud-ts-filter-btn" + (statusFilter === st ? " active" : "")}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ color: "#facc15", padding: "18px 0", fontSize: "0.72rem" }}>
            // LOADING TIMESHEET ENTRIES...
          </div>
        ) : timesheets.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.25)", padding: "18px 0", fontSize: "0.72rem" }}>
            No timesheet entries found under status "{statusFilter}".
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="ud-ts-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>PROJECT</th>
                  <th>HOURS</th>
                  <th>STATUS</th>
                  <th>DESCRIPTION & REMARKS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {timesheets.map((row) => {
                  const theme = STATUS_THEME[row.status] || STATUS_THEME.DRAFT;
                  const hrs = (Number(row.net_work_minutes || 0) / 60).toFixed(1);
                  return (
                    <tr key={row.id}>
                      <td style={{ color: "#fff", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {fmtDate(row.date)}
                      </td>
                      <td style={{ color: "#facc15", whiteSpace: "nowrap" }}>
                        {row.projects?.name || "—"}
                      </td>
                      <td style={{ color: "#39ff14", fontWeight: 700 }}>
                        {hrs}h
                      </td>
                      <td>
                        <span
                          className="ud-status-badge"
                          style={{
                            "--sc": theme.color,
                            "--sc-bg": theme.bg,
                            "--sc-border": theme.border,
                          }}
                        >
                          <span className="ud-badge-dot" /> {row.status}
                        </span>
                      </td>
                      <td style={{ maxWidth: "340px", minWidth: "220px" }}>
                        <div style={{ marginBottom: 4 }}>
                          {row.description ? (
                            row.description.length <= 80 ? (
                              <div style={{ color: "rgba(255,255,255,0.75)", wordBreak: "break-word" }}>
                                {row.description}
                              </div>
                            ) : (
                              <div>
                                <div
                                  style={{
                                    color: "rgba(255,255,255,0.75)",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {row.description}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewDialog({
                                      title: "TIMESHEET WORK DESCRIPTION",
                                      subtitle: `${fmtDate(row.date)} • ${row.projects?.name || "General"} • ${hrs}h`,
                                      content: row.description,
                                      tag: "DESCRIPTION",
                                    })
                                  }
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#facc15",
                                    cursor: "pointer",
                                    fontFamily: "'Share Tech Mono', monospace",
                                    fontSize: "0.62rem",
                                    padding: "2px 0",
                                    marginTop: "3px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  ⤢ Expand to view
                                </button>
                              </div>
                            )
                          ) : (
                            <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>
                          )}
                        </div>
                        {row.review_remarks && (
                          row.review_remarks.length <= 80 ? (
                            <div style={{ fontSize: "0.62rem", color: theme.color, marginTop: 4, wordBreak: "break-word" }}>
                              // Admin note: {row.review_remarks}
                            </div>
                          ) : (
                            <div style={{ marginTop: 4 }}>
                              <div
                                style={{
                                  fontSize: "0.62rem",
                                  color: theme.color,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  wordBreak: "break-word",
                                }}
                              >
                                // Admin note: {row.review_remarks}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setViewDialog({
                                    title: "ADMIN REVIEW REMARKS",
                                    subtitle: `${fmtDate(row.date)} • Status: ${row.status}`,
                                    content: row.review_remarks,
                                    tag: "ADMIN NOTE",
                                  })
                                }
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: theme.color,
                                  cursor: "pointer",
                                  fontFamily: "'Share Tech Mono', monospace",
                                  fontSize: "0.6rem",
                                  padding: "2px 0",
                                  marginTop: "2px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                ⤢ Expand remarks
                              </button>
                            </div>
                          )
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {row.status === "DRAFT" && (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              className="ud-ts-action-btn ud-ts-btn-sub"
                              onClick={() => handleSubmit(row.id)}
                              disabled={actionLoading}
                            >
                              SUBMIT
                            </button>
                            <button
                              className="ud-ts-action-btn ud-ts-btn-del"
                              onClick={() => handleDelete(row.id)}
                              disabled={actionLoading}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        {row.status !== "DRAFT" && (
                          <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.25)" }}>
                            LOCKED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Log Hours Modal ── */}
      {showModal && (
        <div className="ud-modal-overlay">
          <div className="ud-modal" style={{ maxWidth: modalEnlarged ? "760px" : "480px", width: "100%", transition: "all 0.25s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div className="ud-detail-title">LOG TIMESHEET ENTRY</div>
              <button
                type="button"
                onClick={() => setModalEnlarged((p) => !p)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "4px",
                  color: modalEnlarged ? "#facc15" : "rgba(255,255,255,0.6)",
                  padding: "4px 8px",
                  fontSize: "0.62rem",
                  cursor: "pointer",
                  fontFamily: "'Share Tech Mono', monospace",
                  transition: "all 0.2s",
                }}
              >
                {modalEnlarged ? "⤡ Normal Size" : "⤢ Enlarge Field"}
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="ud-modal-field">
                <label>// PROJECT</label>
                <select
                  className="ud-modal-select"
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  required
                >
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.code ? `(${p.code})` : ""}
                    </option>
                  ))}
                  {projects.length === 0 && (
                    <option value="" disabled>No projects found (Admin has not created any projects yet)</option>
                  )}
                </select>
              </div>

              {tasks.length > 0 && (
                <div className="ud-modal-field">
                  <label>// TASK (OPTIONAL)</label>
                  <select
                    className="ud-modal-select"
                    value={form.taskId}
                    onChange={(e) => setForm({ ...form, taskId: e.target.value })}
                  >
                    <option value="">Select linked task (optional)...</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="ud-modal-field">
                <label>// DATE</label>
                <input
                  type="date"
                  className="ud-modal-input"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>

              <div className="ud-modal-field">
                <label>// WORK HOURS (e.g. 7.5)</label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="24"
                  className="ud-modal-input"
                  placeholder="Hours worked..."
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  required
                />
              </div>

              <div className="ud-modal-field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ margin: 0 }}>// WORK SUMMARY / TASKS COMPLETED</label>
                  <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.3)" }}>
                    (drag bottom-right corner to resize)
                  </span>
                </div>
                <textarea
                  rows={modalEnlarged ? 8 : 3}
                  className="ud-modal-textarea"
                  style={{
                    resize: "vertical",
                    minHeight: modalEnlarged ? "180px" : "80px",
                    lineHeight: "1.5",
                  }}
                  placeholder="Detailed tasks, tickets, and features worked on..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: "9px 14px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    color: "rgba(255,255,255,0.6)",
                    fontFamily: "'Share Tech Mono', monospace",
                    cursor: "pointer",
                  }}
                  onClick={() => setShowModal(false)}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="ud-apply-btn"
                  style={{ flex: 1 }}
                  disabled={actionLoading}
                >
                  {actionLoading ? "SAVING..." : "SAVE DRAFT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── View Detail Dialog Popup Modal ── */}
      {viewDialog && (
        <div
          className="ud-modal-overlay"
          onClick={() => setViewDialog(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            className="ud-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0c121d",
              border: "1px solid rgba(250,204,21,0.35)",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "600px",
              width: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(250,204,21,0.1)",
              position: "relative",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            {/* Header with Title and Cross (X) Close button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px" }}>
              <div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.95rem", fontWeight: 700, color: "#facc15", letterSpacing: "0.08em" }}>
                  {viewDialog.title}
                </div>
                {viewDialog.subtitle && (
                  <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
                    {viewDialog.subtitle}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setViewDialog(null)}
                title="Close"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  borderRadius: "6px",
                  width: "30px",
                  height: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  lineHeight: 1,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(248,113,113,0.2)";
                  e.currentTarget.style.borderColor = "#f87171";
                  e.currentTarget.style.color = "#f87171";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.color = "#fff";
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div
              style={{
                background: "rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "8px",
                padding: "16px",
                maxHeight: "360px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: "0.8rem",
                lineHeight: "1.6",
                color: "rgba(255,255,255,0.9)",
                fontFamily: "'Share Tech Mono', monospace",
              }}
            >
              {viewDialog.content}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "18px" }}>
              <button
                type="button"
                onClick={() => setViewDialog(null)}
                style={{
                  padding: "8px 20px",
                  background: "rgba(250,204,21,0.15)",
                  border: "1px solid rgba(250,204,21,0.4)",
                  borderRadius: "6px",
                  color: "#facc15",
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "0.72rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

