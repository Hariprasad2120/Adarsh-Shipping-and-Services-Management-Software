"use client";

import React, { useState, useMemo, useEffect } from "react";
import { getAllItems, deleteItems, updateItemsStatus, saveCustomItem, generateItemId } from "@/lib/items/item-store";
import type { ItemFilter, ItemListItem } from "@/lib/items/types";
import { ItemsToolbar } from "./ItemsToolbar";
import { ItemsTable } from "./ItemsTable";
import { ItemsPagination } from "./ItemsPagination";
import { NewItemDialog } from "./NewItemDialog";
import { toast } from "sonner";

function applyFilter(items: ItemListItem[], filter: ItemFilter, search: string): ItemListItem[] {
  let result = items;

  if (filter === "active") result = result.filter((i) => i.status === "Active");
  else if (filter === "inactive") result = result.filter((i) => i.status === "Inactive");
  else if (filter === "goods") result = result.filter((i) => i.type === "Goods");
  else if (filter === "services") result = result.filter((i) => i.type === "Service");

  if (search.trim()) {
    const q = search.toLowerCase();
    result = result.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.sku ?? "").toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q) ||
        (i.hsnSac ?? "").toLowerCase().includes(q) ||
        (i.usageUnit ?? "").toLowerCase().includes(q)
    );
  }

  return result;
}

interface ItemsListPageProps {
  basePath?: string;
}

export function ItemsListPage({ basePath = "/crm/items" }: ItemsListPageProps) {
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [items, setItems] = useState<ItemListItem[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(getAllItems());
  }, []);

  const filtered = useMemo(() => applyFilter(items, filter, search), [items, filter, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    const pageIds = paginated.map((i) => i.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleFilterChange = (f: ItemFilter) => {
    setFilter(f);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleSearchChange = (s: string) => {
    setSearch(s);
    setPage(1);
    setSelectedIds(new Set());
  };

  const [editingItem, setEditingItem] = useState<ItemListItem | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAction = (action: string) => {
    const selectedList = Array.from(selectedIds);
    if (action === "Refresh") {
      setItems(getAllItems());
      toast.success("Items list refreshed");
    } else if (action === "Mark as Active") {
      if (selectedList.length === 0) {
        toast.error("No items selected");
        return;
      }
      updateItemsStatus(selectedList, "Active");
      setItems(getAllItems());
      setSelectedIds(new Set());
      toast.success("Selected items marked as Active");
    } else if (action === "Mark as Inactive") {
      if (selectedList.length === 0) {
        toast.error("No items selected");
        return;
      }
      updateItemsStatus(selectedList, "Inactive");
      setItems(getAllItems());
      setSelectedIds(new Set());
      toast.success("Selected items marked as Inactive");
    } else if (action === "Delete Selected") {
      if (selectedList.length === 0) {
        toast.error("No items selected");
        return;
      }
      deleteItems(selectedList);
      setItems(getAllItems());
      setSelectedIds(new Set());
      toast.success("Selected items deleted");
    } else if (action === "Export Items") {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "items_export.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Items exported successfully");
    } else if (action === "Import Items") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsedItems = JSON.parse(event.target?.result as string);
            if (Array.isArray(parsedItems)) {
              parsedItems.forEach((item: Partial<ItemListItem>) => {
                if (item.name) {
                  const newItem: ItemListItem = {
                    id: item.id || generateItemId(),
                    name: item.name,
                    sku: item.sku || undefined,
                    purchaseDescription: item.purchaseDescription || undefined,
                    purchaseRate: item.purchaseRate || 0,
                    description: item.description || undefined,
                    rate: item.rate || 0,
                    hsnSac: item.hsnSac || undefined,
                    usageUnit: item.usageUnit || undefined,
                    type: item.type || "Service",
                    taxPreference: item.taxPreference || "Taxable",
                    status: item.status || "Active",
                  };
                  saveCustomItem(newItem);
                }
              });
              toast.success("Items imported successfully");
              setItems(getAllItems());
            } else {
              toast.error("Invalid file format. Expected an array of items.");
            }
          } catch {
            toast.error("Failed to parse JSON file.");
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } else if (action === "Preferences") {
      toast.info("Preferences settings are already set to default");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <ItemsToolbar
        filter={filter}
        onFilterChange={handleFilterChange}
        search={search}
        onSearchChange={handleSearchChange}
        selectedCount={selectedIds.size}
        newPath={`${basePath}/new`}
        onAction={handleAction}
      />

      <div className="flex-1 overflow-hidden flex flex-col bg-white mx-0 border-t-0">
        <ItemsTable
          items={paginated}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleAll={handleToggleAll}
          basePath={basePath}
          onEditItem={(item) => {
            setEditingItem(item);
            setDialogOpen(true);
          }}
        />
      </div>

      <ItemsPagination
        total={filtered.length}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={(n) => {
          setPerPage(n);
          setPage(1);
        }}
      />

      <NewItemDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingItem(undefined);
        }}
        itemToEdit={editingItem}
        onSaveSuccess={() => {
          setItems(getAllItems());
        }}
      />
    </div>
  );
}
