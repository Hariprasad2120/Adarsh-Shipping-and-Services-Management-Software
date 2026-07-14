"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WarningIndicatorPopover } from "@/components/ui/warning-indicator-popover";

type Section49ValidityWarning = {
  severity: "expired" | "expiring";
  daysUntilExpiry: number;
  validityDate: string;
  message: string;
};

type JobSection49ValidityWarningIndicatorProps = {
  jobId: string;
  warning: Section49ValidityWarning;
};

export function JobSection49ValidityWarningIndicator({
  jobId,
  warning,
}: JobSection49ValidityWarningIndicatorProps) {
  const router = useRouter();
  return (
    <WarningIndicatorPopover
      ariaLabel="Section 49 validity warning"
      tone={warning.severity === "expired" ? "destructive" : "warning"}
      eyebrow={warning.severity === "expired" ? "SECTION 49 EXPIRED" : "SECTION 49 EXPIRING"}
      description={warning.message}
    >
      <Button
        type="button"
        size="sm"
        className="w-full justify-start border border-[#fb923c]/25 bg-[#fb923c]/12 text-[#fb923c] hover:bg-[#fb923c]/18 hover:text-[#f97316]"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          router.push(`/cha/jobs/${jobId}?tab=docs`);
        }}
      >
        <ArrowUpRight size={13} />
        Open Documents
      </Button>
    </WarningIndicatorPopover>
  );
}
