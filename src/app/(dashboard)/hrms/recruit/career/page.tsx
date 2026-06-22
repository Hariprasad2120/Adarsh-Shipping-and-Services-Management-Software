import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { getJobSeekerDashboardCounts } from "@/modules/recruit/jobseeker-service";
import { notFound } from "next/navigation";
import { Search, Task, UserAvatar, Notification, ArrowRight } from "@carbon/icons-react";

export default async function CareerDashboardPage() {
  if (!isRecruitEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "recruit.jobseeker.use");

  const counts = await getJobSeekerDashboardCounts(session.user.id);

  const totalApps = Object.values(counts.applicationsByStatus).reduce((a, b) => a + b, 0);

  const stats = [
    {
      label: "New Matching Jobs",
      value: counts.newMatchingJobs,
      icon: Search,
      href: "/hrms/recruit/career/jobs",
      iconBg: "bg-[#818cf8]/10",
      iconColor: "text-[#818cf8]",
    },
    {
      label: "Applications Sent",
      value: totalApps,
      icon: Task,
      href: "/hrms/recruit/career/applications",
      iconBg: "bg-[#00cec4]/10",
      iconColor: "text-[#00cec4]",
    },
    {
      label: "Saved Jobs",
      value: counts.savedJobs,
      icon: Notification,
      href: "/hrms/recruit/career/jobs",
      iconBg: "bg-[#fbbf24]/10",
      iconColor: "text-[#fbbf24]",
    },
    {
      label: "Tailored Resumes (7d)",
      value: counts.recentTailoredResumes,
      icon: UserAvatar,
      href: "/hrms/recruit/career/resumes",
      iconBg: "bg-[#22c55e]/10",
      iconColor: "text-[#22c55e]",
    },
  ];

  const sections = [
    { label: "Job Search", href: "/hrms/recruit/career/jobs", desc: "Browse matched and discovered job listings." },
    { label: "My Applications", href: "/hrms/recruit/career/applications", desc: "Track all jobs you have applied for." },
    { label: "My Resumes", href: "/hrms/recruit/career/resumes", desc: "Manage base and tailored resume versions." },
    { label: "Career Profile", href: "/hrms/recruit/career/profile", desc: "Update preferences, skills, and job search settings." },
    { label: "Career Assistant", href: "/hrms/recruit/career/assistant", desc: "AI-powered career advice, completely private." },
    { label: "Interview Prep", href: "/hrms/recruit/career/interview-prep", desc: "Practice answers and prepare for upcoming interviews." },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="ds-h1 text-on-surface">Career Workspace</h1>
        <p className="text-sm text-on-surface-variant">
          Your private career hub — completely isolated from your employer view.
        </p>
      </div>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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

      {/* Privacy Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-[#818cf8]/20 bg-[#818cf8]/5 p-4">
        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#818cf8]/20 text-[10px] font-bold text-[#818cf8]">
          ⚑
        </span>
        <p className="text-sm text-on-surface-variant">
          Everything in this workspace is{" "}
          <span className="font-medium text-on-surface">completely private</span>. Your employer cannot see your
          job searches, saved jobs, applications, resumes, or career conversations.
        </p>
      </div>

      {/* Sections */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex flex-col gap-2 rounded-xl border border-outline-variant bg-surface p-4 transition hover:border-[#818cf8]/40 hover:shadow-sm"
          >
            <p className="text-sm font-medium text-on-surface">{s.label}</p>
            <p className="text-xs leading-relaxed text-on-surface-variant">{s.desc}</p>
            <ArrowRight
              size={14}
              className="text-outline transition group-hover:translate-x-0.5 group-hover:text-[#818cf8]"
            />
          </Link>
        ))}
      </section>
    </div>
  );
}
