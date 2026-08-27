import type { MonaContextSnapshot } from "@/modules/mona/components/mona-provider";

export type MonaGuidanceTarget = {
  description: string;
  helpPrompt: string;
  hint: string;
  id: string;
  label: string;
};

type MonaGuidanceRegistryEntry = {
  routePrefixes: string[];
  targets: MonaGuidanceTarget[];
};

const GUIDANCE_REGISTRY: MonaGuidanceRegistryEntry[] = [
  {
    routePrefixes: ["/dashboard"],
    targets: [
      {
        id: "dashboard-summary-metrics",
        label: "Workspace summary metrics",
        description: "The top summary cards show your immediate operating pulse for announcements, tasks, and holidays.",
        hint: "Start here if you want a fast read on workload and company rhythm.",
        helpPrompt:
          "Guide me through the workspace summary metrics on this dashboard and explain what they indicate for my day.",
      },
      {
        id: "dashboard-operations-hub",
        label: "Operations hub",
        description: "This is the main dashboard work zone for command feed, task pipeline, and recent activity.",
        hint: "Use this section for the fastest operational brief and next-step scan.",
        helpPrompt:
          "Guide me through the operations hub on this dashboard and tell me how to use it as my daily starting point.",
      },
      {
        id: "dashboard-exceptions",
        label: "Needs attention",
        description: "This panel surfaces live exceptions and critical items that need attention first.",
        hint: "Open this when you want to understand blockers or urgent queue pressure.",
        helpPrompt:
          "Explain the exceptions panel on this dashboard and how I should use it to prioritize urgent work.",
      },
      {
        id: "dashboard-quick-launch",
        label: "Shortcut routes",
        description: "These links jump directly into the most relevant active module entry points.",
        hint: "Use this when you know the next workspace you need and want to move quickly.",
        helpPrompt:
          "Guide me through the quick launch section on this dashboard and explain how it relates to my enabled modules.",
      },
      {
        id: "dashboard-analytics-workflows",
        label: "Analytics and workflows",
        description: "This zone summarizes role-visible metrics, appraisal flow, and attendance signals.",
        hint: "Use this for pattern-level review rather than immediate action.",
        helpPrompt:
          "Walk me through the analytics and workflows section on this dashboard and explain what trends I should watch.",
      },
      {
        id: "dashboard-module-command-center",
        label: "Module command center",
        description: "This card grid is the controlled route launcher into your enabled workspaces.",
        hint: "Use this when you want a guided view of which modules are live for your role.",
        helpPrompt:
          "Guide me through the module command center and explain how these modules map to my current access.",
      },
      {
        id: "topbar-global-search",
        label: "Global search",
        description: "The topbar search opens the cross-workspace command palette for navigation.",
        hint: "Use this when you want to jump to a workspace without browsing the sidebar.",
        helpPrompt:
          "Show me how to use the Monolith global search from this page and what kinds of navigation it supports.",
      },
    ],
  },
];

export function getGuidanceTargetsForPath(pathname: string): MonaGuidanceTarget[] {
  const entry = GUIDANCE_REGISTRY.find((candidate) =>
    candidate.routePrefixes.some((prefix) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`),
    ),
  );

  return entry?.targets ?? [];
}

export function buildGuidancePrompts(
  pathname: string,
  snapshot: MonaContextSnapshot | null,
): Array<{ id: string; label: string; prompt: string }> {
  return getGuidanceTargetsForPath(pathname).slice(0, 4).map((target) => ({
    id: `guide-${target.id}`,
    label: `Guide: ${target.label}`,
    prompt: snapshot?.entity
      ? `${target.helpPrompt} Use the current page context and the focused record ${snapshot.entity.label} when relevant.`
      : target.helpPrompt,
  }));
}

export function getGuidanceTargetById(
  pathname: string,
  targetId: string,
): MonaGuidanceTarget | null {
  return (
    getGuidanceTargetsForPath(pathname).find((target) => target.id === targetId) ??
    null
  );
}
