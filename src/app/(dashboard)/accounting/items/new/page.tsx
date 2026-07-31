import { AccountingNewItemForm } from "@/components/monolith/accounting-items";
import { listVendors } from "@/modules/crm/service";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";

export default async function AccountingNewItemPage() {
  const { orgId } = await requireAccountingRouteAccess("/accounting/items/new", [
    "accounting.dashboard.view",
  ]);

  const vendors = await listVendors(orgId);

  return (
    <AccountingNewItemForm
      vendorOptions={vendors.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
      }))}
    />
  );
}
