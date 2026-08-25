import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspaceAlert, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { getPayrollSchedule, getUpcomingPayrolls } from "@/modules/payroll/schedule-actions";
import { PayScheduleClient } from "@/modules/payroll/components/pay-schedule-client";
import { formatPayrollDate } from "@/modules/payroll/service";

const DEFAULT_WORKING_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

// Phase 9: reference settings_pay-schedules
// (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, page 00102).
export default async function PayrollPayScheduleSettingsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const { schedule, locked } = await getPayrollSchedule(session.user.orgId);
  const payDayOfMonth = schedule?.payDayOfMonth ?? 1;
  const workingDays = schedule?.workingDays?.length ? schedule.workingDays : DEFAULT_WORKING_DAYS;
  const firstPayPeriod = schedule?.firstPayPeriod?.toISOString() ?? new Date().toISOString();
  const upcoming = await getUpcomingPayrolls(payDayOfMonth);

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/settings"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Settings
      </Link>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Pay Schedule"
          description="This organisation's payroll runs on this schedule."
        />
        {locked ? (
          <WorkspaceAlert variant="info">
            Note: Pay Schedule cannot be edited once you process the first pay run.
          </WorkspaceAlert>
        ) : null}
        <PayScheduleClient
          locked={locked}
          workingDays={workingDays}
          payDayOfMonth={payDayOfMonth}
          firstPayPeriod={firstPayPeriod}
        />
      </WorkspacePanel>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading index="02" title="Upcoming Payrolls" />
        <ul className="space-y-2">
          {upcoming.map((item) => (
            <li
              key={item.periodLabel}
              className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4"
            >
              <div className="font-semibold text-[var(--mnx-text)]">{item.periodLabel}</div>
              <div className="text-sm text-[var(--mnx-muted)]">
                Pay Date: {formatPayrollDate(item.payDate.toISOString())} · Deadline to run payroll: {formatPayrollDate(item.payDate.toISOString())}
              </div>
            </li>
          ))}
        </ul>
      </WorkspacePanel>
    </div>
  );
}
