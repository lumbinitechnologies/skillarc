// src/lib/placements-mock.ts — Type definitions & mock dataset for Placements module

// ── Type Definitions ──────────────────────────────────────────────────────────
export type PlacementsRole = "Official" | "Admin" | "Student";

export interface Student {
  student_id: string;
  name: string;
  branch: string;
  year: number;
  skills: string;         // comma-separated
  hackathons: number;
  papers: number;
  conferences: number;
  sports: number;
  clubs: number;
  status: "Placed" | "Not Placed" | "Rejected";
  company?: string;
  package?: number;       // LPA
  placed_date?: string;
  sgpa: Record<`sem${1|2|3|4|5|6|7|8}`, number>;
  backlogs: Record<`sem${1|2|3|4|5|6|7|8}`, number>;
  attendance: Record<`sem${1|2|3|4|5|6|7|8}`, number>;
}

export interface Company {
  id: string;
  name: string;
  website?: string;
  location?: string;
  industry: string;
  contact_person?: string;
  email?: string;
  phone?: string;
}

export interface Drive {
  id: string;
  company_id: string;
  company_name: string;
  job_title: string;
  job_type: "Full Time" | "Internship" | "Internship + PPO";
  ctc: number;
  vacancies: number;
  eligible_branches: string[];
  min_cgpa: number;
  backlogs_allowed: number;
  skills_required: string;
  rounds: string[];
  interview_mode: "Online" | "Offline";
  ppt_date?: string;
  test_date?: string;
  interview_date?: string;
  offer_date?: string;
  joining_date?: string;
  drive_status: "Upcoming" | "Ongoing" | "Completed";
  applied: number;
  shortlisted: number;
  selected: number;
  created_at: string;
}

export interface KPIData {
  total_students: number;
  placed_students: number;
  companies: number;
  avg_package: number;
  placement_rate: number;
}

export interface YearlyTrend {
  year: number;
  placements: number;
  placement_rate: number;
  avg_package: number;
}

export interface BranchStat {
  branch: string;
  placements: number;
  total: number;
  rate: number;
}

export interface CompanyStat {
  company: string;
  applicants: number;
  selected: number;
  avg_package: number;
  selection_rate: number;
}

// ── Companies ────────────────────────────────────────────────────────────────
export const MOCK_COMPANIES: Company[] = [
  { id: "c1",  name: "TCS",             website: "https://tcs.com",         location: "Mumbai",    industry: "IT Services",    contact_person: "Rahul Mehta",   email: "campus@tcs.com",       phone: "+91-22-67789999" },
  { id: "c2",  name: "Infosys",         website: "https://infosys.com",     location: "Bangalore", industry: "IT Services",    contact_person: "Priya Sharma",  email: "campus@infosys.com",   phone: "+91-80-22940000" },
  { id: "c3",  name: "Wipro",           website: "https://wipro.com",       location: "Bangalore", industry: "IT Services",    contact_person: "Amit Gupta",    email: "campus@wipro.com",     phone: "+91-80-28440011" },
  { id: "c4",  name: "Google",          website: "https://google.com",      location: "Hyderabad", industry: "Big Tech",       contact_person: "Neha Joshi",    email: "univ@google.com",      phone: "+91-40-67350000" },
  { id: "c5",  name: "Microsoft",       website: "https://microsoft.com",   location: "Hyderabad", industry: "Big Tech",       contact_person: "Arjun Nair",    email: "campus@microsoft.com", phone: "+91-40-44256000" },
  { id: "c6",  name: "Amazon",          website: "https://amazon.com",      location: "Hyderabad", industry: "Big Tech",       contact_person: "Deepa Rao",     email: "campus@amazon.com",    phone: "+91-40-49004000" },
  { id: "c7",  name: "Flipkart",        website: "https://flipkart.com",    location: "Bangalore", industry: "E-Commerce",     contact_person: "Vijay Kumar",   email: "hr@flipkart.com",      phone: "+91-80-40816000" },
  { id: "c8",  name: "Accenture",       website: "https://accenture.com",   location: "Mumbai",    industry: "Consulting",     contact_person: "Sonal Patel",   email: "campus@accenture.com", phone: "+91-22-67578000" },
  { id: "c9",  name: "Deloitte",        website: "https://deloitte.com",    location: "Mumbai",    industry: "Consulting",     contact_person: "Ravi Iyer",     email: "campus@deloitte.com",  phone: "+91-22-61856000" },
  { id: "c10", name: "HCL Technologies",website: "https://hcltech.com",     location: "Noida",     industry: "IT Services",    contact_person: "Sunita Verma",  email: "campus@hcl.com",       phone: "+91-120-3000000" },
  { id: "c11", name: "Tech Mahindra",   website: "https://techmahindra.com",location: "Pune",      industry: "IT Services",    contact_person: "Prakash Singh", email: "campus@techmahindra.com", phone: "+91-20-25191000" },
  { id: "c12", name: "Swiggy",          website: "https://swiggy.com",      location: "Bangalore", industry: "Food Tech",      contact_person: "Anjali Roy",    email: "campus@swiggy.com",    phone: "+91-80-68181000" },
  { id: "c13", name: "Razorpay",        website: "https://razorpay.com",    location: "Bangalore", industry: "FinTech",        contact_person: "Karthik Menon", email: "campus@razorpay.com",  phone: "+91-80-61998000" },
  { id: "c14", name: "PhonePe",         website: "https://phonepe.com",     location: "Bangalore", industry: "FinTech",        contact_person: "Meera Das",     email: "campus@phonepe.com",   phone: "+91-80-67867000" },
  { id: "c15", name: "NVIDIA",          website: "https://nvidia.com",      location: "Pune",      industry: "Semiconductor",  contact_person: "Saurabh Jain",  email: "campus@nvidia.com",    phone: "+91-20-30252000" },
];

