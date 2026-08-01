"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DateInput } from "@/components/ui/date-input";
import {
  AccountingAction,
  AccountingAlert,
  AccountingField,
  AccountingInput,
  AccountingMetric,
  AccountingMetrics,
  AccountingSection,
  AccountingSelect,
  AccountingTable,
} from "@/modules/accounting/components/accounting-workspace";
import {
  createPaymentEntryAction,
  submitPaymentEntryAction,
} from "@/modules/accounting/actions";
import {
  addDecimalStrings,
  compareDecimalStrings,
  formatAccountingMoney,
  minimumDecimalString,
  normalizeDecimalString,
  subtractDecimalStrings,
} from "@/modules/accounting/operational-helpers";

interface NewPaymentClientProps {
  bankAccounts: any[];
  otherAccounts: any[];
  customers: any[];
  suppliers: any[];
  branches: any[];
  salesInvoices: any[];
  purchaseInvoices: any[];
  initialPaymentType?: "RECEIVE" | "PAY";
}

export function NewPaymentClient({
  bankAccounts,
  otherAccounts,
  customers,
  suppliers,
  branches,
  salesInvoices,
  purchaseInvoices,
  initialPaymentType = "RECEIVE",
}: NewPaymentClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [paymentType, setPaymentType] =
    useState<"RECEIVE" | "PAY">(initialPaymentType);
  const [partyType, setPartyType] = useState<"CUSTOMER" | "SUPPLIER">(
    initialPaymentType === "PAY" ? "SUPPLIER" : "CUSTOMER",
  );
  const [partyId, setPartyId] = useState("");
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [paidFromAccountId, setPaidFromAccountId] = useState(
    initialPaymentType === "PAY"
      ? bankAccounts[0]?.id || ""
      : otherAccounts.find((account) => account.accountType === "RECEIVABLE")
          ?.id || "",
  );
  const [paidToAccountId, setPaidToAccountId] = useState(
    initialPaymentType === "PAY"
      ? otherAccounts.find((account) => account.accountType === "PAYABLE")?.id ||
          ""
      : bankAccounts[0]?.id || "",
  );
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [branchId, setBranchId] = useState("");
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [submitIntent, setSubmitIntent] = useState<"draft" | "approval">(
    "draft",
  );

  function updatePaymentType(nextType: "RECEIVE" | "PAY") {
    setPaymentType(nextType);
    setPartyId("");
    setAllocations({});
    if (nextType === "RECEIVE") {
      setPartyType("CUSTOMER");
      if (bankAccounts.length > 0) setPaidToAccountId(bankAccounts[0].id);
      const receivable = otherAccounts.find(
        (account) => account.accountType === "RECEIVABLE",
      );
      if (receivable) setPaidFromAccountId(receivable.id);
    } else {
      setPartyType("SUPPLIER");
      if (bankAccounts.length > 0) setPaidFromAccountId(bankAccounts[0].id);
      const payable = otherAccounts.find(
        (account) => account.accountType === "PAYABLE",
      );
      if (payable) setPaidToAccountId(payable.id);
    }
  }

  const filteredInvoices = useMemo(
    () =>
      !partyId
        ? []
        : partyType === "CUSTOMER"
        ? salesInvoices.filter((invoice) => invoice.customerId === partyId)
        : purchaseInvoices.filter((invoice) => invoice.supplierId === partyId),
    [partyId, partyType, purchaseInvoices, salesInvoices],
  );

  function decimalOrZero(value: string) {
    try {
      return normalizeDecimalString(value || "0", { maxScale: 4 });
    } catch {
      return "0";
    }
  }

  const totalAllocated = addDecimalStrings(
    ...Object.values(allocations).map(decimalOrZero),
  );
  const activeParties = partyType === "CUSTOMER" ? customers : suppliers;

  function autoAllocate() {
    let remaining = decimalOrZero(amount);
    const next: Record<string, string> = {};
    for (const invoice of filteredInvoices) {
      if (compareDecimalStrings(remaining, "0") <= 0) break;
      const allocated = minimumDecimalString(
        remaining,
        invoice.outstandingAmount,
      );
      next[invoice.id] = allocated;
      remaining = subtractDecimalStrings(remaining, allocated);
    }
    setAllocations(next);
    toast.success("Amount allocated to the oldest outstanding bills");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!partyId) return toast.error("Please select a customer or supplier");
    if (!paidFromAccountId || !paidToAccountId)
      return toast.error("Please select paid from and paid to accounts");
    let normalizedAmount: string;
    try {
      normalizedAmount = normalizeDecimalString(amount, { maxScale: 4 });
    } catch (error) {
      return toast.error(
        error instanceof Error ? error.message : "Enter a valid payment amount",
      );
    }
    if (compareDecimalStrings(normalizedAmount, "0") <= 0)
      return toast.error("Payment amount must be greater than zero");
    if (compareDecimalStrings(totalAllocated, normalizedAmount) > 0)
      return toast.error("Allocated amount cannot exceed the payment amount");

    const allocationRows = Object.entries(allocations)
      .filter(([, value]) => compareDecimalStrings(decimalOrZero(value), "0") > 0)
      .map(([invoiceId, value]) => ({
        salesInvoiceId: partyType === "CUSTOMER" ? invoiceId : null,
        purchaseInvoiceId: partyType === "SUPPLIER" ? invoiceId : null,
        allocatedAmount: decimalOrZero(value),
      }));

    setIsSaving(true);
    try {
      const result = await createPaymentEntryAction({
        paymentType,
        postingDate: new Date(postingDate),
        partyType,
        partyId,
        paidFromAccountId,
        paidToAccountId,
        amount: normalizedAmount,
        referenceNo: referenceNo || null,
        remarks: remarks || null,
        branchId: branchId || null,
        submit: false,
        allocations: allocationRows,
      });
      if (result.ok) {
        if (submitIntent === "approval") {
          const submission = await submitPaymentEntryAction(result.data.id);
          if (!submission.ok) {
            toast.error(submission.error);
            router.push(`/accounting/payment-entries/${result.data.id}`);
            router.refresh();
            return;
          }
          toast.success("Payment submitted for approval");
          router.push(`/accounting/payments/${submission.data.id}`);
          router.refresh();
          return;
        }
        toast.success("Payment draft saved");
        router.push("/accounting/payments");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to record payment",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="mnx-accounting-form" onSubmit={handleSubmit}>
      <AccountingSection
        eyebrow="01"
        title="Payment voucher"
        description="Define direction, party, amount, ledger accounts, and organisational dimensions."
      >
        <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
          <AccountingField label="Payment type">
            <AccountingSelect
              value={paymentType}
              onChange={(event) =>
                updatePaymentType(event.target.value as "RECEIVE" | "PAY")
              }
            >
              <option value="RECEIVE">Receipt — receive cash</option>
              <option value="PAY">Payment — disburse cash</option>
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Party class">
            <AccountingSelect
              value={partyType}
              onChange={(event) =>
                setPartyType(event.target.value as "CUSTOMER" | "SUPPLIER")
              }
            >
              <option value="CUSTOMER">Customer / client</option>
              <option value="SUPPLIER">Vendor / supplier</option>
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Party" required>
            <AccountingSelect
              required
              value={partyId}
              onChange={(event) => {
                setPartyId(event.target.value);
                setAllocations({});
              }}
            >
              <option value="">Choose party</option>
              {activeParties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.name}
                </option>
              ))}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Posting date" required>
            <DateInput
              required
              value={postingDate}
              onChange={(event) => setPostingDate(event.target.value)}
            />
          </AccountingField>
          <AccountingField label="Payment amount" required>
            <AccountingInput
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </AccountingField>
          <AccountingField label="Paid from account" required>
            <AccountingSelect
              required
              value={paidFromAccountId}
              onChange={(event) => setPaidFromAccountId(event.target.value)}
            >
              <option value="">Select source account</option>
              {(paymentType === "RECEIVE" ? otherAccounts : bankAccounts).map(
                (account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} — {account.accountName}
                  </option>
                ),
              )}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Paid to account" required>
            <AccountingSelect
              required
              value={paidToAccountId}
              onChange={(event) => setPaidToAccountId(event.target.value)}
            >
              <option value="">Select destination account</option>
              {(paymentType === "RECEIVE" ? bankAccounts : otherAccounts).map(
                (account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} — {account.accountName}
                  </option>
                ),
              )}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Reference number">
            <AccountingInput
              value={referenceNo}
              onChange={(event) => setReferenceNo(event.target.value)}
              placeholder="Cheque or transaction reference"
            />
          </AccountingField>
          <AccountingField label="Branch">
            <AccountingSelect
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            >
              <option value="">Global / Head office</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Remarks">
            <AccountingInput
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
            />
          </AccountingField>
        </div>
      </AccountingSection>

      {filteredInvoices.length > 0 ? (
        <AccountingSection
          eyebrow="02"
          title="Invoice allocations"
          description="Allocate the payment against outstanding sales or purchase documents."
          actions={
            compareDecimalStrings(decimalOrZero(amount), "0") > 0 ? (
              <AccountingAction
                type="button"
                variant="secondary"
                onClick={autoAllocate}
              >
                Auto allocate
              </AccountingAction>
            ) : null
          }
        >
          <AccountingTable>
            <thead>
              <tr>
                <th>Invoice number</th>
                <th>Grand total</th>
                <th>Outstanding</th>
                <th>Allocated amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.invoiceNumber}</td>
                  <td className="mnx-accounting-amount">
                    {formatAccountingMoney(invoice.grandTotal, "INR", 4)}
                  </td>
                  <td className="mnx-accounting-amount">
                    {formatAccountingMoney(invoice.outstandingAmount, "INR", 4)}
                  </td>
                  <td>
                    <AccountingInput
                      aria-label={`Allocation for ${invoice.invoiceNumber}`}
                      type="number"
                      min="0"
                      max={invoice.outstandingAmount}
                      step="0.01"
                      value={allocations[invoice.id] ?? ""}
                      onChange={(event) =>
                        setAllocations((current) => ({
                          ...current,
                          [invoice.id]: event.target.value,
                        }))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </AccountingTable>
        </AccountingSection>
      ) : (
        <AccountingAlert>
          Select a party to review its outstanding invoices. Payments may also
          remain on account without allocations.
        </AccountingAlert>
      )}

      <AccountingMetrics>
        <AccountingMetric
          label="Payment amount"
          value={formatAccountingMoney(decimalOrZero(amount), "INR", 4)}
        />
        <AccountingMetric
          label="Allocated"
          value={formatAccountingMoney(totalAllocated, "INR", 4)}
        />
        <AccountingMetric
          label="Unallocated"
          value={formatAccountingMoney(
            subtractDecimalStrings(decimalOrZero(amount), totalAllocated),
            "INR",
            4,
          )}
        />
      </AccountingMetrics>
      <div className="mnx-accounting-form-actions">
        <AccountingAction
          disabled={isSaving}
          type="submit"
          variant="secondary"
          onClick={() => setSubmitIntent("draft")}
        >
          {isSaving && submitIntent === "draft" ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={16} />
          ) : null}
          {isSaving && submitIntent === "draft"
            ? "Saving…"
            : "Save as draft"}
        </AccountingAction>
        <AccountingAction
          disabled={isSaving}
          type="submit"
          onClick={() => setSubmitIntent("approval")}
        >
          {isSaving ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : null}
          {isSaving && submitIntent === "approval"
            ? "Submitting…"
            : "Submit for approval"}
        </AccountingAction>
      </div>
    </form>
  );
}
