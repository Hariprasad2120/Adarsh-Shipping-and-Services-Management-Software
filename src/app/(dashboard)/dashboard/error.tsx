"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import {
  MonolithPage,
  MonolithSpecLabel,
} from "@/components/ui/foundation";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <MonolithPage>
      <section className="mnx-dashboard-error" role="alert">
        <span><AlertTriangle size={24} /></span>
        <MonolithSpecLabel as="p">DASHBOARD UNAVAILABLE</MonolithSpecLabel>
        <h1>We couldn&apos;t load your workspace.</h1>
        <p>Your data is safe. Retry the dashboard request to continue.</p>
        <Button onClick={reset}>
          Try again <RotateCcw size={16} />
        </Button>
      </section>
    </MonolithPage>
  );
}
