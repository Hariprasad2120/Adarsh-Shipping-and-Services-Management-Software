import * as React from "react";
import { cn } from "@/lib/utils";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
};

export function Label({
  children,
  className,
  required = false,
  ...props
}: LabelProps) {
  return (
    <label className={cn("mnx-label", className)} {...props}>
      <span>{children}</span>
      {required ? <span className="mnx-label-required">*</span> : null}
    </label>
  );
}
