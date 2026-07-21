import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AccentTone = "cyan" | "orange" | "green" | "violet" | "blue";

export function getAccentTheme(accent: AccentTone) {
  if (accent === "orange") {
    return {
      border: "border-orange-500/20 dark:border-orange-400/20",
      glow: "rgba(251,146,60,0.15)",
      panelGlow: "bg-orange-500/5 dark:bg-orange-400/5",
      icon: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      count: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    };
  }

  if (accent === "green") {
    return {
      border: "border-emerald-500/20 dark:border-emerald-400/20",
      glow: "rgba(16,185,129,0.15)",
      panelGlow: "bg-emerald-500/5 dark:bg-emerald-400/5",
      icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      count: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    };
  }

  if (accent === "violet") {
    return {
      border: "border-violet-500/20 dark:border-violet-400/20",
      glow: "rgba(139,92,246,0.15)",
      panelGlow: "bg-violet-500/5 dark:bg-violet-400/5",
      icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
      badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
      count: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    };
  }

  // default / cyan / blue mapping to new premium royal-blue logistics theme
  return {
    border: "border-cha-border dark:border-cha-border-strong",
    glow: "var(--cha-primary-ring)",
    panelGlow: "bg-cha-primary-soft",
    icon: "bg-cha-primary-soft text-cha-primary",
    badge: "bg-cha-primary-soft text-cha-primary border border-cha-primary-border",
    count: "bg-cha-primary-muted text-cha-primary",
  };
}

export function CargoShipGraphic() {
  return (
    <svg
      className="pointer-events-none absolute right-6 bottom-0 hidden h-16 w-auto text-[#00cec4] opacity-15 dark:opacity-10 md:block"
      viewBox="0 0 400 100"
      fill="currentColor"
    >
      {/* Sea Line */}
      <line x1="0" y1="95" x2="400" y2="95" stroke="currentColor" strokeWidth="2" />
      {/* Cargo Ship */}
      <path d="M 50 85 L 70 95 L 330 95 L 350 80 L 340 70 L 60 70 Z" />
      {/* Ship superstructure */}
      <rect x="290" y="45" width="40" height="25" />
      <rect x="305" y="30" width="15" height="15" />
      <line x1="312" y1="30" x2="312" y2="15" stroke="currentColor" strokeWidth="2" />
      {/* Containers */}
      <rect x="80" y="55" width="25" height="15" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="106" y="55" width="25" height="15" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="132" y="55" width="25" height="15" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="158" y="55" width="25" height="15" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="184" y="55" width="25" height="15" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="210" y="55" width="25" height="15" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="236" y="55" width="25" height="15" stroke="currentColor" strokeWidth="1" fill="none" />

      <rect x="93" y="40" width="25" height="15" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="119" y="40" width="25" height="15" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="145" y="40" width="25" height="15" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="171" y="40" width="25" height="15" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="197" y="40" width="25" height="15" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="223" y="40" width="25" height="15" stroke="currentColor" strokeWidth="1" fill="none" />

      <rect x="132" y="25" width="25" height="15" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="158" y="25" width="25" height="15" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="184" y="25" width="25" height="15" stroke="currentColor" strokeWidth="1" fill="none" />
      
      {/* Gantry crane in distance */}
      <path d="M 15 95 L 30 60 L 45 95 M 25 65 L 105 65 L 105 75" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
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
    <section className="relative overflow-hidden rounded-xl border border-outline-variant/40 bg-surface p-6 shadow-sm">
      <CargoShipGraphic />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          {eyebrow && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#00cec4]">
              {eyebrow}
            </div>
          )}
          <div className="flex items-start gap-4">
            {icon && (
              <span className="ds-icon-badge size-12">
                {icon}
              </span>
            )}
            <div className="space-y-1">
              <h1 className="text-2xl font-medium uppercase leading-none tracking-[0.075em] text-on-surface">
                {title}
              </h1>
              {description && <p className="max-w-2xl text-sm text-on-surface-variant">{description}</p>}
            </div>
          </div>
        </div>
        {actions && <div className="relative z-10 flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </section>
  );
}

export function ChaMetricCard({
  title,
  value,
  note,
  icon,
  accent = "blue",
}: {
  title: string;
  value: ReactNode;
  note?: string;
  icon: ReactNode;
  accent?: AccentTone;
}) {
  const tone = getAccentTheme(accent);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-cha-surface p-5 shadow-sm transition-all duration-300 hover:shadow-md",
        tone.border,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full blur-2xl opacity-60 transition-transform duration-300 group-hover:scale-125",
          tone.panelGlow,
        )}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p
            className="text-[11px] font-medium uppercase leading-none tracking-[0.08em] text-on-surface-variant"
          >
            {title}
          </p>
          <div className="ds-numeric text-3xl tracking-tight text-cha-text-primary">{value}</div>
          {note && <p className="text-xs text-cha-text-muted">{note}</p>}
        </div>
        <span className={cn("flex size-10 items-center justify-center rounded-xl", tone.icon)}>
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
  contentClassName,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  contentClassName?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-cha-border bg-cha-surface shadow-sm dark:border-cha-border-strong">
      <div className="relative px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <span className="flex size-9 items-center justify-center rounded-lg bg-cha-primary-soft text-cha-primary">
                {icon}
              </span>
            )}
            <div className="space-y-0.5">
              <h2 className="text-lg font-medium uppercase leading-none tracking-[0.075em] text-on-surface">
                {title}
              </h2>
              {description && <p className="text-xs text-cha-text-muted">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        <div className="pointer-events-none absolute inset-x-5 bottom-0 border-b border-outline-variant/60 dark:border-outline-variant" />
      </div>
      {children ? <div className={cn("relative bg-cha-surface-subtle p-5", contentClassName)}>{children}</div> : null}
    </section>
  );
}

export function ChaSectionShell({
  title,
  description,
  icon,
  badge,
  actions,
  children,
  accent = "blue",
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
    <section className={cn("relative overflow-hidden rounded-2xl border bg-cha-surface shadow-sm", tone.border)}>
      <div className="relative px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <span className={cn("flex size-9 items-center justify-center rounded-lg", tone.icon)}>
                {icon}
              </span>
            )}
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-medium uppercase leading-none tracking-[0.075em] text-on-surface">
                  {title}
                </h2>
                {badge && (
                  <span className={cn("rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider", tone.badge)}>
                    {badge}
                  </span>
                )}
              </div>
              {description && <p className="text-xs text-cha-text-muted">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        <div className="pointer-events-none absolute inset-x-5 bottom-0 border-b border-outline-variant/60 dark:border-outline-variant" />
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

export function ChaVisibleRecords({
  visible,
  total,
  tone = "blue",
}: {
  visible: number;
  total: number;
  tone?: AccentTone;
}) {
  const theme = getAccentTheme(tone);

  return (
    <div className="flex items-center gap-3 px-3 py-2 text-xs">
      <div className="grid h-9 w-9 place-items-center rounded-lg border border-cha-border bg-cha-surface shadow-sm dark:border-cha-border-strong">
        <span className={cn("ds-numeric leading-none", theme.count)}>{visible}</span>
      </div>
      <div>
        <p className="text-[9px] uppercase tracking-wider text-cha-text-muted">Visible Records</p>
        <p className="ds-numeric text-cha-text-primary">
          {visible} / {total}
        </p>
      </div>
    </div>
  );
}
