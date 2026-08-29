"use client";

import { BookOpenText, Loader2, Lock, RefreshCcw, Settings2 } from "lucide-react";
import { useState } from "react";
import { AccountingAction, AccountingAlert, AccountingDialog, AccountingEmptyTableRow, AccountingField, AccountingInput, AccountingMetric, AccountingMetrics, AccountingSection, AccountingTable, AccountingWorkflowCards, DateInput } from "@/components/monolith";
import { updateTransactionLockAction } from "@/modules/accounting/actions";

type PeriodLock = {
  lockDate: Date;
  lockType: string;
  lockedBy: string;
} | null;

export function TransactionLockingClient({
  canManage,
  initialPeriodLock,
  periods,
}: {
  canManage: boolean;
  initialPeriodLock: PeriodLock;
  periods: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
}) {
  const [periodLock, setPeriodLock] = useState<PeriodLock>(initialPeriodLock);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [lockDate, setLockDate] = useState(
    initialPeriodLock
      ? new Date(initialPeriodLock.lockDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  );
  const [lockPassword, setLockPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workflows = [
    {
      href: "/accounting/configuration",
      title: "Accounting Configuration",
      description: "Review the wider policy and period-control settings.",
      icon: Settings2,
    },
    {
      href: "/accounting/journal-entries",
      title: "Manual Journals",
      description: "Check the journal workspace before locking finalized periods.",
      icon: BookOpenText,
    },
    {
      href: "/accounting/bulk-update",
      title: "Bulk Update",
      description: "Return to the accountant maintenance hub.",
      icon: RefreshCcw,
    },
  ];

  async function updateLock(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await updateTransactionLockAction({
        lockDate,
        password: lockPassword || undefined,
        lockType: "FULL",
        lockedBy: "Administrator",
      });
      if (result.ok) {
        setPeriodLock(result.data as PeriodLock);
        setShowLockDialog(false);
        setLockPassword("");
      } else setError(result.error || "Failed to update period lock.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AccountingMetrics>
        <AccountingMetric
          label="Current lock"
          value={
            periodLock
              ? new Date(periodLock.lockDate).toLocaleDateString("en-IN")
              : "Not locked"
          }
          detail="Transactions on or before this date are protected"
        />
        <AccountingMetric
          label="Financial periods"
          value={periods.length}
          detail="Current period definitions available to Accounting"
        />
      </AccountingMetrics>
      {periodLock ? (
        <AccountingAlert variant="warning">
          Records posted on or before{" "}
          <strong>
            {new Date(periodLock.lockDate).toLocaleDateString("en-IN")}
          </strong>{" "}
          are protected against edit or deletion.
        </AccountingAlert>
      ) : (
        <AccountingAlert>
          No transaction lock is active. Apply a period lock after the financial
          records for that window are finalised.
        </AccountingAlert>
      )}
      <AccountingSection
        eyebrow="Accountant"
        title="Connected transaction-locking workflows"
        description="Keep lock decisions close to the related accountant controls and journal review surfaces."
        actions={
          canManage ? (
            <AccountingAction onClick={() => setShowLockDialog(true)}>
              <Lock aria-hidden="true" size={16} />
              Update transaction lock
            </AccountingAction>
          ) : undefined
        }
      >
        <AccountingWorkflowCards items={workflows} />
      </AccountingSection>
      <AccountingSection
        eyebrow="Periods"
        title="Financial period status"
        description="Review the current Accounting period definitions alongside the active transaction lock."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Period</th>
              <th>Start date</th>
              <th>End date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {periods.length === 0 ? (
              <AccountingEmptyTableRow colSpan={4}>
                No accounting periods are configured yet.
              </AccountingEmptyTableRow>
            ) : (
              periods.map((period) => (
                <tr key={period.id}>
                  <td>{period.name}</td>
                  <td>{new Date(period.startDate).toLocaleDateString("en-IN")}</td>
                  <td>{new Date(period.endDate).toLocaleDateString("en-IN")}</td>
                  <td>{period.status.replaceAll("_", " ")}</td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
      <AccountingDialog
        open={showLockDialog}
        onClose={() => setShowLockDialog(false)}
        title="Update transaction lock"
        description="Protect finalised records on or before the selected date."
        footer={
          <>
            <AccountingAction
              type="button"
              variant="secondary"
              onClick={() => setShowLockDialog(false)}
            >
              Cancel
            </AccountingAction>
            <AccountingAction
              disabled={loading}
              form="accounting-lock-form"
              type="submit"
            >
              {loading ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={16} />
              ) : null}
              Apply lock
            </AccountingAction>
          </>
        }
      >
        <form
          className="mnx-accounting-form"
          id="accounting-lock-form"
          onSubmit={updateLock}
        >
          {error ? <AccountingAlert variant="danger">{error}</AccountingAlert> : null}
          <AccountingField label="Lock through date" required>
            <DateInput
              required
              value={lockDate}
              onChange={(event) => setLockDate(event.target.value)}
            />
          </AccountingField>
          <AccountingField
            label="Confirmation password"
            hint="Required only when policy demands elevated confirmation."
          >
            <AccountingInput
              type="password"
              value={lockPassword}
              onChange={(event) => setLockPassword(event.target.value)}
            />
          </AccountingField>
        </form>
      </AccountingDialog>
    </>
  );
}
