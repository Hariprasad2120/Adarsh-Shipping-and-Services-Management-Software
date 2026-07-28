import {
  WorkspaceErrorState,
  WorkspacePage,
} from "@/components/monolith";

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
