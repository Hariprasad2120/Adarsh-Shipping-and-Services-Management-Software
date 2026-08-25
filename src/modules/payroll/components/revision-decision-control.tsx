"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { approveSalaryRevisionAction, rejectSalaryRevisionAction } from "@/modules/hrms/salary-revision-actions";

export function RevisionDecisionControl({ employeeId, revisionId }: { employeeId: string; revisionId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState<"approve" | "reject" | null>(null);

  const handleDecision = async (decision: "approve" | "reject") => {
    setIsPending(decision);
    try {
      const response =
        decision === "approve"
          ? await approveSalaryRevisionAction(employeeId, revisionId)
          : await rejectSalaryRevisionAction(employeeId, revisionId);
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success(decision === "approve" ? "Salary revision approved" : "Salary revision rejected");
      router.refresh();
    } finally {
      setIsPending(null);
    }
  };

  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" onClick={() => void handleDecision("approve")} disabled={isPending !== null}>
        {isPending === "approve" ? "Approving…" : "Approve"}
      </Button>
      <Button type="button" size="sm" variant="destructive" onClick={() => void handleDecision("reject")} disabled={isPending !== null}>
        {isPending === "reject" ? "Rejecting…" : "Reject"}
      </Button>
    </div>
  );
}
