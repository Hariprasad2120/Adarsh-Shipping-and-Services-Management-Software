"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, X, ChevronLeft, ChevronRight } from "lucide-react";

const STAGE_OPTIONS = [
  "DUE_NOTIFIED",
  "REVIEWERS_ASSIGNED",
  "SELF_ASSESSMENT_OPEN",
  "REVIEWER_RATING",
  "MANAGEMENT_REVIEW",
  "MEETING_PENDING",
  "MEETING_LIVE",
  "HIKE_FINALISATION",
  "CLOSED",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function MonthYearPicker({
  selectedMonth,
  selectedYear,
  onSelect,
  onClear,
}: {
  selectedMonth?: number;
  selectedYear?: number;
  onSelect: (month: number, year: number) => void;
  onClear: () => void;
}) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(selectedYear ?? now.getFullYear());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const hasSelection = selectedMonth !== undefined && selectedYear !== undefined;
  const label = hasSelection
    ? `${MONTHS[selectedMonth - 1]} ${selectedYear}`
    : "Filter by month";

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-2 border rounded-xl px-3.5 py-2 text-sm transition-all duration-200 whitespace-nowrap",
          hasSelection
            ? "border-[#00cec4] bg-[#00cec4]/10 text-[#00cec4] font-semibold"
            : "border-outline-variant/60 bg-surface text-on-surface-variant hover:border-[#00cec4]/70",
        ].join(" ")}
      >
        <CalendarIcon className="size-4 shrink-0" />
        {label}
        {hasSelection && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onClear(); setOpen(false); }}
            onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onClear(), setOpen(false))}
            className="ml-1.5 hover:text-rose-500 transition-colors"
          >
            <X className="size-3" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-surface border border-outline-variant/70 rounded-xl shadow-lg p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((m, i) => {
              const isSelected = selectedMonth === i + 1 && selectedYear === viewYear;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => { onSelect(i + 1, viewYear); setOpen(false); }}
                  className={[
                    "rounded-lg py-1.5 text-xs font-semibold transition-colors",
                    isSelected
                      ? "bg-[#00cec4] text-white"
                      : "hover:bg-[#00cec4]/10 hover:text-[#00cec4] text-slate-600 dark:text-slate-400",
                  ].join(" ")}
                >
                  {m.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoryFilters({
  defaultQ,
  defaultMonth,
  defaultYear,
  defaultStage,
  showSearch,
}: {
  defaultQ?: string;
  defaultMonth?: string;
  defaultYear?: string;
  defaultStage?: string;
  showSearch?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(defaultQ ?? "");
  const [stage, setStage] = useState(defaultStage ?? "");
  const [month, setMonth] = useState<number | undefined>(
    defaultMonth ? Number(defaultMonth) : undefined,
  );
  const [year, setYear] = useState<number | undefined>(
    defaultYear ? Number(defaultYear) : undefined,
  );

  function push(overrides: { q?: string; stage?: string; month?: number | null; year?: number | null } = {}) {
    const params = new URLSearchParams();
    const sq = overrides.q !== undefined ? overrides.q : q;
    const ss = overrides.stage !== undefined ? overrides.stage : stage;
    const sm = overrides.month !== undefined ? overrides.month : month;
    const sy = overrides.year !== undefined ? overrides.year : year;

    if (sq) params.set("q", sq);
    if (ss) params.set("stage", ss);
    if (sm && sy) {
      params.set("month", String(sm));
      params.set("year", String(sy));
    }
    router.push(`/ams/history?${params.toString()}`);
  }

  function handleDateSelect(m: number, y: number) {
    setMonth(m);
    setYear(y);
    push({ month: m, year: y });
  }

  function handleDateClear() {
    setMonth(undefined);
    setYear(undefined);
    push({ month: null, year: null });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    push();
  }

  function clearAll() {
    setQ("");
    setStage("");
    setMonth(undefined);
    setYear(undefined);
    router.push("/ams/history");
  }

  const hasFilters = q || stage || month;

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-center">
      {showSearch && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name or Emp #"
          className="border border-outline-variant/60 bg-surface rounded-xl px-4 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-[#00cec4]/15 focus:border-[#00cec4]/50 w-48 transition"
        />
      )}

      <MonthYearPicker
        selectedMonth={month}
        selectedYear={year}
        onSelect={handleDateSelect}
        onClear={handleDateClear}
      />

      <select
        value={stage}
        onChange={(e) => setStage(e.target.value)}
        className="border border-outline-variant/60 bg-surface rounded-xl px-4 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-[#00cec4]/15 focus:border-[#00cec4]/50 transition"
      >
        <option value="" className="bg-surface">All Stages</option>
        {STAGE_OPTIONS.map((s) => (
          <option key={s} value={s} className="bg-surface">
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="bg-[#00cec4] text-white font-semibold rounded-xl px-4 py-2 text-sm hover:bg-[#00b8af] transition"
      >
        Filter
      </button>

      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-500 hover:text-rose-600 transition"
        >
          <X className="size-3.5 shrink-0" /> Clear all
        </button>
      )}
    </form>
  );
}
