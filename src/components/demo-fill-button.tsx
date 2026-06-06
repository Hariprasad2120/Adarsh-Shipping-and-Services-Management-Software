"use client";

import { WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
          <select
            value={selectedProfile}
            disabled={disabled}
            onChange={(event) => onProfileChange(event.target.value as DemoPerformanceProfile)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-slate-400"
          >
            {profiles.map((profile) => (
              <option key={profile.value} value={profile.value}>
                {profile.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <Button disabled={disabled} onClick={onClick} size="sm" variant="outline">
        <WandSparkles className="mr-2 h-4 w-4" />
        Fill Demo Data
      </Button>
    </div>
  );
}