function semRecord(vals: number[]): Record<string, number> {
  const keys = ["sem1","sem2","sem3","sem4","sem5","sem6","sem7","sem8"] as const;
  return Object.fromEntries(keys.map((k, i) => [k, vals[i] ?? 0]));
}

// ── Students ─────────────────────────────────────────────────────────────────
const NAMES = [
  "Aarav Sharma","Priya Patel","Rohan Mehta","Sneha Iyer","Amit Kumar",
  "Divya Nair","Rahul Gupta","Ananya Singh","Vikram Rao","Pooja Reddy",
  "Arjun Joshi","Kavya Menon","Deepak Verma","Ritika Das","Saurabh Pandey",
  "Meera Krishnan","Kiran Bhat","Swati Agarwal","Nikhil Jain","Tanvi Desai",
  "Akash Mishra","Riya Shah","Manish Tiwari","Neha Saxena","Harshit Bajaj",
  "Preethi Naidu","Suresh Pillai","Ayesha Khan","Kartik Malhotra","Ishaan Roy",
  "Siddharth Choudhary","Lakshmi Venkat","Gaurav Tripathi","Nidhi Kulkarni","Abhijit Sen",
  "Pallavi Gowda","Rohit Dubey","Chandni Rawat","Manoj Kaur","Shruti Deshpande",
  "Varun Nambiar","Aditi Banerjee","Rajesh Yadav","Preeti Ghosh","Surya Murthy",
  "Isha Thakur","Dev Bose","Nisha Chatterjee","Aditya Pillai","Ruchi Patil",
];

const BRANCHES = ["CSE","IT","ECE","EEE","Mechanical","Civil","AI & DS"];
const COMPANIES_FOR_PLACEMENT = ["TCS","Infosys","Wipro","Google","Microsoft","Amazon","Flipkart","Accenture","HCL Technologies","Tech Mahindra","Swiggy","Razorpay"];
const SKILLS_POOL = ["Python","Java","C++","React","Node.js","SQL","Machine Learning","Data Analysis","JavaScript","TypeScript","AWS","Docker","Kubernetes","Git","TensorFlow"];

function pickN<T>(arr: T[], n: number, seed: number): T[] {
  const res: T[] = [];
  for (let i = 0; i < n; i++) res.push(arr[(seed * (i + 3) + i * 7) % arr.length]);
  return [...new Set(res)];
}

export const MOCK_STUDENTS: Student[] = NAMES.map((name, i) => {
  const branch = BRANCHES[i % BRANCHES.length];
  const year = 4;
  const seed = i + 1;
  const statusRoll = seed % 10;
  const status: "Placed" | "Not Placed" | "Rejected" =
    statusRoll < 6 ? "Placed" : statusRoll < 8 ? "Not Placed" : "Rejected";
  const company = status === "Placed" ? COMPANIES_FOR_PLACEMENT[i % COMPANIES_FOR_PLACEMENT.length] : undefined;
  const pkg = status === "Placed" ? (6 + (seed % 20)) : undefined;
  const placedDate = status === "Placed" ? `24` + `-${String((i % 12) + 1).padStart(2,"0")}-${String((i % 28) + 1).padStart(2,"0")}` : undefined;

  const sgpaBase = 7.0 + (seed % 20) * 0.1;
  const sgpaVals = Array.from({length: 8}, (_, s) => Math.min(10, parseFloat((sgpaBase + s * 0.05 + (seed % 3) * 0.1).toFixed(2))));

  return {
    student_id: `${branch.replace(/\s/g,"").slice(0,2).toUpperCase()}20${20 + (i % 4)}${String(seed).padStart(3,"0")}`,
    name,
    branch,
    year,
    skills: pickN(SKILLS_POOL, 4, seed).join(", "),
    hackathons: seed % 5,
    papers: seed % 3,
    conferences: seed % 4,
    sports: seed % 3,
    clubs: seed % 4,
    status,
    company,
    package: pkg,
    placed_date: placedDate,
    sgpa: semRecord(sgpaVals),
    backlogs: semRecord([0, 0, seed % 2, 0, 0, 0, 0, 0]),
    attendance: semRecord([85, 88, 82, 90, 87, 91, 89, 92].map(v => Math.min(100, v + seed % 5))),
  };
});

