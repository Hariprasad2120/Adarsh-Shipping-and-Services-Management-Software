"use client";

import type { ItemFormSchema } from "@/lib/items/validation";
import type { ItemListItem } from "@/lib/items/types";

type ApiSuccess<T> = {
  ok: true;
  data: T;
};

type ApiFailure = {
  ok: false;
  error?: {
    code?: string;
    message?: string;
  };
};

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function readApiError(response: Response, fallback: string) {
  try {
    const payload = await readJson<ApiFailure>(response);
    return payload.error?.message || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchAccountingItems(input?: {
  activeOnly?: boolean;
  limit?: number;
}): Promise<ItemListItem[]> {
  const params = new URLSearchParams();
  if (input?.activeOnly) params.set("activeOnly", "true");
  if (input?.limit) params.set("limit", String(input.limit));

  const response = await fetch(
    `/api/accounting/items${params.size ? `?${params.toString()}` : ""}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(await readApiError(response, "Failed to load items"));
  }

  const payload = await readJson<ApiSuccess<ItemListItem[]>>(response);
  return payload.data;
}

export async function fetchAccountingItem(id: string): Promise<ItemListItem | null> {
  const response = await fetch(`/api/accounting/items/${id}`, {
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(await readApiError(response, "Failed to load item"));
  }

  const payload = await readJson<ApiSuccess<ItemListItem>>(response);
  return payload.data;
}

export async function createAccountingItemRequest(data: ItemFormSchema) {
  const response = await fetch("/api/accounting/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(await readApiError(response, "Failed to save item"));
  }

  const payload = await readJson<ApiSuccess<ItemListItem>>(response);
  return payload.data;
}

export async function updateAccountingItemsStatusRequest(
  ids: string[],
  status: "Active" | "Inactive",
) {
  const response = await fetch("/api/accounting/items", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, status }),
  });
  if (!response.ok) {
    throw new Error(
      await readApiError(response, "Failed to update item statuses"),
    );
  }
}

export async function deleteAccountingItemsRequest(ids: string[]) {
  const response = await fetch("/api/accounting/items", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) {
    throw new Error(await readApiError(response, "Failed to delete items"));
  }
}
