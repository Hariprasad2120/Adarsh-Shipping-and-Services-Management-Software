"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Users,
  Video,
} from "lucide-react";
import { CommunicationButton } from "@/modules/communication/components/workspace/communication-workspace";

type CalendarMoment = { dateTime?: string; date?: string };

export type CalendarViewEvent = {
  id: string;
  summary: string;
  start: CalendarMoment;
  end: CalendarMoment;
  htmlLink?: string;
  meetLink?: string;
  attendeeCount: number;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function momentValue(moment: CalendarMoment) {
  return moment.dateTime || moment.date || "";
}

function eventDayKey(event: CalendarViewEvent) {
  const raw = momentValue(event.start);
  if (!raw) return "";
  // Both `2026-08-30` and `2026-08-30T09:00:00+05:30` start with the day key.
  return raw.slice(0, 10);
}

function isAllDay(event: CalendarViewEvent) {
  return !event.start.dateTime;
}

function formatEventTime(event: CalendarViewEvent) {
  if (isAllDay(event)) return "All day";
  const start = new Date(event.start.dateTime as string);
  const end = event.end.dateTime ? new Date(event.end.dateTime) : null;
  const fmt = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
  return end ? `${fmt.format(start)} – ${fmt.format(end)}` : fmt.format(start);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export function CalendarMonthView({ events }: { events: CalendarViewEvent[] }) {
  const today = useMemo(() => new Date(), []);
  const todayKey = toDayKey(today);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(today));
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarViewEvent[]>();
    for (const event of events) {
      const key = eventDayKey(event);
      if (!key) continue;
      const bucket = map.get(key);
      if (bucket) bucket.push(event);
      else map.set(key, [event]);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => momentValue(a.start).localeCompare(momentValue(b.start)));
    }
    return map;
  }, [events]);

  const weeks = useMemo(() => {
    const first = startOfMonth(viewMonth);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - first.getDay());
    const cells: Date[] = [];
    for (let i = 0; i < 42; i += 1) {
      const cell = new Date(gridStart);
      cell.setDate(gridStart.getDate() + i);
      cells.push(cell);
    }
    const rows: Date[][] = [];
    for (let i = 0; i < 6; i += 1) {
      rows.push(cells.slice(i * 7, i * 7 + 7));
    }
    return rows;
  }, [viewMonth]);

  const monthLabel = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(viewMonth);

  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedKey.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }, [selectedKey]);
  const selectedEvents = eventsByDay.get(selectedKey) ?? [];
  const selectedLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(selectedDate);

  return (
    <div className="mnx-communication-calendar">
      <div className="mnx-communication-calendar-main">
        <div className="mnx-communication-calendar-head">
          <strong>{monthLabel}</strong>
          <div className="mnx-communication-calendar-nav">
            <CommunicationButton
              type="button"
              variant="secondary"
              size="compact"
              aria-label="Previous month"
              onClick={() => setViewMonth((current) => addMonths(current, -1))}
            >
              <ChevronLeft aria-hidden="true" />
            </CommunicationButton>
            <CommunicationButton
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => {
                setViewMonth(startOfMonth(today));
                setSelectedKey(todayKey);
              }}
            >
              Today
            </CommunicationButton>
            <CommunicationButton
              type="button"
              variant="secondary"
              size="compact"
              aria-label="Next month"
              onClick={() => setViewMonth((current) => addMonths(current, 1))}
            >
              <ChevronRight aria-hidden="true" />
            </CommunicationButton>
          </div>
        </div>

        <div className="mnx-communication-calendar-weekdays">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="mnx-communication-calendar-grid">
          {weeks.map((week, weekIndex) => (
            <div className="mnx-communication-calendar-week" key={weekIndex}>
              {week.map((day) => {
                const key = toDayKey(day);
                const dayEvents = eventsByDay.get(key) ?? [];
                const outside = day.getMonth() !== viewMonth.getMonth();
                const classNames = [
                  "mnx-communication-calendar-cell",
                  outside ? "is-outside" : "",
                  key === todayKey ? "is-today" : "",
                  key === selectedKey ? "is-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  // eslint-disable-next-line no-restricted-syntax -- calendar day cell, not a generic button action
                  <button
                    type="button"
                    key={key}
                    className={classNames}
                    onClick={() => setSelectedKey(key)}
                  >
                    <span className="mnx-communication-calendar-daynum">
                      {day.getDate()}
                    </span>
                    <span className="mnx-communication-calendar-cell-events">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className="mnx-communication-calendar-chip"
                          title={event.summary}
                        >
                          {event.summary}
                        </span>
                      ))}
                      {dayEvents.length > 3 ? (
                        <span className="mnx-communication-calendar-more">
                          +{dayEvents.length - 3} more
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <aside className="mnx-communication-calendar-agenda">
        <header>
          <p className="mnx-communication-label">Selected day</p>
          <strong>{selectedLabel}</strong>
        </header>
        {selectedEvents.length === 0 ? (
          <div className="mnx-communication-calendar-agenda-empty">
            <CalendarDays aria-hidden="true" />
            <p>No events on this day.</p>
          </div>
        ) : (
          <ul className="mnx-communication-calendar-agenda-list">
            {selectedEvents.map((event) => (
              <li key={event.id} className="mnx-communication-calendar-agenda-item">
                <span className="mnx-communication-calendar-agenda-time">
                  {formatEventTime(event)}
                </span>
                <strong>{event.summary}</strong>
                <div className="mnx-communication-calendar-agenda-meta">
                  <span>
                    <Users aria-hidden="true" />
                    {event.attendeeCount} invited
                  </span>
                  {event.meetLink ? (
                    <a
                      href={event.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mnx-communication-record-link"
                    >
                      <Video aria-hidden="true" />
                      Join Meet
                    </a>
                  ) : null}
                  {event.htmlLink ? (
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mnx-communication-record-link"
                    >
                      Open
                      <ExternalLink aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
