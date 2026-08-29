import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { VendorMasterCreateForm } from "@/components/forms/vendor-master-create-form";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";

export default async function AccountingNewVendorPage() {
  const { orgId, session } = await requireAccountingRouteAccess(
    "/accounting/vendor-master",
    ["accounting.document.read", "accounting.invoice.read"],
  );

  const canManageVendors = await can(session.user.id, "crm.vendor.manage");
  if (!canManageVendors) {
    redirect("/accounting/vendor-master");
  }

  const employees = await db.user.findMany({
    where: { orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <VendorMasterCreateForm
      employees={employees}
      basePath="/accounting/vendor-master"
    />
  );
}
