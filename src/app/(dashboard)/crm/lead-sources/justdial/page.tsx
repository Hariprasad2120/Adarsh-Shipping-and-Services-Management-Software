import { CrmConfigurationState, CrmPermissionState } from "@/components/monolith/crm-workspace";
import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { getJustdialConfig } from "@/modules/crm/lead-source.service";
import { db } from "@/lib/db";
import { JustdialForm } from "./justdial-form";
export default async function JustdialConfigPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.leadSource.manage");
  } catch (e) {
    return <CrmPermissionState description="You do not have permission to configure CRM Lead Sources." />;
  }

  // Fetch employees list
  const employees = await db.user.findMany({
    where: { orgId, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });

  const config = await getJustdialConfig(orgId);

  return (
    <div className="space-y-6">
      <JustdialForm initialConfig={config} employees={employees} />
    </div>
  );
}
