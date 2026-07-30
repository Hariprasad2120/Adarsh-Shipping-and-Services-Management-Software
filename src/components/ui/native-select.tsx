import * as React from "react";
import { cn } from "@/lib/utils";

type NativeSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function NativeSelect({ className, ...props }: NativeSelectProps) {
  return (
    <select
      className={cn("mnx-field-control mnx-field-select", className)}
      {...props}
    />
  );
}
