"use client";

import { ListFilter } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/monolith/dropdown-menu";

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
        <button type="button" className="mnx-filter-button" aria-label={ariaLabel}>
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
