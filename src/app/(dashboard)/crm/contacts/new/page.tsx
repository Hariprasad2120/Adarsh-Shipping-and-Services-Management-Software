import { CrmConfigurationState, CrmPermissionState } from "@/components/monolith/crm-workspace";
import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { ContactForm } from "../contact-form";
export default async function NewContactPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  // Permission check
  try {
    await requirePermission(session.user.id, "crm.contact.manage");
  } catch (e) {
    return <CrmPermissionState description="You do not have permission to create contacts." />;
  }

  // Fetch accounts and employees in parallel
  const [accounts, employees] = await Promise.all([
    db.crmAccount.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <ContactForm accounts={accounts} employees={employees} />
    </div>
  );
}
