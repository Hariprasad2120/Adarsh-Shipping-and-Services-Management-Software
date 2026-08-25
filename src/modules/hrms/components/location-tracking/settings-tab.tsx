"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
import { WorkspaceAction, WorkspaceAlert, WorkspaceBadge, WorkspaceField, WorkspaceInput, WorkspaceSectionHeading, WorkspaceSelect } from "@/components/layout/workspace";
import { Modal } from "@/components/ui/modal";
import { fetchJson } from "./shared";

type Policy = {
  id: string | null;
  scopeType: string;
  scopeId: string | null;
  trackingEnabled: boolean;
  normalIntervalMinutes: number;
  movingIntervalMinutes: number;
  stationaryIntervalMinutes: number;
  liveSalesIntervalSeconds: number;
  visitIntervalMinutes: number;
  staleThresholdMinutes: number;
  offlineThresholdMinutes: number;
  consecutiveFailureLimit: number;
  autoCheckoutOnFailure: boolean;
};

type EmployeeOption = { id: string; name: string; designation?: string | null };

const POLICY_DEFAULTS = {
  trackingEnabled: true,
  normalIntervalMinutes: 5,
  movingIntervalMinutes: 1,
  stationaryIntervalMinutes: 5,
  liveSalesIntervalSeconds: 30,
  visitIntervalMinutes: 3,
  staleThresholdMinutes: 10,
  offlineThresholdMinutes: 30,
  consecutiveFailureLimit: 5,
  autoCheckoutOnFailure: false,
};

const FIELDS: Array<{ key: keyof typeof POLICY_DEFAULTS; label: string; hint?: string }> = [
  { key: "normalIntervalMinutes", label: "Normal capture interval (min)" },
  { key: "movingIntervalMinutes", label: "Moving capture interval (min)" },
  { key: "stationaryIntervalMinutes", label: "Stationary capture interval (min)" },
  { key: "liveSalesIntervalSeconds", label: "Live sales capture interval (sec)" },
  { key: "visitIntervalMinutes", label: "Customer-visit capture interval (min)" },
  { key: "staleThresholdMinutes", label: "Stale threshold (min)" },
  { key: "offlineThresholdMinutes", label: "Offline threshold (min)" },
  { key: "consecutiveFailureLimit", label: "Consecutive failures before alert" },
];

