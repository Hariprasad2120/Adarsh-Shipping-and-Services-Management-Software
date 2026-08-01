"use client";

import { CommunicationErrorState } from "@/modules/communication/components/workspace/communication-workspace";

export default function CommunicationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <CommunicationErrorState
      description={
        error.message ||
        "The connected communication workspace encountered an unexpected error."
      }
      onRetry={reset}
    />
  );
}
