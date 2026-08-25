"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PAYROLL_SECTION_TABS } from "@/modules/payroll/constants";

function matchSection(pathname: string) {
  const sections = Object.keys(PAYROLL_SECTION_TABS);
  return sections.find(
    (section) =>
      pathname === section ||
      PAYROLL_SECTION_TABS[section].some(
        (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`),
      ),
  );
}

export function PayrollSectionTabs() {
  const pathname = usePathname();
  const section = matchSection(pathname);
  if (!section) return null;

  const tabs = PAYROLL_SECTION_TABS[section];
  // Nested hrefs (e.g. "/payroll/pay-runs" is a prefix of
  // "/payroll/pay-runs/history") would otherwise light up multiple tabs at
  // once — pick the single longest-matching href as the active one.
  const activeHref = tabs
    .filter((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav
      aria-label="Payroll section tabs"
      className="flex flex-wrap items-center gap-1 border-b border-[var(--mnx-border)] px-1"
    >
      {tabs.map((tab) => {
        const active = tab.href === activeHref;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-[var(--mnx-accent-strong)] text-[var(--mnx-accent-strong)]"
                : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
