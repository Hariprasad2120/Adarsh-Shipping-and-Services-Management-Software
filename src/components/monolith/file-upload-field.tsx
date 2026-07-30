"use client";

import { useRef, type ChangeEvent, type DragEvent } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/monolith/button";
import { Label } from "@/components/monolith/label";

type SelectedUploadFile = {
  file?: File | null;
  href?: string | null;
  name: string;
  sizeBytes?: number | null;
  statusLabel?: string;
};

type FileUploadFieldProps = {
  accept?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  helperText?: string;
  id: string;
  iconAlign?: "start" | "end";
  label?: string;
  multiple?: boolean;
  onClear?: () => void;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveSelectedFile?: (file: SelectedUploadFile, index: number) => void;
  previewInline?: boolean;
  selectedFile?: SelectedUploadFile | null;
  selectedFiles?: SelectedUploadFile[] | null;
  showSelectedPreview?: boolean;
  triggerText?: string;
  uploading?: boolean;
  uploadingLabel?: string;
};

function formatFileSize(sizeBytes?: number | null) {
  if (!sizeBytes || sizeBytes <= 0) return null;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadField({
  accept,
  className,
  compact = false,
  disabled = false,
  helperText,
  id,
  label,
  multiple = false,
  onClear,
  onInputChange,
  onRemoveSelectedFile,
  selectedFile,
  selectedFiles,
  showSelectedPreview = true,
  triggerText = "Drag and drop or choose file to upload",
  uploading = false,
  uploadingLabel = "Uploading document...",
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewFiles =
    selectedFiles && selectedFiles.length > 0
      ? selectedFiles
      : selectedFile
        ? [selectedFile]
        : [];

  function applyFiles(files: FileList | null) {
    const input = inputRef.current;
    if (!input || !files || files.length === 0) return;
    const transfer = new DataTransfer();
    Array.from(files).forEach((file) => transfer.items.add(file));
    (input as HTMLInputElement & { files: FileList }).files = transfer.files;
    onInputChange({
      target: input,
      currentTarget: input,
    } as ChangeEvent<HTMLInputElement>);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (!disabled) applyFiles(event.dataTransfer.files);
  }

  function clearInput() {
    if (inputRef.current) inputRef.current.value = "";
    onClear?.();
  }

  return (
    <div className={cn(compact ? "grid gap-2" : "grid gap-3", className)}>
      {label ? <Label>{label}</Label> : null}
      <label
        htmlFor={id}
        className={cn(
          "dropzone",
          compact && "!p-4",
          disabled && "pointer-events-none opacity-50",
        )}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="upload-icon">
          {uploading ? "..." : <Upload className="h-5 w-5" />}
        </div>
        <b>{uploading ? uploadingLabel : triggerText}</b>
        {helperText ? <p>{helperText}</p> : null}
        <input
          ref={inputRef}
          id={id}
          name={id}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          disabled={disabled}
          onChange={onInputChange}
        />
      </label>
      {showSelectedPreview && previewFiles.length > 0 ? (
        <div className="grid gap-2">
          {previewFiles.map((file, index) => (
            <div key={`${file.name}-${index}`} className="mnx-file-row">
              <FileText className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate">
                {file.href ? (
                  <a href={file.href} target="_blank" rel="noreferrer">
                    {file.name}
                  </a>
                ) : (
                  file.name
                )}
              </span>
              <small>
                {file.statusLabel ?? formatFileSize(file.sizeBytes) ?? "Ready"}
              </small>
              {onRemoveSelectedFile || onClear ? (
                <Button
                  type="button"
                  variant="outline"
                  mode="icon"
                  size="sm"
                  aria-label="Remove file"
                  onClick={() =>
                    onRemoveSelectedFile
                      ? onRemoveSelectedFile(file, index)
                      : clearInput()
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
