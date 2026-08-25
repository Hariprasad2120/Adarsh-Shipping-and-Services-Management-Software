"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function EmployeeTabNav({ employeeId }: { employeeId: string }) {
  const pathname = usePathname();
  const base = `/payroll/employees/${employeeId}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/salary-details`, label: "Salary Details" },
    { href: `${base}/investments`, label: "Investments" },
    { href: `${base}/payslips-and-forms`, label: "Payslips & Forms" },
    { href: `${base}/loans`, label: "Loans" },
  ];

  return (
    <nav aria-label="Employee payroll tabs" className="flex flex-wrap items-center gap-1 border-b border-[var(--mnx-border)] px-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
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
