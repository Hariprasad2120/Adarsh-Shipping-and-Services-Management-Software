"use client";

import { PerformanceErrorState } from "@/modules/performance/components/performance-workspace";

export default function AmsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PerformanceErrorState
      description={
        error.message || "The appraisal workspace could not be loaded."
      }
      onRetry={reset}
    />
  );
}
