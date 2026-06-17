"use client";

import { ChevronDownIcon } from "@radix-ui/react-icons";
import * as React from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type DropdownSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type DropdownSelectProps = {
  ariaLabel?: string;
  className?: string;
  contentClassName?: string;
  defaultValue?: string;
  disabled?: boolean;
  name?: string;
  onValueChange?: (value: string) => void;
  options: DropdownSelectOption[];
  placeholder?: string;
  required?: boolean;
  triggerClassName?: string;
  value?: string;
};

export function DropdownSelect({
  ariaLabel,
  className,
  contentClassName,
  defaultValue = "",
  disabled,
  name,
  onValueChange,
  options,
  placeholder = "Select an option",
  required,
  triggerClassName,
  value,
}: DropdownSelectProps) {
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const selectedValue = isControlled ? value : uncontrolledValue;
  const selectedOption = options.find((option) => option.value === selectedValue);
  const buttonLabel =
    selectedValue === "" ? placeholder : (selectedOption?.label ?? placeholder);

  function handleValueChange(nextValue: string) {
    if (!isControlled) {
      setUncontrolledValue(nextValue);
    }
    onValueChange?.(nextValue);
  }

  return (
    <div className={cn("relative", className)}>
      {name ? (
        <select
          aria-hidden="true"
          className="hidden"
          disabled={disabled}
          name={name}
          onChange={() => undefined}
          required={required}
          tabIndex={-1}
          value={selectedValue}
        >
          {options.map((option) => (
            <option key={option.value} disabled={option.disabled} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={ariaLabel}
            data-dropdown-select-trigger="true"
            className={cn(
              "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-[#00cec4]/55 bg-surface px-4 py-2.5 text-left text-[var(--text-base)] text-on-surface shadow-sm transition outline-none hover:border-[#00cec4]/85 hover:shadow-[0_4px_12px_rgba(0,206,196,0.08)] focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant",
              selectedValue === "" && "text-on-surface-variant",
              triggerClassName,
            )}
            disabled={disabled}
            type="button"
          >
            <span className="truncate">{buttonLabel}</span>
            <ChevronDownIcon className="h-4 w-4 shrink-0 text-on-surface-variant" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className={cn("w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto", contentClassName)}
          data-dropdown-select-content="true"
        >
          <DropdownMenuRadioGroup onValueChange={handleValueChange} value={selectedValue}>
            {options.map((option) => (
              <DropdownMenuRadioItem
                disabled={option.disabled}
                key={option.value}
                value={option.value}
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
