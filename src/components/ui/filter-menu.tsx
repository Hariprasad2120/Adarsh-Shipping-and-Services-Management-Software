"use client";

import { Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function FilterMenu({
  activeCount,
  ariaLabel = "Open filters",
  children,
  contentClassName = "w-[360px]",
  onOpenChange,
  open,
  title,
}: {
  activeCount?: number;
  ariaLabel?: string;
  children: React.ReactNode;
  contentClassName?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}) {
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-10 items-center justify-center rounded-xl border border-outline-variant/40 bg-surface px-3 text-on-surface transition hover:border-[#00cec4]/45 hover:text-[#008b85]"
          aria-label={ariaLabel}
        >
          <Filter className="h-4 w-4" />
          {activeCount && activeCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#00cec4] px-1 text-[10px] font-semibold text-white">
              {activeCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={`${contentClassName} rounded-2xl p-3`}>
        <DropdownMenuLabel className="px-0 pb-2 text-sm font-semibold text-on-surface">{title}</DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-0 my-0 mb-3" />
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
