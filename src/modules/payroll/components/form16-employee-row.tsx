"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { WorkspaceBadge } from "@/components/layout/workspace";
import { PeopleControlInput } from "@/modules/people/components";
import { PeopleTableCell, PeopleTableRow } from "@/modules/people/components";
import { markForm16GeneratedAction, markForm16FiledAction } from "@/modules/payroll/form16-filing-actions";

export function Form16EmployeeRow({
  employeeId,
  employeeName,
  employeeNumber,
  fiscalYear,
  status,
}: {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  fiscalYear: string;
  status: "NOT_FILED" | "GENERATED" | "FILED";
}) {
  const router = useRouter();
  const [ackNumber, setAckNumber] = React.useState("");
  const [showAckInput, setShowAckInput] = React.useState(false);
  const [isBusy, setIsBusy] = React.useState(false);

  const handleDownload = async () => {
    setIsBusy(true);
    try {
      window.open(`/api/payroll/employees/${employeeId}/form16?fy=${fiscalYear}`, "_blank");
      if (status === "NOT_FILED") {
        const response = await markForm16GeneratedAction(employeeId, fiscalYear);
        if (response.ok) router.refresh();
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleMarkFiled = async () => {
    if (!ackNumber.trim()) {
      toast.error("Enter the acknowledgement number from the govt. e-filing portal");
      return;
    }
    setIsBusy(true);
    try {
      const response = await markForm16FiledAction({ employeeId, fiscalYear, acknowledgementNumber: ackNumber });
      if (!response.ok) toast.error(response.error);
      else {
        toast.success("Filing recorded");
        setShowAckInput(false);
        router.refresh();
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <PeopleTableRow>
      <PeopleTableCell>{employeeName} (#{employeeNumber})</PeopleTableCell>
      <PeopleTableCell>
        <WorkspaceBadge variant={status === "FILED" ? "success" : status === "GENERATED" ? "accent" : "neutral"}>
          {status === "FILED" ? "Filed" : status === "GENERATED" ? "Generated" : "Not Filed"}
        </WorkspaceBadge>
      </PeopleTableCell>
      <PeopleTableCell>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={() => void handleDownload()}>
            Download PDF
          </Button>
          {status !== "FILED" ? (
            showAckInput ? (
              <>
                <PeopleControlInput
                  className="w-40"
                  placeholder="Ack. number"
                  value={ackNumber}
                  onChange={(e) => setAckNumber(e.target.value)}
                />
                <Button type="button" size="sm" disabled={isBusy} onClick={() => void handleMarkFiled()}>
                  Save
                </Button>
              </>
            ) : (
              <Button type="button" variant="inverse" size="sm" onClick={() => setShowAckInput(true)}>
                Mark Filed
              </Button>
            )
          ) : null}
        </div>
      </PeopleTableCell>
    </PeopleTableRow>
  );
}
