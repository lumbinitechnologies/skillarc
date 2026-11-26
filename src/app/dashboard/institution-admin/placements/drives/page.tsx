// src/app/dashboard/institution-admin/placements/drives/page.tsx
import PlacementsPortalClient from "@/components/placements/placements-portal-client";
import { getCurrentUserContext } from "@/lib/user-context";
import { loadPlacementDashboardData } from "@/lib/dashboard-read-models";
import { redirect } from "next/navigation";

export default async function InstitutionAdminPlacementsDrivesPage() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/auth/login");
  return <PlacementsPortalClient role="institution_admin" defaultTab="drives" initialData={await loadPlacementDashboardData(context)} />;
}