// ── Drives ───────────────────────────────────────────────────────────────────
export const MOCK_DRIVES: Drive[] = [
  {
    id: "d1", company_id: "c1", company_name: "TCS",
    job_title: "System Engineer", job_type: "Full Time",
    ctc: 7, vacancies: 40, eligible_branches: ["CSE","IT","ECE"],
    min_cgpa: 6.5, backlogs_allowed: 0,
    skills_required: "Java, SQL, Problem Solving",
    rounds: ["Online Test","Technical Interview","HR Interview"],
    interview_mode: "Online",
    ppt_date: "2024-07-10", test_date: "2024-07-20", interview_date: "2024-08-05",
    offer_date: "2024-08-15", joining_date: "2025-01-15",
    drive_status: "Completed", applied: 120, shortlisted: 45, selected: 30, created_at: "2024-07-01T10:00:00Z",
  },
  {
    id: "d2", company_id: "c2", company_name: "Infosys",
    job_title: "Systems Engineer", job_type: "Full Time",
    ctc: 6.5, vacancies: 35, eligible_branches: ["CSE","IT","ECE","EEE"],
    min_cgpa: 6.0, backlogs_allowed: 0,
    skills_required: "C++, Python, DBMS",
    rounds: ["Aptitude Test","Technical Interview","HR Round"],
    interview_mode: "Online",
    ppt_date: "2024-07-15", test_date: "2024-07-25", interview_date: "2024-08-10",
    offer_date: "2024-08-20", joining_date: "2025-02-01",
    drive_status: "Completed", applied: 98, shortlisted: 40, selected: 28, created_at: "2024-07-05T09:00:00Z",
  },
  {
    id: "d3", company_id: "c4", company_name: "Google",
    job_title: "Software Engineer", job_type: "Full Time",
    ctc: 45, vacancies: 5, eligible_branches: ["CSE","IT","AI & DS"],
    min_cgpa: 8.5, backlogs_allowed: 0,
    skills_required: "Algorithms, System Design, Python/C++, LeetCode",
    rounds: ["OA","Phone Screen","3× Technical Interview","Hiring Committee"],
    interview_mode: "Online",
    ppt_date: "2024-08-01", test_date: "2024-08-10", interview_date: "2024-09-01",
    offer_date: "2024-09-20", joining_date: "2025-07-01",
    drive_status: "Completed", applied: 65, shortlisted: 20, selected: 4, created_at: "2024-07-20T08:00:00Z",
  },
  {
    id: "d4", company_id: "c5", company_name: "Microsoft",
    job_title: "Software Development Engineer", job_type: "Full Time",
    ctc: 40, vacancies: 8, eligible_branches: ["CSE","IT","AI & DS"],
    min_cgpa: 8.0, backlogs_allowed: 0,
    skills_required: "DSA, OOP, C#/Java/C++, Azure",
    rounds: ["OA","3× Technical Interview","HR"],
    interview_mode: "Online",
    ppt_date: "2024-08-05", test_date: "2024-08-15", interview_date: "2024-09-05",
    offer_date: "2024-09-25", joining_date: "2025-07-15",
    drive_status: "Completed", applied: 70, shortlisted: 22, selected: 7, created_at: "2024-07-25T08:00:00Z",
  },
  {
    id: "d5", company_id: "c13", company_name: "Razorpay",
    job_title: "Software Development Engineer", job_type: "Full Time",
    ctc: 22, vacancies: 12, eligible_branches: ["CSE","IT","AI & DS"],
    min_cgpa: 7.5, backlogs_allowed: 0,
    skills_required: "React, Node.js, Microservices, SQL",
    rounds: ["Coding Test","Technical 1","Technical 2","HR"],
    interview_mode: "Online",
    ppt_date: "2024-09-01", test_date: "2024-09-10", interview_date: "2024-09-25",
    offer_date: "2024-10-05", joining_date: "2025-06-01",
    drive_status: "Ongoing", applied: 55, shortlisted: 18, selected: 0, created_at: "2024-08-25T10:00:00Z",
  },
  {
    id: "d6", company_id: "c12", company_name: "Swiggy",
    job_title: "SDE Intern", job_type: "Internship + PPO",
    ctc: 10, vacancies: 15, eligible_branches: ["CSE","IT","ECE","AI & DS"],
    min_cgpa: 7.0, backlogs_allowed: 1,
    skills_required: "Java/Python, Backend, REST APIs, SQL",
    rounds: ["Coding Round","Technical Interview","Culture Fit"],
    interview_mode: "Online",
    ppt_date: "2024-09-20", test_date: "2024-09-28", interview_date: "2024-10-10",
    offer_date: "2024-10-20", joining_date: "2025-05-15",
    drive_status: "Upcoming", applied: 0, shortlisted: 0, selected: 0, created_at: "2024-09-15T09:00:00Z",
  },
  {
    id: "d7", company_id: "c8", company_name: "Accenture",
    job_title: "Associate Software Engineer", job_type: "Full Time",
    ctc: 8, vacancies: 50, eligible_branches: ["CSE","IT","ECE","EEE","Mechanical"],
    min_cgpa: 6.0, backlogs_allowed: 0,
    skills_required: "Core Java, SQL, Communication",
    rounds: ["Aptitude","Coding","HR Interview"],
    interview_mode: "Offline",
    ppt_date: "2024-07-18", test_date: "2024-07-28", interview_date: "2024-08-12",
    offer_date: "2024-08-22", joining_date: "2025-01-20",
    drive_status: "Completed", applied: 140, shortlisted: 60, selected: 42, created_at: "2024-07-10T10:00:00Z",
  },
  {
    id: "d8", company_id: "c15", company_name: "NVIDIA",
    job_title: "Deep Learning Engineer", job_type: "Full Time",
    ctc: 35, vacancies: 6, eligible_branches: ["CSE","ECE","AI & DS"],
    min_cgpa: 8.5, backlogs_allowed: 0,
    skills_required: "CUDA, TensorFlow/PyTorch, C++, GPU Architecture",
    rounds: ["Online Assessment","3× Technical Interviews","HR"],
    interview_mode: "Online",
    ppt_date: "2024-10-01", test_date: "2024-10-10", interview_date: "2024-10-25",
    offer_date: "2024-11-05", joining_date: "2025-07-01",
    drive_status: "Upcoming", applied: 0, shortlisted: 0, selected: 0, created_at: "2024-09-20T08:00:00Z",
  },
];

