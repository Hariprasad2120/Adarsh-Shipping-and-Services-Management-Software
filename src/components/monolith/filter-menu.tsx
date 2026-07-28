"use client";

import { Filter } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/monolith/dropdown-menu";

export function FilterMenu({
  activeCount,
  ariaLabel = "Open filters",
  children,
  contentClassName = "w-[360px]",
  label,
  onOpenChange,
  open,
}: {
  activeCount?: number;
  ariaLabel?: string;
  children: React.ReactNode;
  contentClassName?: string;
  label?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title?: string;
}) {
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="filter-button relative" aria-label={ariaLabel}>
          <Filter className="h-4 w-4" />
          {label ? <span>{label}</span> : null}
          {activeCount && activeCount > 0 ? <i>{activeCount}</i> : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={`${contentClassName} !p-0`}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
