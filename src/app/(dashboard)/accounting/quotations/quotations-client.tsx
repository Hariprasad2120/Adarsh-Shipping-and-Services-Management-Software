"use client";

import { FileCheck2, Loader2, Plus, Search, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  convertQuotationToInvoiceAction,
  createCustomerNoteAction,
  createQuotationAction,
  submitCustomerNoteAction,
  updateQuotationAction,
} from "@/modules/accounting/actions";
import { DateInput } from "@/components/ui/date-input";
import { AccountingNoteReasonSelect, AccountingOptionalInvoiceLink } from "@/components/monolith";
import {
  AccountingAction,
  AccountingDraftEditLink,
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
import { fetchAccountingItems } from "@/lib/items/accounting-item-client";
import type { ItemListItem } from "@/lib/items/types";
import { QuotationDetailClient } from "./[id]/quotation-detail-client";

interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  postingDate: Date;
  validUntil: Date;
  rowVersion: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  status: string;
  sendStatus?: string | null;
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

type PaymentTerm = {
  id: string;
  name: string;
  dueDays: number;
};

type FormItem = { itemName: string; qty: number; rate: number; taxRate: number };
type EditableQuotationDraft = {
  id: string;
  customerId: string;
  validUntil: string;
  terms: string;
  remarks: string;
  rowVersion: number;
  items: FormItem[];
};
const emptyItem = (): FormItem => ({ itemName: "", qty: 1, rate: 0, taxRate: 0 });
const money = (value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const DEFAULT_PAYMENT_TERMS: PaymentTerm[] = [
  { id: "due-on-receipt", name: "Due on Receipt", dueDays: 0 },
  { id: "net-15", name: "Net 15", dueDays: 15 },
  { id: "net-30", name: "Net 30", dueDays: 30 },
];
const defaultQuotationValidity = (() => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
})();

function formatDateLabel(value: Date | string) {
  return new Date(value).toLocaleDateString("en-IN");
}

function LineEditor({
  catalogueItems,
  items,
  onChange,
}: {
  catalogueItems: ItemListItem[];
  items: FormItem[];
  onChange: (items: FormItem[]) => void;
}) {
  function update(index: number, field: keyof FormItem, value: string) {
    onChange(items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = {
        ...item,
        [field]: field === "itemName" ? value : Number(value),
      };
      if (field === "itemName") {
        const matchedItem = catalogueItems.find(
          (candidate) => candidate.name.toLowerCase() === value.trim().toLowerCase(),
        );
        if (matchedItem) {
          next.rate = matchedItem.rate;
          next.taxRate =
            matchedItem.taxPreference === "Taxable"
              ? Number(matchedItem.taxRate || 18)
              : 0;
        }
      }
      return next;
    }));
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
            <td><AccountingInput aria-label={`Description ${index + 1}`} required list={catalogueItems.length ? "accounting-quotation-items" : undefined} value={item.itemName} onChange={(event) => update(index, "itemName", event.target.value)} /></td>
            <td><AccountingInput aria-label={`Quantity ${index + 1}`} type="number" min="0.0001" step="any" required value={item.qty} onChange={(event) => update(index, "qty", event.target.value)} /></td>
            <td><AccountingInput aria-label={`Rate ${index + 1}`} type="number" min="0" step="0.01" required value={item.rate} onChange={(event) => update(index, "rate", event.target.value)} /></td>
            <td><AccountingSelect aria-label={`GST ${index + 1}`} value={item.taxRate} onChange={(event) => update(index, "taxRate", event.target.value)}><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option></AccountingSelect></td>
            <td className="mnx-accounting-amount">{money(item.qty * item.rate * (1 + item.taxRate / 100))}</td>
            <td><AccountingAction type="button" variant="destructive" size="compact" aria-label={`Remove line ${index + 1}`} onClick={() => items.length === 1 ? toast.warning("At least one line is required") : onChange(items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 aria-hidden="true" /></AccountingAction></td>
          </tr>
        ))}</tbody>
      </AccountingTable>
      {catalogueItems.length ? (
        <datalist id="accounting-quotation-items">
          {catalogueItems.map((item) => (
            <option key={item.id} value={item.name}>
              {item.taxPreference === "Taxable"
                ? `${item.name} · GST ${item.taxRate || 18}%`
                : `${item.name} · non-taxable`}
            </option>
          ))}
        </datalist>
      ) : null}
    </AccountingSection>
  );
}

