import { requirePortalSession } from "@/modules/customer-portal/auth";
import {
  getPortalShipmentDetail,
  listPortalRatingCategories,
} from "@/modules/customer-portal/service";
import { PortalShipmentWorkspace } from "../../_components/client-actions";
import { getPortalFeatureFlag } from "@/modules/customer-portal/feature-flags";
import type { PortalCoordinator } from "@/modules/customer-portal/types";

interface CustomerPortalShipmentDetailPageProps {
  params: Promise<{ shipmentId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function CustomerPortalShipmentDetailPage({
  params,
  searchParams,
}: CustomerPortalShipmentDetailPageProps) {
  const session = await requirePortalSession();
  const { shipmentId } = await params;
  const awaitedSearchParams = await searchParams;
  const tab = awaitedSearchParams.tab ?? "overview";

  const [detail, ratingCategories, kycUploadsAllowed] = await Promise.all([
    getPortalShipmentDetail(session.portalUserId, shipmentId),
    listPortalRatingCategories(session.portalUserId),
    getPortalFeatureFlag(session.orgId, "CUSTOMER_PORTAL_SHIPMENT_UPLOADS"),
  ]);

  const ratingSubmitted = detail.job.shipmentRatings.some(
    (rating: { portalUserId: string }) => rating.portalUserId === session.portalUserId,
  );

  // Fallback support contact or assigned manager
  const latestJobWithCoordinator = detail.job;
  const primaryOwner = latestJobWithCoordinator?.primaryOwner;
  const assignedManager = latestJobWithCoordinator?.assignedManager;

  let coordinator: PortalCoordinator | null = null;
  if (primaryOwner) {
    coordinator = {
      name: primaryOwner.name,
      email: primaryOwner.email,
      phone: primaryOwner.personalPhone,
      designation: primaryOwner.designation || "Primary Coordinator",
      officeHours: "9:00 AM - 6:00 PM (IST)",
      escalationName: assignedManager?.name || "Operations Manager",
      escalationEmail: assignedManager?.email || "ops-escalations@monolith.com",
    };
  } else if (assignedManager) {
    coordinator = {
      name: assignedManager.name,
      email: assignedManager.email,
      phone: assignedManager.personalPhone,
      designation: assignedManager.designation || "Assigned Manager",
      officeHours: "9:00 AM - 6:00 PM (IST)",
      escalationName: "Operations Director",
      escalationEmail: "ops-escalations@monolith.com",
    };
  } else {
    coordinator = {
      name: "Monolith Support",
      email: "support@adarshshipping.com",
      phone: "+91 44 2490 1234",
      designation: "Customer Care Desk",
      officeHours: "24/7 Operations Support",
      escalationName: "Operations Escalation Desk",
      escalationEmail: "escalation@adarshshipping.com",
    };
  }

  return (
    <PortalShipmentWorkspace
      shipmentId={shipmentId}
      initialTab={tab}
      detail={detail}
      ratingCategories={ratingCategories}
      ratingSubmitted={ratingSubmitted}
      coordinator={coordinator}
      kycUploadsAllowed={kycUploadsAllowed}
    />
  );
}
