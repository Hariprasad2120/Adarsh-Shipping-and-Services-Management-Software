"use client";

import { notFound, useParams } from "next/navigation";
import { getAllItems } from "@/lib/items/item-store";
import { ItemDetailPage } from "@/modules/items/components/ItemDetailPage";
import React from "react";

export default function CrmItemDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const item = getAllItems().find((entry) => entry.id === id) ?? null;

  if (!item) {
    notFound();
  }

  return <ItemDetailPage item={item} backPath="/crm/items" />;
}
