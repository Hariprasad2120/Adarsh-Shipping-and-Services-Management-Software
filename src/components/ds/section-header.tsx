import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SectionHeader — a title (+ optional description) with an optional right-side
 * action slot. Sits at the top of a Card or a page section. Inherits colour
 * from its container, so it works unchanged inside a dark panel.
 */
export interface SectionHeaderProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** heading level for the title element; visual size is fixed */
  headingLevel?: 2 | 3 | 4;
}

export function SectionHeader({
  title,
  description,
  actions,
  headingLevel = 3,
  className,
  ...rest
}: SectionHeaderProps) {
  const Heading = `h${headingLevel}` as "h3";
  return (
    <div className={cn("ds-section-header", className)} {...rest}>
      <div className="ds-section-header-text">
        <Heading className="ds-section-header-title">{title}</Heading>
        {description ? (
          <p className="ds-section-header-desc">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="ds-section-header-actions">{actions}</div>
      ) : null}
    </div>
  );
}
