import * as React from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

export type MonolithIconTone =
  | "default"
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "orange"
  | "teal";

export type MonolithIconSize = "xs" | "sm" | "md" | "lg";
export type MonolithIconSurface = "bare" | "soft" | "solid";

type MonolithGlyphProps = LucideProps & {
  title?: string;
};

export interface MonolithIconProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  decorative?: boolean;
  icon: LucideIcon | React.ComponentType<MonolithGlyphProps>;
  label?: string;
  size?: MonolithIconSize;
  strokeWidth?: number;
  surface?: MonolithIconSurface;
  tone?: MonolithIconTone;
}

export function MonolithIcon({
  className,
  decorative = true,
  icon: Icon,
  label,
  size = "md",
  strokeWidth = 1.9,
  surface = "soft",
  tone = "default",
  ...props
}: MonolithIconProps) {
  const accessibleProps = decorative
    ? { "aria-hidden": "true" as const }
    : { "aria-label": label, role: "img" as const };

  return (
    <span
      className={cn("mnx-icon", className)}
      data-size={size}
      data-surface={surface}
      data-tone={tone}
      {...accessibleProps}
      {...props}
    >
      <span className="mnx-icon-glyph">
        <Icon className="mnx-icon-svg" strokeWidth={strokeWidth} />
      </span>
    </span>
  );
}
