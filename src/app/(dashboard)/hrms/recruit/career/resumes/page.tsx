"use client";

import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
} from "@/modules/people/components/people-controls";

import { useState, useEffect } from "react";
import { Add, DocumentAdd, Star, StarFilled } from "@carbon/icons-react";

type Resume = {
  id: string;
  name: string;
  version: number;
  isBase: boolean;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
};

export default function CareerResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    fileKey: "",
    fileName: "",
    mimeType: "application/pdf",
    sizeBytes: 0,
    isBase: false,
  });
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/recruit/jobseeker/resumes");
    if (res.ok) {
      const data = await res.json();
      setResumes(data.data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.fileName) return;
    setAdding(true);
    // fileKey defaults to fileName for manual entries (upload flow handled elsewhere)
    const res = await fetch("/api/recruit/jobseeker/resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...addForm,
        fileKey: addForm.fileKey || addForm.fileName,
        sizeBytes: addForm.sizeBytes || 1,
      }),
    });
    if (res.ok) {
      setShowAdd(false);
      setAddForm({
        name: "",
        fileKey: "",
        fileName: "",
        mimeType: "application/pdf",
        sizeBytes: 0,
        isBase: false,
      });
      load();
    }
    setAdding(false);
  };

  const setBase = async (id: string) => {
    await fetch("/api/recruit/jobseeker/resumes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isBase: true }),
    });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mnx-title-1 text-mono-text">My Resumes</h1>
          <p className="text-sm text-mono-muted">
            Manage your resume versions — private to you
          </p>
        </div>
        <MnxAction
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--mnx-accent)] px-4 py-2 text-sm font-medium text-[var(--mnx-text)] uppercase tracking-wide transition hover:bg-[var(--mnx-accent-soft)]"
        >
          <Add size={16} />
          Add Resume
        </MnxAction>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-mono-border bg-mono-card p-5 space-y-3"
        >
          <h3 className="mnx-title-3 text-mono-text">Register Resume</h3>
          <p className="text-xs text-mono-muted">
            Register an existing resume file by name. File upload integration
            connects here.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mnx-dashboard-spec-label mb-1 block">
                Label / Version Name *
              </label>
              <MnxInput
                required
                value={addForm.name}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full rounded-xl px-3 py-2 text-sm"
                placeholder="e.g. Senior Engineer v3"
              />
            </div>
            <div>
              <label className="mnx-dashboard-spec-label mb-1 block">
                File Name *
              </label>
              <MnxInput
                required
                value={addForm.fileName}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, fileName: e.target.value }))
                }
                className="w-full rounded-xl px-3 py-2 text-sm"
                placeholder="resume-2026.pdf"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-mono-text">
            <MnxInput
              type="checkbox"
              checked={addForm.isBase}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, isBase: e.target.checked }))
              }
              className="h-4 w-4 rounded"
            />
            Mark as base / master resume
          </label>
          <div className="flex gap-2">
            <MnxAction
              type="submit"
              disabled={adding}
              className="rounded-xl bg-[var(--mnx-accent)] px-4 py-2 text-sm font-medium text-[var(--mnx-text)] hover:bg-[var(--mnx-accent-soft)] disabled:opacity-50"
            >
              {adding ? "Saving..." : "Save"}
            </MnxAction>
            <MnxAction
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-xl border border-mono-border px-4 py-2 text-sm text-mono-muted"
            >
              Cancel
            </MnxAction>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-mono-muted">Loading resumes...</p>
      ) : resumes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mono-border bg-mono-card p-12 text-center">
          <DocumentAdd size={40} className="mx-auto mb-3 text-outline" />
          <p className="font-medium text-mono-text">No resumes yet</p>
          <p className="mt-1 text-sm text-mono-muted">
            Register your first resume to start tracking tailored versions
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r) => (
            <div
              key={r.id}
              className={`relative flex flex-col gap-3 rounded-xl border bg-mono-card p-4 ${
                r.isBase
                  ? "border-[var(--mnx-accent)]/40 shadow-sm"
                  : "border-mono-border"
              }`}
            >
              {r.isBase && (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[var(--mnx-accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--mnx-accent)]">
                  <StarFilled size={10} />
                  BASE
                </span>
              )}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--mnx-accent)]/10">
                  <DocumentAdd size={18} className="text-[var(--mnx-accent)]" />
                </div>
                <div className="min-w-0 flex-1 pr-12">
                  <p className="truncate font-medium text-mono-text">
                    {r.name}
                  </p>
                  <p className="mnx-dashboard-spec-label mt-0.5">
                    v{r.version}
                  </p>
                </div>
              </div>
              <div className="text-xs text-mono-muted">
                Updated {new Date(r.updatedAt).toLocaleDateString()}
                <span className="ml-2">
                  · {Math.round(r.sizeBytes / 1024)} KB
                </span>
              </div>
              {!r.isBase && (
                <MnxAction
                  onClick={() => setBase(r.id)}
                  className="flex items-center gap-1 text-xs text-mono-muted hover:text-[var(--mnx-accent)]"
                >
                  <Star size={12} />
                  Set as base
                </MnxAction>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
