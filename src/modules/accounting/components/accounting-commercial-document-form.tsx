"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "@/modules/notifications/client";
import { fetchAccountingItems } from "@/lib/items/accounting-item-client";
import type { ItemListItem } from "@/lib/items/types";
import { createInvoiceAction } from "@/modules/crm/actions";
import { DateInput } from "@/components/ui/date-input";
import {
  AccountingAction,
  AccountingDetail,
  AccountingDetailList,
  AccountingField,
  AccountingInput,
  AccountingSection,
  AccountingSelect,
  AccountingTable,
  AccountingTextarea,
} from "@/modules/accounting/components/accounting-workspace";

type Option = { id: string; name: string };
type ContactOption = Option & { accountId?: string | null };
type ProductOption = Option & { price: number; taxPercent: number };
type BankOption = { id: string; accountName: string; accountCode: string };
type PaymentTermOption = { id: string; name: string; dueDays: number };
type PriceListOption = {
  id: string;
  name: string;
  currencyCode: string;
  adjustmentMode: string;
  defaultAdjustmentPercent: string | null;
};
type DocumentType = "INVOICE" | "SALES_ORDER" | "PURCHASE_ORDER";
type Line = {
  productName: string;
  qty: number;
  rate: number;
  taxPercent: number;
  currency: string;
  exchangeRate: number;
};

const newLine = (): Line => ({
  productName: "",
  qty: 1,
  rate: 0,
  taxPercent: 18,
  currency: "INR",
  exchangeRate: 1,
});

const DEFAULT_PAYMENT_TERMS: PaymentTermOption[] = [
  { id: "due-on-receipt", name: "Due on Receipt", dueDays: 0 },
  { id: "net-15", name: "Net 15", dueDays: 15 },
  { id: "net-30", name: "Net 30", dueDays: 30 },
];

function applyPriceListAdjustment(baseRate: number, priceList: PriceListOption | null) {
  if (!priceList) return baseRate;
  const adjustment = Number(priceList.defaultAdjustmentPercent || 0);
  if (!Number.isFinite(adjustment) || adjustment === 0) return baseRate;
  if (priceList.adjustmentMode === "PERCENT_UP") {
    return Number((baseRate * (1 + adjustment / 100)).toFixed(2));
  }
  if (priceList.adjustmentMode === "PERCENT_DOWN") {
    return Number((baseRate * (1 - adjustment / 100)).toFixed(2));
  }
  return baseRate;
}

