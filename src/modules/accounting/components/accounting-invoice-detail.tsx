"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  submitPurchaseInvoiceAction,
  submitSalesInvoiceAction,
} from "@/modules/accounting/actions";
import {
  addDecimalStrings,
  compareDecimalStrings,
  formatAccountingMoney,
} from "@/modules/accounting/operational-helpers";
import {
  AccountingAction,
  AccountingActionLink,
  AccountingDetail,
  AccountingDetailList,
  AccountingMetric,
  AccountingMetrics,
  AccountingSection,
  AccountingStatus,
  AccountingTable,
} from "@/modules/accounting/components/accounting-workspace";

export function AccountingInvoiceDetail({
  invoice,
  kind,
}: {
  invoice: any;
  kind: "sales" | "purchase";
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const party = kind === "sales" ? invoice.customer : invoice.supplier;
  const subtotal = addDecimalStrings(
    ...invoice.items.map((item: any) => item.amount),
  );

  async function submitInvoice() {
    if (
      !confirm(
        `Submit this ${kind} invoice for independent approval? The draft will become immutable.`,
      )
    )
      return;
    setIsSubmitting(true);
    try {
      const result =
        kind === "sales"
          ? await submitSalesInvoiceAction(invoice.id)
          : await submitPurchaseInvoiceAction(invoice.id);
      if (result.ok) {
        toast.success("Invoice submitted for approval");
        router.push(`/accounting/documents/${result.data.id}`);
        router.refresh();
      } else toast.error(result.error);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit invoice",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <AccountingSection
        eyebrow="Invoice control"
        title={`${kind === "sales" ? "Customer" : "Supplier"} profile`}
        description="Counterparty, dates, narration, balance, and posting state."
        actions={
          <div className="mnx-accounting-inline-actions">
            <AccountingStatus status={invoice.status} />
            {invoice.status === "DRAFT" ? (
              <AccountingAction
                disabled={isSubmitting}
                onClick={submitInvoice}
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
          <AccountingDetail
            label={kind === "sales" ? "Customer" : "Supplier"}
            value={party?.name || "—"}
          />
          <AccountingDetail
            label="Address"
            value={
              kind === "sales"
                ? party?.billingAddress || "No billing address"
                : party?.address || "No address provided"
            }
          />
          <AccountingDetail
            label="Posting date"
            value={new Date(invoice.postingDate).toLocaleDateString("en-IN")}
          />
          <AccountingDetail
            label="Due date"
            value={new Date(invoice.dueDate).toLocaleDateString("en-IN")}
          />
          <AccountingDetail
            label="Remarks"
            value={invoice.remarks || "No description provided"}
          />
          {kind === "sales" && invoice.deal ? (
            <AccountingDetail
              label="Linked CRM deal"
              value={
                <AccountingActionLink
                  className="mnx-button-compact"
                  href={`/crm/deals/${invoice.deal.id}`}
                >
                  {invoice.deal.name}
                </AccountingActionLink>
              }
            />
          ) : null}
        </AccountingDetailList>
      </AccountingSection>

      <AccountingMetrics>
        <AccountingMetric
          label="Grand total"
          value={formatAccountingMoney(invoice.grandTotal, "INR", 4)}
        />
        <AccountingMetric
          label="Paid amount"
          value={formatAccountingMoney(invoice.paidAmount, "INR", 4)}
        />
        <AccountingMetric
          label="Outstanding"
          value={formatAccountingMoney(invoice.outstandingAmount, "INR", 4)}
        />
      </AccountingMetrics>

      <AccountingSection
        eyebrow="Invoice value"
        title="Line items"
        description="The products, services, quantities, and rates included in this document."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Item name</th>
              <th>Quantity</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item: any) => (
              <tr key={item.id}>
                <td>{item.itemName}</td>
                <td className="mnx-accounting-amount">{item.qty}</td>
                <td className="mnx-accounting-amount">
                  {formatAccountingMoney(item.rate, "INR", 4)}
                </td>
                <td className="mnx-accounting-amount">
                  {formatAccountingMoney(item.amount, "INR", 4)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th>Subtotal</th>
              <td colSpan={2} />
              <td className="mnx-accounting-amount">
                {formatAccountingMoney(subtotal, "INR", 4)}
              </td>
            </tr>
            <tr>
              <th>Discount</th>
              <td colSpan={2} />
              <td className="mnx-accounting-amount">
                {formatAccountingMoney(invoice.discountAmount, "INR", 4)}
              </td>
            </tr>
            <tr>
              <th>Tax</th>
              <td colSpan={2} />
              <td className="mnx-accounting-amount">
                {formatAccountingMoney(invoice.taxAmount, "INR", 4)}
              </td>
            </tr>
            <tr>
              <th>Grand total</th>
              <td colSpan={2} />
              <td className="mnx-accounting-amount">
                {formatAccountingMoney(invoice.grandTotal, "INR", 4)}
              </td>
            </tr>
          </tfoot>
        </AccountingTable>
      </AccountingSection>

      {invoice.payments?.length > 0 ? (
        <AccountingSection
          eyebrow="Settlement"
          title="Applied payments"
          description="Payment entries allocated against this invoice."
        >
          <AccountingTable>
            <thead>
              <tr>
                <th>Payment reference</th>
                <th>Posting date</th>
                <th>Allocated amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((payment: any) => (
                <tr key={payment.id}>
                  <td>
                    {payment.paymentEntry.referenceNo ||
                      `PAY-${payment.paymentEntry.id.slice(-6).toUpperCase()}`}
                  </td>
                  <td>
                    {new Date(
                      payment.paymentEntry.postingDate,
                    ).toLocaleDateString("en-IN")}
                  </td>
                  <td className="mnx-accounting-amount">
                    {formatAccountingMoney(
                      payment.allocatedAmount,
                      "INR",
                      4,
                    )}
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/payment-entries/${payment.paymentEntry.id}`}
                    >
                      Payment details
                    </AccountingActionLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </AccountingTable>
        </AccountingSection>
      ) : null}

      {invoice.glEntries?.length > 0 ? (
        <AccountingSection
          eyebrow="Posted ledger"
          title="General ledger entries"
          description="Posting and reversal records generated by this invoice."
        >
          <AccountingTable>
            <thead>
              <tr>
                <th>Account</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Remarks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoice.glEntries.map((entry: any) => (
                <tr key={entry.id}>
                  <td>
                    <strong>{entry.account.accountName}</strong>
                    <small>{entry.account.accountCode}</small>
                  </td>
                  <td className="mnx-accounting-amount">
                    {compareDecimalStrings(entry.debit, "0") > 0
                      ? formatAccountingMoney(entry.debit, "INR", 4)
                      : "—"}
                  </td>
                  <td className="mnx-accounting-amount">
                    {compareDecimalStrings(entry.credit, "0") > 0
                      ? formatAccountingMoney(entry.credit, "INR", 4)
                      : "—"}
                  </td>
                  <td>{entry.remarks || "—"}</td>
                  <td>
                    <AccountingStatus
                      status={entry.isCancelled ? "CANCELLED" : "POSTED"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </AccountingTable>
        </AccountingSection>
      ) : null}
    </>
  );
}
