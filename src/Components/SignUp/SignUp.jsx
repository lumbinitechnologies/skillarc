import React, { useState } from "react";
import { supabase } from "../../services/supabase";
import { Link } from "react-router-dom";

const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translate(-50%, -8px) scale(0.97); }
          to   { opacity: 1; transform: translate(-50%, 0)   scale(1);    }
        }
        .toast-wrapper {
          position: fixed;
          top: 5.5rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 99999;
          /* Responsive width: full-bleed on tiny screens, capped on wide ones */
          width: min(calc(100vw - 2rem), 420px);
          animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          pointer-events: auto;
          /* Prevent any overflow from going outside viewport */
          max-width: calc(100vw - 2rem);
          box-sizing: border-box;
        }
        .toast-inner {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-sizing: border-box;
          width: 100%;
        }
        .toast-inner.toast-error {
          border: 1px solid rgba(239,68,68,0.4);
          background: rgba(20,5,5,0.95);
        }
        .toast-inner.toast-success {
          border: 1px solid rgba(57,255,20,0.4);
          background: rgba(5,20,10,0.95);
        }
        .toast-icon {
          font-size: 1.2rem;
          margin-top: 1px;
          flex-shrink: 0;
          line-height: 1;
        }
        .toast-body { flex: 1; min-width: 0; }
        .toast-label {
          font-weight: 700;
          font-size: 0.82rem;
          margin-bottom: 0.2rem;
          font-family: 'Share Tech Mono', monospace;
          letter-spacing: 0.08em;
        }
        .toast-label.toast-error  { color: #f87171; }
        .toast-label.toast-success { color: #39ff14; }
        .toast-message {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.7);
          font-family: 'Share Tech Mono', monospace;
          line-height: 1.5;
          /* Ensure long words/emails don't break layout */
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .toast-close {
          background: none;
          border: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          font-size: 1rem;
          padding: 0;
          line-height: 1;
          flex-shrink: 0;
          transition: color 0.15s;
        }
        .toast-close:hover { color: #fff; }

        /* On very small screens (<360px), tighten padding */
        @media (max-width: 360px) {
          .toast-inner { padding: 0.75rem 1rem; gap: 0.5rem; }
          .toast-label { font-size: 0.75rem; }
          .toast-message { font-size: 0.72rem; }
        }
      `}</style>

      <div className="toast-wrapper">
        <div className={`toast-inner toast-${type}`}>
          <span className="toast-icon">{type === "error" ? "⚠️" : "✅"}</span>
          <div className="toast-body">
            <div className={`toast-label toast-${type}`}>
              {type === "error" ? "// ERROR" : "// SUCCESS"}
            </div>
            <div className="toast-message">{message}</div>
          </div>
          <button
            className="toast-close"
            onClick={onClose}
            aria-label="Dismiss notification"
          >✕</button>
        </div>
      </div>
    </>
  );
};

const PasswordWhisper = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="password-whisper">
      <span className="whisper-eye">⚠</span>
      <span className="whisper-text">
        <span className="whisper-tag">[SYS://NOTICE]</span>{" "}
        No preview. No reveal. Intentional.{" "}
        <span className="whisper-accent">Type with precision.</span>{" "}
        What enters the void... stays in the void.
      </span>
    </div>
  );
};

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "" });

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    if (type === "success") setTimeout(() => setToast({ message: "", type: "" }), 5000);
    else setTimeout(() => setToast({ message: "", type: "" }), 4000);
  };

  const dismissKeyboard = () => {
    if (document.activeElement) document.activeElement.blur();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dismissKeyboard();

    if (password !== confirmPassword) { showToast("Passwords do not match. Please re-enter them.", "error"); return; }
    if (password.length < 6) { showToast("Password must be at least 6 characters long.", "error"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/email-confirmed` },
      });

      if (error) {
        if (error.status === 504 || error.message?.toLowerCase().includes("timeout")) {
          showToast("Server timed out. Please try again in a moment.", "error");
        } else {
          showToast(error.message, "error");
        }
        return;
      }

      if (data?.user && data.user.identities?.length === 0) {
        showToast("An account with this email already exists. Please log in instead.", "error");
        return;
      }

      showToast("Account created! Please check your email and verify your account before logging in.", "success");
    } catch (err) {
      if (err.name === "AbortError" || err.message?.toLowerCase().includes("timeout")) {
        showToast("Request timed out. Please check your connection and try again.", "error");
      } else {
        showToast("Something went wrong. Please try again.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700;900&display=swap');

        @keyframes glitchBlink {
          0%, 94%, 100% { opacity: 1; text-shadow: 0 0 10px #facc15, 0 0 40px rgba(250,204,21,0.2); }
          95%            { opacity: 0.2; text-shadow: 5px 0 #facc15; }
          97%            { opacity: 0.8; text-shadow: -4px 0 #facc15; }
        }
        @keyframes whisperIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes warningPulse {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; text-shadow: 0 0 10px #facc15; }
        }
        @keyframes terminalCursor {
          0%, 100% { opacity: 1; } 50% { opacity: 0; }
        }

        .signup-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: transparent;
          padding: 6rem 1rem;
          box-sizing: border-box;
          overflow-y: auto;
        }

        .signup-form {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 20px;
          box-shadow: 0 8px 20px rgba(255, 255, 255, 0.2);
          padding: 2.5rem 3rem;
          width: 100%;
          max-width: 500px;
          box-sizing: border-box;
          text-align: center;
          font-family: 'Share Tech Mono', monospace;
        }

        .signup-tbar {
          display: flex; align-items: center; gap: 5px;
          margin-bottom: 1.6rem;
          padding: 0.3rem 0.65rem;
          background: rgba(57,255,20,0.06);
          border: 1px solid rgba(57,255,20,0.2);
          border-radius: 5px;
          font-size: 0.56rem; color: #39ff14; letter-spacing: 0.12em;
          text-align: left;
        }
        .signup-tbar-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .signup-tbar-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-left: 3px; }
        .signup-cursor {
          display: inline-block; width: 5px; height: 10px;
          background: #39ff14; margin-left: 3px;
          animation: terminalCursor 1s step-end infinite;
          vertical-align: middle;
        }

        .signup-title {
          font-size: 2rem;
          margin-bottom: 0.4rem;
          color: #facc15;
          font-weight: 900;
          letter-spacing: 3px;
          font-family: 'Orbitron', monospace;
          text-shadow: 0 0 20px rgba(250,204,21,0.5), 0 0 40px rgba(250,204,21,0.2);
          animation: glitchBlink 6s infinite;
        }

        .signup-subtitle {
          color: rgba(57, 255, 20, 0.55);
          font-size: 0.76rem;
          margin-bottom: 1.8rem;
          font-family: 'Share Tech Mono', monospace;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .signup-field {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin: 10px 0;
        }

        .signup-input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(250, 204, 21, 0.3);
          border-radius: 8px;
          font-size: 0.95rem;
          color: #fff;
          box-sizing: border-box;
          transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
          font-family: 'Share Tech Mono', monospace;
          letter-spacing: 0.05em;
          outline: none;
        }
        .signup-input::placeholder { color: rgba(250, 204, 21, 0.28); }
        .signup-input:focus {
          border-color: #facc15;
          box-shadow: 0 0 0 2px rgba(250,204,21,0.12), 0 0 18px rgba(250,204,21,0.1);
          background: rgba(255, 255, 255, 0.1);
        }
        .signup-input.input-error {
          border-color: #ef4444;
          box-shadow: 0 0 0 2px rgba(239,68,68,0.15);
        }

        .error-msg {
          font-size: 0.72rem; color: #f87171; margin-top: 5px;
          font-family: 'Share Tech Mono', monospace; letter-spacing: 0.04em;
        }

        .password-whisper {
          display: flex; align-items: flex-start; gap: 0.55rem;
          margin-top: 0.45rem;
          padding: 0.6rem 0.85rem;
          border-radius: 6px;
          background: rgba(250, 204, 21, 0.06);
          border: 1px solid rgba(250, 204, 21, 0.28);
          border-left: 3px solid #facc15;
          animation: whisperIn 0.35s ease forwards;
          width: 100%; box-sizing: border-box; text-align: left;
          box-shadow: 0 0 20px rgba(250,204,21,0.06);
        }
        .whisper-eye {
          font-size: 0.85rem; flex-shrink: 0; color: #facc15;
          margin-top: 2px; animation: warningPulse 2s infinite;
        }
        .whisper-text {
          font-size: 0.72rem; line-height: 1.6;
          color: rgba(250, 204, 21, 0.6);
          font-family: 'Share Tech Mono', monospace; letter-spacing: 0.03em;
        }
        .whisper-tag { color: #facc15; font-weight: 700; text-shadow: 0 0 8px rgba(250,204,21,0.5); }
        .whisper-accent {
          color: rgba(250, 204, 21, 0.95);
          text-decoration: underline;
          text-decoration-color: rgba(250,204,21,0.4);
          text-underline-offset: 2px;
        }

        .signup-button {
          width: 100%; padding: 14px;
          background: #facc15;
          border: none; border-radius: 8px;
          color: #000; font-weight: 700;
          font-size: 1rem; cursor: pointer; margin-top: 1.5rem;
          transition: all 0.3s ease;
          font-family: 'Orbitron', monospace;
          letter-spacing: 2px; text-transform: uppercase;
        }
        .signup-button:hover {
          background: #fde047;
          transform: translateY(-1px);
          box-shadow: 0 4px 24px rgba(250,204,21,0.45), 0 0 40px rgba(250,204,21,0.15);
        }
        .signup-button:active { transform: translateY(0); }
        .signup-button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

        .signup-footer {
          margin-top: 1.25rem;
          color: rgba(255, 255, 255, 0.35);
          font-size: 0.78rem;
          font-family: 'Share Tech Mono', monospace;
          letter-spacing: 1px;
        }
        .signup-footer a {
          color: #facc15; font-weight: 600; text-decoration: none;
          transition: color 0.2s; text-shadow: 0 0 8px rgba(250,204,21,0.4);
        }
        .signup-footer a:hover { color: #fde047; text-decoration: underline; }

        @media (max-width: 768px) {
          .signup-container { padding: 5rem 1rem; }
          .signup-form { padding: 2rem 1.5rem; }
          .signup-title { font-size: 1.5rem; }
          .signup-button { font-size: 0.9rem; }
        }
      `}</style>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "" })} />

      <div className="signup-container">
        <form onSubmit={handleSubmit} className="signup-form">

          <div className="signup-tbar">
            <span className="signup-tbar-dot" style={{ background: "#ff5f57" }} />
            <span className="signup-tbar-dot" style={{ background: "#facc15" }} />
            <span className="signup-tbar-dot" style={{ background: "#39ff14" }} />
            <span className="signup-tbar-text">AUTH.SYS — NEW USER INIT<span className="signup-cursor" /></span>
          </div>

          <h2 className="signup-title">CREATE ACCOUNT</h2>
          <p className="signup-subtitle">// initialize new user</p>

          <div className="signup-field">
            <input type="text" placeholder="full_name" className="signup-input"
              value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <div className="signup-field">
            <input type="email" placeholder="email_address" className="signup-input"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="signup-field">
            <input type="password" placeholder="set_password" className="signup-input"
              value={password} onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => { if (!confirmPassword) setPasswordFocused(false); }}
              required />
            <PasswordWhisper visible={passwordFocused} />
          </div>

          <div className="signup-field">
            <input type="password" placeholder="confirm_password"
              className={`signup-input${confirmPassword && password !== confirmPassword ? " input-error" : ""}`}
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)} required />
            {confirmPassword && password !== confirmPassword && (
              <span className="error-msg">// passwords do not match</span>
            )}
          </div>

          <button
            type="submit"
            className="signup-button"
            disabled={loading}
            onMouseDown={(e) => e.preventDefault()}
          >
            {loading ? "INITIALIZING..." : "SIGN UP"}
          </button>

          <p className="signup-footer">
            already have an account? <Link to="/Login">LOGIN</Link>
          </p>
        </form>
      </div>
    </>
  );
};

export default Signup;