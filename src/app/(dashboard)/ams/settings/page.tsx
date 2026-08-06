import {
  CalendarClock,
  FileText,
  Layers3,
  Settings2,
  Sparkles,
  Target,
} from "lucide-react";
import { WorkspacePanel, WorkspacePanelHeader } from "@/components/layout/workspace";
import {
  PerformanceActionLink,
  PerformanceGrid,
  PerformanceSection,
  PerformanceSectionHeader,
  PerformanceSummary,
  PerformanceSummaryGrid,
} from "@/modules/performance/components/performance-workspace";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

const controlAreas = [
  {
    href: "/ams/cycles",
    title: "Cycle governance",
    description:
      "Open and maintain the appraisal periods that control due dates, review timing, and review readiness.",
    icon: CalendarClock,
  },
  {
    href: "/ams/criteria",
    title: "Criteria and scoring",
    description:
      "Manage the question sets, scoring behavior, and reviewer structure used across appraisal workflows.",
    icon: FileText,
  },
  {
    href: "/ams/slabs",
    title: "Increment slabs",
    description:
      "Maintain compensation bands and score-linked increment guidance for controlled appraisal outcomes.",
    icon: Layers3,
  },
  {
    href: "/ams/kpi",
    title: "Department KPI",
    description:
      "Define measurable performance outcomes that support structured appraisal evaluation by function.",
    icon: Target,
  },
];

export default async function AmsSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <PerformanceSummaryGrid>
        <PerformanceSummary
          icon={<Settings2 aria-hidden="true" />}
          label="Control areas"
          value={controlAreas.length}
          detail="Core appraisal administration surfaces"
        />
        <PerformanceSummary
          icon={<CalendarClock aria-hidden="true" />}
          label="Primary cadence"
          value="Cycle-led"
          detail="Appraisal periods remain the top-level control"
        />
        <PerformanceSummary
          icon={<FileText aria-hidden="true" />}
          label="Evaluation model"
          value="Criteria"
          detail="Questions, scoring, and reviewer logic"
        />
        <PerformanceSummary
          icon={<Sparkles aria-hidden="true" />}
          label="Outcome tuning"
          value="Increment"
          detail="Use slabs and KPI guidance for calibration"
        />
      </PerformanceSummaryGrid>

      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Configuration workspace"
          title="AMS settings and governance"
          description="These settings destinations own the appraisal structures that shape review timing, scoring, department targets, and outcome calibration."
          actions={
            <PerformanceActionLink href="/ams/appraisals">
              Open appraisals
            </PerformanceActionLink>
          }
        />
        <PerformanceGrid className="p-5">
          {controlAreas.map((area) => {
            const Icon = area.icon;
            return (
              <WorkspacePanel key={area.href} className="h-full">
                <WorkspacePanelHeader
                  eyebrow="Linked control"
                  title={area.title}
                  description={area.description}
                  actions={
                    <PerformanceActionLink href={area.href}>
                      Open
                    </PerformanceActionLink>
                  }
                />
                <div className="px-5 pb-5">
                  <span className="mnx-icon-badge">
                    <Icon aria-hidden="true" />
                  </span>
                </div>
              </WorkspacePanel>
            );
          })}
        </PerformanceGrid>
      </PerformanceSection>
    </>
  );
}
