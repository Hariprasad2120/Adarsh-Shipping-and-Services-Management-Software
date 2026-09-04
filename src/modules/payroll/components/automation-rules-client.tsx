"use client";

import * as React from "react";
import { toast } from "@/modules/notifications/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { WorkspaceBadge } from "@/components/layout/workspace";
import {
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import {
  createAutomationRuleAction,
  toggleAutomationRuleAction,
  deleteAutomationRuleAction,
} from "@/modules/payroll/automation-actions";

const TRIGGER_LABELS: Record<string, string> = {
  LOAN_FULLY_REPAID: "Loan fully repaid",
  SALARY_REVISION_APPROVED: "Salary revision approved",
};
const ACTION_LABELS: Record<string, string> = {
  NOTIFY_MANAGER: "Notify manager",
  NOTIFY_HR: "Notify HR",
  CREATE_TODO: "Create to-do for HR",
};

export type AutomationRule = {
  id: string;
  trigger: string;
  actionType: string;
  enabled: boolean;
};
export type AutomationLog = {
  id: string;
  triggeredAt: string;
  subjectType: string;
  outcome: string;
  detail: string | null;
};

export function AutomationRulesClient({ rules, logs }: { rules: AutomationRule[]; logs: AutomationLog[] }) {
  const router = useRouter();
  const [trigger, setTrigger] = React.useState("LOAN_FULLY_REPAID");
  const [actionType, setActionType] = React.useState("NOTIFY_MANAGER");
  const [isSaving, setIsSaving] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      const response = await createAutomationRuleAction({ trigger, actionType });
      if (!response.ok) toast.error(response.error);
      else {
        toast.success("Rule created");
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    setBusyId(id);
    try {
      const response = await toggleAutomationRuleAction(id, enabled);
      if (!response.ok) toast.error(response.error);
      else router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      const response = await deleteAutomationRuleAction(id);
      if (!response.ok) toast.error(response.error);
      else {
        toast.success("Rule removed");
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4">
        <p className="mb-3 text-sm font-medium text-[var(--mnx-text)]">Add rule</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--mnx-muted)]">When</span>
            <NativeSelect value={trigger} onChange={(e) => setTrigger(e.target.value)}>
              {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </NativeSelect>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--mnx-muted)]">Then</span>
            <NativeSelect value={actionType} onChange={(e) => setActionType(e.target.value)}>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </NativeSelect>
          </label>
          <Button type="button" onClick={() => void handleCreate()} disabled={isSaving}>
            {isSaving ? "Adding…" : "Add Rule"}
          </Button>
        </div>
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-[var(--mnx-muted)]">No automation rules yet.</p>
      ) : (
        <PeopleTable>
          <PeopleTableHeader>
            <PeopleTableRow>
              <PeopleTableHead>When</PeopleTableHead>
              <PeopleTableHead>Then</PeopleTableHead>
              <PeopleTableHead>Status</PeopleTableHead>
              <PeopleTableHead>Actions</PeopleTableHead>
            </PeopleTableRow>
          </PeopleTableHeader>
          <PeopleTableBody>
            {rules.map((rule) => (
              <PeopleTableRow key={rule.id}>
                <PeopleTableCell>{TRIGGER_LABELS[rule.trigger] ?? rule.trigger}</PeopleTableCell>
                <PeopleTableCell>{ACTION_LABELS[rule.actionType] ?? rule.actionType}</PeopleTableCell>
                <PeopleTableCell>
                  <WorkspaceBadge variant={rule.enabled ? "success" : "neutral"}>{rule.enabled ? "Enabled" : "Disabled"}</WorkspaceBadge>
                </PeopleTableCell>
                <PeopleTableCell>
                  <div className="flex gap-2">
                    <Button type="button" variant="inverse" size="sm" disabled={busyId === rule.id} onClick={() => void handleToggle(rule.id, !rule.enabled)}>
                      {rule.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button type="button" variant="destructive" size="sm" disabled={busyId === rule.id} onClick={() => void handleDelete(rule.id)}>
                      Remove
                    </Button>
                  </div>
                </PeopleTableCell>
              </PeopleTableRow>
            ))}
          </PeopleTableBody>
        </PeopleTable>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-[var(--mnx-text)]">Recent activity</p>
        {logs.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">No automation activity yet.</p>
        ) : (
          <ul className="space-y-1 text-xs text-[var(--mnx-muted)]">
            {logs.map((log) => (
              <li key={log.id}>
                {new Date(log.triggeredAt).toLocaleString("en-IN")} — {log.subjectType} — {log.outcome}
                {log.detail ? ` (${log.detail})` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
