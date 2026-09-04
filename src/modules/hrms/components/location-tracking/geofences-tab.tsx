"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
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
import { WorkspaceAction, WorkspaceBadge, WorkspaceField, WorkspaceInput, WorkspaceSectionHeading, WorkspaceSelect } from "@/components/layout/workspace";
import { Modal } from "@/components/ui/modal";
import { fetchJson } from "./shared";
import type { DraftCircle } from "./geofence-map";

const GeofenceMap = dynamic(() => import("./geofence-map").then((m) => m.GeofenceMap), { ssr: false });

type Geofence = {
  id: string;
  name: string;
  type: string;
  shape: string;
  centerLat: number | null;
  centerLng: number | null;
  radiusMeters: number | null;
  address: string | null;
  isActive: boolean;
  crmAccountId: string | null;
  dwellMinutesForVisit: number;
};

type CrmAccountOption = { id: string; name: string; geoLatitude: number | null; geoLongitude: number | null; geoVisitRadiusMeters: number | null };

const GEOFENCE_TYPES = ["OFFICE", "BRANCH", "WAREHOUSE", "PORT", "CFS", "CUSTOMER", "TEMP_WORKSITE", "SALES_TERRITORY", "RESTRICTED_ZONE"];

export function GeofencesTab() {
  const [geofences, setGeofences] = useState<Geofence[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<CrmAccountOption[]>([]);
  const [form, setForm] = useState({
    name: "",
    type: "CUSTOMER",
    centerLat: "",
    centerLng: "",
    radiusMeters: "150",
    address: "",
    crmAccountId: "",
    dwellMinutesForVisit: "3",
  });
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<DraftCircle>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchJson<Geofence[]>("/api/hrms/location-tracking/geofences");
      setGeofences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load geofences");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(load, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    fetchJson<CrmAccountOption[]>("/api/hrms/location-tracking/crm-accounts").then(setAccounts).catch(() => setAccounts([]));
  }, [modalOpen]);

  function handleDraft(next: DraftCircle) {
    setDraft(next);
    if (!next) return;
    setForm((f) => ({
      ...f,
      centerLat: next.lat.toFixed(6),
      centerLng: next.lng.toFixed(6),
      radiusMeters: next.radiusMeters > 0 ? String(next.radiusMeters) : f.radiusMeters,
    }));
  }

  function applyAccountGeo(accountId: string) {
    const account = accounts.find((a) => a.id === accountId);
    setForm((f) => ({
      ...f,
      crmAccountId: accountId,
      centerLat: account?.geoLatitude != null ? String(account.geoLatitude) : f.centerLat,
      centerLng: account?.geoLongitude != null ? String(account.geoLongitude) : f.centerLng,
      radiusMeters: account?.geoVisitRadiusMeters != null ? String(account.geoVisitRadiusMeters) : f.radiusMeters,
    }));
  }

  async function submit() {
    if (!form.name || !form.centerLat || !form.centerLng || !form.radiusMeters) {
      toast.error("Name, latitude, longitude and radius are required.");
      return;
    }
    setSaving(true);
    try {
      await fetchJson("/api/hrms/location-tracking/geofences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          shape: "CIRCLE",
          centerLat: Number(form.centerLat),
          centerLng: Number(form.centerLng),
          radiusMeters: Number(form.radiusMeters),
          address: form.address || undefined,
          crmAccountId: form.type === "CUSTOMER" && form.crmAccountId ? form.crmAccountId : undefined,
          dwellMinutesForVisit: Number(form.dwellMinutesForVisit) || 3,
        }),
      });
      toast.success("Geofence created");
      setModalOpen(false);
      setForm({ name: "", type: "CUSTOMER", centerLat: "", centerLng: "", radiusMeters: "150", address: "", crmAccountId: "", dwellMinutesForVisit: "3" });
      setDraft(null);
      setDrawing(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create geofence");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: string) {
    try {
      await fetchJson(`/api/hrms/location-tracking/geofences/${id}`, { method: "DELETE" });
      toast.success("Geofence deactivated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate geofence");
    }
  }

  if (error && !geofences) return <PeopleErrorState description={error} onRetry={load} />;
  if (!geofences) return <PeopleLoadingState description="Loading geofences." />;

  return (
    <PeopleSection>
      <WorkspaceSectionHeading
        index="01"
        title="Geofences"
        description="Circular geofences for offices, branches, warehouses, ports, CFS, customers, worksites, sales territories and restricted zones. The data model also supports polygon shapes; the draw tool currently creates circles only."
        actions={
          <WorkspaceAction size="compact" onClick={() => setModalOpen(true)}>
            New geofence
          </WorkspaceAction>
        }
      />

      <div className="mb-4">
        <GeofenceMap existing={geofences} drawing={false} draft={null} onDraftChange={() => {}} />
      </div>

      <PeopleTable>
        <PeopleTableHeader>
          <PeopleTableRow>
            <PeopleTableHead>Name</PeopleTableHead>
            <PeopleTableHead>Type</PeopleTableHead>
            <PeopleTableHead>Radius</PeopleTableHead>
            <PeopleTableHead>Address</PeopleTableHead>
            <PeopleTableHead>Status</PeopleTableHead>
            <PeopleTableHead>Actions</PeopleTableHead>
          </PeopleTableRow>
        </PeopleTableHeader>
        <PeopleTableBody>
          {geofences.length === 0 ? (
            <PeopleTableEmpty colSpan={6} message="No geofences configured yet. Create one to start detecting arrivals/departures for attendance, customer visits, or restricted zones." />
          ) : (
            geofences.map((gf) => (
              <PeopleTableRow key={gf.id}>
                <PeopleTableCell>{gf.name}</PeopleTableCell>
                <PeopleTableCell>{gf.type}</PeopleTableCell>
                <PeopleTableCell>{gf.radiusMeters ? `${gf.radiusMeters} m` : "—"}</PeopleTableCell>
                <PeopleTableCell>{gf.address ?? "—"}</PeopleTableCell>
                <PeopleTableCell>
                  <WorkspaceBadge variant={gf.isActive ? "success" : "neutral"}>{gf.isActive ? "Active" : "Inactive"}</WorkspaceBadge>
                </PeopleTableCell>
                <PeopleTableCell>
                  {gf.isActive ? (
                    <WorkspaceAction variant="outline" size="compact" onClick={() => deactivate(gf.id)}>
                      Deactivate
                    </WorkspaceAction>
                  ) : (
                    "—"
                  )}
                </PeopleTableCell>
              </PeopleTableRow>
            ))
          )}
        </PeopleTableBody>
      </PeopleTable>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New geofence" eyebrow="Location & Field Tracking" size="wide">
        <div className="flex flex-col gap-4">
          <WorkspaceField label="Name" htmlFor="gf-name" required>
            <WorkspaceInput id="gf-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </WorkspaceField>
          <WorkspaceField label="Type" htmlFor="gf-type" required>
            <WorkspaceSelect id="gf-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {GEOFENCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </WorkspaceSelect>
          </WorkspaceField>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Draw on map</p>
              <WorkspaceAction
                type="button"
                variant={drawing ? "primary" : "outline"}
                size="compact"
                onClick={() => setDrawing((d) => !d)}
              >
                {drawing ? "Drawing… click map" : "Draw circle"}
              </WorkspaceAction>
            </div>
            <GeofenceMap
              existing={geofences ?? []}
              drawing={drawing}
              draft={draft}
              onDraftChange={handleDraft}
              center={form.centerLat && form.centerLng ? [Number(form.centerLat), Number(form.centerLng)] : undefined}
            />
            <p className="mt-1 text-xs text-neutral-500">
              {drawing ? "Click the map to set the center, then drag to set the radius." : "Click \"Draw circle\" and click-drag on the map, or enter coordinates manually below."}
            </p>
          </div>

          {form.type === "CUSTOMER" ? (
            <WorkspaceField label="Link to customer" htmlFor="gf-account" hint="Selecting a customer auto-fills coordinates if the account has them saved.">
              <WorkspaceSelect id="gf-account" value={form.crmAccountId} onChange={(e) => applyAccountGeo(e.target.value)}>
                <option value="">— none —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </WorkspaceSelect>
            </WorkspaceField>
          ) : null}
          <div className="grid grid-cols-2 gap-4">
            <WorkspaceField label="Latitude" htmlFor="gf-lat" required>
              <WorkspaceInput id="gf-lat" type="number" step="any" value={form.centerLat} onChange={(e) => setForm((f) => ({ ...f, centerLat: e.target.value }))} />
            </WorkspaceField>
            <WorkspaceField label="Longitude" htmlFor="gf-lng" required>
              <WorkspaceInput id="gf-lng" type="number" step="any" value={form.centerLng} onChange={(e) => setForm((f) => ({ ...f, centerLng: e.target.value }))} />
            </WorkspaceField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <WorkspaceField label="Radius (meters)" htmlFor="gf-radius" required>
              <WorkspaceInput id="gf-radius" type="number" min={10} value={form.radiusMeters} onChange={(e) => setForm((f) => ({ ...f, radiusMeters: e.target.value }))} />
            </WorkspaceField>
            {form.type === "CUSTOMER" ? (
              <WorkspaceField label="Visit dwell (minutes)" htmlFor="gf-dwell" hint="Time inside before a visit is proposed for confirmation.">
                <WorkspaceInput id="gf-dwell" type="number" min={1} value={form.dwellMinutesForVisit} onChange={(e) => setForm((f) => ({ ...f, dwellMinutesForVisit: e.target.value }))} />
              </WorkspaceField>
            ) : null}
          </div>
          <WorkspaceField label="Address (optional)" htmlFor="gf-address">
            <WorkspaceInput id="gf-address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </WorkspaceField>
          <div className="flex justify-end gap-2">
            <WorkspaceAction variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </WorkspaceAction>
            <WorkspaceAction onClick={submit} disabled={saving}>
              {saving ? "Creating…" : "Create geofence"}
            </WorkspaceAction>
          </div>
        </div>
      </Modal>
    </PeopleSection>
  );
}
