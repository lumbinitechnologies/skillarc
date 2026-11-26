import React, { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useAuthGuard from "../hooks/useAuthGuard";
import AttendanceView from "./AttendanceView";
import TimesheetsView from "./TimesheetsView";
import LeavesView from "./LeavesView";
import TasksView from "./TasksView";

const STATUS_CONFIG = {
  pending:     { label: "Pending",     color: "#94a3b8", bg: "rgba(148,163,184,0.1)",  border: "rgba(148,163,184,0.2)",  glow: "rgba(148,163,184,0.04)" },
  shortlisted: { label: "Shortlisted", color: "#facc15", bg: "rgba(250,204,21,0.1)",   border: "rgba(250,204,21,0.25)",  glow: "rgba(250,204,21,0.06)"  },
  selected:    { label: "Selected",    color: "#39ff14", bg: "rgba(57,255,20,0.1)",    border: "rgba(57,255,20,0.25)",   glow: "rgba(57,255,20,0.06)"   },
  rejected:    { label: "Rejected",    color: "#f87171", bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.25)", glow: "rgba(248,113,113,0.04)" },
};

const STATUS_MESSAGES = {
  pending:     "Your application is under review. We'll update you soon.",
  shortlisted: "Great news — you've been shortlisted. Expect a call from us.",
  selected:    "Congratulations! You've been selected for the internship.",
  rejected:    "Thank you for applying. We'll keep your profile for future opportunities.",
};

const DOC_META = {
  offer_letter: { label: "Offer Letter",               icon: "📄", color: "#facc15", bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.2)"  },
  certificate:  { label: "Certificate of Appreciation", icon: "🏅", color: "#39ff14", bg: "rgba(57,255,20,0.08)",  border: "rgba(57,255,20,0.2)"   },
};

const UserDashboard = () => {
  const navigate = useNavigate();
  const { session, user, loading: authLoading } = useAuth();

  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState(null);
  const [activeApp, setActiveApp] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("applications");
  const [internData, setInternData] = useState(null);

  useAuthGuard("/Login");

  useEffect(() => {
    if (!user) return;
    setAppsLoading(true);
    fetchApplications();
    fetchDocuments();
  }, [user]);

  const fetchApplications = async () => {
    setAppsError(null);
    try {
      const { data, error } = await supabase
        .from("applications").select("*")
        .eq("email", user.email).order("created_at", { ascending: false });
      if (error) { setApplications([]); setActiveApp(null); setAppsError(error.message); }
      else { setApplications(data || []); if (data?.length > 0) setActiveApp(data[0]); }
    } catch (e) { setApplications([]); setActiveApp(null); setAppsError(e.message); }
    finally { setAppsLoading(false); }
  };

  const fetchDocuments = async () => {
    if (!user) return;
    setDocsLoading(true);
    try {
      const { data: intern, error: internError } = await supabase
        .from("interns")
        .select("id, intern_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (internError || !intern) { setDocuments([]); return; }

      setInternData(intern);

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("intern_id", intern.id)
        .order("created_at", { ascending: false });

      setDocuments(error ? [] : data || []);
    } catch { setDocuments([]); }
    finally { setDocsLoading(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  const avatarLetter = user?.email?.[0]?.toUpperCase() || "U";
  const latestStatus = applications[0]?.status || null;
  const latestS = STATUS_CONFIG[latestStatus] || null;
  const loading = authLoading || appsLoading;

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100vh", color:"#facc15", fontFamily:"'Share Tech Mono', monospace", fontSize:13, letterSpacing:"0.15em" }}>
      // INITIALIZING DASHBOARD...
    </div>
  );

  if (!session) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

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

        @keyframes fadeUp {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }

        @keyframes statusPulse {
          0%, 100% { box-shadow: 0 0 6px var(--sc); }
          50%       { box-shadow: 0 0 14px var(--sc), 0 0 28px var(--sc); }
        }

        @keyframes internIdGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(57,255,20,0.3); }
          50%       { box-shadow: 0 0 20px rgba(57,255,20,0.6), 0 0 40px rgba(57,255,20,0.2); }
        }

        .ud {
          min-height: 100vh;
          background: transparent;
          color: #e2e8f0;
          font-family: 'Share Tech Mono', monospace;
          padding: clamp(5rem, 10vw, 7rem) 0 4rem;
          position: relative; overflow-x: hidden;
        }

        .ud::before {
          content: '';
          position: fixed; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(57,255,20,0.3), transparent);
          animation: scanline 6s linear infinite;
          pointer-events: none; z-index: 200;
        }

        .ud-grid {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 20px;
          max-width: 1200px; margin: 0 auto;
          padding: 0 clamp(1rem, 4vw, 2.5rem);
        }

        .ud-sidebar {
          display: flex; flex-direction: column; gap: 14px;
          position: sticky; top: 90px; align-self: start;
        }

        .ud-profile-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(250,204,21,0.15);
          border-radius: 14px; padding: 22px 18px; text-align: center;
          position: relative; overflow: hidden;
          animation: fadeUp 0.4s ease forwards;
        }

        .ud-profile-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, #facc15, transparent);
          opacity: 0.5;
        }

        .ud-profile-card::after {
          content: '';
          position: absolute; top: -30px; left: 50%; transform: translateX(-50%);
          width: 120px; height: 80px;
          background: radial-gradient(ellipse, rgba(250,204,21,0.08), transparent 70%);
          pointer-events: none;
        }

        .ud-avatar {
          width: 60px; height: 60px; border-radius: 50%;
          background: #facc15; color: #000;
          font-family: 'Orbitron', monospace;
          font-size: 1.4rem; font-weight: 900;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 14px;
          box-shadow: 0 0 24px rgba(250,204,21,0.35);
          position: relative; z-index: 1;
        }

        .ud-profile-name {
          font-family: 'Orbitron', monospace;
          font-size: 0.8rem; font-weight: 700; color: #fff;
          letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px;
        }

        .ud-profile-email {
          font-size: 0.62rem; color: rgba(255,255,255,0.25);
          word-break: break-all; margin-bottom: 16px;
        }

        .ud-profile-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(250,204,21,0.2), transparent);
          margin: 0 -18px 14px;
        }

        .ud-profile-stat {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 8px;
        }

        .ud-profile-stat-label { color: rgba(255,255,255,0.2); font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase; }
        .ud-profile-stat-val   { font-weight: 700; font-size: 0.75rem; }

        /* ── Intern ID Card ── */
        .ud-intern-id-card {
          background: rgba(57,255,20,0.03);
          border: 1px solid rgba(57,255,20,0.2);
          border-radius: 14px; padding: 18px;
          position: relative; overflow: hidden;
          animation: fadeUp 0.4s ease 0.05s forwards; opacity: 0;
          text-align: center;
        }

        .ud-intern-id-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, #39ff14, transparent);
          opacity: 0.4;
        }

        .ud-intern-id-label {
          font-size: 0.58rem; color: rgba(57,255,20,0.5);
          text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 10px;
        }

        .ud-intern-id-value {
          font-family: 'Orbitron', monospace;
          font-size: 1rem; font-weight: 900; color: #39ff14;
          letter-spacing: 2px;
          animation: internIdGlow 3s ease-in-out infinite;
        }

        .ud-nav {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px; padding: 10px;
          display: flex; flex-direction: column; gap: 3px;
          animation: fadeUp 0.4s ease 0.1s forwards; opacity: 0;
        }

        .ud-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 8px;
          font-size: 0.72rem; letter-spacing: 0.06em;
          color: rgba(255,255,255,0.3);
          cursor: pointer; border: 1px solid transparent;
          background: none; width: 100%; text-align: left;
          transition: all 0.2s; font-family: 'Share Tech Mono', monospace;
          text-transform: uppercase;
        }

        .ud-nav-item:hover { background: rgba(255,255,255,0.04); color: #fff; }

        .ud-nav-item.active {
          background: rgba(250,204,21,0.07);
          color: #facc15; border-color: rgba(250,204,21,0.2);
        }

        .ud-nav-badge {
          margin-left: auto;
          background: rgba(57,255,20,0.12); color: #39ff14;
          font-size: 0.6rem; font-weight: 700;
          padding: 2px 7px; border-radius: 999px;
          border: 1px solid rgba(57,255,20,0.25);
        }

        .ud-logout-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 8px;
          font-size: 0.72rem; letter-spacing: 0.06em; color: rgba(248,113,113,0.55);
          cursor: pointer; border: 1px solid transparent;
          background: none; width: 100%; text-align: left;
          transition: all 0.2s; font-family: 'Share Tech Mono', monospace;
          text-transform: uppercase; margin-top: 4px;
        }

        .ud-logout-btn:hover {
          background: rgba(248,113,113,0.06);
          border-color: rgba(248,113,113,0.2);
          color: #f87171;
        }

        .ud-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

        .ud-welcome {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(250,204,21,0.15);
          border-radius: 14px; padding: 22px 26px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; position: relative; overflow: hidden;
          animation: fadeUp 0.4s ease 0.15s forwards; opacity: 0;
        }

        .ud-welcome::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, #facc15, rgba(57,255,20,0.5), transparent);
          opacity: 0.4;
        }

        .ud-welcome::after {
          content: '';
          position: absolute; right: -30px; top: -30px;
          width: 160px; height: 160px; border-radius: 50%;
          background: radial-gradient(circle, rgba(250,204,21,0.05), transparent 70%);
          pointer-events: none;
        }

        .ud-welcome-tag { font-size: 0.62rem; color: #39ff14; letter-spacing: 0.18em; margin-bottom: 6px; }

        .ud-welcome-title {
          font-family: 'Orbitron', monospace;
          font-size: clamp(1rem, 2.2vw, 1.4rem);
          font-weight: 900; color: #fff;
          letter-spacing: 1px; text-transform: uppercase;
          animation: glitchBlink 8s infinite;
        }

        .ud-welcome-sub { font-size: 0.7rem; color: rgba(255,255,255,0.3); margin-top: 5px; }

        .ud-apply-btn {
          padding: 10px 22px; background: #facc15; color: #000;
          font-family: 'Orbitron', monospace; font-weight: 700;
          font-size: 0.72rem; letter-spacing: 2px; text-transform: uppercase;
          border-radius: 6px; border: none; cursor: pointer;
          white-space: nowrap; flex-shrink: 0; transition: all 0.25s;
        }
        .ud-apply-btn:hover { background: #fde047; transform: translateY(-2px); box-shadow: 0 6px 24px rgba(250,204,21,0.4); }

        .ud-status-banner {
          border-radius: 12px; padding: 18px 22px;
          display: flex; align-items: center; gap: 14px;
          background: var(--s-glow); border: 1px solid var(--s-border);
          animation: fadeUp 0.4s ease 0.2s forwards; opacity: 0;
          position: relative; overflow: hidden;
        }

        .ud-status-banner::before {
          content: '';
          position: absolute; left: 0; top: 0; bottom: 0;
          width: 3px; background: var(--s-color);
          box-shadow: 0 0 10px var(--s-color);
        }

        .ud-status-icon {
          width: 40px; height: 40px; border-radius: 10px;
          background: var(--s-bg);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }

        .ud-status-banner-label {
          font-size: 0.6rem; color: var(--s-color);
          letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 3px;
        }

        .ud-status-banner-msg { font-size: 0.75rem; color: rgba(255,255,255,0.5); }

        .ud-status-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 999px;
          font-size: 0.6rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase;
          background: var(--sc-bg, rgba(148,163,184,0.1));
          color: var(--sc, #94a3b8);
          border: 1px solid var(--sc-border, rgba(148,163,184,0.2));
          white-space: nowrap; flex-shrink: 0;
        }

        .ud-badge-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--sc, #94a3b8);
          box-shadow: 0 0 5px var(--sc, #94a3b8);
          animation: statusPulse 2s ease-in-out infinite;
        }

        .ud-section-title {
          font-size: 0.6rem; color: rgba(57,255,20,0.45);
          text-transform: uppercase; letter-spacing: 0.2em;
          margin-bottom: 12px;
          display: flex; align-items: center; gap: 10px;
        }

        .ud-section-title::after {
          content: ''; flex: 1; height: 1px;
          background: linear-gradient(90deg, rgba(57,255,20,0.15), transparent);
        }

        .ud-app-card {
          background: rgba(255,255,255,0.015);
          border: 1px solid var(--ac-border);
          border-radius: 10px; padding: 16px 20px;
          margin-bottom: 10px; cursor: pointer; transition: all 0.25s;
          position: relative; overflow: hidden;
        }

        .ud-app-card::before {
          content: '';
          position: absolute; left: 0; top: 0; bottom: 0;
          width: 3px; background: var(--ac-color);
          box-shadow: 0 0 8px var(--ac-color);
        }

        .ud-app-card:hover { border-color: var(--ac-color); background: rgba(255,255,255,0.03); transform: translateX(3px); }
        .ud-app-card.active-card { border-color: var(--ac-color); background: rgba(255,255,255,0.025); }

        .ud-app-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 10px; }
        .ud-app-card-university { font-size: 0.6rem; color: rgba(57,255,20,0.4); text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 4px; }
        .ud-app-card-name { font-family: 'Orbitron', monospace; font-size: 0.85rem; font-weight: 700; color: #fff; letter-spacing: 0.5px; }
        .ud-app-card-skills { font-size: 0.65rem; color: rgba(255,255,255,0.25); margin-top: 6px; }
        .ud-app-card-date  { font-size: 0.62rem; color: rgba(255,255,255,0.15); margin-top: 5px; }

        .ud-detail {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(250,204,21,0.12);
          border-radius: 14px; padding: 22px;
          animation: fadeUp 0.35s ease forwards;
        }

        .ud-detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; gap: 12px; flex-wrap: wrap; }
        .ud-detail-title { font-family: 'Orbitron', monospace; font-size: 0.9rem; font-weight: 700; color: #fff; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
        .ud-detail-sub { font-size: 0.62rem; color: rgba(255,255,255,0.25); }

        .ud-timeline { display: flex; align-items: center; margin-bottom: 18px; overflow-x: auto; padding-bottom: 4px; }

        .ud-tl-step { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 60px; position: relative; }

        .ud-tl-step:not(:last-child)::after {
          content: ''; position: absolute; top: 11px;
          left: calc(50% + 12px); right: calc(-50% + 12px);
          height: 1px; background: var(--tl-line, rgba(255,255,255,0.07)); z-index: 0;
        }

        .ud-tl-dot {
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--tl-dotbg, rgba(255,255,255,0.05));
          border: 1px solid var(--tl-dotborder, rgba(255,255,255,0.1));
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; position: relative; z-index: 1;
          color: var(--tl-dotcolor, rgba(255,255,255,0.3));
        }

        .ud-tl-label { font-size: 0.58rem; color: var(--tl-labelcolor, rgba(255,255,255,0.2)); margin-top: 5px; text-align: center; text-transform: uppercase; letter-spacing: 0.07em; }

        .ud-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }

        .ud-detail-field {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px; padding: 10px 12px;
        }

        .ud-detail-field-label { font-size: 0.58rem; color: rgba(57,255,20,0.4); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 5px; }
        .ud-detail-field-val   { font-size: 0.75rem; color: rgba(255,255,255,0.55); word-break: break-word; }

        .ud-detail-motivation { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; }
        .ud-detail-motivation-label { font-size: 0.58rem; color: rgba(57,255,20,0.4); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 8px; }
        .ud-detail-motivation-text  { font-size: 0.72rem; color: rgba(255,255,255,0.4); line-height: 1.75; }

        .ud-resume-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px;
          background: rgba(250,204,21,0.07);
          border: 1px solid rgba(250,204,21,0.25);
          border-radius: 6px; color: #facc15;
          font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase;
          text-decoration: none; transition: all 0.2s;
        }
        .ud-resume-btn:hover { background: rgba(250,204,21,0.14); border-color: #facc15; }

        .ud-docs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }

        .ud-doc-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--doc-border);
          border-radius: 12px; padding: 18px;
          position: relative; overflow: hidden; transition: all 0.25s;
        }

        .ud-doc-card::before {
          content: '';
          position: absolute; left: 0; top: 0; bottom: 0;
          width: 3px; background: var(--doc-color);
          box-shadow: 0 0 8px var(--doc-color);
        }

        .ud-doc-card:hover { background: rgba(255,255,255,0.035); }

        .ud-doc-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--doc-bg); display: flex; align-items: center; justify-content: center; font-size: 18px; margin-bottom: 12px; }
        .ud-doc-label { font-family: 'Orbitron', monospace; font-size: 0.72rem; font-weight: 700; color: #fff; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
        .ud-doc-date  { font-size: 0.6rem; color: rgba(255,255,255,0.2); margin-bottom: 12px; }

        .ud-doc-download {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; background: var(--doc-bg); border: 1px solid var(--doc-border);
          border-radius: 6px; color: var(--doc-color);
          font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase;
          text-decoration: none; transition: all 0.2s;
        }
        .ud-doc-download:hover { filter: brightness(1.3); }

        .ud-docs-empty { background: rgba(255,255,255,0.015); border: 1px dashed rgba(57,255,20,0.12); border-radius: 12px; padding: 36px 24px; text-align: center; }
        .ud-docs-empty-icon { font-size: 2rem; opacity: 0.2; margin-bottom: 10px; }
        .ud-docs-empty-text { font-size: 0.68rem; color: rgba(255,255,255,0.2); line-height: 1.7; }

        .ud-empty { background: rgba(255,255,255,0.015); border: 1px dashed rgba(250,204,21,0.12); border-radius: 14px; padding: 48px 24px; text-align: center; }
        .ud-empty-icon { font-size: 2.5rem; opacity: 0.2; margin-bottom: 12px; }
        .ud-empty-text { font-size: 0.7rem; color: rgba(255,255,255,0.2); margin-bottom: 20px; }

        .ud-error {
          background: rgba(248,113,113,0.05);
          border: 1px solid rgba(248,113,113,0.2);
          border-left: 3px solid #f87171;
          border-radius: 10px; padding: 14px 16px;
          color: #fca5a5; font-size: 0.68rem; letter-spacing: 0.03em;
        }

        @media (max-width: 900px) {
          .ud-grid { grid-template-columns: 1fr; }
          .ud-sidebar { position: static; flex-direction: row; flex-wrap: wrap; }
          .ud-profile-card { flex: 1; min-width: 200px; }
          .ud-intern-id-card { flex: 1; min-width: 200px; }
          .ud-nav { flex: 1; min-width: 200px; flex-direction: row; flex-wrap: wrap; }
          .ud-detail-grid { grid-template-columns: 1fr; }
          .ud-docs-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="ud">
        <div className="ud-grid">

          {/* ── Sidebar ── */}
          <aside className="ud-sidebar">

            <div className="ud-profile-card">
              <div className="ud-avatar">{avatarLetter}</div>
              <div className="ud-profile-name">
                {user?.user_metadata?.full_name || applications[0]?.name || user?.email?.split("@")[0] || "USER"}
              </div>
              <div className="ud-profile-email">{user?.email}</div>
              <div className="ud-profile-divider" />
              {[
                ["Applications", applications.length, "#facc15"],
                ["Documents",    documents.length,    "#39ff14"],
                ["Status",       latestS?.label || "—", latestS?.color || "rgba(255,255,255,0.2)"],
                ["Member Since", fmt(user?.created_at), "rgba(255,255,255,0.4)"],
              ].map(([label, val, color]) => (
                <div key={label} className="ud-profile-stat">
                  <span className="ud-profile-stat-label">{label}</span>
                  <span className="ud-profile-stat-val" style={{ color }}>{val}</span>
                </div>
              ))}
            </div>

            {/* ── Intern ID Card ── */}
            {internData?.intern_id && (
              <div className="ud-intern-id-card">
                <div className="ud-intern-id-label">// intern.id</div>
                <div className="ud-intern-id-value">{internData.intern_id}</div>
              </div>
            )}

            <div className="ud-nav">
              {[
                { tab: "applications", icon: "📋", label: "MY APPLICATIONS" },
                { tab: "documents", icon: "📁", label: "MY DOCUMENTS", badge: documents.length > 0 ? documents.length : null },
              ].map(({ tab, icon, label, badge }) => (
                <button
                  key={tab}
                  className={"ud-nav-item" + (activeTab === tab ? " active" : "")}
                  onClick={() => setActiveTab(tab)}
                >
                  <span>{icon}</span> {label}
                  {badge && <span className="ud-nav-badge">{badge}</span>}
                </button>
              ))}

              {/* Workforce & Time Tracking — only visible to interns */}
              {internData?.id && (
                <>
                  <button
                    className={"ud-nav-item" + (activeTab === "attendance" ? " active" : "")}
                    onClick={() => setActiveTab("attendance")}
                  >
                    <span>⏱️</span> ATTENDANCE
                  </button>
                  <button
                    className={"ud-nav-item" + (activeTab === "timesheets" ? " active" : "")}
                    onClick={() => setActiveTab("timesheets")}
                  >
                    <span>📅</span> TIMESHEETS
                  </button>
                  <button
                    className={"ud-nav-item" + (activeTab === "leaves" ? " active" : "")}
                    onClick={() => setActiveTab("leaves")}
                  >
                    <span>🏖️</span> LEAVES
                  </button>
                  <button
                    className={"ud-nav-item" + (activeTab === "tasks" ? " active" : "")}
                    onClick={() => setActiveTab("tasks")}
                  >
                    <span>🎯</span> MY TASKS
                  </button>
                </>
              )}

              {/* My Blogs — only visible to interns */}
              {internData?.intern_id && (
                <button
                  className={"ud-nav-item" + (activeTab === "blogs" ? " active" : "")}
                  onClick={() => setActiveTab("blogs")}
                >
                  <span>📝</span> MY BLOGS
                </button>
              )}

              <button className="ud-nav-item" onClick={() => navigate("/Career")}>
                <span>🎯</span> INTERNSHIPS
              </button>
              <button className="ud-nav-item" onClick={() => navigate("/")}>
                <span>🏠</span> HOME
              </button>
              <button className="ud-logout-btn" onClick={handleLogout}>
                <span>↩</span> LOGOUT
              </button>
            </div>

          </aside>

          {/* ── Main ── */}
          <main className="ud-main">

            {appsError && (
              <div className="ud-error">
                // could not load dashboard data
                <div style={{ marginTop: 8, color: "#f87171" }}>{appsError}</div>
              </div>
            )}

            {/* Welcome */}
            <div className="ud-welcome">
              <div>
                <div className="ud-welcome-tag">// welcome back</div>
                <div className="ud-welcome-title">
                  HELLO, {(user?.user_metadata?.full_name?.split(" ")[0] ||
                    applications[0]?.name?.split(" ")[0] ||
                    user?.email?.split("@")[0] ||
                    "USER").toUpperCase()} 👋
                </div>
                <div className="ud-welcome-sub">
                  {internData?.intern_id
                    ? `// intern id: ${internData.intern_id}`
                    : applications.length === 0
                    ? "// no applications on record yet"
                    : `// ${applications.length} application${applications.length > 1 ? "s" : ""} on record`}
                </div>
              </div>
              {applications.length === 0 && (
                <button className="ud-apply-btn" onClick={() => navigate("/Career")}>
                  APPLY NOW →
                </button>
              )}
            </div>

            {/* Status banner */}
            {latestS && (
              <div
                className="ud-status-banner"
                style={{ "--s-color": latestS.color, "--s-bg": latestS.bg, "--s-border": latestS.border, "--s-glow": latestS.glow }}
              >
                <div className="ud-status-icon">
                  {latestStatus === "pending"     && "⏳"}
                  {latestStatus === "shortlisted" && "⭐"}
                  {latestStatus === "selected"    && "🎉"}
                  {latestStatus === "rejected"    && "📩"}
                </div>
                <div>
                  <div className="ud-status-banner-label">// latest application status</div>
                  <div className="ud-status-banner-msg">{STATUS_MESSAGES[latestStatus]}</div>
                </div>
                <span
                  className="ud-status-badge"
                  style={{ "--sc": latestS.color, "--sc-bg": latestS.bg, "--sc-border": latestS.border }}
                >
                  <span className="ud-badge-dot" />
                  {latestS.label}
                </span>
              </div>
            )}

            {/* ── APPLICATIONS TAB ── */}
            {activeTab === "applications" && (
              <>
                {applications.length === 0 ? (
                  <div className="ud-empty">
                    <div className="ud-empty-icon">📄</div>
                    <div className="ud-empty-text">// no applications found</div>
                    <button className="ud-apply-btn" onClick={() => navigate("/Career")}>
                      BROWSE INTERNSHIPS
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="ud-section-title">// applications.log</div>
                      {applications.map((app) => {
                        const s = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
                        return (
                          <div
                            key={app.id}
                            className={"ud-app-card" + (activeApp?.id === app.id ? " active-card" : "")}
                            style={{ "--ac-color": s.color, "--ac-border": s.border }}
                            onClick={() => setActiveApp(app)}
                          >
                            <div className="ud-app-card-top">
                              <div>
                                <div className="ud-app-card-university">{app.university || "—"}</div>
                                <div className="ud-app-card-name">{app.name || "—"}</div>
                              </div>
                              <span className="ud-status-badge" style={{ "--sc": s.color, "--sc-bg": s.bg, "--sc-border": s.border }}>
                                <span className="ud-badge-dot" />{s.label}
                              </span>
                            </div>
                            {app.skills && <div className="ud-app-card-skills">// {app.skills}</div>}
                            <div className="ud-app-card-date">applied {fmt(app.created_at)}</div>
                          </div>
                        );
                      })}
                    </div>

                    {activeApp && (() => {
                      const s = STATUS_CONFIG[activeApp.status] || STATUS_CONFIG.pending;
                      const steps = ["pending", "shortlisted", "selected"];
                      const currentIdx = steps.indexOf(activeApp.status);
                      return (
                        <div className="ud-detail">
                          <div className="ud-section-title">// application.details</div>

                          <div className="ud-timeline">
                            {steps.map((step, i) => {
                              const isDone = activeApp.status !== "rejected" && i <= currentIdx;
                              return (
                                <div
                                  key={step}
                                  className="ud-tl-step"
                                  style={{
                                    "--tl-dotbg":      isDone ? s.color : "rgba(255,255,255,0.04)",
                                    "--tl-dotborder":  isDone ? s.color : "rgba(255,255,255,0.08)",
                                    "--tl-dotcolor":   isDone ? "#000"  : "rgba(255,255,255,0.2)",
                                    "--tl-line":       isDone && i < currentIdx ? s.color : "rgba(255,255,255,0.07)",
                                    "--tl-labelcolor": isDone ? s.color : "rgba(255,255,255,0.2)",
                                  }}
                                >
                                  <div className="ud-tl-dot">{isDone ? "✓" : ""}</div>
                                  <div className="ud-tl-label">{step === "pending" ? "applied" : step}</div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="ud-detail-header">
                            <div>
                              <div className="ud-detail-title">{activeApp.name}</div>
                              <div className="ud-detail-sub">{activeApp.email}</div>
                            </div>
                            <span className="ud-status-badge" style={{ "--sc": s.color, "--sc-bg": s.bg, "--sc-border": s.border }}>
                              <span className="ud-badge-dot" />{s.label}
                            </span>
                          </div>

                          <div className="ud-detail-grid">
                            {[
                              ["University", activeApp.university],
                              ["Degree",     activeApp.degree],
                              ["Year",       activeApp.year],
                              ["Phone",      activeApp.phone],
                              ["Skills",     activeApp.skills],
                              ["Applied On", fmt(activeApp.created_at)],
                            ].map(([label, val]) => (
                              <div key={label} className="ud-detail-field">
                                <div className="ud-detail-field-label">{label}</div>
                                <div className="ud-detail-field-val">{val || "—"}</div>
                              </div>
                            ))}
                          </div>

                          {activeApp.motivation && (
                            <div className="ud-detail-motivation">
                              <div className="ud-detail-motivation-label">// why this internship?</div>
                              <div className="ud-detail-motivation-text">{activeApp.motivation}</div>
                            </div>
                          )}

                          {activeApp.resume_url && (
                            <a href={activeApp.resume_url} target="_blank" rel="noopener noreferrer" className="ud-resume-btn">
                              ↗ VIEW RESUME (PDF)
                            </a>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </>
            )}

            {/* ── DOCUMENTS TAB ── */}
            {activeTab === "documents" && (
              <div>
                <div className="ud-section-title">// documents.vault</div>
                {docsLoading ? (
                  <div style={{ fontSize: "0.72rem", color: "rgba(57,255,20,0.4)", padding: "24px 0", letterSpacing: "0.12em" }}>
                    // LOADING DOCUMENTS...
                  </div>
                ) : documents.length === 0 ? (
                  <div className="ud-docs-empty">
                    <div className="ud-docs-empty-icon">📁</div>
                    <div className="ud-docs-empty-text">
                      // no documents available yet
                      <span style={{ display: "block", marginTop: 6, color: "rgba(255,255,255,0.12)" }}>
                        documents will appear here once the admin generates them for you.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="ud-docs-grid">
                    {documents.map((doc) => {
                      const meta = DOC_META[doc.document_type] || {
                        label: doc.document_type?.replace(/_/g, " ") || "Document",
                        icon: "📄", color: "#fff",
                        bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)",
                      };
                      return (
                        <div
                          key={doc.id}
                          className="ud-doc-card"
                          style={{ "--doc-color": meta.color, "--doc-bg": meta.bg, "--doc-border": meta.border }}
                        >
                          <div className="ud-doc-icon">{meta.icon}</div>
                          <div className="ud-doc-label">{meta.label}</div>
                          <div className="ud-doc-date">{doc.created_at ? `issued ${fmt(doc.created_at)}` : "recently issued"}</div>
                          {doc.document_type === "certificate" && doc.certificate_id && (
                            <a
                              href={`/verify-certificate/${encodeURIComponent(doc.certificate_id)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ud-doc-date"
                              style={{ color: "#facc15", textDecoration: "none" }}
                            >
                              verify {doc.certificate_id}
                            </a>
                          )}
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="ud-doc-download">
                            ↗ VIEW & DOWNLOAD
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── ATTENDANCE TAB ── */}
            {activeTab === "attendance" && (
              <AttendanceView internId={internData?.id} />
            )}

            {/* ── TIMESHEETS TAB ── */}
            {activeTab === "timesheets" && (
              <TimesheetsView internId={internData?.id} />
            )}

            {/* ── LEAVES TAB ── */}
            {activeTab === "leaves" && (
              <LeavesView internId={internData?.id} />
            )}

            {/* ── TASKS TAB ── */}
            {activeTab === "tasks" && (
              <TasksView internId={internData?.id} />
            )}

            {/* ── BLOGS TAB ── */}
            {activeTab === "blogs" && (
              <div>
                <div className="ud-section-title">// blogs.manager</div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(250,204,21,0.12)",
                    borderRadius: "14px",
                    padding: "22px",
                  }}
                >
                  <div
                    style={{
                      color: "#fff",
                      marginBottom: "16px",
                      fontFamily: "'Orbitron', monospace",
                      letterSpacing: "1px",
                    }}
                  >
                    Manage your blog articles
                  </div>
                  <button className="ud-apply-btn" onClick={() => navigate("/write-blog")}>
                    WRITE BLOG →
                  </button>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </>
  );
};

export default UserDashboard;