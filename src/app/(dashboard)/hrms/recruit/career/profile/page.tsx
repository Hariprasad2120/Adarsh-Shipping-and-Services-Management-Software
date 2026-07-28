"use client";

import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
} from "@/components/monolith/people-controls";

import { NativeSelect } from "@/components/monolith/native-select";
import { useState, useEffect } from "react";

type Profile = {
  preferredRoles: string[];
  preferredLocations: string[];
  workplacePreference: string;
  employmentTypes: string[];
  seniority: string | null;
  totalExpYears: number | null;
  skills: string[];
  noticePeriodDays: number | null;
  compensationMin: number | null;
  compensationMax: number | null;
  compensationCcy: string;
  relocationOpen: boolean;
  alertsEnabled: boolean;
  alertFrequency: string;
};

const DEFAULT: Profile = {
  preferredRoles: [],
  preferredLocations: [],
  workplacePreference: "ANY",
  employmentTypes: [],
  seniority: null,
  totalExpYears: null,
  skills: [],
  noticePeriodDays: null,
  compensationMin: null,
  compensationMax: null,
  compensationCcy: "INR",
  relocationOpen: false,
  alertsEnabled: true,
  alertFrequency: "WEEKLY",
};

function tagInput(
  label: string,
  values: string[],
  onChange: (v: string[]) => void,
  placeholder: string,
) {
  return (
    <div>
      <label className="mnx-dashboard-spec-label mb-1 block">{label}</label>
      <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--mnx-accent)]/55 bg-mono-soft p-2 min-h-[40px]">
        {values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1 rounded-lg bg-[var(--mnx-accent)]/10 px-2 py-0.5 text-xs text-[var(--mnx-accent)]"
          >
            {v}
            <MnxAction
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="text-[var(--mnx-accent)]/60 hover:text-[var(--mnx-accent)]"
            >
              ×
            </MnxAction>
          </span>
        ))}
        <MnxInput
          type="text"
          placeholder={placeholder}
          className="min-w-24 flex-1 border-none bg-transparent px-1 text-xs focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              const val = (e.target as HTMLInputElement).value.trim();
              if (val && !values.includes(val)) onChange([...values, val]);
              (e.target as HTMLInputElement).value = "";
            }
          }}
        />
      </div>
      <p className="mt-1 text-xs text-mono-muted">
        Press Enter or comma to add
      </p>
    </div>
  );
}

export default function CareerProfilePage() {
  const [profile, setProfile] = useState<Profile>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recruit/jobseeker/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setProfile({ ...DEFAULT, ...d.data });
        setLoading(false);
      });
  }, []);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setProfile((p) => ({ ...p, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/recruit/jobseeker/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading)
    return <p className="text-sm text-mono-muted">Loading profile...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="mnx-title-1 text-mono-text">Career Profile</h1>
        <p className="text-sm text-mono-muted">
          Private job search preferences — not visible to your employer
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="mnx-form-section space-y-4 rounded-xl border border-mono-border bg-mono-card p-6">
          <h3 className="text-mono-text">Job Preferences</h3>
          <div className="space-y-4">
            {tagInput(
              "Preferred Roles",
              profile.preferredRoles,
              (v) => set("preferredRoles", v),
              "e.g. Product Manager",
            )}
            {tagInput(
              "Preferred Locations",
              profile.preferredLocations,
              (v) => set("preferredLocations", v),
              "e.g. Mumbai, Remote",
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mnx-dashboard-spec-label mb-1 block">
                  Workplace Preference
                </label>
                <NativeSelect
                  value={profile.workplacePreference}
                  onChange={(e) => set("workplacePreference", e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                >
                  <option value="ANY">Any</option>
                  <option value="REMOTE">Remote</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="ONSITE">On-site</option>
                </NativeSelect>
              </div>
              <div>
                <label className="mnx-dashboard-spec-label mb-1 block">
                  Seniority
                </label>
                <NativeSelect
                  value={profile.seniority ?? ""}
                  onChange={(e) => set("seniority", e.target.value || null)}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">Any</option>
                  <option value="ENTRY">Entry Level</option>
                  <option value="MID">Mid Level</option>
                  <option value="SENIOR">Senior</option>
                  <option value="LEAD">Lead / Manager</option>
                  <option value="EXECUTIVE">Executive</option>
                </NativeSelect>
              </div>
            </div>
            <div>
              <label className="mnx-dashboard-spec-label mb-1 block">
                Total Experience (years)
              </label>
              <MnxInput
                type="number"
                min={0}
                max={60}
                value={profile.totalExpYears ?? ""}
                onChange={(e) =>
                  set(
                    "totalExpYears",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mnx-form-section space-y-4 rounded-xl border border-mono-border bg-mono-card p-6">
          <h3 className="text-mono-text">Skills</h3>
          {tagInput(
            "Skills",
            profile.skills,
            (v) => set("skills", v),
            "e.g. Python, Project Management",
          )}
        </div>

        <div className="mnx-form-section space-y-4 rounded-xl border border-mono-border bg-mono-card p-6">
          <h3 className="text-mono-text">Compensation</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mnx-dashboard-spec-label mb-1 block">
                Currency
              </label>
              <NativeSelect
                value={profile.compensationCcy}
                onChange={(e) => set("compensationCcy", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="AED">AED</option>
              </NativeSelect>
            </div>
            <div>
              <label className="mnx-dashboard-spec-label mb-1 block">
                Min (annual)
              </label>
              <MnxInput
                type="number"
                min={0}
                value={profile.compensationMin ?? ""}
                onChange={(e) =>
                  set(
                    "compensationMin",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mnx-dashboard-spec-label mb-1 block">
                Max (annual)
              </label>
              <MnxInput
                type="number"
                min={0}
                value={profile.compensationMax ?? ""}
                onChange={(e) =>
                  set(
                    "compensationMax",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mnx-dashboard-spec-label mb-1 block">
              Notice Period (days)
            </label>
            <MnxInput
              type="number"
              min={0}
              max={365}
              value={profile.noticePeriodDays ?? ""}
              onChange={(e) =>
                set(
                  "noticePeriodDays",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              className="w-full rounded-xl px-3 py-2 text-sm"
              placeholder="0 = immediate joiner"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-mono-text">
            <MnxInput
              type="checkbox"
              checked={profile.relocationOpen}
              onChange={(e) => set("relocationOpen", e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Open to relocation
          </label>
        </div>

        <div className="mnx-form-section space-y-4 rounded-xl border border-mono-border bg-mono-card p-6">
          <h3 className="text-mono-text">Job Alerts</h3>
          <label className="flex items-center gap-2 text-sm text-mono-text">
            <MnxInput
              type="checkbox"
              checked={profile.alertsEnabled}
              onChange={(e) => set("alertsEnabled", e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Enable job alerts
          </label>
          {profile.alertsEnabled && (
            <div>
              <label className="mnx-dashboard-spec-label mb-1 block">
                Frequency
              </label>
              <NativeSelect
                value={profile.alertFrequency}
                onChange={(e) => set("alertFrequency", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm"
              >
                <option value="INSTANT">Instant</option>
                <option value="DAILY">Daily digest</option>
                <option value="WEEKLY">Weekly digest</option>
              </NativeSelect>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <MnxAction
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[var(--mnx-accent)] px-6 py-2 text-sm font-medium uppercase tracking-wide text-[var(--mnx-text)] transition hover:bg-[var(--mnx-accent-soft)] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </MnxAction>
          {saved && (
            <span className="text-sm text-[var(--mnx-success)]">Saved!</span>
          )}
        </div>
      </form>
    </div>
  );
}
