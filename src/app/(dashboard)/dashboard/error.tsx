"use client";

import { MonolithPage } from "@/components/ui/foundation";
import { DsButton, ErrorState } from "@/components/ds";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <MonolithPage>
      <ErrorState
        title="We couldn’t load your workspace"
        description="Your data is safe. Retry the dashboard request to continue."
      />
      <div style={{ display: "flex", justifyContent: "center" }}>
        <DsButton variant="outlined" size="sm" onClick={reset}>
          Try again
        </DsButton>
      </div>
    </MonolithPage>
  );
}
