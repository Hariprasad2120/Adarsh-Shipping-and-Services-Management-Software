import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  WorkspaceMetric,
  WorkspaceProgress,
  WorkspaceSectionHeading,
} from "./workspace";
import {
  WorkspaceEmptyState,
  WorkspaceErrorState,
  WorkspaceLoadingState,
  WorkspacePermissionState,
} from "./workspace-states";

describe("Monolith workspace states", () => {
  it("renders the shared permission, empty, loading, and error contracts", () => {
    const states = renderToStaticMarkup(
      <>
        <WorkspacePermissionState
          title="Permission denied"
          description="Ask an administrator for access."
        />
        <WorkspaceEmptyState
          title="No records"
          description="Create the first record."
        />
        <WorkspaceLoadingState
          title="Loading"
          description="Preparing records."
        />
        <WorkspaceErrorState
          title="Unavailable"
          description="Retry later."
        />
      </>,
    );

    expect(states).toContain("mnx-workspace-state-permission");
    expect(states).toContain("mnx-workspace-state-empty");
    expect(states).toContain("mnx-workspace-state-loading");
    expect(states).toContain("mnx-workspace-state-danger");
    expect(states).toContain('role="alert"');
    expect(states).toContain('aria-busy="true"');
  });

  it("clamps progress values and exposes progress semantics", () => {
    expect(
      renderToStaticMarkup(
        <WorkspaceProgress label="Task progress" value={140} />,
      ),
    ).toContain(
      'role="progressbar" aria-label="Task progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"',
    );
  });

  it("renders actionable metrics as links with an action affordance", () => {
    const metric = renderToStaticMarkup(
      <WorkspaceMetric
        href="#reuse"
        actionLabel="Open reuse section"
        actionIcon={<span>open</span>}
        label="Reusable primitives"
        value="12"
        detail="Shared components"
      />,
    );

    expect(metric).toContain('class="mnx-workspace-metric is-actionable"');
    expect(metric).toContain('href="#reuse"');
    expect(metric).toContain('aria-label="Open reuse section"');
    expect(metric).toContain("mnx-workspace-metric-action");
  });

  it("renders the numbered section heading contract", () => {
    const heading = renderToStaticMarkup(
      <WorkspaceSectionHeading
        index="02"
        title="Typography"
        description="Large, light headlines carry confidence."
      />,
    );

    expect(heading).toContain("mnx-section-heading");
    expect(heading).toContain("02");
    expect(heading).toContain("Typography");
    expect(heading).toContain("Large, light headlines carry confidence.");
  });
});
