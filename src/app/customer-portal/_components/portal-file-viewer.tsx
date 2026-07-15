"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ArrowUpRight,
  Download,
  FileArchive,
  FileImage,
  FileText,
  FileVideo,
  FolderOpen,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export type PortalViewerFile = {
  id: string;
  name: string;
  url: string;
  downloadUrl?: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedAt?: string | Date | null;
  uploadedByLabel?: string | null;
  statusLabel?: string | null;
  kindLabel?: string | null;
  description?: string | null;
};

type PortalFileViewerProps = {
  title: string;
  eyebrow: string;
  summary: string;
  files: PortalViewerFile[];
  triggerLabel?: string;
  triggerVariant?: "button" | "link";
};

function formatViewerDate(value?: string | Date | null) {
  if (!value) return "Not shared yet";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatViewerBytes(bytes?: number | null) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return "Size unavailable";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function inferPreviewKind(file: PortalViewerFile) {
  const mime = file.mimeType?.toLowerCase() ?? "";
  const name = file.name.toLowerCase();

  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return "image";
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("video/") || /\.(mp4|mov|webm|ogg)$/i.test(name)) return "video";
  return "other";
}

function FileKindIcon({ file }: { file: PortalViewerFile }) {
  const kind = inferPreviewKind(file);

  if (kind === "image") return <FileImage className="size-[18px]" />;
  if (kind === "video") return <FileVideo className="size-[18px]" />;
  if (file.kindLabel?.toLowerCase().includes("folder")) return <FolderOpen className="size-[18px]" />;
  if (file.name.toLowerCase().endsWith(".zip") || file.name.toLowerCase().endsWith(".rar")) {
    return <FileArchive className="size-[18px]" />;
  }
  return <FileText className="size-[18px]" />;
}

