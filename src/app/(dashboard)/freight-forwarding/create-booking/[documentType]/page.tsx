import { redirect } from "next/navigation";

export const metadata = {
  title: "Create Booking | Freight Forwarding | Adarsh Shipping",
};

export default async function FreightForwardingLegacyCreateBookingRoute({
  params,
}: {
  params: Promise<{ documentType: string }>;
}) {
  const { documentType } = await params;
  const normalizedType = documentType.toLowerCase();

  if (normalizedType === "hbl") {
    redirect("/freight-forwarding/create-booking?mode=HBL_ONLY");
  }

  if (normalizedType === "mbl") {
    redirect("/freight-forwarding/create-booking?mode=MBL_ONLY");
  }

  redirect("/freight-forwarding/create-booking");
}
