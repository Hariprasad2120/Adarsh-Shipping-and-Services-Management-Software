"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="card-left-accent-orange rounded-[24px] border border-[#fb923c]/35 bg-surface">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#fb923c]/35 bg-[#fb923c]/10 text-[#fb923c] shadow-sm">
            <AlertTriangle size={20} strokeWidth={2.2} />
          </div>
          <div className="space-y-2">
            <p className="ds-label !text-[#fb923c]">
              {warning.type === "DELIVERY_ORDER" ? "DELIVERY ORDER VALIDITY ALERT" : "SECTION 49 VALIDITY ALERT"}
            </p>
            <p className="text-sm leading-relaxed text-on-surface">{warning.message}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:w-auto sm:min-w-[21rem]">
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
