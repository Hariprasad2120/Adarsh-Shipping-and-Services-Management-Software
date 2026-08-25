"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PeopleControlInput } from "@/modules/people/components";
import { savePayrollScheduleAction } from "@/modules/payroll/schedule-actions";

const DAYS = [
  { value: "MON", label: "Mon" },
  { value: "TUE", label: "Tue" },
  { value: "WED", label: "Wed" },
  { value: "THU", label: "Thu" },
  { value: "FRI", label: "Fri" },
  { value: "SAT", label: "Sat" },
  { value: "SUN", label: "Sun" },
];

export function PayScheduleClient({
  locked,
  workingDays,
  payDayOfMonth,
  firstPayPeriod,
}: {
  locked: boolean;
  workingDays: string[];
  payDayOfMonth: number;
  firstPayPeriod: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [selectedDays, setSelectedDays] = React.useState<string[]>(workingDays);
  const [payDay, setPayDay] = React.useState(String(payDayOfMonth));
  const [firstPeriod, setFirstPeriod] = React.useState(firstPayPeriod);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await savePayrollScheduleAction({
        workingDays: selectedDays,
        payDayOfMonth: Number(payDay),
        firstPayPeriod: firstPeriod,
      });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Pay schedule saved");
      setEditing(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">Pay Frequency</div>
          <div className="mt-0.5 text-sm text-[var(--mnx-text)]">Every month</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">Working Days</div>
          <div className="mt-0.5 text-sm text-[var(--mnx-text)]">
            {workingDays.map((d) => DAYS.find((x) => x.value === d)?.label ?? d).join(", ")}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">Pay Day</div>
          <div className="mt-0.5 text-sm text-[var(--mnx-text)]">
            {payDayOfMonth === 1 ? "1st" : `${payDayOfMonth}th`} of every month
            {!locked ? (
              // eslint-disable-next-line no-restricted-syntax -- inline text-style link action, not a standard button
              <button type="button" className="ml-2 text-xs font-medium text-[var(--mnx-accent-strong)]" onClick={() => setEditing(true)}>
                (Change)
              </button>
            ) : null}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">First Pay Period</div>
          <div className="mt-0.5 text-sm text-[var(--mnx-text)]">
            {new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(firstPayPeriod))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-[var(--mnx-text)]">Working Days</legend>
        <div className="flex flex-wrap gap-3 text-sm">
          {DAYS.map((day) => (
            <label key={day.value} className="flex items-center gap-1.5">
              {/* eslint-disable-next-line no-restricted-syntax -- multi-select day toggle group, not a text field */}
              <input
                type="checkbox"
                checked={selectedDays.includes(day.value)}
                onChange={(e) =>
                  setSelectedDays((prev) =>
                    e.target.checked ? [...prev, day.value] : prev.filter((d) => d !== day.value),
                  )
                }
              />
              {day.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block max-w-xs space-y-1 text-sm">
        <span className="font-medium text-[var(--mnx-text)]">Pay Day (day of month)</span>
        <PeopleControlInput type="number" min={1} max={28} value={payDay} onChange={(e) => setPayDay(e.target.value)} />
      </label>
      <label className="block max-w-xs space-y-1 text-sm">
        <span className="font-medium text-[var(--mnx-text)]">First Pay Period</span>
        <PeopleControlInput type="month" value={firstPeriod.slice(0, 7)} onChange={(e) => setFirstPeriod(`${e.target.value}-01`)} />
      </label>
      <div className="flex gap-2">
        <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="inverse" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
