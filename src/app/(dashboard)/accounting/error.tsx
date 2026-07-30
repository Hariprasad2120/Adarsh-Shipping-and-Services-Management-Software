"use client";

import { AccountingErrorState } from "@/modules/accounting/components/accounting-workspace";

export default function AccountingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AccountingErrorState
      description={error.message || "The Accounting workspace could not be loaded."}
      onRetry={reset}
    />
  );
}
