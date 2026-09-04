"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/modules/notifications/client";
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
import { WorkspaceDialog } from "@/components/layout/workspace-dialog";
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
  const [viewing, setViewing] = useState<Record<string, unknown> | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [busyVersionId, setBusyVersionId] = useState<string | null>(null);

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

  async function viewVersion(versionId: string) {
    setViewLoading(true);
    setViewing(null);
    try {
      const res = await fetch(`/api/leave/policies/${versionId}`);
      if (!res.ok) throw new Error("Failed to load policy version");
      const data = await res.json();
      setViewing(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load policy version");
    } finally {
      setViewLoading(false);
    }
  }

  async function archiveVersion(versionId: string) {
    if (!window.confirm("Archive this published policy? It will stop applying to new requests.")) return;
    setBusyVersionId(versionId);
    try {
      const res = await fetch(`/api/leave/policies/${versionId}/archive`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to archive");
      toast.success("Policy version archived");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to archive");
    } finally {
      setBusyVersionId(null);
    }
  }

  async function deleteDraft(versionId: string) {
    if (!window.confirm("Delete this draft policy version? This cannot be undone.")) return;
    setBusyVersionId(versionId);
    try {
      const res = await fetch(`/api/leave/policies/${versionId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message ?? body.error ?? "Failed to delete draft");
      }
      toast.success("Draft deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete draft");
    } finally {
      setBusyVersionId(null);
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
                        <div className="flex flex-wrap gap-2">
                          {latest && (
                            <MnxAction
                              onClick={() => viewVersion(latest.id)}
                              className="rounded border px-2 py-1 text-xs text-[var(--mnx-text)]"
                            >
                              View
                            </MnxAction>
                          )}
                          {latest && latest.status === "DRAFT" && (
                            <>
                              <MnxAction
                                onClick={() => publish(latest.id)}
                                className="rounded bg-[var(--mnx-success-bg)] px-2 py-1 text-xs text-[var(--mnx-text)]"
                              >
                                Publish
                              </MnxAction>
                              <MnxAction
                                onClick={() => deleteDraft(latest.id)}
                                disabled={busyVersionId === latest.id}
                                className="rounded bg-[var(--mnx-danger-bg)] px-2 py-1 text-xs text-[var(--mnx-text)] disabled:opacity-50"
                              >
                                Delete
                              </MnxAction>
                            </>
                          )}
                          {latest && latest.status === "PUBLISHED" && (
                            <MnxAction
                              onClick={() => archiveVersion(latest.id)}
                              disabled={busyVersionId === latest.id}
                              className="rounded border px-2 py-1 text-xs text-[var(--mnx-text)] disabled:opacity-50"
                            >
                              Archive
                            </MnxAction>
                          )}
                        </div>
                      </OperationalTableCell>
                    </tr>
                  );
                })
              )}
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      </OperationalDataTable>

      <WorkspaceDialog
        open={viewLoading || viewing !== null}
        onClose={() => setViewing(null)}
        eyebrow="Leave policy"
        title={viewing ? `${(viewing.leaveType as { name?: string } | undefined)?.name ?? "Policy"} — v${viewing.version}` : "Loading…"}
        description="Read-only view of this policy version's configuration."
      >
        {viewLoading && !viewing ? (
          <p className="text-sm text-[var(--mnx-muted)]">Loading…</p>
        ) : viewing ? (
          <div className="space-y-3 text-sm text-[var(--mnx-text)]">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-xs text-[var(--mnx-muted)]">Status</span><p>{String(viewing.status)}</p></div>
              <div><span className="text-xs text-[var(--mnx-muted)]">Classification</span><p>{String(viewing.classification)}</p></div>
              <div><span className="text-xs text-[var(--mnx-muted)]">Unit</span><p>{String(viewing.unit)}</p></div>
              <div><span className="text-xs text-[var(--mnx-muted)]">Rounding</span><p>{String(viewing.roundingMode)}</p></div>
              <div><span className="text-xs text-[var(--mnx-muted)]">Effective from</span><p>{new Date(viewing.effectiveFrom as string).toLocaleDateString()}</p></div>
              <div><span className="text-xs text-[var(--mnx-muted)]">Effective until</span><p>{viewing.effectiveUntil ? new Date(viewing.effectiveUntil as string).toLocaleDateString() : "—"}</p></div>
            </div>
            <div>
              <span className="text-xs text-[var(--mnx-muted)]">Applicability rules</span>
              {Array.isArray(viewing.applicabilityRules) && viewing.applicabilityRules.length > 0 ? (
                <ul className="mt-1 space-y-1 text-xs">
                  {(viewing.applicabilityRules as { mode: string; dimension: string; value: string }[]).map((r, i) => (
                    <li key={i}>{r.mode} {r.dimension} = {r.value}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[var(--mnx-muted)]">None — applies to everyone</p>
              )}
            </div>
            <div>
              <span className="text-xs text-[var(--mnx-muted)]">Full configuration</span>
              <pre className="mt-1 max-h-80 overflow-auto rounded-lg border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-3 text-xs">
                {JSON.stringify(viewing.configuration, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </WorkspaceDialog>
    </div>
  );
}
