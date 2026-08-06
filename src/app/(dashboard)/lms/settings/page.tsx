import {
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Settings2,
  Sparkles,
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
    href: "/lms/courses",
    title: "Course catalogue",
    description:
      "Review the active learning catalogue and the training paths employees can discover and join.",
    icon: BookOpen,
  },
  {
    href: "/lms/assignments",
    title: "Assignment administration",
    description:
      "Track required learning work and confirm which courses are being pushed into employee workloads.",
    icon: ClipboardCheck,
  },
  {
    href: "/lms/reports",
    title: "Completion reporting",
    description:
      "Monitor enrolment, progress, and completion signals used to govern the learning program.",
    icon: GraduationCap,
  },
  {
    href: "/lms/my-learning",
    title: "Learner experience",
    description:
      "Review the employee-facing learning flow to keep discovery and completion expectations aligned.",
    icon: Sparkles,
  },
];

export default async function LmsSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <PerformanceSummaryGrid>
        <PerformanceSummary
          icon={<Settings2 aria-hidden="true" />}
          label="Control areas"
          value={controlAreas.length}
          detail="Catalogue, assignments, reporting, and learner flow"
        />
        <PerformanceSummary
          icon={<BookOpen aria-hidden="true" />}
          label="Programme focus"
          value="Courses"
          detail="Catalogue quality drives the workspace"
        />
        <PerformanceSummary
          icon={<ClipboardCheck aria-hidden="true" />}
          label="Managed workflow"
          value="Assignments"
          detail="Required learning stays visible and auditable"
        />
        <PerformanceSummary
          icon={<Sparkles aria-hidden="true" />}
          label="Experience lens"
          value="Learner"
          detail="Review the same paths employees rely on"
        />
      </PerformanceSummaryGrid>

      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Configuration workspace"
          title="LMS settings and governance"
          description="Learning administration currently flows through these shared LMS workspaces, which together control catalogue health, assignment handling, and completion oversight."
          actions={
            <PerformanceActionLink href="/lms/courses">
              Open courses
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
