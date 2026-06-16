"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
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
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  const roles: (keyof ReviewerRoleWeights)[] = ["HR", "TL", "MANAGER"];

  return (
    <div className="space-y-8">
      {/* Availability deadline */}
      <div className="space-y-4 max-w-md">
        <div className="space-y-1">
          <label htmlFor="days" className="block text-sm font-medium text-on-surface">
            Reviewer availability deadline
          </label>
          <p className="text-xs text-on-surface-variant">
            Business days reviewers have to confirm availability after being assigned.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Input
              id="days"
              type="number"
              min={0}
              max={30}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-on-surface-variant">business days</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => patch({ availabilityDeadlineDays: days })}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {saved && <span className="text-sm text-green-600">Saved.</span>}
        </div>
      </div>

      {/* Reviewer role weights */}
      <div className="space-y-4 max-w-md pt-6 border-t border-outline-variant">
        <div>
          <h3 className="ds-h3 text-on-surface">Reviewer role weights</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Relative weights for each reviewer role within the 70% reviewer pool.
            Higher numbers = more influence. Equal values = equal weight.
          </p>
        </div>
        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role} className="flex items-center gap-4">
              <label className="text-sm text-on-surface w-20">{role}</label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={weights[role]}
                onChange={(e) =>
                  setWeights((w) => ({ ...w, [role]: parseFloat(e.target.value) || 0 }))
                }
                className="w-24"
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => patch({ reviewerRoleWeights: weights })}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving…" : "Save weights"}
          </button>
          {saved && <span className="text-sm text-green-600">Saved.</span>}
        </div>
      </div>
    </div>
  );
}
