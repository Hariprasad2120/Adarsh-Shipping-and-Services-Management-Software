"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PlusCircle, Package } from "lucide-react";
import { searchItems } from "@/lib/items/item-store";
import type { ItemListItem } from "@/lib/items/types";
import { NewItemDialog } from "@/components/items/NewItemDialog";

interface ItemAutocompleteProps {
  value: string;
  onChange: (name: string) => void;
  onSelectItem: (item: ItemListItem) => void;
  error?: string;
}

function highlight(text: string, query: string) {
  if (!query.trim()) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-[rgba(0,206,196,0.18)] text-inherit rounded px-0">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

export function ItemAutocomplete({
  value,
  onChange,
  onSelectItem,
  error,
}: ItemAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);

  const suggestions = value.trim().length > 0 ? searchItems(value) : [];

  const hasExactMatch = suggestions.some(
    (s) => s.name.toLowerCase() === value.trim().toLowerCase()
  );
  const showAddNew = value.trim().length > 0 && !hasExactMatch;

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setActiveIndex(-1);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (open && mounted) {
      updateCoords();
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
      return () => {
        window.removeEventListener("scroll", updateCoords, true);
        window.removeEventListener("resize", updateCoords);
      };
    }
  }, [open, mounted]);

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function select(item: ItemListItem) {
    onChange(item.name);
    onSelectItem(item);
    setOpen(false);
  }

  function addNew() {
    setDialogOpen(true);
    setOpen(false);
  }

  const totalOptions = suggestions.length + (showAddNew ? 1 : 0);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if ((e.key === "ArrowDown" || e.key === "Enter") && value.trim().length > 0) setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, totalOptions - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        select(suggestions[activeIndex]);
      } else if (activeIndex === suggestions.length && showAddNew) {
        addNew();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        placeholder="Type or click to select an item."
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val);
          if (val.trim().length > 0) {
            setOpen(true);
          } else {
            setOpen(false);
          }
        }}
        onFocus={() => {
          if (value.trim().length > 0) {
            setOpen(true);
          }
        }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? "item-autocomplete-dropdown" : undefined}
        className="h-9 w-full rounded-md border border-[#d9dee7] bg-white px-3 text-[12px] text-[#1f2937] outline-none focus:border-[#00cec4] focus:ring-2 focus:ring-[#00cec4]/20"
      />
      {error && <p className="mt-1 text-[11px] text-[#fe4242]">{error}</p>}

      {mounted && open && (suggestions.length > 0 || showAddNew) &&
        createPortal(
          <div
            id="item-autocomplete-dropdown"
            ref={dropdownRef}
            className="absolute z-50 rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(15,23,42,0.14)]"
            style={{
              position: "absolute",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              minWidth: "280px",
              background: "var(--color-surface)",
              border: "1px solid rgba(0,206,196,0.25)",
              maxHeight: "280px",
              overflowY: "auto",
            }}
            role="listbox"
          >
            {suggestions.length > 0 && (
              <>
                <div
                  className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--color-on-surface-variant)", background: "var(--color-surface-container-low)" }}
                >
                  Items Master
                </div>
                {suggestions.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === i}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(item);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors"
                    style={{
                      background:
                        activeIndex === i
                          ? "rgba(0,206,196,0.08)"
                          : "transparent",
                    }}
                  >
                    <span
                      className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
                      style={{ background: "rgba(0,206,196,0.10)", color: "#00cec4" }}
                    >
                      <Package size={12} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium" style={{ color: "var(--color-on-surface)" }}>
                        {highlight(item.name, value)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {item.hsnSac && (
                          <span className="text-[10px]" style={{ color: "var(--color-on-surface-variant)" }}>
                            HSN: {item.hsnSac}
                          </span>
                        )}
                        {item.rate > 0 && (
                          <span
                            className="text-[10px] font-semibold"
                            style={{ color: "#00cec4" }}
                          >
                            ₹{item.rate.toLocaleString("en-IN")}
                          </span>
                        )}
                        {item.usageUnit && (
                          <span className="text-[10px]" style={{ color: "var(--color-on-surface-variant)" }}>
                            / {item.usageUnit}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}

            {suggestions.length === 0 && value.trim() && (
              <div
                className="px-3 py-3 text-[12px]"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                No items found for &ldquo;{value}&rdquo;
              </div>
            )}

            {showAddNew && (
              <>
                {suggestions.length > 0 && (
                  <div style={{ height: "1px", background: "rgba(0,206,196,0.15)", margin: "0 12px" }} />
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={activeIndex === suggestions.length}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addNew();
                  }}
                  onMouseEnter={() => setActiveIndex(suggestions.length)}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                  style={{
                    background:
                      activeIndex === suggestions.length
                        ? "rgba(0,206,196,0.08)"
                        : "transparent",
                  }}
                >
                  <span
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
                    style={{ background: "rgba(0,206,196,0.15)", color: "#00cec4" }}
                  >
                    <PlusCircle size={12} />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "#00cec4" }}>
                      Add &ldquo;{value.trim()}&rdquo; as new item
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--color-on-surface-variant)" }}>
                      Saves to Items master permanently
                    </p>
                  </div>
                </button>
              </>
            )}
          </div>,
          document.body
        )}

      <NewItemDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialName={value.trim()}
        onSaveSuccess={(newItem) => {
          select(newItem);
        }}
      />
    </div>
  );
}
