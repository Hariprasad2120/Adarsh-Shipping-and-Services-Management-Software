"use client";

import { useState, useEffect } from "react";

type Settings = {
  candidateNumberFormat?: string;
  applicationNumberFormat?: string;
  retentionDays?: number;
  consentText?: string | null;
  maxResumeSizeBytes?: number;
  duplicateCheckEmail?: boolean;
  duplicateCheckPhone?: boolean;
  duplicateCheckResumeHash?: boolean;
  aiProvider?: string;
  aiModel?: string;
  automationBatchSize?: number;
  jobSeekerEnabled?: boolean;
  shareExpiryDays?: number;
};

const DEFAULT: Settings = {
  candidateNumberFormat: "CAND-{YYYY}-{SEQ}",
  applicationNumberFormat: "APP-{YYYY}-{SEQ}",
  retentionDays: 365,
  consentText: null,
  maxResumeSizeBytes: 10485760,
  duplicateCheckEmail: true,
  duplicateCheckPhone: false,
  duplicateCheckResumeHash: false,
  aiProvider: "",
  aiModel: "",
  automationBatchSize: 50,
  jobSeekerEnabled: true,
  shareExpiryDays: 7,
};

export default function RecruitSettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const res = await fetch("/api/recruit/settings");
        const text = await res.text();
        const payload = text ? JSON.parse(text) : null;

        if (!res.ok) {
          const message =
            payload?.error?.message ??
            payload?.error ??
            "Failed to load settings";
          throw new Error(message);
        }

        const data =
          payload?.data && typeof payload.data === "object"
            ? payload.data
            : payload && typeof payload === "object"
              ? payload
              : null;

        if (!cancelled && data) {
          setSettings({ ...DEFAULT, ...data });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load settings");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setSettings((s) => ({ ...s, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/recruit/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const text = await res.text();
      const payload = text ? JSON.parse(text) : null;
      setError(payload?.error?.message ?? payload?.error ?? "Failed to save");
    }
    setSaving(false);
  };

  if (loading) return <p className="text-sm text-on-surface-variant">Loading settings...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="ds-h1 text-on-surface">Recruit Settings</h1>
        <p className="text-sm text-on-surface-variant">Organisation-wide configuration for the Recruit module</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="ds-form-section space-y-4 rounded-xl border border-outline-variant bg-surface p-6">
          <h3 className="text-on-surface">Number Formats</h3>
          <div className="space-y-3">
            <div>
              <label className="ds-label mb-1 block">Candidate Number Format</label>
              <input
                value={settings.candidateNumberFormat ?? ""}
                onChange={(e) => set("candidateNumberFormat", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm font-mono"
                placeholder="CAND-{YYYY}-{SEQ}"
              />
              <p className="mt-1 text-xs text-on-surface-variant">Use {"{YYYY}"} for year, {"{SEQ}"} for padded sequence</p>
            </div>
            <div>
              <label className="ds-label mb-1 block">Application Number Format</label>
              <input
                value={settings.applicationNumberFormat ?? ""}
                onChange={(e) => set("applicationNumberFormat", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm font-mono"
                placeholder="APP-{YYYY}-{SEQ}"
              />
            </div>
          </div>
        </div>

        <div className="ds-form-section space-y-4 rounded-xl border border-outline-variant bg-surface p-6">
          <h3 className="text-on-surface">Data Retention & Privacy</h3>
          <div className="space-y-3">
            <div>
              <label className="ds-label mb-1 block">Candidate Data Retention (days)</label>
              <input
                type="number"
                min={1}
                max={3650}
                value={settings.retentionDays ?? 365}
                onChange={(e) => set("retentionDays", Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="ds-label mb-1 block">Max Resume File Size (bytes)</label>
              <input
                type="number"
                min={1048576}
                max={52428800}
                value={settings.maxResumeSizeBytes ?? 10485760}
                onChange={(e) => set("maxResumeSizeBytes", Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-on-surface-variant">
                Current: {Math.round((settings.maxResumeSizeBytes ?? 10485760) / 1048576)} MB
              </p>
            </div>
            <div>
              <label className="ds-label mb-1 block">Private Share Expiry (days)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={settings.shareExpiryDays ?? 7}
                onChange={(e) => set("shareExpiryDays", Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="ds-label mb-2 block">Candidate Consent Text</label>
              <textarea
                rows={4}
                value={settings.consentText ?? ""}
                onChange={(e) => set("consentText", e.target.value || null)}
                className="w-full rounded-xl px-3 py-2 text-sm"
                placeholder="By submitting, you agree that your information may be retained and processed for recruitment purposes..."
              />
            </div>
          </div>
        </div>

        <div className="ds-form-section space-y-4 rounded-xl border border-outline-variant bg-surface p-6">
          <h3 className="text-on-surface">Duplicate Detection</h3>
          <div className="space-y-2">
            {(["duplicateCheckEmail", "duplicateCheckPhone", "duplicateCheckResumeHash"] as const).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={settings[key] ?? false}
                  onChange={(e) => set(key, e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                {key === "duplicateCheckEmail" && "Check by email address"}
                {key === "duplicateCheckPhone" && "Check by phone number"}
                {key === "duplicateCheckResumeHash" && "Check by resume content hash"}
              </label>
            ))}
          </div>
        </div>

        <div className="ds-form-section space-y-4 rounded-xl border border-outline-variant bg-surface p-6">
          <h3 className="text-on-surface">AI & Automation</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ds-label mb-1 block">AI Provider</label>
                <input
                  value={settings.aiProvider ?? ""}
                  onChange={(e) => set("aiProvider", e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                  placeholder="anthropic"
                />
              </div>
              <div>
                <label className="ds-label mb-1 block">AI Model</label>
                <input
                  value={settings.aiModel ?? ""}
                  onChange={(e) => set("aiModel", e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                  placeholder="claude-sonnet-4-6"
                />
              </div>
            </div>
            <div>
              <label className="ds-label mb-1 block">Automation Batch Size</label>
              <input
                type="number"
                min={1}
                max={500}
                value={settings.automationBatchSize ?? 50}
                onChange={(e) => set("automationBatchSize", Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="ds-form-section space-y-4 rounded-xl border border-outline-variant bg-surface p-6">
          <h3 className="text-on-surface">Feature Flags</h3>
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={settings.jobSeekerEnabled ?? true}
              onChange={(e) => set("jobSeekerEnabled", e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Enable Job Seeker (Career) Workspace for employees
          </label>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#00cec4] px-6 py-2 text-sm font-medium uppercase tracking-wide text-white transition hover:bg-[#00b8af] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {saved && <span className="text-sm text-[#22c55e]">Saved!</span>}
        </div>
      </form>
    </div>
  );
}
