import { WorkspaceLoadingState } from "@/components/feedback/workspace-states";
import { WorkspacePage } from "@/components/layout/workspace";

export default function DashboardLoading() {
  return (
    <WorkspacePage aria-label="Loading workspace">
      <WorkspaceLoadingState
        title="Preparing your workspace"
        description="We’re loading the latest records, permissions, and workspace controls."
      />
    </WorkspacePage>
  );
}
