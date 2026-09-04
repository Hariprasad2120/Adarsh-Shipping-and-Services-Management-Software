"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Plus, Trash2 } from "lucide-react";
import { toast } from "@/modules/notifications/client";
import { WorkspaceAlert, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { Button } from "@/components/ui/button";
import { PeopleControlInput } from "@/modules/people/components";
import {
  updateTerminationDraftAction,
  finalizeTerminationDraftAction,
  discardTerminationDraftAction,
} from "@/modules/hrms/termination-actions";
import type { TerminationDraftEntry } from "@/modules/hrms/termination-payroll";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}
function toDateInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

const EARNING_FIELDS: Array<{ key: keyof TerminationDraftEntry; label: string }> = [
  { key: "bonus", label: "Bonus" },
  { key: "stipend", label: "Stipend" },
  { key: "overtime", label: "Overtime" },
  { key: "leaveEncashment", label: "Leave Encashment" },
  { key: "incentives", label: "Incentives" },
  { key: "gratuity", label: "Gratuity" },
];

// Phase 34: Zoho reference page 00068 — termination pre-finalize Edit screen.
// Renders one card per selected employee (Pay Period/Base Days/Payable
// Days/+Add LOP/+Adjust Past LOP/Additional Earnings/Deductions/Notice Pay),
// plus a shared Pay Date and Notes for the whole draft. Reset restores the
// last-saved values; Save Draft persists without posting; Save and Continue
// finalizes into a real, GL-posted PayrollBatch.
export function TerminationDraftEditClient({
  draftId,
  payDate: initialPayDate,
  notes: initialNotes,
  entries: initialEntries,
}: {
  draftId: string;
  payDate: string | null;
  notes: string | null;
  entries: TerminationDraftEntry[];
}) {
  const router = useRouter();
  const [payDate, setPayDate] = React.useState(toDateInput(initialPayDate));
  const [notes, setNotes] = React.useState(initialNotes ?? "");
  const [entries, setEntries] = React.useState<TerminationDraftEntry[]>(initialEntries);
  const [lopOpen, setLopOpen] = React.useState<Record<string, boolean>>({});
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [isFinalizing, setIsFinalizing] = React.useState(false);
  const [isDiscarding, setIsDiscarding] = React.useState(false);

  function updateEntry(employeeId: string, patch: Partial<TerminationDraftEntry>) {
    setEntries((prev) => prev.map((e) => (e.employeeId === employeeId ? { ...e, ...patch } : e)));
  }

  function handleReset() {
    setPayDate(toDateInput(initialPayDate));
    setNotes(initialNotes ?? "");
    setEntries(initialEntries);
    toast.info("Reverted to the last saved draft.");
  }

  async function handleSaveDraft() {
    setIsSavingDraft(true);
    try {
      const response = await updateTerminationDraftAction(draftId, { payDate: payDate || undefined, notes, entries });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Draft saved.");
      router.refresh();
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleSaveAndContinue() {
    setIsFinalizing(true);
    try {
      const saveResponse = await updateTerminationDraftAction(draftId, { payDate: payDate || undefined, notes, entries });
      if (!saveResponse.ok) {
        toast.error(saveResponse.error);
        return;
      }
      await finalizeTerminationDraftAction(draftId);
      // finalizeTerminationDraftAction calls redirect() on success, which
      // Next.js implements by throwing a special error (digest starting
      // "NEXT_REDIRECT") that the framework intercepts to perform the
      // navigation — it must be rethrown, not swallowed as a real error.
    } catch (error) {
      const digest = (error as { digest?: string } | null)?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw error;
      toast.error(error instanceof Error ? error.message : "Failed to finalize settlement");
    } finally {
      setIsFinalizing(false);
    }
  }

  async function handleDiscard() {
    setIsDiscarding(true);
    try {
      const response = await discardTerminationDraftAction(draftId);
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Draft discarded.");
      router.push("/payroll/pay-runs");
    } finally {
      setIsDiscarding(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/pay-runs"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Pay Runs
      </Link>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title={entries.length > 1 ? "Edit Bulk Termination Payroll" : "Edit Final Settlement Payroll"}
          description="Review Pay Date, days, earnings, deductions and notice pay before finalizing."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Pay Date</span>
            <PeopleControlInput type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Notes</span>
            <PeopleControlInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes for this settlement" />
          </label>
        </div>
      </WorkspacePanel>

      {entries.map((entry) => (
        <WorkspacePanel key={entry.employeeId} className="space-y-4 p-5">
          <div>
            <h3 className="text-base font-semibold text-[var(--mnx-text)]">
              {entry.employeeName} <span className="text-xs font-normal text-[var(--mnx-muted)]">#{entry.employeeNumber}</span>
            </h3>
            <p className="text-xs text-[var(--mnx-muted)]">
              Last Day of Work: {formatDate(entry.lastWorkingDay)} | Pay Period: {formatDate(entry.lastWorkingDay)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-[var(--mnx-text)]">Base Days</span>
              <PeopleControlInput
                type="number"
                value={String(entry.baseDays)}
                onChange={(e) => updateEntry(entry.employeeId, { baseDays: Number(e.target.value) || 0 })}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-[var(--mnx-text)]">Payable Days</span>
              <PeopleControlInput
                type="number"
                value={String(entry.payableDays)}
                onChange={(e) => updateEntry(entry.employeeId, { payableDays: Number(e.target.value) || 0 })}
              />
            </label>
            <div className="space-y-1 text-sm">
              {/* eslint-disable-next-line no-restricted-syntax -- inline expand toggle, not a standard action button */}
              <button
                type="button"
                onClick={() => setLopOpen((prev) => ({ ...prev, [entry.employeeId]: !prev[entry.employeeId] }))}
                className="flex items-center gap-1 font-medium text-[var(--mnx-accent-strong)]"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add LOP
                <ChevronDown
                  className={`size-3.5 transition-transform ${lopOpen[entry.employeeId] ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {lopOpen[entry.employeeId] ? (
                <PeopleControlInput
                  type="number"
                  value={String(entry.lopDays)}
                  onChange={(e) => updateEntry(entry.employeeId, { lopDays: Number(e.target.value) || 0 })}
                  placeholder="LOP days"
                />
              ) : null}
              <p className="pt-1 text-xs text-[var(--mnx-muted)]" title="No separate past-period LOP register exists for exited employees in this system yet.">
                + Adjust Past LOP — not supported yet
              </p>
            </div>
          </div>

          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mnx-success)]">Additional Earnings</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {EARNING_FIELDS.map((field) => (
                <label key={String(field.key)} className="block space-y-1 text-sm">
                  <span className="text-[var(--mnx-text)]">{field.label}</span>
                  <PeopleControlInput
                    type="number"
                    value={String(entry[field.key] as number)}
                    onChange={(e) => updateEntry(entry.employeeId, { [field.key]: Number(e.target.value) || 0 } as Partial<TerminationDraftEntry>)}
                  />
                </label>
              ))}
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mnx-danger)]">Deductions</p>
            <div className="mt-2 space-y-2">
              {entry.deductions.map((d, index) => (
                <div key={index} className="flex items-center gap-2">
                  <PeopleControlInput
                    value={d.label}
                    placeholder="Label"
                    onChange={(e) => {
                      const next = entry.deductions.map((row, i) => (i === index ? { ...row, label: e.target.value } : row));
                      updateEntry(entry.employeeId, { deductions: next });
                    }}
                    className="flex-1"
                  />
                  <PeopleControlInput
                    type="number"
                    value={String(d.amount)}
                    placeholder="Amount"
                    onChange={(e) => {
                      const next = entry.deductions.map((row, i) => (i === index ? { ...row, amount: Number(e.target.value) || 0 } : row));
                      updateEntry(entry.employeeId, { deductions: next });
                    }}
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    mode="icon"
                    onClick={() => updateEntry(entry.employeeId, { deductions: entry.deductions.filter((_, i) => i !== index) })}
                    aria-label="Remove deduction"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="inverse"
                size="sm"
                onClick={() => updateEntry(entry.employeeId, { deductions: [...entry.deductions, { label: "", amount: 0 }] })}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add Deduction
              </Button>
            </div>
          </section>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-[var(--mnx-muted)]">Notice Pay</legend>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {(["NONE", "PAY", "RECOVER"] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-2">
                  {/* eslint-disable-next-line no-restricted-syntax -- native radio group, not a text field */}
                  <input
                    type="radio"
                    checked={(entry.noticePay?.mode ?? "NONE") === mode}
                    onChange={() =>
                      updateEntry(entry.employeeId, {
                        noticePay: mode === "NONE" ? null : { mode, amount: entry.noticePay?.amount ?? 0 },
                      })
                    }
                  />
                  {mode === "NONE" ? "None" : mode === "PAY" ? "Pay in lieu" : "Recover from employee"}
                </label>
              ))}
              {entry.noticePay ? (
                <PeopleControlInput
                  type="number"
                  value={String(entry.noticePay.amount)}
                  onChange={(e) =>
                    updateEntry(entry.employeeId, {
                      noticePay: { mode: entry.noticePay!.mode, amount: Number(e.target.value) || 0 },
                    })
                  }
                  placeholder="Amount"
                  className="w-32"
                />
              ) : null}
            </div>
          </fieldset>
        </WorkspacePanel>
      ))}

      <WorkspaceAlert variant="info">
        Statutory deduction recompute on the prorated amount is not applied here — additional
        earnings/deductions post as entered (Phase 26 work). &quot;Save Draft&quot; keeps this on the
        draft table only; nothing is posted to Accounting until &quot;Save and Continue&quot;.
      </WorkspaceAlert>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={handleDiscard} disabled={isDiscarding}>
          {isDiscarding ? "Discarding…" : "Discard Draft"}
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button type="button" variant="inverse" onClick={() => void handleSaveDraft()} disabled={isSavingDraft}>
            {isSavingDraft ? "Saving…" : "Save Draft"}
          </Button>
          <Button type="button" onClick={() => void handleSaveAndContinue()} disabled={isFinalizing}>
            {isFinalizing ? "Finalizing…" : "Save and Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
