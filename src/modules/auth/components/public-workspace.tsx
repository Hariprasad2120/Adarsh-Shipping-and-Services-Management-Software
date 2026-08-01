import * as React from "react";
import { cn } from "@/lib/utils";
import { MonolithSpecLabel, MonolithSurface } from "@/components/ui/foundation";
import { WorkspaceBadge, type WorkspaceBadgeProps } from "@/components/layout/workspace";

export function PublicMonolithShell({
  children,
  className,
  workspace = false,
  ...props
}: React.HTMLAttributes<HTMLElement> & { workspace?: boolean }) {
  return (
    <main
      className={cn(
        "mnx-public-shell",
        workspace ? "mnx-public-shell-workspace" : null,
        className,
      )}
      {...props}
    >
      <div className="mnx-public-atmosphere" aria-hidden="true">
        <span />
        <span />
        <i />
      </div>
      <div className="mnx-public-frame">{children}</div>
    </main>
  );
}

export function PublicBrand({
  className,
  subtitle = "Operations platform",
}: {
  className?: string;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className={cn("mnx-public-brand", className)}>
      <span className="mnx-public-brand-mark" aria-hidden="true">
        <i />
        <i />
      </span>
      <span>
        <strong>MONOLITH</strong>
        <small>{subtitle}</small>
      </span>
    </div>
  );
}

export function PublicStage({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn("mnx-public-stage", className)} {...props} />;
}

export function PublicPanel({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <MonolithSurface
      as="section"
      className={cn("mnx-public-panel", className)}
      {...props}
    />
  );
}

export function PublicHeader({
  badge,
  className,
  description,
  eyebrow,
  icon,
  title,
  ...props
}: Omit<React.HTMLAttributes<HTMLElement>, "title"> & {
  badge?: React.ReactNode;
  description?: React.ReactNode;
  eyebrow: React.ReactNode;
  icon?: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <header className={cn("mnx-public-header", className)} {...props}>
      <div className="mnx-public-header-topline">
        <MonolithSpecLabel>{eyebrow}</MonolithSpecLabel>
        {badge}
      </div>
      {icon ? <span className="mnx-public-header-icon">{icon}</span> : null}
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  );
}

export function PublicInset({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-public-inset", className)} {...props} />;
}

export function PublicActions({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-public-actions", className)} {...props} />;
}

export function PublicFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return <footer className={cn("mnx-public-footer", className)} {...props} />;
}

export function PublicStatusBadge({
  children,
  tone = "neutral",
  ...props
}: WorkspaceBadgeProps & { tone?: WorkspaceBadgeProps["variant"] }) {
  return (
    <WorkspaceBadge variant={tone} {...props}>
      <span className="mnx-public-status-dot" aria-hidden="true" />
      {children}
    </WorkspaceBadge>
  );
}

export function PublicStatus({
  className,
  description,
  eyebrow,
  icon,
  title,
  tone = "info",
  ...props
}: Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  description?: React.ReactNode;
  eyebrow: React.ReactNode;
  icon: React.ReactNode;
  title: React.ReactNode;
  tone?: "danger" | "info" | "success" | "warning";
}) {
  return (
    <div
      className={cn("mnx-public-status", `mnx-public-status-${tone}`, className)}
      role={tone === "danger" ? "alert" : "status"}
      {...props}
    >
      <span className="mnx-public-status-icon">{icon}</span>
      <span>
        <MonolithSpecLabel as="span">{eyebrow}</MonolithSpecLabel>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </span>
    </div>
  );
}

export function PublicDetailGrid({
  className,
  ...props
}: React.HTMLAttributes<HTMLDListElement>) {
  return <dl className={cn("mnx-public-detail-grid", className)} {...props} />;
}

export function PublicDetail({
  className,
  label,
  value,
  wide = false,
}: {
  className?: string;
  label: React.ReactNode;
  value: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "mnx-public-detail",
        wide ? "mnx-public-detail-wide" : null,
        className,
      )}
    >
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
