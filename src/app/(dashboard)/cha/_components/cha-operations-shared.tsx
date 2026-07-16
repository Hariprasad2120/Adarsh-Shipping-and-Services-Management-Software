import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AccentTone = "cyan" | "orange" | "green" | "violet";

function getAccentClasses(accent: AccentTone) {
  if (accent === "orange") {
    return {
      card: "card-top-accent-orange border-[#fb923c]/24 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,248,241,0.96))] dark:bg-[linear-gradient(180deg,rgba(23,30,37,0.98),rgba(31,24,19,0.96))]",
      icon: "bg-[linear-gradient(135deg,rgba(251,146,60,0.18),rgba(255,214,170,0.08))] text-[#f28c2f]",
      glow: "rgba(251,146,60,0.16)",
    };
  }

  if (accent === "green") {
    return {
      card: "border-[#22c55e]/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,255,248,0.96))] dark:bg-[linear-gradient(180deg,rgba(23,30,37,0.98),rgba(20,31,27,0.96))]",
      icon: "bg-[linear-gradient(135deg,rgba(34,197,94,0.16),rgba(134,239,172,0.08))] text-[#1b9b5b]",
      glow: "rgba(34,197,94,0.16)",
    };
  }

  if (accent === "violet") {
    return {
      card: "border-[#6366f1]/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,245,255,0.96))] dark:bg-[linear-gradient(180deg,rgba(23,30,37,0.98),rgba(27,27,41,0.96))]",
      icon: "bg-[linear-gradient(135deg,rgba(99,102,241,0.16),rgba(196,181,253,0.08))] text-[#5b53ea]",
      glow: "rgba(99,102,241,0.18)",
    };
  }

  return {
    card: "card-top-accent border-[#00cec4]/24 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,255,254,0.96))] dark:bg-[linear-gradient(180deg,rgba(23,30,37,0.98),rgba(18,32,35,0.96))]",
    icon: "bg-[linear-gradient(135deg,rgba(0,206,196,0.18),rgba(125,249,240,0.08))] text-[#00b8af]",
    glow: "rgba(0,206,196,0.18)",
  };
}

export function ChaMetricCard({
  title,
  value,
  note,
  icon,
  accent = "cyan",
}: {
  title: string;
  value: ReactNode;
  note: string;
  icon: ReactNode;
  accent?: AccentTone;
}) {
  const tone = getAccentClasses(accent);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[30px] border p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_-34px_rgba(15,23,42,0.22)]",
        tone.card,
      )}
    >
      <div className="pointer-events-none absolute inset-[1px] rounded-[29px] bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.08))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]" />
      <div
        className="pointer-events-none absolute right-[-16px] top-[-18px] h-28 w-28 rounded-full blur-3xl transition-transform duration-300 group-hover:scale-125"
        style={{ background: tone.glow }}
      />
      <div className="pointer-events-none absolute bottom-[-30px] left-6 h-24 w-36 rounded-full bg-white/25 blur-3xl dark:bg-white/[0.03]" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="ds-label text-on-surface-variant/80">{title}</p>
          <div className="text-[2rem] font-semibold tracking-[-0.04em] text-on-surface ds-numeric">{value}</div>
          <p className="max-w-[20ch] text-xs leading-5 text-on-surface-variant">{note}</p>
        </div>
        <span className={cn("flex size-12 items-center justify-center rounded-[18px] border border-white/30 shadow-[0_14px_28px_-20px_rgba(15,23,42,0.24)] dark:border-white/8", tone.icon)}>{icon}</span>
      </div>
    </div>
  );
}

export function ChaSectionShell({
  title,
  description,
  icon,
  badge,
  count,
  actions,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: string;
  count?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-outline-variant/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,251,253,0.97))] shadow-[0_24px_56px_-40px_rgba(15,23,42,0.18)] dark:bg-[linear-gradient(180deg,rgba(19,26,33,0.98),rgba(23,31,39,0.98))]">
      <div className="pointer-events-none absolute inset-[1px] rounded-[31px] bg-[linear-gradient(180deg,rgba(255,255,255,0.6),rgba(255,255,255,0.14))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]" />
      <div className="pointer-events-none absolute left-6 top-0 h-20 w-40 rounded-full bg-[#00cec4]/[0.12] blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-4 h-16 w-28 rounded-full bg-[#7dd3fc]/[0.12] blur-3xl dark:bg-[#38bdf8]/[0.1]" />
      <div className="relative border-b border-outline-variant/20 px-5 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            {icon ? <span className="ds-icon-badge border border-white/35 shadow-[0_14px_28px_-20px_rgba(15,23,42,0.22)] dark:border-white/8">{icon}</span> : null}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[1.55rem] font-semibold tracking-[-0.04em] text-on-surface">{title}</h2>
                {badge ? (
                  <span className="rounded-full border border-outline-variant/20 bg-white/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant backdrop-blur dark:bg-white/[0.04]">
                    {badge}
                  </span>
                ) : null}
                {count !== undefined ? (
                  <span className="rounded-full bg-[#00cec4]/12 px-2.5 py-1 text-[10px] font-bold text-[#00b8af] ds-numeric dark:text-[#63e3d7]">
                    {count}
                  </span>
                ) : null}
              </div>
              {description ? <p className="text-sm text-on-surface-variant">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

export function ChaVisibleRecords({
  visible,
  total,
  tone = "cyan",
}: {
  visible: number;
  total: number;
  tone?: "cyan" | "green";
}) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-outline-variant/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(245,248,251,0.88))] px-3.5 py-2.5 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.18)] backdrop-blur dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
      <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-white/45 bg-white/75 shadow-[0_12px_20px_-18px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-white/[0.03]">
        <span className={cn("ds-numeric text-sm", tone === "green" ? "text-green-600 dark:text-green-400" : "text-[#00b8af] dark:text-[#63e3d7]")}>
          {visible}
        </span>
      </div>
      <div>
        <p className="ds-label">Visible Records</p>
        <p className="ds-numeric text-sm text-on-surface">
          {visible} / {total}
        </p>
      </div>
    </div>
  );
}
