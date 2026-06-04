"use client";

import { WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { demoFillEnabled } from "@/lib/demo-fill";

export function DemoFillButton({
  className,
  disabled,
  onClick,
}: {
  className?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  if (!demoFillEnabled) return null;

  return (
    <Button className={className} disabled={disabled} onClick={onClick} size="sm" variant="outline">
      <WandSparkles className="mr-2 h-4 w-4" />
      Fill Demo Data
    </Button>
  );
}