export function QuotationsClient({
  initialQuotations,
  initialNotes,
  customers,
  invoices,
  initialEditDraft,
  paymentTerms,
  activeTab,
  selectedQuotationId,
  selectedQuotation,
  quotationCaps,
}: {
  initialQuotations: Quotation[];
  initialNotes: CustomerNote[];
  customers: Customer[];
  invoices: Invoice[];
  initialEditDraft: EditableQuotationDraft | null;
  paymentTerms: PaymentTerm[];
  activeTab: "quotations" | "notes";
  selectedQuotationId: string | null;
  selectedQuotation: Record<string, unknown> | null;
  quotationCaps: {
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
}) {
  const router = useRouter();
  const availablePaymentTerms = paymentTerms.length
    ? paymentTerms
    : DEFAULT_PAYMENT_TERMS;
  const [quotations, setQuotations] = useState(initialQuotations);
  const [notes, setNotes] = useState(initialNotes);
  const [quotationOpen, setQuotationOpen] = useState(Boolean(initialEditDraft));
  const [noteOpen, setNoteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [quotationCustomer, setQuotationCustomer] = useState(
    initialEditDraft?.customerId ?? "",
  );
  const [quotationTerms, setQuotationTerms] = useState(
    initialEditDraft?.terms || availablePaymentTerms[0]?.name || "Due on Receipt",
  );
  const [validUntil, setValidUntil] = useState(
    initialEditDraft?.validUntil ?? defaultQuotationValidity,
  );
  const [quotationRemarks, setQuotationRemarks] = useState(
    initialEditDraft?.remarks ?? "",
  );
  const [quotationItems, setQuotationItems] = useState<FormItem[]>(
    initialEditDraft?.items.length ? initialEditDraft.items : [emptyItem()],
  );
  const [catalogueItems, setCatalogueItems] = useState<ItemListItem[]>([]);
  const [noteType, setNoteType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [noteCustomer, setNoteCustomer] = useState("");
  const [noteInvoice, setNoteInvoice] = useState("");
  const [noteReason, setNoteReason] = useState("");
  const [noteRemarks, setNoteRemarks] = useState("");
  const [noteItems, setNoteItems] = useState<FormItem[]>([emptyItem()]);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(
    initialEditDraft?.id ?? null,
  );

  useEffect(() => {
    void fetchAccountingItems({ activeOnly: true, limit: 500 })
      .then((items) => setCatalogueItems(items))
      .catch(() => setCatalogueItems([]));
  }, []);

  function resetQuotationDraftForm() {
    setEditingQuotationId(null);
    setQuotationCustomer("");
    setQuotationTerms(availablePaymentTerms[0]?.name || "Due on Receipt");
    setValidUntil(defaultQuotationValidity);
    setQuotationRemarks("");
    setQuotationItems([emptyItem()]);
  }

  function closeQuotationDialog() {
    if (busy) return;
    setQuotationOpen(false);
    resetQuotationDraftForm();
    if (initialEditDraft) {
      router.push("/accounting/quotations");
      router.refresh();
    }
  }

  async function createQuotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quotationCustomer) return toast.error("Select a customer");
    if (quotationItems.some((item) => !item.itemName.trim() || item.qty <= 0 || item.rate < 0)) return toast.error("Complete every quotation line");
    setBusy(true);
    try {
      const payload = {
        customerId: quotationCustomer,
        validUntil,
        terms: quotationTerms || null,
        remarks: quotationRemarks,
        items: quotationItems,
      };
      const result = editingQuotationId
        ? await updateQuotationAction(editingQuotationId, payload)
        : await createQuotationAction(payload);
      if (!result.ok) {
        return toast.error(
          result.error ||
            (editingQuotationId
              ? "Quotation draft could not be updated"
              : "Quotation could not be created"),
        );
      }
      const selectedCustomer =
        customers.find((customer) => customer.id === quotationCustomer) || null;
      const nextRow = {
        id: result.data.id,
        quotationNumber: result.data.quotationNumber,
        customerName: selectedCustomer?.name || "Unknown Customer",
        postingDate: result.data.postingDate,
        validUntil: result.data.validUntil,
        rowVersion: Number(result.data.rowVersion ?? 1),
        taxableAmount: Number(result.data.subTotal ?? 0),
        taxAmount: Number(result.data.taxAmount ?? 0),
        grandTotal: Number(result.data.grandTotal ?? 0),
        status: result.data.status,
        sendStatus: result.data.sendStatus ?? null,
        remarks: result.data.remarks ?? null,
      };
      setQuotations((current) =>
        editingQuotationId
          ? current.map((record) =>
              record.id === editingQuotationId ? nextRow : record,
            )
          : [nextRow, ...current],
      );
      resetQuotationDraftForm();
      setQuotationOpen(false);
      if (initialEditDraft) {
        router.push("/accounting/quotations");
        router.refresh();
      }
      toast.success(editingQuotationId ? "Quotation draft updated" : "Quotation prepared");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : editingQuotationId
            ? "Quotation draft could not be updated"
            : "Quotation could not be created",
      );
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
  const filteredQuotations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return quotations.filter((record) => {
      const matchesSearch =
        !normalizedSearch ||
        record.quotationNumber.toLowerCase().includes(normalizedSearch) ||
        record.customerName.toLowerCase().includes(normalizedSearch) ||
        (record.remarks || "").toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "ALL" || record.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotations, searchTerm, statusFilter]);
  const quotationStatusOptions = Array.from(
    new Set(quotations.map((record) => record.status)),
  );
  const selectedQuotationSummary =
    quotations.find((record) => record.id === selectedQuotationId) || null;

  return (
    <>
      <AccountingRoutePageHeader
        description="Manage quotations in a cleaner register-first workspace, while keeping note creation, approval, dispatch, and conversion connected to the live accounting flow."
        actions={<AccountingAction type="button" onClick={() => {
          if (activeTab === "quotations") {
            resetQuotationDraftForm();
            setQuotationOpen(true);
            return;
          }
          setNoteOpen(true);
        }}><Plus aria-hidden="true" /> {activeTab === "quotations" ? "New quotation" : "New note"}</AccountingAction>}
      />
      <AccountingMetrics>
        <AccountingMetric label="Quotations" value={quotations.length} detail="Prepared customer offers" />
        <AccountingMetric label="Open value" value={money(openQuotationValue)} detail="Not yet converted" />
        <AccountingMetric label="Customer notes" value={notes.length} detail="Credit and debit notes" />
        <AccountingMetric label="Draft notes" value={draftNotes} detail="Awaiting ledger posting" />
      </AccountingMetrics>
      <AccountingToolbar>
        <div>
          <Link
            className={`mnx-button ${activeTab === "quotations" ? "mnx-button-primary" : "mnx-button-secondary"}`}
            href={selectedQuotationId ? `/accounting/quotations?quote=${selectedQuotationId}` : "/accounting/quotations"}
          >
            Quotations ({quotations.length})
          </Link>
          <Link
            className={`mnx-button ${activeTab === "notes" ? "mnx-button-primary" : "mnx-button-secondary"}`}
            href="/accounting/quotations?tab=notes"
          >
            Credit / debit notes ({notes.length})
          </Link>
        </div>
        {activeTab === "quotations" ? (
          <div>
            <AccountingField label="Search quotations">
              <div className="mnx-accounting-quotation-search">
                <Search aria-hidden="true" />
                <AccountingInput
                  aria-label="Search quotations"
                  placeholder="Search by quote, customer, or remarks"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </AccountingField>
            <AccountingField label="Status">
              <AccountingSelect
                aria-label="Filter quotations by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="ALL">All statuses</option>
                {quotationStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
          </div>
        ) : null}
      </AccountingToolbar>
      {activeTab === "quotations" ? (
        <section className="mnx-accounting-quotation-shell" aria-label="Quotation workspace">
          <AccountingSection
            className="mnx-accounting-quotation-list-panel"
            eyebrow="Register"
            title="All quotations"
            description={`${filteredQuotations.length} quotation${filteredQuotations.length === 1 ? "" : "s"} visible in the current filter.`}
          >
            <div className="mnx-accounting-quotation-list" role="list">
              {filteredQuotations.length ? filteredQuotations.map((record) => {
                const isSelected = record.id === selectedQuotationId;
                return (
                  <Link
                    key={record.id}
                    className={`mnx-accounting-quotation-list-item${isSelected ? " is-selected" : ""}`}
                    href={`/accounting/quotations?quote=${record.id}`}
                  >
                    <div className="mnx-accounting-quotation-list-item-top">
                      <div>
                        <strong>{record.customerName}</strong>
                        <span>{record.quotationNumber}</span>
                      </div>
                      <span className="mnx-accounting-amount">{money(record.grandTotal)}</span>
                    </div>
                    <div className="mnx-accounting-quotation-list-item-meta">
                      <span>{formatDateLabel(record.postingDate)}</span>
                      <span>Valid until {formatDateLabel(record.validUntil)}</span>
                    </div>
                    <div className="mnx-accounting-quotation-list-item-footer">
                      <AccountingStatus status={record.status} />
                      <span>{record.remarks || record.sendStatus || "Ready for next action"}</span>
                    </div>
                  </Link>
                );
              }) : (
                <div className="mnx-accounting-quotation-empty">
                  <strong>No quotations match the current filters.</strong>
                  <span>Try a different status or search term, or create a new quotation.</span>
                </div>
              )}
            </div>
          </AccountingSection>

          <div className="mnx-accounting-quotation-detail-panel">
            {selectedQuotation && selectedQuotationSummary ? (
              <>
                <AccountingSection
                  eyebrow="Selected quotation"
                  title={
                    <div className="mnx-accounting-quotation-hero-title">
                      <div>
                        <strong>{selectedQuotationSummary.quotationNumber}</strong>
                        <span>{selectedQuotationSummary.customerName}</span>
                      </div>
                      <div className="mnx-accounting-quotation-hero-total">
                        <span>Total</span>
                        <strong>{money(selectedQuotationSummary.grandTotal)}</strong>
                      </div>
                    </div>
                  }
                  description="Important commercial controls stay in view, and every action still uses the existing accounting workflow."
                  actions={
                    <div className="mnx-accounting-inline-actions">
                      <AccountingStatus status={selectedQuotationSummary.status} />
                      {selectedQuotationSummary.sendStatus ? (
                        <AccountingStatus status={selectedQuotationSummary.sendStatus} />
                      ) : null}
                      <Link
                        className="mnx-button mnx-button-secondary"
                        href={`/accounting/quotations/${selectedQuotationSummary.id}`}
                      >
                        Full page
                      </Link>
                      {selectedQuotationSummary.status === "DRAFT" ? (
                        <AccountingDraftEditLink
                          href={`/accounting/quotations?edit=${selectedQuotationSummary.id}&quote=${selectedQuotationSummary.id}`}
                          className="mnx-button-compact"
                        >
                          Edit draft
                        </AccountingDraftEditLink>
                      ) : null}
                      {["ACCEPTED", "PARTIALLY_CONVERTED"].includes(selectedQuotationSummary.status) ? (
                        <AccountingAction
                          type="button"
                          size="compact"
                          onClick={() => void convert(selectedQuotationSummary.id)}
                        >
                          <FileCheck2 aria-hidden="true" /> Quick convert
                        </AccountingAction>
                      ) : null}
                    </div>
                  }
                >
                  <div className="mnx-accounting-quotation-glance">
                    <div>
                      <span>Posting date</span>
                      <strong>{formatDateLabel(selectedQuotationSummary.postingDate)}</strong>
                    </div>
                    <div>
                      <span>Valid until</span>
                      <strong>{formatDateLabel(selectedQuotationSummary.validUntil)}</strong>
                    </div>
                    <div>
                      <span>Taxable value</span>
                      <strong>{money(selectedQuotationSummary.taxableAmount)}</strong>
                    </div>
                    <div>
                      <span>GST</span>
                      <strong>{money(selectedQuotationSummary.taxAmount)}</strong>
                    </div>
                  </div>
                </AccountingSection>
                <QuotationDetailClient
                  caps={quotationCaps}
                  quotation={selectedQuotation}
                  embedded
                  workspaceHrefBase="/accounting/quotations"
                />
              </>
            ) : (
              <AccountingSection
                eyebrow="Quotation detail"
                title="Select a quotation"
                description="Choose a quotation from the register to review totals, approval status, dispatch, and conversion options."
              >
                <div className="mnx-accounting-quotation-empty">
                  <strong>No quotation is currently selected.</strong>
                  <span>Pick one from the list on the left to open its commercial detail view.</span>
                </div>
              </AccountingSection>
            )}
          </div>
        </section>
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
        onClose={closeQuotationDialog}
        title={editingQuotationId ? "Edit quotation draft" : "Prepare quotation"}
        description={
          editingQuotationId
            ? "Update the current draft without leaving the quotations workspace."
            : "Create a priced customer offer with a controlled validity date."
        }
        size="wide"
        footer={<><AccountingAction type="button" variant="secondary" disabled={busy} onClick={closeQuotationDialog}>Cancel</AccountingAction><AccountingAction type="submit" form="accounting-quotation-form" disabled={busy}>{busy ? <Loader2 className="mnx-spin" aria-hidden="true" /> : null} {editingQuotationId ? "Save draft changes" : "Prepare quotation"}</AccountingAction></>}
      >
        <form id="accounting-quotation-form" className="mnx-accounting-form" onSubmit={createQuotation}>
          <div className="mnx-accounting-form-grid">
            <AccountingField label="Customer" required><AccountingSelect required value={quotationCustomer} onChange={(event) => setQuotationCustomer(event.target.value)}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.gstin ? ` · ${customer.gstin}` : ""}</option>)}</AccountingSelect></AccountingField>
            <AccountingField label="Valid until" required><DateInput required value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></AccountingField>
            <AccountingField label="Terms"><AccountingSelect value={quotationTerms} onChange={(event) => setQuotationTerms(event.target.value)}>{availablePaymentTerms.map((term) => <option key={term.id} value={term.name}>{term.name}</option>)}</AccountingSelect></AccountingField>
            <AccountingField label="Remarks" className="mnx-accounting-field-span"><AccountingTextarea value={quotationRemarks} onChange={(event) => setQuotationRemarks(event.target.value)} /></AccountingField>
          </div>
          <LineEditor catalogueItems={catalogueItems} items={quotationItems} onChange={setQuotationItems} />
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
            <AccountingField label="Note type" required>
              <AccountingSelect
                value={noteType}
                onChange={(event) => {
                  setNoteType(event.target.value as "CREDIT" | "DEBIT");
                  setNoteReason("");
                }}
              >
                <option value="CREDIT">Credit note</option>
                <option value="DEBIT">Debit note</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Customer" required><AccountingSelect required value={noteCustomer} onChange={(event) => setNoteCustomer(event.target.value)}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</AccountingSelect></AccountingField>
            <AccountingOptionalInvoiceLink
              value={noteInvoice}
              onChange={setNoteInvoice}
              options={invoices.map((invoice) => ({
                id: invoice.id,
                label: `${invoice.invoiceNumber} · ${money(invoice.grandTotal)}`,
              }))}
            />
            {noteType === "DEBIT" ? (
              <AccountingNoteReasonSelect
                kind="sales-debit"
                value={noteReason}
                onChange={setNoteReason}
              />
            ) : (
              <AccountingField label="Reason"><AccountingInput value={noteReason} onChange={(event) => setNoteReason(event.target.value)} /></AccountingField>
            )}
            <AccountingField label="Remarks" className="mnx-accounting-field-span"><AccountingTextarea value={noteRemarks} onChange={(event) => setNoteRemarks(event.target.value)} /></AccountingField>
          </div>
          <LineEditor catalogueItems={catalogueItems} items={noteItems} onChange={setNoteItems} />
        </form>
      </AccountingDialog>
    </>
  );
}
