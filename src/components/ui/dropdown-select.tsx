"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
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

export type DropdownSelectProps = {
  ariaLabel?: string;
  className?: string;
  contentClassName?: string;
  defaultValue?: string;
  disabled?: boolean;
  emptyMessage?: string;
  id?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  options: DropdownSelectOption[];
  placeholder?: string;
  required?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  triggerClassName?: string;
  value?: string;
};

export function DropdownSelect({
  ariaLabel,
  className,
  contentClassName,
  defaultValue = "",
  disabled,
  emptyMessage = "No matching options found.",
  id,
  name,
  onValueChange,
  options,
  placeholder = "Select an option",
  required,
  searchable = true,
  searchPlaceholder = "Type to filter options...",
  triggerClassName,
  value,
}: DropdownSelectProps) {
  const isControlled = value !== undefined;
  const searchInputId = React.useId();
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [uncontrolledValue, setUncontrolledValue] =
    React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const selectedValue = isControlled ? value : uncontrolledValue;
  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredOptions = React.useMemo(() => {
    if (!searchable || normalizedQuery.length === 0) return options;
    return options.filter((option) => {
      const normalizedLabel = option.label.toLowerCase();
      const normalizedValue = option.value.toLowerCase();
      return (
        normalizedLabel.includes(normalizedQuery) ||
        normalizedValue.includes(normalizedQuery)
      );
    });
  }, [normalizedQuery, options, searchable]);

  React.useEffect(() => {
    if (!open || !searchable) return;

    const frame = window.requestAnimationFrame(() => {
      const input = searchInputRef.current;
      if (!input) return;
      input.focus();
      const nextPosition = input.value.length;
      input.setSelectionRange(nextPosition, nextPosition);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, searchable]);

  function handleValueChange(nextValue: string) {
    if (!isControlled) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
    setOpen(false);
    setSearchQuery("");
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchQuery("");
    }
  }

  function focusSelectableItem(direction: "first" | "last") {
    const items = contentRef.current?.querySelectorAll<HTMLElement>(
      "[role='menuitemradio']:not([data-disabled])",
    );
    if (!items || items.length === 0) return;
    const target = direction === "first" ? items[0] : items[items.length - 1];
    target?.focus();
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!searchable || disabled) return;

    if (
      event.key.length === 1 &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      setSearchQuery((currentQuery) => `${currentQuery}${event.key}`);
      setOpen(true);
    }
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusSelectableItem("first");
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusSelectableItem("last");
      return;
    }

    if (event.key !== "Escape") {
      event.stopPropagation();
    }
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
          {!options.some((option) => option.value === "") ? (
            <option value="">{placeholder}</option>
          ) : null}
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
      <DropdownMenu modal={false} open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            id={id}
            aria-label={ariaLabel}
            type="button"
            disabled={disabled}
            onKeyDown={handleTriggerKeyDown}
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
          ref={contentRef}
          className={cn(
            "mnx-select-content w-[var(--radix-dropdown-menu-trigger-width)]",
            contentClassName,
          )}
        >
          {searchable ? (
            <div className="mnx-select-search">
              <label className="sr-only" htmlFor={searchInputId}>
                Filter options
              </label>
              <input
                id={searchInputId}
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                placeholder={searchPlaceholder}
                className="mnx-select-search-input"
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </div>
          ) : null}
          <DropdownMenuRadioGroup
            value={selectedValue}
            onValueChange={handleValueChange}
          >
            {filteredOptions.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                className="mnx-select-item"
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {filteredOptions.length === 0 ? (
            <div className="mnx-select-empty" role="status" aria-live="polite">
              {emptyMessage}
            </div>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
