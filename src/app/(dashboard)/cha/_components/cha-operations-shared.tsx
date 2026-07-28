import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/monolith/badge";

export type AccentTone = "cyan" | "orange" | "green" | "violet" | "blue";

export function getAccentTheme(accent: AccentTone) {
  if (accent === "orange") {
    return {
      accent: "monolith-card monolith-accent-warning",
      icon: "monolith-icon-badge",
      badgeVariant: "warning" as const,
      count: "text-[#D88700]",
    };
  }

  return {
    accent: "monolith-card monolith-accent",
    icon: "monolith-icon-badge",
    badgeVariant: "default" as const,
    count: "text-[#F9D972]",
  };
}

export function CargoShipGraphic() {
  return (
    <svg
      className="pointer-events-none absolute right-6 bottom-0 hidden h-16 w-auto text-[#F9D972] opacity-15 dark:opacity-10 md:block"
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
    <section className="monolith-section-panel relative overflow-hidden p-6">
      <CargoShipGraphic />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          {eyebrow && (
            <div className="monolith-label flex flex-wrap items-center gap-2 text-[#F9D972]">
              {eyebrow}
            </div>
          )}
          <div className="flex items-start gap-4">
            {icon && (
              <span className="monolith-icon-badge size-12">
                {icon}
              </span>
            )}
            <div className="space-y-1">
              <h1 className="monolith-h1 text-mono-text">
                {title}
              </h1>
              {description && <p className="max-w-2xl text-sm text-mono-muted">{description}</p>}
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
        "monolith-section-panel relative overflow-hidden p-5",
        tone.accent,
      )}
    >
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="monolith-label">
            {title}
          </p>
          <div className="monolith-numeric text-3xl text-mono-text">{value}</div>
          {note && <p className="text-xs text-mono-muted">{note}</p>}
        </div>
        <span className={cn(tone.icon, accent === "orange" && "[&_*]:!text-[#D88700] !text-[#D88700] !bg-[#D88700]/10")}>
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
    <section className="monolith-section-panel relative overflow-hidden">
      <div className="relative px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <span className="monolith-icon-badge">
                {icon}
              </span>
            )}
            <div className="space-y-0.5">
              <h2 className="monolith-h3 text-mono-text">
                {title}
              </h2>
              {description && <p className="text-xs text-mono-muted">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
      {children ? <div className={cn("relative bg-mono-soft p-5", contentClassName)}>{children}</div> : null}
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
    <section className={cn("monolith-section-panel relative overflow-hidden", tone.accent)}>
      <div className="relative px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <span className={cn(tone.icon, accent === "orange" && "[&_*]:!text-[#D88700] !text-[#D88700] !bg-[#D88700]/10")}>
                {icon}
              </span>
            )}
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="monolith-h3 text-mono-text">
                  {title}
                </h2>
                {badge && (
                  <Badge variant={tone.badgeVariant} className="uppercase">
                    {badge}
                  </Badge>
                )}
              </div>
              {description && <p className="text-xs text-mono-muted">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
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
      <div className="monolith-section-panel grid h-9 w-9 place-items-center">
        <span className={cn("monolith-numeric leading-none", theme.count)}>{visible}</span>
      </div>
      <div>
        <p className="monolith-label">Visible Records</p>
        <p className="monolith-numeric text-mono-text">
          {visible} / {total}
        </p>
      </div>
    </div>
  );
}
