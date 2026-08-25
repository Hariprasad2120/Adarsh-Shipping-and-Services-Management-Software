import * as React from "react";
import { cn } from "@/lib/utils";
import { MonolithSpecLabel, MonolithSurface } from "@/components/ui/foundation";

export function TrialCheckoutLayout({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-trial-checkout-layout", className)} {...props} />;
}

export function TrialCheckoutMain({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-trial-checkout-main", className)} {...props} />;
}

export function TrialCheckoutSidebar({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-trial-checkout-sidebar", className)} {...props} />;
}

export function TrialCheckoutHeader({
  className,
  eyebrow,
  title,
  description,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <header className={cn("mnx-trial-checkout-header", className)} {...props}>
      {eyebrow ? <MonolithSpecLabel>{eyebrow}</MonolithSpecLabel> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </header>
  );
}

export function TrialCheckoutSection({
  className,
  description,
  index,
  title,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  description?: React.ReactNode;
  index: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <section className={cn("mnx-trial-checkout-section", className)} {...props}>
      <header className="mnx-trial-checkout-section-header">
        <div className="mnx-trial-checkout-section-heading">
          <span className="mnx-trial-checkout-section-index">{index}</span>
          <h3>{title}</h3>
        </div>
        {description ? <p>{description}</p> : null}
      </header>
      <div className="mnx-trial-checkout-section-body">{props.children}</div>
    </section>
  );
}

export function TrialCheckoutFieldRow({
  className,
  columns = 3,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  columns?: 2 | 3;
}) {
  return (
    <div
      className={cn("mnx-trial-checkout-field-row", columns === 2 ? "is-two-column" : null, className)}
      {...props}
    />
  );
}

export function TrialCheckoutSummaryCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return <MonolithSurface as="section" className={cn("mnx-trial-checkout-summary", className)} {...props} />;
}

export function TrialCheckoutTimeline({
  className,
  items,
  ...props
}: React.HTMLAttributes<HTMLOListElement> & {
  items: Array<{
    id: string;
    title: React.ReactNode;
    description: React.ReactNode;
    icon: React.ReactNode;
    markerTone?: "strong" | "muted";
  }>;
}) {
  return (
    <ol className={cn("mnx-trial-checkout-timeline", className)} {...props}>
      {items.map((item, index) => (
        <li className="mnx-trial-checkout-timeline-item" key={item.id}>
          <div
            className={cn(
              "mnx-trial-checkout-timeline-marker",
              item.markerTone === "strong" ? "is-strong" : "is-muted",
            )}
            aria-hidden="true"
          >
            {item.icon}
          </div>
          {index < items.length - 1 ? <span className="mnx-trial-checkout-timeline-rail" aria-hidden="true" /> : null}
          <div className="mnx-trial-checkout-timeline-copy">
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function TrialCheckoutPriceList({
  className,
  rows,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  rows: Array<{
    label: React.ReactNode;
    value: React.ReactNode;
    detail?: React.ReactNode;
    tone?: "accent" | "default";
  }>;
}) {
  return (
    <div className={cn("mnx-trial-checkout-price-list", className)} {...props}>
      {rows.map((row) => (
        <div className="mnx-trial-checkout-price-row" key={String(row.label)}>
          <div className="mnx-trial-checkout-price-copy">
            <strong>{row.label}</strong>
            {row.detail ? <p>{row.detail}</p> : null}
          </div>
          <span className={cn("mnx-trial-checkout-price-value", row.tone === "accent" ? "is-accent" : null)}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TrialCheckoutPaymentOption({
  checked = false,
  children,
  className,
  control,
  logos,
  title,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  checked?: boolean;
  control?: React.ReactNode;
  logos?: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <div
      className={cn("mnx-trial-checkout-payment-option", checked ? "is-selected" : null, className)}
      data-selected={checked ? "true" : "false"}
      {...props}
    >
      <header className="mnx-trial-checkout-payment-option-header">
        <div className="mnx-trial-checkout-payment-option-title">
          <span className="mnx-trial-checkout-payment-option-control">{control}</span>
          <strong>{title}</strong>
        </div>
        {logos ? <div className="mnx-trial-checkout-payment-option-logos">{logos}</div> : null}
      </header>
      {children ? <div className="mnx-trial-checkout-payment-option-body">{children}</div> : null}
    </div>
  );
}
