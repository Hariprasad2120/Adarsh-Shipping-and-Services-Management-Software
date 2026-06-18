"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComboboxOption } from "../_lib/types";

type ComboboxFieldProps = {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  ariaLabel: string;
};

export function ComboboxField({ options, value, onChange, placeholder, disabled, ariaLabel }: ComboboxFieldProps) {
  const id = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selectedOption = useMemo(() => options.find((option) => option.id === value) ?? null, [options, value]);

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
    return options.filter((option) => `${option.label} ${option.description ?? ""}`.toLowerCase().includes(normalized));
  }, [options, draftQuery]);

  const handleSelect = (optionId: string) => {
    const nextOption = options.find((option) => option.id === optionId) ?? null;
    onChange(optionId);
    setDraftQuery(nextOption?.label ?? "");
    setOpen(false);
  };

  const inputValue = open ? draftQuery : selectedOption?.label ?? "";

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-[#6b7280]" />
        <input
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
            "h-9 w-full rounded-md border border-[#d9dee7] bg-white pl-9 pr-9 text-[13px] text-[#1f2937] outline-none transition",
            "focus:border-[#408dfb] focus:ring-2 focus:ring-[#408dfb]/20 disabled:cursor-not-allowed disabled:bg-[#f3f5f8] disabled:text-[#9ca3af]",
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
              setHighlightedIndex((current) => Math.min(current + 1, filteredOptions.length - 1));
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
        <ChevronDown className="pointer-events-none absolute right-3 top-2.5 size-4 text-[#6b7280]" />
      </div>

      {open ? (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border border-[#d9dee7] bg-white py-1 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
        >
          {filteredOptions.length ? (
            filteredOptions.map((option, index) => {
              const isSelected = option.id === value;
              const isActive = highlightedIndex === index;

              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-[13px]",
                    isActive ? "bg-[#eef5ff]" : "hover:bg-[#f5f7fa]",
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(option.id)}
                >
                  <span>
                    <span className="block text-[#1f2937]">{option.label}</span>
                    {option.description ? <span className="block text-[11px] text-[#6b7280]">{option.description}</span> : null}
                  </span>
                  {isSelected ? <Check className="mt-0.5 size-4 text-[#408dfb]" /> : null}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-[12px] text-[#6b7280]">No matching records found.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
