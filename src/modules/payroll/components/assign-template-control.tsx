"use client";

import * as React from "react";
import { toast } from "@/modules/notifications/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { assignSalaryTemplateToEmployeeAction } from "@/modules/payroll/salary-template-actions";

export function AssignTemplateControl({
  employeeId,
  templates,
}: {
  employeeId: string;
  templates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = React.useState(templates[0]?.id ?? "");
  const [isAssigning, setIsAssigning] = React.useState(false);

  if (templates.length === 0) return null;

  const handleAssign = async () => {
    if (!templateId) return;
    setIsAssigning(true);
    try {
      const response = await assignSalaryTemplateToEmployeeAction(templateId, employeeId);
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Salary template assigned");
      router.refresh();
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-auto">
        {templates.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </NativeSelect>
      <Button type="button" variant="inverse" onClick={() => void handleAssign()} disabled={isAssigning}>
        {isAssigning ? "Assigning…" : "Assign Template"}
      </Button>
    </div>
  );
}
