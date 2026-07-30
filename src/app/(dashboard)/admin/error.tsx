"use client";

import { AdminErrorState } from "@/modules/admin/components/admin-workspace";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AdminErrorState
      description={
        error.message || "The administration workspace encountered an error."
      }
      onRetry={reset}
    />
  );
}
