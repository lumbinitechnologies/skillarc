import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getTimesheets,
  approveTimesheet,
  rejectTimesheet,
  getAllAttendance,
  getLeaves,
  approveLeave,
  rejectLeave,
  getProjects,
  createProject,
  assignInternToProject,
} from "../../services/timesheets";
import { supabase } from "../../services/supabase";

export default function TimesheetManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("timesheets"); // "timesheets" | "attendance" | "leaves" | "projects"
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "" });

  // Data
  const [timesheets, setTimesheets] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [projects, setProjects] = useState([]);
  const [internsList, setInternsList] = useState([]);

  // Filters
  const [tsStatusFilter, setTsStatusFilter] = useState("SUBMITTED");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("PENDING");
  const [attDateFilter, setAttDateFilter] = useState(new Date().toISOString().split("T")[0]);

  // Modals
  const [remarksModal, setRemarksModal] = useState(null); // { type: "timesheet" | "leave", action: "approve" | "reject", id: string }
  const [remarks, setRemarks] = useState("");
  const [remarksModalEnlarged, setRemarksModalEnlarged] = useState(false);
  const [viewDialog, setViewDialog] = useState(null); // { title: string, subtitle: string, content: string }
  const [showProjModal, setShowProjModal] = useState(false);
  const [projForm, setProjForm] = useState({ name: "", code: "", description: "" });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ projectId: "", internId: "", roleInProject: "Contributor" });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 4000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [tsRes, attRes, lvRes, prRes, internRes] = await Promise.all([
      getTimesheets({ status: tsStatusFilter }),
      getAllAttendance({ date: attDateFilter }),
      getLeaves({ status: leaveStatusFilter }),
      getProjects(),
      supabase.from("interns").select("id, intern_id, name, email"),
    ]);

    if (tsRes.data) setTimesheets(tsRes.data);
    if (attRes.data) setAttendance(attRes.data);
    if (lvRes.data) setLeaves(lvRes.data);
    if (prRes.data) setProjects(prRes.data);
    if (internRes.data) setInternsList(internRes.data);
    setLoading(false);
  }, [tsStatusFilter, leaveStatusFilter, attDateFilter]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Action Handlers
  const handleActionConfirm = async () => {
    if (!remarksModal) return;
    setActionLoading(true);

    if (remarksModal.type === "timesheet") {
      const fn = remarksModal.action === "approve" ? approveTimesheet : rejectTimesheet;
      const { error } = await fn(remarksModal.id, {
        remarks,
        reviewerEmail: user?.email || "Admin",
      });
      if (error) showToast(error, "error");
      else showToast(`Timesheet ${remarksModal.action}d successfully!`);
    } else if (remarksModal.type === "leave") {
      const fn = remarksModal.action === "approve" ? approveLeave : rejectLeave;
      const { error } = await fn(remarksModal.id, {
        remarks,
        reviewerEmail: user?.email || "Admin",
      });
      if (error) showToast(error, "error");
      else showToast(`Leave application ${remarksModal.action}d!`);
    }

    setActionLoading(false);
    setRemarksModal(null);
    setRemarks("");
    loadAll();
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projForm.name) return;
    setActionLoading(true);
    const { error } = await createProject(projForm);
    setActionLoading(false);
    if (error) showToast(error, "error");
    else {
      showToast("Project created successfully!");
      setShowProjModal(false);
      setProjForm({ name: "", code: "", description: "" });
      loadAll();
    }
  };

  const handleAssignIntern = async (e) => {
    e.preventDefault();
    if (!assignForm.projectId || !assignForm.internId) return;
    setActionLoading(true);
    const { error } = await assignInternToProject(assignForm);
    setActionLoading(false);
    if (error) showToast(error, "error");
    else {
      showToast("Intern assigned to project successfully!");
      setShowAssignModal(false);
      setAssignForm({ projectId: "", internId: "", roleInProject: "Contributor" });
      loadAll();
    }
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const fmtTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

  const pendingTsCount = timesheets.filter((t) => t.status === "SUBMITTED").length;
  const pendingLvCount = leaves.filter((l) => l.status === "PENDING").length;

  return (
    <div className="tm-root">
      <style>{`
        .tm-root {
          min-height: 100vh;
          background: #040404;
          color: #e2e8f0;
          font-family: 'Share Tech Mono', monospace;
          padding-bottom: 5rem;
        }

        .tm-hero {
          padding: clamp(3rem,6vw,5rem) clamp(1rem,5vw,3rem) clamp(2rem,4vw,3rem);
          background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(250,204,21,.07) 0%, transparent 70%);
          border-bottom: 1px solid rgba(250,204,21,.10);
          text-align: center;
        }

        .tm-tbar {
          display: inline-flex; align-items: center; gap: .5rem;
          background: rgba(57,255,20,.06); border: 1px solid rgba(57,255,20,.25);
          border-radius: 4px; padding: .35rem .85rem; margin-bottom: 1.5rem;
          font-size: .68rem; color: #39ff14; letter-spacing: .12em;
        }
        .tm-tdot { width: 7px; height: 7px; border-radius: 50%; background: #39ff14; }

        .tm-hero-title {
          font-family: 'Orbitron', monospace;
          font-size: clamp(1.6rem, 3.5vw, 2.6rem);
          font-weight: 900; letter-spacing: 2px; color: #fff; margin-bottom: .6rem;
        }
        .tm-hero-title span { color: #facc15; text-shadow: 0 0 20px rgba(250,204,21,.4); }
        .tm-hero-sub {
          font-size: clamp(.72rem, 1.2vw, .82rem); color: rgba(255,255,255,.35);
          letter-spacing: .08em; max-width: 650px; margin: 0 auto;
        }

        .tm-wrap { max-width: 1200px; margin: 0 auto; padding: 2rem clamp(1rem,4vw,2.5rem); }

        .tm-stats {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem; margin-bottom: 2rem;
        }
        .tm-stat {
          background: rgba(255,255,255,.025); border: 1px solid rgba(255,255,255,.07);
          border-radius: 10px; padding: 1.1rem 1.25rem; text-align: center;
        }
        .tm-stat-num {
          font-family: 'Orbitron', monospace; font-size: 1.6rem; font-weight: 900;
          display: block; margin-bottom: .2rem; color: #facc15;
        }
        .tm-stat-label {
          font-size: .58rem; color: rgba(255,255,255,.3);
          letter-spacing: .15em; text-transform: uppercase;
        }

        /* Tabs */
        .tm-tabs {
          display: flex; gap: .5rem; margin-bottom: 1.75rem;
          border-bottom: 1px solid rgba(255,255,255,.07); flex-wrap: wrap;
        }
        .tm-tab {
          padding: .75rem 1.4rem; background: transparent; border: none;
          border-bottom: 2px solid transparent; color: rgba(255,255,255,.35);
          font-family: 'Share Tech Mono', monospace; font-size: .72rem;
          letter-spacing: .14em; text-transform: uppercase; cursor: pointer;
          transition: all .2s; display: flex; align-items: center; gap: .5rem; margin-bottom: -1px;
        }
        .tm-tab:hover { color: rgba(255,255,255,.7); }
        .tm-tab.active { color: #facc15; border-bottom-color: #facc15; }
        .tm-tab-badge {
          padding: 1px 6px; border-radius: 999px; font-size: .6rem; font-weight: 700;
          background: rgba(250,204,21,.15); color: #facc15; border: 1px solid rgba(250,204,21,.3);
        }

        /* Tables & Lists */
        .tm-table-wrap {
          background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.06);
          border-radius: 12px; padding: 20px; overflow-x: auto;
        }
        .tm-table { width: 100%; border-collapse: collapse; font-size: .72rem; }
        .tm-table th {
          text-align: left; padding: 11px 12px; color: rgba(250,204,21,.6);
          font-size: .6rem; text-transform: uppercase; letter-spacing: .12em;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }
        .tm-table td {
          padding: 12px; border-bottom: 1px solid rgba(255,255,255,.03);
          color: rgba(255,255,255,.7); vertical-align: middle;
        }
        .tm-table tr:hover td { background: rgba(255,255,255,.015); }

        .tm-btn-approve {
          padding: 5px 12px; background: rgba(57,255,20,.1); border: 1px solid rgba(57,255,20,.3);
          color: #39ff14; border-radius: 4px; font-family: inherit; font-size: .65rem;
          font-weight: 700; cursor: pointer; transition: all .2s;
        }
        .tm-btn-approve:hover { background: rgba(57,255,20,.2); }
        .tm-btn-reject {
          padding: 5px 12px; background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.3);
          color: #f87171; border-radius: 4px; font-family: inherit; font-size: .65rem;
          font-weight: 700; cursor: pointer; transition: all .2s;
        }
        .tm-btn-reject:hover { background: rgba(248,113,113,.2); }

        /* Modal */
        .tm-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.8);
          z-index: 1000; display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(5px); padding: 1rem;
        }
        .tm-modal {
          background: #080c12; border: 1px solid rgba(250,204,21,.25);
          border-radius: 12px; width: min(480px, 100%); padding: 24px;
        }
        .tm-modal-title {
          font-family: 'Orbitron', monospace; font-size: .95rem; font-weight: 800;
          color: #fff; margin-bottom: 6px;
        }
        .tm-modal-sub { font-size: .65rem; color: rgba(255,255,255,.3); margin-bottom: 16px; }
        .tm-modal-input, .tm-modal-textarea, .tm-modal-select {
          width: 100%; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.1);
          border-radius: 6px; padding: 9px 12px; color: #fff; font-family: inherit;
          font-size: .75rem; margin-bottom: 14px; outline: none;
        }
        .tm-modal-input:focus, .tm-modal-textarea:focus, .tm-modal-select:focus {
          border-color: rgba(250,204,21,.4);
        }
        .tm-modal-select option { background: #0c121d; color: #fff; }

        /* Toast */
        .tm-toast {
          position: fixed; top: 5rem; right: 2rem; z-index: 9999;
          padding: 12px 18px; border-radius: 8px; font-size: .75rem;
          background: #0d131f; border: 1px solid rgba(250,204,21,.3);
          box-shadow: 0 10px 30px rgba(0,0,0,.5);
        }
      `}</style>

      {/* ── Toast ── */}
      {toast.msg && (
        <div
          className="tm-toast"
          style={{
            borderColor: toast.type === "error" ? "#f87171" : "#39ff14",
            color: toast.type === "error" ? "#f87171" : "#39ff14",
          }}
        >
          {toast.type === "error" ? "⚠️ " : "✅ "}
          {toast.msg}
        </div>
      )}

      {/* ── Hero ── */}
      <div className="tm-hero">
        <div className="tm-tbar">
          <span className="tm-tdot" />
          <span>[SYS://WORKFORCE_TIME_TRACKING]</span>
        </div>
        <h1 className="tm-hero-title">
          TIME & ATTENDANCE <span>MANAGEMENT</span>
        </h1>
        <p className="tm-hero-sub">
          Review intern daily logs, approve timesheets & leave applications, and assign projects.
        </p>
      </div>

      <div className="tm-wrap">
        {/* ── Stats Strip ── */}
        <div className="tm-stats">
          <div className="tm-stat">
            <span className="tm-stat-num">{pendingTsCount}</span>
            <span className="tm-stat-label">Pending Timesheets</span>
          </div>
          <div className="tm-stat">
            <span className="tm-stat-num">{attendance.length}</span>
            <span className="tm-stat-label">Logs for {attDateFilter}</span>
          </div>
          <div className="tm-stat">
            <span className="tm-stat-num">{pendingLvCount}</span>
            <span className="tm-stat-label">Pending Leaves</span>
          </div>
          <div className="tm-stat">
            <span className="tm-stat-num">{projects.length}</span>
            <span className="tm-stat-label">Active Projects</span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="tm-tabs">
          <button
            className={"tm-tab" + (activeTab === "timesheets" ? " active" : "")}
            onClick={() => setActiveTab("timesheets")}
          >
            <span>📅</span> TIMESHEET APPROVALS
            {pendingTsCount > 0 && <span className="tm-tab-badge">{pendingTsCount}</span>}
          </button>
          <button
            className={"tm-tab" + (activeTab === "attendance" ? " active" : "")}
            onClick={() => setActiveTab("attendance")}
          >
            <span>⏱️</span> ATTENDANCE REGISTER
          </button>
          <button
            className={"tm-tab" + (activeTab === "leaves" ? " active" : "")}
            onClick={() => setActiveTab("leaves")}
          >
            <span>🏖️</span> LEAVE REQUESTS
            {pendingLvCount > 0 && <span className="tm-tab-badge">{pendingLvCount}</span>}
          </button>
          <button
            className={"tm-tab" + (activeTab === "projects" ? " active" : "")}
            onClick={() => setActiveTab("projects")}
          >
            <span>🎯</span> PROJECTS & ASSIGNMENTS
          </button>

          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            <button
              onClick={() => navigate("/admin-dashboard")}
              style={{
                background: "rgba(255,255,255,.03)",
                border: "1px solid rgba(255,255,255,.1)",
                color: "rgba(255,255,255,.5)",
                borderRadius: "6px",
                padding: "6px 12px",
                fontFamily: "inherit",
                fontSize: ".65rem",
                cursor: "pointer",
              }}
            >
              ← BACK TO ADMIN
            </button>
            <button
              onClick={loadAll}
              style={{
                background: "rgba(250,204,21,.1)",
                border: "1px solid rgba(250,204,21,.25)",
                color: "#facc15",
                borderRadius: "6px",
                padding: "6px 12px",
                fontFamily: "inherit",
                fontSize: ".65rem",
                cursor: "pointer",
              }}
            >
              ↻ REFRESH
            </button>
          </div>
        </div>

        {/* ── TAB 1: TIMESHEET APPROVALS ── */}
        {activeTab === "timesheets" && (
          <div className="tm-table-wrap">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,.4)" }}>
                Filter Status:
                {["SUBMITTED", "APPROVED", "REJECTED", "ALL"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setTsStatusFilter(st)}
                    style={{
                      marginLeft: 6,
                      background: tsStatusFilter === st ? "rgba(250,204,21,.15)" : "transparent",
                      border: `1px solid ${tsStatusFilter === st ? "rgba(250,204,21,.4)" : "rgba(255,255,255,.1)"}`,
                      color: tsStatusFilter === st ? "#facc15" : "rgba(255,255,255,.4)",
                      borderRadius: 4,
                      padding: "3px 8px",
                      fontFamily: "inherit",
                      fontSize: ".62rem",
                      cursor: "pointer",
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ color: "#facc15", padding: "20px 0" }}>// LOADING TIMESHEETS...</div>
            ) : timesheets.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,.3)", padding: "20px 0" }}>
                No timesheets under status "{tsStatusFilter}".
              </div>
            ) : (
              <table className="tm-table">
                <thead>
                  <tr>
                    <th>INTERN</th>
                    <th>DATE</th>
                    <th>PROJECT</th>
                    <th>HOURS</th>
                    <th>DESCRIPTION</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheets.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div style={{ color: "#fff", fontWeight: 700 }}>
                          {row.interns?.name || "Intern"}
                        </div>
                        <div style={{ fontSize: ".58rem", color: "rgba(255,255,255,.3)" }}>
                          {row.interns?.intern_id || row.interns?.email}
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtDate(row.date)}</td>
                      <td style={{ color: "#facc15" }}>{row.projects?.name || "General"}</td>
                      <td style={{ color: "#39ff14", fontWeight: 700 }}>
                        {(Number(row.net_work_minutes || 0) / 60).toFixed(1)}h
                      </td>
                      <td style={{ maxWidth: 360, minWidth: 220 }}>
                        {(() => {
                          const desc = row.description || "—";
                          const isDescLong = desc.length > 80 || desc.includes("\n");

                          const remark = row.review_remarks;
                          const isRemarkLong = remark && (remark.length > 70 || remark.includes("\n"));

                          return (
                            <div>
                              <div
                                style={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  wordBreak: "break-word",
                                  lineHeight: 1.45,
                                  color: "rgba(255,255,255,0.85)",
                                }}
                              >
                                {desc}
                              </div>
                              {isDescLong && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewDialog({
                                      title: "TIMESHEET WORK DESCRIPTION",
                                      subtitle: `${row.interns?.name || row.interns?.email} • ${fmtDate(row.date)} • ${row.projects?.name || "General"}`,
                                      content: row.description,
                                    })
                                  }
                                  style={{
                                    background: "none",
                                    border: "none",
                                    padding: 0,
                                    marginTop: 3,
                                    fontSize: "0.58rem",
                                    color: "#facc15",
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                  }}
                                >
                                  ⤢ Expand to view
                                </button>
                              )}

                              {remark && (
                                <div style={{ marginTop: 6, paddingTop: 4, borderTop: "1px dashed rgba(255,255,255,0.07)" }}>
                                  <div
                                    style={{
                                      fontSize: "0.62rem",
                                      color: "#facc15",
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      wordBreak: "break-word",
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    // Remark: {remark}
                                  </div>
                                  {isRemarkLong && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setViewDialog({
                                          title: "REVIEW REMARK",
                                          subtitle: `Intern: ${row.interns?.name || row.interns?.email} • Status: ${row.status}`,
                                          content: row.review_remarks,
                                        })
                                      }
                                      style={{
                                        background: "none",
                                        border: "none",
                                        padding: 0,
                                        marginTop: 2,
                                        fontSize: "0.55rem",
                                        color: "#39ff14",
                                        cursor: "pointer",
                                        fontFamily: "inherit",
                                      }}
                                    >
                                      ⤢ Expand remark
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: row.status === "APPROVED" ? "#39ff14" : row.status === "REJECTED" ? "#f87171" : "#facc15" }}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {row.status === "SUBMITTED" && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="tm-btn-approve"
                              onClick={() => setRemarksModal({ type: "timesheet", action: "approve", id: row.id })}
                            >
                              APPROVE
                            </button>
                            <button
                              className="tm-btn-reject"
                              onClick={() => setRemarksModal({ type: "timesheet", action: "reject", id: row.id })}
                            >
                              REJECT
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── TAB 2: ATTENDANCE REGISTER ── */}
        {activeTab === "attendance" && (
          <div className="tm-table-wrap">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: ".68rem", color: "rgba(250,204,21,.6)" }}>// SELECT DATE:</span>
              <input
                type="date"
                value={attDateFilter}
                onChange={(e) => setAttDateFilter(e.target.value)}
                style={{
                  background: "rgba(255,255,255,.04)",
                  border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: 6,
                  color: "#fff",
                  fontFamily: "inherit",
                  fontSize: ".7rem",
                  padding: "4px 8px",
                }}
              />
            </div>

            {loading ? (
              <div style={{ color: "#facc15", padding: "20px 0" }}>// LOADING ATTENDANCE REGISTER...</div>
            ) : attendance.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,.3)", padding: "20px 0" }}>
                No attendance logs found for {attDateFilter}.
              </div>
            ) : (
              <table className="tm-table">
                <thead>
                  <tr>
                    <th>INTERN</th>
                    <th>DATE</th>
                    <th>CHECK IN</th>
                    <th>CHECK OUT</th>
                    <th>STATUS</th>
                    <th>NOTES</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div style={{ color: "#fff", fontWeight: 700 }}>
                          {row.interns?.name || "Intern"}
                        </div>
                        <div style={{ fontSize: ".58rem", color: "rgba(255,255,255,.3)" }}>
                          {row.interns?.intern_id || row.interns?.email}
                        </div>
                      </td>
                      <td>{fmtDate(row.date)}</td>
                      <td style={{ color: "#39ff14" }}>{fmtTime(row.check_in)}</td>
                      <td style={{ color: "#facc15" }}>{fmtTime(row.check_out)}</td>
                      <td>
                        <span style={{ color: row.status === "PRESENT" ? "#39ff14" : "#facc15", fontWeight: 700 }}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ color: "rgba(255,255,255,.5)" }}>{row.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── TAB 3: LEAVE REQUESTS ── */}
        {activeTab === "leaves" && (
          <div className="tm-table-wrap">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,.4)" }}>
                Filter Status:
                {["PENDING", "APPROVED", "REJECTED", "ALL"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setLeaveStatusFilter(st)}
                    style={{
                      marginLeft: 6,
                      background: leaveStatusFilter === st ? "rgba(250,204,21,.15)" : "transparent",
                      border: `1px solid ${leaveStatusFilter === st ? "rgba(250,204,21,.4)" : "rgba(255,255,255,.1)"}`,
                      color: leaveStatusFilter === st ? "#facc15" : "rgba(255,255,255,.4)",
                      borderRadius: 4,
                      padding: "3px 8px",
                      fontFamily: "inherit",
                      fontSize: ".62rem",
                      cursor: "pointer",
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ color: "#facc15", padding: "20px 0" }}>// LOADING LEAVE APPLICATIONS...</div>
            ) : leaves.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,.3)", padding: "20px 0" }}>
                No leave requests under status "{leaveStatusFilter}".
              </div>
            ) : (
              <table className="tm-table">
                <thead>
                  <tr>
                    <th>INTERN</th>
                    <th>TYPE</th>
                    <th>DATES</th>
                    <th>DAYS</th>
                    <th>REASON</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div style={{ color: "#fff", fontWeight: 700 }}>
                          {row.interns?.name || "Intern"}
                        </div>
                        <div style={{ fontSize: ".58rem", color: "rgba(255,255,255,.3)" }}>
                          {row.interns?.intern_id || row.interns?.email}
                        </div>
                      </td>
                      <td style={{ color: "#facc15", fontWeight: 700 }}>{row.leave_type}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {fmtDate(row.start_date)} → {fmtDate(row.end_date)}
                      </td>
                      <td style={{ color: "#39ff14", fontWeight: 700 }}>{row.total_days}d</td>
                      <td style={{ maxWidth: 360, minWidth: 220 }}>
                        {(() => {
                          const reason = row.reason || "—";
                          const isReasonLong = reason.length > 80 || reason.includes("\n");

                          const remark = row.review_remarks;
                          const isRemarkLong = remark && (remark.length > 70 || remark.includes("\n"));

                          return (
                            <div>
                              <div
                                style={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  wordBreak: "break-word",
                                  lineHeight: 1.45,
                                  color: "rgba(255,255,255,0.85)",
                                }}
                              >
                                {reason}
                              </div>
                              {isReasonLong && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewDialog({
                                      title: "LEAVE REASON",
                                      subtitle: `Intern: ${row.interns?.name || row.interns?.email} • ${row.leave_type} Leave (${row.total_days} days)`,
                                      content: row.reason,
                                    })
                                  }
                                  style={{
                                    background: "none",
                                    border: "none",
                                    padding: 0,
                                    marginTop: 3,
                                    fontSize: "0.58rem",
                                    color: "#facc15",
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  ⤢ Expand to view
                                </button>
                              )}

                              {remark && (
                                <div style={{ marginTop: 6, paddingTop: 4, borderTop: "1px dashed rgba(255,255,255,0.07)" }}>
                                  <div
                                    style={{
                                      fontSize: "0.62rem",
                                      color: "#facc15",
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      wordBreak: "break-word",
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    // Remark: {remark}
                                  </div>
                                  {isRemarkLong && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setViewDialog({
                                          title: "REVIEW REMARK",
                                          subtitle: `Intern: ${row.interns?.name || row.interns?.email} • Status: ${row.status}`,
                                          content: row.review_remarks,
                                        })
                                      }
                                      style={{
                                        background: "none",
                                        border: "none",
                                        padding: 0,
                                        marginTop: 2,
                                        fontSize: "0.55rem",
                                        color: "#39ff14",
                                        cursor: "pointer",
                                        fontFamily: "inherit",
                                      }}
                                    >
                                      ⤢ Expand remark
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: row.status === "APPROVED" ? "#39ff14" : row.status === "REJECTED" ? "#f87171" : "#facc15" }}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {row.status === "PENDING" && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="tm-btn-approve"
                              onClick={() => setRemarksModal({ type: "leave", action: "approve", id: row.id })}
                            >
                              APPROVE
                            </button>
                            <button
                              className="tm-btn-reject"
                              onClick={() => setRemarksModal({ type: "leave", action: "reject", id: row.id })}
                            >
                              REJECT
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── TAB 4: PROJECTS & ASSIGNMENTS ── */}
        {activeTab === "projects" && (
          <div className="tm-table-wrap">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: ".85rem", color: "#fff" }}>
                ORGANIZATION PROJECTS
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowProjModal(true)}
                  style={{
                    padding: "6px 14px",
                    background: "#facc15",
                    border: "none",
                    borderRadius: 6,
                    color: "#000",
                    fontFamily: "inherit",
                    fontSize: ".65rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  + CREATE PROJECT
                </button>
                <button
                  onClick={() => setShowAssignModal(true)}
                  style={{
                    padding: "6px 14px",
                    background: "rgba(57,255,20,.1)",
                    border: "1px solid rgba(57,255,20,.3)",
                    borderRadius: 6,
                    color: "#39ff14",
                    fontFamily: "inherit",
                    fontSize: ".65rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  + ASSIGN INTERN
                </button>
              </div>
            </div>

            <table className="tm-table">
              <thead>
                <tr>
                  <th>PROJECT CODE</th>
                  <th>NAME</th>
                  <th>STATUS</th>
                  <th>DESCRIPTION</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td style={{ color: "#39ff14", fontWeight: 700 }}>{p.code || "PRJ"}</td>
                    <td style={{ color: "#fff", fontWeight: 700 }}>{p.name}</td>
                    <td>
                      <span style={{ color: "#facc15", fontWeight: 700 }}>{p.status}</span>
                    </td>
                    <td style={{ color: "rgba(255,255,255,.5)" }}>{p.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Remarks Modal ── */}
      {remarksModal && (
        <div className="tm-modal-overlay">
          <div
            className="tm-modal"
            style={{
              maxWidth: remarksModalEnlarged ? "780px" : "480px",
              width: "95%",
              transition: "max-width 0.25s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div className="tm-modal-title" style={{ marginBottom: 0 }}>
                {remarksModal.action.toUpperCase()} {remarksModal.type.toUpperCase()}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setRemarksModalEnlarged((p) => !p)}
                  style={{
                    background: remarksModalEnlarged ? "rgba(250,204,21,0.15)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${remarksModalEnlarged ? "#facc15" : "rgba(255,255,255,0.15)"}`,
                    color: remarksModalEnlarged ? "#facc15" : "rgba(255,255,255,0.7)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "0.62rem",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {remarksModalEnlarged ? "⤡ Normal View" : "⤢ Enlarge Field"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRemarksModal(null);
                    setRemarksModalEnlarged(false);
                  }}
                  title="Close"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    borderRadius: "6px",
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: "1rem",
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="tm-modal-sub">
              Add optional review remarks or feedback for the intern:
            </div>
            <textarea
              rows={remarksModalEnlarged ? 10 : 3}
              className="tm-modal-textarea"
              placeholder="Enter remarks (e.g. Approved good progress / Incomplete hours)..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{
                resize: "vertical",
                minHeight: remarksModalEnlarged ? "220px" : "90px",
                fontFamily: "inherit",
                fontSize: "0.78rem",
              }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                style={{
                  flex: 1, padding: "8px", background: "rgba(255,255,255,.05)",
                  border: "1px solid rgba(255,255,255,.1)", borderRadius: 6,
                  color: "#94a3b8", fontFamily: "inherit", cursor: "pointer",
                }}
                onClick={() => {
                  setRemarksModal(null);
                  setRemarksModalEnlarged(false);
                }}
              >
                CANCEL
              </button>
              <button
                style={{
                  flex: 1, padding: "8px",
                  background: remarksModal.action === "approve" ? "#39ff14" : "#f87171",
                  border: "none", borderRadius: 6,
                  color: remarksModal.action === "approve" ? "#000" : "#fff",
                  fontFamily: "inherit", fontWeight: 700, cursor: "pointer",
                }}
                onClick={handleActionConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? "SAVING..." : "CONFIRM"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Project Modal ── */}
      {showProjModal && (
        <div className="tm-modal-overlay">
          <div className="tm-modal">
            <div className="tm-modal-title">CREATE NEW PROJECT</div>
            <form onSubmit={handleCreateProject}>
              <input
                type="text"
                placeholder="Project Name (e.g. AI Automation Engine)..."
                className="tm-modal-input"
                value={projForm.name}
                onChange={(e) => setProjForm({ ...projForm, name: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Project Code (e.g. AI-ENG)..."
                className="tm-modal-input"
                value={projForm.code}
                onChange={(e) => setProjForm({ ...projForm, code: e.target.value })}
              />
              <textarea
                rows="3"
                placeholder="Project overview & technical scope..."
                className="tm-modal-textarea"
                value={projForm.description}
                onChange={(e) => setProjForm({ ...projForm, description: e.target.value })}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  style={{
                    flex: 1, padding: "8px", background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.1)", borderRadius: 6,
                    color: "#94a3b8", fontFamily: "inherit", cursor: "pointer",
                  }}
                  onClick={() => setShowProjModal(false)}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1, padding: "8px", background: "#facc15",
                    border: "none", borderRadius: 6, color: "#000",
                    fontFamily: "inherit", fontWeight: 700, cursor: "pointer",
                  }}
                  disabled={actionLoading}
                >
                  {actionLoading ? "CREATING..." : "CREATE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Intern Modal ── */}
      {showAssignModal && (
        <div className="tm-modal-overlay">
          <div className="tm-modal">
            <div className="tm-modal-title">ASSIGN INTERN TO PROJECT</div>
            <form onSubmit={handleAssignIntern}>
              <select
                className="tm-modal-select"
                value={assignForm.projectId}
                onChange={(e) => setAssignForm({ ...assignForm, projectId: e.target.value })}
                required
              >
                <option value="">Select Project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code || "PRJ"})</option>
                ))}
              </select>

              <select
                className="tm-modal-select"
                value={assignForm.internId}
                onChange={(e) => setAssignForm({ ...assignForm, internId: e.target.value })}
                required
              >
                <option value="">Select Intern...</option>
                {internsList.map((i) => (
                  <option key={i.id} value={i.id}>{i.name} ({i.intern_id || i.email})</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Role in project (e.g. Frontend Dev, ML Intern)..."
                className="tm-modal-input"
                value={assignForm.roleInProject}
                onChange={(e) => setAssignForm({ ...assignForm, roleInProject: e.target.value })}
              />

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  style={{
                    flex: 1, padding: "8px", background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.1)", borderRadius: 6,
                    color: "#94a3b8", fontFamily: "inherit", cursor: "pointer",
                  }}
                  onClick={() => setShowAssignModal(false)}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1, padding: "8px", background: "#39ff14",
                    border: "none", borderRadius: 6, color: "#000",
                    fontFamily: "inherit", fontWeight: 700, cursor: "pointer",
                  }}
                  disabled={actionLoading}
                >
                  {actionLoading ? "ASSIGNING..." : "ASSIGN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── View Detail Dialog Popup Modal ── */}
      {viewDialog && (
        <div
          className="tm-modal-overlay"
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
            className="tm-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0c121d",
              border: "1px solid rgba(250,204,21,0.35)",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "640px",
              width: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(250,204,21,0.1)",
              position: "relative",
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

