import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { FreightForwardingTransactionDetailClient } from "@/modules/freight-forwarding/components";
import {
  buildFreightBookingReferenceData,
  groupFreightBookingTransactions,
  listFreightBookingTransactions,
} from "@/modules/freight-forwarding/service";
import {
  freightForwardingCountries,
  freightForwardingPorts,
} from "@/modules/freight-forwarding/booking-reference";

export const metadata = {
  title: "HBL Transaction | Freight Forwarding | Adarsh Shipping",
};

export default async function FreightForwardingHblTransactionPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const orgId = session.user.orgId;
  if (!orgId) redirect("/login");
  const { transactionId } = await params;

  const [transactions, reference] = await Promise.all([
    listFreightBookingTransactions(orgId),
    buildFreightBookingReferenceData(orgId),
  ]);

  const transaction = transactions.find(
    (entry) => entry.id === transactionId && entry.transactionType === "HBL",
  );

  if (!transaction) notFound();

  return (
    <FreightForwardingTransactionDetailClient
      bookingGroups={groupFreightBookingTransactions(transactions)}
      reference={{
        ...reference,
        countries: freightForwardingCountries,
        ports: freightForwardingPorts,
      }}
      transaction={transaction}
    />
  );
}
