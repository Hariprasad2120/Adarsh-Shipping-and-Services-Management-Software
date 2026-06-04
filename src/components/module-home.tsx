import Link from "next/link";
import type { CarbonIconType } from "@carbon/icons-react";

type ModuleStat = {
  label: string;
  value: string;
  tone?: "teal" | "blue" | "amber" | "slate";
};

type ModuleQuickLink = {
  href: string;
  label: string;
  description: string;
  icon: CarbonIconType;
};

const STAT_STYLES: Record<NonNullable<ModuleStat["tone"]>, string> = {
  teal: "border-teal-100 bg-teal-50/70 text-teal-700",
  blue: "border-blue-100 bg-blue-50/70 text-blue-700",
  amber: "border-amber-100 bg-amber-50/70 text-amber-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

export function ModuleHome({
  title,
  description,
  stats,
  quickLinks,
}: {
  title: string;
  description: string;
  stats: ModuleStat[];
  quickLinks: ModuleQuickLink[];
}) {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-600">Module workspace</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>

      {stats.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <article
              key={stat.label}
              className={`rounded-2xl border p-5 shadow-sm ${STAT_STYLES[stat.tone ?? "slate"]}`}
            >
              <p className="text-xs font-medium uppercase tracking-[0.18em]">{stat.label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">{stat.value}</p>
            </article>
          ))}
        </section>
      )}

      {quickLinks.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
            <p className="mt-1 text-sm text-slate-500">Jump into the core tasks for this module.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-slate-900 p-3 text-white transition group-hover:bg-teal-600">
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">{item.label}</h3>
                        <span className="text-sm text-slate-400 transition group-hover:text-teal-600">→</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
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
