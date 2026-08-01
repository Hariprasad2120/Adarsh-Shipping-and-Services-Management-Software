"use client";

import { Download, Loader2, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  deleteItems,
  generateItemId,
  getAllItems,
  saveCustomItem,
  updateItemsStatus,
} from "@/lib/items/item-store";
import type {
  ItemFilter,
  ItemListItem,
  ItemType,
  PriceListItem,
  TaxPreference,
} from "@/lib/items/types";
import { itemFormSchema } from "@/lib/items/validation";
import {
  AccountingAction,
  AccountingActionLink,
  AccountingAlert,
  AccountingCheckbox,
  AccountingDetail,
  AccountingDetailList,
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
} from "./accounting-workspace";

const PAGE_SIZE = 25;

function matchesFilter(item: ItemListItem, filter: ItemFilter) {
  if (filter === "active") return item.status === "Active";
  if (filter === "inactive") return item.status === "Inactive";
  if (filter === "goods") return item.type === "Goods";
  if (filter === "services") return item.type === "Service";
  return true;
}

export function AccountingItemsList() {
  const [items, setItems] = useState<ItemListItem[]>([]);
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const importRef = useRef<HTMLInputElement>(null);

  const refresh = () => setItems(getAllItems());
  useEffect(() => {
    const refreshTimer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(refreshTimer);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!matchesFilter(item, filter)) return false;
      if (!query) return true;
      return [item.name, item.sku, item.description, item.hsnSac, item.usageUnit]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });
  }, [filter, items, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const visibleSelected = visible.length > 0 && visible.every((item) => selected.has(item.id));

  function resetView(nextFilter = filter) {
    setFilter(nextFilter);
    setPage(1);
    setSelected(new Set());
  }

  function setStatus(status: "Active" | "Inactive") {
    const ids = [...selected];
    if (!ids.length) return toast.error("Select at least one item");
    updateItemsStatus(ids, status);
    refresh();
    setSelected(new Set());
    toast.success(`Selected items marked ${status.toLowerCase()}`);
  }

  function removeSelected() {
    const ids = [...selected];
    if (!ids.length) return toast.error("Select at least one item");
    if (!window.confirm(`Delete ${ids.length} selected item${ids.length === 1 ? "" : "s"}?`)) return;
    deleteItems(ids);
    refresh();
    setSelected(new Set());
    toast.success("Selected items deleted");
  }

  function exportItems() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "accounting-items.json";
    anchor.click();
    URL.revokeObjectURL(href);
    toast.success("Items exported");
  }

  function importItems(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const records = JSON.parse(String(reader.result));
        if (!Array.isArray(records)) throw new Error("Expected an array");
        records.forEach((record: Partial<ItemListItem>) => {
          if (!record.name) return;
          saveCustomItem({
            id: record.id || generateItemId(),
            name: record.name,
            sku: record.sku,
            purchaseDescription: record.purchaseDescription,
            purchaseRate: Number(record.purchaseRate) || 0,
            description: record.description,
            rate: Number(record.rate) || 0,
            hsnSac: record.hsnSac,
            usageUnit: record.usageUnit,
            type: record.type === "Goods" ? "Goods" : "Service",
            taxPreference: record.taxPreference === "Non-Taxable" ? "Non-Taxable" : "Taxable",
            status: record.status === "Inactive" ? "Inactive" : "Active",
            priceList: record.priceList,
            priceListAuto: record.priceListAuto ?? true,
          });
        });
        refresh();
        toast.success("Items imported");
      } catch {
        toast.error("The selected file is not a valid items export");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  return (
    <>
      <AccountingRoutePageHeader
        actions={
          <AccountingActionLink href="/accounting/items/new" variant="primary">
            <Plus aria-hidden="true" /> New item
          </AccountingActionLink>
        }
      />
      <AccountingMetrics>
        <AccountingMetric label="Catalogue items" value={items.length} detail="All products and services" />
        <AccountingMetric label="Active" value={items.filter((item) => item.status === "Active").length} detail="Available for use" />
        <AccountingMetric label="Goods" value={items.filter((item) => item.type === "Goods").length} detail="Inventory-capable items" />
        <AccountingMetric label="Services" value={items.filter((item) => item.type === "Service").length} detail="Billable service items" />
      </AccountingMetrics>
      <AccountingSection
        eyebrow="Catalogue register"
        title="Products and services"
        description="Search, filter, maintain, import, and export the Accounting item catalogue."
      >
        <AccountingToolbar>
          <AccountingInput
            aria-label="Search items"
            placeholder="Search name, SKU, HSN/SAC, unit, or description"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <AccountingSelect
            aria-label="Filter items"
            value={filter}
            onChange={(event) => resetView(event.target.value as ItemFilter)}
          >
            <option value="all">All items</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="goods">Goods</option>
            <option value="services">Services</option>
          </AccountingSelect>
          <AccountingAction type="button" variant="secondary" onClick={refresh}>
            <RefreshCw aria-hidden="true" /> Refresh
          </AccountingAction>
          <AccountingAction type="button" variant="secondary" onClick={() => importRef.current?.click()}>
            <Upload aria-hidden="true" /> Import
          </AccountingAction>
          <AccountingAction type="button" variant="secondary" onClick={exportItems}>
            <Download aria-hidden="true" /> Export
          </AccountingAction>
          <input ref={importRef} hidden type="file" accept=".json,application/json" onChange={importItems} />
        </AccountingToolbar>
        {selected.size ? (
          <AccountingAlert variant="info">
            <span>{selected.size} selected.</span>
            <AccountingAction type="button" variant="secondary" onClick={() => setStatus("Active")}>Mark active</AccountingAction>
            <AccountingAction type="button" variant="secondary" onClick={() => setStatus("Inactive")}>Mark inactive</AccountingAction>
            <AccountingAction type="button" variant="destructive" onClick={removeSelected}><Trash2 aria-hidden="true" /> Delete</AccountingAction>
          </AccountingAlert>
        ) : null}
        <AccountingTable>
          <thead>
            <tr>
              <th>
                <AccountingCheckbox
                  aria-label="Select visible items"
                  checked={visibleSelected}
                  onChange={() => {
                    const next = new Set(selected);
                    visible.forEach((item) => visibleSelected ? next.delete(item.id) : next.add(item.id));
                    setSelected(next);
                  }}
                />
              </th>
              <th>Item</th>
              <th>Type</th>
              <th>SKU / HSN</th>
              <th>Unit</th>
              <th>Sales rate</th>
              <th>Purchase rate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.length ? visible.map((item) => (
              <tr key={item.id}>
                <td>
                  <AccountingCheckbox
                    aria-label={`Select ${item.name}`}
                    checked={selected.has(item.id)}
                    onChange={() => {
                      const next = new Set(selected);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      setSelected(next);
                    }}
                  />
                </td>
                <td>
                  <Link href={`/accounting/items/${item.id}`} className="mnx-accounting-record-link">
                    <strong>{item.name}</strong>
                    <span>{item.description || item.id}</span>
                  </Link>
                </td>
                <td>{item.type}</td>
                <td>{item.sku || item.hsnSac || "—"}</td>
                <td>{item.usageUnit || "—"}</td>
                <td className="mnx-accounting-amount">₹{item.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                <td className="mnx-accounting-amount">₹{item.purchaseRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                <td><AccountingStatus status={item.status} /></td>
              </tr>
            )) : <AccountingEmptyTableRow colSpan={8}>No items match the current catalogue filters.</AccountingEmptyTableRow>}
          </tbody>
        </AccountingTable>
        <div className="mnx-accounting-pagination">
          <span>Showing {visible.length} of {filtered.length} items</span>
          <div>
            <AccountingAction type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</AccountingAction>
            <span>Page {page} of {pageCount}</span>
            <AccountingAction type="button" variant="secondary" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</AccountingAction>
          </div>
        </div>
      </AccountingSection>
    </>
  );
}

type ItemDraft = {
  name: string;
  type: ItemType;
  unit: string;
  sku: string;
  hsnSac: string;
  taxPreference: TaxPreference;
  taxRate: string;
  exemptionReason: string;
  sellingPrice: number;
  salesAccount: string;
  salesDescription: string;
  purchaseInformation: boolean;
  costPrice: number;
  purchaseAccount: string;
  purchaseDescription: string;
  inventoryTracking: boolean;
  openingStock: number;
  reorderPoint: number;
  chargeCategory: string;
  applicableFor: string;
  defaultContainerType: string;
  priceListAuto: boolean;
  priceList: PriceListItem[];
};

const initialDraft = (): ItemDraft => ({
  name: "",
  type: "Service",
  unit: "",
  sku: "",
  hsnSac: "",
  taxPreference: "Taxable",
  taxRate: "18",
  exemptionReason: "",
  sellingPrice: 0,
  salesAccount: "Sales",
  salesDescription: "",
  purchaseInformation: false,
  costPrice: 0,
  purchaseAccount: "",
  purchaseDescription: "",
  inventoryTracking: false,
  openingStock: 0,
  reorderPoint: 0,
  chargeCategory: "",
  applicableFor: "",
  defaultContainerType: "",
  priceListAuto: true,
  priceList: [],
});

export function AccountingNewItemForm() {
  const router = useRouter();
  const [draft, setDraft] = useState<ItemDraft>(initialDraft);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function addPrice() {
    update("priceList", [...draft.priceList, { currency: "USD", exchangeRate: 83, useAutomatic: true }]);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saveAndNew =
      ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)
        ?.value === "save-and-new";
    const parsed = itemFormSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Please review the item details");
      return;
    }
    setSaving(true);
    try {
      saveCustomItem({
        id: generateItemId(),
        name: parsed.data.name,
        sku: parsed.data.sku || undefined,
        purchaseDescription: parsed.data.purchaseDescription || undefined,
        purchaseRate: parsed.data.costPrice || 0,
        description: parsed.data.salesDescription || undefined,
        rate: parsed.data.sellingPrice,
        hsnSac: parsed.data.hsnSac || undefined,
        usageUnit: parsed.data.unit || undefined,
        type: parsed.data.type,
        taxPreference: parsed.data.taxPreference,
        status: "Active",
        priceList: parsed.data.priceList,
        priceListAuto: parsed.data.priceListAuto,
      });
      toast.success("Item saved");
      if (saveAndNew) setDraft(initialDraft());
      else router.push("/accounting/items");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AccountingRoutePageHeader actions={<AccountingActionLink href="/accounting/items">Back to items</AccountingActionLink>} />
      <form className="mnx-accounting-form" onSubmit={save}>
        <AccountingAlert variant="info">
          Inventory values are catalogue controls in this workspace. Stock movements remain governed by operational inventory transactions.
        </AccountingAlert>
        <AccountingSection eyebrow="01" title="Primary information" description="Identify the catalogue item and define its tax treatment.">
          <div className="mnx-accounting-form-grid">
            <AccountingField label="Item name" required><AccountingInput required value={draft.name} onChange={(event) => update("name", event.target.value)} /></AccountingField>
            <AccountingField label="Type" required><AccountingSelect value={draft.type} onChange={(event) => update("type", event.target.value as ItemType)}><option>Service</option><option>Goods</option></AccountingSelect></AccountingField>
            <AccountingField label="Unit"><AccountingInput value={draft.unit} onChange={(event) => update("unit", event.target.value)} placeholder="Nos, Kg, Hour" /></AccountingField>
            <AccountingField label="SKU"><AccountingInput value={draft.sku} onChange={(event) => update("sku", event.target.value)} /></AccountingField>
            <AccountingField label="HSN / SAC"><AccountingInput value={draft.hsnSac} onChange={(event) => update("hsnSac", event.target.value)} /></AccountingField>
            <AccountingField label="Tax preference"><AccountingSelect value={draft.taxPreference} onChange={(event) => update("taxPreference", event.target.value as TaxPreference)}><option>Taxable</option><option>Non-Taxable</option></AccountingSelect></AccountingField>
            {draft.taxPreference === "Taxable" ? (
              <AccountingField label="Tax rate" required><AccountingInput required value={draft.taxRate} onChange={(event) => update("taxRate", event.target.value)} placeholder="18" /></AccountingField>
            ) : (
              <AccountingField label="Exemption reason" required><AccountingInput required value={draft.exemptionReason} onChange={(event) => update("exemptionReason", event.target.value)} /></AccountingField>
            )}
          </div>
        </AccountingSection>
        <AccountingSection eyebrow="02" title="Sales and purchase" description="Set default ledger classifications, descriptions, and rates.">
          <div className="mnx-accounting-form-grid">
            <AccountingField label="Selling price" required><AccountingInput required type="number" min="0" step="0.01" value={draft.sellingPrice} onChange={(event) => update("sellingPrice", Number(event.target.value))} /></AccountingField>
            <AccountingField label="Sales account" required><AccountingInput required value={draft.salesAccount} onChange={(event) => update("salesAccount", event.target.value)} /></AccountingField>
            <AccountingField label="Sales description" className="mnx-accounting-field-span"><AccountingTextarea value={draft.salesDescription} onChange={(event) => update("salesDescription", event.target.value)} /></AccountingField>
            <AccountingCheckbox checked={draft.purchaseInformation} onChange={(event) => update("purchaseInformation", event.target.checked)} label="Maintain purchase information" />
            {draft.purchaseInformation ? (
              <>
                <AccountingField label="Cost price"><AccountingInput type="number" min="0" step="0.01" value={draft.costPrice} onChange={(event) => update("costPrice", Number(event.target.value))} /></AccountingField>
                <AccountingField label="Purchase account"><AccountingInput value={draft.purchaseAccount} onChange={(event) => update("purchaseAccount", event.target.value)} /></AccountingField>
                <AccountingField label="Purchase description" className="mnx-accounting-field-span"><AccountingTextarea value={draft.purchaseDescription} onChange={(event) => update("purchaseDescription", event.target.value)} /></AccountingField>
              </>
            ) : null}
          </div>
        </AccountingSection>
        <AccountingSection eyebrow="03" title="Inventory and logistics" description="Capture optional inventory thresholds and freight classifications.">
          <div className="mnx-accounting-form-grid">
            <AccountingCheckbox checked={draft.inventoryTracking} onChange={(event) => update("inventoryTracking", event.target.checked)} label="Track inventory" />
            {draft.inventoryTracking ? (
              <>
                <AccountingField label="Opening stock"><AccountingInput type="number" min="0" value={draft.openingStock} onChange={(event) => update("openingStock", Number(event.target.value))} /></AccountingField>
                <AccountingField label="Reorder point"><AccountingInput type="number" min="0" value={draft.reorderPoint} onChange={(event) => update("reorderPoint", Number(event.target.value))} /></AccountingField>
              </>
            ) : null}
            <AccountingField label="Charge category"><AccountingInput value={draft.chargeCategory} onChange={(event) => update("chargeCategory", event.target.value)} /></AccountingField>
            <AccountingField label="Applicable for"><AccountingInput value={draft.applicableFor} onChange={(event) => update("applicableFor", event.target.value)} /></AccountingField>
            <AccountingField label="Default container type"><AccountingInput value={draft.defaultContainerType} onChange={(event) => update("defaultContainerType", event.target.value)} /></AccountingField>
          </div>
        </AccountingSection>
        <AccountingSection
          eyebrow="04"
          title="Multi-currency price list"
          description="Store optional currency-specific exchange rates and selling prices."
          actions={<AccountingAction type="button" variant="secondary" onClick={addPrice}><Plus aria-hidden="true" /> Add currency</AccountingAction>}
        >
          {draft.priceList.length ? (
            <AccountingTable>
              <thead><tr><th>Currency</th><th>Exchange rate</th><th>Custom price</th><th>Mode</th><th>Action</th></tr></thead>
              <tbody>
                {draft.priceList.map((price, index) => (
                  <tr key={`${price.currency}-${index}`}>
                    <td><AccountingInput aria-label={`Currency ${index + 1}`} value={price.currency} onChange={(event) => update("priceList", draft.priceList.map((item, itemIndex) => itemIndex === index ? { ...item, currency: event.target.value.toUpperCase() } : item))} /></td>
                    <td><AccountingInput aria-label={`Exchange rate ${index + 1}`} type="number" min="0.0001" step="0.0001" value={price.exchangeRate} onChange={(event) => update("priceList", draft.priceList.map((item, itemIndex) => itemIndex === index ? { ...item, exchangeRate: Number(event.target.value) } : item))} /></td>
                    <td><AccountingInput aria-label={`Custom price ${index + 1}`} type="number" min="0" step="0.01" value={price.customPrice ?? ""} onChange={(event) => update("priceList", draft.priceList.map((item, itemIndex) => itemIndex === index ? { ...item, customPrice: event.target.value ? Number(event.target.value) : undefined } : item))} /></td>
                    <td><AccountingCheckbox checked={price.useAutomatic ?? true} onChange={(event) => update("priceList", draft.priceList.map((item, itemIndex) => itemIndex === index ? { ...item, useAutomatic: event.target.checked } : item))} label="Automatic" /></td>
                    <td><AccountingAction type="button" variant="destructive" aria-label={`Remove currency ${index + 1}`} onClick={() => update("priceList", draft.priceList.filter((_, itemIndex) => itemIndex !== index))}><Trash2 aria-hidden="true" /></AccountingAction></td>
                  </tr>
                ))}
              </tbody>
            </AccountingTable>
          ) : <AccountingAlert variant="info">No foreign-currency prices have been configured.</AccountingAlert>}
        </AccountingSection>
        <div className="mnx-accounting-form-actions">
          <AccountingAction type="button" variant="secondary" onClick={() => router.push("/accounting/items")}>Cancel</AccountingAction>
          <AccountingAction type="submit" name="intent" value="save-and-new" variant="secondary" disabled={saving}>Save and add another</AccountingAction>
          <AccountingAction type="submit" disabled={saving}>{saving ? <Loader2 className="mnx-spin" aria-hidden="true" /> : null} Save item</AccountingAction>
        </div>
      </form>
    </>
  );
}

