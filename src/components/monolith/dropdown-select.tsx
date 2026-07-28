"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/monolith/dropdown-menu";
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
  id?: string;
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
  id,
  name,
  onValueChange,
  options,
  placeholder = "Select an option",
  required,
  triggerClassName,
  value,
}: DropdownSelectProps) {
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] =
    React.useState(defaultValue);
  const selectedValue = isControlled ? value : uncontrolledValue;
  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );

  function handleValueChange(nextValue: string) {
    if (!isControlled) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <div className={cn("mnx-select-shell", className)}>
      {name ? (
        <select
          aria-hidden="true"
          className="hidden"
          disabled={disabled}
          name={name}
          required={required}
          tabIndex={-1}
          value={selectedValue}
          onChange={() => undefined}
        >
          {options.map((option) => (
            <option
              key={option.value}
              disabled={option.disabled}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            id={id}
            aria-label={ariaLabel}
            type="button"
            disabled={disabled}
            className={cn(
              "mnx-field-control mnx-select-trigger",
              triggerClassName,
            )}
          >
            <span>{selectedOption?.label ?? placeholder}</span>
            <ChevronDown aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className={cn(
            "max-h-[320px] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto",
            contentClassName,
          )}
        >
          <DropdownMenuRadioGroup
            value={selectedValue}
            onValueChange={handleValueChange}
          >
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
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
