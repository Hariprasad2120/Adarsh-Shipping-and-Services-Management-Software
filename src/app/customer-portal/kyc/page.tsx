import { requirePortalSession } from "@/modules/customer-portal/auth";
import { listPortalShipments } from "@/modules/customer-portal/service";
import { getPortalFeatureFlag } from "@/modules/customer-portal/feature-flags";
import type { PortalShipmentSummary } from "@/modules/customer-portal/types";
import { PortalKycWorkspace } from "@/modules/customer-portal/components/portal-kyc-workspace";

export default async function CustomerPortalKycPage() {
  const session = await requirePortalSession();
  const [shipments, kycUploadsAllowed] = await Promise.all([
    listPortalShipments(session.portalUserId, { scope: "all" }),
    getPortalFeatureFlag(session.orgId, "CUSTOMER_PORTAL_SHIPMENT_UPLOADS"),
  ]);

  return (
    <PortalKycWorkspace
      shipments={shipments as unknown as PortalShipmentSummary[]}
      kycUploadsAllowed={kycUploadsAllowed}
    />
  );
}
