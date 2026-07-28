import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("Monolith application shell safeguards", () => {
  it("uses one Monolith shell for every authenticated dashboard route", () => {
    const layoutSource = readSource("src/app/(dashboard)/layout.tsx");
    const switcherSource = readSource(
      "src/app/(dashboard)/_components/dashboard-shell-switcher.tsx",
    );

    expect(layoutSource).toContain("DashboardShellSwitcher");
    expect(switcherSource).toContain("MonolithDashboardShell");
    expect(switcherSource).not.toContain("DashboardChromeProvider");
    expect(switcherSource).not.toContain("MainShell");
    expect(switcherSource).not.toContain("<Sidebar");
    expect(switcherSource).not.toContain("usePathname");
  });

  it("loads the UI font once and applies the shared foundation globally", () => {
    const rootLayoutSource = readSource("src/app/layout.tsx");
    const globalStyles = readSource("src/app/globals.css");
    const foundationStyles = readSource("src/styles/monolith-foundation.css");

    expect(rootLayoutSource).toContain('Geist, Geist_Mono');
    expect(rootLayoutSource).toContain("--font-geist-sans");
    expect(globalStyles).toContain('@import "./../styles/monolith-foundation.css"');
    expect(foundationStyles).toContain("--mnx-font-sans");
    expect(foundationStyles).toContain('[data-ui="business-number"]');
    expect(foundationStyles).toContain("font-variant-numeric: tabular-nums");
  });

  it("keeps page and section headings text-only by construction", () => {
    const pagePrimitives = readSource("src/components/monolith/page.tsx");
    const moduleCommand = readSource(
      "src/app/(dashboard)/dashboard/_components/module-command-center.tsx",
    );

    expect(pagePrimitives).toContain('<h1 className="mnx-page-title">{title}</h1>');
    expect(pagePrimitives).toContain('<h2 className="mnx-section-title">{title}</h2>');
    expect(pagePrimitives).not.toContain("icon?:");
    expect(moduleCommand).not.toContain("mnx-module-icon");
  });

  it("derives the top-bar context from the active route", () => {
    const shellSource = readSource(
      "src/components/monolith/monolith-dashboard-shell.tsx",
    );

    expect(shellSource).toContain("activeLocation");
    expect(shellSource).toContain("matchesPath(pathname");
    expect(shellSource).toContain('className="mnx-route-content"');
    expect(shellSource).not.toContain("<b>Dashboard</b>");
  });
});
