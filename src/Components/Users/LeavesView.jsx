import React, { useState, useEffect, useCallback } from "react";
import { getLeaves, applyLeave, cancelLeave } from "../../services/timesheets";

const LEAVE_STATUS = {
  PENDING:   { color: "#facc15", bg: "rgba(250,204,21,0.1)",  border: "rgba(250,204,21,0.25)" },
  APPROVED:  { color: "#39ff14", bg: "rgba(57,255,20,0.1)",   border: "rgba(57,255,20,0.25)"  },
  REJECTED:  { color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)" },
  CANCELLED: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.25)" },
};

export default function LeavesView({ internId }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalEnlarged, setModalEnlarged] = useState(false);
  const [viewDialog, setViewDialog] = useState(null); // { title: string, subtitle: string, content: string }
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const [form, setForm] = useState({
    leaveType: "CASUAL",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    reason: "",
  });

  const loadData = useCallback(async () => {
    if (!internId) return;
    setLoading(true);
    const { data } = await getLeaves({ internId });
    if (data) setLeaves(data);
    setLoading(false);
  }, [internId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) {
      setMsg({ type: "error", text: "Please specify start and end dates." });
      return;
    }
    const d1 = new Date(form.startDate);
    const d2 = new Date(form.endDate);
    if (d2 < d1) {
      setMsg({ type: "error", text: "End date cannot be earlier than start date." });
      return;
    }
    const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;

    setActionLoading(true);
    setMsg(null);

    const { error } = await applyLeave({
      internId,
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate,
      totalDays: diffDays,
      reason: form.reason,
    });

    setActionLoading(false);
    if (error) {
      setMsg({ type: "error", text: error });
    } else {
      setMsg({ type: "success", text: "Leave request submitted to Admin successfully!" });
      setShowModal(false);
      setForm({
        leaveType: "CASUAL",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        reason: "",
      });
      loadData();
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this leave request?")) return;
    setActionLoading(true);
    const { error } = await cancelLeave(id);
    setActionLoading(false);
    if (error) {
      setMsg({ type: "error", text: error });
    } else {
      setMsg({ type: "success", text: "Leave request cancelled." });
      loadData();
    }
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <style>{`
        .ud-lv-table {
          width: 100%; border-collapse: collapse; font-size: 0.7rem; margin-top: 8px;
        }
        .ud-lv-table th {
          text-align: left; padding: 10px 12px;
          color: rgba(250,204,21,0.5); font-size: 0.58rem;
          text-transform: uppercase; letter-spacing: 0.14em;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .ud-lv-table td {
          padding: 12px 12px; border-bottom: 1px solid rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.7); vertical-align: top;
        }
        .ud-lv-table tr:hover td { background: rgba(255,255,255,0.015); }
      `}</style>

      <div className="ud-detail">
        <div className="ud-detail-header">
          <div>
            <div className="ud-detail-title">LEAVE MANAGEMENT</div>
            <div className="ud-detail-sub">Request casual, sick, or academic leaves and review approval statuses</div>
          </div>
          <button className="ud-apply-btn" onClick={() => setShowModal(true)}>
            + APPLY FOR LEAVE
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

        {loading ? (
          <div style={{ color: "#facc15", padding: "18px 0", fontSize: "0.72rem" }}>
            // LOADING LEAVE APPLICATIONS...
          </div>
        ) : leaves.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.25)", padding: "18px 0", fontSize: "0.72rem" }}>
            No leave requests recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="ud-lv-table">
              <thead>
                <tr>
                  <th>TYPE</th>
                  <th>PERIOD</th>
                  <th>DAYS</th>
                  <th>STATUS</th>
                  <th>REASON & REMARKS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((row) => {
                  const theme = LEAVE_STATUS[row.status] || LEAVE_STATUS.PENDING;
                  return (
                    <tr key={row.id}>
                      <td style={{ color: "#facc15", fontWeight: 700 }}>
                        {row.leave_type}
                      </td>
                      <td style={{ whiteSpace: "nowrap", color: "#fff" }}>
                        {fmtDate(row.start_date)} → {fmtDate(row.end_date)}
                      </td>
                      <td style={{ color: "#39ff14", fontWeight: 700 }}>
                        {row.total_days} {row.total_days === 1 ? "day" : "days"}
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
                                  color: "rgba(255,255,255,0.85)",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  wordBreak: "break-word",
                                  lineHeight: 1.45,
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
                                      subtitle: `${row.leave_type} Leave • ${row.start_date} → ${row.end_date} (${row.total_days} days)`,
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
                                    fontFamily: "'Share Tech Mono', monospace",
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
                                      color: theme.color,
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      wordBreak: "break-word",
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    // Admin note: {remark}
                                  </div>
                                  {isRemarkLong && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setViewDialog({
                                          title: "ADMIN REVIEW REMARKS",
                                          subtitle: `Leave: ${row.leave_type} • Status: ${row.status}`,
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
                                        fontFamily: "'Share Tech Mono', monospace",
                                      }}
                                    >
                                      ⤢ Expand note
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        {row.status === "PENDING" && (
                          <button
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "0.62rem",
                              fontFamily: "'Share Tech Mono', monospace",
                              background: "rgba(248,113,113,0.1)",
                              border: "1px solid rgba(248,113,113,0.25)",
                              color: "#f87171",
                              cursor: "pointer",
                            }}
                            onClick={() => handleCancel(row.id)}
                            disabled={actionLoading}
                          >
                            CANCEL
                          </button>
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

      {/* ── Apply Modal ── */}
      {showModal && (
        <div className="ud-modal-overlay">
          <div className="ud-modal">
            <div className="ud-detail-title" style={{ marginBottom: "16px" }}>
              SUBMIT LEAVE REQUEST
            </div>

            <form onSubmit={handleApply}>
              <div className="ud-modal-field">
                <label>// LEAVE TYPE</label>
                <select
                  className="ud-modal-select"
                  value={form.leaveType}
                  onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                  required
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Medical / Sick Leave</option>
                  <option value="ACADEMIC">Exams / College Submissions</option>
                  <option value="UNPAID">Other / Unpaid</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="ud-modal-field">
                  <label>// START DATE</label>
                  <input
                    type="date"
                    className="ud-modal-input"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="ud-modal-field">
                  <label>// END DATE</label>
                  <input
                    type="date"
                    className="ud-modal-input"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="ud-modal-field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ margin: 0 }}>// REASON FOR ABSENCE</label>
                  <button
                    type="button"
                    onClick={() => setModalEnlarged((p) => !p)}
                    style={{
                      background: modalEnlarged ? "rgba(250,204,21,0.15)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${modalEnlarged ? "#facc15" : "rgba(255,255,255,0.15)"}`,
                      color: modalEnlarged ? "#facc15" : "rgba(255,255,255,0.7)",
                      padding: "2px 7px",
                      borderRadius: "4px",
                      fontSize: "0.58rem",
                      fontFamily: "'Share Tech Mono', monospace",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {modalEnlarged ? "⤡ Normal Size" : "⤢ Enlarge Field"}
                  </button>
                </div>
                <textarea
                  rows={modalEnlarged ? 8 : 3}
                  className="ud-modal-textarea"
                  placeholder="Provide brief reason for taking leave..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  style={{
                    resize: "vertical",
                    minHeight: modalEnlarged ? "180px" : "80px",
                    fontFamily: "inherit",
                    fontSize: "0.78rem",
                  }}
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
                  {actionLoading ? "SUBMITTING..." : "SUBMIT REQUEST"}
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

