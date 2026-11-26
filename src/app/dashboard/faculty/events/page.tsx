// src/app/dashboard/faculty/events/page.tsx
import EventsPortalClient from "@/components/events/events-portal-client";
import { getCurrentUserContext } from "@/lib/user-context";
import { loadEventsDashboardData } from "@/lib/dashboard-read-models";
import { redirect } from "next/navigation";

export default async function FacultyEventsPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect("/auth/login")
  return <EventsPortalClient initialData={await loadEventsDashboardData(context)} />;
}
