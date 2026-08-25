import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkspaceAlert, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import {
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";

// Phase 12: reference settings_preferences_fbp
// (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, page 00105).
export default async function PayrollFbpSettingsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const fbpComponents = await db.salaryComponent.findMany({
    where: { orgId: session.user.orgId, category: "REIMBURSEMENT", fbpEligible: true, active: true },
    orderBy: { name: "asc" },
  });

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
        <WorkspaceSectionHeading index="01" title="Flexible Benefit Plan" />
        {fbpComponents.length === 0 ? (
          <WorkspaceAlert variant="info">
            <strong className="block">No Active FBP component</strong>
            Your organisation does not have an active FBP component associated to an
            employee. Mark a reimbursement as FBP component under{" "}
            <Link href="/payroll/settings/salary-components" className="underline">
              Settings &gt; Salary Components &gt; Reimbursements
            </Link>{" "}
            and associate it to the employee&apos;s salary.
          </WorkspaceAlert>
        ) : (
          <PeopleTable>
            <PeopleTableHeader>
              <PeopleTableRow>
                <PeopleTableHead>Component</PeopleTableHead>
                <PeopleTableHead>Type</PeopleTableHead>
              </PeopleTableRow>
            </PeopleTableHeader>
            <PeopleTableBody>
              {fbpComponents.map((component) => (
                <PeopleTableRow key={component.id}>
                  <PeopleTableCell>{component.name}</PeopleTableCell>
                  <PeopleTableCell>{component.componentType}</PeopleTableCell>
                </PeopleTableRow>
              ))}
            </PeopleTableBody>
          </PeopleTable>
        )}
      </WorkspacePanel>
    </div>
  );
}
