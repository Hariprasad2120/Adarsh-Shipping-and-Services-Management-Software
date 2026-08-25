import { notFound, redirect } from "next/navigation";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { getSession } from "@/lib/auth";
import { getPayrollEmployeeDetail } from "@/modules/payroll/employee-detail-service";
import { formatPayrollDate } from "@/modules/payroll/service";
import { EditPersonalDetailsForm } from "@/modules/payroll/components/edit-personal-details-form";

export default async function PayrollEmployeeEditPersonalDetailsPage({
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
        <WorkspaceSectionHeading
          index="01"
          title={`${employee.name}'s personal information`}
          description="Father's Name, Differently Abled Type, Personal Email, and Residential Address are payroll-editable. Date of Birth and PAN are synced from the HRMS employee profile."
        />
        <EditPersonalDetailsForm
          initial={{
            employeeId: employee.id,
            dob: formatPayrollDate(employee.dob),
            pan: employee.pan,
            fatherName: employee.fatherName ?? "",
            differentlyAbledType: employee.differentlyAbledType ?? "",
            personalEmail: employee.personalEmail ?? "",
            presentAddress: employee.residentialAddress ?? "",
            presentStateCode: employee.residentialStateCode ?? "",
          }}
        />
      </WorkspacePanel>
    </div>
  );
}
