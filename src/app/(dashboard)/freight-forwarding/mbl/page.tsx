import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { FreightForwardingWorkspaceClient } from "@/modules/freight-forwarding/components";
import {
  groupFreightBookingTransactions,
  listFreightBookingTransactions,
} from "@/modules/freight-forwarding/service";

export const metadata = {
  title: "MBL Transactions | Freight Forwarding | Adarsh Shipping",
};

export default async function FreightForwardingMblPage({
  searchParams,
}: {
  searchParams: Promise<{ transactionId?: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const orgId = session.user.orgId;
  if (!orgId) redirect("/login");
  const params = await searchParams;

  const transactions = await listFreightBookingTransactions(orgId);

  return (
    <FreightForwardingWorkspaceClient
      bookingGroups={groupFreightBookingTransactions(transactions)}
      initialTransactionId={params.transactionId || null}
      section="MBL"
      transactions={transactions}
    />
  );
}
