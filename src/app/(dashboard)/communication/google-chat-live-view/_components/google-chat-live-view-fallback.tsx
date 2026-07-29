"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, Check, Copy, ExternalLink, Monitor } from "lucide-react";
import {
  CommunicationButton,
  CommunicationPanel,
  CommunicationPanelHeader,
  WorkspaceAlert,
} from "@/components/monolith";

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
}: {
  attemptedUrl: string;
  jobSpaceUrl?: string | null;
  jobLabel?: string | null;
  canRetryProvisioning?: boolean;
  onRetryProvisioning?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [jobLinkCopied, setJobLinkCopied] = useState(false);
  const primaryUrl = attemptedUrl || GOOGLE_CHAT_URLS[0];

  const openNewTab = useCallback(() => {
    window.open(primaryUrl, "_blank", "noopener,noreferrer");
  }, [primaryUrl]);

  const openPopout = useCallback(() => {
    const width = 960;
    const height = 700;
    const left = Math.round(window.screen.width / 2 - width / 2);
    const top = Math.round(window.screen.height / 2 - height / 2);
    window.open(
      primaryUrl,
      "google-chat-popout",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`,
    );
  }, [primaryUrl]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(primaryUrl);
    } catch {
      const input = document.createElement("input");
      input.value = primaryUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [primaryUrl]);

  const copyJobLink = useCallback(async () => {
    if (!jobSpaceUrl) return;
    try {
      await navigator.clipboard.writeText(jobSpaceUrl);
    } catch {
      // Clipboard access can be unavailable in hardened browser contexts.
    } finally {
      setJobLinkCopied(true);
      setTimeout(() => setJobLinkCopied(false), 2000);
    }
  }, [jobSpaceUrl]);

  return (
    <>
      <WorkspaceAlert variant="warning">
        <AlertTriangle aria-hidden="true" />
        <div>
          <strong>Iframe embedding blocked</strong>
          <p>
            Google Chat blocks framing for security. Use one of the controlled
            external launch options.
          </p>
          <code>{primaryUrl}</code>
        </div>
      </WorkspaceAlert>

      <CommunicationPanel>
        <CommunicationPanelHeader
          eyebrow="Fallback"
          title="External launch"
          description="Open the real Google Chat web experience in a separate browser surface."
        />
        <div className="mnx-communication-panel-body mnx-communication-form-actions">
          <CommunicationButton
            id="gclv-open-new-tab"
            onClick={openNewTab}
            variant="primary"
          >
            <ExternalLink aria-hidden="true" />
            Open in new tab
          </CommunicationButton>
          <CommunicationButton id="gclv-open-popout" onClick={openPopout}>
            <Monitor aria-hidden="true" />
            Open popout
          </CommunicationButton>
          <CommunicationButton id="gclv-copy-link" onClick={copyLink}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? "Copied" : "Copy link"}
          </CommunicationButton>
        </div>
      </CommunicationPanel>

      <CommunicationPanel>
        <CommunicationPanelHeader
          eyebrow="Job context"
          title="Job Google Chat space"
          description={jobLabel ?? "No job context was supplied."}
        />
        <div className="mnx-communication-panel-body">
          {jobSpaceUrl ? (
            <div className="mnx-communication-form-actions">
              <CommunicationButton
                id="gclv-open-job-space"
                onClick={() =>
                  window.open(jobSpaceUrl, "_blank", "noopener,noreferrer")
                }
                variant="primary"
              >
                <ExternalLink aria-hidden="true" />
                Open job space
              </CommunicationButton>
              <CommunicationButton
                id="gclv-copy-job-space-link"
                onClick={copyJobLink}
              >
                {jobLinkCopied ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Copy aria-hidden="true" />
                )}
                {jobLinkCopied ? "Copied" : "Copy job-space link"}
              </CommunicationButton>
            </div>
          ) : (
            <>
              <p>No Google Chat space is linked to this job.</p>
              {canRetryProvisioning && onRetryProvisioning ? (
                <CommunicationButton
                  id="gclv-retry-provisioning"
                  onClick={onRetryProvisioning}
                >
                  Retry Google space provisioning
                </CommunicationButton>
              ) : null}
            </>
          )}
        </div>
      </CommunicationPanel>
    </>
  );
}
