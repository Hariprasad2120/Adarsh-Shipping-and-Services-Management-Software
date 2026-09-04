"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "@/modules/notifications/client";
import {
  acceptQuotationAction,
  approveQuotationAction,
  cancelQuotationAction,
  convertQuotationToInvoiceAction,
  convertQuotationToSalesOrderAction,
  declineQuotationAction,
  duplicateQuotationAction,
  returnQuotationForRevisionAction,
  sendQuotationAction,
  submitQuotationForApprovalAction,
} from "@/modules/accounting/actions";
import {
  compareDecimalStrings,
  formatAccountingMoney,
  subtractDecimalStrings,
} from "@/modules/accounting/operational-helpers";
import {
  AccountingAction,
  AccountingActionLink,
  AccountingAlert,
  AccountingDetail,
  AccountingDetailList,
  AccountingDraftEditLink,
  AccountingEmptyTableRow,
  AccountingField,
  AccountingInput,
  AccountingMetric,
  AccountingMetrics,
  AccountingMoney,
  AccountingSection,
  AccountingSelect,
  AccountingStatus,
  AccountingTable,
} from "@/components/monolith";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN");
}

export function QuotationDetailClient({
  caps,
  embedded = false,
  quotation,
  workspaceHrefBase = "/accounting/quotations",
}: {
  caps: {
    canEdit: boolean;
    canSubmit: boolean;
    canApprove: boolean;
    canSend: boolean;
    canDecide: boolean;
    canCancel: boolean;
    canConvert: boolean;
    canConvertToSalesOrder: boolean;
    canCreate: boolean;
  };
  embedded?: boolean;
  quotation: any;
  workspaceHrefBase?: string;
}) {
  type QuotationLine = any;

  const router = useRouter();
  const [isBusy, setIsBusy] = useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<"EMAIL" | "PORTAL" | "MANUAL">(
    "EMAIL",
  );
  const [quantitiesByLineId, setQuantitiesByLineId] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        quotation.items.map((line: QuotationLine) => [
          line.id,
          subtractDecimalStrings(line.qty, line.convertedQuantity),
        ]),
      ),
  );

  const remainingTotals = useMemo(
    () =>
      quotation.items.map((line: QuotationLine) => ({
        ...line,
        remainingQuantity: subtractDecimalStrings(line.qty, line.convertedQuantity),
      })),
    [quotation.items],
  );

  async function runAction(actionKey: string, work: () => Promise<void>) {
    setIsBusy(actionKey);
    try {
      await work();
      router.refresh();
    } finally {
      setIsBusy(null);
    }
  }

  async function duplicateQuotation() {
    await runAction("duplicate", async () => {
      const result = await duplicateQuotationAction(quotation.id);
      if (!result.ok) throw new Error(result.error || "Quotation could not be duplicated");
      toast.success("Quotation duplicated");
      router.push(
        embedded
          ? `${workspaceHrefBase}?quote=${result.data.id}`
          : `/accounting/quotations/${result.data.id}`,
      );
    });
  }

  async function submitForApproval() {
    await runAction("submit", async () => {
      const result = await submitQuotationForApprovalAction(
        quotation.id,
        quotation.rowVersion,
      );
      if (!result.ok) throw new Error(result.error || "Quotation could not be submitted");
      toast.success("Quotation submitted for approval");
    });
  }

  async function approveQuotation() {
    await runAction("approve", async () => {
      const result = await approveQuotationAction(quotation.id, quotation.rowVersion);
      if (!result.ok) throw new Error(result.error || "Quotation could not be approved");
      toast.success("Quotation approved");
    });
  }

  async function returnForRevision() {
    const reason = window.prompt("Reason for returning this quotation to draft?");
    if (!reason?.trim()) return;
    await runAction("return", async () => {
      const result = await returnQuotationForRevisionAction(
        quotation.id,
        reason,
        quotation.rowVersion,
      );
      if (!result.ok) throw new Error(result.error || "Quotation could not be returned");
      toast.success("Quotation returned for revision");
    });
  }

  async function sendQuotation() {
    await runAction("send", async () => {
      const result = await sendQuotationAction(quotation.id, {
        expectedVersion: quotation.rowVersion,
        deliveryMode,
      });
      if (!result.ok) throw new Error(result.error || "Quotation could not be sent");
      toast.success(
        deliveryMode === "PORTAL"
          ? "Quotation published to the customer portal"
          : deliveryMode === "MANUAL"
            ? "Manual quotation dispatch recorded"
            : "Quotation queued for email delivery",
      );
    });
  }

  async function acceptQuotation() {
    const customerReference =
      window.prompt("Optional customer reference for this acceptance") || null;
    await runAction("accept", async () => {
      const result = await acceptQuotationAction(quotation.id, {
        expectedVersion: quotation.rowVersion,
        source: "INTERNAL",
        customerReference,
      });
      if (!result.ok) throw new Error(result.error || "Quotation could not be accepted");
      toast.success("Quotation accepted");
    });
  }

  async function declineQuotation() {
    const reason = window.prompt("Reason for declining this quotation?");
    if (!reason?.trim()) return;
    await runAction("decline", async () => {
      const result = await declineQuotationAction(quotation.id, {
        expectedVersion: quotation.rowVersion,
        source: "INTERNAL",
        reason,
      });
      if (!result.ok) throw new Error(result.error || "Quotation could not be declined");
      toast.success("Quotation declined");
    });
  }

  async function cancelQuotation() {
    const reason = window.prompt("Optional cancellation reason") || null;
    await runAction("cancel", async () => {
      const result = await cancelQuotationAction(quotation.id, {
        expectedVersion: quotation.rowVersion,
        reason,
      });
      if (!result.ok) throw new Error(result.error || "Quotation could not be cancelled");
      toast.success("Quotation cancelled");
    });
  }

  function buildRequestedLines() {
    return Object.fromEntries(
      remainingTotals
        .map((line: QuotationLine) => [line.id, quantitiesByLineId[line.id] ?? "0"] as const)
        .filter(
          ([, value]: readonly [string, string]) =>
            compareDecimalStrings(String(value || "0"), "0") > 0,
        ),
    );
  }

  async function convertQuotation() {
    await runAction("convert", async () => {
      const result = await convertQuotationToInvoiceAction(quotation.id, {
        expectedVersion: quotation.rowVersion,
        quantitiesByLineId: buildRequestedLines(),
      });
      if (!result.ok) throw new Error(result.error || "Quotation could not be converted");
      toast.success("Draft sales invoice created");
      router.push(`/accounting/sales-invoices/${result.data.id}`);
    });
  }

  async function convertQuotationToSalesOrder() {
    await runAction("convert-sales-order", async () => {
      const result = await convertQuotationToSalesOrderAction(quotation.id, {
        expectedVersion: quotation.rowVersion,
        quantitiesByLineId: buildRequestedLines(),
      });
      if (!result.ok) {
        throw new Error(result.error || "Quotation could not be converted to a sales order");
      }
      toast.success("Sales order created from quotation");
      router.push("/accounting/sales-orders");
    });
  }

  const canSubmit =
    caps.canSubmit && quotation.status === "DRAFT" && quotation.approvalRequired;
  const canApprove = caps.canApprove && quotation.status === "PENDING_APPROVAL";
  const canSend =
    caps.canSend &&
    ["DRAFT", "PENDING_APPROVAL"].includes(quotation.status) &&
    (!quotation.approvalRequired || quotation.approvedById);
  const canAccept = caps.canDecide && quotation.status === "SENT";
  const canDecline = caps.canDecide && quotation.status === "SENT";
  const canCancel =
    caps.canCancel && ["DRAFT", "PENDING_APPROVAL", "SENT"].includes(quotation.status);
  const canConvert =
    caps.canConvert &&
    ["ACCEPTED", "PARTIALLY_CONVERTED"].includes(quotation.status) &&
    remainingTotals.some(
      (line: QuotationLine) => compareDecimalStrings(line.remainingQuantity, "0") > 0,
    );
  const canConvertToSalesOrder =
    caps.canConvertToSalesOrder &&
    ["ACCEPTED", "PARTIALLY_CONVERTED"].includes(quotation.status) &&
    remainingTotals.some(
      (line: QuotationLine) => compareDecimalStrings(line.remainingQuantity, "0") > 0,
    );

  return (
    <div className={embedded ? "mnx-accounting-quotation-detail-stack" : undefined}>
      <AccountingSection
        eyebrow="Quotation control"
        title={embedded ? "Commercial controls" : "Commercial lifecycle"}
        description={
          embedded
            ? "Use the important actions here to keep the quotation moving without leaving the register."
            : "Review server-authoritative totals, approval state, dispatch status, customer decision, and conversion readiness."
        }
        actions={
          <div className="mnx-accounting-inline-actions mnx-accounting-quotation-actions">
            <AccountingStatus status={quotation.status} />
            {quotation.sendStatus ? <AccountingStatus status={quotation.sendStatus} /> : null}
            {caps.canCreate ? (
              <AccountingAction
                disabled={isBusy === "duplicate"}
                onClick={() => void duplicateQuotation()}
                variant="secondary"
              >
                {isBusy === "duplicate" ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : null}
                Duplicate
              </AccountingAction>
            ) : null}
            {caps.canEdit && quotation.status === "DRAFT" ? (
              <AccountingDraftEditLink
                href={`${workspaceHrefBase}?edit=${quotation.id}&quote=${quotation.id}`}
              >
                Edit draft
              </AccountingDraftEditLink>
            ) : null}
            {canSubmit ? (
              <AccountingAction
                disabled={isBusy === "submit"}
                onClick={() => void submitForApproval()}
              >
                {isBusy === "submit" ? <Loader2 className="animate-spin" size={16} /> : null}
                Submit
              </AccountingAction>
            ) : null}
            {canApprove ? (
              <>
                <AccountingAction
                  disabled={isBusy === "approve"}
                  onClick={() => void approveQuotation()}
                >
                  {isBusy === "approve" ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : null}
                  Approve
                </AccountingAction>
                <AccountingAction
                  disabled={isBusy === "return"}
                  onClick={() => void returnForRevision()}
                  variant="secondary"
                >
                  {isBusy === "return" ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : null}
                  Return
                </AccountingAction>
              </>
            ) : null}
            {canSend ? (
              <>
                <AccountingField label="Delivery mode">
                  <AccountingSelect
                    disabled={isBusy === "send"}
                    value={deliveryMode}
                    onChange={(event) =>
                      setDeliveryMode(event.target.value as "EMAIL" | "PORTAL" | "MANUAL")
                    }
                  >
                    <option value="EMAIL">Email</option>
                    <option value="PORTAL">Portal</option>
                    <option value="MANUAL">Manual</option>
                  </AccountingSelect>
                </AccountingField>
                <AccountingAction disabled={isBusy === "send"} onClick={() => void sendQuotation()}>
                  {isBusy === "send" ? <Loader2 className="animate-spin" size={16} /> : null}
                  Send
                </AccountingAction>
              </>
            ) : null}
            {canAccept ? (
              <AccountingAction disabled={isBusy === "accept"} onClick={() => void acceptQuotation()}>
                {isBusy === "accept" ? <Loader2 className="animate-spin" size={16} /> : null}
                Accept
              </AccountingAction>
            ) : null}
            {canDecline ? (
              <AccountingAction
                disabled={isBusy === "decline"}
                onClick={() => void declineQuotation()}
                variant="secondary"
              >
                {isBusy === "decline" ? <Loader2 className="animate-spin" size={16} /> : null}
                Decline
              </AccountingAction>
            ) : null}
            {canCancel ? (
              <AccountingAction
                disabled={isBusy === "cancel"}
                onClick={() => void cancelQuotation()}
                variant="destructive"
              >
                {isBusy === "cancel" ? <Loader2 className="animate-spin" size={16} /> : null}
                Cancel
              </AccountingAction>
            ) : null}
          </div>
        }
      >
        {quotation.approvalRequired && quotation.status === "DRAFT" ? (
          <AccountingAlert variant="warning">
            This quotation requires approval before it can be sent.
          </AccountingAlert>
        ) : null}
        <div className="mnx-accounting-quotation-overview-grid">
          <AccountingDetailList className="mnx-accounting-quotation-overview-card">
            <AccountingDetail label="Customer" value={quotation.customer?.name || "—"} />
            <AccountingDetail label="Reference" value={quotation.referenceNumber || "—"} />
            <AccountingDetail label="Posting date" value={formatDate(quotation.postingDate)} />
            <AccountingDetail label="Valid until" value={formatDate(quotation.validUntil)} />
            <AccountingDetail label="Terms" value={quotation.terms || "—"} />
            <AccountingDetail label="Currency" value={quotation.currencyCode} />
          </AccountingDetailList>
          <AccountingDetailList className="mnx-accounting-quotation-overview-card">
            <AccountingDetail label="Exchange rate" value={quotation.exchangeRate || "—"} />
            <AccountingDetail label="Subject" value={quotation.subject || "—"} />
            <AccountingDetail label="Remarks" value={quotation.remarks || "—"} />
            <AccountingDetail label="Row version" value={quotation.rowVersion} />
            <AccountingDetail label="Source quotation" value={quotation.sourceQuotationNumber || "—"} />
            <AccountingDetail label="Customer contact" value={quotation.customerContact?.name || "—"} />
          </AccountingDetailList>
        </div>
      </AccountingSection>

      <AccountingMetrics>
        <AccountingMetric
          label="Gross subtotal"
          value={formatAccountingMoney(quotation.grossSubtotal, quotation.currencyCode)}
        />
        <AccountingMetric
          label="Discount"
          value={formatAccountingMoney(quotation.discountAmount, quotation.currencyCode)}
        />
        <AccountingMetric
          label="Tax"
          value={formatAccountingMoney(quotation.taxAmount, quotation.currencyCode)}
        />
        <AccountingMetric
          label="Grand total"
          value={formatAccountingMoney(quotation.grandTotal, quotation.currencyCode)}
        />
      </AccountingMetrics>

      <AccountingSection
        eyebrow="Quoted lines"
        title="Quoted items"
        description="Review line values, remaining quantity, and choose what should move into invoicing or a sales order."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Converted</th>
              <th>Remaining</th>
              <th>Rate</th>
              <th>Taxable</th>
              <th>Tax</th>
              <th>Total</th>
              <th>Convert now</th>
            </tr>
          </thead>
          <tbody>
            {remainingTotals.length ? (
              remainingTotals.map((line: QuotationLine) => (
                <tr key={line.id}>
                  <td>
                    <strong>{line.itemName}</strong>
                    <span className="mnx-table-subtext">
                      {line.descriptionSnapshot || line.hsnSac || "No description"}
                    </span>
                  </td>
                  <td className="mnx-accounting-amount">{line.qty}</td>
                  <td className="mnx-accounting-amount">{line.convertedQuantity}</td>
                  <td className="mnx-accounting-amount">{line.remainingQuantity}</td>
                  <td>
                    <AccountingMoney amount={line.rate} currencyCode={quotation.currencyCode} />
                  </td>
                  <td>
                    <AccountingMoney
                      amount={line.taxableAmount}
                      currencyCode={quotation.currencyCode}
                    />
                  </td>
                  <td>
                    <AccountingMoney amount={line.taxAmount} currencyCode={quotation.currencyCode} />
                  </td>
                  <td>
                    <AccountingMoney amount={line.lineTotal} currencyCode={quotation.currencyCode} />
                  </td>
                  <td>
                    <AccountingField label={`Convert ${line.itemName}`}>
                      <AccountingInput
                        disabled={!canConvert && !canConvertToSalesOrder}
                        min="0"
                        step="0.000001"
                        type="number"
                        value={quantitiesByLineId[line.id] ?? "0"}
                        onChange={(event) =>
                          setQuantitiesByLineId((current) => ({
                            ...current,
                            [line.id]: event.target.value,
                          }))
                        }
                      />
                    </AccountingField>
                  </td>
                </tr>
              ))
            ) : (
              <AccountingEmptyTableRow colSpan={9}>
                No quotation lines were captured.
              </AccountingEmptyTableRow>
            )}
          </tbody>
        </AccountingTable>
        {canConvert || canConvertToSalesOrder ? (
          <div className="mnx-accounting-inline-actions">
            {canConvert ? (
              <AccountingAction disabled={isBusy === "convert"} onClick={() => void convertQuotation()}>
                {isBusy === "convert" ? <Loader2 className="animate-spin" size={16} /> : null}
                Convert selected quantity to draft invoice
              </AccountingAction>
            ) : null}
            {canConvertToSalesOrder ? (
              <AccountingAction
                disabled={isBusy === "convert-sales-order"}
                onClick={() => void convertQuotationToSalesOrder()}
                variant="secondary"
              >
                {isBusy === "convert-sales-order" ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : null}
                Convert selected quantity to sales order
              </AccountingAction>
            ) : null}
            {canConvert ? (
              <AccountingActionLink href="/accounting/sales-invoices/new">
                Open invoice workspace
              </AccountingActionLink>
            ) : null}
            {canConvertToSalesOrder ? (
              <AccountingActionLink href="/accounting/sales-orders/new">
                Open sales order workspace
              </AccountingActionLink>
            ) : null}
          </div>
        ) : null}
      </AccountingSection>

      <AccountingSection
        eyebrow="Lifecycle evidence"
        title="Dispatch, approval, and customer outcome"
        description={
          embedded
            ? "Approval, dispatch, and customer response stay visible in one compact control surface."
            : "This timeline captures the current commercial state without relying on client-side calculation."
        }
      >
        <AccountingDetailList>
          <AccountingDetail label="Approval required" value={quotation.approvalRequired ? "Yes" : "No"} />
          <AccountingDetail label="Submitted at" value={formatDateTime(quotation.submittedAt)} />
          <AccountingDetail label="Approved at" value={formatDateTime(quotation.approvedAt)} />
          <AccountingDetail label="Sent at" value={formatDateTime(quotation.sentAt)} />
          <AccountingDetail
            label="Delivery mode"
            value={
              quotation.sendDelivery &&
              typeof quotation.sendDelivery === "object" &&
              !Array.isArray(quotation.sendDelivery)
                ? String((quotation.sendDelivery as Record<string, unknown>).mode ?? "—")
                : "—"
            }
          />
          <AccountingDetail label="Accepted at" value={formatDateTime(quotation.acceptedAt)} />
          <AccountingDetail label="Declined at" value={formatDateTime(quotation.declinedAt)} />
          <AccountingDetail label="Cancelled at" value={formatDateTime(quotation.cancelledAt)} />
          <AccountingDetail label="Acceptance note" value={quotation.acceptanceComment || "—"} />
          <AccountingDetail label="Decline reason" value={quotation.declineReason || "—"} />
          <AccountingDetail label="Cancellation reason" value={quotation.cancellationReason || "—"} />
        </AccountingDetailList>
      </AccountingSection>

      <AccountingSection
        eyebrow="Audit"
        title="Activity history"
        description={
          embedded
            ? "Immutable history captured for the selected quotation."
            : "Immutable audit events recorded for this quotation."
        }
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>User</th>
              <th>Before</th>
              <th>After</th>
            </tr>
          </thead>
          <tbody>
            {quotation.audit.length ? (
              quotation.audit.map((entry: any) => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.timestamp)}</td>
                  <td>{entry.action.replaceAll("_", " ")}</td>
                  <td>{entry.userId}</td>
                  <td>{entry.beforeValues ? JSON.stringify(entry.beforeValues) : "—"}</td>
                  <td>{entry.afterValues ? JSON.stringify(entry.afterValues) : "—"}</td>
                </tr>
              ))
            ) : (
              <AccountingEmptyTableRow colSpan={5}>
                No audit history is available yet.
              </AccountingEmptyTableRow>
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
    </div>
  );
}
