"use client";

import { useMemo, useState } from "react";
import {
  BadgeIndianRupee,
  ClipboardCheck,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
} from "@/components/monolith/people-controls";
import {
  PeopleField,
  PeopleSection,
  PeopleSectionHeader,
  PeopleSelect,
  PeopleSummary,
  PeopleSummaryGrid,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
  PeopleTextarea,
} from "@/components/monolith/people-workspace";
import { WorkspaceAlert, WorkspaceBadge } from "@/components/monolith/workspace";

type IncentiveRow = {
  id: string;
  employee: {
    id: string;
    name: string;
    email: string;
    employeeNumber: number | null;
    departmentName: string | null;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  processedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  incentiveType: string;
  referenceLabel: string;
  customerName: string | null;
  amount: number;
  currency: string;
  eligibleDate: string;
  status: string;
  notes: string | null;
  hrNotes: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: {
    message?: string;
  };
};

const STATUS_OPTIONS = ["REVIEWED", "APPROVED", "REJECTED", "PAID"] as const;

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function statusVariant(status: string): "accent" | "neutral" | "success" | "warning" | "danger" {
  switch (status) {
    case "PAID":
      return "success";
    case "APPROVED":
      return "accent";
    case "REVIEWED":
      return "warning";
    case "REJECTED":
      return "danger";
    default:
      return "neutral";
  }
}

async function readApiResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !payload?.ok || !payload.data) {
    throw new Error(payload?.error?.message || "The incentive request failed.");
  }
  return payload.data;
}

