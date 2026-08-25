import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { getPayrollEmployeeDetail } from "@/modules/payroll/employee-detail-service";
import { formatPayrollDate } from "@/modules/payroll/service";

function EditLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--mnx-accent-strong)] hover:underline"
    >
      <Pencil className="size-3.5" aria-hidden="true" />
      {label}
    </Link>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-[var(--mnx-text)]">{value ?? "—"}</div>
    </div>
  );
}

export default async function PayrollEmployeeOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const { id } = await params;
  const employee = await getPayrollEmployeeDetail(session.user.orgId, id);
  if (!employee) notFound();

  return (
    <div className="space-y-6">
      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading index="01" title="Basic Information" description="" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name" value={employee.name} />
          <Field label="Email Address" value={employee.email} />
          <Field label="Mobile Number" value={employee.personalPhone} />
          <Field label="Date of Joining" value={formatPayrollDate(employee.joinDate)} />
          <Field label="Gender" value={employee.gender} />
          <Field label="Work Location" value={employee.branchName} />
          <Field label="Designation" value={employee.designation} />
          <Field label="Department" value={employee.departmentName} />
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="02"
          title="Statutory Information"
          description=""
          actions={
            <EditLink href={`/payroll/employees/${id}/edit-statutory-details`} label="Edit" />
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="EPF" value={employee.statutory.epfEnabled ? "Enabled" : "Disabled"} />
          <Field label="PF Account Number" value={employee.pfAccountNumber} />
          <Field label="UAN" value={employee.uan} />
          <Field
            label="Contribute to EPS"
            value={employee.contributeToEps ? "Enabled" : "Disabled"}
          />
          <Field label="ESI" value={employee.statutory.esiEnabled ? "Enabled" : "Disabled"} />
          <Field label="ESI Insurance Number" value={employee.esiInsuranceNumber} />
          <Field
            label="Professional Tax"
            value={employee.statutory.professionalTaxEnabled ? "Enabled" : "Disabled"}
          />
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="03"
          title="Personal Information"
          description=""
          actions={
            <EditLink href={`/payroll/employees/${id}/edit-personal-details`} label="Edit" />
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Date of Birth" value={formatPayrollDate(employee.dob)} />
          <Field label="PAN" value={employee.pan} />
          <Field label="Aadhaar" value={employee.aadhaarMasked} />
          <Field label="Father's Name" value={employee.fatherName} />
          <Field label="Personal Email Address" value={employee.personalEmail} />
          <Field label="Differently Abled Type" value={employee.differentlyAbledType ?? "None"} />
          <Field
            label="Residential Address"
            value={
              [employee.residentialAddress, employee.residentialStateCode]
                .filter(Boolean)
                .join(", ") || null
            }
          />
          <Field label="Portal Access" value={employee.active ? "Enabled" : "Disabled"} />
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading index="04" title="Payment Information" description="" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Payment Mode" value={employee.paymentMode} />
          <Field label="Account Number" value={employee.bankAccountMasked} />
          <Field label="Account Holder Name" value={employee.bankHolderName} />
          <Field label="Account Type" value={employee.bankAccountType} />
          <Field label="Bank Name" value={employee.bankName} />
          <Field label="IFSC" value={employee.ifsc} />
        </div>
      </WorkspacePanel>
    </div>
  );
}
