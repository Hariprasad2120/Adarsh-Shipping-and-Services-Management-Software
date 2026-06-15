import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { KpiClient } from "./kpi-client";
import { Award } from "lucide-react";

export const metadata = {
  title: "Department KPI | AMS | Adarsh Shipping",
};

export default async function DepartmentKpiPage() {
  const session = await auth();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "ams.cycle.manage");
  const orgId = session.user.orgId;

  if (!orgId) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
        Organisation configuration missing.
      </div>
    );
  }

  // Fetch departments in organization
  const departments = await db.department.findMany({
    where: { orgId },
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="max-w-7xl space-y-6">
      <div className="space-y-1">
        <h1 className="ds-h1 flex items-center gap-4 text-gray-900 dark:text-white">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
            <Award className="size-5" />
          </span>
          Department KPIs
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Create department-specific KPI templates, assign metrics weights, and track monthly scoring reviews.
        </p>
      </div>

      <KpiClient departments={departments} />
    </div>
  );
}
