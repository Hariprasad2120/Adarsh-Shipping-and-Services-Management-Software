import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { getEmployerDashboardCounts } from "@/modules/recruit/employer-service";
import { notFound } from "next/navigation";
import { Analytics, UserMultiple, Task, Calendar, ArrowRight } from "@carbon/icons-react";

export default async function EmployerDashboardPage() {
  if (!isRecruitEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "recruit.view");

  const counts = await getEmployerDashboardCounts(session.user.orgId!);

  const totalApplications = Object.values(counts.applicationsByStage).reduce((a, b) => a + b, 0);

  const stats = [
    {
      label: "Active Openings",
      value: counts.activeOpenings,
      icon: Analytics,
      href: "/hrms/recruit/employer/jobs",
      accentClass: "monolith-card monolith-accent",
      iconBg: "bg-[#F9D972]/10",
      iconColor: "text-[#F9D972]",
    },
    {
      label: "New Candidates (7d)",
      value: counts.newCandidates,
      icon: UserMultiple,
      href: "/hrms/recruit/employer/candidates",
      accentClass: "monolith-card monolith-accent-warning",
      iconBg: "bg-[#D88700]/10",
      iconColor: "text-[#D88700]",
    },
    {
      label: "Applications",
      value: totalApplications,
      icon: Task,
      href: "/hrms/recruit/employer/applications",
      accentClass: "monolith-card monolith-accent",
      iconBg: "bg-[#F9D972]/10",
      iconColor: "text-[#F9D972]",
    },
    {
      label: "Offers Pending Approval",
      value: counts.offersAwaitingApproval,
      icon: Calendar,
      href: "/hrms/recruit/employer/applications",
      accentClass: "monolith-card monolith-accent-warning",
      iconBg: "bg-[#D88700]/10",
      iconColor: "text-[#D88700]",
    },
  ];

  const quickLinks = [
    { label: "Post a Job", href: "/hrms/recruit/employer/jobs/new" },
    { label: "Add Candidate", href: "/hrms/recruit/employer/candidates/new" },
    { label: "Pipeline View", href: "/hrms/recruit/employer/applications" },
    { label: "Open Jobs", href: "/hrms/recruit/employer/jobs" },
    { label: "Candidate Pool", href: "/hrms/recruit/employer/candidates" },
    { label: "Recruit Home", href: "/hrms/recruit" },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="monolith-h1 text-mono-text">Employer Workspace</h1>
        <p className="text-sm text-mono-muted">Hiring pipeline overview</p>
      </div>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={`${stat.accentClass} group flex flex-col gap-3 rounded-xl border border-mono-border bg-mono-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconBg}`}>
                <Icon size={20} className={stat.iconColor} />
              </div>
              <div>
                <p className="monolith-numeric text-3xl font-light text-mono-text">{stat.value}</p>
                <p className="mt-0.5 text-sm text-mono-muted">{stat.label}</p>
              </div>
            </Link>
          );
        })}
      </section>

      {/* Quick Links */}
      <section className="space-y-3">
        <h2 className="monolith-h3 text-mono-text">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between rounded-xl border border-mono-border bg-mono-card px-4 py-3 text-sm text-mono-text transition hover:border-[#F9D972]/40 hover:shadow-sm"
            >
              <span>{link.label}</span>
              <ArrowRight
                size={16}
                className="text-outline transition group-hover:translate-x-0.5 group-hover:text-[#F9D972]"
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
