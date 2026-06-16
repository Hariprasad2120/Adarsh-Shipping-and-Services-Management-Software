import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BookOpen, GraduationCap, PlayCircle, ClipboardList, BarChart3, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function LMSPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const stats = [
    { label: "Total Courses", value: 0, icon: BookOpen, color: "text-[#818cf8]", bg: "bg-[#818cf8]/10" },
    { label: "My Learning", value: 0, icon: GraduationCap, color: "text-[#00c4b6]", bg: "bg-[#00c4b6]/10" },
    { label: "In Progress", value: 0, icon: PlayCircle, color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10" },
    { label: "Completed", value: 0, icon: ClipboardList, color: "text-[#34d399]", bg: "bg-[#34d399]/10" },
  ];

  const quickLinks = [
    { href: "/lms/courses", label: "Browse Courses", description: "Explore all available learning content.", icon: BookOpen },
    { href: "/lms/my-learning", label: "My Learning", description: "Track your enrolled courses and progress.", icon: GraduationCap },
    { href: "/lms/assignments", label: "Assignments", description: "View pending and completed assignments.", icon: ClipboardList },
    { href: "/lms/reports", label: "Reports", description: "Learning completion and compliance reports.", icon: BarChart3 },
  ];

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-outline-variant/20 bg-surface p-5 shadow-ambient">
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

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant">Quick Access</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex flex-col gap-3 rounded-2xl border border-outline-variant/20 bg-surface p-4 shadow-ambient transition hover:-translate-y-0.5 hover:border-[#818cf8]/30 hover:shadow-ambient-hover"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#818cf8]/10">
                  <Icon className="size-4 text-[#818cf8]" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-on-surface">{link.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">{link.description}</p>
                </div>
                <ArrowRight className="size-4 text-outline transition group-hover:translate-x-0.5 group-hover:text-[#818cf8]" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-outline-variant/20 bg-surface p-8 text-center shadow-ambient">
        <GraduationCap className="mx-auto size-10 text-on-surface-variant/40" strokeWidth={1.2} />
        <p className="mt-3 text-sm font-medium text-on-surface">LMS module coming soon</p>
        <p className="mt-1 text-xs text-on-surface-variant">
          Course management, assignments, and learning paths will be available here.
        </p>
      </section>
    </>
  );
}
