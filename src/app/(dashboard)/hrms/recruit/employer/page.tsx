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
      accentClass: "card-top-accent",
      iconBg: "bg-[#00cec4]/10",
      iconColor: "text-[#00cec4]",
    },
    {
      label: "New Candidates (7d)",
      value: counts.newCandidates,
      icon: UserMultiple,
      href: "/hrms/recruit/employer/candidates",
      accentClass: "card-top-accent-orange",
      iconBg: "bg-[#fb923c]/10",
      iconColor: "text-[#fb923c]",
    },
    {
      label: "Applications",
      value: totalApplications,
      icon: Task,
      href: "/hrms/recruit/employer/applications",
      accentClass: "card-top-accent",
      iconBg: "bg-[#00cec4]/10",
      iconColor: "text-[#00cec4]",
    },
    {
      label: "Offers Pending Approval",
      value: counts.offersAwaitingApproval,
      icon: Calendar,
      href: "/hrms/recruit/employer/applications",
      accentClass: "card-top-accent-orange",
      iconBg: "bg-[#fb923c]/10",
      iconColor: "text-[#fb923c]",
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
        <h1 className="ds-h1 text-on-surface">Employer Workspace</h1>
        <p className="text-sm text-on-surface-variant">Hiring pipeline overview</p>
      </div>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={`${stat.accentClass} group flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconBg}`}>
                <Icon size={20} className={stat.iconColor} />
              </div>
              <div>
                <p className="ds-numeric text-3xl font-light text-on-surface">{stat.value}</p>
                <p className="mt-0.5 text-sm text-on-surface-variant">{stat.label}</p>
              </div>
            </Link>
          );
        })}
      </section>

      {/* Quick Links */}
      <section className="space-y-3">
        <h2 className="ds-h3 text-on-surface">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface transition hover:border-[#00cec4]/40 hover:shadow-sm"
            >
              <span>{link.label}</span>
              <ArrowRight
                size={16}
                className="text-outline transition group-hover:translate-x-0.5 group-hover:text-[#00cec4]"
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
