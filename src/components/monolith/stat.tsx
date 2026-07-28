import * as React from "react";
import { cn } from "@/lib/utils";

export function StatGrid({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mnx-stat-grid", className)} {...props} />;
}

export interface StatCardProps extends React.HTMLAttributes<HTMLElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  helper?: React.ReactNode;
}

export function StatCard({
  className,
  helper,
  label,
  value,
  ...props
}: StatCardProps) {
  return (
    <article className={cn("mnx-stat-card", className)} {...props}>
      <p className="mnx-stat-label">{label}</p>
      <p className="mnx-stat-value" data-ui="stat-value">
        {value}
      </p>
      {helper ? <p className="mnx-stat-helper">{helper}</p> : null}
    </article>
  );
}

export function BusinessNumber({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("mnx-business-number", className)}
      data-ui="business-number"
      {...props}
    />
  );
}
