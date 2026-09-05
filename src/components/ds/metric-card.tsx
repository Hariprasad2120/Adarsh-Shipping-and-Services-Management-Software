import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, type CardVariant } from "./ds-card";
import { TrendBadge, type TrendDirection } from "./ds-badge";

/**
 * MetricCard — one KPI: a muted label, an optional delta pill, a large
 * tabular value, and an optional caption line. Business data in via props;
 * nothing dashboard-specific lives here. Reused by every module.
 *
 *   <MetricCard
 *     label="Active shipments"
 *     value={1248}
 *     trend={{ direction: "up", value: "+8%", srLabel: "up 8% vs last period" }}
 *     caption="Up 8% compared with the previous period"
 *   />
 *
 * When there is no historical delta, omit `trend` and use `caption` to say
 * something true (e.g. "12 created today"). Never fabricate a percentage.
 */
export interface MetricTrend {
  direction: TrendDirection;
  value: string;
  srLabel?: string;
}

export interface MetricCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children"> {
  label: React.ReactNode;
  value: React.ReactNode;
  /** small unit shown next to the value, e.g. "hrs", "₹" */
  unit?: React.ReactNode;
  trend?: MetricTrend;
  caption?: React.ReactNode;
  icon?: React.ReactNode;
  /** wrap in a Card (default). Set false to render bare inside another Card. */
  boxed?: boolean;
  variant?: CardVariant;
  tone?: "primary" | "success" | "warning" | "danger" | "info" | "default";
}

function Body({ label, value, unit, trend, caption, icon, tone }: MetricCardProps) {
  return (
    <div className="ds-metric" data-tone={tone}>
      <div className="ds-metric-top">
        <p className="ds-metric-label">{label}</p>
        {trend ? (
          <TrendBadge
            direction={trend.direction}
            value={trend.value}
            srLabel={trend.srLabel}
          />
        ) : icon ? (
          <span className="ds-metric-icon-badge" aria-hidden="true" data-tone={tone}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="ds-metric-value">
        {value}
        {unit ? <span className="ds-metric-unit">{unit}</span> : null}
      </p>
      {caption ? <p className="ds-metric-caption">{caption}</p> : null}
    </div>
  );
}

export function MetricCard({
  boxed = true,
  variant = "default",
  tone = "default",
  className,
  label,
  value,
  unit,
  trend,
  caption,
  icon,
  ...rest
}: MetricCardProps) {
  const body = (
    <Body
      label={label}
      value={value}
      unit={unit}
      trend={trend}
      caption={caption}
      icon={icon}
      tone={tone}
    />
  );
  if (!boxed) {
    return (
      <div className={cn(className)} data-tone={tone} {...rest}>
        {body}
      </div>
    );
  }
  return (
    <Card variant={variant} data-tone={tone} pad="sm" className={className} {...rest}>
      {body}
    </Card>
  );
}

/**
 * StatGrid — responsive auto-fit row of MetricCards (or any children).
 * `cols` is a hint for the minimum comfortable column count.
 */
export interface StatGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 3 | 4;
}
export function StatGrid({ cols, className, ...rest }: StatGridProps) {
  return (
    <div
      className={cn("ds-statgrid", className)}
      data-cols={cols}
      {...rest}
    />
  );
}
