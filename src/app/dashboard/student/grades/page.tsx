import { redirect } from "next/navigation"

export default function StudentGradesRedirectPage() {
  redirect("/dashboard/student/report-card")
}
