"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WarningIndicatorPopover } from "@/components/ui/warning-indicator-popover";

export type DueDateWarningViewModel = {
  jobId: string;
  jobNumber: string;
  type: "DELIVERY_ORDER" | "SECTION49";
  severity: "expired" | "expiring";
  daysUntilExpiry: number;
  validityDate: string;
  message: string;
  notificationId: string;
  link: string;
  actionLabel: string;
};

type ChaDueDateWarningIndicatorProps = {
  warning: DueDateWarningViewModel;
  onAcknowledged?: () => void;
};

function getEyebrow(warning: DueDateWarningViewModel) {
  const prefix = warning.type === "DELIVERY_ORDER" ? "DELIVERY ORDER" : "SECTION 49";
  return warning.severity === "expired" ? `${prefix} EXPIRED` : `${prefix} EXPIRING`;
}

export function ChaDueDateWarningIndicator({
  warning,
  onAcknowledged,
}: ChaDueDateWarningIndicatorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <WarningIndicatorPopover
      ariaLabel={`${warning.type === "DELIVERY_ORDER" ? "Delivery Order" : "Section 49"} due date warning`}
      tone={warning.severity === "expired" ? "destructive" : "warning"}
      eyebrow={getEyebrow(warning)}
      description={warning.message}
      meta={`Validity date: ${new Date(warning.validityDate).toLocaleDateString("en-IN")}`}
    >
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        className="justify-center gap-1.5 border-outline-variant/50 bg-surface px-3 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
        onClick={() => {
          startTransition(async () => {
            const response = await fetch(`/api/notifications/${warning.notificationId}/ack`, { method: "POST" });
            if (!response.ok) {
              return;
            }
            window.dispatchEvent(
              new CustomEvent("cha-due-date-warning-acknowledged", {
                detail: { notificationId: warning.notificationId },
              }),
            );
            onAcknowledged?.();
            router.refresh();
          });
        }}
      >
        <Check size={14} />
        {isPending ? "Ack..." : "Ack"}
      </Button>
      <Button
        type="button"
        size="sm"
        className="justify-center gap-1.5 border border-[#fb923c]/25 bg-[#fb923c]/12 px-3 text-[#fb923c] hover:bg-[#fb923c]/18 hover:text-[#f97316]"
        onClick={() => {
          router.push(warning.link);
        }}
      >
        <ArrowUpRight size={14} />
        {warning.actionLabel}
      </Button>
    </WarningIndicatorPopover>
  );
}
