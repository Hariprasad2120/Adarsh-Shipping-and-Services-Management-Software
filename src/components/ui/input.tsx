import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  const isChoice = type === "checkbox" || type === "radio";
  const isRange = type === "range";
  const isVisuallyManaged = type === "file" || type === "hidden";

  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        isChoice
          ? "mnx-choice-control"
          : isRange
            ? "mnx-range-control"
            : isVisuallyManaged
              ? "mnx-managed-input"
              : "mnx-field-control",
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";
