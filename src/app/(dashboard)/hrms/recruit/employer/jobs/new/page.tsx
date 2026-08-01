"use client";

import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
  PeopleControlTextarea as MnxTextarea,
} from "@/modules/people/components/people-controls";

import { NativeSelect } from "@/components/ui/native-select";
import { DateInput } from "@/components/ui/date-input";
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

  const set = (k: string, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

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
        <h1 className="mnx-title-1 text-mono-text">Post a Job</h1>
        <p className="text-sm text-mono-muted">
          Create a new job opening and start the hiring pipeline
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="mnx-form-section space-y-4 rounded-xl border border-mono-border bg-mono-card p-6">
          <h3 className="text-mono-text">Role Details</h3>
          <div className="space-y-3">
            <div>
              <label className="mnx-dashboard-spec-label mb-1 block">
                Job Title *
              </label>
              <MnxInput
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Senior Customs Officer"
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mnx-dashboard-spec-label mb-1 block">
                  Department
                </label>
                <MnxInput
                  value={form.department}
                  onChange={(e) => set("department", e.target.value)}
                  placeholder="e.g. Operations"
                  className="w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mnx-dashboard-spec-label mb-1 block">
                  Location
                </label>
                <MnxInput
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mnx-dashboard-spec-label mb-1 block">
                  Workplace Type
                </label>
                <NativeSelect
                  value={form.workplaceType}
                  onChange={(e) => set("workplaceType", e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                >
                  <option value="ONSITE">On-site</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="REMOTE">Remote</option>
                </NativeSelect>
              </div>
              <div>
                <label className="mnx-dashboard-spec-label mb-1 block">
                  Employment Type
                </label>
                <NativeSelect
                  value={form.employmentType}
                  onChange={(e) => set("employmentType", e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERNSHIP">Internship</option>
                </NativeSelect>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mnx-dashboard-spec-label mb-1 block">
                  Headcount
                </label>
                <MnxInput
                  type="number"
                  min={1}
                  value={form.headcount}
                  onChange={(e) => set("headcount", e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mnx-dashboard-spec-label mb-1 block">
                  Target Fill Date
                </label>
                <DateInput
                  value={form.targetFillDate}
                  onChange={(e) => set("targetFillDate", e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mnx-form-section space-y-4 rounded-xl border border-mono-border bg-mono-card p-6">
          <h3 className="text-mono-text">Job Description</h3>
          <div className="space-y-3">
            <div>
              <label className="mnx-dashboard-spec-label mb-1 block">
                Description (Markdown)
              </label>
              <MnxTextarea
                rows={6}
                value={form.descriptionMd}
                onChange={(e) => set("descriptionMd", e.target.value)}
                placeholder="Describe the role, responsibilities, and team..."
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mnx-dashboard-spec-label mb-1 block">
                Requirements (Markdown)
              </label>
              <MnxTextarea
                rows={4}
                value={form.requirementsMd}
                onChange={(e) => set("requirementsMd", e.target.value)}
                placeholder="List qualifications, skills, and experience..."
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mnx-form-section space-y-4 rounded-xl border border-mono-border bg-mono-card p-6">
          <h3 className="text-mono-text">Compensation</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mnx-dashboard-spec-label mb-1 block">
                Currency
              </label>
              <NativeSelect
                value={form.salaryCcy}
                onChange={(e) => set("salaryCcy", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="AED">AED</option>
                <option value="EUR">EUR</option>
              </NativeSelect>
            </div>
            <div>
              <label className="mnx-dashboard-spec-label mb-1 block">
                Min (annual)
              </label>
              <MnxInput
                type="number"
                min={0}
                value={form.salaryMin}
                onChange={(e) => set("salaryMin", e.target.value)}
                placeholder="0"
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
                value={form.salaryMax}
                onChange={(e) => set("salaryMax", e.target.value)}
                placeholder="0"
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-[var(--mnx-danger)] bg-[var(--mnx-danger-bg)] px-4 py-3 text-sm text-[var(--mnx-danger)] border-[var(--mnx-danger)] bg-[var(--mnx-danger-bg)]/30 text-[var(--mnx-danger)]">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <MnxAction
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[var(--mnx-accent)] px-6 py-2 text-sm font-medium uppercase tracking-wide text-[var(--mnx-text)] transition hover:bg-[var(--mnx-accent-soft)] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Post Job"}
          </MnxAction>
          <a
            href="/hrms/recruit/employer/jobs"
            className="rounded-xl border border-mono-border px-6 py-2 text-sm text-mono-muted transition hover:text-mono-text"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
