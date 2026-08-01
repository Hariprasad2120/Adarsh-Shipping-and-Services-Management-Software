import { CrmConfigurationState, CrmPermissionState } from "@/modules/crm/components/workspace/crm-workspace";
import React from "react";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getDeal } from "@/modules/crm/service";
import { DealForm } from "../../deal-form";
interface EditDealPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDealPage({ params }: EditDealPageProps) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  // Permission check
  try {
    await requirePermission(session.user.id, "crm.deal.manage");
  } catch (e) {
    return <CrmPermissionState description="You do not have permission to edit deals." />;
  }

  const { id } = await params;
  const deal = await getDeal(orgId, id);
  if (!deal) notFound();

  // Fetch accounts, contacts, and employees in parallel
  const [accounts, contacts, employees] = await Promise.all([
    db.crmAccount.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.crmContact.findMany({
      where: { orgId },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
    }),
    db.user.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const formattedContacts = contacts.map(c => ({
    id: c.id,
    name: `${c.firstName || ""} ${c.lastName}`.trim(),
  }));

  return (
    <div className="space-y-6">
      <DealForm initialData={deal} accounts={accounts} contacts={formattedContacts} employees={employees} />
    </div>
  );
}
