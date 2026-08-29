import React from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  CrmConfigurationState,
  CrmPermissionState,
} from "@/components/monolith";
import { VendorMasterCreateForm } from "@/components/forms/vendor-master-create-form";

export default async function CrmNewVendorPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <CrmConfigurationState description="Missing organisation context." />
    );
  }

  try {
    await requirePermission(session.user.id, "crm.vendor.manage");
  } catch {
    return (
      <CrmPermissionState description="You do not have permission to create vendors." />
    );
  }

  const employees = await db.user.findMany({
    where: { orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <VendorMasterCreateForm employees={employees} basePath="/crm/vendors" />
  );
}
