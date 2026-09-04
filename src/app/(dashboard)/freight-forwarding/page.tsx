import { FreightForwardingWorkspaceClient } from "@/modules/freight-forwarding/components";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  buildFreightBookingReferenceData,
  groupFreightBookingTransactions,
  listFreightBookingTransactions,
} from "@/modules/freight-forwarding/service";

export const metadata = {
  title: "Freight Forwarding | Adarsh Shipping",
};

export default async function FreightForwardingPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; view?: "MBL" | "HBL" }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const orgId = session.user.orgId;
  if (!orgId) redirect("/login");
  const params = await searchParams;
  const [reference, transactions] = await Promise.all([
    buildFreightBookingReferenceData(orgId),
    listFreightBookingTransactions(orgId),
  ]);

  return (
    <FreightForwardingWorkspaceClient
      bookingGroups={groupFreightBookingTransactions(transactions)}
      initialGroupId={params.group || null}
      initialView={params.view || null}
      reference={reference}
      section="HOME"
      transactions={transactions}
    />
  );
}
