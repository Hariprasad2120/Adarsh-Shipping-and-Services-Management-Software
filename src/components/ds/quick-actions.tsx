import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * QuickActions — a compact grid of shortcut links to create/act flows.
 * Only ever fed hrefs that resolve to real, permitted routes.
 */
export interface QuickAction {
  label: React.ReactNode;
  href: string;
  icon?: React.ReactNode;
}
export interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}
export function QuickActions({ actions, className }: QuickActionsProps) {
  if (actions.length === 0) return null;
  return (
    <div className={cn("ds-quickactions", className)}>
      {actions.map((a) => (
        <Link key={a.href} href={a.href} className="ds-quickaction">
          {a.icon ?? <ArrowUpRight size={15} aria-hidden="true" />}
          {a.label}
        </Link>
      ))}
    </div>
  );
}

/**
 * DefinitionList — label/value rows. Used for the dark-panel "signals"
 * readout (Checked in · On break · Leave queue · …) and anywhere a small
 * key/number list is clearer than cards.
 */
export interface DefinitionItem {
  term: React.ReactNode;
  description: React.ReactNode;
}
export function DefinitionList({
  items,
  className,
}: {
  items: DefinitionItem[];
  className?: string;
}) {
  return (
    <dl className={cn("ds-deflist", className)}>
      {items.map((it, i) => {
        const termTitle = typeof it.term === "string" ? it.term : undefined;
        const descTitle = typeof it.description === "string" ? it.description : undefined;
        return (
          <div className="ds-deflist-row" key={i}>
            <dt className="ds-deflist-term" title={termTitle}>
              {it.term}
            </dt>
            <dd className="ds-deflist-desc" title={descTitle}>
              {it.description}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
