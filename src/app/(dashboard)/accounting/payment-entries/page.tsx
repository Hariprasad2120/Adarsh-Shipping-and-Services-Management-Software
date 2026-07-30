import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listPaymentEntries } from "@/modules/accounting/service";
import {
  AccountingActionLink,
  AccountingEmptyTableRow,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingStatus,
  AccountingTable,
} from "@/modules/accounting/components/accounting-workspace";

export default async function PaymentEntriesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const payments = await listPaymentEntries(session.user.orgId!);

  return (
    <>
      <AccountingRoutePageHeader
        actions={
          <AccountingActionLink
            href="/accounting/payment-entries/new"
            variant="primary"
          >
            <Plus aria-hidden="true" size={16} />
            Record payment
          </AccountingActionLink>
        }
      />
      <AccountingSection
        eyebrow="Receipts and payments"
        title="Payment register"
        description={`${payments.length} payment ${payments.length === 1 ? "entry" : "entries"} in the current organisation.`}
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Voucher reference</th>
              <th>Posting date</th>
              <th>Type</th>
              <th>Party class</th>
              <th>Source account</th>
              <th>Destination account</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <AccountingEmptyTableRow colSpan={9}>
                No payment receipts or disbursements have been recorded yet.
              </AccountingEmptyTableRow>
            ) : (
              payments.map((payment) => {
                const reference =
                  payment.referenceNo ||
                  `PAY-${payment.id.slice(-6).toUpperCase()}`;
                return (
                  <tr key={payment.id}>
                    <td>{reference}</td>
                    <td>
                      {new Date(payment.postingDate).toLocaleDateString("en-IN")}
                    </td>
                    <td>{payment.paymentType}</td>
                    <td>{payment.partyType}</td>
                    <td>{payment.paidFrom?.accountName || "—"}</td>
                    <td>{payment.paidTo?.accountName || "—"}</td>
                    <td className="mnx-accounting-amount">
                      ₹
                      {Number(payment.amount).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td>
                      <AccountingStatus status={payment.status} />
                    </td>
                    <td>
                      <AccountingActionLink
                        className="mnx-button-compact"
                        href={`/accounting/payment-entries/${payment.id}`}
                      >
                        Details
                      </AccountingActionLink>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
    </>
  );
}
