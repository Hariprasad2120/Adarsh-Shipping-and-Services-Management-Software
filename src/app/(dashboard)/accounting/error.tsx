"use client";

import { AccountingErrorState } from "@/components/monolith/accounting-workspace";
import { useEffect, useState } from "react";

function createCorrelationId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `acct-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function AccountingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [correlationId] = useState(createCorrelationId);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/accounting/errors", {
      body: JSON.stringify({
        correlationId,
        digest: error.digest,
        message: error.message,
        name: error.name,
        stack: error.stack,
      }),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: controller.signal,
    }).catch(() => undefined);
    return () => controller.abort();
  }, [correlationId, error]);

  return (
    <AccountingErrorState
      description={
        <>
          A database configuration problem was detected.
          <br />
          Reference: {correlationId}
        </>
      }
      onRetry={reset}
    />
  );
}
