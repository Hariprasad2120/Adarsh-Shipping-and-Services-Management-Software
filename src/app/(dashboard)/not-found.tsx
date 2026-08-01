import { WorkspaceErrorState } from "@/components/feedback/workspace-states";
import { WorkspacePage } from "@/components/layout/workspace";

export default function DashboardNotFound() {
  return (
    <WorkspacePage>
      <WorkspaceErrorState
        title="Page not found"
        description="The workspace address may have changed, or you may no longer have access to this page."
        action={{ href: "/dashboard", label: "Return to dashboard" }}
      />
    </WorkspacePage>
  );
}
