import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AccentTone = "cyan" | "orange" | "green" | "violet";

function getAccentTheme(accent: AccentTone) {
  if (accent === "orange") {
    return {
      border: "border-[#fb923c]/25",
      glow: "rgba(251,146,60,0.18)",
      panelGlow: "bg-[#fb923c]/10",
      icon: "bg-[#fb923c]/12 text-[#fb923c]",
      badge: "bg-[#fb923c]/12 text-[#fb923c]",
      count: "bg-[#fb923c]/12 text-[#fb923c]",
    };
  }

  if (accent === "green") {
    return {
      border: "border-emerald-500/25",
      glow: "rgba(16,185,129,0.18)",
      panelGlow: "bg-emerald-500/10",
      icon: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
      badge: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
      count: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    };
  }

  if (accent === "violet") {
    return {
      border: "border-violet-500/25",
      glow: "rgba(139,92,246,0.18)",
      panelGlow: "bg-violet-500/10",
      icon: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
      badge: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
      count: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
    };
  }

  return {
    border: "border-[#2563eb]/25",
    glow: "rgba(37,99,235,0.18)",
    panelGlow: "bg-[#2563eb]/10",
    icon: "bg-[#2563eb]/12 text-[#2563eb] dark:text-[#7aa2ff]",
    badge: "bg-[#2563eb]/12 text-[#2563eb] dark:text-[#7aa2ff]",
    count: "bg-[#2563eb]/12 text-[#2563eb] dark:text-[#7aa2ff]",
  };
}

export function ChaPageHeader({
  eyebrow,
  title,
  description,
  icon,
  actions,
}: {
  eyebrow: ReactNode;
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-[#2563eb]/20 bg-surface shadow-[0_24px_56px_-40px_rgba(15,23,42,0.24)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_28%),radial-gradient(circle_at_78%_24%,rgba(56,189,248,0.14),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,247,255,0.96))] dark:bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_30%),radial-gradient(circle_at_78%_24%,rgba(56,189,248,0.18),transparent_24%),linear-gradient(180deg,rgba(18,24,36,0.98),rgba(14,20,31,0.98))]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(37,99,235,0.35),transparent)]" />
      <div className="relative flex flex-col gap-5 px-6 py-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            {eyebrow}
          </div>
          <div className="flex items-start gap-4">
            {icon ? (
              <span className="flex size-14 items-center justify-center rounded-[20px] border border-[#2563eb]/18 bg-[#2563eb]/10 text-[#2563eb] shadow-[0_18px_36px_-26px_rgba(37,99,235,0.45)] dark:text-[#7aa2ff]">
                {icon}
              </span>
            ) : null}
            <div className="space-y-1.5">
              <h1 className="ds-h1 text-on-surface">{title}</h1>
              {description ? <p className="max-w-3xl text-sm text-on-surface-variant">{description}</p> : null}
            </div>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
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
  const tone = getAccentTheme(accent);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[28px] border bg-surface p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-34px_rgba(15,23,42,0.24)]",
        tone.border,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),transparent_45%)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent_42%)]" />
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full blur-3xl transition-transform duration-300 group-hover:scale-125",
          tone.panelGlow,
        )}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="ds-label text-on-surface-variant/85">{title}</p>
          <div className="ds-numeric text-[2rem] font-semibold tracking-[-0.04em] text-on-surface">{value}</div>
          <p className="max-w-[22ch] text-xs leading-5 text-on-surface-variant">{note}</p>
        </div>
        <span className={cn("flex size-12 items-center justify-center rounded-[18px] border border-white/30 shadow-[0_14px_28px_-20px_rgba(15,23,42,0.24)] dark:border-white/10", tone.icon)}>
          {icon}
        </span>
      </div>
    </div>
  );
}

export function ChaControlPanel({
  title,
  description,
  icon,
  children,
  actions,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-[#2563eb]/18 bg-surface shadow-[0_28px_72px_-48px_rgba(15,23,42,0.28)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,255,0.98))] dark:bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_32%),linear-gradient(180deg,rgba(18,24,36,0.98),rgba(14,20,31,0.98))]" />
      <div className="relative border-b border-[#2563eb]/12 px-5 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            {icon ? (
              <span className="flex size-11 items-center justify-center rounded-[18px] border border-[#2563eb]/18 bg-[#2563eb]/10 text-[#2563eb] dark:text-[#7aa2ff]">
                {icon}
              </span>
            ) : null}
            <div className="space-y-1">
              <h2 className="ds-h2 text-on-surface">{title}</h2>
              {description ? <p className="text-sm text-on-surface-variant">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
      <div className="relative p-5">{children}</div>
    </section>
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
  accent = "cyan",
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: string;
  count?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  accent?: AccentTone;
}) {
  const tone = getAccentTheme(accent);

  return (
    <section className={cn("relative overflow-hidden rounded-[32px] border bg-surface shadow-[0_24px_56px_-40px_rgba(15,23,42,0.22)]", tone.border)}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,248,255,0.97))] dark:bg-[linear-gradient(180deg,rgba(18,24,36,0.98),rgba(14,20,31,0.98))]" />
      <div
        className="pointer-events-none absolute left-6 top-0 h-24 w-44 rounded-full blur-3xl"
        style={{ background: tone.glow }}
      />
      <div className="relative border-b border-outline-variant/16 px-5 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            {icon ? (
              <span className={cn("flex size-11 items-center justify-center rounded-[18px] border border-white/35 shadow-[0_14px_28px_-20px_rgba(15,23,42,0.22)] dark:border-white/10", tone.icon)}>
                {icon}
              </span>
            ) : null}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="ds-h2 text-on-surface">{title}</h2>
                {badge ? (
                  <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", tone.badge)}>
                    {badge}
                  </span>
                ) : null}
                {count !== undefined ? (
                  <span className={cn("ds-numeric rounded-full px-2.5 py-1 text-[10px] font-bold", tone.count)}>
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
  const theme = getAccentTheme(tone);

  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-outline-variant/16 bg-surface-container-low/55 px-3.5 py-2.5 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.18)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-white/40 bg-surface shadow-[0_12px_20px_-18px_rgba(15,23,42,0.2)] dark:border-white/10">
        <span className={cn("ds-numeric text-sm", theme.count)}>{visible}</span>
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
