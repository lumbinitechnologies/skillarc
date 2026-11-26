// src/app/dashboard/hod/placements/page.tsx
import PlacementsPortalClient from "@/components/placements/placements-portal-client";
import { getCurrentUserContext } from "@/lib/user-context";
import { loadPlacementDashboardData } from "@/lib/dashboard-read-models";
import { redirect } from "next/navigation";

export default async function HodPlacementsPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect("/auth/login")
  return <PlacementsPortalClient role="hod" initialData={await loadPlacementDashboardData(context)} />;
}
