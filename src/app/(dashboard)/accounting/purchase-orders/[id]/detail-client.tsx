"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "@/modules/notifications/client";

import {
  AccountingAction,
  AccountingActionLink,
  AccountingDetail,
  AccountingDetailList,
  AccountingEmptyTableRow,
  AccountingMetric,
  AccountingMetrics,
  AccountingSection,
  AccountingStatus,
  AccountingTable,
} from "@/components/monolith";
import { convertPurchaseOrderToPurchaseInvoiceAction } from "@/modules/accounting/purchase-order-actions";
import { formatAccountingMoney } from "@/modules/accounting/operational-helpers";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN");
}

export function PurchaseOrderDetailClient({
  purchaseOrder,
}: {
  purchaseOrder: any;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const totals = useMemo(() => {
    const subtotal = purchaseOrder.items.reduce(
      (sum: number, item: any) =>
        sum + Number(item.qty) * Number(item.rate) * Number(item.exchangeRate ?? 1),
      0,
    );
    const tax = purchaseOrder.items.reduce(
      (sum: number, item: any) =>
        sum +
        Number(item.qty) *
          Number(item.rate) *
          Number(item.exchangeRate ?? 1) *
          (Number(item.taxPercent ?? 0) / 100),
      0,
    );
    return { subtotal, tax };
  }, [purchaseOrder.items]);

  async function convertToPurchaseInvoice() {
    setBusy(true);
    try {
      const result = await convertPurchaseOrderToPurchaseInvoiceAction(
        purchaseOrder.id,
      );
      if (!result.ok) {
        throw new Error(result.error);
      }
      toast.success("Draft purchase invoice created");
      router.push(`/accounting/purchase-invoices/${result.data.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Purchase order could not be converted";
      if (
        message === "PURCHASE_ORDER_MIXED_TAX_RATES_NOT_SUPPORTED_FOR_CONVERSION"
      ) {
        toast.error(
          "This purchase order has mixed tax rates. Create the purchase invoice manually for now.",
        );
      } else if (message.startsWith("PURCHASE_ORDER_ALREADY_CONVERTED:")) {
        const [, invoiceId] = message.split(":");
        toast.error("A draft or active bill already exists for this purchase order.");
        if (invoiceId) {
          router.push(`/accounting/purchase-invoices/${invoiceId}`);
        }
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AccountingMetrics>
        <AccountingMetric
          label="Subtotal"
          value={formatAccountingMoney(totals.subtotal.toFixed(2), "INR", 4)}
        />
        <AccountingMetric
          label="Estimated GST"
          value={formatAccountingMoney(totals.tax.toFixed(2), "INR", 4)}
        />
        <AccountingMetric
          label="Grand total"
          value={formatAccountingMoney(
            Number(purchaseOrder.total).toFixed(2),
            "INR",
            4,
          )}
        />
        <AccountingMetric
          label="Linked bills"
          value={String(purchaseOrder.linkedPurchaseInvoices.length)}
        />
      </AccountingMetrics>

      <AccountingSection
        eyebrow="Purchase control"
        title="Purchase order summary"
        description="Supplier, commercial terms, workflow status, and Accounting handoff readiness."
        actions={
          <div className="mnx-accounting-inline-actions">
            <AccountingStatus
              status={`${purchaseOrder.status} / ${purchaseOrder.approvalStatus}`}
            />
            <AccountingAction
              disabled={busy}
              onClick={() => void convertToPurchaseInvoice()}
            >
              {busy ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={16} />
              ) : null}
              Convert to draft bill
            </AccountingAction>
          </div>
        }
      >
        <AccountingDetailList>
          <AccountingDetail label="Supplier" value={purchaseOrder.vendor?.name || "—"} />
          <AccountingDetail label="Customer account" value={purchaseOrder.account?.name || "—"} />
          <AccountingDetail label="Issue date" value={formatDate(purchaseOrder.date)} />
          <AccountingDetail label="Due / delivery date" value={formatDate(purchaseOrder.dueDate)} />
          <AccountingDetail label="Terms" value={purchaseOrder.terms || "—"} />
          <AccountingDetail label="Owner" value={purchaseOrder.owner?.name || "—"} />
          <AccountingDetail label="Supplier email" value={purchaseOrder.vendor?.email || "—"} />
          <AccountingDetail label="Supplier phone" value={purchaseOrder.vendor?.phone || "—"} />
          <AccountingDetail
            label="Notes"
            value={purchaseOrder.manualNotes || "No notes recorded"}
          />
        </AccountingDetailList>
      </AccountingSection>

      <AccountingSection
        eyebrow="Line items"
        title="Ordered goods and services"
        description="Commercial lines that can be turned into a draft purchase invoice when tax treatment is uniform."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Currency</th>
              <th>GST</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrder.items.length === 0 ? (
              <AccountingEmptyTableRow colSpan={6}>
                No purchase-order items are recorded.
              </AccountingEmptyTableRow>
            ) : (
              purchaseOrder.items.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.productName}</td>
                  <td>{Number(item.qty).toLocaleString("en-IN")}</td>
                  <td className="mnx-accounting-amount">
                    {formatAccountingMoney(Number(item.rate).toFixed(2), item.currency || "INR", 4)}
                  </td>
                  <td>{item.currency || "INR"}</td>
                  <td>{Number(item.taxPercent ?? 0).toLocaleString("en-IN")} %</td>
                  <td className="mnx-accounting-amount">
                    {formatAccountingMoney(Number(item.amount).toFixed(2), "INR", 4)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Linked bills"
        title="Purchase invoice lineage"
        description="Any existing supplier bills already created from this purchase order."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Created</th>
              <th>Status</th>
              <th>Total</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrder.linkedPurchaseInvoices.length === 0 ? (
              <AccountingEmptyTableRow colSpan={5}>
                No purchase invoices have been created from this purchase order yet.
              </AccountingEmptyTableRow>
            ) : (
              purchaseOrder.linkedPurchaseInvoices.map((invoice: any) => (
                <tr key={invoice.id}>
                  <td>{invoice.invoiceNumber}</td>
                  <td>{formatDate(invoice.createdAt)}</td>
                  <td>
                    <AccountingStatus status={invoice.status} />
                  </td>
                  <td className="mnx-accounting-amount">
                    {formatAccountingMoney(invoice.grandTotal, "INR", 4)}
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/purchase-invoices/${invoice.id}`}
                    >
                      Review bill
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
    </>
  );
}
