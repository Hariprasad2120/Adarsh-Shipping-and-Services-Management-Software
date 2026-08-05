"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type OperationalLinkedRowProps = React.HTMLAttributes<HTMLTableRowElement> & {
  href: string;
  ariaLabel: string;
};

const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, [role="button"], [role="link"], [data-row-interactive="true"]';

export function OperationalLinkedRow({
  href,
  ariaLabel,
  className,
  onClick,
  onKeyDown,
  children,
  ...props
}: OperationalLinkedRowProps) {
  const router = useRouter();

  const navigate = React.useCallback(() => {
    router.push(href);
  }, [href, router]);

  const isInteractiveTarget = React.useCallback((
    target: EventTarget | null,
    currentTarget: HTMLElement,
  ) => {
    if (!(target instanceof HTMLElement)) return false;
    const interactiveAncestor = target.closest(INTERACTIVE_SELECTOR);
    return Boolean(interactiveAncestor && interactiveAncestor !== currentTarget);
  }, []);

  return (
    <tr
      className={cn("mnx-operational-linked-row", className)}
      tabIndex={0}
      role="link"
      aria-label={ariaLabel}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          isInteractiveTarget(event.target, event.currentTarget)
        ) {
          return;
        }
        navigate();
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate();
        }
      }}
      {...props}
    >
      {children}
    </tr>
  );
}
