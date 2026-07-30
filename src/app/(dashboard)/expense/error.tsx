"use client";

import { ChaErrorState } from "@/modules/cha/components/workspace/cha-workspace";

export default function ExpenseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ChaErrorState
      description={error.message || "The expense workspace could not be loaded."}
      onRetry={reset}
    />
  );
}
