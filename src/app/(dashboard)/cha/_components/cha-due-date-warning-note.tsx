"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/monolith/button";
import type { DueDateWarningViewModel } from "./cha-due-date-warning-indicator";

type ChaDueDateWarningNoteProps = {
  warning: DueDateWarningViewModel;
  onAcknowledged?: () => void;
};

export function ChaDueDateWarningNote({
  warning,
  onAcknowledged,
}: ChaDueDateWarningNoteProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mnx-bg-surface mnx-border mnx-border-warning rounded-xl border mnx-border-warning mnx-bg-surface">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border mnx-border-warning mnx-bg-warning mnx-text-warning shadow-sm">
            <AlertTriangle size={14} strokeWidth={2.2} />
          </div>
          <div className="space-y-2">
            <p className="mnx-label mnx-text-warning">
              {warning.type === "DELIVERY_ORDER"
                ? "DELIVERY ORDER VALIDITY ALERT"
                : warning.type === "FILING_ATTACHMENT"
                  ? "DOCUMENT VALIDITY ALERT"
                  : "SECTION 49 VALIDITY ALERT"}
            </p>
            <p className="text-sm leading-relaxed mnx-text-primary">{warning.message}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:w-auto sm:min-w-[21rem]">
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
            onClick={() => router.push(warning.link)}
          >
            <ArrowUpRight size={14} />
            {warning.actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
