import { MOCK_ITEMS } from "./mock-data";
import type { ItemListItem } from "./types";

const CUSTOM_KEY = "crm_custom_items";
const DELETED_KEY = "crm_deleted_item_ids";
const OVERRIDES_KEY = "crm_item_overrides";

export function generateItemId(): string {
  return `ITEM-USR-${Date.now()}`;
}

export function getCustomItems(): ItemListItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as ItemListItem[]) : [];
  } catch {
    return [];
  }
}

export function getDeletedItemIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function deleteItems(ids: string[]): void {
  if (typeof window === "undefined") return;
  const deleted = getDeletedItemIds();
  localStorage.setItem(DELETED_KEY, JSON.stringify([...new Set([...deleted, ...ids])]));

  // Also filter out from custom items list
  const custom = getCustomItems();
  const updatedCustom = custom.filter((item) => !ids.includes(item.id));
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(updatedCustom));
}

export function saveCustomItem(item: ItemListItem): void {
  const existing = getCustomItems();
  const idx = existing.findIndex((i) => i.id === item.id);
  if (idx > -1) {
    existing[idx] = item;
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(existing));
  } else {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify([...existing, item]));
  }
}

export function saveItemOverride(id: string, patch: Partial<ItemListItem>): void {
  if (typeof window === "undefined") return;
  let overrides: Record<string, Partial<ItemListItem>> = {};
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (raw) overrides = JSON.parse(raw);
  } catch {}

  overrides[id] = { ...overrides[id], ...patch };
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

export function updateItemsStatus(ids: string[], status: "Active" | "Inactive"): void {
  if (typeof window === "undefined") return;
  
  // Update custom items
  const custom = getCustomItems();
  const updatedCustom = custom.map((item) => {
    if (ids.includes(item.id)) {
      return { ...item, status };
    }
    return item;
  });
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(updatedCustom));

  // Update overrides for mock items
  let overrides: Record<string, Partial<ItemListItem>> = {};
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (raw) overrides = JSON.parse(raw);
  } catch {}

  ids.forEach((id) => {
    if (!id.startsWith("ITEM-USR-")) {
      overrides[id] = { ...overrides[id], status };
    }
  });
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

export function getAllItems(): ItemListItem[] {
  const deletedIds = getDeletedItemIds();
  const custom = getCustomItems();

  let overrides: Record<string, Partial<ItemListItem>> = {};
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(OVERRIDES_KEY);
      if (raw) overrides = JSON.parse(raw);
    } catch {}
  }

  const all = [...MOCK_ITEMS, ...custom]
    .filter((item) => !deletedIds.includes(item.id))
    .map((item) => {
      if (overrides[item.id]) {
        return { ...item, ...overrides[item.id] };
      }
      return item;
    });

  return all;
}

export function searchItems(query: string, limit = 10): ItemListItem[] {
  const q = query.trim().toLowerCase();
  const all = getAllItems().filter((i) => i.status === "Active");
  if (!q) return all.slice(0, limit);
  return all
    .filter((i) => i.name.toLowerCase().includes(q))
    .slice(0, limit);
}
