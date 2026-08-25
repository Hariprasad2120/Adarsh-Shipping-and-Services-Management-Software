"use client";

import { useSearchParams } from "next/navigation";
import { CommunicationMailWorkspace } from "@/modules/communication/components/mail-workspace";

export default function CommunicationMailPage() {
  const searchParams = useSearchParams();
  const initialThreadId = searchParams.get("threadId") ?? undefined;

  return <CommunicationMailWorkspace initialThreadId={initialThreadId} />;
}
