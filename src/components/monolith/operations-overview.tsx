import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FilePenLine,
  FileText,
  type LucideIcon,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MonolithSpecLabel } from "./foundation";
import { WorkspaceBadge, WorkspacePanel } from "./workspace";

export type OperationsTone = "danger" | "warning" | "success" | "accent" | "neutral";
export type OperationsIconName =
  | "activity"
  | "approval"
  | "calendar"
  | "check"
  | "clock"
  | "document"
  | "draft"
  | "shield";

const iconMap: Record<OperationsIconName, LucideIcon> = {
  activity: Activity,
  approval: ClipboardCheck,
  calendar: CalendarClock,
  check: CheckCircle2,
  clock: Clock3,
  document: FileText,
  draft: FilePenLine,
  shield: ShieldCheck,
};

function OperationsIcon({
  className,
  name,
}: {
  className?: string;
  name: OperationsIconName;
}) {
  const Icon = iconMap[name];
  return <Icon aria-hidden="true" className={className} />;
}

export function OperationsOverview({
  children,
}: {
  children: React.ReactNode;
}) {
  return <section className="mnx-operations-overview">{children}</section>;
}

export function OperationsOverviewHeader({
  refreshHref,
  updatedLabel = "Checked just now",
}: {
  refreshHref?: string;
  updatedLabel?: string;
}) {
  return (
    <header className="mnx-operations-overview-header">
      <div className="mnx-section-heading-title">
        <span>02</span>
        <h2>Operations Overview</h2>
      </div>
      <div className="mnx-operations-overview-tools">
        <p>Priority work, approaching deadlines and recent system activity</p>
        <span>{updatedLabel}</span>
        {refreshHref ? (
          <Link
            aria-label="Refresh operations overview"
            className="mnx-icon-button mnx-operations-refresh"
            href={refreshHref}
          >
            <RefreshCw aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </header>
  );
}

export function OperationsOverviewGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mnx-operations-overview-grid">{children}</div>;
}

export function OperationsPanel({
  actions,
  children,
  className,
  count,
  description,
  label,
  title,
}: {
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  count?: React.ReactNode;
  description?: React.ReactNode;
  label?: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <WorkspacePanel className={cn("mnx-operations-panel", className)}>
      <header className="mnx-operations-panel-header">
        <div>
          {label ? <MonolithSpecLabel as="p">{label}</MonolithSpecLabel> : null}
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        {typeof count !== "undefined" ? (
          <WorkspaceBadge variant="neutral">{count}</WorkspaceBadge>
        ) : null}
        {actions ? <div className="mnx-operations-panel-actions">{actions}</div> : null}
      </header>
      {children}
    </WorkspacePanel>
  );
}

export function OperationsEmptyState({
  icon = "check",
  label,
  text,
  title,
}: {
  icon?: OperationsIconName;
  label?: React.ReactNode;
  text: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <div className="mnx-operations-empty">
      <span>
        <OperationsIcon name={icon} />
      </span>
      <div>
        <h4>{title}</h4>
        <p>{text}</p>
        {label ? <small>{label}</small> : null}
      </div>
    </div>
  );
}

export function JobReferenceChip({
  children,
  href,
}: {
  children: React.ReactNode;
  href?: string;
}) {
  if (href) {
    return (
      <Link className="mnx-job-reference-chip" href={href}>
        {children}
      </Link>
    );
  }

  return <span className="mnx-job-reference-chip">{children}</span>;
}

export function PendingActionRow({
  actionLabel = "Open",
  href,
  jobNumber,
  meta,
  status,
  title,
  tone = "neutral",
}: {
  actionLabel?: React.ReactNode;
  href: string;
  jobNumber: React.ReactNode;
  meta?: React.ReactNode;
  status?: React.ReactNode;
  title: React.ReactNode;
  tone?: OperationsTone;
}) {
  return (
    <Link className={cn("mnx-pending-action-row", `is-${tone}`)} href={href}>
      <span className="mnx-quick-action-marker" aria-hidden="true" />
      <div className="mnx-pending-action-main">
        <h4>{title}</h4>
        <div className="mnx-operations-metadata">
          <JobReferenceChip>{jobNumber}</JobReferenceChip>
          {meta ? <span>{meta}</span> : null}
        </div>
      </div>
      <div className="mnx-quick-action-command">
        {status ? <WorkspaceBadge variant={toneToBadge(tone)}>{status}</WorkspaceBadge> : null}
        <span className="mnx-text-action">
          {actionLabel}
          <ArrowRight aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export function ExpiryRow({
  href,
  jobNumber,
  label,
  message,
  remaining,
  tone = "warning",
}: {
  href: string;
  jobNumber: React.ReactNode;
  label: React.ReactNode;
  message?: React.ReactNode;
  remaining: React.ReactNode;
  tone?: OperationsTone;
}) {
  return (
    <Link className={cn("mnx-expiry-row", `is-${tone}`)} href={href}>
      <span className="mnx-expiry-row-icon">
        <OperationsIcon name="clock" />
      </span>
      <div>
        <h4>{label}</h4>
        <div className="mnx-operations-metadata">
          <JobReferenceChip>{jobNumber}</JobReferenceChip>
          <span>{remaining}</span>
        </div>
        {message ? <p>{message}</p> : null}
      </div>
      <WorkspaceBadge variant={toneToBadge(tone)}>
        {tone === "danger" ? "Expired" : "Attention"}
      </WorkspaceBadge>
    </Link>
  );
}

export function ActivityTimeline({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mnx-activity-timeline">{children}</div>;
}

export function ActivityTimelineItem({
  actor,
  description,
  exactTime,
  href,
  icon = "activity",
  jobHref,
  jobNumber,
  relativeTime,
  title,
  tone = "neutral",
}: {
  actor?: React.ReactNode;
  description?: React.ReactNode;
  exactTime?: string;
  href?: string;
  icon?: OperationsIconName;
  jobHref?: string;
  jobNumber?: React.ReactNode;
  relativeTime: React.ReactNode;
  title: React.ReactNode;
  tone?: OperationsTone;
}) {
  const content = (
    <>
      <span className={cn("mnx-activity-node", `is-${tone}`)}>
        <i aria-hidden="true" />
        <OperationsIcon name={icon} />
      </span>
      <div className="mnx-activity-copy">
        <div className="mnx-activity-title-row">
          <h4>{title}</h4>
          <time dateTime={exactTime} title={exactTime}>
            {relativeTime}
          </time>
        </div>
        {description ? <p>{description}</p> : null}
        <div className="mnx-operations-metadata">
          {jobNumber ? (
            <JobReferenceChip href={href ? undefined : jobHref}>
              {jobNumber}
            </JobReferenceChip>
          ) : null}
          {actor ? <span>{actor}</span> : null}
        </div>
      </div>
      {href ? <ChevronRight aria-hidden="true" className="mnx-activity-chevron" /> : null}
    </>
  );

  if (href) {
    return (
      <Link className="mnx-activity-timeline-item" href={href}>
        {content}
      </Link>
    );
  }

  return <article className="mnx-activity-timeline-item">{content}</article>;
}

function toneToBadge(tone: OperationsTone) {
  switch (tone) {
    case "danger":
      return "danger" as const;
    case "warning":
      return "warning" as const;
    case "success":
      return "success" as const;
    case "accent":
      return "accent" as const;
    default:
      return "neutral" as const;
  }
}
