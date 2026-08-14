import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { KpiClient } from "./kpi-client";
import { Award } from "lucide-react";
import {
  PerformanceSection,
  PerformanceSectionHeader,
} from "@/modules/performance/components/performance-workspace";
import { WorkspaceState } from "@/components/layout/workspace";

export const metadata = {
  title: "Department KPI | AMS | Adarsh Shipping",
};

export default async function DepartmentKpiPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "ams.cycle.manage");
  const orgId = session.user.orgId;

  if (!orgId) {
    return (
      <WorkspaceState
        variant="danger"
        eyebrow="Performance configuration"
        title="Configuration error"
        description="Organisation configuration is missing."
        icon={<Award aria-hidden="true" />}
      />
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
    <PerformanceSection>
      <PerformanceSectionHeader
        eyebrow="Performance configuration"
        title="Department KPI"
        description="Create department-specific KPI templates, assign metric weights, and track monthly scoring reviews."
      />
      <div className="px-5 pb-5">
        <KpiClient departments={departments} />
      </div>
    </PerformanceSection>
  );
}
