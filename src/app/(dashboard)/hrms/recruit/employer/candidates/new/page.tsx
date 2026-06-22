"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Duplicate = { id: string; fullName: string; email: string | null; candidateNumber: string };

export default function NewCandidatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    currentTitle: "",
    currentCompany: "",
    linkedinUrl: "",
    source: "DIRECT",
    sourceMeta: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setDuplicates([]);
    const res = await fetch("/api/recruit/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok && data.data?.duplicates?.length) {
      setDuplicates(data.data.duplicates);
      setSaving(false);
      return;
    }
    if (res.status === 201) {
      router.push(`/hrms/recruit/employer/candidates/${data.data?.id ?? ""}`);
    } else {
      setError(data.error ?? "Failed to create candidate");
      setSaving(false);
    }
  };

  const proceedAnyway = async () => {
    setSaving(true);
    setDuplicates([]);
    const res = await fetch("/api/recruit/candidates?force=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.status === 201) {
      router.push(`/hrms/recruit/employer/candidates/${data.data?.id}`);
    } else {
      setError(data.error ?? "Failed");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="ds-h1 text-on-surface">Add Candidate</h1>
        <p className="text-sm text-on-surface-variant">Create a new candidate profile in the talent pool</p>
      </div>

      {duplicates.length > 0 && (
        <div className="rounded-xl border border-[#fb923c]/30 bg-[#fb923c]/5 p-4 space-y-3">
          <p className="text-sm font-medium text-[#fb923c]">Possible duplicate candidates found:</p>
          <ul className="space-y-1">
            {duplicates.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-sm">
                <span className="text-on-surface">
                  {d.fullName} {d.email ? `· ${d.email}` : ""} <span className="ds-label ml-1">{d.candidateNumber}</span>
                </span>
                <a href={`/hrms/recruit/employer/candidates/${d.id}`} className="text-[#00cec4] hover:underline">
                  View
                </a>
              </li>
            ))}
          </ul>
          <button
            onClick={proceedAnyway}
            disabled={saving}
            className="rounded-xl bg-[#fb923c] px-4 py-2 text-sm font-medium text-white hover:bg-[#f97316]"
          >
            Create Anyway
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="ds-form-section space-y-4 rounded-xl border border-outline-variant bg-surface p-6">
          <h3 className="text-on-surface">Personal Information</h3>
          <div className="space-y-3">
            <div>
              <label className="ds-label mb-1 block">Full Name *</label>
              <input
                required
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                placeholder="Jane Smith"
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ds-label mb-1 block">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="ds-label mb-1 block">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 9999999999"
                  className="w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="ds-label mb-1 block">LinkedIn URL</label>
              <input
                type="url"
                value={form.linkedinUrl}
                onChange={(e) => set("linkedinUrl", e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="ds-form-section space-y-4 rounded-xl border border-outline-variant bg-surface p-6">
          <h3 className="text-on-surface">Professional Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ds-label mb-1 block">Current Title</label>
              <input
                value={form.currentTitle}
                onChange={(e) => set("currentTitle", e.target.value)}
                placeholder="Senior Engineer"
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="ds-label mb-1 block">Current Company</label>
              <input
                value={form.currentCompany}
                onChange={(e) => set("currentCompany", e.target.value)}
                placeholder="Acme Corp"
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="ds-form-section space-y-4 rounded-xl border border-outline-variant bg-surface p-6">
          <h3 className="text-on-surface">Source</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ds-label mb-1 block">Source</label>
              <select
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm"
              >
                <option value="DIRECT">Direct Application</option>
                <option value="REFERRAL">Referral</option>
                <option value="JOB_BOARD">Job Board</option>
                <option value="AGENCY">Agency</option>
                <option value="LINKEDIN">LinkedIn</option>
                <option value="CAMPUS">Campus Hire</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="ds-label mb-1 block">Source Details</label>
              <input
                value={form.sourceMeta}
                onChange={(e) => set("sourceMeta", e.target.value)}
                placeholder="Referral name, job board, etc."
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#00cec4] px-6 py-2 text-sm font-medium uppercase tracking-wide text-white transition hover:bg-[#00b8af] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Candidate"}
          </button>
          <a
            href="/hrms/recruit/employer/candidates"
            className="rounded-xl border border-outline-variant px-6 py-2 text-sm text-on-surface-variant transition hover:text-on-surface"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
