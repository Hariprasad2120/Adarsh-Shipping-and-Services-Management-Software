"use client";

import * as React from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type DropdownSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  keywords?: string[];
};

export type DropdownSelectProps = {
  ariaLabel?: string;
  className?: string;
  contentClassName?: string;
  createLabel?: string;
  defaultOpen?: boolean;
  defaultValue?: string;
  disabled?: boolean;
  emptyMessage?: string;
  id?: string;
  name?: string;
  onCreate?: () => void;
  onOpenChange?: (open: boolean) => void;
  onValueChange?: (value: string) => void;
  open?: boolean;
  options: DropdownSelectOption[];
  placeholder?: string;
  required?: boolean;
  searchable?: boolean;
  triggerClassName?: string;
  value?: string;
};

function searchMatch(option: DropdownSelectOption, query: string) {
  const haystack = [
    option.label,
    option.description ?? "",
    ...(option.keywords ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export function DropdownSelect({
  ariaLabel,
  className,
  contentClassName,
  createLabel,
  defaultOpen = false,
  defaultValue = "",
  disabled = false,
  emptyMessage = "No matching options found.",
  id,
  name,
  onCreate,
  onOpenChange,
  onValueChange,
  open,
  options,
  placeholder = "Select an option",
  required,
  searchable = false,
  triggerClassName,
  value,
}: DropdownSelectProps) {
  const generatedId = React.useId();
  const triggerId = id ?? generatedId;
  const searchId = `${triggerId}-search`;
  const listId = `${triggerId}-list`;
  const isControlled = value !== undefined;
  const isOpenControlled = open !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const [query, setQuery] = React.useState("");
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const selectedValue = isControlled ? value : uncontrolledValue;
  const resolvedOpen = isOpenControlled ? open : uncontrolledOpen;
  const selectedOption = options.find((option) => option.value === selectedValue) ?? null;

  const filteredOptions = React.useMemo(() => {
    if (!searchable || !query.trim()) {
      return options;
    }
    return options.filter((option) => searchMatch(option, query.trim()));
  }, [options, query, searchable]);

  const clampedIndex = filteredOptions.length
    ? Math.min(highlightedIndex, filteredOptions.length - 1)
    : 0;

  React.useEffect(() => {
    if (resolvedOpen && searchable) {
      const timer = window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);

      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [resolvedOpen, searchable]);

  function setOpen(nextOpen: boolean) {
    if (!isOpenControlled) {
      setUncontrolledOpen(nextOpen);
    }
    if (!nextOpen) {
      setQuery("");
      setHighlightedIndex(0);
    }
    onOpenChange?.(nextOpen);
  }

  function commitValue(nextValue: string) {
    if (!isControlled) {
      setUncontrolledValue(nextValue);
    }
    onValueChange?.(nextValue);
    setOpen(false);
  }

  return (
    <div className={cn("mnx-select-shell", className)}>
      {name ? (
        <input type="hidden" name={name} value={selectedValue} required={required} />
      ) : null}
      <DropdownMenu modal={false} open={resolvedOpen} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            id={triggerId}
            type="button"
            aria-label={ariaLabel}
            aria-haspopup="listbox"
            aria-expanded={resolvedOpen}
            className={cn("mnx-field-trigger mnx-select-trigger", triggerClassName)}
            disabled={disabled}
            onKeyDown={(event) => {
              if (!resolvedOpen) return;

              if (!filteredOptions.length) {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                }
                return;
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                setHighlightedIndex((current) =>
                  Math.min(current + 1, filteredOptions.length - 1),
                );
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                setHighlightedIndex((current) => Math.max(current - 1, 0));
              }

              if (event.key === "Home") {
                event.preventDefault();
                setHighlightedIndex(0);
              }

              if (event.key === "End") {
                event.preventDefault();
                setHighlightedIndex(filteredOptions.length - 1);
              }

              if (event.key === "Enter") {
                event.preventDefault();
                const option = filteredOptions[clampedIndex];
                if (option && !option.disabled) {
                  commitValue(option.value);
                }
              }
            }}
          >
            <span>{selectedOption?.label ?? placeholder}</span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className={cn("mnx-select-content", contentClassName)}
          sideOffset={6}
        >
          {searchable ? (
            <input
              ref={searchInputRef}
              id={searchId}
              type="text"
              className="mnx-field-control mnx-combobox-search"
              placeholder="Search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlightedIndex(0);
              }}
            />
          ) : null}

          <div className="mnx-select-list" role="listbox" id={listId} aria-labelledby={triggerId}>
            {filteredOptions.length ? (
              filteredOptions.map((option, index) => {
                const selected = option.value === selectedValue;
                const highlighted = clampedIndex === index;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    className="mnx-select-option"
                    data-highlighted={highlighted ? "true" : "false"}
                    data-selected={selected ? "true" : "false"}
                    aria-selected={selected}
                    disabled={option.disabled}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => commitValue(option.value)}
                  >
                    <span className="mnx-select-option-copy">
                      <strong>{option.label}</strong>
                      {option.description ? <span>{option.description}</span> : null}
                    </span>
                    {selected ? <Check size={15} aria-hidden="true" /> : null}
                  </button>
                );
              })
            ) : (
              <div className="mnx-combobox-empty">{emptyMessage}</div>
            )}
          </div>

          {createLabel && onCreate ? (
            <button
              type="button"
              className="mnx-select-action"
              onClick={() => {
                onCreate();
                setOpen(false);
              }}
            >
              <span className="mnx-select-option-copy">
                <strong>{createLabel}</strong>
              </span>
              <Plus size={15} aria-hidden="true" />
            </button>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
