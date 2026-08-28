import Link from "next/link";
import { redirect } from "next/navigation";
import {
  PerformanceSection,
  PerformanceSectionHeader,
} from "@/modules/performance/components/performance-workspace";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listArrears } from "@/modules/ams/service";
import { ArrearsClient, type ArrearRow } from "./arrears-client";

export const metadata = {
  title: "Appraisal Arrears | AMS | Adarsh Shipping",
};

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "PENDING_APPROVAL", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "PAID", label: "Paid" },
  { key: "REJECTED", label: "Rejected" },
];

export default async function ArrearsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const orgId = session.user.orgId;
  if (!orgId) redirect("/ams");

  const [canView, canDecide] = await Promise.all([
    can(session.user.id, "ams.appraisal.view_all"),
    can(session.user.id, "ams.hike.finalise"),
  ]);
  if (!canView && !canDecide) redirect("/ams");

  const sp = await searchParams;
  const status = sp.status ?? "";
  const arrears = await listArrears(orgId, status || undefined);

  const rows: ArrearRow[] = arrears.map((row) => ({
    id: row.id,
    status: row.status,
    amount: row.amount,
    arrearDays: row.arrearDays,
    periodFrom: row.periodFrom.toISOString(),
    periodTo: row.periodTo.toISOString(),
    createdAt: row.createdAt.toISOString(),
    appraisalId: row.appraisal.id,
    employeeName: row.appraisal.employee.name,
    designation: row.appraisal.employee.designation,
    cycleLabel: `${row.appraisal.cycle.name} (${row.appraisal.cycle.year})`,
    meetingDate: row.appraisal.meeting?.scheduledAt.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Compensation"
          title="Appraisal arrears"
          description="Salary arrears raised when an appraisal meeting was held well after the self-assessment was submitted. Approve to hand off to payroll, then mark paid once settled."
        />
        <div className="flex flex-wrap gap-2 px-5 pb-4">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={tab.key ? `/ams/arrears?status=${tab.key}` : "/ams/arrears"}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                status === tab.key
                  ? "border-mono-border bg-mono-accent/10 text-mono-accent"
                  : "border-mono-border/60 bg-mono-card text-mono-muted"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <div className="px-5 pb-5">
          <ArrearsClient rows={rows} canDecide={canDecide} />
        </div>
      </PerformanceSection>
    </div>
  );
}
