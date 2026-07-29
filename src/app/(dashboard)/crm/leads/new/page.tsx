import { CrmConfigurationState, CrmPermissionState } from "@/components/monolith/crm-workspace";
import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { LeadForm } from "../lead-form";
export default async function NewLeadPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  // Permission check
  try {
    await requirePermission(session.user.id, "crm.lead.create");
  } catch (e) {
    return <CrmPermissionState description="You do not have permission to create Leads." />;
  }

  // Fetch organization users for ownership dropdown
  const employees = await db.user.findMany({
    where: { orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <LeadForm employees={employees} />
    </div>
  );
}
