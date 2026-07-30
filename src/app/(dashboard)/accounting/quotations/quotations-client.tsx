"use client";

import { FileCheck2, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import {
  convertQuotationToInvoiceAction,
  createCustomerNoteAction,
  createQuotationAction,
  submitCustomerNoteAction,
} from "@/modules/accounting/actions";
import { DateInput } from "@/components/ui/date-input";
import {
  AccountingAction,
  AccountingDialog,
  AccountingEmptyTableRow,
  AccountingField,
  AccountingInput,
  AccountingMetric,
  AccountingMetrics,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingSelect,
  AccountingStatus,
  AccountingTable,
  AccountingTextarea,
  AccountingToolbar,
} from "@/modules/accounting/components/accounting-workspace";

interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  postingDate: Date;
  validUntil: Date;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  status: string;
  remarks: string | null;
}

interface CustomerNote {
  id: string;
  noteNumber: string;
  noteType: string;
  customerName: string;
  postingDate: Date;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  status: string;
  reason: string | null;
}

interface Customer {
  id: string;
  name: string;
  gstin: string | null;
  billingAddress: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  grandTotal: number;
  postingDate: Date;
}

type FormItem = { itemName: string; qty: number; rate: number; taxRate: number };
const emptyItem = (): FormItem => ({ itemName: "", qty: 1, rate: 0, taxRate: 0 });
const money = (value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const defaultQuotationValidity = (() => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
})();

