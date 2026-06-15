import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { Calculator } from "lucide-react";
import { SalaryCalculator } from "./salary-calculator";

export const metadata = {
  title: "Salary Sheet | HRMS | Adarsh Shipping",
};

export default async function SalarySheetPage() {
  const session = await auth();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "hrms.employee.create");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <h1 className="ds-h1 heading-icon-none flex items-center gap-4 text-gray-900">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
              <Calculator className="size-5" />
            </span>
            Salary Calculator
          </h1>
        </div>
      </div>
      <SalaryCalculator />
    </div>
  );
}
