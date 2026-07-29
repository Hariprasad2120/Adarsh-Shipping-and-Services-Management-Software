import { CrmConfigurationState, CrmPermissionState } from "@/components/monolith/crm-workspace";
import React from "react";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getAccount } from "@/modules/crm/service";
import { AccountForm } from "../../account-form";
interface EditAccountPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAccountPage({ params }: EditAccountPageProps) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  // Permission check
  try {
    await requirePermission(session.user.id, "crm.account.manage");
  } catch (e) {
    return <CrmPermissionState description="You do not have permission to edit accounts." />;
  }

  const { id } = await params;
  const account = await getAccount(orgId, id);
  if (!account) notFound();

  // Fetch users for ownership
  const employees = await db.user.findMany({
    where: { orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <AccountForm initialData={account as any} employees={employees} />
    </div>
  );
}
