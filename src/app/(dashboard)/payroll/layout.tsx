import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, BriefcaseBusiness, ReceiptIndianRupee } from "lucide-react";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { WorkspacePageHeader } from "@/components/layout/workspace";
import { PayrollModuleNav } from "@/modules/payroll/components/payroll-module-nav";
import { PayrollSectionTabs } from "@/modules/payroll/components/payroll-section-tabs";

export default async function PayrollLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  await requirePermission(session.user.id, "hrms.salary.read");

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Standalone payroll module"
        title="Payroll"
        description="Run payroll with HRMS and Accounting inputs."
        icon={<ReceiptIndianRupee aria-hidden="true" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className="mnx-button mnx-button-secondary" href="/hrms/employees">
              HRMS employees
            </Link>
            <Link className="mnx-button mnx-button-secondary" href="/attendance/ot">
              <CalendarClock className="size-4" aria-hidden="true" />
              Attendance and OT
            </Link>
            <Link className="mnx-button mnx-button-secondary" href="/accounting/journal-entries">
              <BriefcaseBusiness className="size-4" aria-hidden="true" />
              Accounting handoff
            </Link>
          </div>
        }
      />
      <PayrollModuleNav />
      <PayrollSectionTabs />
      {children}
    </div>
  );
}
