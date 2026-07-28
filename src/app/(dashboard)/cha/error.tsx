"use client";

import { ChaErrorState } from "@/components/monolith/cha-workspace";

export default function ChaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ChaErrorState
      description={error.message || "The CHA workspace could not be loaded."}
      onRetry={reset}
    />
  );
}
