// src/app/dashboard/placements/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Users, Building2, TrendingUp, DollarSign, Award, Search, Plus, X, Video, VideoOff,
  Send, RotateCcw, FileText, ChevronRight, AlertTriangle, Mic, MicOff, BarChart2,
  MessageSquare, Download, RefreshCw, Briefcase, Calendar, Percent, Sparkles, User, GraduationCap
} from "lucide-react";
import {
  Card, StatCard, Badge, Button, Input, Select, Skeleton, SectionHeader, EmptyState
} from "@/components/placements-ui";
import {
  ApexAreaChart, ApexBarChart, ApexLineChart, ApexPieChart
} from "@/components/placements-charts";
import {
  MOCK_COMPANIES, MOCK_DRIVES, MOCK_STUDENTS, buildAnalytics, Student, Company, Drive
} from "@/lib/placements-mock";
import { predictPlacementProbability, PredictionResult } from "@/lib/placements-predictor";
import { requestTypedAssistantTask } from "@/lib/assistant/client";

type TabType = "overview" | "students" | "companies" | "drives" | "interview" | "comms" | "predictor";

export default function PlacementsDashboard() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("User");
  const [loadingRole, setLoadingRole] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // --- Dynamic Application States ---
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [drives, setDrives] = useState<Drive[]>(MOCK_DRIVES);
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [analytics, setAnalytics] = useState(buildAnalytics());

  // Re-run analytics when students or companies change
  useEffect(() => {
    setAnalytics(buildAnalytics());
  }, [students]);

  // Fetch current user details from Supabase auth
  useEffect(() => {
    async function getUserDetails() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("users")
            .select("name, role")
            .eq("id", user.id)
            .single();
          if (data) {
            setUserRole(data.role || "student");
            setUserName(data.name || user.email?.split("@")[0] || "User");
          } else {
            setUserRole("student");
            setUserName(user.email?.split("@")[0] || "User");
          }
        } else {
          // Fallback if user session is not active (e.g. local dev mock fallback)
          setUserRole("Official");
          setUserName("Placement Officer");
        }
      } catch (err) {
        console.error(err);
        setUserRole("student");
      } finally {
        setLoadingRole(false);
      }
    }
    getUserDetails();
  }, []);

  if (loadingRole) {
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

  // Determine if student role or staff/admin
  const isStudent = userRole?.toLowerCase() === "student" || userRole?.toLowerCase() === "parent";

  return (
    <div className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-950/10 p-8 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.3)] backdrop-blur-xl">
      {isStudent ? (
        <StudentPortalView
          userName={userName}
          studentId="CS2021001"
          companies={companies}
          drives={drives}
          students={students}
        />
      ) : (
        <div className="space-y-6">
          {/* Tabs bar */}
          <div className="border-b border-white/10 pb-4">
            <nav className="flex space-x-4 overflow-x-auto no-scrollbar bg-slate-950/20 px-4 py-3 rounded-[1.75rem] shadow-[0_16px_50px_-30px_rgba(15,23,42,0.3)]">
              {[
                { id: "overview", label: "Overview" },
                { id: "students", label: "Students Database" },
                { id: "companies", label: "Companies" },
                { id: "drives", label: "Drives" },
                { id: "interview", label: "Mock Interview" },
                { id: "comms", label: "Communication Coach" },
                { id: "predictor", label: "Placement Predictor" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-3 px-1 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors ${activeTab === tab.id
                      ? "border-violet-600 text-violet-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
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
              setCompanies={setCompanies}
              analytics={analytics}
            />
          )}
          {activeTab === "drives" && (
            <DrivesTabView
              drives={drives}
              setDrives={setDrives}
            />
          )}
          {activeTab === "interview" && (
            <InterviewTabView />
          )}
          {activeTab === "comms" && (
            <CommsTabView />
          )}
          {activeTab === "predictor" && (
            <PredictorTabView students={students} />
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUB-VIEW: STUDENT PORTAL VIEW
// =============================================================================
function StudentPortalView({
  userName,
  studentId,
  companies,
  drives,
  students,
}: {
  userName: string;
  studentId: string;
  companies: Company[];
  drives: Drive[];
  students: Student[];
}) {
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [subTab, setSubTab] = useState<"drives" | "interview" | "predictor">("predictor");

  useEffect(() => {
    // Find matching profile or fallback to seed
    const match = students.find(s => s.name.toLowerCase().includes(userName.toLowerCase())) || students[0];
    setStudentProfile(match);
  }, [userName, students]);

  if (!studentProfile) return <Skeleton className="h-64" />;

  // Calculate SGPA and attendance averages
  const avgSgpa = Object.values(studentProfile.sgpa).reduce((a, b) => a + b, 0) / 8;
  const avgAttendance = Object.values(studentProfile.attendance).reduce((a, b) => a + b, 0) / 8;
  const activeBacklogs = Object.values(studentProfile.backlogs).reduce((a, b) => a + b, 0);
  const skillCount = studentProfile.skills.split(",").map(s => s.trim()).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Welcome back, ${userName}`}
        subtitle={`Student ID: ${studentProfile.student_id} · Branch: ${studentProfile.branch} · Year: 4`}
      />

      {/* Stats Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Avg CGPA" value={avgSgpa.toFixed(2)} icon={<GraduationCap size={15} />} />
        <StatCard label="Avg Attendance" value={`${avgAttendance.toFixed(1)}%`} icon={<Percent size={15} />} accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="Active Backlogs" value={activeBacklogs} icon={<AlertTriangle size={15} />} accent="bg-amber-50 text-amber-600" />
        <StatCard label="Placement Status" value={studentProfile.status} icon={<Award size={15} />} accent="bg-indigo-50 text-indigo-600" />
      </div>

      {/* Sub Tabs */}
      <div className="flex bg-slate-950/20 p-1 rounded-full w-fit shadow-[0_18px_40px_-26px_rgba(15,23,42,0.4)] backdrop-blur-xl">
        {[
          { id: "predictor", label: "Predictor & Insights" },
          { id: "drives", label: "Placement Drives" },
          { id: "interview", label: "Mock Interview Terminal" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id as any)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${subTab === tab.id
                ? "bg-white/95 text-slate-950 shadow-sm"
                : "text-slate-300 hover:bg-white/10 hover:text-slate-100"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Predictor */}
      {subTab === "predictor" && (
        <PredictorTabView students={students} defaultStudentId={studentProfile.student_id} isStudentOnly />
      )}

      {/* Drives */}
      {subTab === "drives" && (
        <div className="space-y-4">
          <Card>
            <p className="text-lg font-bold text-slate-800 mb-4">Eligible Job Openings</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {drives
                .filter(d => d.eligible_branches.includes(studentProfile.branch) && avgSgpa >= d.min_cgpa && activeBacklogs <= d.backlogs_allowed)
                .map((drive) => (
                  <div key={drive.id} className="border border-white/10 rounded-[1.75rem] p-5 flex flex-col justify-between transition-all duration-200 bg-slate-950/20 text-slate-100 hover:border-violet-300 hover:bg-slate-950/30 hover:shadow-[0_20px_80px_-40px_rgba(124,58,237,0.35)]">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-slate-800">{drive.company_name}</h4>
                          <p className="text-xs text-slate-400 font-semibold">{drive.job_title} ({drive.job_type})</p>
                        </div>
                        <Badge variant="success">Eligible</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 mt-3 bg-white/5 p-3 rounded-[1.5rem] border border-white/10">
                        <p><strong>Package:</strong> ₹{drive.ctc} LPA</p>
                        <p><strong>Min CGPA:</strong> {drive.min_cgpa}</p>
                        <p><strong>Mode:</strong> {drive.interview_mode}</p>
                        <p><strong>Rounds:</strong> {drive.rounds.length}</p>
                      </div>
                    </div>
                    <Button variant="primary" className="w-full mt-4 text-xs">Apply Now</Button>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}

      {/* Mock Interview */}
      {subTab === "interview" && (
        <InterviewTabView />
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
      const j = await requestTypedAssistantTask("placement_analytics", `Analytics Data: ${JSON.stringify(analytics.kpi)}\nUser Question: ${aiQuery}`);
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
      {/* KPI strips */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Students" value={analytics.kpi.total_students.toLocaleString()} icon={<Users size={15} />} />
        <StatCard label="Placed" value={analytics.kpi.placed_students.toLocaleString()} icon={<Award size={15} />} accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="Recruiters" value={analytics.kpi.companies} icon={<Building2 size={15} />} accent="bg-cyan-50 text-cyan-600" />
        <StatCard label="Avg Package" value={`₹${analytics.kpi.avg_package.toFixed(2)} L`} icon={<DollarSign size={15} />} accent="bg-amber-50 text-amber-600" />
        <StatCard label="Placement Rate" value={`${analytics.kpi.placement_rate}%`} icon={<TrendingUp size={15} />} accent="bg-indigo-50 text-indigo-600" />
      </div>

      {/* Visual Rows */}
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

      {/* AI Analyst card */}
      <Card className="border border-violet-100 bg-violet-50/20">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="text-violet-600" size={18} />
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
          <div className="mt-4 p-4 rounded-lg bg-white border border-slate-100 text-sm text-slate-600 leading-relaxed shadow-sm">
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
      {/* Filtering Row */}
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

      {/* Roster Table */}
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
  setCompanies,
  analytics,
}: {
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  analytics: any;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newCo, setNewCo] = useState({ name: "", industry: "IT Services", location: "", email: "" });
  const [aiQ, setAiQ] = useState("");
  const [aiA, setAiA] = useState("");
  const [aiLoad, setAiL] = useState(false);

  const filtered = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const selectedStats = analytics.company_stats.find((s: any) => s.company === selected);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!newCo.name) return;
    const item: Company = {
      id: `c${companies.length + 1}`,
      name: newCo.name,
      industry: newCo.industry,
      location: newCo.location,
      email: newCo.email,
    };
    setCompanies(p => [...p, item]);
    setNewCo({ name: "", industry: "IT Services", location: "", email: "" });
    setShowForm(false);
  }

  async function askAI() {
    if (!aiQ.trim() || !selected) return;
    setAiL(true);
    try {
      const data = await requestTypedAssistantTask("placement_analytics", `Recruiter: ${selected}\nRecruiting Stats: ${JSON.stringify(selectedStats || {})}\nStudent Query: ${aiQ}`);
      setAiA(data.text);
    } catch {
      setAiA("AI connection error. Check API credentials.");
    } finally {
      setAiL(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Add button */}
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg text-slate-800">Recruiter Catalog</h3>
        <Button variant="primary" className="text-xs" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add Recruiter
        </Button>
      </div>

      {/* Form modal */}
      {showForm && (
        <Card className="border border-violet-100 bg-violet-50/10">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-sm text-slate-800">Register Recruiter</h4>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
          </div>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Company Name</label>
              <Input required value={newCo.name} onChange={e => setNewCo(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Industry Sector</label>
              <Select value={newCo.industry} onChange={e => setNewCo(p => ({ ...p, industry: e.target.value }))}>
                {["IT Services", "Consulting", "Big Tech", "E-Commerce", "FinTech", "Food Tech", "Semiconductor", "Other"].map(opt => <option key={opt}>{opt}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Corporate Headquarters</label>
              <Input value={newCo.location} onChange={e => setNewCo(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">HR Email Address</label>
              <Input type="email" value={newCo.email} onChange={e => setNewCo(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Register</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Main split display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List column */}
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
                  className={`w-full text-left p-4 rounded-xl border transition-all ${isActive
                      ? "border-violet-400 bg-violet-50/20 shadow-sm"
                      : "border-slate-100 bg-white hover:border-slate-200"
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                    <Badge variant="neutral">{c.industry}</Badge>
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

        {/* Details column */}
        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <Card className="h-64 flex flex-col justify-center items-center text-center">
              <Building2 size={32} className="text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm font-semibold">Select a recruiter to inspect analytics</p>
            </Card>
          ) : (
            <>
              {/* Detailed metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Applicants" value={selectedStats?.applicants ?? 0} />
                <StatCard label="Selected" value={selectedStats?.selected ?? 0} accent="bg-emerald-50 text-emerald-600" />
                <StatCard label="Success Ratio" value={selectedStats ? `${selectedStats.selection_rate}%` : "0%"} accent="bg-indigo-50 text-indigo-600" />
                <StatCard label="Average Package" value={selectedStats ? `₹${selectedStats.avg_package} LPA` : "—"} accent="bg-amber-50 text-amber-600" />
              </div>

              {/* Company AI helper */}
              <Card className="border border-violet-100 bg-violet-50/10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-violet-600" />
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
                  <div className="mt-3 p-4 rounded-lg bg-white border border-slate-100 text-xs text-slate-500 leading-relaxed shadow-sm">
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
  setDrives,
}: {
  drives: Drive[];
  setDrives: React.Dispatch<React.SetStateAction<Drive[]>>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    job_title: "",
    job_type: "Full Time" as "Full Time" | "Internship" | "Internship + PPO",
    ctc: "",
    vacancies: "10",
    min_cgpa: "7.0",
    backlogs_allowed: "0",
    skills_required: "",
    interview_mode: "Online" as "Online" | "Offline",
    drive_status: "Upcoming" as "Upcoming" | "Ongoing" | "Completed",
    eligible_branches: [] as string[],
  });

  const branchesList = ["CSE", "IT", "ECE", "EEE", "Mechanical", "Civil", "AI & DS"];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name || !form.job_title) return;
    const item: Drive = {
      id: `d${drives.length + 1}`,
      company_id: "c1",
      company_name: form.company_name,
      job_title: form.job_title,
      job_type: form.job_type,
      ctc: parseFloat(form.ctc) || 5,
      vacancies: parseInt(form.vacancies) || 1,
      eligible_branches: form.eligible_branches.length ? form.eligible_branches : ["CSE"],
      min_cgpa: parseFloat(form.min_cgpa) || 6.0,
      backlogs_allowed: parseInt(form.backlogs_allowed) || 0,
      skills_required: form.skills_required || "Problem Solving",
      rounds: ["Online Assessment", "Technical Interview", "HR Screen"],
      interview_mode: form.interview_mode,
      drive_status: form.drive_status,
      applied: 0,
      shortlisted: 0,
      selected: 0,
      created_at: new Date().toISOString(),
    };
    setDrives(p => [item, ...p]);
    setShowForm(false);
    setForm({
      company_name: "",
      job_title: "",
      job_type: "Full Time",
      ctc: "",
      vacancies: "10",
      min_cgpa: "7.0",
      backlogs_allowed: "0",
      skills_required: "",
      interview_mode: "Online",
      drive_status: "Upcoming",
      eligible_branches: [],
    });
  }

  function toggleBranch(branch: string) {
    setForm(p => ({
      ...p,
      eligible_branches: p.eligible_branches.includes(branch)
        ? p.eligible_branches.filter(x => x !== branch)
        : [...p.eligible_branches, branch]
    }));
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
                <label className="block text-xs font-bold text-slate-500 mb-1">Company</label>
                <Input required value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Job Designation</label>
                <Input required value={form.job_title} onChange={e => setForm(p => ({ ...p, job_title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">CTC (LPA)</label>
                <Input type="number" step="0.5" required value={form.ctc} onChange={e => setForm(p => ({ ...p, ctc: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Eligibility Criteria (CGPA)</label>
                <Input type="number" step="0.1" max="10" value={form.min_cgpa} onChange={e => setForm(p => ({ ...p, min_cgpa: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Max Active Backlogs</label>
                <Input type="number" value={form.backlogs_allowed} onChange={e => setForm(p => ({ ...p, backlogs_allowed: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Required Competencies</label>
                <Input placeholder="Java, Algorithms, SQL..." value={form.skills_required} onChange={e => setForm(p => ({ ...p, skills_required: e.target.value }))} />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-500 mb-2">Target Branches</label>
              <div className="flex flex-wrap gap-2">
                {branchesList.map(b => {
                  const active = form.eligible_branches.includes(b);
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleBranch(b)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${active
                          ? "bg-violet-600 border-violet-600 text-white"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit">Submit Registration</Button>
            </div>
          </Card>
        </form>
      )}

      {/* Drives list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {drives.map((d) => (
          <Card key={d.id} className="hover:border-slate-200 transition-all">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-bold text-slate-800 text-base leading-none">{d.company_name}</h4>
                <p className="text-xs font-semibold text-slate-400 mt-1">{d.job_title} ({d.job_type})</p>
              </div>
              <Badge variant={d.drive_status === "Completed" ? "neutral" : d.drive_status === "Ongoing" ? "warning" : "info"}>
                {d.drive_status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs font-medium text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p><strong>Package:</strong> ₹{d.ctc} LPA</p>
              <p><strong>Vacancies:</strong> {d.vacancies}</p>
              <p><strong>Eligibility:</strong> {d.min_cgpa} CGPA / {d.backlogs_allowed} Backlogs</p>
              <p><strong>Mode:</strong> {d.interview_mode}</p>
            </div>

            <div className="mt-3 flex justify-between items-center text-xs text-slate-400">
              <p>Branches: {d.eligible_branches.join(", ")}</p>
              {d.drive_status === "Completed" && (
                <p className="text-emerald-600 font-bold">{d.selected} Placed</p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// TAB VIEW: AI MOCK INTERVIEW
// =============================================================================
function InterviewTabView() {
  const [phase, setPhase] = useState<"config" | "active" | "report">("config");
  const [role, setRole] = useState("Software Engineer");
  const [difficulty, setDiff] = useState<"Entry" | "Mid" | "Senior">("Entry");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [logs, setLogs] = useState<{ question: string; answer: string; feedback: string; score: number; }[]>([]);
  const [feedback, setFeedback] = useState("");
  const [report, setReport] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoad] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [warnings, setWarnings] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Proctoring timer
  useEffect(() => {
    if (phase === "active") {
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // Camera toggle
  const toggleCamera = async () => {
    if (camOn) {
      streamRef.current?.getTracks().forEach(track => track.stop());
      setCamOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamOn(true);
      } catch {
        alert("Webcam device is not available.");
      }
    }
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  async function startInterview() {
    setLoad(true);
    try {
      const data = await requestTypedAssistantTask("interview_question", `Formulate ONE high-end interview question in a technical capacity for a ${difficulty} level ${role}.`);
      setQuestion(data.data?.question ?? data.text);
      setPhase("active");
    } catch {
      alert("AI failed to prepare question.");
    } finally {
      setLoad(false);
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) return;
    setLoad(true);
    try {
      const data = await requestTypedAssistantTask("interview_answer_evaluation", `Interviewer Question: "${question}"\nCandidate Spoken Response: "${answer}"`);
      const evaluation = data.data;
      const feedback = evaluation ? `Score: ${evaluation.score}/10\n\nStrengths:\n- ${evaluation.strengths.join("\n- ")}\n\nWeaknesses:\n- ${evaluation.weaknesses.join("\n- ")}\n\nImprovements:\n- ${evaluation.improvements.join("\n- ")}\n\nVerdict:\n${evaluation.verdict}` : data.text;
      setFeedback(feedback);
      setLogs(p => [...p, { question, answer, feedback, score: evaluation?.score ?? 0 }]);
    } catch {
      alert("Failed to evaluate response.");
    } finally {
      setLoad(false);
    }
  }

  async function fetchNextQuestion() {
    setLoad(true);
    setAnswer("");
    setFeedback("");
    try {
      const data = await requestTypedAssistantTask("interview_question", `Provide the next interview question for a ${difficulty} ${role} role. Make it relevant to standard corporate processes.`);
      setQuestion(data.data?.question ?? data.text);
    } catch {
      alert("Failed to load question.");
    } finally {
      setLoad(false);
    }
  }

  async function generateFinalReport() {
    setLoad(true);
    // stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      setCamOn(false);
    }
    try {
      const data = await requestTypedAssistantTask("interview_report", `Interview Logs: ${JSON.stringify(logs)}\nTarget Role: ${role}\nDifficulty: ${difficulty}\n\nCompile a comprehensive performance summary, overall score out of 10, list strengths, areas to improve, and a customized 30-day preparation plan.`);
      setReport(data.text);
      setPhase("report");
    } catch {
      alert("Failed to summarize interview.");
    } finally {
      setLoad(false);
    }
  }

  function reset() {
    setPhase("config");
    setLogs([]);
    setQuestion("");
    setAnswer("");
    setFeedback("");
    setReport("");
    setElapsed(0);
    setWarnings(0);
  }

  const formatTime = (s: number) => {
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  };

  const avgScore = logs.length ? Math.round(logs.reduce((acc, x) => acc + x.score, 0) / logs.length) : 0;

  if (phase === "config") {
    return (
      <div className="space-y-6 max-w-xl">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Video className="text-violet-600" size={18} />
            <h3 className="font-bold text-slate-800">AI Adaptive Interview Setup</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Target Position</label>
              <Select value={role} onChange={e => setRole(e.target.value)}>
                {["Software Engineer", "AI/ML Engineer", "Data Engineer", "Cloud Consultant", "Full Stack Developer", "QA Analyst"].map(opt => <option key={opt}>{opt}</option>)}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Interview Standard</label>
              <div className="flex gap-2">
                {["Entry", "Mid", "Senior"].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDiff(lvl as any)}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${difficulty === lvl
                        ? "bg-violet-50 text-violet-600 border-violet-400"
                        : "bg-white border-slate-200 text-slate-400"
                      }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="primary" className="w-full" onClick={startInterview} disabled={loading}>
              {loading ? "Preparing terminal..." : "Initialize Interview"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === "report") {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">Evaluation Report</h3>
          <Button variant="secondary" className="text-xs" onClick={reset}>
            <RotateCcw size={14} /> Retake Assessment
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-100 rounded-xl p-5 text-center">
            <p className="text-xs font-bold text-slate-400 uppercase">Questions Taken</p>
            <p className="text-3xl font-extrabold text-slate-800 mt-2">{logs.length}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-5 text-center">
            <p className="text-xs font-bold text-slate-400 uppercase">Average Score</p>
            <p className={`text-3xl font-extrabold mt-2 ${avgScore >= 7 ? "text-emerald-600" : "text-amber-500"}`}>
              {avgScore}/10
            </p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-5 text-center">
            <p className="text-xs font-bold text-slate-400 uppercase">Duration</p>
            <p className="text-3xl font-extrabold text-slate-800 mt-2">{formatTime(elapsed)}</p>
          </div>
        </div>

        <Card>
          <p className="text-sm font-bold text-slate-700 mb-3">AI Technical Assessment Summary</p>
          <div className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap font-medium">
            {report}
          </div>
        </Card>
      </div>
    );
  }

  // Active Phase
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* QA column */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border border-violet-100 bg-violet-50/5">
          <div className="flex justify-between items-center mb-3">
            <Badge variant="info">{difficulty} Level</Badge>
            <span className="font-mono text-xs text-slate-400">{formatTime(elapsed)}</span>
          </div>
          <p className="text-slate-800 font-bold text-base leading-relaxed">{question}</p>
        </Card>

        <Card>
          <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Your Answer</label>
          <textarea
            className="w-full h-40 p-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition-colors font-mono"
            placeholder="Type your coding solutions or explanations here..."
            value={answer}
            onChange={e => setAnswer(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-4">
            {logs.length > 0 && !feedback && (
              <Button variant="secondary" onClick={fetchNextQuestion}>Skip Question</Button>
            )}
            <Button onClick={submitAnswer} disabled={loading || !answer.trim()}>
              {loading ? "Analyzing..." : "Submit Answer"}
            </Button>
          </div>
        </Card>

        {feedback && (
          <Card className="border border-emerald-100 bg-emerald-50/5">
            <h4 className="font-bold text-sm text-emerald-800 mb-2">Immediate Feedback</h4>
            <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
              {feedback}
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <Button variant="secondary" className="text-xs" onClick={generateFinalReport}>End Interview</Button>
              <Button variant="primary" className="text-xs" onClick={fetchNextQuestion}>Next Question</Button>
            </div>
          </Card>
        )}
      </div>

      {/* Camera / Proctoring column */}
      <div className="space-y-4">
        <Card className="p-4 text-center">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase">Camera Proctoring</span>
            <Button variant="secondary" className="text-[10px] py-1 px-2.5 h-auto" onClick={toggleCamera}>
              {camOn ? <VideoOff size={11} /> : <Video size={11} />} {camOn ? "Disable" : "Enable"}
            </Button>
          </div>
          <div className="aspect-video bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden relative">
            <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${camOn ? "" : "hidden"}`} />
            {!camOn && <VideoOff className="text-slate-300" size={24} />}
          </div>
          {camOn && (
            <div className="mt-3 flex items-center gap-1.5 justify-center text-xs text-emerald-600 font-semibold bg-emerald-50 py-1.5 rounded-lg">
              <span>●</span> Monitoring candidate behavior
            </div>
          )}
        </Card>

        <Card>
          <h4 className="font-bold text-xs text-slate-400 mb-3 uppercase">Session Tracking</h4>
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>Progress</span>
              <span>{logs.length} / 5 Questions</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-violet-600 transition-all duration-300" style={{ width: `${(logs.length / 5) * 100}%` }} />
            </div>
            {logs.length > 0 && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                {logs.map((log, index) => (
                  <div key={index} className="flex justify-between items-center text-xs font-medium text-slate-500">
                    <span>Question {index + 1}</span>
                    <Badge variant={log.score >= 7 ? "success" : log.score >= 5 ? "warning" : "danger"}>
                      {log.score}/10
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
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
      const data = await requestTypedAssistantTask("communication_feedback", `Evaluate interview spoken response communication quality: "${text}". Summarize strictly under Strengths, Weaknesses, Specific Improvements, Verdict.`);
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
          className="w-full h-36 p-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition-colors"
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
            <div className="w-16 h-16 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center font-extrabold text-xl">
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

          {/* AI HR evaluation */}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" className="text-xs" onClick={getAIFeedback} disabled={aiLoad}>
              <MessageSquare size={13} /> {aiLoad ? "Retrieving AI..." : "Consult AI Expert"}
            </Button>
          </div>

          {aiFb && (
            <Card className="border border-violet-100 bg-violet-50/5">
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
  defaultStudentId,
  isStudentOnly = false,
}: {
  students: Student[];
  defaultStudentId?: string;
  isStudentOnly?: boolean;
}) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(defaultStudentId || "");
  const [sgpa, setSgpa] = useState<number>(8.0);
  const [backlogs, setBacklogs] = useState<number>(0);
  const [attendance, setAttendance] = useState<number>(85);
  const [skillsTags, setSkillsTags] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

  // Sync inputs with selected student profile
  useEffect(() => {
    if (selectedStudentId) {
      const match = students.find(s => s.student_id === selectedStudentId);
      if (match) {
        const sVal = Object.values(match.sgpa).reduce((a, b) => a + b, 0) / 8;
        const aVal = Object.values(match.attendance).reduce((a, b) => a + b, 0) / 8;
        const bVal = Object.values(match.backlogs).reduce((a, b) => a + b, 0);
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

  // Auto-run first load
  useEffect(() => {
    runPrediction();
  }, [sgpa, backlogs, attendance, skillsTags]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Controls column */}
      <div className="space-y-4">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-violet-600" size={18} />
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
                type="range" min="5" max="10" step="0.1" className="w-full accent-violet-600"
                value={sgpa} onChange={e => setSgpa(parseFloat(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Cumulative Backlogs ({backlogs})</label>
              <input
                type="range" min="0" max="6" step="1" className="w-full accent-violet-600"
                value={backlogs} onChange={e => setBacklogs(parseInt(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Average Attendance ({attendance.toFixed(1)}%)</label>
              <input
                type="range" min="50" max="100" step="1" className="w-full accent-violet-600"
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
              if (!prediction) return;
              setAiExplanation("");
              try {
                const j = await requestTypedAssistantTask("placement_prediction_explanation", `Explain this placement prediction and provide tailored improvement steps. Inputs: sgpa=${sgpa}, backlogs=${backlogs}, attendance=${attendance}, skills=${skillsTags.join(", ")}, score=${prediction.probability}`);
                setAiExplanation(j.data?.summary ? `${j.data.summary}\n\nFactors:\n- ${j.data.factors.join("\n- ")}\n\nCaveats:\n- ${j.data.caveats.join("\n- ")}` : j.text || "AI explanation unavailable.");
              } catch (err) {
                setAiExplanation("AI request failed.");
              }
            }}>Explain Prediction</Button>
          </div>
        </Card>
      </div>

      {/* Analysis reports column */}
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
                      <span className="text-violet-600 font-bold shrink-0 mt-0.5">✓</span>
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
