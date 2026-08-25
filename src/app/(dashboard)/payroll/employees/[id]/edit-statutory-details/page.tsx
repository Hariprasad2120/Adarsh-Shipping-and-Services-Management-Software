import { notFound, redirect } from "next/navigation";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { getSession } from "@/lib/auth";
import { getPayrollEmployeeDetail } from "@/modules/payroll/employee-detail-service";
import { EditStatutoryDetailsForm } from "@/modules/payroll/components/edit-statutory-details-form";

export default async function PayrollEmployeeEditStatutoryDetailsPage({
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
        <WorkspaceSectionHeading index="01" title={`${employee.name}'s statutory information`} />
        <EditStatutoryDetailsForm
          initial={{
            employeeId: employee.id,
            pfAccountNumber: employee.pfAccountNumber ?? "",
            uan: employee.uan ?? "",
            contributeToEps: employee.contributeToEps,
            esiInsuranceNumber: employee.esiInsuranceNumber ?? "",
            professionalTaxOptIn: employee.statutory.professionalTaxEnabled,
          }}
        />
      </WorkspacePanel>
    </div>
  );
}
