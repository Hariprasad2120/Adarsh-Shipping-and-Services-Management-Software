import { MessageSquareText } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { WorkspaceMetric, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { AdminPermissionState } from "@/modules/admin/components/admin-workspace";
import { AVAILABLE_MODELS } from "@/modules/mona/gemini-client";
import {
  getMonaAdminSnapshot,
  getMonaGovernanceForOrg,
} from "@/modules/mona/governance";
import { WorkPetAdminClient } from "./work-pet-admin-client";

export default async function AdminWorkPetPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const allowed = await can(session.user.id, "admin.org.manage");
  if (!allowed || !session.user.orgId) {
    return (
      <AdminPermissionState description="You do not have permission to govern Mona rollout, model controls, or analytics." />
    );
  }

  const [settings, snapshot] = await Promise.all([
    getMonaGovernanceForOrg(session.user.orgId),
    getMonaAdminSnapshot({ orgId: session.user.orgId, windowDays: 14 }),
  ]);

  return (
    <>
      <section className="mnx-workspace-metrics" aria-label="Work Pet governance summary">
        <WorkspaceMetric
          icon={<MessageSquareText aria-hidden="true" />}
          label="Rollout mode"
          value={settings.rolloutMode}
          detail={`${settings.enabledName} assistant availability`}
        />
        <WorkspaceMetric
          icon={<MessageSquareText aria-hidden="true" />}
          label="Active users"
          value={snapshot.summary.activeUsers}
          detail="Users with persisted Mona conversation activity"
        />
        <WorkspaceMetric
          icon={<MessageSquareText aria-hidden="true" />}
          label="Responses"
          value={snapshot.summary.totalResponses}
          detail="Mona responses in the last 14 days"
        />
        <WorkspaceMetric
          icon={<MessageSquareText aria-hidden="true" />}
          label="Token volume"
          value={snapshot.summary.totalTokens}
          detail="Prompt and response tokens captured in audit events"
        />
      </section>

      <WorkspaceSectionHeading
        index="02"
        title="Work Pet governance"
        description="Manage Mona rollout, model behavior, pilot scope, and review usage quality from the same administration workspace."
      />

      <WorkPetAdminClient
        initialSettings={settings}
        models={AVAILABLE_MODELS.map((model) => ({
          id: model.id,
          name: model.name,
          description: model.description,
        }))}
        snapshot={snapshot}
      />
    </>
  );
}
