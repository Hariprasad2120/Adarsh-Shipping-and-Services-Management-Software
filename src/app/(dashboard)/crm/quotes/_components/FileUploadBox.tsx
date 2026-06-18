"use client";

import { Paperclip, Upload } from "lucide-react";

type FileUploadBoxProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
};

export function FileUploadBox({ files, onFilesChange }: FileUploadBoxProps) {
  return (
    <div className="rounded-md border border-dashed border-[#c9d4e2] bg-[#fbfcfe] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[#d9dee7] bg-white px-3 py-2 text-[12px] font-medium text-[#1f2937]">
          <Upload className="size-4 text-[#00cec4]" />
          <span>Attach File(s)</span>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              onFilesChange(Array.from(event.target.files ?? []));
            }}
          />
        </label>
        <span className="text-[11px] text-[#6b7280]">Multiple files supported. Files stay in local state until backend wiring is added.</span>
      </div>
      {files.length ? (
        <div className="mt-3 space-y-2">
          {files.map((file) => (
            <div key={`${file.name}-${file.size}`} className="flex items-center gap-2 text-[12px] text-[#374151]">
              <Paperclip className="size-3.5 text-[#00cec4]" />
              <span>{file.name}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

