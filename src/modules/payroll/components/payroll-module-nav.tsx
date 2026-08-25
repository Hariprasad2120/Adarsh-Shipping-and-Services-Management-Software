"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PAYROLL_ROUTE_ITEMS } from "@/modules/payroll/constants";

export function PayrollModuleNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Payroll sections"
      className="flex flex-wrap items-center gap-2 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-2"
    >
      {PAYROLL_ROUTE_ITEMS.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/payroll" && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-[var(--mn-radius-control)] px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--mnx-surface)] text-[var(--mnx-accent-strong)] shadow-sm"
                : "text-[var(--mnx-muted)] hover:bg-[var(--mnx-surface)] hover:text-[var(--mnx-text)]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
