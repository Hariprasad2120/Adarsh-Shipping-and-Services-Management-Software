"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/monolith/button";
import { WarningIndicatorPopover } from "@/components/monolith/warning-indicator-popover";
import type { DueDateWarningViewModel } from "./cha-due-date-warning-indicator";

type ChaDueDateWarningsIndicatorProps = {
  warnings: DueDateWarningViewModel[];
  onAcknowledged?: (notificationId: string) => void;
};

function getAggregateEyebrow(count: number, hasExpired: boolean) {
  const label = count === 1 ? "VALIDITY WARNING" : "VALIDITY WARNINGS";
  return hasExpired ? `${count} ${label} ACTIVE` : `${count} ${label}`;
}

export function ChaDueDateWarningsIndicator({
  warnings,
  onAcknowledged,
}: ChaDueDateWarningsIndicatorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (warnings.length === 0) {
    return null;
  }

  const hasExpired = warnings.some((warning) => warning.severity === "expired");
  const description =
    warnings.length === 1
      ? warnings[0]?.message ?? ""
      : `${warnings.length} due-date warnings need attention. Hover to review each note.`;

  return (
    <WarningIndicatorPopover
      ariaLabel={`${warnings.length} due date warning${warnings.length === 1 ? "" : "s"}`}
      tone={hasExpired ? "destructive" : "warning"}
      eyebrow={getAggregateEyebrow(warnings.length, hasExpired)}
      description={description}
      childrenLayout="stack"
    >
      {warnings.map((warning) => (
        <div
          key={warning.notificationId}
          className="rounded-xl border mnx-border mnx-bg-soft p-3"
        >
          <div className="space-y-1.5">
            <p className="mnx-label mnx-text-muted">
              {warning.type === "DELIVERY_ORDER" ? "DELIVERY ORDER" : "SECTION 49"}
            </p>
            <p className="text-sm leading-relaxed mnx-text-primary">{warning.message}</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
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
                  onAcknowledged?.(warning.notificationId);
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
          </div>
        </div>
      ))}
    </WarningIndicatorPopover>
  );
}
