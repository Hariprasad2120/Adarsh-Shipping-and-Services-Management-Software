"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * FilterBar — a right-aligned cluster of controls (Selects, DateRange, a
 * primary action). Wraps on small screens; on mobile a page may instead move
 * these into a drawer and only render the trigger here.
 */
export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end";
}
export function FilterBar({ align = "end", className, ...rest }: FilterBarProps) {
  return (
    <div
      className={cn("ds-filterbar", className)}
      data-align={align}
      role="group"
      {...rest}
    />
  );
}

/**
 * Select — a native <select> wrapped for DS chrome. Native for accessibility
 * and zero clipping inside scroll containers. `icon` renders a leading glyph.
 */
export interface SelectOption {
  value: string;
  label: string;
}
export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  options: SelectOption[];
  icon?: React.ReactNode;
  /** accessible name for the control */
  label: string;
  className?: string;
}
export function Select({
  options,
  icon,
  label,
  id,
  className,
  ...rest
}: SelectProps) {
  const generatedId = React.useId();
  const selectId = id ?? generatedId;
  return (
    <span className={cn("ds-select", className)}>
      {icon ? (
        <span className="ds-icon" aria-hidden="true" data-size="sm">
          {icon}
        </span>
      ) : null}
      <label htmlFor={selectId} className="sr-only">
        {label}
      </label>
      <select id={selectId} aria-label={label} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="ds-select-chev" aria-hidden="true" />
    </span>
  );
}

/**
 * DateRangeSelect — a preset date-range picker built on Select. Emits the
 * chosen preset key; the page maps it to real dates. Presets only: the
 * dashboard data layer works in "since N days", not arbitrary ranges.
 */
export type DateRangePreset = "24h" | "7d" | "30d" | "90d";
export const DATE_RANGE_PRESETS: SelectOption[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];
export interface DateRangeSelectProps {
  value: DateRangePreset;
  onChange: (value: DateRangePreset) => void;
  icon?: React.ReactNode;
}
export function DateRangeSelect({ value, onChange, icon }: DateRangeSelectProps) {
  return (
    <Select
      label="Date range"
      icon={icon}
      options={DATE_RANGE_PRESETS}
      value={value}
      onChange={(e) => onChange(e.target.value as DateRangePreset)}
    />
  );
}