export function AccountingItemDetail({ itemId }: { itemId: string }) {
  const [item, setItem] = useState<ItemListItem | null | undefined>(undefined);
  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      setItem(getAllItems().find((candidate) => candidate.id === itemId) || null);
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [itemId]);
  if (item === undefined) {
    return <AccountingAlert variant="info">Loading item details…</AccountingAlert>;
  }
  if (!item) notFound();
  return (
    <>
      <AccountingRoutePageHeader
        eyebrow="Accounting catalogue"
        title={item.name}
        description={`Catalogue record ${item.id}`}
        actions={<AccountingActionLink href="/accounting/items">Back to items</AccountingActionLink>}
      />
      <AccountingMetrics>
        <AccountingMetric label="Sales rate" value={`₹${item.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} detail="Default customer rate" />
        <AccountingMetric label="Purchase rate" value={`₹${item.purchaseRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} detail="Default supplier rate" />
        <AccountingMetric label="Type" value={item.type} detail={item.taxPreference} />
        <AccountingMetric label="Status" value={item.status} detail="Catalogue availability" />
      </AccountingMetrics>
      <div className="mnx-accounting-split-grid">
        <AccountingSection eyebrow="Identity" title="Item details" description="Core catalogue and statutory references.">
          <AccountingDetailList>
            <AccountingDetail label="Name" value={item.name} />
            <AccountingDetail label="Type" value={item.type} />
            <AccountingDetail label="SKU" value={item.sku || "—"} />
            <AccountingDetail label="HSN / SAC" value={item.hsnSac || "—"} />
            <AccountingDetail label="Usage unit" value={item.usageUnit || "—"} />
            <AccountingDetail label="Tax preference" value={item.taxPreference} />
          </AccountingDetailList>
        </AccountingSection>
        <AccountingSection eyebrow="Commercial" title="Sales and purchase information" description="Default rates and document descriptions.">
          <AccountingDetailList>
            <AccountingDetail label="Sales rate" value={`₹${item.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} />
            <AccountingDetail label="Sales description" value={item.description || "—"} />
            <AccountingDetail label="Purchase rate" value={`₹${item.purchaseRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} />
            <AccountingDetail label="Purchase description" value={item.purchaseDescription || "—"} />
          </AccountingDetailList>
        </AccountingSection>
      </div>
      {item.priceList?.length ? (
        <AccountingSection eyebrow="Currencies" title="Multi-currency price list">
          <AccountingTable>
            <thead><tr><th>Currency</th><th>Exchange rate</th><th>Selling price</th><th>Pricing mode</th></tr></thead>
            <tbody>{item.priceList.map((price) => (
              <tr key={price.currency}>
                <td>{price.currency}</td>
                <td>{price.exchangeRate.toFixed(4)}</td>
                <td className="mnx-accounting-amount">{price.currency} {(price.customPrice ?? item.rate / price.exchangeRate).toFixed(2)}</td>
                <td>{price.useAutomatic === false ? "Custom" : "Automatic"}</td>
              </tr>
            ))}</tbody>
          </AccountingTable>
        </AccountingSection>
      ) : null}
    </>
  );
}
