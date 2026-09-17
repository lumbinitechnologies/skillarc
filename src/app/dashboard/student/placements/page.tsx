// src/app/dashboard/student/placements/page.tsx
import PlacementsPortalClient from "@/components/placements/placements-portal-client";
import { getCurrentUserContext } from "@/lib/user-context";
import { loadPlacementDashboardData } from "@/lib/dashboard-read-models";
import { redirect } from "next/navigation";

export default async function StudentPlacementsPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect("/auth/login")
  return <PlacementsPortalClient role="student" initialData={await loadPlacementDashboardData(context)} />;
}
