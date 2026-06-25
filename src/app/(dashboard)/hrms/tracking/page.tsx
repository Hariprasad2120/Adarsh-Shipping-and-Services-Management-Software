import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TrackingDashboardView } from "@/components/hrms/tracking-dashboard-view";

export default async function TrackingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <TrackingDashboardView />;
}
