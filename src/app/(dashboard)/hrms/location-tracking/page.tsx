import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { AlertTriangle } from "lucide-react";
import { WorkspaceState } from "@/components/layout/workspace";
import { LocationTrackingWorkspace } from "@/modules/hrms/components/location-tracking/location-tracking-workspace";

export default async function LocationFieldTrackingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const allowed = await can(session.user.id, "hrms.tracking.admin");
  if (!allowed) {
    return (
      <WorkspaceState
        variant="permission"
        eyebrow="HRMS"
        title="Access restricted"
        description="You do not have permission to open Location & Field Tracking. Ask an HR admin to grant the hrms.tracking.admin permission."
        icon={<AlertTriangle aria-hidden="true" />}
      />
    );
  }

  return <LocationTrackingWorkspace />;
}
