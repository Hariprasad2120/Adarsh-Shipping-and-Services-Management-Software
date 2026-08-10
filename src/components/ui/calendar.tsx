"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type CalendarProps = {
  className?: string;
  id?: string;
  initialMonth?: Date;
  max?: string;
  min?: string;
  onSelectDate: (value: string) => void;
  selectedDate?: string;
};

const weekdayLabels = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

function isDateDisabled(date: Date, minDate?: Date | null, maxDate?: Date | null) {
  if (minDate && isBefore(date, minDate)) return true;
  if (maxDate && isAfter(date, maxDate)) return true;
  return false;
}

export function Calendar({
  className,
  id,
  initialMonth,
  max,
  min,
  onSelectDate,
  selectedDate,
}: CalendarProps) {
  const selected = selectedDate ? parseISO(selectedDate) : null;
  const today = startOfToday();
  const minDate = min ? parseISO(min) : null;
  const maxDate = max ? parseISO(max) : null;
  const [visibleMonth, setVisibleMonth] = React.useState<Date>(
    initialMonth ?? selected ?? today,
  );

  const monthStart = startOfMonth(visibleMonth);
  const monthEnd = endOfMonth(visibleMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div id={id} className={cn("mnx-calendar-panel", className)}>
      <div className="mnx-calendar-header">
        <button
          type="button"
          className="mnx-calendar-nav"
          aria-label="Previous month"
          onClick={() => setVisibleMonth((current) => subMonths(current, 1))}
        >
          <ChevronLeft size={16} />
        </button>
        <div className="mnx-calendar-heading" aria-live="polite">
          <strong>{format(visibleMonth, "MMMM")}</strong>
          <span>{`, ${format(visibleMonth, "yyyy")}`}</span>
        </div>
        <button
          type="button"
          className="mnx-calendar-nav"
          aria-label="Next month"
          onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mnx-calendar-weekdays" aria-hidden="true">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div
        className="mnx-calendar-grid"
        role="grid"
        aria-label={format(visibleMonth, "MMMM yyyy")}
      >
        {days.map((day) => {
          const outside = !isSameMonth(day, visibleMonth);
          const disabled = isDateDisabled(day, minDate, maxDate);
          const isoValue = format(day, "yyyy-MM-dd");

          return (
            <button
              key={isoValue}
              type="button"
              role="gridcell"
              className="mnx-calendar-day"
              data-outside={outside ? "true" : "false"}
              data-selected={selected && isSameDay(day, selected) ? "true" : "false"}
              data-today={isSameDay(day, today) ? "true" : "false"}
              disabled={disabled}
              aria-selected={selected ? isSameDay(day, selected) : false}
              onClick={() => onSelectDate(isoValue)}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      <div className="mnx-calendar-footer">
        <button
          type="button"
          className="mnx-calendar-today"
          onClick={() => onSelectDate(format(today, "yyyy-MM-dd"))}
        >
          Today
        </button>
      </div>
    </div>
  );
}
