import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva("mnx-badge", {
  variants: {
    variant: {
      default: "mnx-badge-accent",
      secondary: "mnx-badge-neutral",
      success: "mnx-badge-success",
      warning: "mnx-badge-warning",
      destructive: "mnx-badge-danger",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant, className, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  ),
);

Badge.displayName = "Badge";
