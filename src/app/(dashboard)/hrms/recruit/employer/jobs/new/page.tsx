"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewJobPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    department: "",
    location: "",
    workplaceType: "ONSITE",
    employmentType: "FULL_TIME",
    headcount: 1,
    descriptionMd: "",
    requirementsMd: "",
    salaryMin: "",
    salaryMax: "",
    salaryCcy: "INR",
    targetFillDate: "",
  });

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/recruit/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        headcount: Number(form.headcount),
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
        targetFillDate: form.targetFillDate || undefined,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/hrms/recruit/employer/jobs/${data.data?.id ?? ""}`);
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to create job");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="ds-h1 text-on-surface">Post a Job</h1>
        <p className="text-sm text-on-surface-variant">Create a new job opening and start the hiring pipeline</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="ds-form-section space-y-4 rounded-xl border border-outline-variant bg-surface p-6">
          <h3 className="text-on-surface">Role Details</h3>
          <div className="space-y-3">
            <div>
              <label className="ds-label mb-1 block">Job Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Senior Customs Officer"
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ds-label mb-1 block">Department</label>
                <input
                  value={form.department}
                  onChange={(e) => set("department", e.target.value)}
                  placeholder="e.g. Operations"
                  className="w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="ds-label mb-1 block">Location</label>
                <input
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ds-label mb-1 block">Workplace Type</label>
                <select
                  value={form.workplaceType}
                  onChange={(e) => set("workplaceType", e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                >
                  <option value="ONSITE">On-site</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="REMOTE">Remote</option>
                </select>
              </div>
              <div>
                <label className="ds-label mb-1 block">Employment Type</label>
                <select
                  value={form.employmentType}
                  onChange={(e) => set("employmentType", e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERNSHIP">Internship</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ds-label mb-1 block">Headcount</label>
                <input
                  type="number"
                  min={1}
                  value={form.headcount}
                  onChange={(e) => set("headcount", e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="ds-label mb-1 block">Target Fill Date</label>
                <input
                  type="date"
                  value={form.targetFillDate}
                  onChange={(e) => set("targetFillDate", e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="ds-form-section space-y-4 rounded-xl border border-outline-variant bg-surface p-6">
          <h3 className="text-on-surface">Job Description</h3>
          <div className="space-y-3">
            <div>
              <label className="ds-label mb-1 block">Description (Markdown)</label>
              <textarea
                rows={6}
                value={form.descriptionMd}
                onChange={(e) => set("descriptionMd", e.target.value)}
                placeholder="Describe the role, responsibilities, and team..."
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="ds-label mb-1 block">Requirements (Markdown)</label>
              <textarea
                rows={4}
                value={form.requirementsMd}
                onChange={(e) => set("requirementsMd", e.target.value)}
                placeholder="List qualifications, skills, and experience..."
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="ds-form-section space-y-4 rounded-xl border border-outline-variant bg-surface p-6">
          <h3 className="text-on-surface">Compensation</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="ds-label mb-1 block">Currency</label>
              <select
                value={form.salaryCcy}
                onChange={(e) => set("salaryCcy", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="AED">AED</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="ds-label mb-1 block">Min (annual)</label>
              <input
                type="number"
                min={0}
                value={form.salaryMin}
                onChange={(e) => set("salaryMin", e.target.value)}
                placeholder="0"
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="ds-label mb-1 block">Max (annual)</label>
              <input
                type="number"
                min={0}
                value={form.salaryMax}
                onChange={(e) => set("salaryMax", e.target.value)}
                placeholder="0"
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
            {saving ? "Saving..." : "Post Job"}
          </button>
          <a
            href="/hrms/recruit/employer/jobs"
            className="rounded-xl border border-outline-variant px-6 py-2 text-sm text-on-surface-variant transition hover:text-on-surface"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
