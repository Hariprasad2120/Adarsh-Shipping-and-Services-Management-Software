"use client";

import { useState, useCallback } from "react";
import { Copy, Check, ExternalLink, Monitor, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoogleChatLiveViewFallbackProps {
  /** The primary Google Chat URL that was attempted */
  attemptedUrl: string;
  /** If user is in a job context, the job's linked Google Chat space URL */
  jobSpaceUrl?: string | null;
  /** Job context label (e.g. "JOB-12345 | Customer Name") */
  jobLabel?: string | null;
  /** Whether the current user has permission to retry provisioning */
  canRetryProvisioning?: boolean;
  /** Callback to retry space provisioning (admin/permitted users only) */
  onRetryProvisioning?: () => void;
}

const GOOGLE_CHAT_URLS = [
  "https://mail.google.com/chat/u/0/",
  "https://chat.google.com/",
];

export function GoogleChatLiveViewFallback({
  attemptedUrl,
  jobSpaceUrl,
  jobLabel,
  canRetryProvisioning = false,
  onRetryProvisioning,
}: GoogleChatLiveViewFallbackProps) {
  const [copied, setCopied] = useState(false);
  const [jobLinkCopied, setJobLinkCopied] = useState(false);

  const primaryUrl = attemptedUrl || GOOGLE_CHAT_URLS[0];

  const handleOpenNewTab = useCallback(() => {
    window.open(primaryUrl, "_blank", "noopener,noreferrer");
  }, [primaryUrl]);

  const handleOpenPopout = useCallback(() => {
    const width = 960;
    const height = 700;
    const left = Math.round(window.screen.width / 2 - width / 2);
    const top = Math.round(window.screen.height / 2 - height / 2);
    window.open(
      primaryUrl,
      "google-chat-popout",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`
    );
  }, [primaryUrl]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(primaryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = primaryUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [primaryUrl]);

  const handleOpenJobSpace = useCallback(() => {
    if (jobSpaceUrl) {
      window.open(jobSpaceUrl, "_blank", "noopener,noreferrer");
    }
  }, [jobSpaceUrl]);

  const handleCopyJobSpaceLink = useCallback(async () => {
    if (!jobSpaceUrl) return;
    try {
      await navigator.clipboard.writeText(jobSpaceUrl);
      setJobLinkCopied(true);
      setTimeout(() => setJobLinkCopied(false), 2000);
    } catch {
      setJobLinkCopied(true);
      setTimeout(() => setJobLinkCopied(false), 2000);
    }
  }, [jobSpaceUrl]);

  return (
    <div className="space-y-6">
      {/* Blocked message */}
      <div className="flex items-start gap-4 p-5 rounded-xl border border-outline-variant bg-surface-container-low">
        <span
          className="ds-icon-badge shrink-0 mt-0.5"
          style={{ background: "rgba(251,146,60,0.10)", color: "#fb923c" }}
        >
          <AlertTriangle size={18} />
        </span>
        <div className="space-y-1.5">
          <h3 className="ds-h3 text-on-surface">Iframe Embedding Blocked</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Google Chat cannot be embedded directly because Google blocks iframe rendering for security.
            This is expected behaviour — use the external launch options below to access Google Chat.
          </p>
          <p className="text-xs text-on-surface-variant">
            Attempted URL:{" "}
            <code className="text-[#00cec4] bg-surface-container px-1.5 py-0.5 rounded text-[11px]">
              {primaryUrl}
            </code>
          </p>
        </div>
      </div>

      {/* External launch actions */}
      <div className="rounded-xl border border-outline-variant bg-surface p-5 space-y-4">
        <div>
          <h3 className="ds-h3 text-on-surface mb-1">External Launch</h3>
          <p className="text-xs text-on-surface-variant">
            Open the real Google Chat web experience in a separate window.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            id="gclv-open-new-tab"
            onClick={handleOpenNewTab}
            className="flex items-center justify-center gap-2 bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
          >
            <ExternalLink size={14} />
            Open in New Tab
          </button>

          <button
            id="gclv-open-popout"
            onClick={handleOpenPopout}
            className="flex items-center justify-center gap-2 border border-outline-variant text-on-surface hover:bg-surface-container-low hover:border-[#00cec4]/40 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
          >
            <Monitor size={14} />
            Open Popout Window
          </button>

          <button
            id="gclv-copy-link"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 border border-outline-variant text-on-surface hover:bg-surface-container-low hover:border-[#00cec4]/40 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
          >
            {copied ? (
              <>
                <Check size={14} className="text-[#00cec4]" />
                <span className="text-[#00cec4]">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy Google Chat Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* Job Space section */}
      <div className="rounded-xl border border-outline-variant bg-surface p-5 space-y-4">
        <div>
          <h3 className="ds-h3 text-on-surface mb-1">Job Google Chat Space</h3>
          {jobLabel && (
            <p className="text-xs text-on-surface-variant">
              Context: <span className="text-on-surface font-medium">{jobLabel}</span>
            </p>
          )}
        </div>

        {jobSpaceUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded-xl border border-outline-variant">
              <div className="w-2 h-2 rounded-full bg-[#00cec4] shrink-0" />
              <span className="text-xs text-on-surface-variant truncate">{jobSpaceUrl}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                id="gclv-open-job-space"
                onClick={handleOpenJobSpace}
                className="flex items-center gap-2 bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
              >
                <ExternalLink size={14} />
                Open Job Google Space
              </button>
              <button
                id="gclv-copy-job-space-link"
                onClick={handleCopyJobSpaceLink}
                className="flex items-center gap-2 border border-outline-variant text-on-surface hover:bg-surface-container-low px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
              >
                {jobLinkCopied ? (
                  <>
                    <Check size={14} className="text-[#00cec4]" />
                    <span className="text-[#00cec4]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copy Job Space Link
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">
              No Google Chat space is linked to this job.
            </p>
            {canRetryProvisioning && onRetryProvisioning && (
              <Button
                id="gclv-retry-provisioning"
                variant="outline"
                size="sm"
                onClick={onRetryProvisioning}
              >
                Retry Google Space Provisioning
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
