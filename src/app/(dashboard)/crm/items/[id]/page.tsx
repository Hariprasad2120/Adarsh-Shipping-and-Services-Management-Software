"use client";

import { notFound, useParams } from "next/navigation";
import { getAllItems } from "@/lib/items/item-store";
import { ItemDetailPage } from "@/components/items/ItemDetailPage";
import React, { useEffect, useState } from "react";
import type { ItemListItem } from "@/lib/items/types";

export default function CrmItemDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [item, setItem] = useState<ItemListItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const found = getAllItems().find((i) => i.id === id);
    setItem(found || null);
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f7f9fb] p-6 text-sm text-[#6b7280]">
        Loading...
      </div>
    );
  }

  if (!item) {
    notFound();
  }

  return <ItemDetailPage item={item} backPath="/crm/items" />;
}
