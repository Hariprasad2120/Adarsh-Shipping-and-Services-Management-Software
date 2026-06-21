import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loadCaps } from "@/lib/rbac";
import { Search, UserAvatar, Analytics, Settings } from "@carbon/icons-react";

export default async function RecruitLandingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const caps = await loadCaps(session.user.id);
  const canEmployer = !!caps["recruit.view"];
  const canJobSeeker = !!caps["recruit.jobseeker.use"];

  const workspaces = [
    {
      key: "employer",
      title: "Employer Workspace",
      description:
        "Post jobs, track candidates, manage applications, run screenings, schedule interviews, issue offers, and automate hiring workflows.",
      href: "/hrms/recruit/employer",
      icon: Analytics,
      accent: "#00cec4",
      accentBg: "bg-[#00cec4]/10",
      accentText: "text-[#00cec4]",
      accentBorder: "border-[#00cec4]/20",
      enabled: canEmployer,
      links: [
        { label: "Job Openings", href: "/hrms/recruit/employer/jobs" },
        { label: "Candidates", href: "/hrms/recruit/employer/candidates" },
        { label: "Applications", href: "/hrms/recruit/employer/applications" },
      ],
    },
    {
      key: "jobseeker",
      title: "Career Workspace",
      description:
        "Private career profile, job search, resume optimiser, cover letter builder, application tracker, alerts, and AI interview prep. Completely private from your employer.",
      href: "/hrms/recruit/career",
      icon: UserAvatar,
      accent: "#818cf8",
      accentBg: "bg-[#818cf8]/10",
      accentText: "text-[#818cf8]",
      accentBorder: "border-[#818cf8]/20",
      enabled: canJobSeeker,
      links: [
        { label: "Job Search", href: "/hrms/recruit/career/jobs" },
        { label: "My Applications", href: "/hrms/recruit/career/applications" },
        { label: "My Resumes", href: "/hrms/recruit/career/resumes" },
      ],
    },
  ].filter((w) => w.enabled);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="ds-h1 text-on-surface">Recruit</h1>
        <p className="text-sm text-on-surface-variant">
          Hiring and career management — two private workspaces, zero cross-contamination.
        </p>
      </div>

      {workspaces.length === 0 && (
        <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center text-on-surface-variant">
          No Recruit workspaces available. Contact your administrator.
        </div>
      )}

      {/* Workspace Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {workspaces.map((ws) => {
          const Icon = ws.icon;
          return (
            <Link
              key={ws.key}
              href={ws.href}
              className={`group flex flex-col gap-5 rounded-2xl border bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${ws.accentBorder}`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${ws.accentBg}`}>
                  <Icon size={22} className={ws.accentText} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-on-surface">{ws.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{ws.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {ws.links.map((l) => (
                  <span
                    key={l.href}
                    className={`rounded-lg px-3 py-1 text-xs font-medium ${ws.accentBg} ${ws.accentText}`}
                  >
                    {l.label}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Admin links */}
      {!!caps["recruit.settings.manage"] && (
        <div className="flex gap-3">
          <Link
            href="/hrms/recruit/settings"
            className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm text-on-surface-variant transition hover:text-on-surface"
          >
            <Settings size={16} />
            Recruit Settings
          </Link>
          <Link
            href="/hrms/recruit/audit"
            className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm text-on-surface-variant transition hover:text-on-surface"
          >
            <Search size={16} />
            Audit Log
          </Link>
        </div>
      )}
    </div>
  );
}
