"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
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
  onRemoveSelectedFile?: (file: SelectedUploadFile, index: number) => void;
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
  onRemoveSelectedFile,
  previewInline = false,
  selectedFile,
  selectedFiles,
  showSelectedPreview = true,
  triggerText = "Drag and drop or choose file to upload",
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sizeLabel = formatFileSize(selectedFile?.sizeBytes);
  const previewFiles = selectedFiles && selectedFiles.length > 0 ? selectedFiles : selectedFile ? [selectedFile] : [];
  const showInlineClear = !onRemoveSelectedFile && Boolean(onClear) && (previewInline || previewFiles.length === 1);
  const selectedPreviewFile = selectedFile?.file ?? null;
  const localPreviewHref = useMemo(() => {
    if (!selectedPreviewFile) return null;
    return URL.createObjectURL(selectedPreviewFile);
  }, [selectedPreviewFile]);

  useEffect(() => {
    return () => {
      if (localPreviewHref) {
        URL.revokeObjectURL(localPreviewHref);
      }
    };
  }, [localPreviewHref]);

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
    <div className={cn(compact ? "space-y-2" : "space-y-3", className)}>
      {label ? <Label className="ds-label">{label}</Label> : null}

      <label
        htmlFor={id}
        className={cn(
          "card-cyan-outline group block cursor-pointer overflow-hidden rounded-xl border border-dashed border-outline-variant/40 bg-surface transition-all duration-200",
          "hover:border-[#00cec4]/60 hover:bg-surface-container-low/30",
          isDragging && "border-[#00cec4]/70 bg-surface-container-low/40 shadow-[0_0_0_3px_rgba(0,206,196,0.14)]",
          disabled && "cursor-not-allowed opacity-50",
          compact ? "px-3.5 py-2.5" : "px-6 py-8",
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
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl border border-outline-variant/40 bg-surface shadow-sm",
              compact ? "h-10 w-10" : "h-12 w-12",
            )}
          >
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

      {compact && helperText ? <p className="text-[11px] leading-4 text-on-surface-variant">{helperText}</p> : null}

      {showSelectedPreview && previewFiles.length > 0 ? (
        <div className={cn("rounded-xl border border-outline-variant/40 bg-surface-container-low", compact ? "p-2.5" : "p-3")}>
          <div className={cn(previewInline ? "space-y-0" : compact ? "space-y-2" : "space-y-3")}>
            {previewFiles.map((previewFile, index) => {
              const fileHref =
                previewFiles.length === 1 && previewFile.name === selectedFile?.name ? previewHref : previewFile.href || null;
              const fileSizeLabel =
                previewFiles.length === 1 && previewFile.name === selectedFile?.name
                  ? sizeLabel
                  : formatFileSize(previewFile.sizeBytes);
              const canRemoveThisFile = Boolean(onRemoveSelectedFile) || (Boolean(onClear) && previewFiles.length === 1);
              const handleRemoveThisFile = () => {
                if (onRemoveSelectedFile) {
                  onRemoveSelectedFile(previewFile, index);
                  return;
                }
                handleClear();
              };

              return (
                <div
                  key={`${previewFile.name}-${index}`}
                  className={cn(
                    compact
                      ? "flex items-center gap-2.5 rounded-lg border border-outline-variant/35 bg-surface px-2.5 py-2"
                      : "flex items-center gap-3 rounded-lg border border-outline-variant/35 bg-surface px-3 py-2.5",
                    canRemoveThisFile && "justify-between",
                  )}
                >
                  <span className={cn("flex shrink-0 items-center justify-center rounded-lg border border-outline-variant/40 bg-surface shadow-sm", compact ? "h-9 w-9" : "h-10 w-10")}>
                    <FileText className={cn("text-on-surface", compact ? "size-4" : "size-5")} aria-hidden={true} />
                  </span>

                  <div className="min-w-0 flex-1 space-y-1">
                    {fileHref ? (
                      <a
                        href={fileHref}
                        target="_blank"
                        rel="noreferrer"
                        title={previewFile.name}
                        className={cn(
                          "block truncate font-medium text-on-surface transition-colors hover:text-[#00cec4] hover:underline",
                          compact ? "text-[12px]" : "text-sm",
                        )}
                      >
                        {previewFile.name}
                      </a>
                    ) : (
                      <p title={previewFile.name} className={cn("truncate font-medium text-on-surface", compact ? "text-[12px]" : "text-sm")}>
                        {previewFile.name}
                      </p>
                    )}

                    <div className={cn("flex flex-wrap items-center gap-y-1 text-on-surface-variant", compact ? "gap-x-2 text-[10px]" : "gap-x-3 text-[11px]")}>
                      <span>{fileSizeLabel || "Selected"}</span>
                      <span className="uppercase tracking-[0.12em]">
                        {previewFile.statusLabel || "Ready"}
                      </span>
                    </div>
                  </div>

                  {canRemoveThisFile ? (
                    <button
                      type="button"
                      aria-label="Delete uploaded file"
                      title="Remove file"
                      onClick={handleRemoveThisFile}
                      className={cn(
                        "group ds-plain inline-flex shrink-0 items-center justify-center rounded-full border border-outline-variant/25 bg-surface text-on-surface-variant transition-all duration-200 ease-out",
                        compact ? "h-7 w-7" : "h-8 w-8",
                        "hover:border-red-500/25 hover:bg-red-500/8 hover:text-red-600",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/25",
                      )}
                    >
                      <X className={cn("shrink-0 transition-transform duration-200 group-hover:rotate-90", compact ? "size-3.5" : "size-4")} aria-hidden={true} />
                    </button>
                  ) : null}
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
