"use client";

import {
  CrmButton,
  CrmInput,
  CrmTextarea,
  CrmTable,
} from "@/modules/crm/components/workspace/crm-workspace";

import { NativeSelect } from "@/components/ui/native-select";
import { DateInput } from "@/components/ui/date-input";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createInvoiceAction,
  updateInvoiceAction,
} from "@/modules/crm/actions";
import {
  Save,
  Plus,
  Trash2,
  FileText,
  Building,
  User,
  Calendar,
  Percent,
  DollarSign,
} from "lucide-react";
import { MOCK_ITEMS } from "@/lib/items/mock-data";

interface Option {
  id: string;
  name: string;
}

interface InvoiceItem {
  productName: string;
  qty: number;
  rate: number;
  taxPercent: number;
  currency: string;
  exchangeRate: number;
}

interface InvoiceFormProps {
  initialData?: any;
  accounts: Option[];
  contacts: { id: string; name: string; accountId?: string | null }[];
  vendors: Option[];
  employees: Option[];
  products?: { id: string; name: string; price: number; taxPercent: number }[];
  bankAccounts?: { id: string; accountName: string; accountCode: string }[];
  nextNumbers?: Record<string, string>;
  defaultType?: string;
  redirectPath?: string;
  allowedTypes?: string[];
}

