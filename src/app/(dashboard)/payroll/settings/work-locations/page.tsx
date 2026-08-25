import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import {
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";

// Phase 10: work locations / departments / designations are NOT duplicated
// here — Branch and Department are canonical HRMS masters
// (docs/payroll/MONOLITH_PAYROLL_INTEGRATION_MAP.md, section 1). This page
// is Payroll's read-only, payroll-scoped view of them, linking to the
// canonical HRMS org-structure manager for edits. Designation has no
// separate master table in this repo — it is a free-text field on User, so
// it is shown as the distinct set of values currently in use.
export default async function PayrollWorkLocationsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");
  const orgId = session.user.orgId;

  const [branches, departments, designationRows] = await Promise.all([
    db.branch.findMany({
      where: { orgId },
      select: { id: true, name: true, _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    }),
    db.department.findMany({
      where: { orgId },
      select: { id: true, name: true, _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { orgId, designation: { not: null } },
      select: { designation: true },
      distinct: ["designation"],
      orderBy: { designation: "asc" },
    }),
  ]);

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
          title="Work Locations"
          description="Canonical HRMS branches. Payroll reads these directly — no duplicate master."
          actions={
            <Link className="mnx-button mnx-button-secondary" href="/hrms/org-structure">
              Manage in HRMS
            </Link>
          }
        />
        {branches.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">No branches configured yet.</p>
        ) : (
          <PeopleTable>
            <PeopleTableHeader>
              <PeopleTableRow>
                <PeopleTableHead>Name</PeopleTableHead>
                <PeopleTableHead>Employees</PeopleTableHead>
              </PeopleTableRow>
            </PeopleTableHeader>
            <PeopleTableBody>
              {branches.map((branch) => (
                <PeopleTableRow key={branch.id}>
                  <PeopleTableCell>{branch.name}</PeopleTableCell>
                  <PeopleTableCell>{branch._count.users}</PeopleTableCell>
                </PeopleTableRow>
              ))}
            </PeopleTableBody>
          </PeopleTable>
        )}
      </WorkspacePanel>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="02"
          title="Departments"
          description="Canonical HRMS departments."
          actions={
            <Link className="mnx-button mnx-button-secondary" href="/hrms/org-structure">
              Manage in HRMS
            </Link>
          }
        />
        {departments.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">No departments configured yet.</p>
        ) : (
          <PeopleTable>
            <PeopleTableHeader>
              <PeopleTableRow>
                <PeopleTableHead>Name</PeopleTableHead>
                <PeopleTableHead>Employees</PeopleTableHead>
              </PeopleTableRow>
            </PeopleTableHeader>
            <PeopleTableBody>
              {departments.map((department) => (
                <PeopleTableRow key={department.id}>
                  <PeopleTableCell>{department.name}</PeopleTableCell>
                  <PeopleTableCell>{department._count.users}</PeopleTableCell>
                </PeopleTableRow>
              ))}
            </PeopleTableBody>
          </PeopleTable>
        )}
      </WorkspacePanel>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="03"
          title="Designations"
          description="Designation is a free-text field on the employee record in this repository — there is no separate designation master to manage. Shown here are the distinct values currently in use."
        />
        {designationRows.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">No designations recorded yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {designationRows.map((row) => (
              <span
                key={row.designation}
                className="rounded-full border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] px-3 py-1 text-xs text-[var(--mnx-text)]"
              >
                {row.designation}
              </span>
            ))}
          </div>
        )}
      </WorkspacePanel>
    </div>
  );
}
