import * as React from "react";
import { cn } from "@/lib/utils";
import { MonolithSpecLabel } from "@/components/ui/foundation";

export function DashboardInsightGrid({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-dashboard-insight-grid", className)} {...props} />;
}

export function DashboardInsightCard({
  chart,
  className,
  detail,
  eyebrow,
  footer,
  title,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  chart?: React.ReactNode;
  detail?: React.ReactNode;
  eyebrow?: React.ReactNode;
  footer?: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <article className={cn("mnx-dashboard-insight-card", className)} {...props}>
      <header className="mnx-dashboard-insight-card-header">
        <div>
          {eyebrow ? <MonolithSpecLabel>{eyebrow}</MonolithSpecLabel> : null}
          <h3>{title}</h3>
          {detail ? <p>{detail}</p> : null}
        </div>
      </header>
      {chart ? <div className="mnx-dashboard-insight-chart">{chart}</div> : null}
      {footer ? <div className="mnx-dashboard-insight-footer">{footer}</div> : null}
    </article>
  );
}

export function DashboardMiniBarChart({
  items,
}: {
  items: Array<{
    label: string;
    value: number;
    tone?: "accent" | "info" | "success" | "warning" | "danger" | "neutral";
  }>;
}) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="mnx-dashboard-bar-chart" role="img" aria-label="Bar chart summary">
      {items.map((item) => (
        <div className="mnx-dashboard-bar-chart-row" key={item.label}>
          <div className="mnx-dashboard-bar-chart-copy">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
          <div className="mnx-dashboard-bar-chart-track" aria-hidden="true">
            <span
              className={cn(
                "mnx-dashboard-bar-chart-fill",
                item.tone ? `mnx-dashboard-tone-${item.tone}` : null,
              )}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardTrend({
  items,
}: {
  items: Array<{
    label: string;
    value: number;
  }>;
}) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="mnx-dashboard-trend" role="img" aria-label="Trend chart">
      <div className="mnx-dashboard-trend-bars" aria-hidden="true">
        {items.map((item) => (
          <span
            className="mnx-dashboard-trend-bar"
            key={item.label}
            style={{ height: `${Math.max(12, (item.value / maxValue) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mnx-dashboard-trend-labels">
        {items.map((item) => (
          <div key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSegmentList({
  items,
}: {
  items: Array<{
    label: string;
    value: number;
    tone?: "accent" | "info" | "success" | "warning" | "danger" | "neutral";
  }>;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="mnx-dashboard-segments">
      <div className="mnx-dashboard-segments-track" aria-hidden="true">
        {items.map((item) => (
          <span
            className={cn(
              "mnx-dashboard-segments-fill",
              item.tone ? `mnx-dashboard-tone-${item.tone}` : null,
            )}
            key={item.label}
            style={{ width: `${total === 0 ? 0 : (item.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="mnx-dashboard-segments-list">
        {items.map((item) => (
          <div key={item.label}>
            <span className={cn("mnx-dashboard-segments-dot", item.tone ? `mnx-dashboard-tone-${item.tone}` : null)} />
            <b>{item.label}</b>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
