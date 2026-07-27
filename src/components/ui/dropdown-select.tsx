"use client";

import { ChevronDownIcon } from "@radix-ui/react-icons";
import * as React from "react";

import {DropdownMenu,DropdownMenuContent,DropdownMenuRadioGroup,DropdownMenuRadioItem,DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
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
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const selectedValue = isControlled ? value : uncontrolledValue;
  const selectedOption = options.find((option) => option.value === selectedValue);
  const buttonLabel =
    selectedValue === "" ? placeholder : (selectedOption?.label ?? placeholder);

  React.useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      const selectedItem = contentRef.current?.querySelector<HTMLElement>("[data-dropdown-select-item='selected']");
      selectedItem?.scrollIntoView({ block: "center" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, selectedValue]);

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

      <DropdownMenu modal={false} onOpenChange={setOpen} open={open}>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={ariaLabel}
            data-dropdown-select-trigger="true"
            data-form-field-trigger="true"
            id={id}
            className={cn(
              "ds-plain flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-[#00cec4]/45 bg-surface px-4 py-2.5 text-left text-[var(--text-base)] text-on-surface shadow-[0_12px_28px_-24px_rgba(0,0,0,0.25)] transition outline-none hover:border-[#00cec4]/75 hover:bg-surface hover:shadow-[0_14px_30px_-24px_rgba(0,206,196,0.16)] focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant",
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
          className={cn(
            "w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto rounded-2xl border border-outline-variant/40 bg-surface p-1 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.28)]",
            contentClassName,
          )}
          data-dropdown-select-content="true"
          ref={contentRef}
        >
          <DropdownMenuRadioGroup onValueChange={handleValueChange} value={selectedValue}>
            {options.map((option) => (
              <DropdownMenuRadioItem
                data-dropdown-select-item={option.value === selectedValue ? "selected" : undefined}
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