export function SettingsTab() {
  const [policies, setPolicies] = useState<Policy[] | null>(null);
  const [orgPolicy, setOrgPolicy] = useState<Policy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeNames, setEmployeeNames] = useState<Map<string, string>>(new Map());
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ userId: "", ...POLICY_DEFAULTS });

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchJson<Policy[]>("/api/hrms/location-tracking/policies");
      setPolicies(data);
      const org = data.find((p) => p.scopeType === "ORG");
      setOrgPolicy(org ?? { id: null, scopeType: "ORG", scopeId: null, ...POLICY_DEFAULTS });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tracking policy");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(load, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    if (!overrideModalOpen) return;
    fetchJson<EmployeeOption[]>("/api/hrms/employees?active=true").then(setEmployees).catch(() => setEmployees([]));
  }, [overrideModalOpen]);

  // Resolve EMPLOYEE-scoped policies' scopeId (a userId) to a display name for the table below.
  useEffect(() => {
    const employeeScoped = (policies ?? []).filter((p) => p.scopeType === "EMPLOYEE" && p.scopeId);
    if (employeeScoped.length === 0) return;
    fetchJson<EmployeeOption[]>("/api/hrms/employees?active=true")
      .then((list) => setEmployeeNames(new Map(list.map((e) => [e.id, e.name]))))
      .catch(() => {});
  }, [policies]);

  async function save() {
    if (!orgPolicy) return;
    setSaving(true);
    try {
      const { id: _id, scopeId: _scopeId, scopeType: _scopeType, ...settings } = orgPolicy;
      await fetchJson("/api/hrms/location-tracking/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopeType: "ORG", scopeId: null, ...settings }),
      });
      toast.success("Tracking policy saved");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save policy");
    } finally {
      setSaving(false);
    }
  }

  async function saveOverride() {
    if (!overrideForm.userId) {
      toast.error("Select an employee.");
      return;
    }
    setOverrideSaving(true);
    try {
      const { userId, ...settings } = overrideForm;
      await fetchJson("/api/hrms/location-tracking/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopeType: "EMPLOYEE", scopeId: userId, ...settings }),
      });
      toast.success("Employee policy override saved");
      setOverrideModalOpen(false);
      setOverrideForm({ userId: "", ...POLICY_DEFAULTS });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save override");
    } finally {
      setOverrideSaving(false);
    }
  }

  if (error && !orgPolicy) return <PeopleErrorState description={error} onRetry={load} />;
  if (!orgPolicy || !policies) return <PeopleLoadingState description="Loading tracking settings." />;

  const scopedPolicies = policies.filter((p) => p.scopeType !== "ORG");

  return (
    <div className="flex flex-col gap-6">
      <PeopleSection>
        <WorkspaceSectionHeading
          index="01"
          title="Organization tracking policy"
          description="Capture intervals and thresholds applied org-wide unless a more specific branch/department/designation/employee policy overrides them."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIELDS.map((f) => (
            <WorkspaceField key={f.key} label={f.label} htmlFor={f.key}>
              <WorkspaceInput
                id={f.key}
                type="number"
                min={0}
                value={orgPolicy[f.key] as number}
                onChange={(e) => setOrgPolicy((p) => (p ? { ...p, [f.key]: Number(e.target.value) } : p))}
              />
            </WorkspaceField>
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={orgPolicy.autoCheckoutOnFailure}
            onChange={(e) => setOrgPolicy((p) => (p ? { ...p, autoCheckoutOnFailure: e.target.checked } : p))}
          />
          Auto-checkout employee after consecutive capture failures (disabled by default — enable only if this matches an existing business rule)
        </label>
        <div className="mt-4">
          <WorkspaceAction onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save policy"}
          </WorkspaceAction>
        </div>
      </PeopleSection>

      <PeopleSection>
        <WorkspaceSectionHeading
          index="02"
          title="Scoped policy overrides"
          description="Employee-specific overrides take priority over the org policy. Branch/department/designation scoping is supported by the API and data model but has no picker here yet — this org doesn't currently expose a branch/department list API for the UI to reuse."
          actions={
            <WorkspaceAction size="compact" onClick={() => setOverrideModalOpen(true)}>
              Add employee override
            </WorkspaceAction>
          }
        />
        <PeopleTable>
          <PeopleTableHeader>
            <PeopleTableRow>
              <PeopleTableHead>Scope</PeopleTableHead>
              <PeopleTableHead>Tracking</PeopleTableHead>
              <PeopleTableHead>Normal / Moving / Live sales</PeopleTableHead>
              <PeopleTableHead>Stale / Offline</PeopleTableHead>
              <PeopleTableHead>Status</PeopleTableHead>
            </PeopleTableRow>
          </PeopleTableHeader>
          <PeopleTableBody>
            {scopedPolicies.length === 0 ? (
              <PeopleTableEmpty colSpan={5} message="No scoped overrides configured — every employee follows the org policy above." />
            ) : (
              scopedPolicies.map((p) => (
                <PeopleTableRow key={p.id}>
                  <PeopleTableCell>
                    {p.scopeType}
                    {p.scopeType === "EMPLOYEE" && p.scopeId ? ` — ${employeeNames.get(p.scopeId) ?? p.scopeId}` : ""}
                  </PeopleTableCell>
                  <PeopleTableCell>{p.trackingEnabled ? "Enabled" : "Disabled"}</PeopleTableCell>
                  <PeopleTableCell>
                    {p.normalIntervalMinutes}m / {p.movingIntervalMinutes}m / {p.liveSalesIntervalSeconds}s
                  </PeopleTableCell>
                  <PeopleTableCell>
                    {p.staleThresholdMinutes}m / {p.offlineThresholdMinutes}m
                  </PeopleTableCell>
                  <PeopleTableCell>
                    <WorkspaceBadge variant="accent">Active</WorkspaceBadge>
                  </PeopleTableCell>
                </PeopleTableRow>
              ))
            )}
          </PeopleTableBody>
        </PeopleTable>
      </PeopleSection>

      <PeopleSection>
        <WorkspaceSectionHeading index="03" title="Remaining dependencies" description="Honest status of what this module still needs to reach the full spec." />
        <div className="flex flex-col gap-3">
          <WorkspaceAlert variant="success">
            <strong>Interactive map:</strong> Leaflet + OpenStreetMap tiles are wired into Overview (employee markers colour-coded by freshness) and Geofences (existing geofences drawn as circles, plus click-drag to draw a new one). No API key needed. Polygon-shaped geofences are supported by the data model but not yet drawable on the map — the draw tool creates circles only.
          </WorkspaceAlert>
          <WorkspaceAlert variant="info">
            <strong>Mobile capture client:</strong> adaptive capture frequency, offline queueing, device health diagnostics, and mock-location detection are policy/data-model ready (LocationTrackingPolicy, LocationPoint.isMocked, TrackingAlert) but require the mobile app to actually honor the new interval fields and push failure diagnostics — that app isn&apos;t in this repository.
          </WorkspaceAlert>
          <WorkspaceAlert variant="info">
            <strong>Route planning, deviation detection, sales territories, heatmaps:</strong> not built this pass — they need a planned-route/territory data model this change intentionally kept out of scope to avoid over-building speculative structure. Customer visits, geofences, and exceptions (the load-bearing pieces) are implemented and working.
          </WorkspaceAlert>
        </div>
      </PeopleSection>

      <Modal open={overrideModalOpen} onClose={() => setOverrideModalOpen(false)} title="Add employee tracking-policy override" eyebrow="Location & Field Tracking" size="wide">
        <div className="flex flex-col gap-4">
          <WorkspaceField label="Employee" htmlFor="override-employee" required>
            <WorkspaceSelect id="override-employee" value={overrideForm.userId} onChange={(e) => setOverrideForm((f) => ({ ...f, userId: e.target.value }))}>
              <option value="">— select employee —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.designation ? ` (${e.designation})` : ""}
                </option>
              ))}
            </WorkspaceSelect>
          </WorkspaceField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS.map((f) => (
              <WorkspaceField key={f.key} label={f.label} htmlFor={`override-${f.key}`}>
                <WorkspaceInput
                  id={`override-${f.key}`}
                  type="number"
                  min={0}
                  value={overrideForm[f.key] as number}
                  onChange={(e) => setOverrideForm((form) => ({ ...form, [f.key]: Number(e.target.value) }))}
                />
              </WorkspaceField>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <WorkspaceAction variant="outline" onClick={() => setOverrideModalOpen(false)} disabled={overrideSaving}>
              Cancel
            </WorkspaceAction>
            <WorkspaceAction onClick={saveOverride} disabled={overrideSaving}>
              {overrideSaving ? "Saving…" : "Save override"}
            </WorkspaceAction>
          </div>
        </div>
      </Modal>
    </div>
  );
}
