"use client";

import { CrmButton } from "@/modules/crm/components/workspace/crm-workspace";

import React, { useState, useTransition } from "react";
import { toast } from "@/modules/notifications/client";
import { Loader2 } from "lucide-react";
import { toggleJustdialActiveAction } from "@/modules/crm/actions";

interface JustdialToggleProps {
  initialActive: boolean;
}

export function JustdialToggle({ initialActive }: JustdialToggleProps) {
  const [isActive, setIsActive] = useState(initialActive);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const nextState = !isActive;
    startTransition(async () => {
      try {
        const res = await toggleJustdialActiveAction(nextState);
        if (res.ok) {
          setIsActive(nextState);
          toast.success(
            nextState
              ? "Justdial scheduler enabled successfully!"
              : "Justdial scheduler disabled."
          );
        } else {
          toast.error(res.error || "Failed to update scheduler status.");
        }
      } catch (err: any) {
        toast.error(err.message || "An error occurred.");
      }
    });
  };

  return (
    <div className="flex items-center gap-3 bg-[var(--mnx-surface)]/40 dark:bg-[var(--mnx-surface)]/30 px-3.5 py-2 rounded-xl border border-[var(--mnx-border)]/30 dark:border-[var(--mnx-border)]/40">
      <span className="text-xs font-bold text-[var(--mnx-muted)] dark:text-[var(--mnx-muted)] uppercase tracking-wide select-none">
        Import Scheduler
      </span>

      <CrmButton
        onClick={handleToggle}
        disabled={isPending}
        className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--mnx-accent)]/20 ${
          isActive ? "bg-[var(--mnx-accent)]" : "bg-[var(--mnx-soft)] dark:bg-[var(--mnx-soft)]"
        } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-label="Toggle Justdial Importer Scheduler"
      >
        <span
          className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-[var(--mnx-surface)] shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
            isActive ? "translate-x-4.5" : "translate-x-0"
          }`}
        >
          {isPending && <Loader2 className="size-2.5 animate-spin text-[var(--mnx-accent)]" />}
        </span>
      </CrmButton>
    </div>
  );
}
