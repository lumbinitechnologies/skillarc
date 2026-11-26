import React, { useState, useEffect, useCallback } from "react";
import {
  getTodayAttendance,
  getAttendanceHistory,
  clockIn,
  clockOut,
} from "../../services/timesheets";

export default function AttendanceView({ internId }) {
  const [todayRecord, setTodayRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState(null);
  const [elapsed, setElapsed] = useState("00:00:00");

  const loadData = useCallback(async () => {
    if (!internId) return;
    setLoading(true);
    const [todayRes, historyRes] = await Promise.all([
      getTodayAttendance(internId),
      getAttendanceHistory(internId, 20),
    ]);
    if (todayRes.data) setTodayRecord(todayRes.data);
    else setTodayRecord(null);
    if (historyRes.data) setHistory(historyRes.data);
    setLoading(false);
  }, [internId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!todayRecord?.check_in || todayRecord?.check_out) {
      if (todayRecord?.check_in && todayRecord?.check_out) {
        const diff = new Date(todayRecord.check_out) - new Date(todayRecord.check_in);
        const hrs = String(Math.floor(diff / 3600000)).padStart(2, "0");
        const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
        const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
        setElapsed(`${hrs}:${mins}:${secs}`);
      } else {
        setElapsed("00:00:00");
      }
      return;
    }

    const timer = setInterval(() => {
      const diff = new Date() - new Date(todayRecord.check_in);
      const hrs = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setElapsed(`${hrs}:${mins}:${secs}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [todayRecord]);

  const handleClockIn = async () => {
    setActionLoading(true);
    setMsg(null);
    const { error } = await clockIn({ internId, notes });
    setActionLoading(false);
    if (error) {
      setMsg({ type: "error", text: error });
    } else {
      setMsg({ type: "success", text: "Successfully clocked in!" });
      setNotes("");
      loadData();
    }
  };

  const handleClockOut = async () => {
    if (!todayRecord?.id) return;
    setActionLoading(true);
    setMsg(null);
    const { error } = await clockOut({ recordId: todayRecord.id, notes });
    setActionLoading(false);
    if (error) {
      setMsg({ type: "error", text: error });
    } else {
      setMsg({ type: "success", text: "Successfully clocked out for today!" });
      setNotes("");
      loadData();
    }
  };

  const fmtTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <style>{`
        .ud-att-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px; margin-bottom: 20px;
        }
        .ud-att-metric {
          background: rgba(255,255,255,0.015);
          border: 1px solid rgba(250,204,21,0.1);
          border-radius: 10px; padding: 14px 16px;
          text-align: center;
        }
        .ud-att-metric-label {
          font-size: 0.58rem; color: rgba(255,255,255,0.25);
          text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 4px;
        }
        .ud-att-metric-val {
          font-family: 'Orbitron', monospace;
          font-size: 1.15rem; font-weight: 700; color: #facc15;
        }
        .ud-att-bar {
          display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 10px;
        }
        .ud-att-input {
          flex: 1; min-width: 220px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px; padding: 10px 14px;
          color: #fff; font-family: 'Share Tech Mono', monospace; font-size: 0.72rem;
          outline: none; transition: border-color 0.2s;
        }
        .ud-att-input:focus { border-color: rgba(250,204,21,0.4); }
        .ud-att-btn-in {
          padding: 10px 20px; background: #39ff14; color: #000;
          font-family: 'Orbitron', monospace; font-weight: 700; font-size: 0.7rem;
          letter-spacing: 1.5px; border-radius: 6px; border: none; cursor: pointer;
          transition: all 0.2s; white-space: nowrap;
        }
        .ud-att-btn-in:hover:not(:disabled) { background: #4fff30; box-shadow: 0 0 20px rgba(57,255,20,0.4); transform: translateY(-1px); }
        .ud-att-btn-out {
          padding: 10px 20px; background: #f87171; color: #fff;
          font-family: 'Orbitron', monospace; font-weight: 700; font-size: 0.7rem;
          letter-spacing: 1.5px; border-radius: 6px; border: none; cursor: pointer;
          transition: all 0.2s; white-space: nowrap;
        }
        .ud-att-btn-out:hover:not(:disabled) { background: #ff8585; box-shadow: 0 0 20px rgba(248,113,113,0.4); transform: translateY(-1px); }
        .ud-att-table {
          width: 100%; border-collapse: collapse; font-size: 0.7rem; margin-top: 8px;
        }
        .ud-att-table th {
          text-align: left; padding: 10px 12px;
          color: rgba(250,204,21,0.5); font-size: 0.58rem;
          text-transform: uppercase; letter-spacing: 0.14em;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .ud-att-table td {
          padding: 11px 12px; border-bottom: 1px solid rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.65);
        }
        .ud-att-table tr:hover td { background: rgba(255,255,255,0.015); }
      `}</style>

      {/* ── Today's Attendance Card ── */}
      <div className="ud-detail">
        <div className="ud-detail-header">
          <div>
            <div className="ud-detail-title">DAILY ATTENDANCE</div>
            <div className="ud-detail-sub">Log your check-in & check-out times for today</div>
          </div>
          <div>
            {todayRecord?.check_in && !todayRecord?.check_out && (
              <span className="ud-status-badge" style={{ "--sc": "#39ff14", "--sc-bg": "rgba(57,255,20,0.1)", "--sc-border": "rgba(57,255,20,0.25)" }}>
                <span className="ud-badge-dot" /> CLOCKED IN
              </span>
            )}
            {todayRecord?.check_in && todayRecord?.check_out && (
              <span className="ud-status-badge" style={{ "--sc": "#94a3b8", "--sc-bg": "rgba(148,163,184,0.1)", "--sc-border": "rgba(148,163,184,0.2)" }}>
                <span className="ud-badge-dot" /> COMPLETED
              </span>
            )}
            {!todayRecord?.check_in && (
              <span className="ud-status-badge" style={{ "--sc": "#facc15", "--sc-bg": "rgba(250,204,21,0.1)", "--sc-border": "rgba(250,204,21,0.25)" }}>
                <span className="ud-badge-dot" /> NOT CLOCKED IN
              </span>
            )}
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

        <div className="ud-att-grid">
          <div className="ud-att-metric">
            <div className="ud-att-metric-label">// check.in</div>
            <div className="ud-att-metric-val">{fmtTime(todayRecord?.check_in)}</div>
          </div>
          <div className="ud-att-metric-box ud-att-metric">
            <div className="ud-att-metric-label">// check.out</div>
            <div className="ud-att-metric-val">{fmtTime(todayRecord?.check_out)}</div>
          </div>
          <div className="ud-att-metric">
            <div className="ud-att-metric-label">// elapsed.time</div>
            <div className="ud-att-metric-val" style={{ color: todayRecord?.check_in && !todayRecord?.check_out ? "#39ff14" : "#facc15" }}>
              {elapsed}
            </div>
          </div>
        </div>

        <div className="ud-att-bar">
          <input
            type="text"
            className="ud-att-input"
            placeholder="Work note / daily focus (optional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={actionLoading || (todayRecord?.check_in && todayRecord?.check_out)}
          />

          {!todayRecord?.check_in && (
            <button
              className="ud-att-btn-in"
              onClick={handleClockIn}
              disabled={actionLoading}
            >
              {actionLoading ? "PROCESSING..." : "CLOCK IN"}
            </button>
          )}

          {todayRecord?.check_in && !todayRecord?.check_out && (
            <button
              className="ud-att-btn-out"
              onClick={handleClockOut}
              disabled={actionLoading}
            >
              {actionLoading ? "PROCESSING..." : "CLOCK OUT"}
            </button>
          )}

          {todayRecord?.check_in && todayRecord?.check_out && (
            <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)" }}>
              // daily work hours logged
            </span>
          )}
        </div>
      </div>

      {/* ── Attendance History Log ── */}
      <div className="ud-detail">
        <div className="ud-section-title">
          <span>// ATTENDANCE LOG HISTORY</span>
        </div>

        {loading ? (
          <div style={{ color: "#facc15", padding: "18px 0", fontSize: "0.72rem" }}>
            // LOADING ATTENDANCE LOGS...
          </div>
        ) : history.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.25)", padding: "18px 0", fontSize: "0.72rem" }}>
            No attendance records found yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="ud-att-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>CHECK IN</th>
                  <th>CHECK OUT</th>
                  <th>STATUS</th>
                  <th>NOTES</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td style={{ color: "#fff", fontWeight: 700 }}>{fmtDate(row.date)}</td>
                    <td>{fmtTime(row.check_in)}</td>
                    <td>{fmtTime(row.check_out)}</td>
                    <td>
                      <span
                        style={{
                          color: row.status === "PRESENT" ? "#39ff14" : "#facc15",
                          fontWeight: 700,
                        }}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td style={{ color: "rgba(255,255,255,0.4)" }}>{row.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
