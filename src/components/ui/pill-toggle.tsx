import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type PillToggleTone = "default" | "warning" | "destructive";

const toneClasses: Record<
  PillToggleTone,
  {
    checked: string;
    focus: string;
    icon: string;
  }
> = {
  default: {
    checked:
      "border-[#00cec4]/55 bg-[rgba(0,206,196,0.10)] text-on-surface shadow-[0_0_0_1px_rgba(0,206,196,0.16)]",
    focus: "focus-within:ring-[#00cec4]/20",
    icon: "border-[#00cec4]/55 text-[#00cec4]",
  },
  warning: {
    checked:
      "border-[#fb923c]/45 bg-[rgba(251,146,60,0.10)] text-on-surface shadow-[0_0_0_1px_rgba(251,146,60,0.12)]",
    focus: "focus-within:ring-[#fb923c]/20",
    icon: "border-[#fb923c]/45 text-[#fb923c]",
  },
  destructive: {
    checked:
      "border-red-500/35 bg-red-500/10 text-on-surface shadow-[0_0_0_1px_rgba(239,68,68,0.10)]",
    focus: "focus-within:ring-red-500/20",
    icon: "border-red-500/35 text-red-400",
  },
};

export interface PillToggleProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "checked" | "defaultChecked" | "onChange"
  > {
  checked: boolean;
  description?: React.ReactNode;
  label: React.ReactNode;
  onCheckedChange: (checked: boolean) => void;
  density?: "default" | "compact";
  tone?: PillToggleTone;
}

export function PillToggle({
  checked,
  className,
  description,
  density = "default",
  disabled,
  label,
  onCheckedChange,
  tone = "default",
  ...props
}: PillToggleProps) {
  const toneClass = toneClasses[tone];
  const isCompact = density === "compact";

  return (
    <label
      className={cn(
        "group flex cursor-pointer items-center text-left text-sm text-on-surface transition-all duration-200",
        isCompact
          ? "min-h-8 gap-2 px-0 py-0.5"
          : "min-h-14 gap-3 rounded-xl border border-outline-variant bg-surface px-4 py-3",
        isCompact
          ? ""
          : "hover:border-outline hover:bg-surface-container-low/65 focus-within:ring-2 focus-within:ring-offset-0",
        !isCompact && toneClass.focus,
        !isCompact && checked && toneClass.checked,
        disabled && "cursor-not-allowed opacity-55",
        className,
      )}
      data-state={checked ? "checked" : "unchecked"}
    >
      <input
        {...props}
        checked={checked}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        type="checkbox"
      />
      <span
        className={cn(
          "shrink-0 items-center justify-center border border-outline-variant bg-surface-container-low transition-all duration-200",
          isCompact
            ? "flex h-5 w-5 rounded-[8px]"
            : "flex h-7 w-7 rounded-full",
          checked && toneClass.icon,
        )}
        aria-hidden="true"
      >
        <Check
          size={isCompact ? 11 : 13}
          className={cn(
            "transition-all duration-200",
            checked ? "scale-100 opacity-100" : "scale-75 opacity-0",
          )}
        />
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span
          className={cn(
            "block text-on-surface",
            isCompact ? "leading-4.5 text-[13px]" : "leading-6",
          )}
        >
          {label}
        </span>
        {description ? (
          <span className="block text-[11px] leading-4 text-on-surface-variant">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
