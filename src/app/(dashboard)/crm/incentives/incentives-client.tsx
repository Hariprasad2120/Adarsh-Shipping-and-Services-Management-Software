"use client";

import { useMemo, useState } from "react";
import { CircleDollarSign, RefreshCcw, Send, TrendingUp } from "lucide-react";
import { toast } from "@/modules/notifications/client";
import { CrmButton, CrmInput, CrmMetric, CrmMetrics, CrmPanel, CrmSection, CrmSelect, CrmStatus, CrmTable, CrmTextarea, WorkspaceAlert } from "@/components/monolith";

type EmployeeOption = {
  id: string;
  name: string;
  email: string;
  employeeNumber: number | null;
  departmentName: string | null;
};

type IncentiveRow = {
  id: string;
  employee: EmployeeOption;
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

const INCENTIVE_TYPES = [
  "Deal Closure",
  "Collection",
  "Target Achievement",
  "Cross Sell",
  "Manual Adjustment",
];

function employeeLabel(employee: EmployeeOption) {
  const badge = employee.employeeNumber ? `EMP-${employee.employeeNumber}` : "Employee";
  return `${employee.name} · ${badge}`;
}

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

export function CrmIncentivesClient({
  employees,
  initialIncentives,
}: {
  employees: EmployeeOption[];
  initialIncentives: IncentiveRow[];
}) {
  const [rows, setRows] = useState(initialIncentives);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    employeeId: employees[0]?.id ?? "",
    incentiveType: INCENTIVE_TYPES[0],
    referenceLabel: "",
    customerName: "",
    amount: "",
    currency: "INR",
    eligibleDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const submittedCount = rows.filter((row) => row.status === "SUBMITTED").length;
  const approvedValue = rows
    .filter((row) => row.status === "APPROVED" || row.status === "PAID")
    .reduce((sum, row) => sum + row.amount, 0);
  const pendingValue = rows
    .filter((row) => ["SUBMITTED", "REVIEWED"].includes(row.status))
    .reduce((sum, row) => sum + row.amount, 0);

  const sortedRows = useMemo(() => {
    return [...rows].sort((left, right) =>
      right.eligibleDate.localeCompare(left.eligibleDate) ||
      right.createdAt.localeCompare(left.createdAt),
    );
  }, [rows]);

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/crm/incentives", { cache: "no-store" });
      const data = await readApiResponse<IncentiveRow[]>(response);
      setRows(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to refresh incentives.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/crm/incentives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          incentiveType: form.incentiveType,
          referenceLabel: form.referenceLabel,
          customerName: form.customerName,
          amount: Number(form.amount),
          currency: form.currency,
          eligibleDate: form.eligibleDate,
          notes: form.notes,
        }),
      });
      const created = await readApiResponse<IncentiveRow>(response);
      setRows((current) => [created, ...current]);
      setForm((current) => ({
        ...current,
        referenceLabel: "",
        customerName: "",
        amount: "",
        notes: "",
      }));
      toast.success("Incentive input sent to HRMS.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to submit incentive.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <CrmMetrics>
        <CrmMetric
          label="Submitted entries"
          value={rows.length}
          detail={`${submittedCount} still waiting for HRMS action`}
          icon={<CircleDollarSign aria-hidden="true" />}
        />
        <CrmMetric
          label="Pending value"
          value={formatMoney(pendingValue, "INR")}
          detail="Still in submitted or reviewed status"
          icon={<TrendingUp aria-hidden="true" />}
        />
        <CrmMetric
          label="Approved value"
          value={formatMoney(approvedValue, "INR")}
          detail="Approved or already paid entries"
          icon={<Send aria-hidden="true" />}
        />
      </CrmMetrics>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <CrmPanel>
          <CrmSection
            title="Add CRM incentive input"
            description="Use CRM as the sales-side input desk. HRMS will take over the review, approval, and payout work from these entries."
          >
            <form className="grid gap-4" onSubmit={submit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="mnx-field">
                  <span>Employee</span>
                  <CrmSelect
                    value={form.employeeId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        employeeId: event.target.value,
                      }))
                    }
                    disabled={submitting || employees.length === 0}
                  >
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employeeLabel(employee)}
                      </option>
                    ))}
                  </CrmSelect>
                </label>

                <label className="mnx-field">
                  <span>Incentive type</span>
                  <CrmSelect
                    value={form.incentiveType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        incentiveType: event.target.value,
                      }))
                    }
                    disabled={submitting}
                  >
                    {INCENTIVE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </CrmSelect>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
                <label className="mnx-field">
                  <span>Reference</span>
                  <CrmInput
                    value={form.referenceLabel}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        referenceLabel: event.target.value,
                      }))
                    }
                    placeholder="Deal name, collection milestone, or sales target reference"
                    disabled={submitting}
                  />
                </label>
                <label className="mnx-field">
                  <span>Customer</span>
                  <CrmInput
                    value={form.customerName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        customerName: event.target.value,
                      }))
                    }
                    placeholder="Optional customer name"
                    disabled={submitting}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="mnx-field">
                  <span>Amount</span>
                  <CrmInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    disabled={submitting}
                  />
                </label>
                <label className="mnx-field">
                  <span>Currency</span>
                  <CrmInput
                    value={form.currency}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        currency: event.target.value.toUpperCase(),
                      }))
                    }
                    disabled={submitting}
                  />
                </label>
                <label className="mnx-field">
                  <span>Eligible date</span>
                  <CrmInput
                    type="date"
                    value={form.eligibleDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        eligibleDate: event.target.value,
                      }))
                    }
                    disabled={submitting}
                  />
                </label>
              </div>

              <label className="mnx-field">
                <span>Sales notes</span>
                <CrmTextarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Mention the logic or supporting context HRMS should review."
                  disabled={submitting}
                />
              </label>

              {employees.length === 0 ? (
                <WorkspaceAlert variant="warning">
                  No active employees are available for incentive tagging yet.
                </WorkspaceAlert>
              ) : null}

              <div className="flex justify-end">
                <CrmButton
                  type="submit"
                  disabled={
                    submitting ||
                    employees.length === 0 ||
                    !form.employeeId ||
                    !form.referenceLabel.trim() ||
                    !form.amount ||
                    Number(form.amount) <= 0
                  }
                >
                  <Send aria-hidden="true" />
                  {submitting ? "Submitting..." : "Send to HRMS"}
                </CrmButton>
              </div>
            </form>
          </CrmSection>
        </CrmPanel>

        <CrmPanel>
          <CrmSection
            title="CRM incentive register"
            description="These entries become the working queue for the HRMS incentive tab."
            actions={
              <CrmButton variant="secondary" onClick={() => void refresh()} disabled={loading}>
                <RefreshCcw aria-hidden="true" />
                Refresh
              </CrmButton>
            }
          >
            <CrmTable>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="mnx-empty-state mnx-table-empty-state">
                        No incentive inputs have been submitted from CRM yet.
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="grid gap-1">
                          <strong>{row.employee.name}</strong>
                          <span className="text-xs text-[var(--mnx-text-muted)]">
                            {row.employee.departmentName || "No department"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="grid gap-1">
                          <strong>{row.referenceLabel}</strong>
                          <span className="text-xs text-[var(--mnx-text-muted)]">
                            {row.customerName || "No customer linked"}
                          </span>
                        </div>
                      </td>
                      <td>{row.incentiveType}</td>
                      <td>{formatMoney(row.amount, row.currency)}</td>
                      <td>
                        <CrmStatus variant={statusVariant(row.status)}>
                          {row.status}
                        </CrmStatus>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </CrmTable>
          </CrmSection>
        </CrmPanel>
      </div>
    </div>
  );
}
