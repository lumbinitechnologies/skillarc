// src/app/dashboard/institution-admin/placements/page.tsx
import PlacementsPortalClient from "@/components/placements/placements-portal-client";
import { getCurrentUserContext } from "@/lib/user-context";
import { loadPlacementDashboardData } from "@/lib/dashboard-read-models";
import { redirect } from "next/navigation";

export default async function InstitutionAdminPlacementsPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect("/auth/login")
  const data = await loadPlacementDashboardData(context)
  return <PlacementsPortalClient role="institution_admin" defaultTab="overview" initialData={data} />;
}
