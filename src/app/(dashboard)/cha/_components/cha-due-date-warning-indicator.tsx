"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/monolith/button";
import { ChaWarningIndicatorPopover as WarningIndicatorPopover } from "@/components/monolith/cha-workspace";

export type DueDateWarningViewModel = {
  jobId: string;
  jobNumber: string;
  type: "DELIVERY_ORDER" | "SECTION49" | "FILING_ATTACHMENT";
  subjectLabel?: string | null;
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
  const prefix =
    warning.type === "DELIVERY_ORDER"
      ? "DELIVERY ORDER"
      : warning.type === "FILING_ATTACHMENT"
        ? "DOCUMENT VALIDITY"
        : "SECTION 49";
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
      ariaLabel={`${
        warning.type === "DELIVERY_ORDER"
          ? "Delivery Order"
          : warning.type === "FILING_ATTACHMENT"
            ? warning.subjectLabel || "Document"
            : "Section 49"
      } due date warning`}
      tone={warning.severity === "expired" ? "destructive" : "warning"}
      eyebrow={getEyebrow(warning)}
      description={warning.message}
    >
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        className="justify-center gap-1.5 mnx-border mnx-bg-surface px-3 mnx-text-muted mnx-hover-accent mnx-hover-accent"
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
        className="justify-center gap-1.5 border mnx-border-warning mnx-bg-warning px-3 mnx-text-warning mnx-hover-warning mnx-hover-warning"
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
