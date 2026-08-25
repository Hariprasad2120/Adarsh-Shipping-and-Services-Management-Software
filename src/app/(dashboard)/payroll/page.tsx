import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ListChecks,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import {
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspacePanel,
  WorkspaceSectionHeading,
} from "@/components/layout/workspace";
import { getSession } from "@/lib/auth";
import { getPayrollModuleSnapshot, formatPayrollMoney, formatPayrollDate } from "@/modules/payroll/service";
import { listOffCyclePayrollBatches } from "@/modules/hrms/off-cycle-payroll";
import { listTerminationPayrollBatches } from "@/modules/hrms/termination-payroll";

// Phase 3, tightened for visual parity with the captured Zoho Payroll home
// dashboard (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, page 00001):
// Upcoming Payrun + To Do Tasks side by side, then Benefits and Deductions +
// Employee Summary side by side, then Payroll Cost Summary — same section
// order and card shape as the reference, backed by live Monolith data.
export default async function PayrollDashboardPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");
  const orgId = session.user.orgId;

  const [snapshot, offCycleBatches, terminationBatches] = await Promise.all([
    getPayrollModuleSnapshot(orgId, new Date()),
    listOffCyclePayrollBatches(orgId),
    listTerminationPayrollBatches(orgId),
  ]);
  const { workspace, currentMonth } = snapshot;

  const paymentDate = new Date(workspace.period.end);
  const now = new Date();
  const isOverdue = paymentDate < now && !workspace.hasPostedBatch;
  const overdueDays = isOverdue
    ? Math.max(0, Math.floor((now.getTime() - paymentDate.getTime()) / 86_400_000))
    : 0;

  const regularPending = !workspace.hasApprovedBatch && !workspace.hasPostedBatch;
  const otherPendingCount =
    offCycleBatches.filter((b) => b.status !== "PAID").length +
    terminationBatches.filter((b) => b.status !== "PAID").length;
  const totalPending = (regularPending ? 1 : 0) + otherPendingCount;

  const todos = [
    !workspace.settingsConfigured && {
      label: "Configure Accounting defaults (salary expense, payable, bank) before posting payroll.",
      href: "/payroll/settings",
    },
    currentMonth.employeesMissingSalarySetup > 0 && {
      label: `${currentMonth.employeesMissingSalarySetup} employees are missing salary configuration.`,
      href: "/payroll/compensation",
    },
    currentMonth.employeesMissingPaymentSetup > 0 && {
      label: `${currentMonth.employeesMissingPaymentSetup} employees are missing payment setup.`,
      href: "/payroll/employees",
    },
    workspace.summary.reviewEmployees > 0 && {
      label: `${workspace.summary.reviewEmployees} employees have open validation issues for this period.`,
      href: "/payroll/pay-runs",
    },
  ].filter(Boolean) as { label: string; href: string }[];

  const trendMax = Math.max(
    1,
    ...snapshot.costTrend.flatMap((point) => [point.netPay, point.tds, point.benefits, point.deductions]),
  );

  return (
    <div className="space-y-6">
      {!workspace.settingsConfigured ? (
        <WorkspaceAlert variant="warning">
          Accounting defaults are still incomplete. Payroll can review and approve
          data, but posting needs salary expense, salary payable, and bank defaults.
        </WorkspaceAlert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        {/* Upcoming Payrun */}
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading index="" title="Upcoming Payrun" />
          {regularPending ? (
            <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-base font-semibold text-[var(--mnx-text)]">
                  Process Pay Run for <strong>{workspace.period.label}</strong>
                </h3>
                <WorkspaceBadge variant={isOverdue ? "warning" : "neutral"}>
                  {isOverdue ? "PAYMENT DUE" : "DRAFT"}
                </WorkspaceBadge>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-xs text-[var(--mnx-muted)]">Employees&apos; Net Pay</div>
                  <div className="mt-1 text-lg font-semibold text-[var(--mnx-text)]">
                    {formatPayrollMoney(workspace.summary.netPayroll)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--mnx-muted)]">Payment Date</div>
                  <div className="mt-1 text-lg font-semibold text-[var(--mnx-text)]">
                    {formatPayrollDate(workspace.period.end)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--mnx-muted)]">No. of Employees</div>
                  <div className="mt-1 text-lg font-semibold text-[var(--mnx-text)]">
                    {workspace.summary.employeesInPayroll}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-[var(--mnx-muted)]">
                  {isOverdue
                    ? `This payment is overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}.`
                    : `Please approve this payroll on or before ${formatPayrollDate(workspace.period.end)}.`}
                </p>
                <Link className="mnx-button mnx-button-primary" href={`/payroll/pay-runs/regular?period=${workspace.period.key}`}>
                  View Details
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4 text-sm text-[var(--mnx-muted)]">
              <CheckCircle2 className="size-4 text-[var(--mnx-success)]" aria-hidden="true" />
              {workspace.period.label} payroll is already {workspace.hasPostedBatch ? "posted" : "approved"}.
            </div>
          )}
          {totalPending > 1 ? (
            <Link href="/payroll/pay-runs" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--mnx-accent-strong)] hover:underline">
              View {totalPending - 1} More <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : null}
        </WorkspacePanel>

        {/* To Do Tasks */}
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading index="" title="To Do Tasks" />
          {todos.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-[var(--mnx-muted)]">
              <CheckCircle2 className="size-4 text-[var(--mnx-success)]" aria-hidden="true" />
              No open payroll tasks for this period.
            </div>
          ) : (
            <ul className="space-y-3">
              {todos.map((todo) => (
                <li key={todo.label} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)]">
                    <ListChecks className="size-4 text-[var(--mnx-warning)]" aria-hidden="true" />
                  </span>
                  <div className="text-sm">
                    <p className="text-[var(--mnx-text)]">{todo.label}</p>
                    <Link href={todo.href} className="mt-1 inline-block font-medium text-[var(--mnx-accent-strong)] hover:underline">
                      Resolve
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </WorkspacePanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        {/* Benefits and Deductions */}
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading
            index=""
            title="Benefits and Deductions"
            description={workspace.period.label}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "EPF", value: workspace.summary.epfLiability, href: "/payroll/compliance" },
              { label: "ESI", value: workspace.summary.esiLiability, href: "/payroll/compliance" },
              { label: "TDS", value: workspace.summary.tdsLiability, href: "/payroll/taxes-and-forms" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--mnx-text)]">
                  <ShieldCheck className="size-4 text-[var(--mnx-accent)]" aria-hidden="true" />
                  {item.label}
                </div>
                <div className="mt-2 text-lg font-semibold text-[var(--mnx-text)]">
                  {formatPayrollMoney(item.value)}
                </div>
                <Link className="mt-2 inline-block text-xs font-medium text-[var(--mnx-accent-strong)]" href={item.href}>
                  View Details
                </Link>
              </div>
            ))}
          </div>
        </WorkspacePanel>

        {/* Employee Summary */}
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading index="" title="Employee Summary" />
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">
              Active Employees
            </div>
            <div className="mt-1 text-3xl font-semibold text-[var(--mnx-text)]">
              {currentMonth.activeEmployeeCount}
            </div>
          </div>
          <Link className="mnx-button mnx-button-secondary" href="/payroll/employees">
            View Employees
          </Link>
        </WorkspacePanel>
      </div>

      {/* Payroll Cost Summary */}
      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index=""
          title="Payroll Cost Summary"
          description="Net Pay, Taxes, Benefits, and Deductions over the last 6 months"
        />
        <div className="flex items-end gap-4 overflow-x-auto pb-2" role="img" aria-label="Payroll cost trend, last 6 months">
          {snapshot.costTrend.map((point) => (
            <div key={point.monthKey} className="flex min-w-[64px] flex-col items-center gap-1">
              <div className="flex h-32 items-end gap-0.5">
                <div
                  className="w-2.5 rounded-t bg-[var(--mnx-accent)]"
                  style={{ height: `${Math.max(2, (point.netPay / trendMax) * 100)}%` }}
                  title={`Net pay ${formatPayrollMoney(point.netPay)}`}
                />
                <div
                  className="w-2.5 rounded-t bg-[var(--mnx-warning)]"
                  style={{ height: `${Math.max(2, (point.tds / trendMax) * 100)}%` }}
                  title={`Taxes ${formatPayrollMoney(point.tds)}`}
                />
                <div
                  className="w-2.5 rounded-t bg-[var(--mnx-success)]"
                  style={{ height: `${Math.max(2, (point.benefits / trendMax) * 100)}%` }}
                  title={`Benefits ${formatPayrollMoney(point.benefits)}`}
                />
                <div
                  className="w-2.5 rounded-t bg-[var(--mnx-muted)]"
                  style={{ height: `${Math.max(2, (point.deductions / trendMax) * 100)}%` }}
                  title={`Deductions ${formatPayrollMoney(point.deductions)}`}
                />
              </div>
              <span className="text-xs text-[var(--mnx-muted)]">{point.label}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-[var(--mnx-muted)]">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[var(--mnx-accent)]" /> Net Pay</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[var(--mnx-warning)]" /> Taxes</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[var(--mnx-success)]" /> Benefits</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[var(--mnx-muted)]" /> Deductions</span>
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="06"
          title="Payroll command center"
          description="Quick access to the areas that mirror the standalone payroll IA from the reference corpus."
          actions={
            <Link className="mnx-button mnx-button-secondary" href="/payroll/pay-runs">
              Open pay runs
            </Link>
          }
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              href: "/payroll/employees",
              title: "Employees",
              detail: `${snapshot.employees.length} payroll-linked employee profiles`,
              icon: Users,
            },
            {
              href: "/payroll/compensation",
              title: "Compensation",
              detail: `${snapshot.salaryRevisions.length} employees with salary revision history`,
              icon: Wallet,
            },
            {
              href: "/payroll/compliance",
              title: "Compliance",
              detail: `${currentMonth.employeesWithPan} PAN and ${currentMonth.employeesWithUan} UAN-linked employees`,
              icon: ShieldCheck,
            },
            {
              href: "/payroll/reports",
              title: "Reports",
              detail: "Gross-to-net, LOP, OT, and employee payroll register views",
              icon: CalendarCheck2,
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4 transition-colors hover:border-[var(--mnx-accent)]/40 hover:bg-[var(--mnx-surface)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[var(--mnx-text)]">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--mnx-muted)]">{item.detail}</p>
                </div>
                <ArrowRight className="size-4 text-[var(--mnx-accent)]" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </WorkspacePanel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading
            index="07"
            title={`Current period health: ${workspace.period.label}`}
            description="This period rolls up live HRMS and attendance signals instead of maintaining a duplicate payroll employee database."
          />
          <div className="space-y-3">
            <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--mnx-text)]">
                <CheckCircle2 className="size-4 text-[var(--mnx-success)]" aria-hidden="true" />
                Ready employees
              </div>
              <p className="mt-2 text-sm text-[var(--mnx-muted)]">
                {workspace.summary.readyEmployees} employees are clean enough
                for payroll approval in the current period.
              </p>
            </div>
            <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--mnx-text)]">
                <AlertTriangle className="size-4 text-[var(--mnx-warning)]" aria-hidden="true" />
                Review queue
              </div>
              <p className="mt-2 text-sm text-[var(--mnx-muted)]">
                {currentMonth.employeesMissingPaymentSetup} employees are missing
                payment setup and {currentMonth.employeesMissingSalarySetup} are
                missing salary configuration.
              </p>
            </div>
            <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--mnx-text)]">
                <Building2 className="size-4 text-[var(--mnx-accent)]" aria-hidden="true" />
                Cross-module ownership
              </div>
              <p className="mt-2 text-sm text-[var(--mnx-muted)]">
                HRMS owns employees and compensation. Attendance owns punches, leave,
                OT, and LOP contracts. Accounting owns journal posting and banking.
              </p>
            </div>
          </div>
        </WorkspacePanel>

        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading
            index="08"
            title="Reference-guided rollout"
            description="The local scrape corpus was mined to mirror standalone payroll information architecture without copying competitor code or branding."
          />
          <ul className="space-y-3 text-sm text-[var(--mnx-muted)]">
            <li>Pay Runs and off-cycle processing patterns informed the dedicated pay-run route.</li>
            <li>Employee salary details, investments, payslips, and loans informed the standalone employee and payroll domain split.</li>
            <li>Pay schedule, tax/forms, and payroll settings pages informed the settings and compliance areas.</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Link className="mnx-button mnx-button-secondary" href="/payroll/settings">
              Open settings
            </Link>
            <Link className="mnx-button mnx-button-secondary" href="/payroll/compliance">
              Open compliance
            </Link>
            <Link className="mnx-button mnx-button-secondary" href="/my-payroll">
              Access My Portal
            </Link>
          </div>
        </WorkspacePanel>
      </div>
    </div>
  );
}
