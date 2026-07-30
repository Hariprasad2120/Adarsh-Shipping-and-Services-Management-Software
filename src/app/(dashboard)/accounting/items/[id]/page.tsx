"use client";

import { useParams } from "next/navigation";
import { AccountingItemDetail } from "@/modules/accounting/components/accounting-items";

export default function AccountingItemDetailPage() {
  const params = useParams();
  return <AccountingItemDetail itemId={params.id as string} />;
}
