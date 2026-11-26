import React, { lazy, Suspense, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import { AuthProvider } from "./context/AuthContext";
import { supabase } from "./services/supabase";

import Navbar from "./Components/Navbar/Navbar";
import Footer from "./Components/Footer/Footer";
import AdminRoute from "./Components/Admin/AdminRoute";
import MouseFollower from "./Components/Effects/MouseFollower";
import MouseParallax from "./Components/Effects/MouseParallax";
import CustomCursor from "./Components/Effects/CustomCursor";
import AnimatedBackground from "./Components/Effects/AnimatedBackground";

const Home = lazy(() => import("./Components/Home/Home"));
const About = lazy(() => import("./Components/About/About"));
const ServicePage = lazy(() => import("./Components/ServicePage/ServicePage"));
const Gallery = lazy(() => import("./Components/Gallery/Gallery"));
const Career = lazy(() => import("./Components/Career/Career"));
const Contact = lazy(() => import("./Components/Contact/Contact"));
const Login = lazy(() => import("./Components/Login/Login"));
const Signup = lazy(() => import("./Components/SignUp/SignUp"));
const EmailVerified = lazy(() => import("./Components/EmailVerified/EmailVerified"));
const Products = lazy(() => import("./Components/Products/Products"));
const InternshipApplication = lazy(() => import("./Components/InternshipApplication/InternshipApplication"));
const SkillArc = lazy(() => import("./Components/SkillArc/SkillArc"));
const MyApplications = lazy(() => import("./Components/Users/MyApplications"));
const UserDashboard = lazy(() => import("./Components/Users/UserDashboard"));
const AdminDashboard = lazy(() => import("./Components/Admin/AdminDashboard"));
const AnalyticsDashboard = lazy(() => import("./Components/Admin/AnalyticsDashboard"));
const PrivacyPolicy = lazy(() => import("./Components/PrivacyPolicy/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./Components/TermsAndConditions/TermsAndConditions"));
const CertificateVerification = lazy(() => import("./Components/CertificateVerification/CertificateVerification"));

const Blogs = lazy(() => import("./Components/Blogs/Blogs"));
const BlogDetails = lazy(() => import("./Components/Blogs/BlogDetails"));

const WriteBlog = lazy(() => import("./Components/Users/WriteBlog"));
const MyBlogs = lazy(() => import("./Components/Users/MyBlogs"));

const BlogManagement = lazy(() => import("./Components/Admin/BlogManagement"));
const TimesheetManagement = lazy(() => import("./Components/Admin/TimesheetManagement"));

// ── Scroll to top + visitor tracking ─────────────────────────────
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const track = async () => {
      try {
        const visitorId = localStorage.getItem("vid") || crypto.randomUUID();
        localStorage.setItem("vid", visitorId);

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        await fetch(
          "https://etcalajnegfqeykeegie.supabase.co/functions/v1/track-visitor",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({ visitor_id: visitorId }),
          }
        );
      } catch (e) {
        console.error("Tracking failed:", e);
      }
    };

    // ✅ First visit — track once per session
    if (!sessionStorage.getItem("tracked")) {
      track().then(() => sessionStorage.setItem("tracked", "true"));
    }

    // ✅ On login — re-track once to capture user_id + email
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        sessionStorage.removeItem("tracked");
        track().then(() => sessionStorage.setItem("tracked", "true"));
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return null;
};

// ── Page transition wrapper ───────────────────────────────────────
const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -40 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

