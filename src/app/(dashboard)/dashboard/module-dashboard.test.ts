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

  it("uses the shared UI family and approved weights for business figures", () => {
    const styles = readSource("src/styles/monolith-system.css");

    expect(styles).not.toContain("font-family: var(--font-geist-mono)");
    for (const disallowedWeight of [390, 420, 440, 520, 560, 580, 590, 620, 640, 650, 690, 720, 750, 760, 800]) {
      expect(styles).not.toContain(`font-weight: ${disallowedWeight};`);
    }
  });
});
