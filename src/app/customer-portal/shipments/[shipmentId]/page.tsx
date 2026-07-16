import { requirePortalSession } from "@/modules/customer-portal/auth";
import { PortalPlaceholder } from "../../_components/portal-placeholder";

export default async function CustomerPortalShipmentDetailPage() {
  await requirePortalSession();

  return (
    <PortalPlaceholder
      title="Shipment Detail"
      description="The previous per-shipment workflow, documents, checklist, and query UI has been removed. This route is intentionally blank apart from the reset shell."
    />
  );
}
