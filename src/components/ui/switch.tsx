"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Switch — the one canonical on/off toggle for the Monolith Engine.
 *
 * Renders a real `role="switch"` button with `aria-checked`, keyboard support
 * (Space / Enter), a visible focus ring and `prefers-reduced-motion` handling.
 * No page should hand-roll a toggle out of a <Button> + absolutely-positioned
 * spans again.
 */
export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "type"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Accessible name for the control. */
  label: string;
  /** Visible text shown next to the track (optional). */
  children?: React.ReactNode;
  size?: "sm" | "md";
  tone?: "accent" | "warning" | "success" | "danger";
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  function Switch(
    { checked, onCheckedChange, label, children, size = "md", tone = "accent", disabled, className, onClick, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={children ? undefined : label}
        aria-labelledby={undefined}
        title={label}
        disabled={disabled}
        data-state={checked ? "on" : "off"}
        data-size={size}
        data-tone={tone}
        className={cn("mnx-switch", className)}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) onCheckedChange?.(!checked);
        }}
        {...rest}
      >
        {children ? <span className="mnx-switch-text">{children}</span> : null}
        <span className="mnx-switch-track" aria-hidden="true">
          <span className="mnx-switch-thumb" />
        </span>
      </button>
    );
  },
);
