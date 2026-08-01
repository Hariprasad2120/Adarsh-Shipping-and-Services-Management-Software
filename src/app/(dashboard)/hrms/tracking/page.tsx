import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TrackingDashboardView } from "@/modules/hrms/components/tracking-dashboard-view";

export default async function TrackingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <TrackingDashboardView />;
}
