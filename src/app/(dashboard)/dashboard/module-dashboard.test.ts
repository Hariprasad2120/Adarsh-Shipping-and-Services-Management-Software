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
    const portalSource = readSource("src/app/(dashboard)/dashboard/portal-client.tsx");

    expect(pageSource).toContain("getDashboardContext");
    expect(pageSource).toContain("getVisibleSections(caps, enabledModuleIds)");
    expect(pageSource).toContain("getDashboardModuleSnapshot");
    expect(pageSource).toContain("permittedHrefsByModule");
    expect(portalSource).toContain("setModuleSnapshot");
    expect(portalSource).toContain('fetch("/api/hrms/team/reportees")');
    expect(portalSource).toContain('module.id === "attendance"');
  });

  it("uses graphical alternating module cards without uneven grid spans", () => {
    const styles = readSource("src/styles/monolith-system.css");
    const moduleCards = readSource(
      "src/app/(dashboard)/dashboard/_components/module-command-center.tsx",
    );

    expect(styles).toContain("repeat(12, minmax(0, 1fr))");
    expect(styles).toContain("grid-column: span 6");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)");
    expect(styles).not.toContain(".mnx-module-command {\n  min-width: 0;\n  padding:");
    expect(styles).toContain("radial-gradient(circle at -16% -16%");
    expect(styles).toContain("radial-gradient(circle at 116% 116%");
    expect(styles).not.toContain(".mnx-module-card:nth-child(5n + 1)");
    expect(styles).not.toContain("module-backgrounds");
    expect(styles).toContain(".mnx-module-graphic");
    expect(styles).toContain(".mnx-module-graphic-accent");
    expect(styles).toContain(".mnx-module-card[data-visual=\"attendance\"] .mnx-module-graphic");
    expect(styles).toContain("@keyframes mnx-module-graphic-float");
    expect(styles).toContain("@keyframes mnx-module-clock-hand");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain(".mnx-module-card:hover");
    expect(styles).toContain("box-shadow: var(--mnx-theme-shadow)");
    expect(styles).toContain("transform var(--mn-motion-panel) var(--mnx-hover-ease)");
    expect(styles).toContain(".mnx-module-card:focus-visible");
    expect(moduleCards).toContain("MODULE_LAYOUT_SEQUENCE");
    expect(moduleCards).toContain("function ModuleGraphic");
    expect(moduleCards).toContain("getModuleLayout(module.id, index)");
    expect(moduleCards).toContain("const visual = getModuleVisual(module.id)");
    expect(moduleCards).toContain("href={module.href}");
    expect(moduleCards).toContain("<ModuleGraphic visual={visual} />");
    expect(moduleCards).not.toContain("<span />");
    expect(moduleCards).not.toContain('<Link className="mnx-module-open-link"');
    expect(moduleCards).not.toContain("mnx-module-health");
    expect(styles).not.toContain(".mnx-module-health");
    expect(moduleCards).toContain("data-layout={layout}");
    expect(moduleCards).toContain("data-visual={visual}");
  });

  it("renders the protected dashboard through shared foundation primitives", () => {
    const portalSource = readSource("src/app/(dashboard)/dashboard/portal-client.tsx");
    const attendanceSource = readSource(
      "src/app/(dashboard)/dashboard/_components/attendance-command.tsx",
    );
    const overviewSource = readSource(
      "src/app/(dashboard)/dashboard/_components/dashboard-overview.tsx",
    );
    const teamSource = readSource(
      "src/app/(dashboard)/dashboard/_components/dashboard-team.tsx",
    );
    const organizationSource = readSource(
      "src/app/(dashboard)/dashboard/_components/dashboard-organization.tsx",
    );
    const styles = readSource("src/styles/monolith-system.css");

    expect(portalSource).toContain("<MonolithPage>");
    expect(portalSource).not.toContain('<div className="mnx-dashboard-page">');
    expect(attendanceSource).toContain("<MonolithAction");
    expect(attendanceSource).toContain("<MonolithBadge");
    expect(overviewSource).toContain("<MonolithSurface");
    expect(overviewSource).toContain('].join("-")');
    expect(overviewSource).not.toContain("key: date.toISOString()");
    expect(teamSource).toContain("<WorkspaceSectionHeading");
    expect(teamSource).toContain('className="mnx-dashboard-metrics mnx-team-metrics"');
    expect(teamSource).not.toContain("mnx-summary-stat");
    expect(teamSource).toContain("<MonolithIconAction");
    expect(organizationSource).toContain("<WorkspaceSectionHeading");
    expect(organizationSource).toContain('className="mnx-dashboard-metrics mnx-org-metrics"');
    expect(organizationSource).not.toContain("mnx-org-stat-grid");
    expect(styles).toContain("grid-template-columns: repeat(8, minmax(0, 1fr))");
  });

  it("maps dashboard aliases to centralized semantic theme tokens", () => {
    const tokens = readSource("src/styles/monolith-tokens.css").replace(/\r\n/g, "\n");
    const styles = readSource("src/styles/monolith-system.css").replace(/\r\n/g, "\n");

    expect(tokens).toContain("html.theme-light");
    expect(tokens).toContain("html.theme-night");
    expect(tokens).toContain("html.theme-violet");
    expect(tokens).toContain("html.theme-purple");
    expect(tokens).toContain("--mn-font-sans");
    expect(tokens).toContain("--mn-color-canvas");
    expect(tokens).toContain("html.theme-violet {\n  color-scheme: dark;\n  --mn-color-canvas: #000000;");
    expect(tokens).toContain("html.theme-violet {\n  color-scheme: dark;\n  --mn-color-canvas: #000000;\n  --mn-color-surface: #090909;");
    expect(tokens).toContain("--mn-color-accent: #b5aaf5;");
    expect(tokens).toContain("html.theme-purple {\n  color-scheme: light;");
    expect(tokens).toContain("--mn-color-accent: #8b5cf6;");
    expect(styles).toContain("--mnx-page: var(--mn-color-canvas)");
    expect(styles).toContain("--mnx-accent-gradient: var(--mn-gradient-accent)");
  });

  it("defaults theme controls to Night and preserves the user-selected theme", () => {
    const layoutSource = readSource("src/app/layout.tsx");
    const appShellSource = readSource("src/modules/core/components/monolith-app-shell.tsx");
    const sidebarSource = readSource("src/components/layout/sidebar.tsx");
    const portalSource = readSource("src/modules/customer-portal/components/client-actions.tsx");

    expect(layoutSource).toContain(": 'night'");
    expect(layoutSource).toContain("savedTheme === 'purple'");
    expect(appShellSource).toContain('{ id: "night", label: "Night"');
    expect(appShellSource).toContain('{ id: "violet", label: "Violet"');
    expect(appShellSource).toContain('{ id: "light", label: "Light"');
    expect(appShellSource).toContain('{ id: "purple", label: "Purple"');
    expect(appShellSource).toContain('window.localStorage.setItem("theme", theme)');
    expect(sidebarSource).toContain('theme === "night"');
    expect(sidebarSource).toContain('? "violet"');
    expect(sidebarSource).toContain('? "light"');
    expect(sidebarSource).toContain('? "purple"');
    expect(portalSource).toContain('theme === "light" ? "purple" : "night"');
  });
});
