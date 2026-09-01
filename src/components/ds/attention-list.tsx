import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AttentionList — the operational "Requires attention" queue. A stack of
 * severity-railed rows, each a link to the underlying record. Generic: any
 * module can feed it items shaped like AttentionListItem.
 *
 * Renders a healthy state when the list is empty. `moreHref` / `moreCount`
 * add a "view all" affordance when the list is truncated upstream.
 */
export type AttentionSeverity = "critical" | "warning" | "info";

export interface AttentionListItem {
  id: string;
  title: React.ReactNode;
  detail?: React.ReactNode;
  href: string;
  source?: React.ReactNode;
  severity: AttentionSeverity;
}

export interface AttentionListProps {
  items: AttentionListItem[];
  /** total upstream count, if the passed `items` are a slice */
  totalCount?: number;
  moreHref?: string;
  healthyLabel?: React.ReactNode;
  className?: string;
}

export function AttentionList({
  items,
  totalCount,
  moreHref = "/notifications",
  healthyLabel = "Nothing needs you right now.",
  className,
}: AttentionListProps) {
  if (items.length === 0) {
    return (
      <div className={cn("ds-state", className)}>
        <span className="ds-state-icon" data-tone="success">
          <Check size={20} aria-hidden="true" />
        </span>
        <p className="ds-state-title">All clear</p>
        <p className="ds-state-desc">{healthyLabel}</p>
      </div>
    );
  }

  const remainder =
    typeof totalCount === "number" && totalCount > items.length
      ? totalCount - items.length
      : 0;

  return (
    <div className={cn(className)}>
      <ul className="ds-attention" role="list">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="ds-attention-row"
              data-severity={item.severity}
            >
              {item.source ? (
                <span className="ds-attention-src">{item.source}</span>
              ) : (
                <span aria-hidden="true" />
              )}
              <span className="ds-attention-body">
                <h3>{item.title}</h3>
                {item.detail ? <p>{item.detail}</p> : null}
              </span>
              <ChevronRight
                size={16}
                className="ds-attention-chev"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
      {remainder > 0 ? (
        <div className="ds-attention-foot">
          <Link className="ds-text-link" href={moreHref}>
            View all {totalCount} <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
