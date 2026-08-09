"use client";

import type { ComponentProps } from "react";
import { OperationalLinkedRow } from "@/components/data-display/operational-linked-row";

type ClickableRowProps = Omit<ComponentProps<typeof OperationalLinkedRow>, "ariaLabel"> & {
  ariaLabel?: string;
};

export function ClickableRow({ href, ariaLabel, ...props }: ClickableRowProps) {
  return (
    <OperationalLinkedRow
      href={href}
      ariaLabel={ariaLabel ?? `Open ${href}`}
      {...props}
    />
  );
}
