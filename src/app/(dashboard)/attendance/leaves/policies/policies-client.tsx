"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  OperationalDataTable,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalStatus,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
import { PeopleControlButton as MnxAction } from "@/modules/people/components/people-controls";
import { PolicyWizard } from "./policy-wizard";

type PolicyVersionRow = {
  id: string;
  version: number;
  status: string;
  classification: string;
  entitlementModel: string;
  effectiveFrom: string;
};

type LeaveTypeRow = {
  id: string;
  name: string;
  code: string | null;
  isCompOffType: boolean;
  activeVersionId: string | null;
  versions: PolicyVersionRow[];
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  PUBLISHED: "success",
  DRAFT: "warning",
  ARCHIVED: "neutral",
};

type Option = { id: string; name: string };

export function PoliciesClient({
  leaveTypes,
  departments,
  branches,
  divisions,
  designations,
  employmentTypes,
  employees,
  roles,
}: {
  leaveTypes: LeaveTypeRow[];
  departments: Option[];
  branches: Option[];
  divisions: Option[];
  designations: string[];
  employmentTypes: string[];
  employees: Option[];
  roles: Option[];
}) {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);

  async function publish(versionId: string) {
    try {
      const res = await fetch(`/api/leave/policies/${versionId}/publish`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to publish");
      toast.success("Policy version published");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish");
    }
  }

  return (
    <div className="space-y-6">
      <OperationalDataTable>
        <OperationalDataTableHeader
          eyebrow="Settings → Leave Management"
          title="Leave Types & Policies"
          actions={
            <MnxAction
              onClick={() => setShowWizard(!showWizard)}
              className="rounded-lg bg-[var(--mnx-info-bg)] px-3 py-1.5 text-sm text-[var(--mnx-text)]"
            >
              + New Leave Type
            </MnxAction>
          }
        />

        {showWizard && (
          <PolicyWizard
            leaveTypes={leaveTypes.map((lt) => ({ id: lt.id, name: lt.name }))}
            departments={departments}
            branches={branches}
            divisions={divisions}
            designations={designations}
            employmentTypes={employmentTypes}
            employees={employees}
            roles={roles}
            onClose={() => setShowWizard(false)}
          />
        )}

        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                {["Name", "Code", "Active Version", "Status", "Classification", "Model", ""].map((h) => (
                  <OperationalTableHead key={h}>{h}</OperationalTableHead>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaveTypes.length === 0 ? (
                <OperationalTableEmpty colSpan={7}>No leave types configured yet.</OperationalTableEmpty>
              ) : (
                leaveTypes.map((lt) => {
                  const latest = lt.versions[0];
                  return (
                    <tr key={lt.id}>
                      <OperationalTableCell className="font-medium text-[var(--mnx-text)]">
                        {lt.name}
                      </OperationalTableCell>
                      <OperationalTableCell>{lt.code ?? "-"}</OperationalTableCell>
                      <OperationalTableCell>{latest ? `v${latest.version}` : "-"}</OperationalTableCell>
                      <OperationalTableCell>
                        {latest && (
                          <OperationalStatus tone={STATUS_TONE[latest.status] ?? "neutral"}>
                            {latest.status}
                          </OperationalStatus>
                        )}
                      </OperationalTableCell>
                      <OperationalTableCell>{latest?.classification ?? "-"}</OperationalTableCell>
                      <OperationalTableCell>{latest?.entitlementModel ?? "-"}</OperationalTableCell>
                      <OperationalTableCell>
                        {latest && latest.status === "DRAFT" && (
                          <MnxAction
                            onClick={() => publish(latest.id)}
                            className="rounded bg-[var(--mnx-success-bg)] px-2 py-1 text-xs text-[var(--mnx-text)]"
                          >
                            Publish
                          </MnxAction>
                        )}
                      </OperationalTableCell>
                    </tr>
                  );
                })
              )}
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      </OperationalDataTable>
    </div>
  );
}
