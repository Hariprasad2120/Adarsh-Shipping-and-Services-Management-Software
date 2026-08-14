import { CrmConfigurationState, CrmPermissionState } from "@/modules/crm/components/workspace/crm-workspace";
import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { LeadForm } from "../../leads/lead-form";
import { listActiveLeadSources } from "@/modules/crm/lead-source.service";

export default async function NewEnquiryPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  try {
    await requirePermission(session.user.id, "crm.lead.create");
  } catch {
    return (
      <CrmPermissionState description="You do not have permission to create CRM enquiries." />
    );
  }

  const [employees, customers, leadSources] = await Promise.all([
    db.user.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.crmAccount.findMany({
      where: { orgId },
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { name: "asc" },
    }),
    listActiveLeadSources(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-5">
        <div className="space-y-1">
          <h1 className="mnx-title-2 text-[var(--mnx-text-strong)]">Create New Enquiry</h1>
          <p className="text-sm text-[var(--mnx-muted)]">
            Capture a new enquiry directly from CRM and place it into the enquiries queue.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/crm/lead-sources"
            className="inline-flex items-center justify-center rounded-lg border border-[var(--mnx-border)] px-4 py-2 text-xs font-semibold text-[var(--mnx-muted)] transition-colors hover:text-[var(--mnx-text-strong)]"
          >
            Lead Sources
          </Link>
        </div>
      </div>

      <LeadForm
        employees={employees}
        customers={customers}
        leadSources={leadSources.map((source) => source.name)}
        mode="direct-enquiry"
      />
    </div>
  );
}
