"use client";

import { WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { demoFillEnabled, type DemoPerformanceProfile } from "@/lib/demo-fill";

export function DemoFillButton({
  className,
  disabled,
  onClick,
  profiles,
  selectedProfile,
  onProfileChange,
}: {
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  profiles?: Array<{ value: DemoPerformanceProfile; label: string }>;
  selectedProfile?: DemoPerformanceProfile;
  onProfileChange?: (value: DemoPerformanceProfile) => void;
}) {
  if (!demoFillEnabled) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      {profiles && selectedProfile && onProfileChange ? (
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <span>Demo range</span>
          <DropdownSelect
            ariaLabel="Demo range"
            className="min-w-[180px]"
            disabled={disabled}
            onValueChange={(value) => onProfileChange(value as DemoPerformanceProfile)}
            options={profiles.map((profile) => ({ value: profile.value, label: profile.label }))}
            value={selectedProfile}
          />
        </label>
      ) : null}
      <Button disabled={disabled} onClick={onClick} size="sm" variant="outline">
        <WandSparkles className="mr-2 h-4 w-4" />
        Fill Demo Data
      </Button>
    </div>
  );
}
