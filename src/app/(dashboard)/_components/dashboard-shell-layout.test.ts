import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("production Monolith shell safeguards", () => {
  it("uses the production shell for every authenticated route", () => {
    const layout = read("src/app/(dashboard)/layout.tsx");
    const switcher = read(
      "src/app/(dashboard)/_components/dashboard-shell-switcher.tsx",
    );

    expect(layout).toContain("DashboardShellSwitcher");
    expect(switcher).toContain("MonolithAppShell");
    expect(switcher).not.toContain("DashboardChromeProvider");
    expect(switcher).not.toContain("MainShell");
    expect(switcher).not.toContain("Sidebar");
    expect(switcher).not.toContain("usesMonolithShell");
  });

  it("keeps one bounded application scroller", () => {
    const styles = read("src/styles/monolith-system.css");

    expect(styles).toContain(".mnx-dashboard-shell {");
    expect(styles).toContain("overflow: hidden;");
    expect(styles).toContain(".mnx-dashboard-main {");
    expect(styles).toContain("overflow-y: auto;");
    expect(styles).toContain(".mnx-dashboard-page {");
    expect(styles).toContain("max-width: var(--mnx-page-max);");
  });

  it("keeps mobile navigation and focus-managed overlays in the shared shell", () => {
    const appShell = read("src/components/monolith/app-shell.tsx");

    expect(appShell).toContain('aria-label="Open navigation"');
    expect(appShell).toContain('aria-modal="true"');
    expect(appShell).toContain("Close navigation");
    expect(appShell).toContain("MonolithThemeProvider");
    expect(appShell).toContain("MonolithThemePicker");
  });

  it("keeps every workspace submenu interactive and accessible", () => {
    const appShell = read("src/components/monolith/app-shell.tsx");
    const styles = read("src/styles/monolith-system.css");

    expect(appShell).toContain("expandedSections");
    expect(appShell).toContain("getActiveItemHref");
    expect(appShell).toContain("aria-expanded={isExpanded}");
    expect(appShell).toContain(
      "aria-controls={`mnx-sidebar-items-${section.id}`}",
    );
    expect(appShell).toContain("section.items.map((item)");
    expect(appShell).toContain("hidden={!isExpanded}");
    expect(appShell).toContain('role="group"');
    expect(styles).toContain(".mnx-sidebar-subnav[hidden]");
    expect(styles).toContain(".mnx-sidebar-section.is-expanded");
  });
});
