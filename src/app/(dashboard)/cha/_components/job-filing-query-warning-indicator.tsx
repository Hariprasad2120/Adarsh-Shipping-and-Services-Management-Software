"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/monolith/button";
import { ChaWarningIndicatorPopover as WarningIndicatorPopover } from "@/components/monolith/cha-workspace";

type FilingQueryWarning = {
  queryTitle: string;
  overdueQueryCount: number;
  reminderTriggeredAt: string;
  warningTriggeredAt: string;
  staleMinutes: number;
};

type JobFilingQueryWarningIndicatorProps = {
  jobId: string;
  warning: FilingQueryWarning;
};

export function JobFilingQueryWarningIndicator({
  jobId,
  warning,
}: JobFilingQueryWarningIndicatorProps) {
  const router = useRouter();
  return (
    <WarningIndicatorPopover
      ariaLabel="Customs query update overdue"
      eyebrow="QUERY UPDATE OVERDUE"
      description={`"${warning.queryTitle}" has not been updated after the reminder sent at ${new Date(warning.reminderTriggeredAt).toLocaleString("en-IN")}.`}
      meta={
        warning.overdueQueryCount > 1
          ? `${warning.overdueQueryCount} overdue query threads need attention.`
          : `Stale for about ${Math.floor(warning.staleMinutes / 60)} hour(s).`
      }
    >
      <Button
        type="button"
        size="sm"
        className="w-full justify-start border mnx-border-warning mnx-bg-warning mnx-text-warning mnx-hover-warning mnx-hover-warning"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          router.push(`/cha/jobs/${jobId}?tab=filing`);
        }}
      >
        <ArrowUpRight size={13} />
        Open Filing
      </Button>
    </WarningIndicatorPopover>
  );
}
