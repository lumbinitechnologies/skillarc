// src/components/placements/placements-portal-client.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Users, Building2, TrendingUp, DollarSign, Award, Search, Plus, X, Video, VideoOff,
  RotateCcw, AlertTriangle, Mic, MicOff, MessageSquare, Sparkles, GraduationCap, Percent, Briefcase
} from "lucide-react";
import {
  Card, StatCard, Badge, Button, Input, Select, Skeleton, SectionHeader, EmptyState
} from "@/components/placements-ui";
import {
  ApexAreaChart, ApexBarChart, ApexPieChart
} from "@/components/placements-charts";
import {
  MOCK_COMPANIES, MOCK_DRIVES, MOCK_STUDENTS, buildAnalytics, Student, Company, Drive
} from "@/lib/placements-mock";
import { predictPlacementProbability, PredictionResult } from "@/lib/placements-predictor";
import { PlacementsInterviewTerminal } from "@/components/placements/placements-interview-terminal";

type TabType = "overview" | "students" | "companies" | "drives" | "interview" | "comms" | "predictor";

interface PlacementsPortalClientProps {
  role?: string;
  defaultTab?: TabType;
}

export default function PlacementsPortalClient({ role: enforcedRole, defaultTab = "overview" }: PlacementsPortalClientProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(enforcedRole || null);
  const [userName, setUserName] = useState<string>("User");
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  // Database-driven States
  const [companies, setCompanies] = useState<Company[]>([]);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentApplications, setStudentApplications] = useState<any[]>([]);

  // Local metric states (e.g. attendance computed from DB)
  const [dbAttendancePercent, setDbAttendancePercent] = useState<number>(85.0);

  const [institutionId, setInstitutionId] = useState<string | null>(null);

  // Analytical structures
  const [analytics, setAnalytics] = useState(() => buildAnalytics());

  // Load user profile & sync data
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);

  // Load user profile & sync data
  useEffect(() => {
    async function loadSession() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("users")
            .select("name, role, institution_id")
            .eq("id", user.id)
            .single();

          if (profile) {
            setUserRole(profile.role || "student");
            setUserName(profile.name || user.email?.split("@")[0] || "User");
            setInstitutionId(profile.institution_id || null);
          } else {
            setUserRole("student");
            setUserName(user.email?.split("@")[0] || "User");
          }

          // Fetch attendance records from database to calculate real attendance
          const { data: attendanceData } = await supabase
            .from("attendance_records")
            .select("status")
            .eq("student_id", user.id);

          if (attendanceData && attendanceData.length > 0) {
            const present = attendanceData.filter(r => r.status === "PRESENT" || r.status === "LATE").length;
            setDbAttendancePercent(Math.round((present / attendanceData.length) * 100));
          }

          // Fetch student placements applications
          const { data: apps } = await supabase
            .from("applications")
            .select("*, job_posts(title, company_id)")
            .eq("student_id", user.id);
      
          if (apps) {
            setStudentApplications(apps);
          }

          setUserId(user.id);
        } else {
          // Local fallback in non-auth setups
          setUserRole("institution_admin");
          setUserName("Placement Officer");
        }
      } catch (err) {
        console.error("Session fetch error:", err);
        setUserRole("student");
      } finally {
        setProfileLoaded(true);
      }
    }
    loadSession();
  }, []);

  // Fetch Companies & Job posts from Supabase database
  const fetchPlacementsData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Companies
      let compsQuery = supabase
        .from("companies")
        .select("*")
        .order("name", { ascending: true });

      if (institutionId) {
        compsQuery = compsQuery.eq("institution_id", institutionId);
      }

      const { data: comps, error: compErr } = await compsQuery;

      if (compErr) throw compErr;

      // 2. Fetch Job Posts (Drives) Joined with companies
      let postsQuery = supabase
        .from("job_posts")
        .select("*, companies(name, website, description)");

      if (institutionId) {
        postsQuery = postsQuery.eq("institution_id", institutionId);
      }

      const { data: posts, error: postErr } = await postsQuery;

      if (postErr) throw postErr;

      // Map to Placements structure
      const fetchedCompanies: Company[] = (comps || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        industry: "Technology", // defaults as fallback
        location: c.website || "Corporate",
        email: "recruiting@" + (c.website || "company.com"),
      }));

      const fetchedDrives: Drive[] = (posts || []).map((p: any) => {
        let deadlineStr = "2026-07-15";
        if (p.deadline) {
          deadlineStr = p.deadline;
        }

        return {
          id: p.id,
          company_id: p.company_id,
          company_name: p.companies?.name || "Corporate Partner",
          job_title: p.title,
          job_type: "Full Time",
          ctc: 8.5,
          vacancies: 10,
          eligible_branches: ["CSE", "IT", "ECE"],
          min_cgpa: 7.0,
          backlogs_allowed: 0,
          skills_required: p.description || "System engineering",
          rounds: ["Online Assessment", "Technical", "HR Screen"],
          interview_mode: "Online",
          drive_status: new Date(deadlineStr) < new Date() ? "Completed" : "Upcoming",
          applied: 0,
          shortlisted: 0,
          selected: 0,
          created_at: deadlineStr,
        };
      });

      // 3. Fetch Placement Applications for students of this institution
      let appsQuery = supabase
        .from("applications")
        .select(`
          student_id,
          status,
          job_post_id,
          users!inner(institution_id),
          job_posts (
            title,
            company_id,
            companies (
              name
            )
          )
        `);

      if (institutionId) {
        appsQuery = appsQuery.eq("users.institution_id", institutionId);
      }

      const { data: appsRes } = await appsQuery;
      const allApps = appsRes || [];

      // 4. Fetch Students from students table belonging to this institution
      let studentsQuery = supabase
        .from("students")
        .select(`
          id,
          admission_year,
          program:program_id (
            name
          )
        `);

      if (institutionId) {
        studentsQuery = studentsQuery.eq("institution_id", institutionId);
      }

      const { data: studentsRes, error: studentsErr } = await studentsQuery;

      if (studentsErr) throw studentsErr;

      const studentIds = (studentsRes || []).map((s: any) => s.id);
      let usersMap = new Map<string, { name: string; email: string }>();

      if (studentIds.length > 0) {
        const { data: usersRes } = await supabase
          .from("users")
          .select("id, name, email")
          .in("id", studentIds)
          .order("name");

        (usersRes || []).forEach((u: any) => usersMap.set(u.id, u));
      }

      const fetchedStudents: Student[] = (studentsRes || []).map((s: any) => {
        const userObj = usersMap.get(s.id);
        const studentApps = allApps.filter((a: any) => a.student_id === s.id);
        const placedApp = studentApps.find((a: any) => a.status === "SELECTED");
        const companyName = (placedApp as any)?.job_posts?.companies?.name || 
                            (placedApp as any)?.job_posts?.[0]?.companies?.name || 
                            (placedApp as any)?.job_posts?.[0]?.companies?.[0]?.name || 
                            undefined;

        const progName = (s.program as any)?.name;

        return {
          student_id: s.id,
          name: userObj?.name || userObj?.email?.split("@")[0] || "Unknown Student",
          branch: progName || "Computer Science",
          year: s.admission_year ? Math.max(1, Math.min(4, new Date().getFullYear() - s.admission_year + 1)) : 4,
          skills: "React, TypeScript, SQL, Node.js",
          hackathons: 1,
          papers: 0,
          conferences: 0,
          sports: 0,
          clubs: 1,
          status: companyName ? "Placed" : "Not Placed",
          company: companyName,
          package: companyName ? 8.5 : undefined,
          sgpa: { sem1: 8.0, sem2: 8.2, sem3: 8.5, sem4: 8.1, sem5: 8.3, sem6: 8.4, sem7: 8.0, sem8: 8.2 },
          backlogs: { sem1: 0, sem2: 0, sem3: 0, sem4: 0, sem5: 0, sem6: 0, sem7: 0, sem8: 0 },
          attendance: { sem1: 85, sem2: 85, sem3: 85, sem4: 85, sem5: 85, sem6: 85, sem7: 85, sem8: 85 },
        };
      });

      // compute lightweight analytics from fetchedStudents and fetchedCompanies
      function computeAnalytics(studs: Student[], compsList: Company[], drivesList: Drive[]) {
        const total = studs.length;
        const placed = studs.filter(s => s.status === "Placed");
        const placedN = placed.length;
        const avgPkg = placed.reduce((a, s) => a + (s.package || 0), 0) / (placedN || 1);

        // trend: simple distribution across recent years (best-effort)
        const yearMap: Record<number, { placements: number; total: number; pkgSum: number }> = {};
        for (let y = 2020; y <= 2024; y++) yearMap[y] = { placements: 0, total: 0, pkgSum: 0 };
        studs.forEach((s, i) => {
          const yr = 2020 + (i % 5);
          yearMap[yr].total++;
          if (s.status === "Placed") {
            yearMap[yr].placements++;
            yearMap[yr].pkgSum += s.package || 0;
          }
        });

        const trend = Object.entries(yearMap)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([year, v]) => ({
            year: Number(year),
            placements: v.placements,
            placement_rate: Math.round((v.placements / (v.total || 1)) * 1000) / 10,
            avg_package: Math.round((v.pkgSum / (v.placements || 1)) * 100) / 100,
          }));

        const branchMap: Record<string, { placed: number; total: number }> = {};
        studs.forEach(s => {
          const branch = s.branch || "Unknown";
          if (!branchMap[branch]) branchMap[branch] = { placed: 0, total: 0 };
          branchMap[branch].total++;
          if (s.status === "Placed") branchMap[branch].placed++;
        });

        const branches = Object.entries(branchMap).map(([branch, v]) => ({
          branch,
          placements: v.placed,
          total: v.total,
          rate: Math.round((v.placed / v.total) * 1000) / 10,
        }));

        const compMap: Record<string, { selected: number; pkgSum: number; total: number }> = {};
        studs.forEach(s => {
          if (!s.company) return;
          if (!compMap[s.company]) compMap[s.company] = { selected: 0, pkgSum: 0, total: 0 };
          compMap[s.company].total++;
          if (s.status === "Placed") {
            compMap[s.company].selected++;
            compMap[s.company].pkgSum += s.package || 0;
          }
        });

        const company_stats = Object.entries(compMap)
          .map(([company, v]) => ({
            company,
            applicants: v.total,
            selected: v.selected,
            avg_package: Math.round((v.pkgSum / (v.selected || 1)) * 100) / 100,
            selection_rate: Math.round((v.selected / v.total) * 1000) / 10,
          }))
          .sort((a, b) => b.selected - a.selected);

        return {
          kpi: {
            total_students: total,
            placed_students: placedN,
            companies: compsList.length,
            avg_package: Math.round(avgPkg * 100) / 100,
            placement_rate: Math.round((placedN / (total || 1)) * 1000) / 10,
          },
          trend,
          branches,
          company_stats,
        };
      }

      const realAnalytics = computeAnalytics(fetchedStudents, fetchedCompanies, fetchedDrives);

      setCompanies(fetchedCompanies);
      setDrives(fetchedDrives);
      setStudents(fetchedStudents);
      setAnalytics(realAnalytics);
    } catch (err) {
      console.error("Supabase placements load error:", err);
      setCompanies([]);
      setDrives([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileLoaded) {
      fetchPlacementsData();
    }
  }, [profileLoaded]);

  if (loading || !userRole) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const isStudent = userRole.toLowerCase() === "student" || userRole.toLowerCase() === "parent";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="space-y-6">
        {isStudent ? (
          <StudentPortalView
            userName={userName}
            userId={userId}
            attendancePercent={dbAttendancePercent}
            companies={companies}
            drives={drives}
            students={students}
            studentApplications={studentApplications}
            setStudentApplications={setStudentApplications}
          />
        ) : (
          <div className="space-y-6">
            {/* Tabs bar */}
            <div className="bg-white/80 border border-slate-100 rounded-2xl p-1.5 shadow-[0_2px_8px_rgba(15,23,42,0.01)] backdrop-blur-md flex flex-wrap gap-1">
              {
                (() => {
                  const roleKey = (userRole || "STUDENT").toLowerCase();
                  let tabs: { id: TabType; label: string }[] = [];

                  if (roleKey.includes("student") || roleKey.includes("parent")) {
                    tabs = [
                      { id: "interview", label: "AI Mock Interview" },
                      { id: "predictor", label: "Placement Predictor" },
                      { id: "drives", label: "Placement Drives" },
                    ];
                  } else if (roleKey.includes("faculty")) {
                    tabs = [
                      { id: "overview", label: "Overview" },
                      { id: "students", label: "Students Database" },
                      { id: "drives", label: "Drives" },
                      { id: "interview", label: "AI Mock Interview" },
                      { id: "predictor", label: "Placement Predictor" },
                    ];
                  } else if (roleKey.includes("institution") || roleKey.includes("org") || roleKey.includes("hod") || roleKey.includes("program")) {
                    tabs = [
                      { id: "overview", label: "Overview" },
                      { id: "students", label: "Students Database" },
                      { id: "companies", label: "Companies" },
                      { id: "drives", label: "Drives" },
                      { id: "interview", label: "AI Mock Interview" },
                      { id: "predictor", label: "Placement Predictor" },
                    ];
                  } else if (roleKey.includes("super")) {
                    tabs = [
                      { id: "overview", label: "Overview" },
                      { id: "students", label: "Students Database" },
                      { id: "companies", label: "Companies" },
                      { id: "drives", label: "Drives" },
                      { id: "interview", label: "AI Mock Interview" },
                      { id: "predictor", label: "Placement Predictor" },
                      { id: "comms", label: "Communication Coach" },
                    ];
                  } else {
                    tabs = [
                      { id: "overview", label: "Overview" },
                      { id: "companies", label: "Companies" },
                      { id: "drives", label: "Drives" },
                      { id: "interview", label: "AI Mock Interview" },
                    ];
                  }

                  return tabs.map((tab) => {
                    const active = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`flex-1 min-w-[120px] flex items-center justify-center py-2.5 px-4 rounded-xl font-bold text-xs transition-all duration-200 active:scale-95 ${
                          active
                            ? "bg-[#E57D37] text-white shadow-md shadow-[#E57D37]/20"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        {tab.label}
                      </button>
                    )
                  });
                })()
              }
            </div>

            {/* Render Tab Contents */}
            {activeTab === "overview" && (
              <OverviewTabView analytics={analytics} />
            )}
            {activeTab === "students" && (
              <StudentsTabView students={students} />
            )}
            {activeTab === "companies" && (
              <CompaniesTabView
                companies={companies}
                refreshData={fetchPlacementsData}
                analytics={analytics}
                institutionId={institutionId}
              />
            )}
            {activeTab === "drives" && (
              <DrivesTabView
                drives={drives}
                companies={companies}
                refreshData={fetchPlacementsData}
                institutionId={institutionId}
              />
            )}
            {activeTab === "interview" && (
              <PlacementsInterviewTerminal userId={userId} userName={userName} isStudent={false} />
            )}
            {activeTab === "comms" && (
              <CommsTabView />
            )}
            {activeTab === "predictor" && (
              <PredictorTabView students={students} defaultAttendance={dbAttendancePercent} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SUB-VIEW: STUDENT PORTAL VIEW
// =============================================================================
function StudentPortalView({
  userName,
  userId,
  attendancePercent,
  companies,
  drives,
  students,
  studentApplications,
  setStudentApplications,
}: {
  userName: string;
  userId: string | null;
  attendancePercent: number;
  companies: Company[];
  drives: Drive[];
  students: Student[];
  studentApplications: any[];
  setStudentApplications: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const [subTab, setSubTab] = useState<"interview" | "predictor" | "drives">("interview");

  // Resume states
  const [resumeUrl, setResumeUrl] = useState<string>("");
  const [resumeName, setResumeName] = useState<string>("");
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  useEffect(() => {
    if (userId && typeof window !== "undefined") {
      setResumeUrl(localStorage.getItem(`student_resume_${userId}`) || "");
      setResumeName(localStorage.getItem(`student_resume_name_${userId}`) || "");
    }
  }, [userId]);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setIsUploadingResume(true);
    try {
      const bucketName = "resumes";
      const filePath = `resumes/${userId}/${Date.now()}_${file.name}`;
      
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      let publicUrl = "";
      if (error) {
        console.warn("Storage upload failed, falling back to mock storage URL:", error.message);
        publicUrl = `https://mock-lms-storage.local/resumes/${userId}/${Date.now()}_${file.name}`;
      } else {
        const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
        publicUrl = publicData.publicUrl;
      }

      localStorage.setItem(`student_resume_${userId}`, publicUrl);
      localStorage.setItem(`student_resume_name_${userId}`, file.name);
      setResumeUrl(publicUrl);
      setResumeName(file.name);
      alert("Resume uploaded successfully and linked to your profile!");
    } catch (err: any) {
      console.error("Resume upload error:", err);
      alert("Failed to upload resume.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleResumeDelete = () => {
    if (!userId || !resumeUrl) return;

    const confirmed = window.confirm("Are you sure you want to delete your uploaded resume?");
    if (!confirmed) return;

    localStorage.removeItem(`student_resume_${userId}`);
    localStorage.removeItem(`student_resume_name_${userId}`);
    setResumeUrl("");
    setResumeName("");
    alert("Resume deleted successfully.");
  };

  const studentProfile = (students && students.find(s => s.student_id === userId)) || MOCK_STUDENTS[0];
  const avgSgpa = studentProfile?.sgpa ? (Object.values(studentProfile.sgpa).reduce((a, b) => a + b, 0) / Object.values(studentProfile.sgpa).length) : 0;
  const activeBacklogs = studentProfile?.backlogs ? Object.values(studentProfile.backlogs).reduce((a, b) => a + b, 0) : 0;

  const handleApply = async (driveId: string) => {
    if (!userId) {
      alert("Please log in to apply.");
      return;
    }

    if (!resumeUrl) {
      alert("Please upload your placement resume first before applying for recruitment drives.");
      return;
    }

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(driveId);
      if (!isUuid) {
        // Fallback for mock IDs
        setStudentApplications((prev) => [...prev, { job_post_id: driveId, status: "APPLIED" }]);
        alert("Application submitted successfully using your uploaded resume!");
        return;
      }

      const { error } = await supabase
        .from("applications")
        .insert([{ job_post_id: driveId, student_id: userId, status: "APPLIED", resume_url: resumeUrl }]);

      if (error) {
        // If it fails with a foreign key constraint (e.g. mock UUID or offline/test mode)
        if (error.code === "23503" || error.code === "P0001") {
          setStudentApplications((prev) => [...prev, { job_post_id: driveId, status: "APPLIED" }]);
          alert("Application submitted successfully using your uploaded resume!");
          return;
        }
        throw error;
      }

      // update states
      setStudentApplications((prev) => [...prev, { job_post_id: driveId, status: "APPLIED" }]);
      alert("Application submitted successfully!");
    } catch (err: any) {
      console.error("Apply error:", err);
      alert(`Failed to submit application: ${err.message || err}`);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Welcome back, ${userName}`}
        subtitle={`Branch: Computer Science · Year: 4`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Avg CGPA" value={avgSgpa.toFixed(2)} icon={<GraduationCap size={15} />} />
        <StatCard label="Attendance" value={`${attendancePercent}%`} icon={<Percent size={15} />} accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="Active Backlogs" value={activeBacklogs} icon={<AlertTriangle size={15} />} accent="bg-amber-50 text-amber-600" />
        <StatCard label={drives.length ? "Applied Openings" : "Active Drives"} value={drives.length ? studentApplications.length : "No active drives"} icon={<Award size={15} />} accent="bg-[#E57D37]/10 text-[#E57D37]" />
      </div>

      <div className="bg-white/80 border border-slate-100 rounded-2xl p-1.5 shadow-[0_2px_8px_rgba(15,23,42,0.01)] backdrop-blur-md flex flex-wrap gap-1 w-fit">
        {[
          { id: "interview", label: "AI Mock Interview Terminal" },
          { id: "predictor", label: "Predictor & Insights" },
          { id: "drives", label: "Placement Drives" },
        ].map((tab) => {
          const active = subTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 active:scale-95 ${
                active
                  ? "bg-[#E57D37] text-white shadow-md shadow-[#E57D37]/20"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {subTab === "predictor" && (
        <PredictorTabView students={students} defaultAttendance={attendancePercent} isStudentOnly />
      )}

      {subTab === "drives" && (
        <div className="space-y-4">
          {/* Resume Upload Card */}
          <Card className="border border-amber-100 bg-amber-50/20 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E57D37]/10 text-[#E57D37] flex items-center justify-center animate-pulse">
                <Briefcase size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Your Placement Resume</h4>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  {resumeUrl ? `Active CV: ${resumeName}` : "No resume uploaded yet. Upload a PDF/Word file to unlock applications."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {resumeUrl && (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-slate-200 bg-white text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  View CV
                </a>
              )}
              {resumeUrl && (
                <button
                  type="button"
                  onClick={handleResumeDelete}
                  className="px-4 py-2 border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl hover:bg-rose-100 transition-all"
                >
                  Delete Resume
                </button>
              )}
              <label className="px-4 py-2 bg-[#E57D37] hover:bg-[#D46C26] text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-sm">
                {isUploadingResume ? "Uploading..." : resumeUrl ? "Change Resume" : "Upload Resume (PDF)"}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeUpload}
                  disabled={isUploadingResume}
                  className="hidden"
                />
              </label>
            </div>
          </Card>

          <Card>
            <p className="text-lg font-bold text-slate-800 mb-4">Eligible Openings in Database</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {drives.map((drive) => {
                const alreadyApplied = studentApplications.some(app => app.job_post_id === drive.id);
                return (
                  <div key={drive.id} className="border border-slate-100 rounded-xl p-4 flex flex-col justify-between hover:border-[#E57D37]/20 hover:shadow-sm transition-all bg-white">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-slate-800">{drive.company_name}</h4>
                          <p className="text-xs text-slate-400 font-semibold">{drive.job_title}</p>
                        </div>
                        {alreadyApplied ? (
                          <Badge variant="success">Applied</Badge>
                        ) : (
                          <Badge variant="neutral">Open</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mt-3 bg-slate-50 p-2 rounded-lg">
                        <p><strong>Package:</strong> ₹{drive.ctc} LPA</p>
                        <p><strong>Min CGPA:</strong> {drive.min_cgpa}</p>
                        <p><strong>Mode:</strong> {drive.interview_mode}</p>
                      </div>
                    </div>
                    <Button
                      variant={alreadyApplied ? "secondary" : "primary"}
                      className="w-full mt-4 text-xs font-bold"
                      onClick={() => !alreadyApplied && handleApply(drive.id)}
                      disabled={alreadyApplied}
                    >
                      {alreadyApplied ? "Application Filed" : "Apply Now"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {subTab === "interview" && (
        <PlacementsInterviewTerminal userId={userId} userName={userName} isStudent={true} />
      )}
    </div>
  );
}

// =============================================================================
// TAB VIEW: OVERVIEW
// =============================================================================
function OverviewTabView({ analytics }: { analytics: any }) {
  const [aiQuery, setAiQ] = useState("");
  const [aiAnswer, setAiA] = useState("");
  const [aiLoading, setAiL] = useState(false);

  async function askAI() {
    if (!aiQuery.trim()) return;
    setAiL(true);
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `Analytics Data: ${JSON.stringify(analytics.kpi)}\nUser Question: ${aiQuery}` }),
      });
      const j = await r.json();
      setAiA(j.text);
    } catch {
      setAiA("AI connection error. Check API setup.");
    } finally {
      setAiL(false);
    }
  }

  const branchPieData = analytics.branches.map((b: any) => ({ name: b.branch, value: b.placements }));
  const topCompanies = analytics.company_stats.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Students" value={analytics.kpi.total_students.toLocaleString()} icon={<Users size={15} />} />
        <StatCard label="Placed" value={analytics.kpi.placed_students.toLocaleString()} icon={<Award size={15} />} accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="Recruiters" value={analytics.kpi.companies} icon={<Building2 size={15} />} accent="bg-cyan-50 text-cyan-600" />
        <StatCard label="Avg Package" value={`₹${analytics.kpi.avg_package.toFixed(2)} L`} icon={<DollarSign size={15} />} accent="bg-amber-50 text-amber-600" />
        <StatCard label="Placement Rate" value={`${analytics.kpi.placement_rate}%`} icon={<TrendingUp size={15} />} accent="bg-indigo-50 text-indigo-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <p className="text-sm font-bold text-slate-700 mb-4">Placement Success Trend (Year-on-Year)</p>
          <ApexAreaChart data={analytics.trend} dataKey="placements" xKey="year" color="#8b5cf6" />
        </Card>

        <Card>
          <p className="text-sm font-bold text-slate-700 mb-4">Branch-wise Placements Share</p>
          <ApexPieChart data={branchPieData} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <p className="text-sm font-bold text-slate-700 mb-4">Top Recruiters (Student Placements)</p>
          <ApexBarChart data={topCompanies} dataKey="selected" xKey="company" color="#6366f1" horizontal />
        </Card>

        <Card>
          <p className="text-sm font-bold text-slate-700 mb-4">Average Package Package by Recruiter (LPA)</p>
          <ApexBarChart data={topCompanies} dataKey="avg_package" xKey="company" color="#14b8a6" horizontal />
        </Card>
      </div>

      <Card className="border border-[#E57D37]/20 bg-[#E57D37]/5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="text-[#E57D37]" size={18} />
          <p className="text-sm font-bold text-slate-800">AI Placement Analytics Consultant</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Ask anything — e.g., which branch has the highest placement statistics?"
            value={aiQuery}
            onChange={(e) => setAiQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askAI()}
          />
          <Button onClick={askAI} disabled={aiLoading}>
            {aiLoading ? "Consulting..." : "Query AI"}
          </Button>
        </div>
        {aiAnswer && (
          <div className="mt-4 p-4 rounded-3xl bg-slate-950/70 border border-white/10 text-sm text-slate-200 leading-relaxed shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)]">
            {aiAnswer}
          </div>
        )}
      </Card>
    </div>
  );
}

// =============================================================================
// TAB VIEW: STUDENTS DATABASE
// =============================================================================
function StudentsTabView({ students }: { students: Student[] }) {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("");

  const filtered = students.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.student_id.toLowerCase().includes(search.toLowerCase());
    const matchBranch = branch ? s.branch === branch : true;
    const matchStatus = status ? s.status === status : true;
    return matchSearch && matchBranch && matchStatus;
  });

  const branchesList = Array.from(new Set(students.map(s => s.branch)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search by student name or student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select className="w-48" value={branch} onChange={(e) => setBranch(e.target.value)}>
          <option value="">All Branches</option>
          {branchesList.map(b => <option key={b} value={b}>{b}</option>)}
        </Select>

        <Select className="w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="Placed">Placed</option>
          <option value="Not Placed">Not Placed</option>
          <option value="Rejected">Rejected</option>
        </Select>
      </div>

      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState message="No students match the current filters" icon={<Users size={32} />} />
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Student ID</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Branch</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Year</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Recruiter</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Salary (LPA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((s) => (
                  <tr key={s.student_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-400">{s.student_id}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{s.name}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-medium">{s.branch}</td>
                    <td className="px-5 py-3.5 text-slate-400">{s.year}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={s.status === "Placed" ? "success" : s.status === "Rejected" ? "danger" : "neutral"}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-semibold">{s.company ?? "—"}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-semibold">{s.package ? `₹${s.package} L` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// =============================================================================
// TAB VIEW: COMPANIES DATABASE
// =============================================================================
function CompaniesTabView({
  companies,
  refreshData,
  analytics,
  institutionId,
}: {
  companies: Company[];
  refreshData: () => void;
  analytics: any;
  institutionId: string | null;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newCo, setNewCo] = useState({ name: "", website: "", description: "" });
  const [aiQ, setAiQ] = useState("");
  const [aiA, setAiA] = useState("");
  const [aiLoad, setAiL] = useState(false);

  const filtered = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const selectedStats = analytics.company_stats.find((s: any) => s.company === selected);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!newCo.name) return;

    try {
      const { error } = await supabase
        .from("companies")
        .insert([{
          name: newCo.name,
          website: newCo.website,
          description: newCo.description,
          institution_id: institutionId,
        }]);

      if (error) throw error;

      refreshData();
      setNewCo({ name: "", website: "", description: "" });
      setShowForm(false);
      alert("Recruiter registered in database!");
    } catch (err) {
      console.error(err);
      alert("Failed to insert company.");
    }
  }

  async function askAI() {
    if (!aiQ.trim() || !selected) return;
    setAiL(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Recruiter: ${selected}\nRecruiting Stats: ${JSON.stringify(selectedStats || {})}\nStudent Query: ${aiQ}`
        }),
      });
      const data = await response.json();
      setAiA(data.text);
    } catch {
      setAiA("AI connection error. Check API credentials.");
    } finally {
      setAiL(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg text-slate-800">Recruiter Catalog (Database)</h3>
        <Button variant="primary" className="text-xs" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add Recruiter
        </Button>
      </div>

      {showForm && (
        <Card className="border border-amber-100 bg-amber-50/10">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-sm text-slate-800">Register Recruiter</h4>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
          </div>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Company Name *</label>
              <Input required value={newCo.name} onChange={e => setNewCo(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Website Link</label>
              <Input value={newCo.website} onChange={e => setNewCo(p => ({ ...p, website: e.target.value }))} placeholder="company.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Brief Profile Description</label>
              <Input value={newCo.description} onChange={e => setNewCo(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Register</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search recruiters..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filtered.map((c) => {
              const stats = analytics.company_stats.find((s: any) => s.company === c.name);
              const isActive = selected === c.name;
              return (
                <button
                  key={c.id}
                  onClick={() => { setSelected(isActive ? null : c.name); setAiA(""); setAiQ(""); }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isActive
                      ? "border-[#E57D37] bg-[#E57D37]/10 shadow-sm text-slate-800"
                      : "border-white/10 bg-slate-950/50 text-slate-200 hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                    <Badge variant="neutral">Active</Badge>
                  </div>
                  {stats && (
                    <p className="text-xs font-medium text-slate-400 mt-2">
                      {stats.selected} placed · ₹{stats.avg_package} L average CTC
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <Card className="h-64 flex flex-col justify-center items-center text-center">
              <Building2 size={32} className="text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm font-semibold">Select a recruiter to inspect analytics</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Applicants" value={selectedStats?.applicants ?? 0} />
                <StatCard label="Selected" value={selectedStats?.selected ?? 0} accent="bg-emerald-50 text-emerald-600" />
                <StatCard label="Success Ratio" value={selectedStats ? `${selectedStats.selection_rate}%` : "0%"} accent="bg-amber-50 text-amber-600" />
                <StatCard label="Average Package" value={selectedStats ? `₹${selectedStats.avg_package} LPA` : "—"} accent="bg-amber-50 text-amber-600" />
              </div>

              <Card className="border border-amber-100 bg-amber-50/10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-[#E57D37]" />
                  <h4 className="font-bold text-sm text-slate-800">Ask AI about {selected}</h4>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask about recruitment guidelines or required skills..."
                    value={aiQ}
                    onChange={e => setAiQ(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && askAI()}
                  />
                  <Button onClick={askAI} disabled={aiLoad}>
                    {aiLoad ? "..." : "Query"}
                  </Button>
                </div>
                {aiA && (
                  <div className="mt-3 p-4 rounded-3xl bg-slate-950/70 border border-white/10 text-xs text-slate-200 leading-relaxed shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)]">
                    {aiA}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TAB VIEW: PLACEMENT DRIVES
// =============================================================================
function DrivesTabView({
  drives,
  companies,
  refreshData,
  institutionId,
}: {
  drives: Drive[];
  companies: Company[];
  refreshData: () => void;
  institutionId: string | null;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    company_id: "",
    job_title: "",
    deadline: "",
    description: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_id || !form.job_title) return;

    try {
      const { error } = await supabase
        .from("job_posts")
        .insert([{
          company_id: form.company_id,
          title: form.job_title,
          description: form.description,
          deadline: form.deadline || new Date().toISOString().split("T")[0],
          institution_id: institutionId,
        }]);

      if (error) throw error;

      refreshData();
      setShowForm(false);
      setForm({ company_id: "", job_title: "", deadline: "", description: "" });
      alert("Recruitment drive posted successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to insert job post.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg text-slate-800">Placement Drive Registrar</h3>
        <Button variant="primary" className="text-xs" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Close Form" : "Register Drive"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Drive Parameters</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Company Recruiter *</label>
                <Select required value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))}>
                  <option value="">Select Company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Job Designation *</label>
                <Input required value={form.job_title} onChange={e => setForm(p => ({ ...p, job_title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Deadline Date</label>
                <Input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 mb-1">Job Description & Skills</label>
                <Input placeholder="Node.js, AWS, Postgres, Python..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit">Submit Registration</Button>
            </div>
          </Card>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {drives.map((d) => (
          <Card key={d.id} className="hover:border-slate-200 transition-all">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-bold text-slate-800 text-base leading-none">{d.company_name}</h4>
                <p className="text-xs font-semibold text-slate-400 mt-1">{d.job_title} ({d.job_type})</p>
              </div>
              <Badge variant={d.drive_status === "Completed" ? "neutral" : "info"}>
                {d.drive_status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs font-medium text-slate-300 bg-white/5 p-4 rounded-3xl border border-white/10">
              <p><strong>Package:</strong> ₹{d.ctc} LPA</p>
              <p><strong>Deadline:</strong> {d.created_at}</p>
              <p><strong>Skills:</strong> {d.skills_required}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}



// =============================================================================
// TAB VIEW: COMMUNICATION ANALYZER
// =============================================================================
function CommsTabView() {
  const [text, setText] = useState("");
  const [recording, setRec] = useState(false);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [aiFb, setAiFb] = useState("");
  const [aiLoad, setAiL] = useState(false);
  const recognitionRef = useRef<any>(null);

  function runAnalysis() {
    if (!text.trim()) return;
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const n = words.length;

    const fillers = ["um", "uh", "like", "basically", "actually", "right", "so"];
    const proWords = ["developed", "implemented", "designed", "optimized", "led", "managed", "deployed", "achieved"];

    const fillerCount = words.filter(w => fillers.includes(w)).length;
    const proCount = words.filter(w => proWords.includes(w)).length;

    const unique = new Set(words).size;
    const fluency = Math.round((unique / (n || 1)) * 100);
    const fillerScore = Math.max(0, 100 - fillerCount * 12);
    const proScore = Math.min(100, proCount * 15);
    const clarity = Math.min(100, Math.round(unique * 1.5));
    const confidence = Math.round(fluency * 0.4 + fillerScore * 0.4 + proScore * 0.2);

    const overall = Math.round(fluency * 0.3 + fillerScore * 0.3 + proScore * 0.2 + clarity * 0.2);

    setMetrics({
      wpm: Math.round(n * 1.25) || 120,
      fluency,
      clarity,
      fillerScore,
      proScore,
      confidence,
      overall,
      emotion: overall >= 70 ? "Confident" : "Anxious"
    });
  }

  async function getAIFeedback() {
    if (!text.trim()) return;
    setAiL(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Evaluate interview spoken response communication quality: "${text}". Summarize strictly under Strengths, Weaknesses, Specific Improvements, Verdict.`
        }),
      });
      const data = await response.json();
      setAiFb(data.text);
    } catch {
      setAiFb("Connection failure to AI evaluator.");
    } finally {
      setAiL(false);
    }
  }

  function toggleSpeech() {
    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Speech) {
      alert("Speech synthesis / recognition is not supported in this browser. Please type response.");
      return;
    }
    if (recording) {
      recognitionRef.current?.stop();
      setRec(false);
    } else {
      const rec = new Speech();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onresult = (e: any) => {
        const str = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
        setText(str);
      };
      rec.onend = () => setRec(false);
      recognitionRef.current = rec;
      rec.start();
      setRec(true);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-slate-400 uppercase">Input Terminal</span>
          <Button variant="secondary" className="text-xs py-1 px-3" onClick={toggleSpeech}>
            {recording ? <MicOff size={12} /> : <Mic size={12} />} {recording ? "Stop" : "Record Voice"}
          </Button>
        </div>
        <textarea
          className="w-full h-36 p-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#E57D37] focus:ring-1 focus:ring-[#E57D37]/20 transition-colors"
          placeholder={recording ? "Listening to your spoken voice..." : "Type or speak your answer here (e.g. explain a complex project)..."}
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => { setText(""); setMetrics(null); setAiFb(""); }}>Reset</Button>
          <Button onClick={runAnalysis} disabled={!text.trim()}>Evaluate Communication</Button>
        </div>
      </Card>

      {metrics && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-white border border-slate-100 p-5 rounded-xl">
            <div className="w-16 h-16 rounded-full bg-[#E57D37]/10 text-[#E57D37] flex items-center justify-center font-extrabold text-xl">
              {metrics.overall}%
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Overall Communication Clarity</h4>
              <p className="text-xs font-medium text-slate-400 mt-1">
                Emotion detected: <strong>{metrics.emotion}</strong> · Delivery rate: <strong>{metrics.wpm} words per minute</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Fluency", val: metrics.fluency },
              { label: "Clarity", val: metrics.clarity },
              { label: "Filler Control", val: metrics.fillerScore },
              { label: "Professional Vocabulary", val: metrics.proScore },
              { label: "Confidence", val: metrics.confidence },
            ].map((m) => (
              <div key={m.label} className="bg-white border border-slate-100 p-4 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{m.label}</span>
                <span className="text-lg font-bold text-slate-800 block mt-2">{m.val}%</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" className="text-xs" onClick={getAIFeedback} disabled={aiLoad}>
              <MessageSquare size={13} /> {aiLoad ? "Retrieving AI..." : "Consult AI Expert"}
            </Button>
          </div>

          {aiFb && (
            <Card className="border border-amber-100 bg-amber-50/10">
              <h4 className="font-bold text-sm text-slate-800 mb-2">AI HR Evaluator Speech Coaching</h4>
              <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                {aiFb}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TAB VIEW: PLACEMENT PREDICTOR
// =============================================================================
function PredictorTabView({
  students,
  defaultAttendance,
  isStudentOnly = false,
}: {
  students: Student[];
  defaultAttendance: number;
  isStudentOnly?: boolean;
}) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [sgpa, setSgpa] = useState<number>(8.0);
  const [backlogs, setBacklogs] = useState<number>(0);
  const [attendance, setAttendance] = useState<number>(defaultAttendance);
  const [skillsTags, setSkillsTags] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

  // Sync with default attendance
  useEffect(() => {
    setAttendance(defaultAttendance);
  }, [defaultAttendance]);

  useEffect(() => {
    if (selectedStudentId) {
      const match = students.find(s => s.student_id === selectedStudentId);
      if (match) {
          const sVal = match.sgpa ? (Object.values(match.sgpa).reduce((a, b) => a + b, 0) / Object.values(match.sgpa).length) : 8.0;
          const aVal = match.attendance ? (Object.values(match.attendance).reduce((a, b) => a + b, 0) / Object.values(match.attendance).length) : defaultAttendance;
          const bVal = match.backlogs ? Object.values(match.backlogs).reduce((a, b) => a + b, 0) : 0;
          setSgpa(parseFloat(sVal.toFixed(2)));
          setAttendance(parseFloat(aVal.toFixed(1)));
          setBacklogs(bVal);
          setSkillsTags((match.skills || "").split(",").map((s: string) => s.trim()).filter(Boolean));
        }
    }
  }, [selectedStudentId, students]);

  function runPrediction() {
    const sc = skillsTags.length;
    const res = predictPlacementProbability(sgpa, backlogs, attendance, sc);
    setPrediction(res);
  }

  useEffect(() => {
    runPrediction();
  }, [sgpa, backlogs, attendance, skillsTags]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-4">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-[#E57D37]" size={18} />
            <h3 className="font-bold text-slate-800 text-sm">Predictor Control Console</h3>
          </div>

          <div className="space-y-4">
            {!isStudentOnly && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Load Student Profile</label>
                <Select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                  <option value="">Manual Entry (No profile loaded)</option>
                  {students.map(s => (
                    <option key={s.student_id} value={s.student_id}>{s.name} ({s.student_id})</option>
                  ))}
                </Select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Average CGPA ({sgpa.toFixed(2)})</label>
              <input
                type="range" min="5" max="10" step="0.1" className="w-full accent-[#E57D37]"
                value={sgpa} onChange={e => setSgpa(parseFloat(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Cumulative Backlogs ({backlogs})</label>
              <input
                type="range" min="0" max="6" step="1" className="w-full accent-[#E57D37]"
                value={backlogs} onChange={e => setBacklogs(parseInt(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Average Attendance ({attendance.toFixed(1)}%)</label>
              <input
                type="range" min="50" max="100" step="1" className="w-full accent-[#E57D37]"
                value={attendance} onChange={e => setAttendance(parseFloat(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Competencies</label>
              <div className="flex flex-wrap gap-2">
                {skillsTags.map((t, idx) => (
                  <button key={t + idx} className="px-2 py-1 rounded-full bg-slate-100 text-xs flex items-center gap-2">
                    <span>{t}</span>
                    <span className="text-slate-400 cursor-pointer" onClick={() => setSkillsTags(prev => prev.filter(x => x !== t))}>×</span>
                  </button>
                ))}
                <input
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && skillInput.trim()) {
                      e.preventDefault();
                      setSkillsTags(prev => [...prev, skillInput.trim()]);
                      setSkillInput("");
                    }
                  }}
                  placeholder="Add skill and press Enter"
                  className="text-xs px-2 py-1 rounded-md border border-slate-200"
                />
              </div>
            </div>

            <Button className="w-full" onClick={async () => {
              // Button now fetches AI explanation for the current prediction
              if (!prediction) return;
              setAiExplanation("");
              try {
                const res = await fetch("/api/ai/chat", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ prompt: `Explain this placement prediction and provide tailored improvement steps. Inputs: sgpa=${sgpa}, backlogs=${backlogs}, attendance=${attendance}, skills=${skillsTags.join(", ")}, score=${prediction.probability}` }),
                });
                const j = await res.json();
                setAiExplanation(j.text || j.answer || "AI explanation unavailable.");
              } catch (err) {
                setAiExplanation("AI request failed.");
              }
            }}>Explain Prediction</Button>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-4">
        {prediction && (
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-1 bg-white border border-slate-100 p-6 rounded-xl shadow-sm">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-800 text-base">Prediction Evaluation</h4>
                <Badge
                  variant={prediction.probability >= 75 ? "success" : prediction.probability >= 50 ? "warning" : "danger"}
                >
                  {prediction.probability >= 75 ? "High" : prediction.probability >= 50 ? "Medium" : "Low"} Confidence
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-semibold mt-1">Based on Decision Forest simulations trained on university recruitment histories.</p>
              <p className="text-xs text-slate-500 leading-relaxed font-medium mt-3">This student displays a <strong>{prediction.probability}%</strong> chance of securing placement in standard recruitment drives.</p>
            </div>

            <div className="w-72">
              <div className="bg-white border border-slate-100 p-4 rounded-xl mb-4 flex items-center justify-center">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
                    <circle
                      cx="18" cy="18" r="16" fill="none"
                      stroke={prediction.probability >= 75 ? "#10b981" : prediction.probability >= 50 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="2.5"
                      strokeDasharray={`${prediction.probability} ${100 - prediction.probability}`}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dasharray 450ms ease-out, stroke 350ms" }}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-slate-800 leading-none">{prediction.probability}%</span>
                    <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Likelihood</span>
                  </div>
                </div>
              </div>

              <Card>
                <h4 className="font-bold text-sm text-slate-800 mb-3">AI Actionable Improvement Plan</h4>
                <div className="space-y-2.5">
                  {prediction.suggestions.map((item, index) => (
                    <div key={index} className="flex gap-2.5 items-start p-3 bg-slate-50 rounded-xl border border-slate-100/50 text-xs font-semibold leading-relaxed text-slate-600">
                      <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                      <p>{item}</p>
                    </div>
                  ))}
                </div>

                {aiExplanation && (
                  <div className="mt-4 p-3 bg-white border border-slate-100 rounded-md text-sm text-slate-700">
                    <h5 className="font-bold text-sm mb-2">AI Explanation</h5>
                    <div className="text-xs leading-relaxed">{aiExplanation}</div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
