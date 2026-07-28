"use client";

import { useState, useTransition } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle } from "lucide-react";
import { importWorkbookAction } from "./actions";
import { Button } from "@/components/monolith/button";

export function WorkbookImportForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setMessage(null);
      setError(null);
    } else {
      setFileName(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await importWorkbookAction(formData);
      if (res.ok) {
        setMessage(res.message);
        setFileName(null);
        event.currentTarget.reset();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-mono-border/60 bg-mono-soft/20 hover:bg-[#F9D972]/5 hover:border-[#F9D972]/60 px-4 py-6 text-center transition">
        {fileName ? (
          <>
            <FileSpreadsheet className="size-8 text-[#F9D972]" />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {fileName}
            </span>
            <span className="text-xs text-slate-400">Click to change workbook</span>
          </>
        ) : (
          <>
            <Upload className="size-8 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Choose workbook file
            </span>
            <span className="text-xs text-slate-400">
              Upload `.xlsx` with the required Users and Login sheets.
            </span>
          </>
        )}
        <input
          name="workbook"
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          required
          className="sr-only"
        />
      </label>

      {message && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-600">
          <CheckCircle className="size-4 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-600">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" disabled={pending || !fileName} className="w-full">
        {pending ? "Importing Workbook Data..." : "Import Workbook"}
      </Button>
    </form>
  );
}
