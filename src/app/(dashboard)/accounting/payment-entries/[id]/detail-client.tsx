"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AccountingAction,
  AccountingActionLink,
  AccountingDetail,
  AccountingDetailList,
  AccountingEmptyTableRow,
  AccountingSection,
  AccountingStatus,
  AccountingTable,
} from "@/modules/accounting/components/accounting-workspace";
import {
  submitPaymentEntryAction,
} from "@/modules/accounting/actions";
import { formatAccountingMoney } from "@/modules/accounting/operational-helpers";

export function PaymentEntryDetailClient({ payment }: { payment: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitPayment() {
    if (
      !confirm(
        "Submit this payment for independent approval? The draft will become immutable.",
      )
    )
      return;
    setIsSubmitting(true);
    try {
      const result = await submitPaymentEntryAction(payment.id);
      if (result.ok) {
        toast.success("Payment submitted for approval");
        router.push(`/accounting/payments/${result.data.id}`);
        router.refresh();
      } else toast.error(result.error);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit payment",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <AccountingSection
        eyebrow="Payment control"
        title="Transaction summary"
        description="Party, ledger direction, amount, reference, and posting state."
        actions={
          <div className="mnx-accounting-inline-actions">
            <AccountingStatus status={payment.status} />
            {payment.status === "DRAFT" ? (
              <AccountingAction
                disabled={isSubmitting}
                onClick={submitPayment}
              >
                {isSubmitting ? (
                  <Loader2 aria-hidden="true" className="animate-spin" size={16} />
                ) : null}
                Submit for approval
              </AccountingAction>
            ) : null}
          </div>
        }
      >
        <AccountingDetailList>
          <AccountingDetail label="Payment type" value={payment.paymentType} />
          <AccountingDetail
            label="Party"
            value={`${payment.partyName} (${payment.partyType})`}
          />
          <AccountingDetail
            label="Paid from"
            value={`${payment.paidFrom?.accountCode} — ${payment.paidFrom?.accountName}`}
          />
          <AccountingDetail
            label="Paid to"
            value={`${payment.paidTo?.accountCode} — ${payment.paidTo?.accountName}`}
          />
          <AccountingDetail
            label="Posting date"
            value={new Date(payment.postingDate).toLocaleDateString("en-IN")}
          />
          <AccountingDetail
            label="Reference number"
            value={payment.referenceNo || "—"}
          />
          <AccountingDetail
            label="Payment amount"
            value={formatAccountingMoney(payment.amount, "INR", 4)}
          />
          <AccountingDetail
            label="Remarks"
            value={payment.remarks || "No description provided"}
          />
        </AccountingDetailList>
      </AccountingSection>

      <AccountingSection
        eyebrow="Settlement"
        title="Invoice allocations"
        description="Documents whose outstanding balances are affected by this payment."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Invoice number</th>
              <th>Posting date</th>
              <th>Grand total</th>
              <th>Allocated amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {payment.allocations.length === 0 ? (
              <AccountingEmptyTableRow colSpan={5}>
                This is an on-account payment with no document allocations.
              </AccountingEmptyTableRow>
            ) : (
              payment.allocations.map((allocation: any) => {
                const invoice =
                  allocation.salesInvoice || allocation.purchaseInvoice;
                const href = allocation.salesInvoice
                  ? `/accounting/sales-invoices/${invoice.id}`
                  : `/accounting/purchase-invoices/${invoice.id}`;
                return (
                  <tr key={allocation.id}>
                    <td>{invoice.invoiceNumber}</td>
                    <td>
                      {new Date(invoice.postingDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="mnx-accounting-amount">
                      {formatAccountingMoney(invoice.grandTotal, "INR", 4)}
                    </td>
                    <td className="mnx-accounting-amount">
                      {formatAccountingMoney(
                        allocation.allocatedAmount,
                        "INR",
                        4,
                      )}
                    </td>
                    <td>
                      <AccountingActionLink
                        className="mnx-button-compact"
                        href={href}
                      >
                        Invoice details
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