function LineEditor({
  items,
  onChange,
}: {
  items: FormItem[];
  onChange: (items: FormItem[]) => void;
}) {
  function update(index: number, field: keyof FormItem, value: string) {
    onChange(items.map((item, itemIndex) => itemIndex === index ? {
      ...item,
      [field]: field === "itemName" ? value : Number(value),
    } : item));
  }
  return (
    <AccountingSection
      eyebrow="Lines"
      title="Services and charges"
      actions={<AccountingAction type="button" variant="secondary" onClick={() => onChange([...items, emptyItem()])}><Plus aria-hidden="true" /> Add line</AccountingAction>}
    >
      <AccountingTable>
        <thead><tr><th>Description</th><th>Quantity</th><th>Rate</th><th>GST rate</th><th>Total</th><th>Action</th></tr></thead>
        <tbody>{items.map((item, index) => (
          <tr key={index}>
            <td><AccountingInput aria-label={`Description ${index + 1}`} required value={item.itemName} onChange={(event) => update(index, "itemName", event.target.value)} /></td>
            <td><AccountingInput aria-label={`Quantity ${index + 1}`} type="number" min="0.0001" step="any" required value={item.qty} onChange={(event) => update(index, "qty", event.target.value)} /></td>
            <td><AccountingInput aria-label={`Rate ${index + 1}`} type="number" min="0" step="0.01" required value={item.rate} onChange={(event) => update(index, "rate", event.target.value)} /></td>
            <td><AccountingSelect aria-label={`GST ${index + 1}`} value={item.taxRate} onChange={(event) => update(index, "taxRate", event.target.value)}><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option></AccountingSelect></td>
            <td className="mnx-accounting-amount">{money(item.qty * item.rate * (1 + item.taxRate / 100))}</td>
            <td><AccountingAction type="button" variant="destructive" size="compact" aria-label={`Remove line ${index + 1}`} onClick={() => items.length === 1 ? toast.warning("At least one line is required") : onChange(items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 aria-hidden="true" /></AccountingAction></td>
          </tr>
        ))}</tbody>
      </AccountingTable>
    </AccountingSection>
  );
}

export function QuotationsClient({
  initialQuotations,
  initialNotes,
  customers,
  invoices,
}: {
  initialQuotations: Quotation[];
  initialNotes: CustomerNote[];
  customers: Customer[];
  invoices: Invoice[];
}) {
  const [tab, setTab] = useState<"quotations" | "notes">("quotations");
  const [quotations, setQuotations] = useState(initialQuotations);
  const [notes, setNotes] = useState(initialNotes);
  const [quotationOpen, setQuotationOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [quotationCustomer, setQuotationCustomer] = useState("");
  const [validUntil, setValidUntil] = useState(defaultQuotationValidity);
  const [quotationRemarks, setQuotationRemarks] = useState("");
  const [quotationItems, setQuotationItems] = useState<FormItem[]>([emptyItem()]);
  const [noteType, setNoteType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [noteCustomer, setNoteCustomer] = useState("");
  const [noteInvoice, setNoteInvoice] = useState("");
  const [noteReason, setNoteReason] = useState("");
  const [noteRemarks, setNoteRemarks] = useState("");
  const [noteItems, setNoteItems] = useState<FormItem[]>([emptyItem()]);

  async function createQuotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quotationCustomer) return toast.error("Select a customer");
    if (quotationItems.some((item) => !item.itemName.trim() || item.qty <= 0 || item.rate < 0)) return toast.error("Complete every quotation line");
    setBusy(true);
    try {
      const result = await createQuotationAction({
        customerId: quotationCustomer,
        validUntil,
        remarks: quotationRemarks,
        items: quotationItems,
      });
      if (!result.ok) return toast.error(result.error || "Quotation could not be created");
      setQuotations((current) => [result.data, ...current]);
      setQuotationCustomer("");
      setQuotationRemarks("");
      setQuotationItems([emptyItem()]);
      setQuotationOpen(false);
      toast.success("Quotation prepared");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Quotation could not be created");
    } finally {
      setBusy(false);
    }
  }

  async function createNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteCustomer) return toast.error("Select a customer");
    if (noteItems.some((item) => !item.itemName.trim() || item.qty <= 0 || item.rate < 0)) return toast.error("Complete every adjustment line");
    setBusy(true);
    try {
      const result = await createCustomerNoteAction({
        noteType,
        customerId: noteCustomer,
        originalInvoiceId: noteInvoice || undefined,
        reason: noteReason,
        remarks: noteRemarks,
        items: noteItems,
      });
      if (!result.ok) return toast.error(result.error || "Adjustment note could not be created");
      setNotes((current) => [result.data, ...current]);
      setNoteCustomer("");
      setNoteInvoice("");
      setNoteReason("");
      setNoteRemarks("");
      setNoteItems([emptyItem()]);
      setNoteOpen(false);
      toast.success(`${noteType === "CREDIT" ? "Credit" : "Debit"} note saved as draft`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Adjustment note could not be created");
    } finally {
      setBusy(false);
    }
  }

  async function convert(id: string) {
    if (!window.confirm("Convert this quotation into a sales invoice?")) return;
    const result = await convertQuotationToInvoiceAction(id);
    if (!result.ok) return toast.error(result.error || "Quotation could not be converted");
    setQuotations((current) => current.map((record) => record.id === id ? { ...record, status: "CONVERTED" } : record));
    toast.success("Sales invoice created from quotation");
  }

  async function submitNote(id: string) {
    if (!window.confirm("Submit this note and post its general-ledger entries?")) return;
    const result = await submitCustomerNoteAction(id);
    if (!result.ok) return toast.error(result.error || "Adjustment note could not be submitted");
    setNotes((current) => current.map((record) => record.id === id ? { ...record, status: "SUBMITTED" } : record));
    toast.success("Adjustment note posted");
  }

  const openQuotationValue = quotations.filter((record) => record.status !== "CONVERTED").reduce((sum, record) => sum + record.grandTotal, 0);
  const draftNotes = notes.filter((record) => record.status === "DRAFT").length;

  return (
    <>
      <AccountingRoutePageHeader
        actions={<AccountingAction type="button" onClick={() => tab === "quotations" ? setQuotationOpen(true) : setNoteOpen(true)}><Plus aria-hidden="true" /> {tab === "quotations" ? "New quotation" : "New note"}</AccountingAction>}
      />
      <AccountingMetrics>
        <AccountingMetric label="Quotations" value={quotations.length} detail="Prepared customer offers" />
        <AccountingMetric label="Open value" value={money(openQuotationValue)} detail="Not yet converted" />
        <AccountingMetric label="Customer notes" value={notes.length} detail="Credit and debit notes" />
        <AccountingMetric label="Draft notes" value={draftNotes} detail="Awaiting ledger posting" />
      </AccountingMetrics>
      <AccountingToolbar>
        <AccountingAction type="button" variant={tab === "quotations" ? "primary" : "secondary"} onClick={() => setTab("quotations")}>Quotations ({quotations.length})</AccountingAction>
        <AccountingAction type="button" variant={tab === "notes" ? "primary" : "secondary"} onClick={() => setTab("notes")}>Credit / debit notes ({notes.length})</AccountingAction>
      </AccountingToolbar>
      {tab === "quotations" ? (
        <AccountingSection eyebrow="Commercial pipeline" title="Pre-sales quotations" description="Track customer pricing through validity and invoice conversion.">
          <AccountingTable>
            <thead><tr><th>Quotation</th><th>Customer</th><th>Posting date</th><th>Valid until</th><th>Taxable</th><th>GST</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{quotations.length ? quotations.map((record) => (
              <tr key={record.id}>
                <td><strong>{record.quotationNumber}</strong><span className="mnx-table-subtext">{record.remarks || "No remarks"}</span></td>
                <td>{record.customerName}</td>
                <td>{new Date(record.postingDate).toLocaleDateString("en-IN")}</td>
                <td>{new Date(record.validUntil).toLocaleDateString("en-IN")}</td>
                <td className="mnx-accounting-amount">{money(record.taxableAmount)}</td>
                <td className="mnx-accounting-amount">{money(record.taxAmount)}</td>
                <td className="mnx-accounting-amount">{money(record.grandTotal)}</td>
                <td><AccountingStatus status={record.status} /></td>
                <td>{record.status === "DRAFT" || record.status === "SUBMITTED" ? <AccountingAction type="button" size="compact" onClick={() => void convert(record.id)}><FileCheck2 aria-hidden="true" /> Convert</AccountingAction> : "—"}</td>
              </tr>
            )) : <AccountingEmptyTableRow colSpan={9}>No quotations have been prepared.</AccountingEmptyTableRow>}</tbody>
          </AccountingTable>
        </AccountingSection>
      ) : (
        <AccountingSection eyebrow="Customer adjustments" title="Credit and debit notes" description="Review commercial adjustments and control when they post to the ledger.">
          <AccountingTable>
            <thead><tr><th>Note</th><th>Type</th><th>Customer</th><th>Posting date</th><th>Taxable</th><th>GST</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{notes.length ? notes.map((record) => (
              <tr key={record.id}>
                <td><strong>{record.noteNumber}</strong><span className="mnx-table-subtext">{record.reason || "No reason recorded"}</span></td>
                <td>{record.noteType}</td>
                <td>{record.customerName}</td>
                <td>{new Date(record.postingDate).toLocaleDateString("en-IN")}</td>
                <td className="mnx-accounting-amount">{money(record.taxableAmount)}</td>
                <td className="mnx-accounting-amount">{money(record.taxAmount)}</td>
                <td className="mnx-accounting-amount">{money(record.grandTotal)}</td>
                <td><AccountingStatus status={record.status} /></td>
                <td>{record.status === "DRAFT" ? <AccountingAction type="button" size="compact" onClick={() => void submitNote(record.id)}><Send aria-hidden="true" /> Submit</AccountingAction> : "—"}</td>
              </tr>
            )) : <AccountingEmptyTableRow colSpan={9}>No customer adjustment notes have been created.</AccountingEmptyTableRow>}</tbody>
          </AccountingTable>
        </AccountingSection>
      )}

      <AccountingDialog
        open={quotationOpen}
        onClose={() => !busy && setQuotationOpen(false)}
        title="Prepare quotation"
        description="Create a priced customer offer with a controlled validity date."
        size="wide"
        footer={<><AccountingAction type="button" variant="secondary" disabled={busy} onClick={() => setQuotationOpen(false)}>Cancel</AccountingAction><AccountingAction type="submit" form="accounting-quotation-form" disabled={busy}>{busy ? <Loader2 className="mnx-spin" aria-hidden="true" /> : null} Prepare quotation</AccountingAction></>}
      >
        <form id="accounting-quotation-form" className="mnx-accounting-form" onSubmit={createQuotation}>
          <div className="mnx-accounting-form-grid">
            <AccountingField label="Customer" required><AccountingSelect required value={quotationCustomer} onChange={(event) => setQuotationCustomer(event.target.value)}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.gstin ? ` · ${customer.gstin}` : ""}</option>)}</AccountingSelect></AccountingField>
            <AccountingField label="Valid until" required><DateInput required value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></AccountingField>
            <AccountingField label="Remarks" className="mnx-accounting-field-span"><AccountingTextarea value={quotationRemarks} onChange={(event) => setQuotationRemarks(event.target.value)} /></AccountingField>
          </div>
          <LineEditor items={quotationItems} onChange={setQuotationItems} />
        </form>
      </AccountingDialog>

      <AccountingDialog
        open={noteOpen}
        onClose={() => !busy && setNoteOpen(false)}
        title="Create customer adjustment"
        description="Prepare a credit or debit note and optionally link it to an original invoice."
        size="wide"
        footer={<><AccountingAction type="button" variant="secondary" disabled={busy} onClick={() => setNoteOpen(false)}>Cancel</AccountingAction><AccountingAction type="submit" form="accounting-note-form" disabled={busy}>{busy ? <Loader2 className="mnx-spin" aria-hidden="true" /> : null} Save draft note</AccountingAction></>}
      >
        <form id="accounting-note-form" className="mnx-accounting-form" onSubmit={createNote}>
          <div className="mnx-accounting-form-grid">
            <AccountingField label="Note type" required><AccountingSelect value={noteType} onChange={(event) => setNoteType(event.target.value as "CREDIT" | "DEBIT")}><option value="CREDIT">Credit note</option><option value="DEBIT">Debit note</option></AccountingSelect></AccountingField>
            <AccountingField label="Customer" required><AccountingSelect required value={noteCustomer} onChange={(event) => setNoteCustomer(event.target.value)}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</AccountingSelect></AccountingField>
            <AccountingField label="Original invoice"><AccountingSelect value={noteInvoice} onChange={(event) => setNoteInvoice(event.target.value)}><option value="">No linked invoice</option>{invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} · {money(invoice.grandTotal)}</option>)}</AccountingSelect></AccountingField>
            <AccountingField label="Reason"><AccountingInput value={noteReason} onChange={(event) => setNoteReason(event.target.value)} /></AccountingField>
            <AccountingField label="Remarks" className="mnx-accounting-field-span"><AccountingTextarea value={noteRemarks} onChange={(event) => setNoteRemarks(event.target.value)} /></AccountingField>
          </div>
          <LineEditor items={noteItems} onChange={setNoteItems} />
        </form>
      </AccountingDialog>
    </>
  );
}
