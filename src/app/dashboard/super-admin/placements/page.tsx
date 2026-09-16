// src/app/dashboard/super-admin/placements/page.tsx
import PlacementsPortalClient from "@/components/placements/placements-portal-client";
import { getCurrentUserContext } from "@/lib/user-context";
import { loadPlacementDashboardData } from "@/lib/dashboard-read-models";
import { redirect } from "next/navigation";

export default async function SuperAdminPlacementsPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect("/auth/login")
  return <PlacementsPortalClient role="super-admin" initialData={await loadPlacementDashboardData(context)} />;
}
