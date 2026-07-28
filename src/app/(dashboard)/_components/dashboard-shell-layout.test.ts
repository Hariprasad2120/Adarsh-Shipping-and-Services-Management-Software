import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

describe("CHA dashboard shell layout safeguards", () => {
  it("keeps the top bar and breadcrumb sticky with measured offsets", () => {
    const shellSource = readFileSync(
      join(repoRoot, "src/app/(dashboard)/_components/dashboard-shell.tsx"),
      "utf8",
    );

    expect(shellSource).toContain("--dashboard-topbar-height");
    expect(shellSource).toContain("--dashboard-breadcrumb-height");
    expect(shellSource).toContain("sticky top-0");
    expect(shellSource).toContain("top-[var(--dashboard-topbar-height)]");
    expect(shellSource).toContain("scrollPaddingTop");
  });

  it("applies a shared CHA content shell and avoids sticky-breaking containment", () => {
    const chaLayoutSource = readFileSync(
      join(repoRoot, "src/app/(dashboard)/cha/layout.tsx"),
      "utf8",
    );
    const pageAnimatorSource = readFileSync(
      join(repoRoot, "src/components/page-animator.tsx"),
      "utf8",
    );

    expect(chaLayoutSource).not.toContain("max-w-7xl");
    expect(chaLayoutSource).toContain("gap-8");
    expect(pageAnimatorSource).not.toContain("contain-[layout_paint]");
    expect(pageAnimatorSource).not.toContain("will-change-transform");
  });

  it("keeps mobile navigation state in shared dashboard chrome and removes desktop offsets on small screens", () => {
    const dashboardLayoutSource = readFileSync(
      join(repoRoot, "src/app/(dashboard)/layout.tsx"),
      "utf8",
    );
    const dashboardShellSwitcherSource = readFileSync(
      join(
        repoRoot,
        "src/app/(dashboard)/_components/dashboard-shell-switcher.tsx",
      ),
      "utf8",
    );
    const mainShellSource = readFileSync(
      join(repoRoot, "src/components/main-shell.tsx"),
      "utf8",
    );
    const sidebarSource = readFileSync(
      join(repoRoot, "src/components/sidebar.tsx"),
      "utf8",
    );
    const welcomeBarSource = readFileSync(
      join(repoRoot, "src/components/welcome-bar.tsx"),
      "utf8",
    );

    expect(dashboardLayoutSource).toContain("DashboardShellSwitcher");
    expect(dashboardShellSwitcherSource).toContain("usePathname");
    expect(dashboardShellSwitcherSource).toContain("DashboardChromeProvider");
    expect(dashboardShellSwitcherSource).toContain("MonolithAppShell");
    expect(mainShellSource).toContain("pl-0");
    expect(mainShellSource).toContain("lg:pl-[var(--sidebar-width)]");
    expect(sidebarSource).toContain('role="dialog"');
    expect(sidebarSource).toContain('aria-modal="true"');
    expect(sidebarSource).toContain("Close navigation menu");
    expect(welcomeBarSource).toContain("aria-controls={mobileNavId}");
    expect(welcomeBarSource).toContain("aria-expanded={mobileNavOpen}");
  });

  it("opts only verified routes into the Monolith shell", () => {
    const dashboardShellSwitcherSource = readFileSync(
      join(
        repoRoot,
        "src/app/(dashboard)/_components/dashboard-shell-switcher.tsx",
      ),
      "utf8",
    );

    expect(dashboardShellSwitcherSource).toContain("MONOLITH_MIGRATED_ROUTES");
    expect(dashboardShellSwitcherSource).toContain('"/dashboard"');
    expect(dashboardShellSwitcherSource).toContain('"/account/security"');
    expect(dashboardShellSwitcherSource).toContain('"/notifications"');
    expect(dashboardShellSwitcherSource).toContain('"/product-catalogue"');
    expect(dashboardShellSwitcherSource).toContain('"/todo"');
    expect(dashboardShellSwitcherSource).toContain(
      'normalizedPathname === "/hrms"',
    );
    expect(dashboardShellSwitcherSource).toContain(
      'normalizedPathname.startsWith("/hrms/")',
    );
    expect(dashboardShellSwitcherSource).toContain(
      'normalizedPathname === "/attendance"',
    );
    expect(dashboardShellSwitcherSource).toContain(
      'normalizedPathname.startsWith("/attendance/")',
    );
    expect(dashboardShellSwitcherSource).toContain(
      'normalizedPathname === "/ams"',
    );
    expect(dashboardShellSwitcherSource).toContain(
      'normalizedPathname.startsWith("/ams/")',
    );
    expect(dashboardShellSwitcherSource).toContain(
      'normalizedPathname === "/lms"',
    );
    expect(dashboardShellSwitcherSource).toContain(
      'normalizedPathname.startsWith("/lms/")',
    );
    expect(dashboardShellSwitcherSource).toContain("usesMonolithShell");
  });

  it("keeps every Monolith workspace submenu interactive and accessible", () => {
    const appShellSource = readFileSync(
      join(repoRoot, "src/components/monolith/app-shell.tsx"),
      "utf8",
    );
    const systemStyles = readFileSync(
      join(repoRoot, "src/styles/monolith-system.css"),
      "utf8",
    );

    expect(appShellSource).toContain("expandedSections");
    expect(appShellSource).toContain("getActiveItemHref");
    expect(appShellSource).toContain("aria-expanded={isExpanded}");
    expect(appShellSource).toContain(
      "aria-controls={`mnx-sidebar-items-${section.id}`}",
    );
    expect(appShellSource).toContain("section.items.map((item)");
    expect(appShellSource).toContain("hidden={!isExpanded}");
    expect(appShellSource).toContain('role="group"');
    expect(systemStyles).toContain(".mnx-sidebar-subnav[hidden]");
    expect(systemStyles).toContain(".mnx-sidebar-section.is-expanded");
  });
});
