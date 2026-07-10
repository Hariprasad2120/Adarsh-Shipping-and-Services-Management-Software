"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { FileText, Trash2, Upload, X } from "lucide-react";
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
  iconAlign?: "start" | "end";
  label?: string;
  multiple?: boolean;
  onClear?: () => void;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  previewInline?: boolean;
  selectedFile?: SelectedUploadFile | null;
  selectedFiles?: SelectedUploadFile[] | null;
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
  iconAlign = "start",
  label,
  multiple = false,
  onClear,
  onInputChange,
  previewInline = false,
  selectedFile,
  selectedFiles,
  showSelectedPreview = true,
  triggerText = "Drag and drop or choose file to upload",
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sizeLabel = formatFileSize(selectedFile?.sizeBytes);
  const [localPreviewHref, setLocalPreviewHref] = useState<string | null>(null);
  const previewFiles = selectedFiles && selectedFiles.length > 0 ? selectedFiles : selectedFile ? [selectedFile] : [];
  const showInlineClear = Boolean(onClear) && (previewInline || previewFiles.length === 1);

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
        <div
          className={cn(
            "flex items-center gap-3",
            compact
              ? "justify-start"
              : iconAlign === "end"
                ? "justify-between"
                : "justify-center",
          )}
        >
          {iconAlign === "end" && !compact ? (
            <div className="min-w-0 flex-1 space-y-1 text-left">
              <span className="block text-sm font-medium text-on-surface">{triggerText}</span>
              {helperText ? <span className="block text-xs text-on-surface-variant">{helperText}</span> : null}
            </div>
          ) : null}
          <span className={cn("flex shrink-0 items-center justify-center rounded-xl border border-outline-variant/40 bg-surface shadow-sm", compact ? "h-10 w-10" : "h-12 w-12")}>
            <Upload className={cn("text-[#00cec4]", compact ? "size-4" : "size-5")} aria-hidden={true} />
          </span>
          {!(iconAlign === "end" && !compact) ? (
            <div className={cn("space-y-1", compact ? "text-left" : "text-center")}>
              <span className="block text-sm font-medium text-on-surface">{triggerText}</span>
              {!compact && helperText ? (
                <span className="block text-xs text-on-surface-variant">{helperText}</span>
              ) : null}
            </div>
          ) : null}
        </div>
        <input
          ref={inputRef}
          id={id}
          name={id}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            setIsDragging(false);
            onInputChange(event);
          }}
        />
      </label>

      {compact && helperText ? <p className="text-xs text-on-surface-variant">{helperText}</p> : null}

      {showSelectedPreview && previewFiles.length > 0 ? (
        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3">
          <div className={previewInline ? "space-y-0" : "space-y-3"}>
            {previewFiles.map((previewFile, index) => {
              const fileHref =
                previewFiles.length === 1 && previewFile.name === selectedFile?.name ? previewHref : previewFile.href || null;
              const fileSizeLabel =
                previewFiles.length === 1 && previewFile.name === selectedFile?.name
                  ? sizeLabel
                  : formatFileSize(previewFile.sizeBytes);

              return (
  <div
    key={`${previewFile.name}-${index}`}
    className={cn(
      "flex items-center gap-3",
      showInlineClear && "justify-between",
    )}
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant/40 bg-surface shadow-sm">
      <FileText
        className="size-5 text-on-surface"
        aria-hidden={true}
      />
    </span>

    {showInlineClear ? (
      <>
        {/* Filename on top and file size at bottom */}
        <div className="flex h-10 min-w-0 flex-1 flex-col justify-between py-0.5">
          {fileHref ? (
            <a
              href={fileHref}
              target="_blank"
              rel="noreferrer"
              title={previewFile.name}
              className="block truncate text-sm font-medium leading-none text-on-surface transition-colors hover:text-[#00cec4] hover:underline"
            >
              {previewFile.name}
            </a>
          ) : (
            <p
              title={previewFile.name}
              className="truncate text-sm font-medium leading-none text-on-surface"
            >
              {previewFile.name}
            </p>
          )}

          <p className="text-sm leading-none text-on-surface-variant">
            {fileSizeLabel || "Selected"}
          </p>
        </div>

        {/* Cross on top and status at bottom */}
        <div className="flex h-10 shrink-0 flex-col items-end justify-between py-0.5">
          <button
            type="button"
            aria-label="Delete uploaded file"
            title="Remove file"
            onClick={handleClear}
            className={cn(
              "group ds-plain inline-flex h-5 w-5 items-center justify-center rounded-full",
              "text-on-surface-variant transition-all duration-200 ease-out",
              "hover:scale-110 hover:bg-red-50 hover:text-red-600",
              "active:scale-90 active:bg-red-100",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-red-500/25",
            )}
          >
            <X
              className="size-4 shrink-0 transition-transform duration-200 group-hover:rotate-90"
              aria-hidden={true}
            />
          </button>

          <p className="text-sm leading-none text-on-surface-variant">
            {previewFile.statusLabel || "Ready"}
          </p>
        </div>
      </>
    ) : (
      <div className="flex h-10 min-w-0 flex-1 flex-col justify-between py-0.5">
        {fileHref ? (
          <a
            href={fileHref}
            target="_blank"
            rel="noreferrer"
            title={previewFile.name}
            className="block truncate text-sm font-medium leading-none text-on-surface transition-colors hover:text-[#00cec4] hover:underline"
          >
            {previewFile.name}
          </a>
        ) : (
          <p className="truncate text-sm font-medium leading-none text-on-surface">
            {previewFile.name}
          </p>
        )}

        <div className="flex items-center gap-x-3 text-sm leading-none text-on-surface-variant">
          <span>{fileSizeLabel || "Selected"}</span>
          <span>{previewFile.statusLabel || "Ready"}</span>
        </div>
      </div>
    )}
  </div>
);
            })}
            {onClear && !showInlineClear ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  mode="icon"
                  className="ds-plain h-10 w-10 shrink-0 rounded-xl border-red-500/45 text-red-500 hover:border-red-500/60 hover:bg-surface hover:text-red-600 hover:shadow-none"
                  aria-label="Delete uploaded file"
                  onClick={handleClear}
                >
                  <Trash2 className="size-4 shrink-0" aria-hidden={true} />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
