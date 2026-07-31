"use client";

import { WorkspaceMetric } from "@/components/monolith";
import { buildChecklistSummary } from "../domain/import-job-summary";
import type { ImportJobDraft } from "../domain/import-job.types";

export function ImportJobSummaryCards({ draft }: { draft: ImportJobDraft }) {
  const summary = buildChecklistSummary(draft);

  return (
    <div className="mnx-workspace-metrics">
      <WorkspaceMetric
        label="Shipment"
        value={summary.card1.beType || "BE pending"}
        detail={`${summary.card1.transportMode || "-"} | ${summary.card1.customsHouse || "-"} | ${summary.card1.igm}`}
      />
      <WorkspaceMetric
        label="Importer"
        value={summary.card2.importerName || "Importer pending"}
        detail={`${summary.card2.iecBranch} | ${summary.card2.tax}`}
      />
      <WorkspaceMetric
        label="Commercials"
        value={`INR ${summary.card3.totalInvoiceInr.toLocaleString("en-IN")}`}
        detail={`Duty INR ${summary.card3.totalDuty.toLocaleString("en-IN")} | Products ${summary.card3.totalProducts}`}
      />
    </div>
  );
}
