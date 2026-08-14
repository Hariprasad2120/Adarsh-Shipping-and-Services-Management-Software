"use client";

import { CrmButton, CrmInput } from "@/modules/crm/components/workspace/crm-workspace";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComboboxOption } from "@/modules/crm/components/quotes/lib/types";

type ComboboxFieldProps = {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  ariaLabel: string;
};

export function ComboboxField({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  ariaLabel,
}: ComboboxFieldProps) {
  const id = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filteredOptions = useMemo(() => {
    const normalized = draftQuery.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) =>
      `${option.label} ${option.description ?? ""}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [options, draftQuery]);

  const handleSelect = (optionId: string) => {
    const nextOption = options.find((option) => option.id === optionId) ?? null;
    onChange(optionId);
    setDraftQuery(nextOption?.label ?? "");
    setOpen(false);
  };

  const inputValue = open ? draftQuery : (selectedOption?.label ?? "");

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-[var(--mnx-text-muted)]" />
        <CrmInput
          id={id}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          value={inputValue}
          placeholder={placeholder}
          className={cn(
            "h-9 w-full rounded-xl border bg-[var(--mnx-surface)] pl-9 pr-9 text-[13px] text-[var(--mnx-text-strong)] outline-none transition",
            "disabled:cursor-not-allowed disabled:bg-[var(--mnx-surface)] disabled:text-[var(--mnx-text-muted)]",
          )}
          onFocus={() => {
            if (!disabled) {
              setDraftQuery(selectedOption?.label ?? "");
              setHighlightedIndex(0);
              setOpen(true);
            }
          }}
          onChange={(event) => {
            setDraftQuery(event.target.value);
            setHighlightedIndex(0);
            setOpen(true);
            if (!event.target.value) onChange("");
          }}
          onKeyDown={(event) => {
            if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
              setOpen(true);
              return;
            }

            if (!filteredOptions.length) return;

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

            if (event.key === "Enter") {
              event.preventDefault();
              handleSelect(filteredOptions[highlightedIndex].id);
            }

            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-2.5 size-4 text-[var(--mnx-text-muted)]" />
      </div>

      {open ? (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border border-[var(--mnx-border)] bg-[var(--mnx-surface)] py-1 mnx-shadow-panel"
        >
          {filteredOptions.length ? (
            filteredOptions.map((option, index) => {
              const isSelected = option.id === value;
              const isActive = highlightedIndex === index;

              return (
                <CrmButton
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-[13px]",
                    isActive
                      ? "bg-[var(--mnx-accent)]/10"
                      : "hover:bg-[var(--mnx-surface)]",
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(option.id)}
                >
                  <span>
                    <span className="block text-[var(--mnx-text-strong)]">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="block text-[11px] text-[var(--mnx-text-muted)]">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {isSelected ? (
                    <Check className="mt-0.5 size-4 text-[var(--mnx-accent)]" />
                  ) : null}
                </CrmButton>
              );
            })
          ) : (
            <div className="px-3 py-2 text-[12px] text-[var(--mnx-text-muted)]">
              No matching records found.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
