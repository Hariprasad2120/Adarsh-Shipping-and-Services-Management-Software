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
    expect(portalSource).toContain("setModuleSnapshot");
    expect(portalSource).toContain('fetch("/api/hrms/team/reportees")');
    expect(portalSource).toContain('module.id === "attendance"');
  });

  it("renders a compact module launcher without illustrated graphics", () => {
    const moduleCards = readSource(
      "src/app/(dashboard)/dashboard/_components/module-command-center.tsx",
    );

    // The redesigned launcher is a compact list — no per-module SVG art,
    // no alternating image-left/image-right layout sequence.
    expect(moduleCards).not.toContain("ModuleGraphic");
    expect(moduleCards).not.toContain("MODULE_LAYOUT_SEQUENCE");
    expect(moduleCards).not.toContain("dashboard/graphics/");
    expect(moduleCards).not.toContain('.padStart(2, "0")');
    expect(moduleCards).toContain("mnx-module-card-compact");
    expect(moduleCards).toContain("href={module.href}");
  });

  it("opens the dashboard with an operations bar, not a greeting hero", () => {
    const portalSource = readSource(
      "src/app/(dashboard)/dashboard/portal-client.tsx",
    );
    const opsBarSource = readSource(
      "src/app/(dashboard)/dashboard/_components/operations-bar.tsx",
    );
    const overviewSource = readSource(
      "src/app/(dashboard)/dashboard/_components/dashboard-overview.tsx",
    );
    const styles = readSource("src/app/globals.css");

    // Ops bar replaced the attendance panel: no clock face, celebration,
    // "today's guide", avatar, or "Welcome back".
    expect(portalSource).toContain("<OperationsBar");
    expect(portalSource).not.toContain("AttendanceCommand");
    expect(portalSource).toContain("<Tabs");
    expect(opsBarSource).not.toContain("Welcome back");
    expect(opsBarSource).not.toContain("celebrat");
    expect(opsBarSource).not.toContain("mnx-celebration");
    expect(opsBarSource).toContain("mnx-dash2-att");

    // Overview leads with the attention queue and its severity rail; the
    // analytics grid is no longer the first actionable surface.
    expect(overviewSource).toContain("commandCenterSnapshot");
    expect(overviewSource).toContain("mnx-dash2-queue-row");
    expect(overviewSource).toContain("data-severity={item.severity}");
    expect(overviewSource).not.toContain("DashboardInsightGrid");
    expect(overviewSource).not.toContain("buildWeeklySchedule");
    expect(overviewSource).not.toContain('.padStart(2, "0")');

    // Severity rail + tabular counts are defined against --mn-* tokens.
    expect(styles).toContain(".mnx-dash2-queue-row");
    expect(styles).toContain('.mnx-dash2-queue-row[data-severity="critical"]');
    expect(styles).toContain("--rail: var(--mn-sem-danger)");
    expect(styles).toContain("--rail-wash: var(--mn-tint-danger)");
    expect(styles).toContain("font-variant-numeric: tabular-nums");
  });

  it("maps dashboard aliases to centralized semantic theme tokens", () => {
    const tokens = readSource("src/app/globals.css").replace(
      /\r\n/g,
      "\n",
    );
    const styles = readSource("src/app/globals.css").replace(
      /\r\n/g,
      "\n",
    );

    expect(tokens).toContain("html.theme-light");
    expect(tokens).toContain("html.theme-night");
    expect(tokens).toContain("html.theme-violet");
    expect(tokens).not.toContain("html.theme-purple");
    expect(tokens).toContain("--mn-font-sans");
    expect(tokens).toContain("--mn-color-canvas");
    expect(tokens).toContain(
      "html.theme-violet {\n  color-scheme: dark;\n  --mn-color-canvas: #000000;",
    );
    expect(tokens).toContain(
      "html.theme-violet {\n  color-scheme: dark;\n  --mn-color-canvas: #000000;\n  --mn-color-surface: #090909;",
    );
    expect(tokens).toContain("--mn-color-accent: #b5aaf5;");
    expect(styles).toContain("--mnx-page: var(--mn-color-canvas)");
    expect(styles).toContain(
      "--mnx-accent-gradient: var(--mn-gradient-accent)",
    );
  });

  it("defaults theme controls to Night and preserves the user-selected theme", () => {
    const layoutSource = readSource("src/app/layout.tsx");
    const appShellSource = readSource(
      "src/modules/core/components/monolith-app-shell.tsx",
    );
    const portalSource = readSource(
      "src/modules/customer-portal/components/client-actions.tsx",
    );

    expect(layoutSource).toContain(": 'night'");
    expect(layoutSource).not.toContain("savedTheme === 'purple'");
    expect(appShellSource).toContain('{ id: "night", label: "Night"');
    expect(appShellSource).toContain('{ id: "violet", label: "Violet"');
    expect(appShellSource).toContain('{ id: "light", label: "Light"');
    expect(appShellSource).not.toContain('{ id: "purple"');
    expect(appShellSource).toContain(
      'window.localStorage.setItem("theme", theme)',
    );
    expect(portalSource).toContain("<MonolithThemeProvider>");
    expect(portalSource).toContain(
      'allowedThemes={["light", "night", "violet"]}',
    );
  });
});
