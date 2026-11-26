import React, { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import { useNavigate } from "react-router-dom";
import useAuthGuard from "../hooks/useAuthGuard";

const STATUS_CONFIG = {
  pending:     { label: "Pending",     color: "#94a3b8", bg: "rgba(148,163,184,0.1)",  border: "rgba(148,163,184,0.2)",  glow: "rgba(148,163,184,0.04)" },
  shortlisted: { label: "Shortlisted", color: "#facc15", bg: "rgba(250,204,21,0.1)",   border: "rgba(250,204,21,0.25)",  glow: "rgba(250,204,21,0.05)"  },
  selected:    { label: "Selected",    color: "#39ff14", bg: "rgba(57,255,20,0.1)",    border: "rgba(57,255,20,0.25)",   glow: "rgba(57,255,20,0.05)"   },
  rejected:    { label: "Rejected",    color: "#f87171", bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.25)", glow: "rgba(248,113,113,0.04)" },
};

const STATUS_MESSAGES = {
  pending:     "Your application is under review. We'll update you soon.",
  shortlisted: "You've been shortlisted. Expect to hear from us.",
  selected:    "Congratulations — you've been selected for the internship.",
  rejected:    "Thank you for applying. We'll keep your profile for future openings.",
};

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState(null);
  const navigate = useNavigate();

  const { user, loading: authLoading } = useAuthGuard();

  useEffect(() => {
    if (!user) return;
    setAppsLoading(true);
    fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    setAppsError(null);
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("email", user.email)
      .order("created_at", { ascending: false });

    if (error) {
      setApplications([]);
      setAppsError(error.message || "Failed to load applications.");
    } else {
      setApplications(data || []);
    }
    setAppsLoading(false);
  };

  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  const loading = authLoading || appsLoading;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700;900&display=swap');

        @keyframes terminalCursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }

        @keyframes glitchBlink {
          0%, 93%, 100% { opacity:1; text-shadow: 0 0 10px #facc15; }
          94%            { opacity:0.2; text-shadow: 4px 0 #facc15; }
          97%            { opacity:0.8; text-shadow: -3px 0 #facc15; }
        }

        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }

        @keyframes fadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }

        .myapp-page {
          min-height: 100vh;
          background: transparent;
          color: #e2e8f0;
          font-family: 'Share Tech Mono', monospace;
          padding: clamp(6rem, 12vw, 9rem) clamp(1rem, 5vw, 3rem) 4rem;
          position: relative;
          overflow-x: hidden;
        }

        .myapp-page::before {
          content: '';
          position: fixed; top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(57,255,20,0.3), transparent);
          animation: scanline 6s linear infinite;
          pointer-events: none; z-index: 100;
        }

        /* ── Header ── */
        .myapp-header {
          max-width: 900px;
          margin: 0 auto 2.5rem;
          animation: fadeUp 0.4s ease forwards;
        }

        .myapp-back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: none; border: none;
          color: rgba(250,204,21,0.35);
          font-size: 0.72rem; font-family: 'Share Tech Mono', monospace;
          cursor: pointer; padding: 0; margin-bottom: 1.5rem;
          letter-spacing: 0.1em; text-transform: uppercase;
          transition: color 0.2s;
        }
        .myapp-back-btn:hover { color: #facc15; }

        /* Terminal top bar */
        .myapp-terminal-bar {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: rgba(57,255,20,0.05);
          border: 1px solid rgba(57,255,20,0.2);
          border-radius: 4px;
          padding: 0.3rem 0.75rem;
          font-size: 0.65rem; color: #39ff14;
          letter-spacing: 0.15em; margin-bottom: 1rem;
        }

        .tbar-dot { width: 6px; height: 6px; border-radius: 50%; }
        .tbar-cursor {
          display: inline-block; width: 7px; height: 11px;
          background: #39ff14; margin-left: 2px;
          animation: terminalCursor 1s step-end infinite;
          vertical-align: middle;
        }

        .myapp-title {
          font-family: 'Orbitron', monospace;
          font-size: clamp(1.5rem, 4vw, 2rem);
          font-weight: 900; color: #fff;
          letter-spacing: 2px; text-transform: uppercase;
          margin-bottom: 0.4rem;
          animation: glitchBlink 7s infinite;
        }

        .myapp-title .yellow { color: #facc15; text-shadow: 0 0 20px rgba(250,204,21,0.4); }

        .myapp-subtitle {
          color: rgba(57,255,20,0.55);
          font-size: 0.72rem; letter-spacing: 0.12em;
        }

        /* ── Loading ── */
        .myapp-loading {
          max-width: 900px; margin: 4rem auto;
          text-align: center; color: #facc15;
          font-size: 0.75rem; letter-spacing: 0.15em;
          animation: flicker 1.2s infinite;
        }

        /* ── Error ── */
        .myapp-error {
          max-width: 900px; margin: 0 auto 18px;
          background: rgba(248,113,113,0.06);
          border: 1px solid rgba(248,113,113,0.25);
          border-left: 3px solid #f87171;
          border-radius: 8px; padding: 14px 16px;
          color: #fca5a5; font-size: 0.72rem; letter-spacing: 0.03em;
        }

        /* ── Empty ── */
        .myapp-empty {
          max-width: 900px; margin: 0 auto;
          background: rgba(255,255,255,0.02);
          border: 1px dashed rgba(250,204,21,0.15);
          border-radius: 14px; padding: 4rem 2rem; text-align: center;
        }

        .myapp-empty-icon { font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.3; }

        .myapp-empty-title {
          font-family: 'Orbitron', monospace;
          font-size: 0.9rem; color: rgba(255,255,255,0.3);
          letter-spacing: 2px; text-transform: uppercase; margin-bottom: 0.5rem;
        }

        .myapp-empty-text { font-size: 0.7rem; color: rgba(57,255,20,0.3); margin-bottom: 1.5rem; }

        .myapp-apply-btn {
          display: inline-block;
          padding: 10px 28px; background: #facc15; color: #000;
          font-family: 'Orbitron', monospace; font-weight: 700;
          font-size: 0.75rem; letter-spacing: 2px; text-transform: uppercase;
          border-radius: 6px; border: none; cursor: pointer; transition: all 0.25s;
        }
        .myapp-apply-btn:hover { background: #fde047; transform: translateY(-2px); box-shadow: 0 6px 24px rgba(250,204,21,0.35); }

        /* ── List ── */
        .myapp-list {
          max-width: 900px; margin: 0 auto;
          display: flex; flex-direction: column; gap: 14px;
        }

        /* ── Card ── */
        .myapp-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--c-border);
          border-radius: 12px; padding: 20px 24px;
          display: grid; grid-template-columns: 1fr auto;
          gap: 16px; align-items: start;
          transition: all 0.3s ease;
          position: relative; overflow: hidden;
          animation: fadeUp 0.4s ease forwards;
          box-shadow: 0 0 24px var(--c-glow);
        }

        /* left accent bar */
        .myapp-card::before {
          content: '';
          position: absolute; left: 0; top: 0; bottom: 0;
          width: 3px; background: var(--c-color);
          box-shadow: 0 0 10px var(--c-color);
        }

        /* green corner glow */
        .myapp-card::after {
          content: '';
          position: absolute; top: 0; right: 0;
          width: 80px; height: 80px;
          background: radial-gradient(circle at top right, rgba(57,255,20,0.05), transparent 70%);
          pointer-events: none;
        }

        .myapp-card:hover {
          border-color: var(--c-color);
          background: rgba(255,255,255,0.035);
          transform: translateX(3px);
          box-shadow: 0 0 32px var(--c-glow);
        }

        .myapp-card-left { min-width: 0; }

        .myapp-card-university {
          font-size: 0.62rem; color: rgba(57,255,20,0.45);
          text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 5px;
        }

        .myapp-card-name {
          font-family: 'Orbitron', monospace;
          font-size: clamp(0.85rem, 1.8vw, 1rem);
          font-weight: 700; color: #fff; margin-bottom: 8px;
          letter-spacing: 1px;
        }

        .myapp-card-skills {
          font-size: 0.68rem; color: rgba(255,255,255,0.3);
          letter-spacing: 0.05em;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 500px; margin-bottom: 10px;
        }

        .myapp-card-date {
          font-size: 0.65rem; color: rgba(255,255,255,0.2);
          letter-spacing: 0.08em;
        }

        /* Status message inside card */
        .myapp-status-msg {
          margin-top: 12px;
          padding: 8px 12px; border-radius: 6px;
          font-size: 0.68rem; line-height: 1.55;
          background: var(--c-bg); color: var(--c-color);
          border: 1px solid var(--c-border);
          letter-spacing: 0.03em;
        }

        /* Right side */
        .myapp-card-right {
          display: flex; flex-direction: column;
          align-items: flex-end; gap: 10px; flex-shrink: 0;
        }

        .myapp-status-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 999px;
          font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase;
          background: var(--c-bg); color: var(--c-color);
          border: 1px solid var(--c-border);
          white-space: nowrap;
        }

        .myapp-status-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--c-color);
          box-shadow: 0 0 6px var(--c-color);
        }

        .myapp-resume-link {
          font-size: 0.65rem; color: rgba(250,204,21,0.45);
          text-decoration: none; display: flex; align-items: center; gap: 4px;
          letter-spacing: 0.08em; transition: color 0.2s;
        }
        .myapp-resume-link:hover { color: #facc15; }

        @media (max-width: 600px) {
          .myapp-card { grid-template-columns: 1fr; }
          .myapp-card-right { flex-direction: row; align-items: center; }
        }
      `}</style>

      <div className="myapp-page">
        <div className="myapp-header">
          <button className="myapp-back-btn" onClick={() => navigate(-1)}>
            ← BACK
          </button>

          <div className="myapp-terminal-bar">
            <span className="tbar-dot" style={{ background: "#ff5f57" }} />
            <span className="tbar-dot" style={{ background: "#facc15" }} />
            <span className="tbar-dot" style={{ background: "#39ff14" }} />
            &nbsp;APPLICATIONS.SYS — USER SESSION
            <span className="tbar-cursor" />
          </div>

          <h1 className="myapp-title">
            MY <span className="yellow">APPLICATIONS</span>
          </h1>
          <p className="myapp-subtitle">
            // {applications.length} application{applications.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {appsError && !loading && (
          <div className="myapp-error">
            // could not load applications
            <div style={{ marginTop: 8, color: "#f87171" }}>{appsError}</div>
          </div>
        )}

        {loading ? (
          <div className="myapp-loading">// LOADING APPLICATIONS...</div>
        ) : applications.length === 0 ? (
          <div className="myapp-empty">
            <div className="myapp-empty-icon">📄</div>
            <div className="myapp-empty-title">No Applications Found</div>
            <div className="myapp-empty-text">// you haven't applied for any internships yet</div>
            <button className="myapp-apply-btn" onClick={() => navigate("/Career")}>
              BROWSE INTERNSHIPS
            </button>
          </div>
        ) : (
          <div className="myapp-list">
            {applications.map((app, i) => {
              const s = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
              return (
                <div
                  key={app.id}
                  className="myapp-card"
                  style={{
                    "--c-color": s.color,
                    "--c-bg": s.bg,
                    "--c-border": s.border,
                    "--c-glow": s.glow,
                    animationDelay: `${i * 0.06}s`,
                    opacity: 0,
                  }}
                >
                  <div className="myapp-card-left">
                    <div className="myapp-card-university">{app.university || "—"}</div>
                    <div className="myapp-card-name">{app.name || "—"}</div>
                    {app.skills && (
                      <div className="myapp-card-skills">// {app.skills}</div>
                    )}
                    <div className="myapp-card-date">📅 Applied {fmt(app.created_at)}</div>
                    <div className="myapp-status-msg">
                      {STATUS_MESSAGES[app.status] || STATUS_MESSAGES.pending}
                    </div>
                  </div>

                  <div className="myapp-card-right">
                    <span className="myapp-status-badge">
                      <span className="myapp-status-dot" />
                      {s.label}
                    </span>
                    {app.resume_url && (
                      <a href={app.resume_url} target="_blank" rel="noopener noreferrer" className="myapp-resume-link">
                        ↗ RESUME
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default MyApplications;