export function InvoiceForm({
  initialData,
  accounts,
  contacts,
  vendors,
  employees,
  products = [],
  bankAccounts = [],
  nextNumbers = {},
  defaultType = "QUOTE",
  redirectPath = "/crm/invoices",
  allowedTypes,
}: InvoiceFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState(
    initialData?.invoiceNumber || "",
  );
  const [type, setType] = useState(initialData?.type || defaultType);
  const [discount, setDiscount] = useState<number>(initialData?.discount || 0);

  const [accountId, setAccountId] = useState(initialData?.accountId || "");
  const [issueDate, setIssueDate] = useState(
    initialData?.date
      ? new Date(initialData.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  );
  const [dueDateState, setDueDateState] = useState(
    initialData?.dueDate
      ? new Date(initialData.dueDate).toISOString().split("T")[0]
      : "",
  );

  // Line items state
  const [items, setItems] = useState<InvoiceItem[]>(
    initialData?.items?.map((item: any) => ({
      productName: item.productName,
      qty: item.qty,
      rate: item.rate,
      taxPercent: item.taxPercent || 18,
      currency: item.currency || "INR",
      exchangeRate: item.exchangeRate || 1,
    })) || [
      {
        productName: "",
        qty: 1,
        rate: 0,
        taxPercent: 18,
        currency: "INR",
        exchangeRate: 1,
      },
    ],
  );

  useEffect(() => {
    if (!isEdit && nextNumbers && nextNumbers[type]) {
      setInvoiceNumber(nextNumbers[type]);
    }
  }, [type, isEdit, nextNumbers]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productName: "",
        qty: 1,
        rate: 0,
        taxPercent: 18,
        currency: "INR",
        exchangeRate: 1,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      toast.warning("At least one line item is required");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItem,
    value: any,
  ) => {
    if (field === "productName" && value === "__ADD_NEW__") {
      router.push("/crm/items/new");
      return;
    }

    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        let updated = {
          ...item,
          [field]:
            field === "productName" || field === "currency"
              ? value
              : parseFloat(value) || 0,
        };

        if (field === "currency" && value === "INR") {
          updated.exchangeRate = 1;
        }

        if (field === "productName") {
          const q = value.trim().toLowerCase();
          const prodMatch = products.find((p) => p.name.toLowerCase() === q);
          if (prodMatch) {
            updated.rate = prodMatch.price;
            updated.taxPercent = prodMatch.taxPercent;
          } else {
            const itemMatch = MOCK_ITEMS.find(
              (i) => i.name.toLowerCase() === q,
            );
            if (itemMatch) {
              updated.rate = itemMatch.rate;
            }
          }
        }
        return updated;
      }),
    );
  };

  // Real-time calculations
  const totals = React.useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.qty * item.rate * item.exchangeRate,
      0,
    );
    const tax = items.reduce(
      (sum, item) =>
        sum +
        item.qty * item.rate * item.exchangeRate * (item.taxPercent / 100),
      0,
    );
    const total = subtotal + tax - discount;
    return { subtotal, tax, total };
  }, [items, discount]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) {
      toast.error("Invoice / Quote Number is required");
      return;
    }

    const hasEmptyProduct = items.some((item) => !item.productName.trim());
    if (hasEmptyProduct) {
      toast.error("All line items must have a Product Name");
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData(e.currentTarget);
    fd.append("type", type);
    fd.append("discount", discount.toString());

    // Explicitly add accountId since it is controlled
    fd.append("accountId", accountId);

    const res = isEdit
      ? await updateInvoiceAction(initialData.id, fd, JSON.stringify(items))
      : await createInvoiceAction(fd, JSON.stringify(items));

    setIsSubmitting(false);

    if (res.ok) {
      toast.success(
        isEdit ? "Record updated successfully" : "Record created successfully",
      );
      router.push(redirectPath);
    } else {
      toast.error(res.error);
    }
  };

  const invoiceTypes =
    allowedTypes && allowedTypes.length > 0
      ? allowedTypes
      : ["QUOTE", "INVOICE", "DEBIT_NOTE", "SALES_ORDER", "PURCHASE_ORDER"];

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 max-w-5xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/60 rounded-xl p-6 shadow-2xl"
    >
      {/* ─── SECTION: BASIC INFO ────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-mono-text uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
          <FileText className="size-4 text-[var(--mnx-accent)]" />
          <span>Basic Document Information</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Document Type *
            </label>
            <NativeSelect
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={isEdit || invoiceTypes.length === 1}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
            >
              {invoiceTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Document Number *
            </label>
            <CrmInput
              type="text"
              name="invoiceNumber"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. QT-1001 or INV-2026-001"
              disabled={isEdit}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Issue Date *
            </label>
            <DateInput
              name="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Bank Details
            </label>
            <NativeSelect
              name="bankDetails"
              defaultValue={initialData?.bankDetails || ""}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
            >
              <option value="">Select Bank Account...</option>
              {bankAccounts.map((acc) => (
                <option
                  key={acc.id}
                  value={`${acc.accountName} (A/C: ${acc.accountCode})`}
                >
                  {acc.accountName} ({acc.accountCode})
                </option>
              ))}
            </NativeSelect>
          </div>
          {type === "INVOICE" || type === "DEBIT_NOTE" ? (
            <CrmInput
              type="hidden"
              name="dueDate"
              value={
                new Date(
                  new Date(issueDate).getTime() + 30 * 24 * 60 * 60 * 1000,
                )
                  .toISOString()
                  .split("T")[0]
              }
            />
          ) : (
            <div>
              <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
                Due Date
              </label>
              <DateInput
                name="dueDate"
                value={dueDateState}
                onChange={(e) => setDueDateState(e.target.value)}
                className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
              />
            </div>
          )}
        </div>
      </div>

      {/* ─── SECTION: RELATED PARTIES ───────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-mono-text uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
          <Building className="size-4 text-[var(--mnx-accent)]" />
          <span>Related Parties & Ownership</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Customer (Account)
            </label>
            <NativeSelect
              name="accountId"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
            >
              <option value="">Link Account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Contact Person
            </label>
            <NativeSelect
              name="contactId"
              defaultValue={initialData?.contactId || ""}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
            >
              <option value="">Link Contact</option>
              {contacts
                .filter((c) => !accountId || c.accountId === accountId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </NativeSelect>
          </div>
          {type === "PURCHASE_ORDER" && (
            <div>
              <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
                Vendor (Suppliers)
              </label>
              <NativeSelect
                name="vendorId"
                defaultValue={initialData?.vendorId || ""}
                className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
              >
                <option value="">Link Vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          <CrmInput
            type="hidden"
            name="status"
            value={initialData?.status || "DRAFT"}
          />
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Document Owner *
            </label>
            <NativeSelect
              name="ownerId"
              defaultValue={initialData?.ownerId || ""}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
              required
            >
              <option value="">Select Owner</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
      </div>

      {/* ─── DYNAMIC LINE ITEM EDITOR ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--mnx-border)]/30 pb-2">
          <h3 className="text-sm font-bold text-mono-text uppercase tracking-wider flex items-center gap-2">
            <span>Line Items (Freight, Local Handling, CHA services)</span>
          </h3>
          <CrmButton
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] border border-[var(--mnx-border)] text-xs font-bold text-[var(--mnx-accent)] rounded-lg cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Add Item Row</span>
          </CrmButton>
        </div>

        <div className="overflow-x-auto border border-[var(--mnx-border)]/60 rounded-lg">
          <CrmTable className="w-full text-left text-xs text-mono-muted border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[var(--mnx-surface)] border-b border-[var(--mnx-border)] font-bold text-mono-muted">
                <th className="px-4 py-3 min-w-[200px] whitespace-nowrap">
                  Product / Service Name *
                </th>
                <th className="px-4 py-3 w-24 whitespace-nowrap">Currency</th>
                <th className="px-4 py-3 w-28 whitespace-nowrap">Exchange Rate</th>
                <th className="px-4 py-3 w-20 whitespace-nowrap">Qty</th>
                <th className="px-4 py-3 w-28 whitespace-nowrap">Rate</th>
                <th className="px-4 py-3 w-28 whitespace-nowrap">GST Tax (%)</th>
                <th className="px-4 py-3 w-32 whitespace-nowrap text-right">Amount (INR)</th>
                <th className="px-4 py-3 w-12 whitespace-nowrap text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--mnx-border)]/30">
              {items.map((item, index) => {
                const itemAmount =
                  item.qty *
                  item.rate *
                  item.exchangeRate *
                  (1 + item.taxPercent / 100);

                return (
                  <tr key={index} className="hover:bg-[var(--mnx-surface)]/15">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <CrmInput
                        type="text"
                        value={item.productName}
                        list="products-datalist"
                        onChange={(e) =>
                          handleItemChange(index, "productName", e.target.value)
                        }
                        placeholder="e.g. Customs CHA filing, Local transport..."
                        className="w-full px-2 py-1 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                        required
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <NativeSelect
                        value={item.currency}
                        onChange={(e) =>
                          handleItemChange(index, "currency", e.target.value)
                        }
                        className="w-full px-2 py-1 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                      >
                        <option value="INR">INR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="SGD">SGD</option>
                      </NativeSelect>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <CrmInput
                        type="number"
                        min="0"
                        step="any"
                        value={item.exchangeRate}
                        disabled={item.currency === "INR"}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "exchangeRate",
                            e.target.value,
                          )
                        }
                        className="w-full px-2 py-1 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-mono-text focus:outline-none focus:border-[var(--mnx-accent)] disabled:opacity-50"
                        required
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <CrmInput
                        type="number"
                        min="1"
                        step="any"
                        value={item.qty}
                        onChange={(e) =>
                          handleItemChange(index, "qty", e.target.value)
                        }
                        className="w-full px-2 py-1 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                        required
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <CrmInput
                        type="number"
                        min="0"
                        step="any"
                        value={item.rate}
                        onChange={(e) =>
                          handleItemChange(index, "rate", e.target.value)
                        }
                        className="w-full px-2 py-1 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                        required
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <NativeSelect
                        value={item.taxPercent}
                        onChange={(e) =>
                          handleItemChange(index, "taxPercent", e.target.value)
                        }
                        className="w-full px-2 py-1 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                      >
                        <option value="0">0% Exemption</option>
                        <option value="5">5% Service</option>
                        <option value="12">12% Service</option>
                        <option value="18">18% Standard GST</option>
                        <option value="28">28% High Slab</option>
                      </NativeSelect>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right font-bold text-mono-text text-sm">
                      ₹
                      {itemAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-center">
                      <CrmButton
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1 text-mono-muted hover:text-[var(--mnx-danger)] rounded hover:bg-mono-soft cursor-pointer"
                        title="Delete Row"
                      >
                        <Trash2 className="size-4" />
                      </CrmButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </CrmTable>
        </div>
      </div>

      {/* ─── REAL-TIME FINANCIAL TOTALS ─── */}
      <div className="flex flex-col md:flex-row md:justify-between items-start gap-6 pt-4 border-t border-[var(--mnx-border)]/30">
        {/* Left side: Notes & Discount */}
        <div className="w-full md:w-1/2 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide">
              Customer Notes
            </label>
            <CrmTextarea
              name="manualNotes"
              defaultValue={
                initialData?.manualNotes || "Thanks for your business."
              }
              placeholder="Type any manual notes here..."
              rows={3}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>

          <div className="w-64 space-y-1.5">
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide">
              Applied Flat Discount (INR)
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1.5 text-mono-muted font-bold text-sm">
                ₹
              </div>
              <CrmInput
                type="number"
                min="0"
                value={discount}
                onChange={(e) =>
                  setDiscount(Math.max(0, parseFloat(e.target.value) || 0))
                }
                placeholder="e.g. 500"
                className="w-full pl-8 pr-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
              />
            </div>
          </div>
        </div>

        {/* Right side: Totals Summary */}
        <div className="w-full md:w-80 bg-[var(--mnx-surface)] p-4 rounded-xl border border-[var(--mnx-border)]/80 space-y-2.5 text-mono-muted">
          <div className="flex justify-between text-xs font-semibold">
            <span>Subtotal</span>
            <span>
              ₹
              {totals.subtotal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between text-xs font-semibold text-mono-muted">
            <span>Estimated GST Tax</span>
            <span>
              + ₹
              {totals.tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-xs font-semibold text-mono-muted border-b border-[var(--mnx-border)] pb-2">
            <span>Discount</span>
            <span>
              - ₹
              {discount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-base font-black text-mono-text pt-1">
            <span>Grand Total</span>
            <span className="text-[var(--mnx-accent)]">
              ₹
              {totals.total.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3.5 pt-4">
        <CrmButton
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] text-mono-muted border border-[var(--mnx-border)]/80 rounded-lg text-sm font-semibold cursor-pointer"
        >
          Cancel
        </CrmButton>
        <CrmButton
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] disabled:opacity-50 text-mono-text rounded-lg text-sm font-bold transition-all mnx-shadow-panel cursor-pointer"
        >
          <Save className="size-4.5" />
          <span>
            {isSubmitting
              ? "Generating Sheet..."
              : isEdit
                ? "Update Document"
                : "Save Document"}
          </span>
        </CrmButton>
      </div>

      {/* Autocomplete Datalist — combines Products catalog + Items master */}
      <datalist id="products-datalist">
        {products.map((p) => (
          <option key={`prod-${p.id}`} value={p.name} />
        ))}
        {MOCK_ITEMS.filter(
          (mi) =>
            !products.some(
              (p) => p.name.toLowerCase() === mi.name.toLowerCase(),
            ),
        ).map((mi) => (
          <option key={`item-${mi.id}`} value={mi.name} />
        ))}
        <option value="__ADD_NEW__">+ Add New Item...</option>
      </datalist>
    </form>
  );
}
