import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { WorkspacePageHeader } from "@/components/layout/workspace";
import { UserRound } from "lucide-react";

// Phase 36: Employee Portal — self-scoped to session.user.id. No new
// authentication; uses the existing Monolith session. These routes never
// accept an employeeId param — every query below is hard-scoped to "me".
//
// Deliberately NOT nested under /payroll — that route's layout enforces
// hrms.salary.read (an HR/admin-only permission), which would block every
// regular employee from their own self-service portal. This is its own
// top-level segment specifically so it inherits no admin permission gate.
export default async function MyPayrollLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const tabs = [
    { href: "/my-payroll", label: "Home" },
    { href: "/my-payroll/salary-details", label: "Salary Details" },
    { href: "/my-payroll/investments", label: "Investments" },
    { href: "/my-payroll/payslips", label: "Payslips" },
  ];

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Employee Portal"
        title="My Payroll"
        description="Your payroll information, only for you."
        icon={<UserRound aria-hidden="true" />}
      />
      <nav aria-label="My payroll sections" className="flex flex-wrap gap-2 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-2">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className="rounded-[var(--mn-radius-control)] px-3 py-2 text-sm font-medium text-[var(--mnx-muted)] hover:bg-[var(--mnx-surface)] hover:text-[var(--mnx-text)]">
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
