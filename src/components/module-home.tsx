import Link from "next/link";
import type { CarbonIconType } from "@carbon/icons-react";
import {
  AlarmClockCheck,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  LayoutGrid,
  UsersRound,
} from "lucide-react";

type ModuleStat = {
  label: string;
  value: string;
  tone?: "teal" | "blue" | "amber" | "slate";
};

type ModuleQuickLink = {
  href: string;
  label: string;
  description: string;
  icon: any;
};

const STAT_STYLES: Record<NonNullable<ModuleStat["tone"]>, string> = {
  teal: "border-t-[#00cec4]",
  blue: "border-t-[#00cec4]",
  amber: "border-t-amber-400",
  slate: "border-t-[#00cec4]",
};

function getStatIcon(label: string, tone: ModuleStat["tone"]) {
  const normalized = label.toLowerCase();
  const iconClassName = tone === "amber" ? "text-amber-600" : "text-[#00cec4]";

  if (normalized.includes("due") || normalized.includes("deadline")) {
    return <CalendarDays className={`size-5 ${iconClassName}`} strokeWidth={1.9} />;
  }

  if (normalized.includes("cycle") || normalized.includes("month")) {
    return <AlarmClockCheck className={`size-5 ${iconClassName}`} strokeWidth={1.9} />;
  }

  if (normalized.includes("availability") || normalized.includes("employee") || normalized.includes("role")) {
    return <UsersRound className={`size-5 ${iconClassName}`} strokeWidth={1.9} />;
  }

  return <CircleAlert className={`size-5 ${iconClassName}`} strokeWidth={1.9} />;
}

export function ModuleHome({
  title,
  description,
  stats,
  quickLinks,
  pageIcon: PageIcon = LayoutGrid,
}: {
  title: string;
  description: string;
  stats: ModuleStat[];
  quickLinks: ModuleQuickLink[];
  pageIcon?: any;
}) {
  void description;

  return (
    <div className="space-y-6 font-sans">
      <section className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
          <PageIcon size={20} />
        </div>
        <div className="min-w-0 self-center">
          <h1 className="ds-h1 heading-icon-none leading-tight text-primary">
            {title}
          </h1>
        </div>
      </section>

      {stats.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <article
              key={stat.label}
              className={`group relative overflow-hidden rounded-[24px] border border-outline-variant/20 border-t-[3px] bg-white p-5 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.24)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(0,206,196,0.28)] dark:bg-surface dark:shadow-ambient dark:hover:shadow-ambient-hover [animation:fade-in-up_0.5s_cubic-bezier(0.22,1,0.36,1)_both] ${STAT_STYLES[stat.tone ?? "slate"]}`}
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <div className="absolute inset-x-0 top-0 h-14 bg-[linear-gradient(180deg,rgba(0,206,196,0.06),transparent)] dark:bg-[linear-gradient(180deg,rgba(0,206,196,0.08),transparent)]" />
              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00cec4]/10 transition duration-300 group-hover:scale-105 group-hover:bg-[#00cec4]/14">
                    {getStatIcon(stat.label, stat.tone)}
                  </div>
                  <ArrowUpRight className="size-4 text-slate-300 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#00cec4] dark:text-outline" />
                </div>

                <div className="mt-6">
                  <p className="text-[2.35rem] font-extralight leading-none tracking-[-0.04em] text-slate-900 dark:text-on-surface">
                    {stat.value}
                  </p>
                  <p className="mt-1.5 text-[14px] font-normal text-slate-500 dark:text-on-surface-variant">
                    {stat.label}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {quickLinks.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="ds-h2 inline-flex items-center gap-2 text-primary">
              <ArrowUpRight className="size-4 text-[#00cec4]" />
              Quick actions
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">Jump into the core tasks for this module.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {quickLinks.map((item, index) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-[24px] border border-outline-variant/20 bg-white p-5 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.24)] transition duration-300 hover:-translate-y-1 hover:border-[#00cec4]/30 hover:shadow-[0_20px_40px_-24px_rgba(0,206,196,0.28)] dark:bg-surface dark:hover:border-primary/40 dark:hover:shadow-ambient-hover [animation:fade-in-up_0.5s_cubic-bezier(0.22,1,0.36,1)_both]"
                  style={{ animationDelay: `${160 + index * 75}ms` }}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4] transition duration-300 group-hover:scale-105 group-hover:bg-[#00cec4]/14">
                      <Icon size={18} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="size-4 shrink-0 text-[#00cec4]" />
                        <h3 className="ds-h3 text-primary">{item.label}</h3>
                      </div>

                      <p className="mt-1.5 text-sm leading-6 text-on-surface-variant">{item.description}</p>

                      <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.1rem] text-[#00cec4] transition duration-300 group-hover:gap-3 group-hover:text-[#00b8af] dark:group-hover:text-[#00cec4]">
                        Open module
                        <ArrowRight className="size-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
