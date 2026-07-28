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
    <div className="monolith-card monolith-accent-warning rounded-xl border border-[#D88700]/35 bg-mono-card">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#D88700]/45 bg-[#D88700]/10 text-[#D88700] shadow-sm">
            <AlertTriangle size={14} strokeWidth={2.2} />
          </div>
          <div className="space-y-2">
            <p className="monolith-label !text-[#D88700]">
              {warning.type === "DELIVERY_ORDER"
                ? "DELIVERY ORDER VALIDITY ALERT"
                : warning.type === "FILING_ATTACHMENT"
                  ? "DOCUMENT VALIDITY ALERT"
                  : "SECTION 49 VALIDITY ALERT"}
            </p>
            <p className="text-sm leading-relaxed text-mono-text">{warning.message}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:w-auto sm:min-w-[21rem]">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            className="justify-center gap-1.5 border-mono-border/50 bg-mono-card px-3 text-mono-muted hover:bg-mono-soft hover:text-mono-text"
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
            className="justify-center gap-1.5 border border-[#D88700]/25 bg-[#D88700]/12 px-3 text-[#D88700] hover:bg-[#D88700]/18 hover:text-[#f97316]"
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
