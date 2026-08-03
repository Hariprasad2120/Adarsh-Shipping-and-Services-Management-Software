import { ArrowUpRight, Boxes, Building2, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PublicMonolithShell } from "@/modules/auth/components/public-workspace";
import { WorkspaceMetric, WorkspacePage, WorkspacePageHeader, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { RootModuleControlClient } from "@/modules/core/components/root-module-control-client";
import { RootSignOutButton } from "@/modules/core/components/root-signout-button";
import {
  MODULE_CONTROL_ITEMS,
  MODULE_FEATURE_CONTROL_ITEMS,
} from "@/modules/core/organisation/module-config";
import {
  getEnabledFeatureIds,
  getEnabledModuleIds,
} from "@/modules/core/organisation/module-settings";
import { isRootControlEmail } from "@/lib/root-access";

export default async function RootPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!isRootControlEmail(session.user.email)) {
    redirect("/dashboard");
  }

  const [enabledModuleIds, enabledFeatureIds] = await Promise.all([
    getEnabledModuleIds(session.user.orgId!),
    getEnabledFeatureIds(session.user.orgId!),
  ]);

  return (
    <PublicMonolithShell
      workspace
      className="mnx-root-control-shell"
      data-public-route="root-control"
    >
      <WorkspacePage className="mnx-root-control-page">
        <WorkspacePageHeader
          eyebrow="Root control"
          icon={<ShieldCheck />}
          title="Organisation module access"
          description="Manage which major workspaces are available across Adarsh Shipping. Changes update navigation and route access for every signed-in user."
          actions={<RootSignOutButton />}
        />

        <section className="mnx-workspace-metrics" aria-label="Root access summary">
          <WorkspaceMetric
            icon={<ShieldCheck />}
            label="Control account"
            value="ROOT"
            detail={session.user.email}
          />
          <WorkspaceMetric
            icon={<Boxes />}
            label="Enabled modules"
            value={enabledModuleIds.length}
            detail="Available organisation-wide"
          />
          <WorkspaceMetric
            icon={<Building2 />}
            label="Managed modules"
            value={MODULE_CONTROL_ITEMS.length}
            detail="Root-controlled workspaces"
          />
          <WorkspaceMetric
            actionIcon={<ArrowUpRight />}
            actionLabel="Open administration workspace"
            href="/admin"
            icon={<ShieldCheck />}
            label="Recovery access"
            value="ON"
            detail="Core administration remains available"
          />
        </section>

        <WorkspaceSectionHeading
          index="01"
          title="Global availability"
          description="Enable or suspend complete operational workspaces without changing user roles or the permissions assigned inside each module."
        />

        <RootModuleControlClient
          initialFeatureItems={MODULE_FEATURE_CONTROL_ITEMS}
          initialEnabledFeatureIds={enabledFeatureIds}
          initialItems={MODULE_CONTROL_ITEMS}
          initialEnabledModuleIds={enabledModuleIds}
        />
      </WorkspacePage>
    </PublicMonolithShell>
  );
}