// ── Analytics (derived from students) ────────────────────────────────────────
export function buildAnalytics() {
  const students = MOCK_STUDENTS;
  const total = students.length;
  const placed = students.filter(s => s.status === "Placed");
  const placedN = placed.length;
  const avgPkg = placed.reduce((a, s) => a + (s.package ?? 0), 0) / (placedN || 1);

  const yearMap: Record<number, { placements: number; total: number; pkgSum: number }> = {};
  for (let y = 2020; y <= 2024; y++) yearMap[y] = { placements: 0, total: 0, pkgSum: 0 };
  students.forEach((s, i) => {
    const yr = 2020 + (i % 5);
    yearMap[yr].total++;
    if (s.status === "Placed") {
      yearMap[yr].placements++;
      yearMap[yr].pkgSum += s.package ?? 0;
    }
  });

  const trend = Object.entries(yearMap)
    .sort(([a],[b]) => Number(a) - Number(b))
    .map(([year, v]) => ({
      year: Number(year),
      placements: v.placements,
      placement_rate: Math.round((v.placements / (v.total || 1)) * 1000) / 10,
      avg_package: Math.round(v.pkgSum / (v.placements || 1) * 100) / 100,
    }));

  const branchMap: Record<string, { placed: number; total: number }> = {};
  students.forEach(s => {
    if (!branchMap[s.branch]) branchMap[s.branch] = { placed: 0, total: 0 };
    branchMap[s.branch].total++;
    if (s.status === "Placed") branchMap[s.branch].placed++;
  });

  const branches = Object.entries(branchMap).map(([branch, v]) => ({
    branch,
    placements: v.placed,
    total: v.total,
    rate: Math.round((v.placed / v.total) * 1000) / 10,
  }));

  const compMap: Record<string, { selected: number; pkgSum: number; total: number }> = {};
  students.forEach(s => {
    if (!s.company) return;
    if (!compMap[s.company]) compMap[s.company] = { selected: 0, pkgSum: 0, total: 0 };
    compMap[s.company].total++;
    if (s.status === "Placed") {
      compMap[s.company].selected++;
      compMap[s.company].pkgSum += s.package ?? 0;
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
      companies: MOCK_COMPANIES.length,
      avg_package: Math.round(avgPkg * 100) / 100,
      placement_rate: Math.round((placedN / total) * 1000) / 10,
    },
    trend,
    branches,
    company_stats,
  };
}
