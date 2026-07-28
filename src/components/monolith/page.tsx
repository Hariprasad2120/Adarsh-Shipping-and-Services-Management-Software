import * as React from "react";
import { cn } from "@/lib/utils";

export function Page({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn("mnx-page", className)} {...props} />;
}

export interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  signal?: boolean;
}

export function PageHeader({
  actions,
  className,
  description,
  eyebrow,
  signal = false,
  title,
  ...props
}: PageHeaderProps) {
  return (
    <header className={cn("mnx-page-header", className)} {...props}>
      <div className="mnx-page-header-copy">
        {eyebrow ? (
          <p className="mnx-eyebrow" data-signal={signal ? "true" : undefined}>
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mnx-page-title">{title}</h1>
        {description ? <p className="mnx-page-description">{description}</p> : null}
      </div>
      {actions ? <div className="mnx-page-actions">{actions}</div> : null}
    </header>
  );
}

export function PageSection({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn("mnx-page-section", className)} {...props} />;
}

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLElement> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export function SectionHeader({
  actions,
  className,
  description,
  eyebrow,
  title,
  ...props
}: SectionHeaderProps) {
  return (
    <header className={cn("mnx-section-header", className)} {...props}>
      <div className="mnx-section-header-copy">
        {eyebrow ? <p className="mnx-eyebrow">{eyebrow}</p> : null}
        <h2 className="mnx-section-title">{title}</h2>
        {description ? <p className="mnx-section-description">{description}</p> : null}
      </div>
      {actions ? <div className="mnx-section-actions">{actions}</div> : null}
    </header>
  );
}

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "compact" | "default";
}

export function Panel({ className, padding = "default", ...props }: PanelProps) {
  return (
    <div
      className={cn("mnx-panel", className)}
      data-padding={padding}
      {...props}
    />
  );
}
