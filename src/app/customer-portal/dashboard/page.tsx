import { requirePortalSession } from "@/modules/customer-portal/auth";
import { PortalPlaceholder } from "../_components/portal-placeholder";

export default async function CustomerPortalDashboardPage() {
  await requirePortalSession();

  return (
    <PortalPlaceholder
      title="Dashboard"
      description="The previous shipment dashboard has been cleared out. This page is now the fresh starting point for the rebuilt customer portal."
    />
  );
}
