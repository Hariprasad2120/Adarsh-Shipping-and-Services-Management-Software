"use client";

import * as React from "react";
import { Download, ExternalLink, FileText, Printer } from "lucide-react";
import {
  WorkspaceAction,
  WorkspaceBadge,
  WorkspacePanel,
  WorkspacePanelHeader,
} from "@/components/layout/workspace";

type LetterDocumentPreviewSurfaceProps = {
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

export function LetterDocumentPreviewSurface({
  title,
  description,
  pdfPath,
  htmlPreview,
  downloadPath,
}: LetterDocumentPreviewSurfaceProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const pdfSrc = pdfPath
    ? `/${pdfPath}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`
    : undefined;
  const htmlDocument = htmlPreview ? buildPreviewDocument(title, htmlPreview) : null;

  const handlePrint = React.useCallback(() => {
    if (pdfSrc) {
      const previewWindow = window.open(pdfSrc, "_blank", "noopener,noreferrer");
      previewWindow?.focus();
      return;
    }

    const iframeWindow = iframeRef.current?.contentWindow;
    if (iframeWindow) {
      iframeWindow.focus();
      iframeWindow.print();
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
  }, [htmlDocument, pdfSrc]);

  const handleOpen = React.useCallback(() => {
    if (pdfSrc) {
      window.open(pdfSrc, "_blank", "noopener,noreferrer");
      return;
    }

    if (htmlDocument) {
      const previewWindow = window.open("", "_blank", "noopener,noreferrer");
      if (!previewWindow) return;
      previewWindow.document.write(htmlDocument);
      previewWindow.document.close();
      previewWindow.focus();
    }
  }, [htmlDocument, pdfSrc]);

  return (
    <WorkspacePanel className="overflow-hidden">
      <WorkspacePanelHeader
        eyebrow="Document preview"
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <WorkspaceBadge variant={pdfPath ? "accent" : "warning"}>
              {pdfPath ? "PDF viewer" : "Draft preview"}
            </WorkspaceBadge>
            {(pdfPath || htmlPreview) && (
              <WorkspaceAction size="compact" variant="outline" onClick={handlePrint}>
                <Printer className="size-4" />
                <span>Print</span>
              </WorkspaceAction>
            )}
            {(pdfPath || htmlPreview) && (
              <WorkspaceAction size="compact" variant="outline" onClick={handleOpen}>
                <ExternalLink className="size-4" />
                <span>Open</span>
              </WorkspaceAction>
            )}
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
          </div>
        }
      />

      <div className="bg-[radial-gradient(circle_at_top_right,_rgba(252,211,77,0.18),_transparent_42%),linear-gradient(180deg,rgba(246,241,231,1),rgba(239,233,219,1))] p-4">
        {pdfSrc ? (
          <div className="overflow-hidden rounded-[24px] border border-mono-border bg-white/90 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
            <object
              data={pdfSrc}
              type="application/pdf"
              className="h-[70vh] min-h-[34rem] w-full rounded-[16px] bg-[#1f2937]"
              aria-label={`${title} PDF preview`}
            >
              <div className="flex min-h-[34rem] flex-col items-center justify-center gap-3 rounded-[16px] border border-dashed border-mono-border bg-mono-card px-6 text-center text-mono-muted">
                <FileText className="size-10 text-mono-accent" />
                <p className="text-sm">
                  Your browser could not embed this PDF preview.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <WorkspaceAction size="compact" variant="outline" onClick={handleOpen}>
                    <ExternalLink className="size-4" />
                    <span>Open PDF</span>
                  </WorkspaceAction>
                  {downloadPath ? (
                    <a
                      href={`/${downloadPath}`}
                      download
                      className="mnx-button mnx-button-secondary mnx-button-compact inline-flex"
                    >
                      <Download className="size-4" />
                      <span>Download PDF</span>
                    </a>
                  ) : null}
                </div>
              </div>
            </object>
          </div>
        ) : htmlDocument ? (
          <div className="overflow-hidden rounded-[24px] border border-mono-border bg-white/90 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
            <iframe
              ref={iframeRef}
              srcDoc={htmlDocument}
              className="h-[70vh] min-h-[34rem] w-full rounded-[16px] border-0 bg-[#f6f1e7]"
              title={`${title} draft preview`}
            />
          </div>
        ) : (
          <div className="flex min-h-[34rem] flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-mono-border bg-mono-card text-center text-mono-muted">
            <FileText className="size-10 text-mono-accent" />
            <p className="text-sm">
              No previewable document is available for this record yet.
            </p>
          </div>
        )}
      </div>
    </WorkspacePanel>
  );
}
