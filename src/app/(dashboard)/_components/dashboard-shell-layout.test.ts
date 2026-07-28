import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function cssBlock(source: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  expect(match, `Expected ${selector} block to exist`).not.toBeNull();
  return match?.[1] ?? "";
}

function mediaBlock(source: string, query: string) {
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const startMatch = new RegExp(`@media\\s*\\(${escapedQuery}\\)\\s*\\{`).exec(source);
  expect(startMatch, `Expected @media (${query}) block to exist`).not.toBeNull();
  if (!startMatch) return "";

  let depth = 0;
  for (let index = startMatch.index; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startMatch.index, index + 1);
      }
    }
  }

  throw new Error(`Could not read @media (${query}) block`);
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

  it("uses the shared Inter font stack without route-level font loaders", () => {
    const rootLayoutSource = readSource("src/app/layout.tsx");
    const globalStyles = readSource("src/app/globals.css");
    const foundationStyles = readSource("src/styles/monolith-foundation.css");

    expect(rootLayoutSource).not.toContain(["next", "font"].join("/"));
    expect(rootLayoutSource).not.toContain(["font", "geist"].join("-"));
    expect(globalStyles).toContain('--font-sans: Inter, "Segoe UI", Arial, sans-serif');
    expect(globalStyles).toContain('--font-mono: Inter, "Segoe UI", Arial, sans-serif');
    expect(globalStyles).toContain('@import "./../styles/monolith-foundation.css"');
    expect(foundationStyles).toContain('--mnx-font-sans: Inter, "Segoe UI", Arial, sans-serif');
    expect(foundationStyles).toContain('--mnx-font-code: Inter, "Segoe UI", Arial, sans-serif');
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
    expect(shellSource).toContain('className="mnx-dashboard-content"');
    expect(shellSource).toContain('className="mnx-route-content"');
    expect(shellSource).not.toContain("<b>Dashboard</b>");
  });

  it("centers the dashboard content canvas inside the full-width scroll container", () => {
    const shellSource = readSource(
      "src/components/monolith/monolith-dashboard-shell.tsx",
    );
    const systemStyles = readSource("src/styles/monolith-system.css");
    const mainBlock = cssBlock(systemStyles, ".mnx-dashboard-main");
    const contentBlock = cssBlock(systemStyles, ".mnx-dashboard-content");
    const pageBlock = cssBlock(systemStyles, ".mnx-dashboard-page");
    const tabletMedia = mediaBlock(systemStyles, "max-width: 900px");
    const mobileMedia = mediaBlock(systemStyles, "max-width: 680px");

    expect(shellSource).toContain('<main className="mnx-dashboard-main">');
    expect(shellSource).toContain('<div className="mnx-dashboard-content">');

    expect(mainBlock).toContain("width: 100%");
    expect(mainBlock).toContain("max-width: none");
    expect(mainBlock).toContain("padding: 0");
    expect(mainBlock).toContain("overflow-y: auto");

    expect(contentBlock).toContain("width: min(1240px, 100%)");
    expect(contentBlock).toContain("margin: 0 auto");
    expect(contentBlock).toContain("padding: 34px 34px 80px");

    expect(pageBlock).toContain("width: 100%");
    expect(pageBlock).toContain("min-width: 0");
    expect(pageBlock).not.toContain("max-width");
    expect(pageBlock).not.toContain("margin-inline");

    expect(tabletMedia).toContain(".mnx-dashboard-content");
    expect(tabletMedia).toContain("padding: 24px 22px 64px");
    expect(tabletMedia).not.toMatch(/\.mnx-dashboard-main\s*\{[^}]*padding:/);

    expect(mobileMedia).toContain(".mnx-dashboard-content");
    expect(mobileMedia).toContain("padding: 16px 14px 52px");
    expect(mobileMedia).not.toMatch(/\.mnx-dashboard-main\s*\{[^}]*padding:/);
  });
});
