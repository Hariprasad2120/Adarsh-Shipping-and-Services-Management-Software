"use client";

import { useRouter } from "next/navigation";
import React, { ComponentProps } from "react";
import { DataTableRow } from "./data-table";

type ClickableRowProps = ComponentProps<typeof DataTableRow> & {
  href: string;
};

export function ClickableRow({ href, children, className, ...props }: ClickableRowProps) {
  const router = useRouter();

  const handleNavigate = (e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    // Don't trigger navigation if clicking an interactive element
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("textarea") ||
      target.closest('[role="button"]') ||
      target.closest('[role="menuitem"]')
    ) {
      return;
    }
    router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    // Don't trigger navigation if typing inside an interactive element
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("textarea") ||
      target.closest('[role="button"]') ||
      target.closest('[role="menuitem"]')
    ) {
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      router.push(href);
    }
  };

  return (
    <DataTableRow
      {...props}
      tabIndex={0}
      role="link"
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
      className={`ds-row-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00cec4] focus-visible:ring-inset ${className || ""}`}
    >
      {children}
    </DataTableRow>
  );
}
