import {
  PlaneTakeoff,
  Route,
  ShipWheel,
} from "lucide-react";
import {
  WorkspaceMetric,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceSectionHeading,
} from "@/components/layout/workspace";
import { WorkspaceEmptyState } from "@/components/feedback/workspace-states";

export function FreightForwardingWorkspace() {
  return (
    <WorkspacePage>
      <WorkspacePageHeader
        eyebrow="Freight forwarding"
        title="Freight Forwarding"
        description="This module has been registered in the Monolith workspace and is intentionally blank for now."
      />

      <section className="mnx-workspace-metrics" aria-label="Freight forwarding summary">
        <WorkspaceMetric
          icon={<Route size={17} aria-hidden="true" />}
          label="Active lanes"
          value={0}
          detail="No workflows configured yet"
        />
        <WorkspaceMetric
          icon={<PlaneTakeoff size={17} aria-hidden="true" />}
          label="Air shipments"
          value={0}
          detail="Blank starter workspace"
        />
        <WorkspaceMetric
          icon={<ShipWheel size={17} aria-hidden="true" />}
          label="Ocean shipments"
          value={0}
          detail="Blank starter workspace"
        />
      </section>

      <WorkspaceSectionHeading
        index="01"
        title="Workspace status"
        description="The route, navigation, and dashboard registration are ready. Operational screens can be added here in the next implementation pass."
      />

      <WorkspacePanel>
        <WorkspacePanelHeader
          eyebrow="Starter state"
          title="Module scaffold complete"
          description="Use this workspace as the owner surface for future Freight Forwarding pages, actions, and module-specific components."
        />
        <div className="mnx-panel-state">
          <WorkspaceEmptyState
            title="No freight forwarding screens yet"
            description="The module is live in the application shell, but its internal workflows are still blank by design."
          />
        </div>
      </WorkspacePanel>
    </WorkspacePage>
  );
}
