"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DateInput } from "@/components/monolith/date-input";
import {
  AccountingAction,
  AccountingCheckbox,
  AccountingField,
  AccountingInput,
  AccountingMetric,
  AccountingMetrics,
  AccountingSection,
  AccountingSelect,
  AccountingTextarea,
} from "@/components/monolith/accounting-workspace";
import {
  createPurchaseInvoiceAction,
  createSalesInvoiceAction,
} from "@/modules/accounting/actions";

type InvoiceKind = "sales" | "purchase";

type InvoiceLine = {
  itemName: string;
  qty: number;
  rate: number;
  currency: string;
  exchangeRate: number;
};

interface AccountingInvoiceFormProps {
  kind: InvoiceKind;
  parties: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
  products?: Array<{
    id: string;
    name: string;
    price: number;
    taxPercent: number;
  }>;
  bankAccounts?: Array<{
    id: string;
    accountName: string;
    accountCode: string;
  }>;
}

const emptyLine = (): InvoiceLine => ({
  itemName: "",
  qty: 1,
  rate: 0,
  currency: "INR",
  exchangeRate: 1,
});

const defaultPostingDate = new Date().toISOString().split("T")[0];
const defaultDueDate = (() => {
  const date = new Date(defaultPostingDate);
  date.setDate(date.getDate() + 30);
  return date.toISOString().split("T")[0];
})();

