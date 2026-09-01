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
    const styles = read("src/app/globals.css");

    expect(styles).toContain(".mnx-dashboard-shell {");
    expect(styles).toContain("overflow: hidden;");
    expect(styles).toContain(".mnx-dashboard-main {");
    expect(styles).toContain("overflow-y: auto;");
    expect(styles).toContain(".mnx-dashboard-page {");
    expect(styles).toContain("max-width: var(--mnx-page-max);");
  });

  it("keeps mobile navigation and focus-managed overlays in the shared shell", () => {
    const appShell = read("src/modules/core/components/monolith-app-shell.tsx");
    const sidebar = read("src/components/navigation/monolith-app-sidebar.tsx");

    expect(sidebar).toContain('aria-label="Open navigation"');
    expect(sidebar).toContain('aria-modal="true"');
    expect(sidebar).toContain("Close navigation");
    expect(appShell).toContain("MonolithThemeProvider");
    expect(appShell).toContain("MonolithThemePicker");
  });

  it("keeps every workspace submenu interactive and accessible", () => {
    const sidebar = read("src/components/navigation/monolith-app-sidebar.tsx");
    const styles = read("src/app/globals.css");

    expect(sidebar).toContain("getVisibleSections");
    expect(sidebar).toContain("getActiveItemHref");
    expect(sidebar).toContain("matchesPath");
    expect(sidebar).toContain("aria-expanded={isOpen}");
    expect(sidebar).toContain("section.items.map((item, index)");
    expect(sidebar).toContain('className="mono-sidebar-subnav"');
    expect(sidebar).toContain("MonolithSidebarTooltip");
    expect(sidebar).not.toContain("@/components/ui/sidebar");
    expect(styles).toContain(".mono-sidebar-subnav-wrap");
    expect(styles).toContain(".mono-sidebar-subitem");
    expect(styles).toContain(".mono-sidebar-section.is-open");
  });
});
