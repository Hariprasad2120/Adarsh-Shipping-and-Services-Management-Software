"use client";

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
      setAddForm({ name: "", fileKey: "", fileName: "", mimeType: "application/pdf", sizeBytes: 0, isBase: false });
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
          <h1 className="ds-h1 text-on-surface">My Resumes</h1>
          <p className="text-sm text-on-surface-variant">Manage your resume versions — private to you</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#00cec4] px-4 py-2 text-sm font-medium text-white uppercase tracking-wide transition hover:bg-[#00b8af]"
        >
          <Add size={16} />
          Add Resume
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-xl border border-outline-variant bg-surface p-5 space-y-3">
          <h3 className="ds-h3 text-on-surface">Register Resume</h3>
          <p className="text-xs text-on-surface-variant">Register an existing resume file by name. File upload integration connects here.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ds-label mb-1 block">Label / Version Name *</label>
              <input
                required
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm"
                placeholder="e.g. Senior Engineer v3"
              />
            </div>
            <div>
              <label className="ds-label mb-1 block">File Name *</label>
              <input
                required
                value={addForm.fileName}
                onChange={(e) => setAddForm((f) => ({ ...f, fileName: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm"
                placeholder="resume-2026.pdf"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={addForm.isBase}
              onChange={(e) => setAddForm((f) => ({ ...f, isBase: e.target.checked }))}
              className="h-4 w-4 rounded"
            />
            Mark as base / master resume
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={adding}
              className="rounded-xl bg-[#00cec4] px-4 py-2 text-sm font-medium text-white hover:bg-[#00b8af] disabled:opacity-50"
            >
              {adding ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-xl border border-outline-variant px-4 py-2 text-sm text-on-surface-variant"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading resumes...</p>
      ) : resumes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface p-12 text-center">
          <DocumentAdd size={40} className="mx-auto mb-3 text-outline" />
          <p className="font-medium text-on-surface">No resumes yet</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Register your first resume to start tracking tailored versions
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r) => (
            <div
              key={r.id}
              className={`relative flex flex-col gap-3 rounded-xl border bg-surface p-4 ${
                r.isBase ? "border-[#00cec4]/40 shadow-sm" : "border-outline-variant"
              }`}
            >
              {r.isBase && (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#00cec4]/10 px-2 py-0.5 text-[10px] font-medium text-[#00cec4]">
                  <StarFilled size={10} />
                  BASE
                </span>
              )}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00cec4]/10">
                  <DocumentAdd size={18} className="text-[#00cec4]" />
                </div>
                <div className="min-w-0 flex-1 pr-12">
                  <p className="truncate font-medium text-on-surface">{r.name}</p>
                  <p className="ds-label mt-0.5">v{r.version}</p>
                </div>
              </div>
              <div className="text-xs text-on-surface-variant">
                Updated {new Date(r.updatedAt).toLocaleDateString()}
                <span className="ml-2">· {Math.round(r.sizeBytes / 1024)} KB</span>
              </div>
              {!r.isBase && (
                <button
                  onClick={() => setBase(r.id)}
                  className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-[#00cec4]"
                >
                  <Star size={12} />
                  Set as base
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
