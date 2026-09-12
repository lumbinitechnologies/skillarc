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

          const { data: attendanceData } = await supabase
            .from("attendance_records")
            .select("status")
            .eq("student_id", user.id);

          if (attendanceData && attendanceData.length > 0) {
            const present = attendanceData.filter(r => r.status === "PRESENT" || r.status === "LATE").length;
            setDbAttendancePercent(Math.round((present / attendanceData.length) * 100));
          }

          const { data: apps } = await supabase
            .from("applications")
            .select("*, job_posts(title, company_id)")
            .eq("student_id", user.id);
      
          if (apps) {
            setStudentApplications(apps);
          }

          setUserId(user.id);
        } else {
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
      let compsQuery = supabase
        .from("companies")
        .select("*")
        .order("name", { ascending: true });

      if (institutionId) {
        compsQuery = compsQuery.eq("institution_id", institutionId);
      }

      const { data: comps, error: compErr } = await compsQuery;
      if (compErr) throw compErr;

      let postsQuery = supabase
        .from("job_posts")
        .select("*, companies(name, website, description)");

      if (institutionId) {
        postsQuery = postsQuery.eq("institution_id", institutionId);
      }

      const { data: posts, error: postErr } = await postsQuery;
      if (postErr) throw postErr;

      const fetchedCompanies: Company[] = (comps || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        industry: "Technology",
        location: c.website || "Corporate",
        email: "recruiting@" + (c.website || "company.com"),
      }));

      const fetchedDrives: Drive[] = (posts || []).map((p: any) => {
        let deadlineStr = p.deadline || "2026-07-15";
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

      function computeAnalytics(studs: Student[], compsList: Company[], drivesList: Drive[]) {
        const total = studs.length;
        const placed = studs.filter(s => s.status === "Placed");
        const placedN = placed.length;
        const avgPkg = placed.reduce((a, s) => a + (s.package || 0), 0) / (placedN || 1);

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
                    const active = activeTab === tab.id;
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
                    );
                  });
                })()
              }
            </div>

            {activeTab === "overview" && <OverviewTabView analytics={analytics} />}
            {activeTab === "students" && <StudentsTabView students={students} />}
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
            {activeTab === "comms" && <CommsTabView />}
            {activeTab === "predictor" && (
              <PredictorTabView students={students} defaultAttendance={dbAttendancePercent} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
