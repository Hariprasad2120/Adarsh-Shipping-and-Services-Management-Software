"use client";

import { Loader2, Plus, Trash2, HelpCircle, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { AccountingNoteReasonSelect } from "@/components/monolith/accounting-note-reason-select";
import { AccountingOptionalInvoiceLink } from "@/components/monolith/accounting-optional-invoice-link";
import {
  AccountingAction,
  AccountingField,
  AccountingInput,
  AccountingMetric,
  AccountingMetrics,
  AccountingSection,
  AccountingSelect,
  AccountingTextarea,
} from "@/modules/accounting/components/accounting-workspace";
import {
  createPurchaseInvoiceAction,
  createSalesInvoiceAction,
  createUnitAction,
  createCustomerNoteAction,
  createVendorNoteAction,
} from "@/modules/accounting/actions";
import {
  addDecimalStrings,
  compareDecimalStrings,
  divideDecimalStrings,
  formatAccountingMoney,
  multiplyDecimalStrings,
  normalizeDecimalString,
  subtractDecimalStrings,
} from "@/modules/accounting/operational-helpers";
import { fetchAccountingItems } from "@/lib/items/accounting-item-client";
import type { ItemListItem } from "@/lib/items/types";

type InvoiceKind =
  | "sales"
  | "purchase"
  | "sales-credit"
  | "sales-debit"
  | "purchase-credit"
  | "purchase-debit";

type InvoiceLine = {
  itemName: string;
  qty: string;
  rate: string;
  currency: string;
  exchangeRate: string;
  unit: string;
  taxRate: string;
  tdsRate: string;
};

interface AccountingInvoiceFormProps {
  kind: InvoiceKind;
  parties: Array<{
    id: string;
    name: string;
    gstin?: string | null;
    gstTreatment?: string | null;
    placeOfSupply?: string | null;
    billingAddress?: string | null;
    shippingAddress?: string | null;
  }>;
  branches: Array<{ id: string; name: string }>;
  products?: Array<{
    id: string;
    name: string;
    price: string;
    taxPercent: string;
  }>;
  bankAccounts?: Array<{
    id: string;
    accountName: string;
    accountCode: string;
  }>;
  users?: Array<{ id: string; name: string }>;
  units?: Array<{ id: string; name: string }>;
  paymentTerms?: Array<{ id: string; name: string; dueDays: number }>;
  paymentMethods?: Array<{ id: string; name: string; methodType: string }>;
  exchangeRates?: Array<{ from: string; to: string; rate: string }>;
  isAdmin?: boolean;
  originalInvoices?: Array<{
    id: string;
    invoiceNumber: string;
    customerId?: string | null;
    supplierId?: string | null;
  }>;
}

const DEFAULT_TERM_OPTIONS = [
  { id: "due-on-receipt", name: "Due on Receipt", dueDays: 0 },
  { id: "net-15", name: "Net 15", dueDays: 15 },
  { id: "net-30", name: "Net 30", dueDays: 30 },
  { id: "net-45", name: "Net 45", dueDays: 45 },
  { id: "net-60", name: "Net 60", dueDays: 60 },
];

const DEFAULT_PAYMENT_METHOD_OPTIONS = [
  { id: "bank-transfer", name: "Bank Transfer", methodType: "BANK" },
  { id: "cash", name: "Cash", methodType: "CASH" },
  { id: "upi", name: "UPI", methodType: "DIGITAL" },
  { id: "card", name: "Card", methodType: "CARD" },
  { id: "cheque", name: "Cheque", methodType: "CHEQUE" },
];

const emptyLine = (defaultUnit = "pcs"): InvoiceLine => ({
  itemName: "",
  qty: "1",
  rate: "",
  currency: "INR",
  exchangeRate: "1",
  unit: defaultUnit,
  taxRate: "18",
  tdsRate: "0",
});

const STATE_CODE_TO_ABBR: Record<string, string> = {
  "35": "AN", "37": "AP", "12": "AR", "18": "AS", "10": "BR", "04": "CH", "22": "CG",
  "26": "DN", "07": "DL", "30": "GA", "24": "GJ", "06": "HR", "02": "HP", "01": "JK",
  "20": "JH", "29": "KA", "32": "KL", "38": "LA", "31": "LD", "23": "MP", "27": "MH",
  "14": "MN", "17": "ML", "15": "MZ", "13": "NL", "21": "OR", "34": "PY", "03": "PB",
  "08": "RJ", "11": "SK", "33": "TN", "36": "TS", "16": "TR", "09": "UP", "05": "UK",
  "19": "WB"
};

const INDIAN_STATES = [
  { code: "AN", name: "Andaman and Nicobar Islands" },
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CH", name: "Chandigarh" },
  { code: "CG", name: "Chhattisgarh" },
  { code: "DN", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "DL", name: "Delhi" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JK", name: "Jammu and Kashmir" },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "LA", name: "Ladakh" },
  { code: "LD", name: "Lakshadweep" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OR", name: "Odisha" },
  { code: "PY", name: "Puducherry" },
  { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TS", name: "Telangana" },
  { code: "TR", name: "Tripura" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "UK", name: "Uttarakhand" },
  { code: "WB", name: "West Bengal" },
];

function getBranchState(branchName: string): string {
  const name = branchName.toLowerCase();
  if (name.includes("chennai") || name.includes("staging") || name.includes("demo")) return "Tamil Nadu";
  if (name.includes("mumbai") || name.includes("maharashtra")) return "Maharashtra";
  if (name.includes("delhi")) return "Delhi";
  if (name.includes("kolkata") || name.includes("bengal")) return "West Bengal";
  if (name.includes("bengaluru") || name.includes("karnataka")) return "Karnataka";
  return "Tamil Nadu";
}

const defaultPostingDate = new Date().toISOString().split("T")[0];

export function AccountingInvoiceForm({
  branches,
  kind,
  parties,
  products = [],
  users = [],
  units: initialUnits = [],
  paymentTerms = [],
  paymentMethods = [],
  exchangeRates = [],
  isAdmin = false,
  originalInvoices = [],
}: AccountingInvoiceFormProps) {
  const router = useRouter();
  const availablePaymentTerms = paymentTerms.length
    ? paymentTerms
    : DEFAULT_TERM_OPTIONS;
  const availablePaymentMethods = paymentMethods.length
    ? paymentMethods
    : DEFAULT_PAYMENT_METHOD_OPTIONS;
  const [isSaving, setIsSaving] = useState(false);
  const [partyId, setPartyId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [postingDate, setPostingDate] = useState(defaultPostingDate);
  const [terms, setTerms] = useState(
    availablePaymentTerms[0]?.name || "Due on Receipt",
  );
  const [paymentMethod, setPaymentMethod] = useState(
    availablePaymentMethods[0]?.name || "",
  );
  const [dueDate, setDueDate] = useState(defaultPostingDate);
  const [remarks] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [taxRate] = useState("18");
  const [bankDetails] = useState("");
  const [manualNotes, setManualNotes] = useState("Thanks for your business.");
  const [termsConditions, setTermsConditions] = useState("");
  const [adjustment, setAdjustment] = useState("0");
  const [tcsRate, setTcsRate] = useState("0");
  const [roundOff, setRoundOff] = useState(false);

  // Custom unit state list
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);

  // Items from Custom Items Component
  const [customItems, setCustomItems] = useState<ItemListItem[]>([]);

  // Selected party object for address and GST display
  const [selectedParty, setSelectedParty] = useState<
    AccountingInvoiceFormProps["parties"][number] | null
  >(null);
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [originalInvoiceId, setOriginalInvoiceId] = useState("");
  const [noteReason, setNoteReason] = useState("");

  const [items, setItems] = useState<InvoiceLine[]>([]);

  // Load custom units & items
  useEffect(() => {
    const list = initialUnits.map(u => u.name);
    const standard = ["pcs", "box", "kg", "hour", "day", "job", "service"];
    const merged = Array.from(new Set([...standard, ...list]));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvailableUnits(merged);

    // Default to empty item line
    setItems([emptyLine(merged[0])]);

    // Load custom items
    void fetchAccountingItems({ activeOnly: true, limit: 500 })
      .then((itemsList) => setCustomItems(itemsList || []))
      .catch(() => setCustomItems([]));
  }, [initialUnits]);

  // Sync selected party details
  useEffect(() => {
    const party = parties.find((p) => p.id === partyId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedParty(party || null);
    if (party) {
      if (party.placeOfSupply) {
        let searchCode = party.placeOfSupply;
        if (/^\d{2}$/.test(party.placeOfSupply)) {
          searchCode = STATE_CODE_TO_ABBR[party.placeOfSupply] || party.placeOfSupply;
        }
        // Find matching place of supply state in dropdown list
        const matched = INDIAN_STATES.find(
          (s) =>
            s.name.toLowerCase() === searchCode.toLowerCase() ||
            s.code.toLowerCase() === searchCode.toLowerCase()
        );
        if (matched) {
          setPlaceOfSupply(`[${matched.code}] - ${matched.name}`);
        } else {
          setPlaceOfSupply(party.placeOfSupply);
        }
      } else {
        setPlaceOfSupply("[TN] - Tamil Nadu");
      }
    }
  }, [partyId, parties]);

  // Set default Branch/Location initials on change
  useEffect(() => {
    const branch = branches.find(b => b.id === branchId);
    if (branch) {
      const initials = branch.name.slice(0, 3).toUpperCase();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInvoiceNumber(`${initials}-ASS-SB-117`);
    } else {
      setInvoiceNumber("");
    }
  }, [branchId, branches]);

  // Recalculate due date when Posting Date or Terms change
  useEffect(() => {
    if (!postingDate) return;
    const date = new Date(postingDate);
    const selectedTerm = availablePaymentTerms.find(
      (option) => option.name === terms,
    );
    date.setDate(date.getDate() + (selectedTerm?.dueDays ?? 0));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDueDate(date.toISOString().split("T")[0]);
  }, [availablePaymentTerms, postingDate, terms]);

  function updateItem(index: number, field: keyof InvoiceLine, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = {
          ...item,
          [field]: value,
        };
        if (field === "currency" && value === "INR") next.exchangeRate = "1";
        if (field === "itemName") {
          // Check customItems first, then products prop
          const itemMatch = customItems.find(
            (candidate) => candidate.name.toLowerCase() === value.trim().toLowerCase()
          );
          if (itemMatch) {
            next.rate = String(itemMatch.rate);
            if (itemMatch.usageUnit) {
              next.unit = itemMatch.usageUnit;
            }
          } else {
            const product = products.find(
              (candidate) => candidate.name.toLowerCase() === value.trim().toLowerCase()
            );
            if (product) {
              next.rate = product.price;
              next.taxRate = product.taxPercent;
            }
          }
        }
        return next;
      })
    );
  }

  function decimalOrZero(value: string) {
    try {
      return normalizeDecimalString(value || "0", { maxScale: 8 });
    } catch {
      return "0";
    }
  }

  function lineTotal(item: InvoiceLine) {
    return multiplyDecimalStrings(
      decimalOrZero(item.qty),
      decimalOrZero(item.rate),
      decimalOrZero(item.exchangeRate)
    );
  }

  // Calculate Subtotal
  const subtotal = addDecimalStrings(...items.map(lineTotal));

  // Discount (percentage input)
  const discountAmount = divideDecimalStrings(
    multiplyDecimalStrings(subtotal, decimalOrZero(discountPercent)),
    "100",
    8
  );

  const discounted = subtractDecimalStrings(subtotal, discountAmount);
  const taxableAmount = compareDecimalStrings(discounted, "0") < 0 ? "0" : discounted;

  // Split calculations based on place of supply vs branch GST
  const selectedBranch = branches.find((b) => b.id === branchId);
  const branchState = selectedBranch ? getBranchState(selectedBranch.name) : "Tamil Nadu";

  // Extract place of supply state name
  let placeState = "Tamil Nadu";
  if (placeOfSupply) {
    const parts = placeOfSupply.split("-");
    if (parts.length > 1) {
      placeState = parts[1].trim();
    } else {
      placeState = placeOfSupply.trim();
    }
  }

  const isIntraState = placeState.toLowerCase() === branchState.toLowerCase();

  // Dynamic Item-Level Tax Calculations
  const calculatedTaxAmount = items.reduce((acc, item) => {
    const lineVal = lineTotal(item);
    const linePropTaxable = multiplyDecimalStrings(
      lineVal,
      compareDecimalStrings(subtotal, "0") > 0
        ? divideDecimalStrings(taxableAmount, subtotal, 8)
        : "1"
    );
    const itemTax = divideDecimalStrings(
      multiplyDecimalStrings(linePropTaxable, decimalOrZero(item.taxRate || taxRate)),
      "100",
      8
    );
    return addDecimalStrings(acc, itemTax);
  }, "0");

  const taxAmount = calculatedTaxAmount;

  // Dynamic TCS calculation
  const tcsAmount = divideDecimalStrings(
    multiplyDecimalStrings(taxableAmount, decimalOrZero(tcsRate)),
    "100",
    8
  );

  // Grand Total before roundoff
  let intermediateTotal = addDecimalStrings(
    addDecimalStrings(taxableAmount, taxAmount),
    addDecimalStrings(decimalOrZero(adjustment), tcsAmount)
  );

  if (compareDecimalStrings(intermediateTotal, "0") < 0) {
    intermediateTotal = "0";
  }

  // Round Off logic
  const roundedTotal = roundOff ? Math.round(Number(intermediateTotal)).toFixed(2) : intermediateTotal;
  const roundOffAmount = roundOff ? (Number(roundedTotal) - Number(intermediateTotal)).toFixed(2) : "0.00";
  const grandTotal = roundedTotal;

  async function handleAddUnit() {
    const name = prompt("Enter new unit name (e.g. box, roll, trip):");
    if (!name) return;
    const cleanName = name.trim().toLowerCase();
    if (!cleanName) return;
    if (availableUnits.includes(cleanName)) {
      toast.error("Unit already exists");
      return;
    }

    // Save inline if admin, else local only
    if (isAdmin) {
      const loading = toast.loading("Saving unit...");
      const res = await createUnitAction(cleanName);
      toast.dismiss(loading);
      if (res.ok) {
        setAvailableUnits(prev => [...prev, cleanName]);
        toast.success("Unit created and saved successfully");
      } else {
        toast.error(res.error);
      }
    } else {
      setAvailableUnits(prev => [...prev, cleanName]);
      toast.success("Unit added locally (Requires Admin Role to persist)");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!partyId) {
      toast.error(`Please select a ${partyLabel.toLowerCase()}`);
      return;
    }
    if (
      items.some(
        (item) =>
          !item.itemName ||
          compareDecimalStrings(decimalOrZero(item.qty), "0") <= 0 ||
          compareDecimalStrings(decimalOrZero(item.rate), "0") <= 0 ||
          compareDecimalStrings(decimalOrZero(item.exchangeRate), "0") <= 0
      )
    ) {
      toast.error("Please complete each line with a positive quantity, rate, and exchange rate");
      return;
    }

    setIsSaving(true);
    try {
      const common = {
        postingDate: new Date(postingDate),
        dueDate: new Date(dueDate),
        branchId: branchId || null,
        discountAmount: discountAmount.toString(),
        taxRate,
        remarks: remarks || null,
        submit: false,
        orderNumber: orderNumber || null,
        placeOfSupply: placeOfSupply || null,
        terms: terms || null,
        paymentMethod: paymentMethod || null,
        salespersonId: salespersonId || null,
        invoiceNumber: invoiceNumber || null,
      };

      let result;
      if (kind === "sales") {
        result = await createSalesInvoiceAction({
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
            unit: item.unit,
            taxRate: item.taxRate,
            tdsRate: item.tdsRate,
          })),
        });
      } else if (kind === "purchase") {
        result = await createPurchaseInvoiceAction({
          ...common,
          supplierId: partyId,
          items: items.map((item) => ({
            itemName: item.itemName,
            qty: item.qty,
            rate: item.rate,
            unit: item.unit,
            taxRate: item.taxRate,
            tdsRate: item.tdsRate,
          })),
        });
      } else if (kind.startsWith("sales-")) {
        result = await createCustomerNoteAction({
          ...common,
          customerId: partyId,
          noteType: kind === "sales-credit" ? "CREDIT" : "DEBIT",
          originalInvoiceId: originalInvoiceId || null,
          reason: noteReason || null,
          noteNumber: invoiceNumber || null,
          items: items.map((item) => ({
            itemName: item.itemName,
            qty: item.qty,
            rate: item.rate,
            taxRate: item.taxRate,
            unit: item.unit,
            tdsRate: item.tdsRate,
          })),
        });
      } else {
        // purchase-credit or purchase-debit
        result = await createVendorNoteAction({
          ...common,
          vendorId: partyId,
          noteType: kind === "purchase-credit" ? "CREDIT" : "DEBIT",
          originalInvoiceId: originalInvoiceId || null,
          reason: noteReason || null,
          noteNumber: invoiceNumber || null,
          items: items.map((item) => ({
            itemName: item.itemName,
            qty: item.qty,
            rate: item.rate,
            taxRate: item.taxRate,
            unit: item.unit,
            tdsRate: item.tdsRate,
          })),
        });
      }

      if (result.ok) {
        let msg = "";
        let redirectPath = "";
        if (kind === "sales") {
          msg = "Sales invoice draft saved";
          redirectPath = "/accounting/sales-invoices";
        } else if (kind === "purchase") {
          msg = "Purchase invoice draft saved";
          redirectPath = "/accounting/purchase-invoices";
        } else if (kind.endsWith("credit")) {
          msg = `${kind.startsWith("sales") ? "Customer" : "Vendor"} credit note draft saved`;
          redirectPath = "/accounting/credit-notes";
        } else {
          msg = `${kind.startsWith("sales") ? "Customer" : "Vendor"} debit note draft saved`;
          redirectPath = "/accounting/debit-notes";
        }

        toast.success(msg);
        router.push(redirectPath);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create document"
      );
    } finally {
      setIsSaving(false);
    }
  }

  const partyLabel = kind.startsWith("sales") ? "Customer" : "Supplier";

  return (
    <form className="mnx-accounting-form space-y-6" onSubmit={handleSubmit}>
      <AccountingSection
        eyebrow="01"
        title="Parties and ownership"
        description="Set the customer addresses, supply locations, billing parameters, and references."
      >
        <div className="space-y-4">
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label={`${partyLabel} Name`} required>
              <div className="flex gap-2">
                <AccountingSelect
                  required
                  value={partyId}
                  onChange={(event) => setPartyId(event.target.value)}
                  className="flex-1"
                >
                  <option value="">Select {partyLabel.toLowerCase()}</option>
                  {parties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.name}
                    </option>
                  ))}
                </AccountingSelect>
                <div className="flex items-center justify-center px-3 bg-[var(--mnx-surface-nav)] border border-[var(--mnx-border)] rounded text-xs font-semibold text-[var(--mnx-text-muted)] uppercase">
                  INR
                </div>
              </div>
            </AccountingField>

            <AccountingField label="Branch / Location">
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
          </div>

          {/* Dynamic Billing/Delivery Addresses and GST details */}
          {selectedParty && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-[var(--mnx-border)] rounded bg-[var(--mnx-surface-nav)] text-sm">
              <div>
                <h4 className="text-xs font-bold text-[var(--mnx-text-muted)] tracking-wider uppercase mb-1">
                  Billing Address
                </h4>
                <p className="text-[var(--mnx-text)] whitespace-pre-wrap">
                  {selectedParty.billingAddress || "No billing address configured"}
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-1">
                  New Address
                </Button>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[var(--mnx-text-muted)] tracking-wider uppercase mb-1">
                  Shipping Address (Delivery)
                </h4>
                <p className="text-[var(--mnx-text)] whitespace-pre-wrap">
                  {selectedParty.shippingAddress || "No shipping address configured"}
                </p>
                <div className="flex gap-3 mt-1">
                  <Button type="button" variant="outline" size="sm">New Address</Button>
                  <Button type="button" variant="outline" size="sm">+ Dropshipping Address</Button>
                </div>
              </div>

              <div className="border-t border-[var(--mnx-border)] pt-3 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <h4 className="text-xs font-bold text-[var(--mnx-text-muted)] tracking-wider uppercase mb-1">
                    Billing Recipient GST Details
                  </h4>
                  <p className="text-xs">
                    <span className="font-semibold text-[var(--mnx-text-muted)]">GST Treatment:</span>{" "}
                    {selectedParty.gstTreatment || "Consumer"}
                  </p>
                  {selectedParty.gstin && (
                    <p className="text-xs mt-0.5">
                      <span className="font-semibold text-[var(--mnx-text-muted)]">GSTIN:</span>{" "}
                      {selectedParty.gstin}
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[var(--mnx-text-muted)] tracking-wider uppercase mb-1">
                    Shipping Recipient GST Details
                  </h4>
                  <p className="text-xs">
                    <span className="font-semibold text-[var(--mnx-text-muted)]">GSTIN:</span>{" "}
                    {selectedParty.gstin || "URP"}
                  </p>
                  <p className="text-xs mt-0.5">
                    <span className="font-semibold text-[var(--mnx-text-muted)]">Business Legal Name:</span>{" "}
                    {selectedParty.name}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Place of Supply*" required>
              <AccountingSelect
                value={placeOfSupply}
                onChange={(event) => setPlaceOfSupply(event.target.value)}
              >
                {INDIAN_STATES.map((state) => (
                  <option key={state.code} value={`[${state.code}] - ${state.name}`}>
                    [{state.code}] - {state.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>

            <AccountingField label={kind === "sales" || kind === "purchase" ? "Invoice#*" : "Note#*"}>
              <div className="flex gap-2">
                <AccountingSelect
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                  className="w-1/3"
                >
                  <option value="">Global</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </AccountingSelect>
                <AccountingInput
                  required
                  placeholder="Invoice Number"
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  className="flex-1"
                />
              </div>
            </AccountingField>

            <AccountingField label="Order Number">
              <AccountingInput
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value)}
                placeholder="Enter Order Number"
              />
            </AccountingField>

            {(kind === "sales-credit" || kind === "sales-debit" || kind === "purchase-credit" || kind === "purchase-debit") && (
              <>
                <AccountingOptionalInvoiceLink
                  value={originalInvoiceId}
                  onChange={setOriginalInvoiceId}
                  options={originalInvoices
                    .filter((invoice) =>
                      kind.startsWith("sales")
                        ? !invoice.supplierId
                        : !invoice.customerId,
                    )
                    .map((invoice) => ({
                      id: invoice.id,
                      label: invoice.invoiceNumber,
                    }))}
                />

                <AccountingNoteReasonSelect
                  kind={kind}
                  value={noteReason}
                  onChange={setNoteReason}
                />
              </>
            )}

            <AccountingField label="Invoice Date (Posting Date)*" required>
              <DateInput
                required
                value={postingDate}
                onChange={(event) => setPostingDate(event.target.value)}
              />
            </AccountingField>

            <AccountingField label="Terms">
              <AccountingSelect
                value={terms}
                onChange={(event) => setTerms(event.target.value)}
              >
                {availablePaymentTerms.map((term) => (
                  <option key={term.id} value={term.name}>
                    {term.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>

            <AccountingField label="Due Date*" required>
              <DateInput
                required
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </AccountingField>

            <AccountingField label="Payment Method">
              <AccountingSelect
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              >
                <option value="">Select payment method</option>
                {availablePaymentMethods.map((method) => (
                  <option key={method.id} value={method.name}>
                    {method.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>

            <AccountingField label="Salesperson">
              <AccountingSelect
                value={salespersonId}
                onChange={(event) => setSalespersonId(event.target.value)}
              >
                <option value="">Select or Add Salesperson</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
          </div>
        </div>
      </AccountingSection>

      <AccountingSection
        eyebrow="02"
        title="Item Table"
        description="Add billable services or goods in table lines instead of cards."
      >
        <div className="overflow-x-auto border border-[var(--mnx-border)] rounded bg-[var(--mnx-surface)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--mnx-surface-nav)] border-b border-[var(--mnx-border)] text-left text-xs font-bold text-[var(--mnx-text-muted)] uppercase">
                <th className="p-3 min-w-[280px] whitespace-nowrap">Item Details</th>
                <th className="p-3 min-w-[110px] whitespace-nowrap">Currency</th>
                <th className="p-3 min-w-[132px] whitespace-nowrap text-right">Exchange Rate</th>
                <th className="p-3 min-w-[120px] whitespace-nowrap">Unit</th>
                <th className="p-3 min-w-[100px] whitespace-nowrap text-right">Quantity</th>
                <th className="p-3 min-w-[120px] whitespace-nowrap text-right">Rate</th>
                <th className="p-3 min-w-[120px] whitespace-nowrap">Tax</th>
                <th className="p-3 min-w-[120px] whitespace-nowrap">TDS</th>
                <th className="p-3 min-w-[120px] whitespace-nowrap text-right">Amount</th>
                <th className="p-3 w-[60px] whitespace-nowrap text-center"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-[var(--mnx-border)] hover:bg-[var(--mnx-surface-hover)] align-top">
                  <td className="p-3 min-w-[280px]">
                    <AccountingInput
                      required
                      value={item.itemName}
                      list={
                        products.length > 0 || customItems.length > 0
                          ? "accounting-products"
                          : undefined
                      }
                      onChange={(event) => updateItem(index, "itemName", event.target.value)}
                      placeholder="Type or click to select an item"
                      className="w-full"
                    />
                  </td>
                  <td className="p-3 min-w-[110px] whitespace-nowrap">
                    <AccountingSelect
                      value={item.currency}
                      onChange={(event) => {
                        const nextCurrency = event.target.value;
                        let suggestedRate = "1";
                        if (nextCurrency !== "INR") {
                          const rateObj = exchangeRates.find(
                            (rate) => rate.from === nextCurrency && rate.to === "INR",
                          );
                          if (rateObj) suggestedRate = rateObj.rate;
                        }
                        updateItem(index, "currency", nextCurrency);
                        updateItem(index, "exchangeRate", suggestedRate);
                      }}
                      className="w-full whitespace-nowrap"
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="SGD">SGD</option>
                    </AccountingSelect>
                  </td>
                  <td className="p-3 min-w-[132px] whitespace-nowrap">
                    <AccountingInput
                      required
                      disabled={item.currency === "INR"}
                      type="number"
                      min="0.0001"
                      step="any"
                      value={item.exchangeRate}
                      onChange={(event) => updateItem(index, "exchangeRate", event.target.value)}
                      className="w-full text-right"
                    />
                  </td>
                  <td className="p-3 min-w-[120px] whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <AccountingSelect
                        value={item.unit}
                        onChange={(event) => updateItem(index, "unit", event.target.value)}
                        className="w-full whitespace-nowrap"
                      >
                        {availableUnits.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </AccountingSelect>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddUnit}
                        className="whitespace-nowrap"
                      >
                        + Create unit
                      </Button>
                    </div>
                  </td>
                  <td className="p-3 min-w-[100px] whitespace-nowrap">
                    <AccountingInput
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.qty}
                      onChange={(event) => updateItem(index, "qty", event.target.value)}
                      className="text-right w-full"
                    />
                  </td>
                  <td className="p-3 min-w-[120px] whitespace-nowrap">
                    <AccountingInput
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.rate}
                      onChange={(event) => updateItem(index, "rate", event.target.value)}
                      className="text-right w-full"
                    />
                  </td>
                  <td className="p-3 min-w-[120px] whitespace-nowrap">
                    <AccountingSelect
                      value={item.taxRate}
                      onChange={(event) => updateItem(index, "taxRate", event.target.value)}
                      className="w-full whitespace-nowrap"
                    >
                      <option value="0">GST0 [0%]</option>
                      <option value="5">GST5 [5%]</option>
                      <option value="12">GST12 [12%]</option>
                      <option value="18">GST18 [18%]</option>
                      <option value="28">GST28 [28%]</option>
                    </AccountingSelect>
                  </td>
                  <td className="p-3 min-w-[120px] whitespace-nowrap">
                    <AccountingSelect
                      value={item.tdsRate}
                      onChange={(event) => updateItem(index, "tdsRate", event.target.value)}
                      className="w-full whitespace-nowrap"
                    >
                      <option value="0">Select a Tax</option>
                      <option value="1">TDS [1%]</option>
                      <option value="2">TDS [2%]</option>
                      <option value="5">TDS [5%]</option>
                      <option value="10">TDS [10%]</option>
                    </AccountingSelect>
                  </td>
                  <td className="p-3 min-w-[120px] whitespace-nowrap text-right font-medium text-[var(--mnx-text)]">
                    {formatAccountingMoney(lineTotal(item), "INR")}
                  </td>
                  <td className="p-3 whitespace-nowrap text-center">
                    <button
                      type="button"
                      aria-label={`Remove item ${index + 1}`}
                      onClick={() => {
                        if (items.length <= 1) {
                          toast.error("At least one line item is required");
                          return;
                        }
                        setItems((current) => current.filter((_, i) => i !== index));
                      }}
                      className="text-[var(--mnx-destructive)] hover:text-red-700 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-3 mt-3">
          <AccountingAction
            type="button"
            variant="secondary"
            onClick={() => setItems((current) => [...current, emptyLine(availableUnits[0] || "pcs")])}
          >
            <Plus aria-hidden="true" size={14} className="mr-1" />
            Add New Row
          </AccountingAction>
          <AccountingAction
            type="button"
            variant="secondary"
            onClick={() => toast.info("Bulk item insertion feature is currently stubbed")}
          >
            Add Items in Bulk
          </AccountingAction>
        </div>
      </AccountingSection>

      <AccountingSection
        eyebrow="03"
        title="Totals and notes"
        description="Apply document-level discounts, adjustments, roundoffs and split taxes before final posting."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 align-top">
          <div className="space-y-4">
            <AccountingField label="Customer Notes">
              <AccountingTextarea
                rows={3}
                value={manualNotes}
                onChange={(event) => setManualNotes(event.target.value)}
                placeholder="Thanks for your business."
              />
              <span className="text-xs text-[var(--mnx-text-muted)] block mt-0.5">
                Will be displayed on the invoice
              </span>
            </AccountingField>

            <AccountingField label="Terms & Conditions">
              <AccountingTextarea
                rows={3}
                value={termsConditions}
                onChange={(event) => setTermsConditions(event.target.value)}
                placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
              />
            </AccountingField>

            <div className="pt-4 border-t border-[var(--mnx-border)]">
              <h4 className="text-xs font-bold text-[var(--mnx-text-muted)] tracking-wider uppercase mb-2">
                Attach File(s) to Invoice
              </h4>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info("File upload will be triggered on invoice save")}
                >
                  <Upload size={14} />
                  Upload File
                </Button>
                <span className="text-[10px] text-[var(--mnx-text-muted)]">
                  You can upload a maximum of 10 files, 10MB each
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Totals Table */}
          <div className="bg-[var(--mnx-surface-nav)] border border-[var(--mnx-border)] rounded p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-[var(--mnx-text-muted)]">Sub Total</span>
              <span className="font-bold">{formatAccountingMoney(subtotal, "INR")}</span>
            </div>

            <div className="flex justify-between items-center text-sm gap-4">
              <span className="font-semibold text-[var(--mnx-text-muted)]">Discount</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-[var(--mnx-border)] rounded bg-[var(--mnx-surface)] w-24">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={discountPercent}
                    onChange={(event) => setDiscountPercent(event.target.value)}
                    className="w-full text-right bg-transparent border-0 px-2 py-1 text-xs focus:ring-0 focus:outline-none"
                  />
                  <span className="px-1 text-xs text-[var(--mnx-text-muted)] font-semibold border-l border-[var(--mnx-border)]">%</span>
                </div>
                <span className="font-bold w-20 text-right">{formatAccountingMoney(discountAmount, "INR")}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm gap-4">
              <span className="font-semibold text-[var(--mnx-text-muted)] flex items-center gap-1">
                Adjustment
                <span title="Add manual adjustment (e.g. freight, rounded value)"><HelpCircle size={14} className="text-[var(--mnx-text-muted)] cursor-help" /></span>
              </span>
              <div className="flex items-center gap-2">
                <AccountingInput
                  type="number"
                  step="any"
                  value={adjustment}
                  onChange={(event) => setAdjustment(event.target.value)}
                  className="w-24 text-right h-8 text-xs"
                />
                <span className="font-bold w-20 text-right">{formatAccountingMoney(decimalOrZero(adjustment), "INR")}</span>
              </div>
            </div>

            {/* Dynamic CGST + SGST vs IGST split labels and values */}
            {compareDecimalStrings(taxAmount, "0") > 0 && (
              <div className="pt-2 border-t border-[var(--mnx-border)] space-y-2">
                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                  GST Classification: {isIntraState ? "Intrastate (CGST & SGST)" : "Interstate (IGST)"}
                </div>
                {isIntraState ? (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-[var(--mnx-text-muted)]">CGST</span>
                      <span className="font-bold">{formatAccountingMoney(divideDecimalStrings(taxAmount, "2", 8), "INR")}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-[var(--mnx-text-muted)]">SGST</span>
                      <span className="font-bold">{formatAccountingMoney(divideDecimalStrings(taxAmount, "2", 8), "INR")}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-[var(--mnx-text-muted)]">IGST</span>
                    <span className="font-bold">{formatAccountingMoney(taxAmount, "INR")}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center text-sm gap-4">
              <span className="font-semibold text-[var(--mnx-text-muted)] flex items-center gap-1">
                TCS
                <span title="Tax Collected at Source (TCS) rate selection"><HelpCircle size={14} className="text-[var(--mnx-text-muted)] cursor-help" /></span>
              </span>
              <div className="flex items-center gap-2">
                <AccountingSelect
                  value={tcsRate}
                  onChange={(event) => setTcsRate(event.target.value)}
                  className="w-24 text-xs h-8"
                >
                  <option value="0">Select a Tax</option>
                  <option value="0.075">TCS [0.075%]</option>
                  <option value="0.1">TCS [0.1%]</option>
                  <option value="1">TCS [1%]</option>
                </AccountingSelect>
                <span className="font-bold w-20 text-right">{formatAccountingMoney(tcsAmount, "INR")}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm pt-2 border-t border-[var(--mnx-border)]">
              <span className="font-semibold text-[var(--mnx-text-muted)]">Round Off</span>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={roundOff}
                  onChange={(event) => setRoundOff(event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--mnx-border)] text-blue-600 focus:ring-blue-500"
                />
                <span className="font-bold text-xs text-[var(--mnx-text-muted)]">({roundOffAmount})</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-base pt-3 border-t border-double border-[var(--mnx-border)]">
              <span className="font-bold text-[var(--mnx-text-muted)]">Total ( ₹ )</span>
              <span className="font-extrabold text-lg text-blue-600">
                {formatAccountingMoney(grandTotal, "INR")}
              </span>
            </div>
          </div>
        </div>
      </AccountingSection>

      <AccountingMetrics>
        <AccountingMetric
          label="Subtotal"
          value={formatAccountingMoney(subtotal, "INR")}
        />
        <AccountingMetric
          label="Taxable amount"
          value={formatAccountingMoney(taxableAmount, "INR")}
        />
        <AccountingMetric
          label={isIntraState ? "CGST & SGST Split" : "IGST Total"}
          value={formatAccountingMoney(taxAmount, "INR")}
        />
        <AccountingMetric
          label="Grand total"
          value={formatAccountingMoney(grandTotal, "INR")}
        />
      </AccountingMetrics>

      <div className="mnx-accounting-form-actions flex justify-end">
        <AccountingAction disabled={isSaving} type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition flex items-center gap-2">
          {isSaving ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : null}
          {isSaving ? "Saving…" : `Create ${
            kind === "sales" ? "sales invoice" :
            kind === "purchase" ? "purchase invoice" :
            kind === "sales-credit" ? "credit note" :
            kind === "sales-debit" ? "debit note" :
            kind === "purchase-credit" ? "credit note" :
            "debit note"
          }`}
        </AccountingAction>
      </div>

      {products.length > 0 || customItems.length > 0 ? (
        <datalist id="accounting-products">
          {products.map((product) => (
            <option key={product.id} value={product.name} />
          ))}
          {customItems
            .filter(
              (item) =>
                !products.some(
                  (product) =>
                    product.name.toLowerCase() === item.name.toLowerCase(),
                ),
            )
            .map((item) => (
              <option key={item.id} value={item.name} />
            ))}
        </datalist>
      ) : null}
    </form>
  );
}
