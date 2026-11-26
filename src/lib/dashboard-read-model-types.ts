import type {
  BranchStat,
  Company,
  CompanyStat,
  Drive,
  KPIData,
  Student,
  YearlyTrend,
} from "@/lib/placements-mock"

export type PlacementAnalytics = {
  kpi: KPIData
  trend: YearlyTrend[]
  branches: BranchStat[]
  company_stats: CompanyStat[]
}

export type PlacementApplication = {
  id?: string
  student_id?: string
  job_post_id?: string
  status?: string
  resume_url?: string | null
  job_posts?: unknown
}

export type PlacementDashboardData = {
  companies: Company[]
  drives: Drive[]
  students: Student[]
  analytics: PlacementAnalytics
  studentApplications: PlacementApplication[]
  attendancePercent: number
}

export type DashboardEvent = {
  id: string
  name: string
  department: string
  date: string
  time: string
  location: string
  description: string
  capacity: number
  filled: number
  organizer: string
  organizerRole?: string
  staff_coord_phone?: string
  student_coord?: string
  student_coord_phone?: string
  tags: string[]
  registeredUsers: string[]
  image_url?: string | null
  gallery_images?: Array<{
    url: string
    caption?: string
    uploaded_at?: string
    uploaded_by?: string
  }>
}

export type EventsDashboardData = {
  events: DashboardEvent[]
  departments: Array<{ id: string; name: string }>
}