export function AccountingInvoiceForm({
  bankAccounts = [],
  branches,
  kind,
  parties,
  products = [],
}: AccountingInvoiceFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [partyId, setPartyId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [postingDate, setPostingDate] = useState(defaultPostingDate);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [remarks, setRemarks] = useState("");
  const [submitImmediately, setSubmitImmediately] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(18);
  const [bankDetails, setBankDetails] = useState("");
  const [manualNotes, setManualNotes] = useState("Thanks for your business.");
  const [items, setItems] = useState<InvoiceLine[]>([emptyLine()]);

  function updatePostingDate(value: string) {
    setPostingDate(value);
    if (kind !== "sales" || !value) return;
    const date = new Date(value);
    date.setDate(date.getDate() + 30);
    setDueDate(date.toISOString().split("T")[0]);
  }

  function updateItem(
    index: number,
    field: keyof InvoiceLine,
    value: string,
  ) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = {
          ...item,
          [field]:
            field === "itemName" || field === "currency"
              ? value
              : Number(value) || 0,
        };
        if (field === "currency" && value === "INR") next.exchangeRate = 1;
        if (field === "itemName") {
          const product = products.find(
            (candidate) =>
              candidate.name.toLowerCase() === value.trim().toLowerCase(),
          );
          if (product) {
            next.rate = product.price;
            setTaxRate(product.taxPercent);
          }
        }
        return next;
      }),
    );
  }

  const subtotal = items.reduce(
    (sum, item) =>
      sum + item.qty * item.rate * (kind === "sales" ? item.exchangeRate : 1),
    0,
  );
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxableAmount * (taxRate / 100);
  const grandTotal = taxableAmount + taxAmount;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!partyId) {
      toast.error(`Please select a ${kind === "sales" ? "customer" : "supplier"}`);
      return;
    }
    if (
      items.some(
        (item) => !item.itemName || item.qty <= 0 || item.rate <= 0,
      )
    ) {
      toast.error("Please complete each line with a positive quantity and rate");
      return;
    }

    setIsSaving(true);
    try {
      const common = {
        postingDate: new Date(postingDate),
        dueDate: new Date(dueDate),
        branchId: branchId || null,
        discountAmount,
        taxRate,
        remarks: remarks || null,
        submit: submitImmediately,
      };
      const result =
        kind === "sales"
          ? await createSalesInvoiceAction({
              ...common,
              customerId: partyId,
              bankDetails: bankDetails || null,
              manualNotes: manualNotes || null,
              items: items.map((item) => ({
                itemName: item.itemName,
                qty: item.qty,
                rate: item.rate,
                currency: item.currency,
                exchangeRate: item.exchangeRate,
              })),
            })
          : await createPurchaseInvoiceAction({
              ...common,
              supplierId: partyId,
              items: items.map((item) => ({
                itemName: item.itemName,
                qty: item.qty,
                rate: item.rate,
              })),
            });

      if (result.ok) {
        toast.success(
          submitImmediately
            ? `${kind === "sales" ? "Sales" : "Purchase"} invoice created and posted`
            : `${kind === "sales" ? "Sales" : "Purchase"} invoice draft saved`,
        );
        router.push(`/accounting/${kind}-invoices`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create invoice",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const partyLabel = kind === "sales" ? "Customer" : "Supplier";

  return (
    <form className="mnx-accounting-form" onSubmit={handleSubmit}>
      <AccountingSection
        eyebrow="01"
        title="Invoice properties"
        description="Set the counterparty, posting dates, branch, and document references."
      >
        <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
          <AccountingField label={partyLabel} required>
            <AccountingSelect
              required
              value={partyId}
              onChange={(event) => setPartyId(event.target.value)}
            >
              <option value="">Select {partyLabel.toLowerCase()}</option>
              {parties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.name}
                </option>
              ))}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Branch">
            <AccountingSelect
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            >
              <option value="">Global / organisation-wide</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Posting date" required>
            <DateInput
              required
              value={postingDate}
              onChange={(event) => updatePostingDate(event.target.value)}
            />
          </AccountingField>
          <AccountingField label="Due date" required>
            <DateInput
              required
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </AccountingField>
          {kind === "sales" ? (
            <AccountingField label="Bank details">
              <AccountingSelect
                value={bankDetails}
                onChange={(event) => setBankDetails(event.target.value)}
              >
                <option value="">Select bank account</option>
                {bankAccounts.map((account) => (
                  <option
                    key={account.id}
                    value={`${account.accountName} (A/C: ${account.accountCode})`}
                  >
                    {account.accountName} ({account.accountCode})
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
          ) : null}
          <AccountingField label="Remarks">
            <AccountingInput
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
            />
          </AccountingField>
        </div>
      </AccountingSection>

      <AccountingSection
        eyebrow="02"
        title="Invoice lines"
        description="Add billable services or expense items with quantities, rates, and currency."
        actions={
          <AccountingAction
            type="button"
            variant="secondary"
            onClick={() => setItems((current) => [...current, emptyLine()])}
          >
            <Plus aria-hidden="true" size={16} />
            Add item
          </AccountingAction>
        }
      >
        <div className="mnx-accounting-form">
          {items.map((item, index) => (
            <div
              className="mnx-accounting-form-grid mnx-accounting-form-grid-wide"
              key={index}
            >
              <AccountingField label={`Item ${index + 1}`}>
                <AccountingInput
                  required
                  list={products.length > 0 ? "accounting-products" : undefined}
                  value={item.itemName}
                  onChange={(event) =>
                    updateItem(index, "itemName", event.target.value)
                  }
                />
              </AccountingField>
              {kind === "sales" ? (
                <>
                  <AccountingField label="Currency">
                    <AccountingSelect
                      value={item.currency}
                      onChange={(event) =>
                        updateItem(index, "currency", event.target.value)
                      }
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="SGD">SGD</option>
                    </AccountingSelect>
                  </AccountingField>
                  <AccountingField label="Exchange rate">
                    <AccountingInput
                      required
                      disabled={item.currency === "INR"}
                      type="number"
                      min="0.0001"
                      step="any"
                      value={item.exchangeRate || ""}
                      onChange={(event) =>
                        updateItem(index, "exchangeRate", event.target.value)
                      }
                    />
                  </AccountingField>
                </>
              ) : null}
              <AccountingField label="Quantity">
                <AccountingInput
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.qty}
                  onChange={(event) =>
                    updateItem(index, "qty", event.target.value)
                  }
                />
              </AccountingField>
              <AccountingField label="Rate">
                <AccountingInput
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.rate || ""}
                  onChange={(event) =>
                    updateItem(index, "rate", event.target.value)
                  }
                />
              </AccountingField>
              <AccountingField label="Line total">
                <AccountingInput
                  readOnly
                  value={`₹${(
                    item.qty *
                    item.rate *
                    (kind === "sales" ? item.exchangeRate : 1)
                  ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                />
              </AccountingField>
              <AccountingAction
                aria-label={`Remove item ${index + 1}`}
                type="button"
                variant="destructive"
                onClick={() => {
                  if (items.length <= 1) {
                    toast.error("At least one line item is required");
                    return;
                  }
                  setItems((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  );
                }}
              >
                <Trash2 aria-hidden="true" size={16} />
                Remove
              </AccountingAction>
            </div>
          ))}
        </div>
      </AccountingSection>

      <AccountingSection
        eyebrow="03"
        title="Totals and notes"
        description="Apply document-level discounts and tax before final posting."
      >
        <div className="mnx-accounting-form-grid">
          <AccountingField label="Discount amount">
            <AccountingInput
              type="number"
              min="0"
              step="0.01"
              value={discountAmount || ""}
              onChange={(event) =>
                setDiscountAmount(Number(event.target.value) || 0)
              }
            />
          </AccountingField>
          <AccountingField label="Tax rate">
            <AccountingSelect
              value={taxRate}
              onChange={(event) => setTaxRate(Number(event.target.value) || 0)}
            >
              {[0, 5, 12, 18, 28].map((rate) => (
                <option key={rate} value={rate}>
                  {rate}%
                </option>
              ))}
            </AccountingSelect>
          </AccountingField>
          {kind === "sales" ? (
            <AccountingField label="Customer notes">
              <AccountingTextarea
                rows={4}
                value={manualNotes}
                onChange={(event) => setManualNotes(event.target.value)}
              />
            </AccountingField>
          ) : null}
        </div>
      </AccountingSection>

      <AccountingMetrics>
        <AccountingMetric
          label="Subtotal"
          value={`₹${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
        />
        <AccountingMetric
          label="Taxable amount"
          value={`₹${taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
        />
        <AccountingMetric
          label={`GST ${taxRate}%`}
          value={`₹${taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
        />
        <AccountingMetric
          label="Grand total"
          value={`₹${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
        />
      </AccountingMetrics>
      <div className="mnx-accounting-form-actions">
        <AccountingCheckbox
          checked={submitImmediately}
          onChange={(event) => setSubmitImmediately(event.target.checked)}
          label="Post and finalise invoice immediately"
        />
        <AccountingAction disabled={isSaving} type="submit">
          {isSaving ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : null}
          {isSaving
            ? "Saving…"
            : `Create ${kind === "sales" ? "sales" : "purchase"} invoice`}
        </AccountingAction>
      </div>
      {products.length > 0 ? (
        <datalist id="accounting-products">
          {products.map((product) => (
            <option key={product.id} value={product.name} />
          ))}
        </datalist>
      ) : null}
    </form>
  );
}
