import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { listCycles } from "@/modules/ams/service";
import { getNow } from "@/lib/clock";
import {
  PerformanceSummary,
  PerformanceSummaryGrid,
} from "@/modules/performance/components/performance-workspace";
import { CalendarClock, ClipboardCheck, Gauge, Sparkles } from "lucide-react";
import { CyclesClient } from "./cycles-client";

type CyclesClientProps = React.ComponentProps<typeof CyclesClient>;

export default async function CyclesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "ams.cycle.manage");

  const [cycles, now] = await Promise.all([
    listCycles(session.user.orgId!),
    getNow(),
  ]);
  const activeCycles = cycles.filter((cycle) => cycle.status === "ACTIVE").length;
  const draftCycles = cycles.filter((cycle) => cycle.status === "DRAFT").length;
  const totalAppraisals = cycles.reduce(
    (sum, cycle) => sum + cycle._count.appraisals,
    0,
  );

  return (
    <div className="space-y-6">
      <PerformanceSummaryGrid>
        <PerformanceSummary
          icon={<CalendarClock aria-hidden="true" />}
          label="Configured cycles"
          value={cycles.length}
          detail="Appraisal periods currently available"
        />
        <PerformanceSummary
          icon={<Gauge aria-hidden="true" />}
          label="Active cycles"
          value={activeCycles}
          detail="Cycles currently governing live appraisals"
        />
        <PerformanceSummary
          icon={<Sparkles aria-hidden="true" />}
          label="Draft cycles"
          value={draftCycles}
          detail="Periods still waiting for activation"
        />
        <PerformanceSummary
          icon={<ClipboardCheck aria-hidden="true" />}
          label="Appraisals linked"
          value={totalAppraisals}
          detail={`Counted across cycles as of ${now.getFullYear()}`}
        />
      </PerformanceSummaryGrid>
      <CyclesClient cycles={cycles as CyclesClientProps["cycles"]} currentYear={now.getFullYear()} />
    </div>
  );
}
