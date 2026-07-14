"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WarningIndicatorPopover } from "@/components/ui/warning-indicator-popover";
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
          className="rounded-xl border border-outline-variant/30 bg-surface-container-low/35 p-3"
        >
          <div className="space-y-1.5">
            <p className="ds-label text-on-surface-variant">
              {warning.type === "DELIVERY_ORDER" ? "DELIVERY ORDER" : "SECTION 49"}
            </p>
            <p className="text-sm leading-relaxed text-on-surface">{warning.message}</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
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
              className="justify-center gap-1.5 border border-[#fb923c]/25 bg-[#fb923c]/12 px-3 text-[#fb923c] hover:bg-[#fb923c]/18 hover:text-[#f97316]"
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
