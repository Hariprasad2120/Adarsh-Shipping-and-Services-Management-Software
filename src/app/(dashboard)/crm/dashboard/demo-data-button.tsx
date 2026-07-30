"use client";

import { CrmButton } from "@/modules/crm/components/workspace/crm-workspace";

import React, { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { seedCrmDemoDataAction } from "@/modules/crm/actions";

export function DemoDataButton() {
  const [isPending, setIsPending] = useState(false);

  const handleSeed = async () => {
    setIsPending(true);
    try {
      const res = await seedCrmDemoDataAction();
      if (res.ok) {
        toast.success("CRM demo data generated successfully!");
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to seed demo data");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <CrmButton
      onClick={handleSeed}
      disabled={isPending}
      className="flex items-center gap-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] disabled:opacity-50 text-mono-text px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md shadow-[var(--mnx-accent)]/10 cursor-pointer"
      title="Populate CRM with realistic shipping logistics mock data"
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Sparkles className="size-4 text-[var(--mnx-warning)]" />
      )}
      <span>{isPending ? "Generating..." : "Seed Demo Data"}</span>
    </CrmButton>
  );
}
