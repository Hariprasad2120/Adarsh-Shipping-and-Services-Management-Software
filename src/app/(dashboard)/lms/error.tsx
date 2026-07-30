"use client";

import { PerformanceErrorState } from "@/modules/performance/components/performance-workspace";

export default function LmsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PerformanceErrorState
      description={
        error.message || "The learning workspace could not be loaded."
      }
      onRetry={reset}
    />
  );
}
