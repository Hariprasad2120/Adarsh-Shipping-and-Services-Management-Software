import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TOGGLEABLE_MODULE_SECTION_IDS } from "@/modules/core/organisation/module-config";

const repoRoot = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8").replaceAll(
    "\r\n",
    "\n",
  );
}

describe("module-aware main dashboard", () => {
  it("defines a live summary for every toggleable module", () => {
    const serviceSource = readSource("src/modules/dashboard/service.ts");

    for (const moduleId of TOGGLEABLE_MODULE_SECTION_IDS) {
      expect(serviceSource).toContain(`id: "${moduleId}"`);
    }
  });

  it("filters dashboard modules through organization settings and role-visible navigation", () => {
    const pageSource = readSource("src/app/(dashboard)/dashboard/page.tsx");
    const portalSource = readSource(
      "src/app/(dashboard)/dashboard/portal-client.tsx",
    );

    expect(pageSource).toContain("getDashboardContext");
    expect(pageSource).toContain("getVisibleSections(caps, enabledModuleIds)");
    expect(pageSource).toContain("getDashboardModuleSnapshot");
    expect(pageSource).toContain("getDashboardCommandCenterSnapshot");
    expect(pageSource).toContain("permittedHrefsByModule");
    expect(portalSource).not.toContain("initialModuleSnapshot");
    expect(portalSource).not.toContain("setModuleSnapshot");
    expect(portalSource).toContain('fetch("/api/hrms/team/reportees")');
    expect(portalSource).not.toContain('module.id === "attendance"');
  });

  it("does not render the module command center on the dashboard", () => {
    const overviewSource = readSource(
      "src/app/(dashboard)/dashboard/_components/dashboard-overview.tsx",
    );

    // The redesigned launcher is a compact list — no per-module SVG art,
    expect(overviewSource).not.toContain("ModuleCommandCenter");
    expect(overviewSource).not.toContain("mnx-module-command-section");
    expect(overviewSource).not.toContain("mnx-module-card-compact");
  });

  it("opens the dashboard with a single welcome band: intro + inline punch card", () => {
    const portalSource = readSource(
      "src/app/(dashboard)/dashboard/portal-client.tsx",
    );
    const punchSource = readSource("src/components/ds/punch-card.tsx");
    const welcomeSource = readSource("src/components/ds/welcome-note.tsx");

    // One band: WelcomeNote carries the PunchCard in its trailing slot, so the
    // greeting and the attendance control share a line. No separate ops bar,
    // no clock face, celebration, "today's guide", avatar, or "Welcome back".
    expect(portalSource).toContain("<WelcomeNote");
    expect(portalSource).toContain("trailing={");
    expect(portalSource).toContain("<PunchCard");
    expect(portalSource).not.toContain("<OperationsBar");
    expect(portalSource).not.toContain("AttendanceCommand");
    expect(portalSource).toContain("<Tabs");
    expect(punchSource).not.toContain("Welcome back");
    expect(punchSource).not.toContain("celebrat");
    expect(punchSource).not.toContain("mnx-celebration");
    expect(punchSource).toContain("ds-punch");
    // The redundant standalone date header is gone.
    expect(welcomeSource).not.toContain("ds-welcome-stamp");
  });

  it("builds the My space overview from the design system on real command-center data", () => {
    const overviewSource = readSource(
      "src/app/(dashboard)/dashboard/_components/dashboard-overview.tsx",
    );
    const dsTokens = readSource("src/styles/ds-tokens.css");

    // Overview is composed from reusable DS components, not bespoke markup.
    expect(overviewSource).toContain('from "@/components/ds"');
    expect(overviewSource).toContain("<MetricCard");
    expect(overviewSource).toContain("<StatGrid");
    expect(overviewSource).toContain("<ChartCard");
    expect(overviewSource).not.toContain("<DataTable");
    expect(overviewSource).not.toContain('<Card variant="dark"');
    expect(overviewSource).toContain('<Card className="ds-dash-panel-stack"');
    expect(overviewSource).not.toContain("<AttentionList");
    expect(overviewSource).not.toContain("<QuickActions");
    expect(overviewSource).not.toContain("<ModuleCommandCenter");
    expect(overviewSource).not.toContain("moreHref=\"/notifications\"");

    // Every widget is fed from the real snapshot — no hardcoded metrics.
    expect(overviewSource).toContain("commandCenterSnapshot");
    expect(overviewSource).toContain("pulseMetrics");
    expect(overviewSource).toContain("appraisalStages");
    expect(overviewSource).toContain("activityTrend");
    expect(overviewSource).not.toContain("const revenue =");
    expect(overviewSource).not.toContain("DashboardInsightGrid");
    expect(overviewSource).not.toContain("buildWeeklySchedule");

    // The dark analytics panel is a DS surface variant, not a page-local colour set.
    expect(dsTokens).toContain(".ds-attention-row[data-severity=\"critical\"]");
    expect(dsTokens).toContain(".ds-panel--dark");
    expect(dsTokens).toContain("--ds-inv-surface");
    expect(dsTokens).toContain("font-variant-numeric: tabular-nums");
  });

  it("maps dashboard light and dark modes to centralized semantic theme tokens", () => {
    const tokens = readSource("src/app/globals.css").replace(
      /\r\n/g,
      "\n",
    );
    const styles = readSource("src/app/globals.css").replace(
      /\r\n/g,
      "\n",
    );

    expect(tokens).toContain("html[data-theme=\"light\"]");
    expect(tokens).toContain("html[data-theme=\"dark\"]");
    expect(tokens).not.toContain("html.theme-purple");
    expect(tokens).toContain("--mn-font-sans");
    expect(tokens).toContain("--mn-color-canvas");
    expect(tokens).toContain("html[data-theme=\"dark\"]");
    expect(styles).toContain("--mnx-page: var(--mn-color-canvas)");
    expect(styles).toContain(
      "--mnx-accent-gradient: var(--mn-gradient-accent)",
    );
  });

  it("limits theme controls to Light and Dark and preserves the user-selected theme", () => {
    const layoutSource = readSource("src/app/layout.tsx");
    const appShellSource = readSource(
      "src/modules/core/components/monolith-app-shell.tsx",
    );
    const portalSource = readSource(
      "src/modules/customer-portal/components/client-actions.tsx",
    );

    expect(layoutSource).toContain(": 'light'");
    expect(layoutSource).not.toContain("savedTheme === 'purple'");
    expect(appShellSource).toContain('{ id: "light", label: "Light"');
    expect(appShellSource).toContain('{ id: "dark", label: "Dark"');
    expect(appShellSource).not.toContain('{ id: "night"');
    expect(appShellSource).not.toContain('{ id: "violet"');
    expect(appShellSource).not.toContain('{ id: "purple"');
    expect(appShellSource).toContain(
      'window.localStorage.setItem("theme", theme)',
    );
    expect(portalSource).toContain("<MonolithThemeProvider>");
    expect(portalSource).toContain(
      'allowedThemes={["light", "dark"]}',
    );
  });
});
