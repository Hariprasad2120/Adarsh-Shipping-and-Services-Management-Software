"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ds/ds-card";
import { DsButtonLink } from "@/components/ds/ds-button";
import { SectionHeader } from "@/components/ds/section-header";
import { cn } from "@/lib/utils";

export type ActionNeededPriority = "critical" | "high" | "normal";

export type ActionNeededItemData = {
  id: string;
  title: string;
  description: string;
  module: string;
  priority: ActionNeededPriority;
  actionLabel: string;
  actionUrl: string;
  dueDate?: string | null;
  status?: string | null;
};

export interface ActionNeededItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  item: ActionNeededItemData;
}

export interface ActionNeededListProps {
  items: ActionNeededItemData[];
  className?: string;
}

export interface ActionNeededProps extends ActionNeededListProps {
  totalCount?: number;
  viewAllUrl?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
}

function summarizeDetail(value: string, maxLength = 92) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const sentenceEnd = normalized.slice(0, maxLength).search(/[.!?]\s/);
  if (sentenceEnd > 40) {
    return normalized.slice(0, sentenceEnd + 1);
  }

  const preview = normalized.slice(0, maxLength);
  const lastSpace = preview.lastIndexOf(" ");
  return `${preview.slice(0, lastSpace > 48 ? lastSpace : maxLength).trim()}...`;
}

export function ActionNeededItem({
  item,
  className,
  ...rest
}: ActionNeededItemProps) {
  const detail = summarizeDetail(item.description);

  return (
    <div
      className={cn("mnx-action-needed-item", className)}
      data-priority={item.priority}
      {...rest}
    >
      <span className="mnx-action-needed-title" role="cell">{item.title}</span>
      <p className="mnx-action-needed-detail" role="cell" title={item.description}>
        {detail}
      </p>
      <span className="mnx-action-needed-module" role="cell">{item.module}</span>
      <div className="mnx-action-needed-actions" role="cell">
        <DsButtonLink
          href={item.actionUrl}
          size="sm"
          variant="secondary"
          className="mnx-action-needed-button"
        >
          {item.actionLabel}
        </DsButtonLink>
      </div>
    </div>
  );
}

export function ActionNeededList({ items, className }: ActionNeededListProps) {
  return (
    <div className={cn("mnx-action-needed-list", className)} role="table">
      <div className="mnx-action-needed-table-head" role="row">
        <span role="columnheader">Action</span>
        <span role="columnheader">Details</span>
        <span role="columnheader">Module</span>
        <span role="columnheader">Open</span>
      </div>
      {items.map((item) => (
        <ActionNeededItem key={item.id} item={item} role="row" />
      ))}
    </div>
  );
}

export function ActionNeeded({
  items,
  totalCount,
  viewAllUrl = "/notifications",
  title = "Action Needed",
  description,
  className,
}: ActionNeededProps) {
  const hiddenCount =
    typeof totalCount === "number" && totalCount > items.length
      ? totalCount - items.length
      : 0;

  return (
    <Card as="section" className={cn("mnx-action-needed", className)} aria-labelledby="action-needed-title">
      <div className="mnx-action-needed-header">
        <SectionHeader
          title={<span id="action-needed-title">{title}</span>}
          description={description}
          headingLevel={3}
        />
        {hiddenCount > 0 ? (
          <DsButtonLink href={viewAllUrl} size="sm" variant="outlined">
            View All
          </DsButtonLink>
        ) : null}
      </div>
      {items.length > 0 ? (
        <ActionNeededList items={items} />
      ) : (
        <div className="mnx-action-needed-empty">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>Nothing needs action right now.</span>
        </div>
      )}
    </Card>
  );
}
