"use client";

import * as React from "react";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxInputOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  keywords?: string[];
};

export type ComboboxInputProps = {
  ariaLabel?: string;
  className?: string;
  createLabel?: string;
  defaultValue?: string;
  disabled?: boolean;
  emptyMessage?: string;
  id?: string;
  inputClassName?: string;
  listClassName?: string;
  name?: string;
  onCreate?: () => void;
  onValueChange?: (value: string) => void;
  options: ComboboxInputOption[];
  placeholder?: string;
  required?: boolean;
  value?: string;
};

function optionMatches(option: ComboboxInputOption, query: string) {
  const haystack = [
    option.label,
    option.description ?? "",
    ...(option.keywords ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export function ComboboxInput({
  ariaLabel,
  className,
  createLabel,
  defaultValue = "",
  disabled = false,
  emptyMessage = "No matching options found.",
  id,
  inputClassName,
  listClassName,
  name,
  onCreate,
  onValueChange,
  options,
  placeholder = "Search or select an option",
  required,
  value,
}: ComboboxInputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const listboxId = `${inputId}-listbox`;
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const selectedValue = isControlled ? value : uncontrolledValue;
  const selectedOption = options.find((option) => option.value === selectedValue) ?? null;

  React.useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filteredOptions = React.useMemo(() => {
    if (!query.trim()) {
      return options;
    }

    return options.filter((option) => optionMatches(option, query.trim()));
  }, [options, query]);

  const clampedIndex = filteredOptions.length
    ? Math.min(highlightedIndex, filteredOptions.length - 1)
    : 0;

  function commitValue(nextValue: string) {
    if (!isControlled) {
      setUncontrolledValue(nextValue);
    }
    onValueChange?.(nextValue);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      {name ? (
        <input type="hidden" name={name} value={selectedValue} required={required} />
      ) : null}
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        disabled={disabled}
        className={cn("mnx-field-control pr-10", inputClassName)}
        placeholder={placeholder}
        value={open ? query : (selectedOption?.label ?? "")}
        onFocus={() => {
          if (!disabled) {
            setOpen(true);
            setHighlightedIndex(0);
          }
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setHighlightedIndex(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
            return;
          }

          if (!filteredOptions.length) return;

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
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
              setQuery("");
            }
          }
        }}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mn-color-text-muted)]"
      />

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className={cn(
            "mnx-floating-surface mnx-combobox-content absolute left-0 top-[calc(100%+0.45rem)] z-50",
            listClassName,
          )}
        >
          <div className="mnx-combobox-list">
            {filteredOptions.length ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  className="mnx-combobox-option"
                  data-highlighted={clampedIndex === index ? "true" : "false"}
                  data-selected={option.value === selectedValue ? "true" : "false"}
                  aria-selected={option.value === selectedValue}
                  disabled={option.disabled}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    commitValue(option.value);
                    setQuery("");
                  }}
                >
                  <span className="mnx-combobox-option-copy">
                    <strong>{option.label}</strong>
                    {option.description ? <span>{option.description}</span> : null}
                  </span>
                </button>
              ))
            ) : (
              <div className="mnx-combobox-empty">{emptyMessage}</div>
            )}
          </div>

          {createLabel && onCreate ? (
            <button
              type="button"
              className="mnx-combobox-action"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onCreate();
                setOpen(false);
              }}
            >
              <span className="mnx-combobox-option-copy">
                <strong>{createLabel}</strong>
              </span>
              <Plus size={15} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
