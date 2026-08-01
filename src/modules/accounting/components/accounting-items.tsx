"use client";

import {
  FileImage,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  createAccountingItemRequest,
  deleteAccountingItemsRequest,
  fetchAccountingItem,
  fetchAccountingItems,
  updateAccountingItemsStatusRequest,
} from "@/lib/items/accounting-item-client";
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
  AccountingPanel,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingSelect,
  AccountingStatus,
  AccountingTable,
  AccountingTextarea,
  AccountingToolbar,
} from "@/modules/accounting/components/accounting-workspace";

const PAGE_SIZE = 25;
const SALES_ACCOUNT_OPTIONS = [
  "[ 40000 ] Sales",
  "[ 40100 ] Service Revenue",
  "[ 40200 ] Freight Revenue",
];
const PURCHASE_ACCOUNT_OPTIONS = [
  "Cost of Goods Sold",
  "Purchase Expense",
  "Vendor Services",
];
const UNIT_OPTIONS = [
  "Nos",
  "Kg",
  "Ton",
  "Hour",
  "Job",
  "Shipment",
  "Container",
];
const TAX_RATE_OPTIONS = ["0", "5", "12", "18", "28"];

type VendorOption = {
  id: string;
  name: string;
};

type ItemDraft = {
  name: string;
  salesInformation: boolean;
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
  preferredVendorId: string;
  preferredVendorName: string;
  inventoryTracking: boolean;
  openingStock: number;
  reorderPoint: number;
  chargeCategory: string;
  applicableFor: string;
  defaultContainerType: string;
  imageDataUrl: string;
  priceListAuto: boolean;
  priceList: PriceListItem[];
};

function buildInitialDraft(): ItemDraft {
  return {
    name: "",
    salesInformation: true,
    type: "Service",
    unit: "",
    sku: "",
    hsnSac: "",
    taxPreference: "Taxable",
    taxRate: "18",
    exemptionReason: "",
    sellingPrice: 0,
    salesAccount: SALES_ACCOUNT_OPTIONS[0],
    salesDescription: "",
    purchaseInformation: true,
    costPrice: 0,
    purchaseAccount: PURCHASE_ACCOUNT_OPTIONS[0],
    purchaseDescription: "",
    preferredVendorId: "",
    preferredVendorName: "",
    inventoryTracking: false,
    openingStock: 0,
    reorderPoint: 0,
    chargeCategory: "",
    applicableFor: "",
    defaultContainerType: "",
    imageDataUrl: "",
    priceListAuto: true,
    priceList: [],
  };
}

function matchesFilter(item: ItemListItem, filter: ItemFilter) {
  if (filter === "active") return item.status === "Active";
  if (filter === "inactive") return item.status === "Inactive";
  if (filter === "goods") return item.type === "Goods";
  if (filter === "services") return item.type === "Service";
  if (filter === "sales") return (item.rate ?? 0) > 0;
  if (filter === "purchase") return (item.purchaseRate ?? 0) > 0;
  return true;
}

function formatMoney(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildDefaultTaxLabel(rate: string) {
  const cleanRate = rate.trim() || "0";
  if (cleanRate === "0") {
    return {
      intra: "GST exempt",
      inter: "GST exempt",
    };
  }

  const numericRate = Number(cleanRate);
  const half = Number.isFinite(numericRate) ? numericRate / 2 : 0;

  return {
    intra: `CGST ${half}% + SGST ${half}%`,
    inter: `IGST ${cleanRate}%`,
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read the selected image"));
    reader.readAsDataURL(file);
  });
}

function useItemsCatalogue() {
  const [items, setItems] = useState<ItemListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      setItems(await fetchAccountingItems());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load items",
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return { items, loading, refresh };
}