export function HrmsIncentivesClient({
  initialIncentives,
}: {
  initialIncentives: IncentiveRow[];
}) {
  const [rows, setRows] = useState(initialIncentives);
  const [selectedId, setSelectedId] = useState(initialIncentives[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [hrNotes, setHrNotes] = useState(initialIncentives[0]?.hrNotes ?? "");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("REVIEWED");

  const filteredRows = useMemo(() => {
    if (filter === "ALL") return rows;
    return rows.filter((row) => row.status === filter);
  }, [filter, rows]);

  const selected =
    rows.find((row) => row.id === selectedId) ??
    filteredRows[0] ??
    rows[0] ??
    null;

  const submittedCount = rows.filter((row) => row.status === "SUBMITTED").length;
  const approvedCount = rows.filter((row) => row.status === "APPROVED").length;
  const paidValue = rows
    .filter((row) => row.status === "PAID")
    .reduce((sum, row) => sum + row.amount, 0);

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/hrms/incentives", { cache: "no-store" });
      const data = await readApiResponse<IncentiveRow[]>(response);
      setRows(data);
      const nextSelected = data.find((row) => row.id === selectedId) ?? data[0] ?? null;
      setSelectedId(nextSelected?.id ?? null);
      setStatus(
        nextSelected && STATUS_OPTIONS.includes(nextSelected.status as (typeof STATUS_OPTIONS)[number])
          ? (nextSelected.status as (typeof STATUS_OPTIONS)[number])
          : "REVIEWED",
      );
      setHrNotes(nextSelected?.hrNotes ?? "");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to refresh incentives.",
      );
    } finally {
      setLoading(false);
    }
  }

  function openRow(row: IncentiveRow) {
    setSelectedId(row.id);
    setStatus(
      STATUS_OPTIONS.includes(row.status as (typeof STATUS_OPTIONS)[number])
        ? (row.status as (typeof STATUS_OPTIONS)[number])
        : "REVIEWED",
    );
    setHrNotes(row.hrNotes ?? "");
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/hrms/incentives?id=${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          hrNotes,
        }),
      });
      const updated = await readApiResponse<IncentiveRow>(response);
      setRows((current) =>
        current.map((row) => (row.id === updated.id ? updated : row)),
      );
      setSelectedId(updated.id);
      toast.success("Incentive status updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update incentive.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PeopleSummaryGrid>
        <PeopleSummary
          icon={<ClipboardCheck aria-hidden="true" />}
          label="Awaiting review"
          value={submittedCount}
        />
        <PeopleSummary
          icon={<ShieldCheck aria-hidden="true" />}
          label="Ready for payroll"
          value={approvedCount}
        />
        <PeopleSummary
          icon={<BadgeIndianRupee aria-hidden="true" />}
          label="Paid this cycle"
          value={formatMoney(paidValue, "INR")}
        />
      </PeopleSummaryGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <PeopleSection>
          <PeopleSectionHeader
            eyebrow="Review queue"
            title="Incentive approvals"
            description="Review CRM-submitted incentive claims, confirm the payout decision, and keep payroll status current."
            actions={
              <MnxAction variant="secondary" onClick={() => void refresh()} disabled={loading}>
                <RefreshCcw aria-hidden="true" />
                Refresh
              </MnxAction>
            }
          />
          <div className="grid gap-4 p-5 sm:p-6">
            <div className="grid gap-4 md:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]">
              <div className="mnx-search-field">
                <MnxInput
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  list="hrms-incentive-statuses"
                  aria-label="Filter incentive status"
                />
                <datalist id="hrms-incentive-statuses">
                  <option value="ALL" />
                  <option value="SUBMITTED" />
                  <option value="REVIEWED" />
                  <option value="APPROVED" />
                  <option value="REJECTED" />
                  <option value="PAID" />
                </datalist>
              </div>
              <WorkspaceAlert variant="info">
                Filter the queue by all entries, new submissions, reviewed items, approved payouts, rejected claims, or paid records.
              </WorkspaceAlert>
            </div>

            <PeopleTable aria-label="HRMS incentives queue">
              <PeopleTableHeader>
                <PeopleTableRow>
                  <PeopleTableHead>Employee</PeopleTableHead>
                  <PeopleTableHead>Reference</PeopleTableHead>
                  <PeopleTableHead>Amount</PeopleTableHead>
                  <PeopleTableHead>Status</PeopleTableHead>
                  <PeopleTableHead className="text-right">Action</PeopleTableHead>
                </PeopleTableRow>
              </PeopleTableHeader>
              <PeopleTableBody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="mnx-empty-state mnx-table-empty-state">
                        No incentive entries match the current filter.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <PeopleTableRow key={row.id}>
                      <PeopleTableCell>
                        <div className="grid gap-1">
                          <strong>{row.employee.name}</strong>
                          <span className="text-xs text-[var(--mnx-text-muted)]">
                            {row.employee.departmentName || "No department"}
                          </span>
                        </div>
                      </PeopleTableCell>
                      <PeopleTableCell>
                        <div className="grid gap-1">
                          <strong>{row.referenceLabel}</strong>
                          <span className="text-xs text-[var(--mnx-text-muted)]">
                            {row.customerName || "No customer linked"}
                          </span>
                        </div>
                      </PeopleTableCell>
                      <PeopleTableCell>
                        {formatMoney(row.amount, row.currency)}
                      </PeopleTableCell>
                      <PeopleTableCell>
                        <WorkspaceBadge variant={statusVariant(row.status)}>
                          {row.status}
                        </WorkspaceBadge>
                      </PeopleTableCell>
                      <PeopleTableCell>
                        <span className="mnx-table-cell-actions">
                          <MnxAction
                            size="compact"
                            variant={selected?.id === row.id ? "primary" : "secondary"}
                            onClick={() => openRow(row)}
                          >
                            Open
                          </MnxAction>
                        </span>
                      </PeopleTableCell>
                    </PeopleTableRow>
                  ))
                )}
              </PeopleTableBody>
            </PeopleTable>
          </div>
        </PeopleSection>

        <PeopleSection>
          <PeopleSectionHeader
            eyebrow="Review details"
            title={selected ? selected.employee.name : "Select a claim"}
            description={
              selected
                ? `${selected.referenceLabel} · submitted by ${selected.createdBy.name}`
                : "Choose a claim from the queue to review the context, record notes, and update the status."
            }
          />
          <div className="grid gap-4 p-5 sm:p-6">
            {selected ? (
              <>
                <WorkspaceAlert variant="info">
                  <span>
                    <strong>{selected.incentiveType}</strong> for{" "}
                    {selected.customerName || "the referenced sales outcome"} on{" "}
                    {new Date(selected.eligibleDate).toLocaleDateString("en-IN")}.
                  </span>
                </WorkspaceAlert>

                <div className="grid gap-3 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-soft)] p-4">
                  <p className="text-sm text-[var(--mnx-text-muted)]">
                    <strong className="text-[var(--mnx-text-strong)]">Sales notes:</strong>{" "}
                    {selected.notes || "No sales-side note provided."}
                  </p>
                  <p className="text-sm text-[var(--mnx-text-muted)]">
                    <strong className="text-[var(--mnx-text-strong)]">Amount:</strong>{" "}
                    {formatMoney(selected.amount, selected.currency)}
                  </p>
                  <p className="text-sm text-[var(--mnx-text-muted)]">
                    <strong className="text-[var(--mnx-text-strong)]">Current status:</strong>{" "}
                    {selected.status}
                  </p>
                </div>

                <div className="grid gap-4">
                  <PeopleField label="Next status" htmlFor="hrms-incentive-status">
                    <PeopleSelect
                      id="hrms-incentive-status"
                      value={status}
                      onChange={(event) =>
                        setStatus(event.target.value as (typeof STATUS_OPTIONS)[number])
                      }
                      disabled={saving}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </PeopleSelect>
                  </PeopleField>

                  <PeopleField label="Review notes" htmlFor="hrms-incentive-notes">
                    <PeopleTextarea
                      id="hrms-incentive-notes"
                      rows={6}
                      value={hrNotes}
                      onChange={(event) => setHrNotes(event.target.value)}
                      placeholder="Add approval context, payroll remarks, or rejection reasons."
                      disabled={saving}
                    />
                  </PeopleField>

                  <div className="flex justify-end">
                    <MnxAction onClick={() => void save()} disabled={saving}>
                      <ShieldCheck aria-hidden="true" />
                      {saving ? "Saving..." : "Save decision"}
                    </MnxAction>
                  </div>
                </div>
              </>
            ) : (
              <WorkspaceAlert variant="info">
                Select a claim from the queue to begin review.
              </WorkspaceAlert>
            )}
          </div>
        </PeopleSection>
      </div>
    </div>
  );
}
