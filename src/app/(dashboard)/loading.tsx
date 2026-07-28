import {
  WorkspaceLoadingState,
  WorkspacePage,
} from "@/components/monolith";

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
