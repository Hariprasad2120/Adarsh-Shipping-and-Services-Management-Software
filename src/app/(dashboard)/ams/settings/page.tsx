import { CalendarClock, FileText, Layers3, Target } from "lucide-react";
import { WorkspacePanel, WorkspacePanelHeader } from "@/components/layout/workspace";
import {
  PerformanceActionLink,
  PerformanceGrid,
  PerformanceSection,
  PerformanceSectionHeader,
} from "@/modules/performance/components/performance-workspace";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { getAppraisalSettings } from "@/modules/ams/settings";
import { AppraisalSettingsForm } from "./settings-client";

export const metadata = {
  title: "Appraisal Settings | AMS | Adarsh Shipping",
};

const linkedControls = [
  {
    href: "/ams/criteria",
    title: "Criteria and self-assessment form",
    description: "Question sets, scoring behaviour, reviewer visibility, and the self-assessment template.",
    icon: FileText,
  },
  {
    href: "/ams/slabs",
    title: "Increment slabs",
    description: "Score-to-hike bands used when a decision is finalised.",
    icon: Layers3,
  },
  {
    href: "/ams/cycles",
    title: "Cycle governance",
    description: "Open and maintain the appraisal periods that drive due dates.",
    icon: CalendarClock,
  },
  {
    href: "/ams/kpi",
    title: "Department KPI",
    description: "Measurable performance outcomes that support structured evaluation.",
    icon: Target,
  },
];

export default async function AmsSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/ams");

  const canManage = await can(session.user.id, "ams.cycle.manage");
  if (!canManage) redirect("/ams");

  const settings = await getAppraisalSettings(orgId);

  return (
    <div className="space-y-6">
      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Configuration workspace"
          title="Appraisal settings"
          description="Central control for appraisal workflow timing, scoring weights, optional stages, and escalation. These apply to new appraisals across the organisation."
          actions={<PerformanceActionLink href="/ams/appraisals">Open appraisals</PerformanceActionLink>}
        />
      </PerformanceSection>

      <AppraisalSettingsForm settings={settings} />

      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Linked controls"
          title="Related administration surfaces"
          description="Structures managed on their own pages but governed alongside these settings."
        />
        <PerformanceGrid className="p-5">
          {linkedControls.map((area) => {
            const Icon = area.icon;
            return (
              <WorkspacePanel key={area.href} className="h-full">
                <WorkspacePanelHeader
                  eyebrow="Linked control"
                  title={area.title}
                  description={area.description}
                  actions={<PerformanceActionLink href={area.href}>Open</PerformanceActionLink>}
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
    </div>
  );
}
