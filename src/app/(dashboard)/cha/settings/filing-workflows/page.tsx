import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { ensureSettingsAndDefaults, listFilingWorkflows } from "@/modules/cha/service";
import { db } from "@/lib/db";
import { WorkflowsClient } from "./workflows-client";

export default async function FilingWorkflowsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  // Check RBAC permission for settings management
  await requirePermission(session.user.id, "cha.settings.manage");

  // Ensure defaults are populated (seeds the default workflow)
  await ensureSettingsAndDefaults(orgId);

  // Fetch workflow templates
  const templates = await listFilingWorkflows(orgId);

  // Fetch organisation roles
  const roles = await db.role.findMany({
    where: { orgId },
    select: { name: true },
  });

  const availableRoles = roles.map((r) => r.name);
  if (!availableRoles.includes("Admin")) availableRoles.push("Admin");
  if (!availableRoles.includes("Manager")) availableRoles.push("Manager");
  if (!availableRoles.includes("Employee")) availableRoles.push("Employee");

  return (
    <WorkflowsClient
      initialTemplates={JSON.parse(JSON.stringify(templates))}
      availableRoles={availableRoles}
    />
  );
}
