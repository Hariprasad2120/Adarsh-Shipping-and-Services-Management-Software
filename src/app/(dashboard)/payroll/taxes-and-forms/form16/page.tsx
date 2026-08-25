import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkspaceAlert, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { getPayrollOrgTaxProfile } from "@/modules/payroll/org-tax-profile-actions";
import { listForm16Filings } from "@/modules/payroll/form16-filing-actions";
import { Form16EmployeeRow } from "@/modules/payroll/components/form16-employee-row";
import {
  PeopleTable,
  PeopleTableBody,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";

function currentFiscalYear() {
  const now = new Date();
  const startYear = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

// Phase 28, rebuilt 2026-08-25: real PDF generation (estimated Part B —
// see the banner on the PDF itself) replaces the static "not implemented"
// step list. E-filing to the govt. portal is still a manual-tracking stub
// (Form16Filing) — this repo has no GSP API credentials or DSC-signing
// infrastructure, and fabricating that integration isn't appropriate.
export default async function PayrollForm16Page() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");
  const orgId = session.user.orgId;

  const fiscalYear = currentFiscalYear();
  const [profile, employees, filings] = await Promise.all([
    getPayrollOrgTaxProfile(orgId),
    db.user.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true, employeeNumber: true },
      orderBy: { name: "asc" },
    }),
    listForm16Filings(orgId, fiscalYear),
  ]);
  const deductorFound = Boolean(profile?.pan && profile?.tan);
  const filingByEmployee = new Map(filings.map((f) => [f.employeeId, f]));

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/taxes-and-forms"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Taxes &amp; Forms
      </Link>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title={`Form 16 — Financial Year ${fiscalYear}`}
          description="Verify your tax deductor before generating Form 16."
        />
        {deductorFound ? (
          <WorkspaceAlert variant="success">
            Tax deductor verified — PAN {profile?.pan}, TAN {profile?.tan}.
          </WorkspaceAlert>
        ) : (
          <WorkspaceAlert variant="warning">
            Tax Deductor is not found.{" "}
            <Link href="/payroll/settings/organization" className="underline">
              Add Tax Deductor
            </Link>
          </WorkspaceAlert>
        )}
      </WorkspacePanel>

      {deductorFound ? (
        <WorkspacePanel className="space-y-4 p-5">
          <WorkspaceSectionHeading
            index="02"
            title="Generate & track filing"
            description="Each PDF is an estimate (see the banner on the document) — verify before filing, then record the outcome here."
          />
          <PeopleTable>
            <PeopleTableHeader>
              <PeopleTableRow>
                <PeopleTableHead>Employee</PeopleTableHead>
                <PeopleTableHead>Status</PeopleTableHead>
                <PeopleTableHead>Actions</PeopleTableHead>
              </PeopleTableRow>
            </PeopleTableHeader>
            <PeopleTableBody>
              {employees.map((employee) => (
                <Form16EmployeeRow
                  key={employee.id}
                  employeeId={employee.id}
                  employeeName={employee.name}
                  employeeNumber={employee.employeeNumber == null ? "-" : String(employee.employeeNumber)}
                  fiscalYear={fiscalYear}
                  status={(filingByEmployee.get(employee.id)?.status as "NOT_FILED" | "GENERATED" | "FILED") ?? "NOT_FILED"}
                />
              ))}
            </PeopleTableBody>
          </PeopleTable>
        </WorkspacePanel>
      ) : null}
    </div>
  );
}
