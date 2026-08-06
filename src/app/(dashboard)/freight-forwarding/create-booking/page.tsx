import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { FreightForwardingCreateBookingClient } from "@/modules/freight-forwarding/components";
import type { FreightBookingCreationMode } from "@/modules/freight-forwarding/booking-shared";
import { buildFreightBookingReferenceData } from "@/modules/freight-forwarding/service";

export const metadata = {
  title: "Create Booking | Freight Forwarding | Adarsh Shipping",
};

export default async function FreightForwardingCreateBookingRoute({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const orgId = session.user.orgId;
  if (!orgId) redirect("/login");

  const params = await searchParams;
  const reference = await buildFreightBookingReferenceData(orgId);
  const initialMode =
    params.mode === "HBL_ONLY" || params.mode === "BOTH" || params.mode === "MBL_ONLY"
      ? (params.mode as FreightBookingCreationMode)
      : null;

  return (
    <FreightForwardingCreateBookingClient
      initialMode={initialMode}
      reference={reference}
    />
  );
}
