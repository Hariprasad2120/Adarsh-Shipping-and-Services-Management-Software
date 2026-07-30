"use client";

import { CrmErrorState } from "@/modules/crm/components/workspace/crm-workspace";

export default function CrmError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <CrmErrorState
      description={
        error.message || "An unexpected error interrupted the CRM workspace."
      }
      onRetry={reset}
    />
  );
}
