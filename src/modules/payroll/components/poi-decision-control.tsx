"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { reviewDeclarationLineAction } from "@/modules/payroll/investment-declaration-actions";

export function PoiDecisionControl({ lineId, declaredAmount }: { lineId: string; declaredAmount: number }) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);

  const handle = async (decision: "APPROVED" | "REJECTED") => {
    setIsPending(true);
    try {
      const response = await reviewDeclarationLineAction({
        lineId,
        decision,
        approvedAmount: decision === "APPROVED" ? declaredAmount : 0,
      });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success(decision === "APPROVED" ? "Proof approved" : "Proof rejected");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" onClick={() => void handle("APPROVED")} disabled={isPending}>
        Approve
      </Button>
      <Button type="button" size="sm" variant="destructive" onClick={() => void handle("REJECTED")} disabled={isPending}>
        Reject
      </Button>
    </div>
  );
}
