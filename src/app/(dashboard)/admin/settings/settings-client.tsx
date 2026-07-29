"use client";

import { useState } from "react";
import {
  AdminButton,
  AdminField,
  AdminInput,
  WorkspaceAlert,
} from "@/components/monolith";
import type { ReviewerRoleWeights } from "@/modules/ams/settings";

export function SettingsClient({
  initialDays,
  initialWeights,
}: {
  initialDays: number;
  initialWeights: ReviewerRoleWeights;
}) {
  const [days, setDays] = useState(initialDays);
  const [weights, setWeights] = useState<ReviewerRoleWeights>(initialWeights);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function patch(body: object) {
    setSaving(true);
    setSaved(false);
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (response.ok) setSaved(true);
  }

  const roles: (keyof ReviewerRoleWeights)[] = ["HR", "TL", "MANAGER"];

  return (
    <div className="mnx-admin-settings-form">
      <section>
        <AdminField
          htmlFor="days"
          label="Reviewer availability deadline"
          hint="Business days reviewers have to confirm availability after being assigned."
        >
          <div className="mnx-admin-inline-field">
            <AdminInput
              id="days"
              type="number"
              min={0}
              max={30}
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            />
            <span>business days</span>
          </div>
        </AdminField>
        <div className="mnx-admin-form-actions">
          <AdminButton
            onClick={() => patch({ availabilityDeadlineDays: days })}
            disabled={saving}
            variant="primary"
          >
            {saving ? "Saving…" : "Save deadline"}
          </AdminButton>
          {saved ? <WorkspaceAlert variant="success">Saved.</WorkspaceAlert> : null}
        </div>
      </section>

      <section>
        <div>
          <h3>Reviewer role weights</h3>
          <p>
            Relative weights for each reviewer role within the 70% reviewer
            pool. Higher numbers have more influence; equal values have equal
            weight.
          </p>
        </div>
        <div className="mnx-admin-weight-grid">
          {roles.map((role) => (
            <AdminField key={role} label={role}>
              <AdminInput
                type="number"
                min={0}
                step={0.1}
                value={weights[role]}
                onChange={(event) =>
                  setWeights((current) => ({
                    ...current,
                    [role]: Number.parseFloat(event.target.value) || 0,
                  }))
                }
              />
            </AdminField>
          ))}
        </div>
        <div className="mnx-admin-form-actions">
          <AdminButton
            onClick={() => patch({ reviewerRoleWeights: weights })}
            disabled={saving}
            variant="primary"
          >
            {saving ? "Saving…" : "Save weights"}
          </AdminButton>
          {saved ? <WorkspaceAlert variant="success">Saved.</WorkspaceAlert> : null}
        </div>
      </section>
    </div>
  );
}