export function AccountingCommercialDocumentForm({
  accounts,
  allowedTypes,
  bankAccounts,
  contacts,
  defaultType,
  employees,
  nextNumbers,
  paymentTerms,
  priceLists,
  products,
  redirectPath,
  vendors,
}: {
  accounts: Option[];
  allowedTypes: DocumentType[];
  bankAccounts: BankOption[];
  contacts: ContactOption[];
  defaultType: DocumentType;
  employees: Option[];
  nextNumbers: Record<string, string>;
  paymentTerms: PaymentTermOption[];
  priceLists: PriceListOption[];
  products: ProductOption[];
  redirectPath: string;
  vendors: Option[];
}) {
  const router = useRouter();
  const availablePaymentTerms = paymentTerms.length
    ? paymentTerms
    : DEFAULT_PAYMENT_TERMS;
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<DocumentType>(defaultType);
  const [number, setNumber] = useState(nextNumbers[defaultType] || "");
  const [accountId, setAccountId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [terms, setTerms] = useState(
    availablePaymentTerms[0]?.name || "Due on Receipt",
  );
  const [selectedPriceListId, setSelectedPriceListId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [catalogueItems, setCatalogueItems] = useState<ItemListItem[]>([]);

  const selectedPriceList = useMemo(
    () => priceLists.find((priceList) => priceList.id === selectedPriceListId) || null,
    [priceLists, selectedPriceListId],
  );

  useEffect(() => {
    void fetchAccountingItems({ activeOnly: true, limit: 500 })
      .then((items) => setCatalogueItems(items))
      .catch(() => setCatalogueItems([]));
  }, []);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.qty * line.rate * line.exchangeRate, 0);
    const tax = lines.reduce((sum, line) => sum + line.qty * line.rate * line.exchangeRate * line.taxPercent / 100, 0);
    return { subtotal, tax, total: Math.max(0, subtotal + tax - discount) };
  }, [discount, lines]);

  function updateLine<K extends keyof Line>(index: number, key: K, value: Line[K]) {
    setLines((current) => current.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      const next = { ...line, [key]: value };
      if (key === "currency" && value === "INR") next.exchangeRate = 1;
      if (key === "productName") {
        const name = String(value).trim().toLowerCase();
        const product = products.find((candidate) => candidate.name.toLowerCase() === name);
        const catalogueItem = catalogueItems.find((candidate) => candidate.name.toLowerCase() === name);
        if (product) {
          next.rate = applyPriceListAdjustment(product.price, selectedPriceList);
          next.taxPercent = product.taxPercent;
          if (selectedPriceList) {
            next.currency = selectedPriceList.currencyCode;
            next.exchangeRate = selectedPriceList.currencyCode === "INR" ? 1 : next.exchangeRate;
          }
        } else if (catalogueItem) {
          const matchingPrice = catalogueItem.priceList?.find(
            (price) => price.currency === selectedPriceList?.currencyCode,
          );
          const derivedRate = matchingPrice
            ? matchingPrice.customPrice ?? catalogueItem.rate / matchingPrice.exchangeRate
            : catalogueItem.rate;
          next.rate = applyPriceListAdjustment(derivedRate, selectedPriceList);
          next.taxPercent =
            catalogueItem.taxPreference === "Taxable"
              ? Number(catalogueItem.taxRate || 18)
              : 0;
          if (selectedPriceList) {
            next.currency = selectedPriceList.currencyCode;
            next.exchangeRate =
              selectedPriceList.currencyCode === "INR"
                ? 1
                : matchingPrice?.exchangeRate || next.exchangeRate;
          }
        }
      }
      return next;
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!number.trim()) return toast.error("Document number is required");
    if (lines.some((line) => !line.productName.trim() || line.qty <= 0 || line.rate < 0 || line.exchangeRate <= 0)) {
      return toast.error("Complete every line with a product, positive quantity, and valid rates");
    }

    setSaving(true);
    try {
      const data = new FormData(event.currentTarget);
      data.append("type", type);
      data.append("accountId", accountId);
      data.append("discount", String(discount));
      data.append("terms", terms);
      const result = await createInvoiceAction(data, JSON.stringify(lines));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Commercial document created");
      router.push(redirectPath);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The document could not be created");
    } finally {
      setSaving(false);
    }
  }

  const calculatedDueDate = useMemo(() => {
    if (type !== "INVOICE") return dueDate;
    const selectedTerm =
      availablePaymentTerms.find((term) => term.name === terms) || null;
    const nextDate = new Date(issueDate);
    nextDate.setDate(nextDate.getDate() + (selectedTerm?.dueDays ?? 30));
    return nextDate.toISOString().slice(0, 10);
  }, [availablePaymentTerms, dueDate, issueDate, terms, type]);

  return (
    <form className="mnx-accounting-form" onSubmit={submit}>
      <AccountingSection eyebrow="01" title="Document information" description="Set the document identity, issue date, payment terms, and settlement bank.">
        <div className="mnx-accounting-form-grid">
          <AccountingField label="Document type" required>
            <AccountingSelect
              value={type}
              disabled={allowedTypes.length === 1}
              onChange={(event) => {
                const nextType = event.target.value as DocumentType;
                setType(nextType);
                setNumber(nextNumbers[nextType] || "");
              }}
            >
              {allowedTypes.map((candidate) => <option key={candidate} value={candidate}>{candidate.replaceAll("_", " ")}</option>)}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Document number" required>
            <AccountingInput name="invoiceNumber" required value={number} onChange={(event) => setNumber(event.target.value)} />
          </AccountingField>
          <AccountingField label="Issue date" required>
            <DateInput name="date" required value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
          </AccountingField>
          <AccountingField label="Terms">
            <AccountingSelect value={terms} onChange={(event) => setTerms(event.target.value)}>
              {availablePaymentTerms.map((term) => <option key={term.id} value={term.name}>{term.name}</option>)}
            </AccountingSelect>
          </AccountingField>
          {type === "INVOICE" ? (
            <AccountingField label="Due date">
              <AccountingInput readOnly value={calculatedDueDate} />
              <input type="hidden" name="dueDate" value={calculatedDueDate} />
            </AccountingField>
          ) : (
            <AccountingField label="Due / delivery date">
              <DateInput name="dueDate" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </AccountingField>
          )}
          <AccountingField label="Bank details">
            <AccountingSelect name="bankDetails" defaultValue="">
              <option value="">No bank account selected</option>
              {bankAccounts.map((bank) => <option key={bank.id} value={`${bank.accountName} (A/C: ${bank.accountCode})`}>{bank.accountName} · {bank.accountCode}</option>)}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Price list">
            <AccountingSelect
              value={selectedPriceListId}
              onChange={(event) => setSelectedPriceListId(event.target.value)}
            >
              <option value="">Standard selling price</option>
              {priceLists.map((priceList) => (
                <option key={priceList.id} value={priceList.id}>
                  {priceList.name} · {priceList.currencyCode}
                </option>
              ))}
            </AccountingSelect>
          </AccountingField>
        </div>
      </AccountingSection>

      <AccountingSection eyebrow="02" title="Parties and ownership" description="Connect the document to its customer, contact, supplier, and responsible owner.">
        <div className="mnx-accounting-form-grid">
          <AccountingField label="Customer account">
            <AccountingSelect value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              <option value="">No customer account</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Contact">
            <AccountingSelect name="contactId" defaultValue="">
              <option value="">No contact selected</option>
              {contacts.filter((contact) => !accountId || contact.accountId === accountId).map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
            </AccountingSelect>
          </AccountingField>
          {type === "PURCHASE_ORDER" ? (
            <AccountingField label="Supplier">
              <AccountingSelect name="vendorId" defaultValue="">
                <option value="">No supplier selected</option>
                {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
              </AccountingSelect>
            </AccountingField>
          ) : null}
          <AccountingField label="Document owner" required>
            <AccountingSelect name="ownerId" required defaultValue="">
              <option value="">Select owner</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </AccountingSelect>
          </AccountingField>
          <input type="hidden" name="status" value="DRAFT" />
        </div>
      </AccountingSection>

      <AccountingSection
        eyebrow="03"
        title="Line items"
        description="Capture services or products in their source currency; totals are normalised to INR."
        actions={<AccountingAction type="button" variant="secondary" onClick={() => setLines((current) => [...current, newLine()])}><Plus aria-hidden="true" /> Add line</AccountingAction>}
      >
        <datalist id="accounting-commercial-products">
          {products.map((product) => <option key={product.id} value={product.name} />)}
          {catalogueItems.filter((item) => !products.some((product) => product.name.toLowerCase() === item.name.toLowerCase())).map((item) => <option key={item.id} value={item.name} />)}
        </datalist>
        <AccountingTable>
          <thead><tr><th>Product / service</th><th>Currency</th><th>Exchange rate</th><th>Quantity</th><th>Rate</th><th>GST</th><th>Amount (INR)</th><th>Action</th></tr></thead>
          <tbody>{lines.map((line, index) => (
            <tr key={index}>
              <td><AccountingInput aria-label={`Product ${index + 1}`} list="accounting-commercial-products" required value={line.productName} onChange={(event) => updateLine(index, "productName", event.target.value)} /></td>
              <td><AccountingSelect aria-label={`Currency ${index + 1}`} value={line.currency} onChange={(event) => updateLine(index, "currency", event.target.value)}><option>INR</option><option>USD</option><option>EUR</option><option>SGD</option></AccountingSelect></td>
              <td><AccountingInput aria-label={`Exchange rate ${index + 1}`} type="number" min="0.0001" step="any" disabled={line.currency === "INR"} value={line.exchangeRate} onChange={(event) => updateLine(index, "exchangeRate", Number(event.target.value))} /></td>
              <td><AccountingInput aria-label={`Quantity ${index + 1}`} type="number" min="0.0001" step="any" value={line.qty} onChange={(event) => updateLine(index, "qty", Number(event.target.value))} /></td>
              <td><AccountingInput aria-label={`Rate ${index + 1}`} type="number" min="0" step="any" value={line.rate} onChange={(event) => updateLine(index, "rate", Number(event.target.value))} /></td>
              <td><AccountingSelect aria-label={`GST rate ${index + 1}`} value={line.taxPercent} onChange={(event) => updateLine(index, "taxPercent", Number(event.target.value))}><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option></AccountingSelect></td>
              <td className="mnx-accounting-amount">₹{(line.qty * line.rate * line.exchangeRate * (1 + line.taxPercent / 100)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              <td><AccountingAction type="button" variant="destructive" size="compact" aria-label={`Remove line ${index + 1}`} onClick={() => lines.length === 1 ? toast.warning("At least one line is required") : setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><Trash2 aria-hidden="true" /></AccountingAction></td>
            </tr>
          ))}</tbody>
        </AccountingTable>
      </AccountingSection>

      <div className="mnx-accounting-split-grid">
        <AccountingSection eyebrow="04" title="Notes and adjustment">
          <div className="mnx-accounting-form-grid">
            <AccountingField label="Customer notes" className="mnx-accounting-field-span">
              <AccountingTextarea name="manualNotes" defaultValue="Thanks for your business." rows={4} />
            </AccountingField>
            <AccountingField label="Flat discount (INR)">
              <AccountingInput type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(Math.max(0, Number(event.target.value)))} />
            </AccountingField>
          </div>
        </AccountingSection>
        <AccountingSection eyebrow="Summary" title="Document totals">
          <AccountingDetailList>
            <AccountingDetail label="Subtotal" value={`₹${totals.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} />
            <AccountingDetail label="Estimated GST" value={`₹${totals.tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} />
            <AccountingDetail label="Discount" value={`₹${discount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} />
            <AccountingDetail label="Grand total" value={`₹${totals.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} />
          </AccountingDetailList>
        </AccountingSection>
      </div>
      <div className="mnx-accounting-form-actions">
        <AccountingAction type="button" variant="secondary" onClick={() => router.back()}>Cancel</AccountingAction>
        <AccountingAction type="submit" disabled={saving}>{saving ? <Loader2 className="mnx-spin" aria-hidden="true" /> : null} Save document</AccountingAction>
      </div>
    </form>
  );
}
