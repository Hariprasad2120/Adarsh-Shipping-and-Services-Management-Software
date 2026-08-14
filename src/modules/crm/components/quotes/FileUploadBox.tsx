"use client";

import { CrmInput } from "@/modules/crm/components/workspace/crm-workspace";

import { Paperclip, Upload } from "lucide-react";

type FileUploadBoxProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
};

export function FileUploadBox({ files, onFilesChange }: FileUploadBoxProps) {
  return (
    <div className="rounded-md border border-dashed border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3 py-2 text-[12px] font-medium text-[var(--mnx-text-strong)]">
          <Upload className="size-4 text-[var(--mnx-accent)]" />
          <span>Attach File(s)</span>
          <CrmInput
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              onFilesChange(Array.from(event.target.files ?? []));
            }}
          />
        </label>
        <span className="text-[11px] text-[var(--mnx-text-muted)]">Multiple files supported. Files stay in local state until backend wiring is added.</span>
      </div>
      {files.length ? (
        <div className="mt-3 space-y-2">
          {files.map((file) => (
            <div key={`${file.name}-${file.size}`} className="flex items-center gap-2 text-[12px] text-[var(--mnx-text-strong)]">
              <Paperclip className="size-3.5 text-[var(--mnx-accent)]" />
              <span>{file.name}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

