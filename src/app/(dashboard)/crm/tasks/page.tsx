import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { listActivities } from "@/modules/crm/service";
import {
  CrmConfigurationState,
  CrmPermissionState,
} from "@/modules/crm/components/workspace/crm-workspace";
import {
  ActivityWorkspace,
  type ActivityRow,
} from "@/modules/crm/components/activities/activity-workspace";

export const metadata = { title: "Tasks — CRM" };

export default async function CrmTasksPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context for the current user session." />;
  }
  try {
    await requirePermission(session.user.id, "crm.activity.manage");
  } catch {
    return <CrmPermissionState description="You do not have permission to manage CRM tasks." />;
  }

  const raw = await listActivities(orgId, { type: "TASK" });
  const rows: ActivityRow[] = raw.map((a) => ({
    id: a.id,
    type: a.type,
    title: a.title,
    description: a.description,
    status: a.status,
    priority: a.priority,
    dueAt: a.dueAt ? a.dueAt.toISOString() : null,
    startAt: a.startAt ? a.startAt.toISOString() : null,
    endAt: a.endAt ? a.endAt.toISOString() : null,
    location: a.location,
    relatedToType: a.relatedToType,
    relatedToId: a.relatedToId,
    owner: a.owner ? { id: a.owner.id, name: a.owner.name } : null,
  }));

  return <ActivityWorkspace kind="TASK" rows={rows} />;
}
