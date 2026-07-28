"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import styles from "./dashboard.module.css";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={`mnx-dashboard-page ${styles.page}`}>
      <section className="mnx-dashboard-error" role="alert">
        <span><AlertTriangle size={24} /></span>
        <p className="mnx-dashboard-spec-label">DASHBOARD UNAVAILABLE</p>
        <h1>We couldn&apos;t load your workspace.</h1>
        <p>Your data is safe. Retry the dashboard request to continue.</p>
        <button type="button" className="mnx-button mnx-button-primary" onClick={reset}>
          Try again <RotateCcw size={16} />
        </button>
      </section>
    </div>
  );
}
