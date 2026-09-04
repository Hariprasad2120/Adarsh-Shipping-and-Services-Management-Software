"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/modules/notifications/client";
import {
  PeopleErrorState,
  PeopleLoadingState,
  PeopleSection,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableEmpty,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import { WorkspaceAction, WorkspaceAlert, WorkspaceBadge, WorkspaceField, WorkspaceInput, WorkspaceSectionHeading, WorkspaceSelect, WorkspaceTextarea } from "@/components/layout/workspace";
import { Modal } from "@/components/ui/modal";
import { fetchJson } from "./shared";

type CrmAccountOption = { id: string; name: string };
type EmployeeOption = { id: string; name: string; designation?: string | null };

type Visit = {
  id: string;
  status: string;
  visitType: string;
  arrivalAt: string | null;
  startAt: string | null;
  endAt: string | null;
  durationMinutes: number | null;
  locationConfidence: string;
  account: { id: string; name: string } | null;
  employee: { id: string; name: string } | null;
};

const STATUS_VARIANT: Record<string, "success" | "accent" | "warning" | "danger" | "neutral"> = {
  DETECTED: "warning",
  CONFIRMED: "accent",
  IN_PROGRESS: "accent",
  COMPLETED: "success",
  DISMISSED: "neutral",
};

export function VisitsTab() {
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [readyForConfirmation, setReadyForConfirmation] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<CrmAccountOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [form, setForm] = useState({ userId: "", crmAccountId: "", purpose: "", contactPerson: "", notes: "", scheduledAt: "" });
  const [completingVisit, setCompletingVisit] = useState<Visit | null>(null);
  const [completeForm, setCompleteForm] = useState({ outcome: "", notes: "", followUpAt: "" });
  const [completing, setCompleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchJson<{ visits: Visit[]; readyForConfirmation: string[] }>("/api/hrms/location-tracking/visits");
      setVisits(data.visits);
      setReadyForConfirmation(data.readyForConfirmation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load visits");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(load, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    fetchJson<CrmAccountOption[]>("/api/hrms/location-tracking/crm-accounts").then(setAccounts).catch(() => setAccounts([]));
    fetchJson<EmployeeOption[]>("/api/hrms/employees?active=true").then(setEmployees).catch(() => setEmployees([]));
  }, [modalOpen]);

  async function submit() {
    if (!form.userId || !form.crmAccountId) {
      toast.error("Employee and customer are required.");
      return;
    }
    setSaving(true);
    try {
      await fetchJson("/api/hrms/location-tracking/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: form.userId,
          crmAccountId: form.crmAccountId,
          purpose: form.purpose || undefined,
          contactPerson: form.contactPerson || undefined,
          notes: form.notes || undefined,
          scheduledAt: form.scheduledAt || undefined,
        }),
      });
      toast.success("Visit planned");
      setModalOpen(false);
      setForm({ userId: "", crmAccountId: "", purpose: "", contactPerson: "", notes: "", scheduledAt: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create visit");
    } finally {
      setSaving(false);
    }
  }

  async function act(id: string, action: "confirm" | "dismiss") {
    try {
      await fetchJson(`/api/hrms/location-tracking/visits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      toast.success(action === "confirm" ? "Visit confirmed" : "Visit dismissed");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  async function submitCompletion() {
    if (!completingVisit) return;
    setCompleting(true);
    try {
      await fetchJson(`/api/hrms/location-tracking/visits/${completingVisit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          outcome: completeForm.outcome || undefined,
          notes: completeForm.notes || undefined,
          followUpAt: completeForm.followUpAt || undefined,
        }),
      });
      toast.success("Visit completed");
      setCompletingVisit(null);
      setCompleteForm({ outcome: "", notes: "", followUpAt: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete visit");
    } finally {
      setCompleting(false);
    }
  }

  if (error && !visits) return <PeopleErrorState description={error} onRetry={load} />;
  if (!visits) return <PeopleLoadingState description="Loading customer visits." />;

  return (
    <PeopleSection>
      <WorkspaceSectionHeading
        index="01"
        title="Customer Visits"
        description="Auto-detected from customer geofence dwell time (never silently promoted to a verified meeting) plus manager-planned visits."
        actions={
          <WorkspaceAction size="compact" onClick={() => setModalOpen(true)}>
            New visit
          </WorkspaceAction>
        }
      />

      {readyForConfirmation.length > 0 ? (
        <WorkspaceAlert variant="warning">
          {readyForConfirmation.length} possible visit{readyForConfirmation.length === 1 ? "" : "s"} detected from GPS dwell time and awaiting confirmation below.
        </WorkspaceAlert>
      ) : null}

      <PeopleTable>
        <PeopleTableHeader>
          <PeopleTableRow>
            <PeopleTableHead>Employee</PeopleTableHead>
            <PeopleTableHead>Customer</PeopleTableHead>
            <PeopleTableHead>Type</PeopleTableHead>
            <PeopleTableHead>Status</PeopleTableHead>
            <PeopleTableHead>Arrival</PeopleTableHead>
            <PeopleTableHead>Duration</PeopleTableHead>
            <PeopleTableHead>Confidence</PeopleTableHead>
            <PeopleTableHead>Actions</PeopleTableHead>
          </PeopleTableRow>
        </PeopleTableHeader>
        <PeopleTableBody>
          {visits.length === 0 ? (
            <PeopleTableEmpty colSpan={8} message="No customer visits yet. Visits appear here once a field employee enters a customer geofence, or a manager logs a planned visit." />
          ) : (
            visits.map((v) => (
              <PeopleTableRow key={v.id}>
                <PeopleTableCell>{v.employee?.name ?? "—"}</PeopleTableCell>
                <PeopleTableCell>{v.account?.name ?? "—"}</PeopleTableCell>
                <PeopleTableCell>{v.visitType}</PeopleTableCell>
                <PeopleTableCell>
                  <WorkspaceBadge variant={STATUS_VARIANT[v.status] ?? "neutral"}>{v.status.replace(/_/g, " ")}</WorkspaceBadge>
                </PeopleTableCell>
                <PeopleTableCell>{v.arrivalAt ? new Date(v.arrivalAt).toLocaleString() : "—"}</PeopleTableCell>
                <PeopleTableCell>{v.durationMinutes != null ? `${v.durationMinutes} min` : "—"}</PeopleTableCell>
                <PeopleTableCell>{v.locationConfidence}</PeopleTableCell>
                <PeopleTableCell className="min-w-36">
                  <div className="flex flex-col items-start gap-1.5">
                    {v.status === "DETECTED" ? (
                      <>
                        <WorkspaceAction className="whitespace-nowrap" variant="outline" size="compact" onClick={() => act(v.id, "confirm")}>
                          Create Visit
                        </WorkspaceAction>
                        <WorkspaceAction className="whitespace-nowrap" variant="outline" size="compact" onClick={() => act(v.id, "dismiss")}>
                          Not a Visit
                        </WorkspaceAction>
                      </>
                    ) : null}
                    {v.status === "IN_PROGRESS" || v.status === "CONFIRMED" ? (
                      <WorkspaceAction className="whitespace-nowrap" variant="outline" size="compact" onClick={() => setCompletingVisit(v)}>
                        Complete
                      </WorkspaceAction>
                    ) : null}
                  </div>
                </PeopleTableCell>
              </PeopleTableRow>
            ))
          )}
        </PeopleTableBody>
      </PeopleTable>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New customer visit" eyebrow="Location & Field Tracking">
        <div className="flex flex-col gap-4">
          <WorkspaceField label="Employee" htmlFor="visit-employee" required>
            <WorkspaceSelect id="visit-employee" value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}>
              <option value="">— select employee —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.designation ? ` (${e.designation})` : ""}
                </option>
              ))}
            </WorkspaceSelect>
          </WorkspaceField>
          <WorkspaceField label="Customer" htmlFor="visit-account" required>
            <WorkspaceSelect id="visit-account" value={form.crmAccountId} onChange={(e) => setForm((f) => ({ ...f, crmAccountId: e.target.value }))}>
              <option value="">— select customer —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </WorkspaceSelect>
          </WorkspaceField>
          <WorkspaceField label="Scheduled at" htmlFor="visit-scheduled" hint="Optional — leave blank for an unscheduled plan.">
            <WorkspaceInput id="visit-scheduled" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} />
          </WorkspaceField>
          <WorkspaceField label="Purpose" htmlFor="visit-purpose">
            <WorkspaceInput id="visit-purpose" placeholder="e.g. Contract renewal discussion" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} />
          </WorkspaceField>
          <WorkspaceField label="Contact person" htmlFor="visit-contact">
            <WorkspaceInput id="visit-contact" value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} />
          </WorkspaceField>
          <WorkspaceField label="Notes" htmlFor="visit-notes">
            <WorkspaceTextarea id="visit-notes" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </WorkspaceField>
          <div className="flex justify-end gap-2">
            <WorkspaceAction variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </WorkspaceAction>
            <WorkspaceAction onClick={submit} disabled={saving}>
              {saving ? "Saving…" : "Create visit"}
            </WorkspaceAction>
          </div>
        </div>
      </Modal>

      <Modal
        open={completingVisit != null}
        onClose={() => setCompletingVisit(null)}
        title={`Complete visit${completingVisit?.account ? ` — ${completingVisit.account.name}` : ""}`}
        eyebrow="Location & Field Tracking"
      >
        <div className="flex flex-col gap-4">
          <WorkspaceField label="Outcome" htmlFor="visit-outcome">
            <WorkspaceInput id="visit-outcome" placeholder="e.g. Renewed for 12 months" value={completeForm.outcome} onChange={(e) => setCompleteForm((f) => ({ ...f, outcome: e.target.value }))} />
          </WorkspaceField>
          <WorkspaceField label="Notes" htmlFor="visit-complete-notes">
            <WorkspaceTextarea id="visit-complete-notes" rows={3} value={completeForm.notes} onChange={(e) => setCompleteForm((f) => ({ ...f, notes: e.target.value }))} />
          </WorkspaceField>
          <WorkspaceField label="Follow-up date" htmlFor="visit-followup" hint="Optional.">
            <WorkspaceInput id="visit-followup" type="datetime-local" value={completeForm.followUpAt} onChange={(e) => setCompleteForm((f) => ({ ...f, followUpAt: e.target.value }))} />
          </WorkspaceField>
          <div className="flex justify-end gap-2">
            <WorkspaceAction variant="outline" onClick={() => setCompletingVisit(null)} disabled={completing}>
              Cancel
            </WorkspaceAction>
            <WorkspaceAction onClick={submitCompletion} disabled={completing}>
              {completing ? "Saving…" : "Mark completed"}
            </WorkspaceAction>
          </div>
        </div>
      </Modal>
    </PeopleSection>
  );
}
