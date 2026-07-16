import { requirePortalSession } from "@/modules/customer-portal/auth";
import { PortalPlaceholder } from "../_components/portal-placeholder";

export default async function CustomerPortalShipmentsPage() {
  await requirePortalSession();

  return (
    <PortalPlaceholder
      title="Shipments"
      description="Shipment tracking and detail flows were removed so we can rebuild them cleanly. Keep this route as the starting shell for the new shipment experience."
    />
  );
}
