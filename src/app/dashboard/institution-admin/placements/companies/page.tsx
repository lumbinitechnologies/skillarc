// src/app/dashboard/institution-admin/placements/companies/page.tsx
import PlacementsPortalClient from "@/components/placements/placements-portal-client";
import { getCurrentUserContext } from "@/lib/user-context";
import { loadPlacementDashboardData } from "@/lib/dashboard-read-models";
import { redirect } from "next/navigation";

export default async function InstitutionAdminPlacementsCompaniesPage() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/auth/login");
  return <PlacementsPortalClient role="institution_admin" defaultTab="companies" initialData={await loadPlacementDashboardData(context)} />;
}
