"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, ListFilter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type FilterMenuProps = {
  activeCount?: number;
  ariaLabel?: string;
  children: React.ReactNode;
  contentClassName?: string;
  label?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title?: string;
};

export type FilterMenuCategory = {
  active?: boolean;
  key: string;
  label: string;
  value: string;
};

export type FilterMenuPanelOption = {
  key: string;
  label: string;
  note?: string;
  selected: boolean;
  onSelect: () => void;
};

export type FilterMenuPanelSection = FilterMenuCategory & {
  emptyLabel?: string;
  options: FilterMenuPanelOption[];
  viewAllLabel?: string;
  onViewAll?: () => void;
};

export type FilterActiveLink = {
  href: string;
  key: string;
  label: string;
};

export function FilterMenu({
  activeCount,
  ariaLabel = "Open filters",
  children,
  contentClassName = "w-[360px]",
  label = "Filter",
  onOpenChange,
  open,
}: FilterMenuProps) {
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="mnx-filter-button filter-button" aria-label={ariaLabel}>
          <ListFilter aria-hidden="true" />
          {label ? <span>{label}</span> : null}
          {typeof activeCount === "number" ? (
            <i aria-label={`${activeCount} active filters`}>{activeCount}</i>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={`${contentClassName} !p-0`}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CategorizedFilterMenuPanel({
  activeCategoryKey,
  className,
  footer,
  headerActionLabel,
  onHeaderAction,
  onActiveCategoryChange,
  sections,
  title = "Filters",
}: {
  activeCategoryKey: string;
  className?: string;
  footer?: React.ReactNode;
  headerActionLabel?: React.ReactNode;
  onHeaderAction?: () => void;
  onActiveCategoryChange: (key: string) => void;
  sections: FilterMenuPanelSection[];
  title?: React.ReactNode;
}) {
  return (
    <div className={cn("mnx-filter-menu-panel", className)}>
      <div className="mnx-filter-menu-panel-header">
        <div className="mnx-filter-menu-panel-heading">
          <h3 className="mnx-filter-menu-panel-title">{title}</h3>
          {headerActionLabel ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mnx-filter-menu-panel-header-action"
              onClick={onHeaderAction}
            >
              {headerActionLabel}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="mnx-filter-menu-panel-categories">
        {sections.map((section) => {
          const isOpen = section.key === activeCategoryKey;

          return (
            <section
              key={section.key}
              className={cn(
                "mnx-filter-menu-panel-category",
                isOpen && "is-open",
              )}
            >
              <button
                type="button"
                className={cn(
                  "mnx-filter-menu-panel-category-trigger",
                  isOpen && "is-open",
                )}
                aria-expanded={isOpen}
                onClick={() => onActiveCategoryChange(isOpen ? "" : section.key)}
              >
                <span className="mnx-filter-menu-panel-category-meta">
                  {isOpen ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
                  <span className="mnx-filter-menu-panel-category-label">
                    {section.label}
                  </span>
                </span>
                <span className="mnx-filter-menu-panel-category-summary">
                  {section.active ? <span className="mnx-state-dot" /> : null}
                  <span className="mnx-filter-menu-panel-category-value">
                    {section.value}
                  </span>
                </span>
              </button>
              {isOpen ? (
                <div className="mnx-filter-menu-panel-section">
                  <div className="mnx-filter-menu-panel-options">
                    {section.options.length > 0 ? (
                      section.options.map((option) => (
                        <label key={option.key} className="mnx-filter-menu-panel-option-row">
                          <Input
                            type="checkbox"
                            checked={option.selected}
                            onChange={option.onSelect}
                            className="mnx-choice-control"
                          />
                          <span className="min-w-0">
                            <span className="mnx-filter-menu-panel-option-label">{option.label}</span>
                            {option.note ? (
                              <span className="mnx-filter-menu-panel-option-note">{option.note}</span>
                            ) : null}
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="mnx-filter-menu-panel-empty">
                        {section.emptyLabel ?? "No filters found."}
                      </p>
                    )}
                  </div>
                  {section.viewAllLabel ? (
                    <button
                      type="button"
                      className="mnx-plain mnx-filter-menu-panel-view-all"
                      onClick={section.onViewAll}
                    >
                      {section.viewAllLabel}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
      {footer ? (
        <div className="mnx-filter-menu-panel-footer">{footer}</div>
      ) : null}
    </div>
  );
}

export function FilterActiveLinks({
  className,
  clearHref,
  clearLabel = "Clear All",
  links,
}: {
  className?: string;
  clearHref?: string;
  clearLabel?: string;
  links: FilterActiveLink[];
}) {
  if (links.length === 0 && !clearHref) {
    return null;
  }

  return (
    <div className={cn("mnx-filter-active-links", className)}>
      {links.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          className="mnx-filter-active-link"
        >
          {link.label}
        </Link>
      ))}
      {clearHref ? (
        <Link href={clearHref} className="mnx-filter-active-link">
          {clearLabel}
        </Link>
      ) : null}
    </div>
  );
}
