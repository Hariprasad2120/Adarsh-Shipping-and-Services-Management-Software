"use client";

import { useRef, type ChangeEvent, type DragEvent } from "react";
import { ArrowUp, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type DocumentDropzoneSelectedFile = {
  file?: File | null;
  href?: string | null;
  name: string;
  sizeBytes?: number | null;
  statusLabel?: string;
};

type DocumentDropzoneFieldProps = {
  accept?: string;
  className?: string;
  description?: string;
  disabled?: boolean;
  id: string;
  label?: string;
  maxFileText?: string;
  multiple?: boolean;
  onClear?: () => void;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveSelectedFile?: (
    file: DocumentDropzoneSelectedFile,
    index: number,
  ) => void;
  selectedFile?: DocumentDropzoneSelectedFile | null;
  selectedFiles?: DocumentDropzoneSelectedFile[] | null;
  showSelectedPreview?: boolean;
  title?: string;
  uploading?: boolean;
  uploadingLabel?: string;
};

function formatFileSize(sizeBytes?: number | null) {
  if (!sizeBytes || sizeBytes <= 0) return null;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentDropzoneField({
  accept,
  className,
  description = "Drag & drop, or click to browse",
  disabled = false,
  id,
  label,
  maxFileText = "PDF, DOCX, XLSX · Up to 25 MB",
  multiple = false,
  onClear,
  onInputChange,
  onRemoveSelectedFile,
  selectedFile,
  selectedFiles,
  showSelectedPreview = true,
  title = "Drop shipment documents",
  uploading = false,
  uploadingLabel = "Uploading shipment documents...",
}: DocumentDropzoneFieldProps) {
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
    <div className={cn("mnx-document-dropzone-field", className)}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <label
        htmlFor={id}
        className={cn(
          "mnx-document-dropzone",
          disabled ? "is-disabled" : null,
        )}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <span className="mnx-document-dropzone-icon" aria-hidden="true">
          <ArrowUp />
        </span>
        <strong>{uploading ? uploadingLabel : title}</strong>
        <p>{description}</p>
        <small>{maxFileText}</small>
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
        <div className="mnx-document-dropzone-preview">
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