export function AccountingItemsList() {
  const { items, loading, refresh } = useItemsCatalogue();
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const importRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!matchesFilter(item, filter)) return false;
      if (!query) return true;

      return [
        item.name,
        item.sku,
        item.purchaseDescription,
        item.description,
        item.hsnSac,
        item.usageUnit,
        item.preferredVendorName,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });
  }, [filter, items, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const visibleSelected =
    visible.length > 0 && visible.every((item) => selected.has(item.id));

  function resetView(nextFilter = filter) {
    setFilter(nextFilter);
    setPage(1);
    setSelected(new Set());
  }

  async function setStatus(status: "Active" | "Inactive") {
    const ids = [...selected];
    if (!ids.length) {
      toast.error("Select at least one item");
      return;
    }
    try {
      await updateAccountingItemsStatusRequest(ids, status);
      await refresh();
      setSelected(new Set());
      toast.success(`Selected items marked ${status.toLowerCase()}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update items",
      );
    }
  }

  async function removeSelected() {
    const ids = [...selected];
    if (!ids.length) {
      toast.error("Select at least one item");
      return;
    }
    if (
      !window.confirm(
        `Delete ${ids.length} selected item${ids.length === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }
    try {
      await deleteAccountingItemsRequest(ids);
      await refresh();
      setSelected(new Set());
      toast.success("Selected items deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete items",
      );
    }
  }

  function exportItems() {
    const blob = new Blob([JSON.stringify(items, null, 2)], {
      type: "application/json",
    });
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
    reader.onload = async () => {
      try {
        const records = JSON.parse(String(reader.result));
        if (!Array.isArray(records)) throw new Error("Expected an array");

        for (const record of records as Partial<ItemListItem>[]) {
          if (!record.name) continue;
          await createAccountingItemRequest({
            name: record.name,
            salesInformation: record.salesInformation ?? true,
            type: record.type === "Goods" ? "Goods" : "Service",
            unit: record.usageUnit || "",
            sku: record.sku || "",
            hsnSac: record.hsnSac || "",
            taxPreference:
              record.taxPreference === "Non-Taxable"
                ? "Non-Taxable"
                : "Taxable",
            taxRate: record.taxRate || "",
            exemptionReason: record.exemptionReason || "",
            sellingPrice: Number(record.rate) || 0,
            salesAccount: record.salesAccount || SALES_ACCOUNT_OPTIONS[0],
            salesDescription: record.description || "",
            purchaseInformation: record.purchaseInformation ?? true,
            costPrice: Number(record.purchaseRate) || 0,
            purchaseAccount:
              record.purchaseAccount || PURCHASE_ACCOUNT_OPTIONS[0],
            purchaseDescription: record.purchaseDescription || "",
            preferredVendorId: record.preferredVendorId || "",
            preferredVendorName: record.preferredVendorName || "",
            inventoryTracking: record.inventoryTracking ?? false,
            openingStock: record.openingStock ?? 0,
            reorderPoint: record.reorderPoint ?? 0,
            chargeCategory: record.chargeCategory || "",
            applicableFor: record.applicableFor || "",
            defaultContainerType: record.defaultContainerType || "",
            imageDataUrl: record.imageDataUrl || "",
            priceList: record.priceList,
            priceListAuto: record.priceListAuto ?? true,
          });
        }
        await refresh();
        toast.success("Items imported");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "The selected file is not a valid items export",
        );
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
          <div className="flex flex-wrap gap-2">
            <AccountingAction
              type="button"
              variant="secondary"
              onClick={() => importRef.current?.click()}
            >
              <UploadCloud aria-hidden="true" /> Import
            </AccountingAction>
            <AccountingAction
              type="button"
              variant="secondary"
              onClick={exportItems}
            >
              <MoreHorizontal aria-hidden="true" /> Export
            </AccountingAction>
            <AccountingActionLink href="/accounting/items/new" variant="primary">
              <Plus aria-hidden="true" /> New
            </AccountingActionLink>
          </div>
        }
      />

      <AccountingSection
        eyebrow="Catalogue register"
        title="All items"
        description="Review the item master with purchase, sales, tax, and usage references in one register."
      >
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <AccountingSelect
              aria-label="Filter item register"
              value={filter}
              onChange={(event) => resetView(event.target.value as ItemFilter)}
              className="min-w-[160px]"
            >
              <option value="all">All Items</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="goods">Goods</option>
              <option value="services">Services</option>
              <option value="sales">Sales enabled</option>
              <option value="purchase">Purchase enabled</option>
            </AccountingSelect>
            <span className="text-xs text-[var(--mnx-text-muted)]">
              {filtered.length} item{filtered.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="relative min-w-0 lg:w-[320px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--mnx-text-muted)]" />
            <AccountingInput
              aria-label="Search items"
              placeholder="Search name, SKU, HSN/SAC, description, unit..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
        </div>

        {selected.size ? (
          <AccountingAlert variant="info">
            <span>{selected.size} selected.</span>
            <AccountingAction
              type="button"
              variant="secondary"
              onClick={() => setStatus("Active")}
            >
              Mark active
            </AccountingAction>
            <AccountingAction
              type="button"
              variant="secondary"
              onClick={() => setStatus("Inactive")}
            >
              Mark inactive
            </AccountingAction>
            <AccountingAction
              type="button"
              variant="destructive"
              onClick={removeSelected}
            >
              <Trash2 aria-hidden="true" /> Delete
            </AccountingAction>
          </AccountingAlert>
        ) : null}

        {loading ? (
          <AccountingAlert variant="info">Loading item register…</AccountingAlert>
        ) : null}

        <AccountingTable>
          <thead>
            <tr>
              <th className="w-10">
                <AccountingCheckbox
                  aria-label="Select visible items"
                  checked={visibleSelected}
                  onChange={() => {
                    const next = new Set(selected);
                    visible.forEach((item) =>
                      visibleSelected ? next.delete(item.id) : next.add(item.id),
                    );
                    setSelected(next);
                  }}
                />
              </th>
              <th>Name</th>
              <th>SKU</th>
              <th>Purchase description</th>
              <th>Purchase rate</th>
              <th>Description</th>
              <th>Rate</th>
              <th>HSN/SAC</th>
              <th>Usage unit</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.length ? (
              visible.map((item) => (
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
                    <Link
                      href={`/accounting/items/${item.id}`}
                      className="flex min-w-[260px] items-center gap-3 text-[var(--mnx-text)] no-underline"
                    >
                      {item.imageDataUrl ? (
                        <Image
                          src={item.imageDataUrl}
                          alt=""
                          width={36}
                          height={36}
                          unoptimized
                          className="size-9 rounded-lg border border-[var(--mnx-border)] object-cover"
                        />
                      ) : (
                        <span className="flex size-9 items-center justify-center rounded-lg border border-[var(--mnx-border)] bg-[var(--mnx-surface-muted)] text-[var(--mnx-text-muted)]">
                          <FileImage className="size-4" />
                        </span>
                      )}
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[var(--mnx-text)]">
                          {item.name}
                        </div>
                        <div className="text-xs text-[var(--mnx-text-muted)]">
                          {item.type}
                          {item.preferredVendorName
                            ? ` • ${item.preferredVendorName}`
                            : ""}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td>{item.sku || "—"}</td>
                  <td>{item.purchaseDescription || "—"}</td>
                  <td className="mnx-accounting-amount">
                    {formatMoney(item.purchaseRate || 0)}
                  </td>
                  <td>{item.description || "—"}</td>
                  <td className="mnx-accounting-amount">
                    {formatMoney(item.rate || 0)}
                  </td>
                  <td>{item.hsnSac || "—"}</td>
                  <td>{item.usageUnit || "—"}</td>
                  <td>
                    <AccountingStatus status={item.status} />
                  </td>
                </tr>
              ))
            ) : (
              <AccountingEmptyTableRow colSpan={10}>
                No items match the current catalogue filters.
              </AccountingEmptyTableRow>
            )}
          </tbody>
        </AccountingTable>

        <div className="mt-4 flex flex-col gap-3 border-t border-[var(--mnx-border)] pt-4 text-sm text-[var(--mnx-text-muted)] lg:flex-row lg:items-center lg:justify-between">
          <span>
            Showing {visible.length} of {filtered.length} items
          </span>
          <div className="flex items-center gap-3">
            <AccountingAction
              type="button"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </AccountingAction>
            <span>
              Page {page} of {pageCount}
            </span>
            <AccountingAction
              type="button"
              variant="secondary"
              disabled={page >= pageCount}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </AccountingAction>
          </div>
        </div>

        <input
          ref={importRef}
          hidden
          type="file"
          accept=".json,application/json"
          onChange={importItems}
        />
      </AccountingSection>
    </>
  );
}

export function AccountingNewItemForm({
  vendorOptions = [],
}: {
  vendorOptions?: VendorOption[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ItemDraft>(buildInitialDraft);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function addPrice() {
    update("priceList", [
      ...draft.priceList,
      { currency: "USD", exchangeRate: 83, useAutomatic: true },
    ]);
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      update("imageDataUrl", dataUrl);
      toast.success("Item image loaded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to read item image",
      );
    } finally {
      event.target.value = "";
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const saveAndNew =
      ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)
        ?.value === "save-and-new";
    const parsed = itemFormSchema.safeParse(draft);

    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message || "Please review the item details",
      );
      return;
    }

    setSaving(true);
    try {
      await createAccountingItemRequest(parsed.data);

      toast.success("Item saved");
      if (saveAndNew) {
        setDraft(buildInitialDraft());
      } else {
        router.push("/accounting/items");
      }
    } finally {
      setSaving(false);
    }
  }

  const defaultTaxLabels = buildDefaultTaxLabel(draft.taxRate);

  return (
    <>
      <AccountingRoutePageHeader
        actions={
          <AccountingActionLink href="/accounting/items">
            Back to items
          </AccountingActionLink>
        }
      />

      <form className="space-y-6" onSubmit={save}>
        <AccountingAlert variant="info">
          Do you want to keep track of this item? Enable inventory-related
          fields only when the catalogue item represents a stock-controlled
          good. Service items can stay non-inventory.
        </AccountingAlert>

        <AccountingPanel className="p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <AccountingField label="Name" required>
                  <AccountingInput
                    required
                    value={draft.name}
                    onChange={(event) => update("name", event.target.value)}
                  />
                </AccountingField>

                <AccountingField label="Type" required>
                  <div className="flex h-[44px] items-center gap-5 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-4">
                    <label className="flex items-center gap-2 text-sm text-[var(--mnx-text)]">
                      <input
                        type="radio"
                        checked={draft.type === "Goods"}
                        onChange={() => update("type", "Goods")}
                      />
                      Goods
                    </label>
                    <label className="flex items-center gap-2 text-sm text-[var(--mnx-text)]">
                      <input
                        type="radio"
                        checked={draft.type === "Service"}
                        onChange={() => update("type", "Service")}
                      />
                      Service
                    </label>
                  </div>
                </AccountingField>

                <AccountingField label="Unit">
                  <AccountingSelect
                    value={draft.unit}
                    onChange={(event) => update("unit", event.target.value)}
                  >
                    <option value="">Select unit</option>
                    {UNIT_OPTIONS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </AccountingSelect>
                </AccountingField>

                <AccountingField label="SKU">
                  <AccountingInput
                    value={draft.sku}
                    onChange={(event) => update("sku", event.target.value)}
                  />
                </AccountingField>

                <AccountingField label="HSN / SAC">
                  <AccountingInput
                    value={draft.hsnSac}
                    onChange={(event) => update("hsnSac", event.target.value)}
                  />
                </AccountingField>

                <AccountingField label="Tax preference" required>
                  <AccountingSelect
                    value={draft.taxPreference}
                    onChange={(event) =>
                      update(
                        "taxPreference",
                        event.target.value as TaxPreference,
                      )
                    }
                  >
                    <option value="Taxable">Taxable</option>
                    <option value="Non-Taxable">Non-Taxable</option>
                  </AccountingSelect>
                </AccountingField>

                {draft.taxPreference === "Taxable" ? (
                  <AccountingField label="Default GST rate" required>
                    <AccountingSelect
                      value={draft.taxRate}
                      onChange={(event) => update("taxRate", event.target.value)}
                    >
                      {TAX_RATE_OPTIONS.map((rate) => (
                        <option key={rate} value={rate}>
                          GST {rate}%
                        </option>
                      ))}
                    </AccountingSelect>
                  </AccountingField>
                ) : (
                  <AccountingField label="Exemption reason" required>
                    <AccountingInput
                      required
                      value={draft.exemptionReason}
                      onChange={(event) =>
                        update("exemptionReason", event.target.value)
                      }
                    />
                  </AccountingField>
                )}
              </div>
            </div>

            <div>
              <input
                ref={fileInputRef}
                hidden
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--mnx-border)] bg-[var(--mnx-surface-muted)] px-4 py-6 text-center transition hover:border-[var(--mnx-accent)]"
              >
                {draft.imageDataUrl ? (
                  <Image
                    src={draft.imageDataUrl}
                    alt="Item preview"
                    width={220}
                    height={180}
                    unoptimized
                    className="max-h-[180px] rounded-xl object-contain"
                  />
                ) : (
                  <>
                    <span className="flex size-14 items-center justify-center rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)]">
                      <UploadCloud className="size-6" />
                    </span>
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-[var(--mnx-text)]">
                        Drag image here or browse
                      </div>
                      <div className="text-xs text-[var(--mnx-text-muted)]">
                        Optional catalogue thumbnail
                      </div>
                    </div>
                  </>
                )}
              </button>
            </div>
          </div>
        </AccountingPanel>

        <AccountingPanel className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <AccountingCheckbox
              checked={draft.salesInformation}
              onChange={(event) =>
                update("salesInformation", event.target.checked)
              }
              label="Sales Information"
            />
          </div>

          {draft.salesInformation ? (
            <div className="grid gap-4 md:grid-cols-2">
              <AccountingField label="Selling price" required>
                <AccountingInput
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.sellingPrice}
                  onChange={(event) =>
                    update("sellingPrice", Number(event.target.value))
                  }
                />
              </AccountingField>

              <AccountingField label="Account" required>
                <AccountingSelect
                  value={draft.salesAccount}
                  onChange={(event) =>
                    update("salesAccount", event.target.value)
                  }
                >
                  {SALES_ACCOUNT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </AccountingSelect>
              </AccountingField>

              <AccountingField label="Description" className="md:col-span-2">
                <AccountingTextarea
                  value={draft.salesDescription}
                  onChange={(event) =>
                    update("salesDescription", event.target.value)
                  }
                />
              </AccountingField>
            </div>
          ) : (
            <p className="text-sm text-[var(--mnx-text-muted)]">
              Sales defaults are disabled for this catalogue item.
            </p>
          )}
        </AccountingPanel>

        <AccountingPanel className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <AccountingCheckbox
              checked={draft.purchaseInformation}
              onChange={(event) =>
                update("purchaseInformation", event.target.checked)
              }
              label="Purchase Information"
            />
          </div>

          {draft.purchaseInformation ? (
            <div className="grid gap-4 md:grid-cols-2">
              <AccountingField label="Cost price" required>
                <AccountingInput
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.costPrice}
                  onChange={(event) =>
                    update("costPrice", Number(event.target.value))
                  }
                />
              </AccountingField>

              <AccountingField label="Account" required>
                <AccountingSelect
                  value={draft.purchaseAccount}
                  onChange={(event) =>
                    update("purchaseAccount", event.target.value)
                  }
                >
                  {PURCHASE_ACCOUNT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </AccountingSelect>
              </AccountingField>

              <AccountingField label="Description">
                <AccountingTextarea
                  value={draft.purchaseDescription}
                  onChange={(event) =>
                    update("purchaseDescription", event.target.value)
                  }
                />
              </AccountingField>

              <AccountingField label="Preferred vendor">
                <AccountingSelect
                  value={draft.preferredVendorId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    const vendor = vendorOptions.find(
                      (option) => option.id === nextId,
                    );
                    update("preferredVendorId", nextId);
                    update("preferredVendorName", vendor?.name ?? "");
                  }}
                >
                  <option value="">Select preferred vendor</option>
                  {vendorOptions.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </AccountingSelect>
              </AccountingField>
            </div>
          ) : (
            <p className="text-sm text-[var(--mnx-text-muted)]">
              Purchase defaults are disabled for this catalogue item.
            </p>
          )}
        </AccountingPanel>

        <AccountingPanel className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--mnx-text)]">
                Default tax rates
              </h3>
              <p className="mt-1 text-sm text-[var(--mnx-text-muted)]">
                These are the default tax labels derived from the selected GST
                treatment for this item.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface-muted)] px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--mnx-text-muted)]">
                  Intra State Tax Rate
                </div>
                <div className="mt-1 text-sm text-[var(--mnx-text)]">
                  {defaultTaxLabels.intra}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface-muted)] px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--mnx-text-muted)]">
                  Inter State Tax Rate
                </div>
                <div className="mt-1 text-sm text-[var(--mnx-text)]">
                  {defaultTaxLabels.inter}
                </div>
              </div>
            </div>
          </div>
        </AccountingPanel>

        <AccountingPanel className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--mnx-text)]">
                Additional information
              </h3>
              <p className="mt-1 text-sm text-[var(--mnx-text-muted)]">
                Track optional inventory, operational, and logistics defaults
                used across Accounting and commercial documents.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AccountingField label="Usage unit">
                <AccountingSelect
                  value={draft.unit}
                  onChange={(event) => update("unit", event.target.value)}
                >
                  <option value="">Select unit</option>
                  {UNIT_OPTIONS.map((unit) => (
                    <option key={`additional-${unit}`} value={unit}>
                      {unit}
                    </option>
                  ))}
                </AccountingSelect>
              </AccountingField>

              <AccountingField label="Charge category">
                <AccountingInput
                  value={draft.chargeCategory}
                  onChange={(event) =>
                    update("chargeCategory", event.target.value)
                  }
                  placeholder="Freight, customs, handling..."
                />
              </AccountingField>

              <AccountingField label="Applicable for">
                <AccountingInput
                  value={draft.applicableFor}
                  onChange={(event) =>
                    update("applicableFor", event.target.value)
                  }
                  placeholder="Import, export, both..."
                />
              </AccountingField>

              <AccountingField label="Default container type">
                <AccountingInput
                  value={draft.defaultContainerType}
                  onChange={(event) =>
                    update("defaultContainerType", event.target.value)
                  }
                  placeholder="20FT, 40HC, LCL..."
                />
              </AccountingField>
            </div>

            <div className="rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface-muted)] p-4">
              <AccountingCheckbox
                checked={draft.inventoryTracking}
                onChange={(event) =>
                  update("inventoryTracking", event.target.checked)
                }
                label="Track inventory for this item"
              />

              {draft.inventoryTracking ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <AccountingField label="Opening stock">
                    <AccountingInput
                      type="number"
                      min="0"
                      value={draft.openingStock}
                      onChange={(event) =>
                        update("openingStock", Number(event.target.value))
                      }
                    />
                  </AccountingField>
                  <AccountingField label="Reorder point">
                    <AccountingInput
                      type="number"
                      min="0"
                      value={draft.reorderPoint}
                      onChange={(event) =>
                        update("reorderPoint", Number(event.target.value))
                      }
                    />
                  </AccountingField>
                </div>
              ) : null}
            </div>
          </div>
        </AccountingPanel>

        <AccountingSection
          eyebrow="Pricing controls"
          title="Multi-currency price list"
          description="Optional currency-specific selling prices and exchange rates."
          actions={
            <AccountingAction type="button" variant="secondary" onClick={addPrice}>
              <Plus aria-hidden="true" /> Add currency
            </AccountingAction>
          }
        >
          {draft.priceList.length ? (
            <AccountingTable>
              <thead>
                <tr>
                  <th>Currency</th>
                  <th>Exchange rate</th>
                  <th>Custom price</th>
                  <th>Automatic</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {draft.priceList.map((price, index) => (
                  <tr key={`${price.currency}-${index}`}>
                    <td>
                      <AccountingInput
                        aria-label={`Currency ${index + 1}`}
                        value={price.currency}
                        onChange={(event) =>
                          update(
                            "priceList",
                            draft.priceList.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    currency: event.target.value.toUpperCase(),
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <AccountingInput
                        aria-label={`Exchange rate ${index + 1}`}
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={price.exchangeRate}
                        onChange={(event) =>
                          update(
                            "priceList",
                            draft.priceList.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    exchangeRate: Number(event.target.value),
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <AccountingInput
                        aria-label={`Custom price ${index + 1}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={price.customPrice ?? ""}
                        onChange={(event) =>
                          update(
                            "priceList",
                            draft.priceList.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    customPrice: event.target.value
                                      ? Number(event.target.value)
                                      : undefined,
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <AccountingCheckbox
                        checked={price.useAutomatic ?? true}
                        onChange={(event) =>
                          update(
                            "priceList",
                            draft.priceList.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    useAutomatic: event.target.checked,
                                  }
                                : item,
                            ),
                          )
                        }
                        label="Automatic"
                      />
                    </td>
                    <td>
                      <AccountingAction
                        type="button"
                        variant="destructive"
                        aria-label={`Remove currency ${index + 1}`}
                        onClick={() =>
                          update(
                            "priceList",
                            draft.priceList.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                      >
                        <Trash2 aria-hidden="true" />
                      </AccountingAction>
                    </td>
                  </tr>
                ))}
              </tbody>
            </AccountingTable>
          ) : (
            <AccountingAlert variant="info">
              No foreign-currency prices have been configured.
            </AccountingAlert>
          )}
        </AccountingSection>

        <div className="flex flex-wrap justify-end gap-3">
          <AccountingAction
            type="button"
            variant="secondary"
            onClick={() => router.push("/accounting/items")}
          >
            Cancel
          </AccountingAction>
          <AccountingAction
            type="submit"
            name="intent"
            value="save-and-new"
            variant="secondary"
            disabled={saving}
          >
            Save and add another
          </AccountingAction>
          <AccountingAction type="submit" disabled={saving}>
            {saving ? <Loader2 className="mnx-spin" aria-hidden="true" /> : null}
            Save
          </AccountingAction>
        </div>
      </form>
    </>
  );
}

export function AccountingItemDetail({ itemId }: { itemId: string }) {
  const [item, setItem] = useState<ItemListItem | null | undefined>(undefined);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void fetchAccountingItem(itemId)
        .then((result) => setItem(result))
        .catch(() => setItem(null));
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
        actions={
          <AccountingActionLink href="/accounting/items">
            Back to items
          </AccountingActionLink>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <AccountingSection
          eyebrow="Identity"
          title="Item details"
          description="Core catalogue, tax, vendor, and unit references."
        >
          <AccountingDetailList>
            <AccountingDetail label="Name" value={item.name} />
            <AccountingDetail label="Type" value={item.type} />
            <AccountingDetail label="SKU" value={item.sku || "—"} />
            <AccountingDetail label="HSN / SAC" value={item.hsnSac || "—"} />
            <AccountingDetail label="Usage unit" value={item.usageUnit || "—"} />
            <AccountingDetail
              label="Tax preference"
              value={item.taxPreference}
            />
            <AccountingDetail
              label="Default GST rate"
              value={item.taxRate ? `${item.taxRate}%` : "—"}
            />
            <AccountingDetail
              label="Preferred vendor"
              value={item.preferredVendorName || "—"}
            />
            <AccountingDetail label="Status" value={item.status} />
          </AccountingDetailList>
        </AccountingSection>

        <AccountingPanel className="p-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--mnx-text)]">
              Item thumbnail
            </h3>
            {item.imageDataUrl ? (
              <Image
                src={item.imageDataUrl}
                alt={item.name}
                width={256}
                height={256}
                unoptimized
                className="w-full rounded-2xl border border-[var(--mnx-border)] object-cover"
              />
            ) : (
              <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-[var(--mnx-border)] bg-[var(--mnx-surface-muted)] text-[var(--mnx-text-muted)]">
                <div className="flex flex-col items-center gap-2 text-center">
                  <FileImage className="size-8" />
                  <span className="text-sm">No image uploaded</span>
                </div>
              </div>
            )}
          </div>
        </AccountingPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AccountingSection
          eyebrow="Sales"
          title="Sales information"
          description="Default selling value and customer-facing description."
        >
          <AccountingDetailList>
            <AccountingDetail
              label="Selling price"
              value={formatMoney(item.rate || 0)}
            />
            <AccountingDetail
              label="Sales account"
              value={item.salesAccount || "—"}
            />
            <AccountingDetail
              label="Description"
              value={item.description || "—"}
            />
          </AccountingDetailList>
        </AccountingSection>

        <AccountingSection
          eyebrow="Purchases"
          title="Purchase information"
          description="Default supplier-side valuation and purchasing notes."
        >
          <AccountingDetailList>
            <AccountingDetail
              label="Cost price"
              value={formatMoney(item.purchaseRate || 0)}
            />
            <AccountingDetail
              label="Purchase account"
              value={item.purchaseAccount || "—"}
            />
            <AccountingDetail
              label="Description"
              value={item.purchaseDescription || "—"}
            />
          </AccountingDetailList>
        </AccountingSection>
      </div>

      {item.priceList?.length ? (
        <AccountingSection
          eyebrow="Currencies"
          title="Multi-currency price list"
          description="Stored exchange-rate-specific pricing overrides."
        >
          <AccountingTable>
            <thead>
              <tr>
                <th>Currency</th>
                <th>Exchange rate</th>
                <th>Selling price</th>
                <th>Pricing mode</th>
              </tr>
            </thead>
            <tbody>
              {item.priceList.map((price) => (
                <tr key={price.currency}>
                  <td>{price.currency}</td>
                  <td>{price.exchangeRate.toFixed(4)}</td>
                  <td className="mnx-accounting-amount">
                    {price.currency}{" "}
                    {(price.customPrice ?? item.rate / price.exchangeRate).toFixed(
                      2,
                    )}
                  </td>
                  <td>{price.useAutomatic === false ? "Custom" : "Automatic"}</td>
                </tr>
              ))}
            </tbody>
          </AccountingTable>
        </AccountingSection>
      ) : null}
    </>
  );
}
