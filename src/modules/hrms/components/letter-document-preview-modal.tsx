"use client";

import * as React from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Printer,
  X,
} from "lucide-react";
import { WorkspaceDialogLayer } from "@/components/layout/workspace-dialog";
import {
  WorkspaceAction,
  WorkspaceBadge,
  WorkspacePanel,
} from "@/components/layout/workspace";
import { MonolithIconAction, MonolithSpecLabel } from "@/components/ui/foundation";

type LetterDocumentPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  pdfPath?: string | null;
  htmlPreview?: string | null;
  downloadPath?: string | null;
};

function buildPreviewDocument(title: string, bodyHtml: string) {
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    `<title>${title}</title>`,
    "<style>",
    "html, body { margin: 0; padding: 0; background: #f6f1e7; }",
    "body { font-family: Calibri, Arial, sans-serif; color: #111827; }",
    ".preview-shell { min-height: 100vh; padding: 32px; }",
    ".preview-sheet { max-width: 960px; margin: 0 auto; background: #ffffff; border: 1px solid #d8ccb5; border-radius: 20px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12); padding: 40px 48px; }",
    "p { margin: 0 0 12px; line-height: 1.6; }",
    "h1, h2, h3 { margin: 18px 0 10px; line-height: 1.25; }",
    "img { max-width: 100%; height: auto; }",
    "@media print { html, body { background: #ffffff; } .preview-shell { padding: 0; } .preview-sheet { box-shadow: none; border: 0; border-radius: 0; max-width: none; padding: 0; } }",
    "</style>",
    "</head>",
    "<body>",
    '<div class="preview-shell"><article class="preview-sheet">',
    bodyHtml,
    "</article></div>",
    "</body>",
    "</html>",
  ].join("");
}

export function LetterDocumentPreviewModal({
  open,
  onClose,
  title,
  description,
  pdfPath,
  htmlPreview,
  downloadPath,
}: LetterDocumentPreviewModalProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const browserViewerSrc = pdfPath
    ? `/${pdfPath}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`
    : undefined;
  const htmlDocument = htmlPreview ? buildPreviewDocument(title, htmlPreview) : null;

  const handlePrint = React.useCallback(() => {
    const iframeWindow = iframeRef.current?.contentWindow;
    if (iframeWindow) {
      try {
        iframeWindow.focus();
        iframeWindow.print();
        return;
      } catch {
        // Fallback below.
      }
    }

    if (browserViewerSrc) {
      const viewerWindow = window.open(browserViewerSrc, "_blank", "noopener,noreferrer");
      viewerWindow?.focus();
      return;
    }

    if (htmlDocument) {
      const printWindow = window.open("", "_blank", "noopener,noreferrer");
      if (!printWindow) return;
      printWindow.document.write(htmlDocument);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }, [browserViewerSrc, htmlDocument]);

  const handleOpenNew = React.useCallback(() => {
    if (browserViewerSrc) {
      window.open(browserViewerSrc, "_blank", "noopener,noreferrer");
      return;
    }

    if (htmlDocument) {
      const previewWindow = window.open("", "_blank", "noopener,noreferrer");
      if (!previewWindow) return;
      previewWindow.document.write(htmlDocument);
      previewWindow.document.close();
      previewWindow.focus();
    }
  }, [browserViewerSrc, htmlDocument]);

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
              <WorkspaceBadge variant={pdfPath ? "accent" : "warning"}>
                {pdfPath ? "PDF viewer" : "Draft preview"}
              </WorkspaceBadge>
            </div>
            {description ? (
              <p className="max-w-3xl text-sm text-mono-muted">{description}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {pdfPath || htmlPreview ? (
              <WorkspaceAction size="compact" variant="outline" onClick={handlePrint}>
                <Printer className="size-4" />
                <span>Print</span>
              </WorkspaceAction>
            ) : null}
            {pdfPath || htmlPreview ? (
              <WorkspaceAction size="compact" variant="outline" onClick={handleOpenNew}>
                <ExternalLink className="size-4" />
                <span>Open</span>
              </WorkspaceAction>
            ) : null}
            {downloadPath ? (
              <a
                href={`/${downloadPath}`}
                download
                className="mnx-button mnx-button-secondary mnx-button-compact inline-flex"
              >
                  <Download className="size-4" />
                  <span>Download</span>
              </a>
            ) : null}
            <MonolithIconAction onClick={onClose} aria-label="Close preview">
              <X className="size-5" />
            </MonolithIconAction>
          </div>
        </header>

        <div className="flex-1 bg-[radial-gradient(circle_at_top_right,_rgba(252,211,77,0.18),_transparent_42%),linear-gradient(180deg,rgba(246,241,231,1),rgba(239,233,219,1))] p-5">
          {browserViewerSrc ? (
            <WorkspacePanel className="h-full overflow-hidden rounded-[28px] border border-mono-border bg-white/90 p-3 shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
              <iframe
                ref={iframeRef}
                src={browserViewerSrc}
                className="h-full min-h-[70vh] w-full rounded-[20px] border-0 bg-[#1f2937]"
                title={`${title} PDF preview`}
              />
            </WorkspacePanel>
          ) : htmlDocument ? (
            <WorkspacePanel className="h-full overflow-hidden rounded-[28px] border border-mono-border bg-white/90 p-3 shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
              <iframe
                ref={iframeRef}
                srcDoc={htmlDocument}
                className="h-full min-h-[70vh] w-full rounded-[20px] border-0 bg-[#f6f1e7]"
                title={`${title} draft preview`}
              />
            </WorkspacePanel>
          ) : (
            <WorkspacePanel className="flex h-full min-h-[28rem] flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-mono-border bg-mono-card text-center text-mono-muted">
              <FileText className="size-10 text-mono-accent" />
              <p className="text-sm">
                No previewable document is available for this record yet.
              </p>
            </WorkspacePanel>
          )}
        </div>
      </div>
    </WorkspaceDialogLayer>
  );
}
