import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getVisibleSectionById } from "@/lib/navigation";
import { loadCaps } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { getOrg, getRoles } from "@/modules/core/organisation/service";
import { listUsersForDashboard } from "@/modules/core/user/service";
import { db } from "@/lib/db";
import {
  Users,
  Building2,
  Network,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  DataTableEmpty,
  AvatarCell,
} from "@/components/data-table";

export default async function HrmsDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orgId = session.user.orgId!;
  const caps = await loadCaps(session.user.id);

  // listUsersForDashboard fetches only the fields displayed on this page and
  // applies take:8 at the DB level — avoids loading all employees with all
  // relations just to slice the first 8.
  const [org, recentEmployees, roles, totalActiveCount] = await Promise.all([
    getOrg(orgId),
    listUsersForDashboard(orgId, { active: true, take: 8 }),
    getRoles(orgId),
    db.user.count({ where: { orgId, active: true } }),
  ]);
  const hrmsSection = getVisibleSectionById(caps, "hrms");
  const recruitSection = isRecruitEnabled() ? getVisibleSectionById(caps, "recruit") : null;

  const stats = [
    { label: "Active Employees", value: totalActiveCount, icon: Users, color: "text-[#00c4b6]", bg: "bg-[#00c4b6]/10" },
    { label: "Departments", value: org?.departments.length ?? 0, icon: Network, color: "text-[#818cf8]", bg: "bg-[#818cf8]/10" },
    { label: "Branches", value: org?.branches.length ?? 0, icon: Building2, color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10" },
    { label: "Roles", value: roles.length, icon: BarChart3, color: "text-[#34d399]", bg: "bg-[#34d399]/10" },
  ];

  const descriptionByLabel: Record<string, string> = {
    Employees: "Browse profiles, reporting lines, and contact details.",
    "Onboarding Checklists": "Track onboarding steps and completion status.",
    "Work Reports": "Review submitted work logs and daily progress.",
    "Task Checklists": "Manage recurring HR and employee task lists.",
    "Approvals Central": "Handle requests and approval workflows from one place.",
    "Travel & Expenses": "Manage travel requests, reimbursements, and approvals.",
    "HR Letters": "Generate and manage employee letters.",
    "Document Drive": "Open employee files and shared HR documents.",
    "Help Desk": "Handle internal support and HR help requests.",
    "Onboard Employee": "Add a new hire and complete their onboarding record.",
    Ownership: "Define team leads, managers, and reporting hierarchy.",
    "Salary Structure": "Build salary structures and update payroll metadata.",
    "Salary Revisions": "Track each employee's latest revision and history.",
    "Payroll Batches": "Run payroll batches and monitor payout prep.",
    Recruit: "Open hiring and career workflows for employer and employee workspaces.",
    "Employer Dashboard": "Track openings, candidates, applications, and hiring workflows.",
    "Career Dashboard": "Manage private career profile, resumes, and job applications.",
  };

  const quickActions = [
    ...(hrmsSection?.items ?? []).map((item) => ({
      href: item.href,
      label: item.label,
      description: descriptionByLabel[item.label] ?? "Open this HRMS workspace.",
    })),
    ...(recruitSection
      ? [
          {
            href: recruitSection.href,
            label: recruitSection.label,
            description:
              descriptionByLabel[recruitSection.label] ?? "Open this HRMS workspace.",
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-outline-variant/20 bg-surface p-5 shadow-ambient"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${stat.bg}`}>
                <Icon className={`size-5 ${stat.color}`} strokeWidth={1.8} />
              </div>
              <p className="mt-4 text-[2rem] font-extralight leading-none tracking-tight text-on-surface">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">{stat.label}</p>
            </div>
          );
        })}
      </section>

      {/* Quick Actions */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {quickActions.map((action) => {
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex flex-col gap-3 rounded-2xl border border-outline-variant/20 bg-surface p-4 shadow-ambient transition hover:-translate-y-0.5 hover:border-[#00c4b6]/30 hover:shadow-ambient-hover"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00c4b6]/10">
                  <ArrowRight className="size-4 text-[#00c4b6]" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-on-surface">{action.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">{action.description}</p>
                </div>
                <ArrowRight className="size-4 text-outline transition group-hover:translate-x-0.5 group-hover:text-[#00c4b6]" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent Employees */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant">Recent Employees</h2>
          <Link href="/hrms/employees" className="inline-flex items-center gap-1 text-xs font-medium text-[#00c4b6] hover:underline">
            View all <ArrowRight className="size-3" />
          </Link>
        </div>
        <DataTable>
          <DataTableHeader>
            <tr>
              <DataTableHead>Employee</DataTableHead>
              <DataTableHead>Employee #</DataTableHead>
              <DataTableHead>Department</DataTableHead>
              <DataTableHead>Branch</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {recentEmployees.length === 0 ? (
              <DataTableEmpty colSpan={4} message="No employees found. Onboard your first employee." />
            ) : (
              recentEmployees.map((emp) => (
                <DataTableRow key={emp.id}>
                  <DataTableCell>
                    <Link href={`/hrms/employees/${emp.id}`}>
                      <AvatarCell name={emp.name} secondary={emp.email} />
                    </Link>
                  </DataTableCell>
                  <DataTableCell className="text-on-surface-variant">
                    {emp.employeeNumber ? `#${emp.employeeNumber}` : "—"}
                  </DataTableCell>
                  <DataTableCell className="text-on-surface-variant">
                    {emp.department?.name ?? "—"}
                  </DataTableCell>
                  <DataTableCell className="text-on-surface-variant">
                    {emp.branch?.name ?? "—"}
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </section>
    </>
  );
}
