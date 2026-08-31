import type { ReactNode } from "react";
import { ArrowUpRight, CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MonolithEmptyState, MonolithSpecLabel } from "@/components/ui/foundation";

export type DashboardTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "violet";

export interface DashboardActionItem {
  id: string;
  title: string;
  detail?: string;
  meta?: string;
  href?: string;
  tone?: DashboardTone;
  badge?: string;
}

export function DashboardSection({
  eyebrow,
  title,
  description,
  action,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mn-ds-section ${className}`.trim()}>
      <header className="mn-ds-section-header">
        <div className="mn-ds-section-heading">
          {eyebrow ? <MonolithSpecLabel>{eyebrow}</MonolithSpecLabel> : null}
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <div className="mn-ds-section-action">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function DashboardSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <Card className={`mn-ds-surface ${className}`.trim()}>{children}</Card>;
}

export function DashboardSignal({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  detail?: string;
  tone?: DashboardTone;
}) {
  return (
    <div className="mn-ds-signal" data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export function DashboardActionList({
  items,
  emptyTitle = "Nothing needs your attention",
  emptyDetail = "You are caught up for now.",
}: {
  items: DashboardActionItem[];
  emptyTitle?: string;
  emptyDetail?: string;
}) {
  if (items.length === 0) {
    return (
      <MonolithEmptyState className="mn-ds-empty mn-ds-empty-compact">
        <CheckCircle2 size={22} />
        <h3>{emptyTitle}</h3>
        <p>{emptyDetail}</p>
      </MonolithEmptyState>
    );
  }

  return (
    <div className="mn-ds-action-list">
      {items.map((item) => {
        const content = (
          <>
            <span className="mn-ds-action-indicator" data-tone={item.tone ?? "neutral"} />
            <span className="mn-ds-action-copy">
              <b>{item.title}</b>
              {item.detail ? <small>{item.detail}</small> : null}
            </span>
            <span className="mn-ds-action-meta">
              {item.badge ? <Badge className={`mn-ds-badge mn-ds-badge-${item.tone ?? "neutral"}`}>{item.badge}</Badge> : null}
              {item.meta ? <small>{item.meta}</small> : null}
              {item.href ? <ChevronRight size={16} aria-hidden="true" /> : null}
            </span>
          </>
        );

        return item.href ? (
          <Link className="mn-ds-action-row" href={item.href} key={item.id}>
            {content}
          </Link>
        ) : (
          <div className="mn-ds-action-row" key={item.id}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

export function DashboardQuickActions({
  actions,
}: {
  actions: { href: string; label: string; context?: string }[];
}) {
  return (
    <div className="mn-ds-quick-actions">
      {actions.map((action) => (
        <ButtonLink href={action.href} variant="outline" key={`${action.href}-${action.label}`}>
          <span>
            <b>{action.label}</b>
            {action.context ? <small>{action.context}</small> : null}
          </span>
          <ArrowUpRight size={15} />
        </ButtonLink>
      ))}
    </div>
  );
}

export function DashboardActivityList({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    detail?: string;
    source?: string;
    when?: string;
    href?: string;
  }>;
}) {
  if (items.length === 0) {
    return (
      <MonolithEmptyState className="mn-ds-empty mn-ds-empty-compact">
        <CheckCircle2 size={22} />
        <h3>No recent activity</h3>
        <p>New workflow movement will appear here.</p>
      </MonolithEmptyState>
    );
  }

  return (
    <div className="mn-ds-activity-list">
      {items.map((item) => (
        <div className="mn-ds-activity-row" key={item.id}>
          <span className="mn-ds-activity-dot" aria-hidden="true" />
          <div>
            <b>{item.href ? <Link href={item.href}>{item.title}</Link> : item.title}</b>
            {item.detail ? <small>{item.detail}</small> : null}
          </div>
          <div className="mn-ds-activity-meta">
            {item.source ? <span>{item.source}</span> : null}
            {item.when ? <time>{item.when}</time> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardModuleCard({
  href,
  title,
  eyebrow,
  metricLabel,
  metricValue,
  description,
  available,
  supportingMetrics,
}: {
  href: string;
  title: string;
  eyebrow: string;
  metricLabel: string;
  metricValue: number;
  description: string;
  available: boolean;
  supportingMetrics: Array<{ label: string; value: number }>;
}) {
  return (
    <Link
      className="mn-ds-module-card"
      data-available={available ? "true" : "false"}
      href={href}
    >
      <header>
        <span>{eyebrow}</span>
        <Badge variant={available ? "success" : "secondary"}>{available ? "Live" : "Unavailable"}</Badge>
      </header>
      <div className="mn-ds-module-title-row">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="mn-ds-module-metric">
          <strong>{metricValue}</strong>
          <small>{metricLabel}</small>
        </div>
      </div>
      {supportingMetrics.length > 0 ? (
        <div className="mn-ds-module-supporting">
          {supportingMetrics.slice(0, 2).map((metric) => (
            <span key={metric.label}>
              <small>{metric.label}</small>
              <b>{metric.value}</b>
            </span>
          ))}
        </div>
      ) : null}
      <footer>
        <span>Open workspace</span>
        <ArrowUpRight size={15} />
      </footer>
    </Link>
  );
}

const auditRows = [
  {
    current: "Dashboard workspace tabs implemented with route-local native <button> elements",
    canonical: "Tabs",
    action: "REPLACE",
    reason: "A shared Tabs component already exists and is already used by the Organization dashboard.",
  },
  {
    current: "mnx-metric-card repeated in My Space, Team and Organization",
    canonical: "DashboardSignal",
    action: "MERGE",
    reason: "One semantic signal component should own metric typography, density and tone.",
  },
  {
    current: "mnx-inset-card / brief panel / launch-link variants",
    canonical: "DashboardActionList + DashboardQuickActions",
    action: "MERGE",
    reason: "These patterns all represent actionable rows or shortcuts and should share behavior.",
  },
  {
    current: "Large attendance panel with its own nested visual language",
    canonical: "Compact attendance command strip",
    action: "SIMPLIFY",
    reason: "Attendance is important but should not dominate the first viewport of a role dashboard.",
  },
  {
    current: "Raw dashboard activity <table>",
    canonical: "DashboardActivityList",
    action: "REPLACE",
    reason: "The dashboard needs a scannable feed; a full data table belongs on the dedicated activity page.",
  },
  {
    current: "Illustrated module cards with one-off graphics and layout sequencing",
    canonical: "DashboardModuleCard",
    action: "SIMPLIFY",
    reason: "Module navigation should prioritize module state, primary metric and the next route.",
  },
  {
    current: "Zero-value announcement/task/holiday cards always consume equal space",
    canonical: "Conditional signals / compact empty state",
    action: "REMOVE WHEN EMPTY",
    reason: "A dashboard should spend space on work and exceptions, not on multiple cards saying nothing is happening.",
  },
] as const;

export function DashboardDesignSystemAudit() {
  return (
    <div className="mn-ds-audit">
      <DashboardSection
        eyebrow="DASHBOARD DESIGN SYSTEM"
        title="Current pattern → canonical pattern"
        description="Use this audit as the migration contract for other dashboard and workspace pages."
      >
        <div className="mn-ds-audit-grid">
          <div className="mn-ds-audit-head">Current implementation</div>
          <div className="mn-ds-audit-head">Canonical component</div>
          {auditRows.map((row) => (
            <div className="mn-ds-audit-row" key={row.current}>
              <div>
                <Badge variant="secondary">{row.action}</Badge>
                <h3>{row.current}</h3>
              </div>
              <div>
                <code>{row.canonical}</code>
                <p>{row.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </DashboardSection>
    </div>
  );
}
