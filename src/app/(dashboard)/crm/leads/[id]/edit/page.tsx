import { CrmConfigurationState, CrmPermissionState } from "@/modules/crm/components/workspace/crm-workspace";
import React from "react";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getLead } from "@/modules/crm/service";
import { LeadForm } from "../../lead-form";
interface EditLeadPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLeadPage({ params }: EditLeadPageProps) {
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
    return <CrmPermissionState description="You do not have permission to edit CRM leads." />;
  }

  const { id } = await params;
  const lead = await getLead(orgId, id);
  if (!lead) notFound();

  // Fetch organization users for ownership dropdown
  const employees = await db.user.findMany({
    where: { orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <LeadForm initialData={lead} employees={employees} />
    </div>
  );
}