export function PortalFileViewer({
  title,
  eyebrow,
  summary,
  files,
  triggerLabel = "View",
  triggerVariant = "button",
}: PortalFileViewerProps) {
  const [open, setOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState(files[0]?.id ?? "");

  if (files.length === 0) return null;

  const selectedFile = files.find((file) => file.id === selectedFileId) ?? files[0];
  const previewKind = inferPreviewKind(selectedFile);
  const totalSize = files.reduce((sum, file) => sum + (file.sizeBytes ?? 0), 0);

  return (
    <>
      {triggerVariant === "link" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#00cec4] transition hover:text-[#00b8af] hover:underline"
        >
          <FileText size={16} />
          {triggerLabel}
        </button>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
          <FileText size={15} />
          {triggerLabel}
        </Button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={summary}
        className="max-w-6xl"
      >
        <div className="space-y-5">
          <section className="card-top-accent overflow-hidden rounded-[22px] border border-outline-variant/50 bg-surface shadow-sm">
            <div className="grid gap-5 border-b border-outline-variant/35 bg-surface px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-6">
              <div className="min-w-0">
                <p className="ds-label text-primary">{eyebrow}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h3 className="ds-h3 text-on-surface">{selectedFile.name}</h3>
                  <span className="rounded-full border border-outline-variant/60 bg-surface-container-low px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                    {selectedFile.kindLabel ?? "Document"}
                  </span>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                    {selectedFile.statusLabel ?? "Available"}
                  </span>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
                  {selectedFile.description ?? summary}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[360px]">
                <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low/70 px-4 py-3">
                  <p className="ds-label">Files</p>
                  <p className="mt-2 text-2xl ds-numeric text-on-surface">{files.length}</p>
                </div>
                <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low/70 px-4 py-3">
                  <p className="ds-label">Latest Size</p>
                  <p className="mt-2 text-sm font-semibold text-on-surface">{formatViewerBytes(selectedFile.sizeBytes)}</p>
                </div>
                <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low/70 px-4 py-3">
                  <p className="ds-label">Updated</p>
                  <p className="mt-2 text-sm font-semibold text-on-surface">{formatViewerDate(selectedFile.uploadedAt)}</p>
                </div>
                <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low/70 px-4 py-3">
                  <p className="ds-label">Library Size</p>
                  <p className="mt-2 text-sm font-semibold text-on-surface">{formatViewerBytes(totalSize)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] lg:px-6">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[20px] border border-outline-variant/45 bg-surface-container-low/60 shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-outline-variant/35 bg-surface-container-low/70 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="ds-icon-badge">
                        <FileKindIcon file={selectedFile} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-on-surface">{selectedFile.name}</p>
                        <p className="mt-0.5 text-xs text-on-surface-variant">
                          Preview {previewKind === "other" ? "not available for this format" : "ready"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(selectedFile.url, "_blank", "noopener,noreferrer")}
                      >
                        <ArrowUpRight size={15} />
                        Open
                      </Button>
                      {selectedFile.downloadUrl ? (
                        <Button type="button" size="sm" onClick={() => window.location.assign(selectedFile.downloadUrl!)}>
                          <Download size={15} />
                          Download
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="relative min-h-[420px] bg-background/40 p-4">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,196,182,0.08),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(0,81,213,0.05),transparent_38%)]" />
                    <div className="relative h-full min-h-[388px] overflow-hidden rounded-[18px] border border-outline-variant/40 bg-surface shadow-sm">
                      {previewKind === "image" ? (
                        <div className="flex h-full items-center justify-center bg-surface-container-low/40 p-4">
                          <Image
                            src={selectedFile.url}
                            alt={selectedFile.name}
                            width={1600}
                            height={1200}
                            unoptimized
                            className="max-h-[560px] w-auto max-w-full rounded-xl object-contain"
                          />
                        </div>
                      ) : null}

                      {previewKind === "pdf" ? (
                        <iframe
                          title={selectedFile.name}
                          src={selectedFile.url}
                          className="h-[560px] w-full bg-surface"
                        />
                      ) : null}

                      {previewKind === "video" ? (
                        <video controls className="h-[560px] w-full bg-black/80">
                          <source src={selectedFile.url} type={selectedFile.mimeType ?? undefined} />
                        </video>
                      ) : null}

                      {previewKind === "other" ? (
                        <div className="flex h-[560px] flex-col items-center justify-center gap-4 px-6 text-center">
                          <div className="flex size-16 items-center justify-center rounded-3xl border border-outline-variant/50 bg-surface-container-low text-primary">
                            <FileKindIcon file={selectedFile} />
                          </div>
                          <div className="space-y-2">
                            <h4 className="ds-h3 text-on-surface">Preview Not Available</h4>
                            <p className="mx-auto max-w-md text-sm leading-6 text-on-surface-variant">
                              This file format opens best in a separate tab. Use the actions above to view or download the latest version.
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-[20px] border border-outline-variant/45 bg-surface px-4 py-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="ds-h3 text-on-surface">File Versions</p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        Select a version to inspect its preview and metadata.
                      </p>
                    </div>
                    <span className="rounded-full border border-outline-variant/60 bg-surface-container-low px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      {files.length} entries
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {files.map((file) => {
                      const isSelected = file.id === selectedFile.id;

                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => setSelectedFileId(file.id)}
                          className={`grid w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                            isSelected
                              ? "border-primary/35 bg-primary/10 shadow-[0_8px_24px_rgba(0,196,182,0.10)]"
                              : "border-outline-variant/45 bg-surface-container-low/35 hover:border-outline-variant/70 hover:bg-surface-container-low/70"
                          }`}
                        >
                          <span className="flex size-11 items-center justify-center rounded-2xl border border-outline-variant/35 bg-surface text-primary">
                            <FileKindIcon file={file} />
                          </span>

                          <span className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_92px_120px_auto] sm:items-center sm:gap-3">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-on-surface">{file.name}</span>
                              <span className="mt-0.5 block text-xs text-on-surface-variant">
                                {file.kindLabel ?? "Document"}
                              </span>
                            </span>
                            <span className="hidden text-right text-xs text-on-surface-variant sm:block ds-numeric">
                              {formatViewerBytes(file.sizeBytes)}
                            </span>
                            <span className="hidden text-right text-xs text-on-surface-variant sm:block">
                              {formatViewerDate(file.uploadedAt)}
                            </span>
                            <span className="justify-self-start sm:justify-self-end">
                              <span className="inline-flex rounded-full bg-surface-container-low px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
                                {file.statusLabel ?? "Available"}
                              </span>
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[20px] border border-outline-variant/45 bg-surface p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="ds-icon-badge">
                      <ShieldCheck size={17} />
                    </span>
                    <p className="ds-h3 text-on-surface">File Details</p>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-outline-variant/45 bg-surface-container-low/45 px-4 py-3">
                      <p className="ds-label">Format</p>
                      <p className="mt-1 text-sm font-semibold text-on-surface">
                        {selectedFile.kindLabel ?? selectedFile.mimeType ?? "Shared file"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-outline-variant/45 bg-surface-container-low/45 px-4 py-3">
                      <p className="ds-label">Uploaded By</p>
                      <p className="mt-1 text-sm font-semibold text-on-surface">
                        {selectedFile.uploadedByLabel ?? "Customer portal"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-outline-variant/45 bg-surface-container-low/45 px-4 py-3">
                      <p className="ds-label">Uploaded On</p>
                      <p className="mt-1 text-sm font-semibold text-on-surface">
                        {formatViewerDate(selectedFile.uploadedAt)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-outline-variant/45 bg-surface-container-low/45 px-4 py-3">
                      <p className="ds-label">Availability</p>
                      <p className="mt-1 text-sm font-semibold text-on-surface">
                        {selectedFile.statusLabel ?? "Shared in portal"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[20px] border border-outline-variant/45 bg-surface p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="ds-h3 text-on-surface">Access Actions</p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        Open the active file outside the portal or save a local copy.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <Button
                      type="button"
                      className="w-full justify-between"
                      onClick={() => window.open(selectedFile.url, "_blank", "noopener,noreferrer")}
                    >
                      Open Full Viewer
                      <ArrowUpRight size={15} />
                    </Button>
                    {selectedFile.downloadUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => window.location.assign(selectedFile.downloadUrl!)}
                      >
                        Download File
                        <Download size={15} />
                      </Button>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-outline-variant/45 bg-surface-container-low/35 px-4 py-4 text-sm text-on-surface-variant">
                        Download is not available for this file source yet. Use the full viewer link to open it in a separate tab.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[20px] border border-outline-variant/45 bg-surface p-4 shadow-sm">
                  <p className="ds-h3 text-on-surface">Viewer Notes</p>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-outline-variant/45 bg-surface-container-low/45 px-4 py-3">
                      <p className="ds-label">Preview Support</p>
                      <p className="mt-1 text-sm text-on-surface">
                        PDFs, images, and videos render inline. Other document types open through the browser.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-outline-variant/45 bg-surface-container-low/45 px-4 py-3">
                      <p className="ds-label">Selection</p>
                      <p className="mt-1 text-sm text-on-surface">
                        Switching versions keeps the same viewer context so you can compare what changed across uploads.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </Modal>
    </>
  );
}
