import * as React from "react";
import { cn } from "@/lib/utils";

export function Separator({
  orientation = "horizontal",
  className,
  ...props
}: React.HTMLAttributes<HTMLHRElement> & { orientation?: "horizontal" | "vertical" }) {
  if (orientation === "vertical") {
    return (
      <div
        className={cn("w-px bg-gray-200 self-stretch", className)}
        {...props}
      />
    );
  }
  return <hr className={cn("border-0 border-t border-gray-200", className)} {...props} />;
}
