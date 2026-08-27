import Link from "next/link";
import { getSession } from "@/lib/auth";
import { can, loadCaps } from "@/lib/rbac";
import { getVisibleSectionById } from "@/lib/navigation";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
import { getAppraisalSettings } from "@/modules/ams/settings";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Network,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { AdminChaTestingAction } from "./admin-cha-testing-action";
import { db } from "@/lib/db";
import { AdminPanel, AdminPanelHeader, AdminPermissionState } from "@/modules/admin/components/admin-workspace";
import { WorkspaceMetric, WorkspaceSectionHeading } from "@/components/layout/workspace";
import {
  DashboardInsightCard,
  DashboardInsightGrid,
  DashboardMiniBarChart,
  DashboardSegmentList,
} from "@/components/data-display/dashboard-insights";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await can(session.user.id, "admin.org.manage"))) {
    return (
      <AdminPermissionState description="You do not have permission to manage organisation administration." />
    );
  }

  const [caps, org, roles, settings, canApproveDeleteChaJobs, currentUser] =
    await Promise.all([
      loadCaps(session.user.id),
      getOrg(session.user.orgId!),
      getRoles(session.user.orgId!),
      getAppraisalSettings(session.user.orgId!),
      can(session.user.id, "cha.job.delete.approve"),
      db.user.findUnique({
        where: { id: session.user.id },
        select: {
          isPlatformAdmin: true,
          roles: { select: { role: { select: { name: true } } } },
        },
      }),
    ]);

  const section = getVisibleSectionById(caps, "admin");
  const isAdminActor =
    currentUser?.isPlatformAdmin === true ||
    currentUser?.roles.some((entry) =>
      ["Admin", "Management", "Director"].includes(entry.role.name),
    ) === true;
  const canDeleteAllJobsForTesting =
    process.env.NODE_ENV !== "production" &&
    canApproveDeleteChaJobs &&
    isAdminActor;
  const adminRoutes = section?.items.filter((item) => item.href !== "/admin") ?? [];

  return (
    <>
      <section className="mnx-workspace-metrics" aria-label="Admin summary">
        <WorkspaceMetric
          icon={<Building2 aria-hidden="true" />}
          label="Branches"
          value={org?.branches.length ?? 0}
          detail="Organisation locations"
        />
        <WorkspaceMetric
          icon={<Network aria-hidden="true" />}
          label="Departments"
          value={org?.departments.length ?? 0}
          detail="Operating teams"
        />
        <WorkspaceMetric
          icon={<ShieldCheck aria-hidden="true" />}
          label="Roles"
          value={roles.length}
          detail="Access profiles"
        />
        <WorkspaceMetric
          icon={<CalendarClock aria-hidden="true" />}
          label="Reviewer deadline"
          value={`${settings.availabilityDeadlineDays} day${settings.availabilityDeadlineDays === 1 ? "" : "s"}`}
          detail="Availability response window"
        />
      </section>

      <WorkspaceSectionHeading
        index="01"
        title="Administration dashboard"
        description="The admin home route now highlights organisation control load before listing the destination workspaces."
      />

      <DashboardInsightGrid>
        <DashboardInsightCard
          eyebrow="Governance footprint"
          title="Organisation coverage"
          detail="A quick view of how much organisational structure and policy surface the admin module is controlling."
          chart={(
            <DashboardMiniBarChart
              items={[
                { label: "Branches", value: org?.branches.length ?? 0, tone: "info" },
                { label: "Departments", value: org?.departments.length ?? 0, tone: "accent" },
                { label: "Roles", value: roles.length, tone: "success" },
                { label: "Admin routes", value: adminRoutes.length, tone: "warning" },
              ]}
            />
          )}
        />
        <DashboardInsightCard
          eyebrow="Policy signals"
          title="Current control posture"
          detail="The admin home page should explain what is governed here, not only show a collection of links."
          chart={(
            <DashboardSegmentList
              items={[
                { label: "Role controls", value: roles.length, tone: "info" },
                { label: "People structure", value: (org?.branches.length ?? 0) + (org?.departments.length ?? 0), tone: "accent" },
                { label: "Reviewer SLA days", value: settings.availabilityDeadlineDays, tone: "warning" },
              ]}
            />
          )}
          footer={<span>Reviewer availability is currently expected within {settings.availabilityDeadlineDays} day{settings.availabilityDeadlineDays === 1 ? "" : "s"}.</span>}
        />
      </DashboardInsightGrid>

      <div className="mnx-admin-link-grid">
        {adminRoutes.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="mnx-admin-link-card"
            >
              <span className="mnx-admin-link-icon">
                <Icon aria-hidden="true" />
              </span>
              <span>
                <strong>{item.label}</strong>
                <small>
                  {item.href === "/admin/roles"
                    ? "Manage roles and explicit permissions."
                    : item.href === "/admin/settings"
                      ? "Control appraisal configuration."
                      : item.href === "/admin/work-pet"
                        ? "Govern Mona rollout, model policy, analytics, and feedback."
                      : item.href === "/admin/notifications"
                        ? "Inspect notification delivery and retries."
                        : "Open this controlled administration tool."}
                </small>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          );
        })}
      </div>

      {canDeleteAllJobsForTesting ? (
        <AdminPanel>
          <AdminPanelHeader
            eyebrow="Development only"
            title="CHA test cleanup"
            description="Permanently delete all CHA jobs in this organisation for controlled local testing."
            actions={<Trash2 aria-hidden="true" />}
          />
          <div className="mnx-admin-panel-body">
            <AdminChaTestingAction />
          </div>
        </AdminPanel>
      ) : null}
    </>
  );
}
