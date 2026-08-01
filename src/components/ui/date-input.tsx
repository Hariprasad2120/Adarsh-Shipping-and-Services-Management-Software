import * as React from "react";
import { cn } from "@/lib/utils";

type DateInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="date"
      className={cn("mnx-field-control", className)}
      {...props}
    />
  ),
);

DateInput.displayName = "DateInput";