// ── Loader ────────────────────────────────────────────────────────
const PageLoader = () => {
  const texts = ["Initializing...", "Loading modules...", "Almost ready..."];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % texts.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes fadeSwap {
          0%   { opacity: 0; transform: translateY(6px); }
          20%  { opacity: 1; transform: translateY(0); }
          80%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-6px); }
        }
        .pl-text { animation: fadeSwap 0.8s ease forwards; }
        .pl-cursor {
          display: inline-block;
          width: 7px; height: 13px;
          background: #facc15;
          margin-left: 4px;
          vertical-align: middle;
          animation: blink 1s step-start infinite;
        }
        .pl-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #facc15;
        }
      `}</style>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="pl-dot"
              style={{
                opacity: 0.3,
                animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <div
          key={index}
          className="pl-text"
          style={{
            color: "#facc15",
            fontFamily: "'DM Mono', monospace",
            fontSize: 13,
            letterSpacing: "0.05em",
          }}
        >
          {texts[index]}
          <span className="pl-cursor" />
        </div>
      </div>
    </>
  );
};

// ── Animated routes ───────────────────────────────────────────────
const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>

        {/* ── Public ── */}
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/About" element={<PageWrapper><About /></PageWrapper>} />
        <Route path="/Gallery" element={<PageWrapper><Gallery /></PageWrapper>} />
        <Route path="/ServicePage" element={<PageWrapper><ServicePage /></PageWrapper>} />
        <Route path="/Career" element={<PageWrapper><Career /></PageWrapper>} />
        <Route path="/Contact" element={<PageWrapper><Contact /></PageWrapper>} />
        <Route path="/verify-certificate/:certificateId" element={<PageWrapper><CertificateVerification /></PageWrapper>} />
        <Route path="/verify-certificate" element={<PageWrapper><CertificateVerification /></PageWrapper>} />
        <Route path="/Products" element={<PageWrapper><Products /></PageWrapper>} />
        <Route path="/Blogs" element={<PageWrapper><Blogs /></PageWrapper>} />
        <Route
          path="/blogs/:slug"
          element={<PageWrapper><BlogDetails /></PageWrapper>}
        />

        {/* Case-insensitive aliases */}
        <Route path="/about" element={<Navigate to="/About" replace />} />
        <Route path="/gallery" element={<Navigate to="/Gallery" replace />} />
        <Route path="/servicepage" element={<Navigate to="/ServicePage" replace />} />
        <Route path="/career" element={<Navigate to="/Career" replace />} />
        <Route path="/contact" element={<Navigate to="/Contact" replace />} />
        <Route path="/products" element={<Navigate to="/Products" replace />} />
        <Route path="/blogs" element={<Navigate to="/Blogs" replace />} />

        {/* ── Auth ── */}
        <Route path="/Login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/login" element={<Navigate to="/Login" replace />} />
        <Route path="/signup" element={<PageWrapper><Signup /></PageWrapper>} />
        <Route path="/email-confirmed" element={<PageWrapper><EmailVerified /></PageWrapper>} />

        {/* ── Internship ── */}
        <Route path="/internship-application" element={<PageWrapper><InternshipApplication /></PageWrapper>} />

        {/* ── User ── */}
        <Route path="/dashboard" element={<PageWrapper><UserDashboard /></PageWrapper>} />
        <Route path="/my-applications" element={<PageWrapper><MyApplications /></PageWrapper>} />
        <Route path="/my-blogs" element={<PageWrapper><MyBlogs /></PageWrapper>} />
        <Route path="/write-blog" element={<PageWrapper><WriteBlog /></PageWrapper>} />

        {/* ── Admin ── */}
        <Route
          path="/admin-dashboard"
          element={
            <PageWrapper>
              <AdminRoute><AdminDashboard /></AdminRoute>
            </PageWrapper>
          }
        />
        <Route
          path="/admin-analytics"
          element={
            <PageWrapper>
              <AdminRoute><AnalyticsDashboard /></AdminRoute>
            </PageWrapper>
          }
        />
        <Route
          path="/admin/blogs"
          element={
            <PageWrapper>
              <AdminRoute><BlogManagement /></AdminRoute>
            </PageWrapper>
          }
        />
        <Route
          path="/admin/timesheets"
          element={
            <PageWrapper>
              <AdminRoute><TimesheetManagement /></AdminRoute>
            </PageWrapper>
          }
        />

        {/* ── Legal ── */}
        <Route path="/privacy-policy" element={<PageWrapper><PrivacyPolicy /></PageWrapper>} />
        <Route path="/terms-and-conditions" element={<PageWrapper><TermsAndConditions /></PageWrapper>} />

        {/* ── SkillArc (do not touch) ── */}
        <Route path="/skillarc" element={<SkillArc />} />

        {/* ── 404 ── */}
        <Route
          path="*"
          element={
            <PageWrapper>
              <div style={{ color: "white", textAlign: "center", padding: "3rem" }}>
                Page Not Found
              </div>
            </PageWrapper>
          }
        />

      </Routes>
    </AnimatePresence>
  );
};

// ── Root App ──────────────────────────────────────────────────────
const App = () => {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <AnimatedBackground />
          <ScrollToTop />
          <MouseFollower />
          <MouseParallax />
          <CustomCursor />
          <Navbar />
          <main style={{ flex: 1 }}>
            <Suspense fallback={<PageLoader />}>
              <AnimatedRoutes />
            </Suspense>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;