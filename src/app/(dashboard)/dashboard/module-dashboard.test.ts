import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TOGGLEABLE_MODULE_SECTION_IDS } from "@/modules/core/organisation/module-config";

const repoRoot = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
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

    expect(pageSource).toContain("getEnabledModuleIds");
    expect(pageSource).toContain("getVisibleSections(caps, enabledModuleIds)");
    expect(pageSource).toContain("getDashboardModuleSnapshot");
    expect(pageSource).toContain("permittedHrefsByModule");
    expect(portalSource).toContain("setModuleSnapshot");
    expect(portalSource).toContain('module.id === "attendance"');
  });

  it("uses a responsive card grid instead of fixed dashboard columns", () => {
    const styles = readSource("src/styles/monolith-system.css");

    expect(styles).toContain("repeat(auto-fit, minmax(270px, 1fr))");
    expect(styles).toContain(".mnx-module-card:hover");
    expect(styles).toContain("box-shadow: var(--mnx-theme-shadow)");
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

    expect(portalSource).toContain("<MonolithPage>");
    expect(portalSource).not.toContain('<div className="mnx-dashboard-page">');
    expect(attendanceSource).toContain("<MonolithAction");
    expect(attendanceSource).toContain("<MonolithBadge");
    expect(overviewSource).toContain("<MonolithSurface");
    expect(teamSource).toContain("<MonolithIconAction");
  });

  it("maps dashboard aliases to centralized semantic theme tokens", () => {
    const tokens = readSource("src/styles/monolith-tokens.css");
    const styles = readSource("src/styles/monolith-system.css");

    expect(tokens).toContain("html.theme-light");
    expect(tokens).toContain("html.theme-night");
    expect(tokens).toContain("html.theme-violet");
    expect(tokens).toContain("--mn-font-sans");
    expect(tokens).toContain("--mn-color-canvas");
    expect(styles).toContain("--mnx-page: var(--mn-color-canvas)");
    expect(styles).toContain("--mnx-accent-gradient: var(--mn-gradient-accent)");
  });
});
