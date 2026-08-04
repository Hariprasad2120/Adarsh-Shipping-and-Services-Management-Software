"use client";

import { Loader2, X } from "lucide-react";
import { WorkspaceDialogLayer } from "@/components/layout/workspace-dialog";
import { WorkspaceBadge } from "@/components/layout/workspace";
import { MonolithIconAction, MonolithSpecLabel } from "@/components/ui/foundation";

type LetterPdfPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  pdfPath: string | null;
  htmlPreview?: string | null;
  loading?: boolean;
};

function buildViewerPath(pdfPath: string) {
  return `/api/hrms/letters/preview-file?path=${encodeURIComponent(pdfPath)}`;
}

function buildHtmlPreviewDocument(title: string, bodyHtml: string) {
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    `<title>${title}</title>`,
    "<style>",
    "html, body { margin: 0; padding: 0; background: #fff; color: #111827; }",
    "body { font-family: 'Times New Roman', Georgia, serif; }",
    ".sheet { max-width: 980px; margin: 0 auto; padding: 36px 40px 64px; line-height: 1.6; font-size: 17px; }",
    "p { margin: 0 0 12px; }",
    "h1, h2, h3 { margin: 20px 0 12px; line-height: 1.3; }",
    "ul, ol { margin: 0 0 14px 24px; }",
    "img { max-width: 100%; height: auto; }",
    "@media (max-width: 900px) { .sheet { padding: 24px 18px 48px; font-size: 15px; } }",
    "</style>",
    "</head>",
    "<body>",
    `<article class="sheet">${bodyHtml}</article>`,
    "</body>",
    "</html>",
  ].join("");
}

export function LetterPdfPreviewModal({
  open,
  onClose,
  title,
  description,
  pdfPath,
  htmlPreview,
  loading = false,
}: LetterPdfPreviewModalProps) {
  const viewerSrc = pdfPath
    ? `${buildViewerPath(pdfPath)}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`
    : null;
  const htmlDocument = htmlPreview
    ? buildHtmlPreviewDocument(title, htmlPreview)
    : null;

  return (
    <WorkspaceDialogLayer
      className="overflow-hidden"
      onClose={onClose}
      open={open}
      size="workspace"
    >
      <div className="flex h-[min(92vh,980px)] flex-col bg-[var(--mn-surface-page)]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-mono-border bg-mono-card px-6 py-5">
          <div className="space-y-2">
            <MonolithSpecLabel>Document Preview</MonolithSpecLabel>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-mono-text">{title}</h2>
              <WorkspaceBadge variant="accent">
                {pdfPath ? "PDF viewer" : "Letter preview"}
              </WorkspaceBadge>
            </div>
            {description ? (
              <p className="max-w-3xl text-sm text-mono-muted">{description}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MonolithIconAction onClick={onClose} aria-label="Close preview">
              <X className="size-5" />
            </MonolithIconAction>
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-white">
          {loading ? (
            <div className="flex h-full min-h-[28rem] items-center justify-center px-6">
              <div className="flex items-center gap-3 text-mono-muted">
                <Loader2 className="size-5 animate-spin text-mono-accent" />
                <span className="text-sm">Loading preview...</span>
              </div>
            </div>
          ) : viewerSrc ? (
            <div className="h-full overflow-hidden">
              <iframe
                src={viewerSrc}
                className="h-full min-h-[76vh] w-full border-0 bg-white"
                title={`${title} PDF preview`}
              />
            </div>
          ) : htmlDocument ? (
            <div className="h-full overflow-hidden">
              <iframe
                srcDoc={htmlDocument}
                className="h-full min-h-[76vh] w-full border-0 bg-white"
                title={`${title} letter preview`}
              />
            </div>
          ) : (
            <div className="flex h-full min-h-[28rem] items-center justify-center px-6 text-center text-sm text-mono-muted">
              No previewable PDF is available for this letter yet.
            </div>
          )}
        </div>
      </div>
    </WorkspaceDialogLayer>
  );
}
