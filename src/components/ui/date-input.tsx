"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type DateInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

type CalendarDay = {
  iso: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isDisabled: boolean;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function parseIsoDate(value?: string | number | readonly string[] | null): DateParts | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

  return { year, month, day };
}

function toIsoDate(parts: DateParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function toDate(parts: DateParts): Date {
  return new Date(parts.year, parts.month - 1, parts.day);
}

function formatDisplayDate(value?: string | number | readonly string[] | null): string {
  const parsed = parseIsoDate(value);
  if (!parsed) return "";
  return `${String(parsed.day).padStart(2, "0")}-${String(parsed.month).padStart(2, "0")}-${parsed.year}`;
}

function getMonthLabel(viewDate: Date) {
  return viewDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function clampDate(date: Date, minDate: Date | null, maxDate: Date | null) {
  if (minDate && date < minDate) return minDate;
  if (maxDate && date > maxDate) return maxDate;
  return date;
}

function getTodayIso() {
  const now = new Date();
  return toIsoDate({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
}

function buildCalendarDays(viewDate: Date, minDate: Date | null, maxDate: Date | null) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const todayIso = getTodayIso();
  const days: CalendarDay[] = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const iso = toIsoDate({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });
    const isDisabled = Boolean((minDate && date < minDate) || (maxDate && date > maxDate));

    days.push({
      iso,
      dayNumber: date.getDate(),
      inCurrentMonth: date.getMonth() === month,
      isToday: iso === todayIso,
      isDisabled,
    });
  }

  return days;
}

function parseDateLimit(value?: string | number | readonly string[] | null): Date | null {
  const parsed = parseIsoDate(value);
  return parsed ? toDate(parsed) : null;
}

function setForwardedRef<T>(ref: React.ForwardedRef<T>, value: T) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  if (ref) {
    ref.current = value;
  }
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  {
    id,
    name,
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,
    className,
    disabled,
    required,
    placeholder,
    min,
    max,
    autoFocus,
    ...props
  },
  forwardedRef,
) {
  const isControlled = value !== undefined;
  const initialValue = React.useMemo(
    () => (typeof defaultValue === "string" ? defaultValue : ""),
    [defaultValue],
  );
  const [internalValue, setInternalValue] = React.useState(initialValue);
  const resolvedValue = typeof value === "string" ? value : isControlled ? "" : internalValue;
  const displayValue = formatDisplayDate(resolvedValue);
  const minDate = React.useMemo(() => parseDateLimit(min), [min]);
  const maxDate = React.useMemo(() => parseDateLimit(max), [max]);
  const visibleInputRef = React.useRef<HTMLInputElement | null>(null);
  const hiddenInputRef = React.useRef<HTMLInputElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties>({});
  const [viewDate, setViewDate] = React.useState(() => {
    const parsed = parseIsoDate(resolvedValue) ?? parseIsoDate(min) ?? parseIsoDate(max);
    return parsed ? toDate(parsed) : new Date();
  });

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    const parsed = parseIsoDate(resolvedValue);
    if (parsed) {
      setViewDate(toDate(parsed));
    }
  }, [resolvedValue]);

  const updatePanelPosition = React.useCallback(() => {
    const input = visibleInputRef.current;
    if (!input) return;

    const rect = input.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const panelWidth = Math.min(360, viewportWidth - 24);
    const preferredLeft = rect.left + rect.width / 2 - panelWidth / 2;
    const left = Math.max(12, Math.min(preferredLeft, viewportWidth - panelWidth - 12));
    const estimatedHeight = 428;
    const shouldOpenUp = rect.bottom + estimatedHeight > viewportHeight - 12 && rect.top > estimatedHeight;

    setPanelStyle({
      position: "fixed",
      top: shouldOpenUp ? Math.max(12, rect.top - estimatedHeight - 12) : Math.min(viewportHeight - estimatedHeight - 12, rect.bottom + 12),
      left,
      width: panelWidth,
      zIndex: 80,
    });
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;

    updatePanelPosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (panelRef.current?.contains(target) || visibleInputRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        visibleInputRef.current?.focus();
      }
    };

    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, updatePanelPosition]);

  const commitValue = React.useCallback(
    (nextValue: string) => {
      if (!isControlled) {
        setInternalValue(nextValue);
      }

      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = nextValue;
      }

      if (onChange) {
        const eventTarget = hiddenInputRef.current ?? visibleInputRef.current;
        if (eventTarget) {
          eventTarget.value = nextValue;
          onChange({
            target: eventTarget,
            currentTarget: eventTarget,
          } as React.ChangeEvent<HTMLInputElement>);
        }
      }
    },
    [isControlled, onChange],
  );

  const days = React.useMemo(() => buildCalendarDays(viewDate, minDate, maxDate), [viewDate, minDate, maxDate]);
  const selectedIso = parseIsoDate(resolvedValue) ? resolvedValue : "";
  const canClear = !required && !disabled;

  const openCalendar = React.useCallback(() => {
    if (disabled) return;
    updatePanelPosition();
    setIsOpen(true);
  }, [disabled, updatePanelPosition]);

  const handleSelect = React.useCallback(
    (iso: string) => {
      commitValue(iso);
      setIsOpen(false);
      visibleInputRef.current?.focus();
    },
    [commitValue],
  );

  const goToMonth = React.useCallback(
    (offset: number) => {
      setViewDate((current) => clampDate(new Date(current.getFullYear(), current.getMonth() + offset, 1), minDate, maxDate));
    },
    [maxDate, minDate],
  );

  const jumpToToday = React.useCallback(() => {
    const today = new Date();
    const clamped = clampDate(today, minDate, maxDate);
    const iso = toIsoDate({ year: clamped.getFullYear(), month: clamped.getMonth() + 1, day: clamped.getDate() });
    setViewDate(clamped);
    handleSelect(iso);
  }, [handleSelect, maxDate, minDate]);

  const handleClear = React.useCallback(() => {
    commitValue("");
    setIsOpen(false);
    visibleInputRef.current?.focus();
  }, [commitValue]);

  return (
    <>
      <div className="relative">
        <input
          {...props}
          ref={(node) => {
            visibleInputRef.current = node;
          }}
          id={id}
          type="text"
          inputMode="none"
          autoComplete="off"
          value={displayValue}
          readOnly
          disabled={disabled}
          required={required}
          placeholder={placeholder ?? "dd-mm-yyyy"}
          aria-haspopup="dialog"
          autoFocus={autoFocus}
          onClick={openCalendar}
          onFocus={(event) => {
            onFocus?.(event);
          }}
          onBlur={onBlur}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
              event.preventDefault();
              openCalendar();
            }
          }}
          className={cn(
            "ds-date-trigger flex h-11 w-full rounded-xl border border-[#00cec4]/55 bg-surface px-4 py-2.5 pr-12 text-[var(--text-base)] text-on-surface placeholder:text-[var(--color-placeholder)]",
            "focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15",
            "hover:border-[#00cec4]/85 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        />
        <input
          ref={(node) => {
            hiddenInputRef.current = node;
            setForwardedRef(forwardedRef, node);
          }}
          tabIndex={-1}
          aria-hidden="true"
          type="hidden"
          name={name}
          value={resolvedValue}
          disabled={disabled}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#00cec4]">
          <CalendarDays className="size-[18px]" strokeWidth={1.9} />
        </span>
      </div>

      {isMounted && isOpen
        ? createPortal(
            <div ref={panelRef} style={panelStyle} className="ds-date-panel">
              <div className="ds-date-panel__glow" />
              <div className="relative overflow-hidden rounded-[28px] border border-outline-variant/60 bg-surface/96 p-3 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#00cec4]/70 to-transparent" />
                <div className="absolute inset-x-10 top-2 h-20 rounded-full bg-[#00cec4]/10 blur-3xl" />

                <div className="relative mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.26em] text-on-surface-variant">Monolith Calendar</p>
                    <button
                      type="button"
                      onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth(), 1))}
                      className="mt-1 flex items-center gap-2 rounded-full border border-[#00cec4]/18 bg-[#00cec4]/8 px-3 py-1.5 text-left text-sm font-semibold text-on-surface transition hover:border-[#00cec4]/35 hover:bg-[#00cec4]/12"
                    >
                      <span className="truncate" style={{ fontFamily: "var(--font-kiona-sans), var(--font-geist-sans), sans-serif" }}>
                        {getMonthLabel(viewDate)}
                      </span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => goToMonth(-1)}
                      className="ds-date-nav-button"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => goToMonth(1)}
                      className="ds-date-nav-button"
                      aria-label="Next month"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-2 grid grid-cols-7 gap-1 px-1">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((label) => (
                    <div key={label} className="py-2 text-center text-[10px] uppercase tracking-[0.22em] text-on-surface-variant">
                      {label}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, index) => {
                    const isSelected = day.iso === selectedIso;
                    return (
                      <button
                        key={day.iso}
                        type="button"
                        disabled={day.isDisabled}
                        onClick={() => handleSelect(day.iso)}
                        className={cn(
                          "ds-date-day relative h-11 rounded-2xl text-sm font-medium transition duration-200",
                          !day.inCurrentMonth && "text-on-surface-variant/45",
                          day.inCurrentMonth && "text-on-surface",
                          day.isToday && !isSelected && "ring-1 ring-[#00cec4]/35",
                          isSelected
                            ? "bg-[#00cec4] text-white shadow-[0_16px_28px_-16px_rgba(0,206,196,0.95)]"
                            : "bg-transparent hover:-translate-y-0.5 hover:bg-[#00cec4]/10 hover:shadow-[0_10px_18px_-14px_rgba(0,206,196,0.65)]",
                          day.isDisabled && "cursor-not-allowed opacity-30 hover:translate-y-0 hover:bg-transparent hover:shadow-none",
                        )}
                        style={{ animationDelay: `${Math.min(index * 14, 180)}ms` }}
                      >
                        <span className="relative z-10">{day.dayNumber}</span>
                        {isSelected ? <span className="absolute inset-0 rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.02))]" /> : null}
                      </button>
                    );
                  })}
                </div>

                <div className="relative mt-3 flex items-center justify-between gap-3 border-t border-outline-variant/30 px-1 pt-3">
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={!canClear}
                    className="text-sm font-medium text-on-surface-variant transition hover:text-[#fb923c] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={jumpToToday}
                    className="rounded-full border border-[#00cec4]/18 bg-[#00cec4]/8 px-3 py-1.5 text-sm font-semibold text-[#00cec4] transition hover:border-[#00cec4]/35 hover:bg-[#00cec4]/12"
                  >
                    Today
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
});
