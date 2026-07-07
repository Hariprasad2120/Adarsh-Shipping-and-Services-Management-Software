"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
  label?: string;
  onClear?: () => void;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  selectedFile?: SelectedUploadFile | null;
  showSelectedPreview?: boolean;
  triggerText?: string;
};

function formatFileSize(sizeBytes?: number | null) {
  if (!sizeBytes || sizeBytes <= 0) return null;
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }
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
  onClear,
  onInputChange,
  selectedFile,
  showSelectedPreview = true,
  triggerText = "Drag and drop or choose file to upload",
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sizeLabel = formatFileSize(selectedFile?.sizeBytes);
  const [localPreviewHref, setLocalPreviewHref] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile?.file) {
      setLocalPreviewHref(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile.file);
    setLocalPreviewHref(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile?.file]);

  const previewHref = selectedFile?.href || localPreviewHref;

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onClear?.();
  };

  const applyFiles = (files: FileList | null) => {
    const input = inputRef.current;
    if (!input || !files || files.length === 0) return;

    const transfer = new DataTransfer();
    Array.from(files).forEach((file) => transfer.items.add(file));
    (input as HTMLInputElement & { files: FileList }).files = transfer.files;
    onInputChange({
      target: input,
      currentTarget: input,
    } as ChangeEvent<HTMLInputElement>);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (disabled) return;
    setIsDragging(false);
    applyFiles(event.dataTransfer.files);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {label ? <Label className="ds-label">{label}</Label> : null}

      <label
        htmlFor={id}
        className={cn(
          "card-cyan-outline group block cursor-pointer rounded-xl border border-dashed border-outline-variant/40 bg-surface transition-all",
          "hover:border-[#00cec4]/60 hover:bg-surface-container-low/30",
          isDragging && "border-[#00cec4]/70 bg-surface-container-low/40 shadow-[0_0_0_3px_rgba(0,206,196,0.14)]",
          disabled && "cursor-not-allowed opacity-50",
          compact ? "px-4 py-3" : "px-6 py-8",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={cn("flex items-center gap-3", compact ? "justify-start" : "justify-center")}>
          <span className={cn("flex shrink-0 items-center justify-center rounded-xl border border-outline-variant/40 bg-surface shadow-sm", compact ? "h-10 w-10" : "h-12 w-12")}>
            <Upload className={cn("text-[#00cec4]", compact ? "size-4" : "size-5")} aria-hidden={true} />
          </span>
          <div className={cn("space-y-1", compact ? "text-left" : "text-center")}>
            <span className="block text-sm font-medium text-on-surface">{triggerText}</span>
            {!compact && helperText ? (
              <span className="block text-xs text-on-surface-variant">{helperText}</span>
            ) : null}
          </div>
        </div>
        <input
          ref={inputRef}
          id={id}
          name={id}
          type="file"
          accept={accept}
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            setIsDragging(false);
            onInputChange(event);
          }}
        />
      </label>

      {compact && helperText ? <p className="text-xs text-on-surface-variant">{helperText}</p> : null}

      {showSelectedPreview && selectedFile ? (
        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant/40 bg-surface shadow-sm">
              <FileText className="size-5 text-on-surface" aria-hidden={true} />
            </span>
            <div className="min-w-0 flex-1">
              {previewHref ? (
                <a
                  href={previewHref}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-xs font-medium text-on-surface hover:text-[#00cec4] hover:underline"
                >
                  {selectedFile.name}
                </a>
              ) : (
                <p className="truncate text-xs font-medium text-on-surface">{selectedFile.name}</p>
              )}
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                <span>{sizeLabel || "Selected"}</span>
                <span>{selectedFile.statusLabel || "Ready"}</span>
              </div>
            </div>
            {onClear ? (
              <Button
                type="button"
                variant="outline"
                size="md"
                mode="icon"
                className="h-10 w-10 shrink-0 rounded-xl text-on-surface-variant hover:bg-surface hover:text-on-surface"
                aria-label="Remove selected file"
                onClick={handleClear}
              >
                <X className="size-4 shrink-0" aria-hidden={true} />
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
