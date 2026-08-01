"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FlaskConical,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { GoogleChatLiveViewFallback } from "./google-chat-live-view-fallback";
import { GoogleChatLiveViewDiagnostics } from "./google-chat-live-view-diagnostics";
import { CommunicationBadge, CommunicationButton, CommunicationPanel, CommunicationPanelHeader, CommunicationSelect } from "@/modules/communication/components/workspace/communication-workspace";
import { WorkspaceAlert } from "@/components/layout/workspace";

type EmbedMode =
  | "embed-attempt"
  | "loaded"
  | "blocked"
  | "external-launch"
  | "job-space-link";

interface GoogleChatLiveViewFrameProps {
  googleEmail: string;
  workspaceDomain: string;
  isAdmin: boolean;
  oauthStatus: "connected" | "expired" | "none";
  embedUrls?: string[];
  jobContext?: {
    jobNumber: string;
    jobLabel: string;
    googleSpaceUrl: string | null;
    canRetryProvisioning: boolean;
  } | null;
}

const DEFAULT_EMBED_URLS = [
  "https://mail.google.com/chat/u/0/",
  "https://chat.google.com/",
];

const MODE_LABELS: Record<EmbedMode, string> = {
  "embed-attempt": "Embed attempt",
  loaded: "Loaded",
  blocked: "Blocked",
  "external-launch": "External launch",
  "job-space-link": "Job space link",
};

export function GoogleChatLiveViewFrame({
  googleEmail,
  workspaceDomain,
  isAdmin,
  oauthStatus,
  embedUrls = DEFAULT_EMBED_URLS,
  jobContext,
}: GoogleChatLiveViewFrameProps) {
  const [mode, setMode] = useState<EmbedMode>("embed-attempt");
  const [iframeLoaded, setIframeLoaded] = useState<
    "yes" | "no" | "blocked" | "unknown"
  >("unknown");
  const [selectedUrl, setSelectedUrl] = useState(
    embedUrls[0] ?? DEFAULT_EMBED_URLS[0],
  );
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [lastTestAt, setLastTestAt] = useState<string | null>(() =>
    new Date().toISOString(),
  );
  const [fallbackUsed, setFallbackUsed] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMode("embed-attempt");
    setIframeLoaded("unknown");
    setLastTestAt(new Date().toISOString());
    loadTimeoutRef.current = setTimeout(() => {
      setMode((current) =>
        current === "embed-attempt" ? "blocked" : current,
      );
      setIframeLoaded((current) =>
        current === "unknown" ? "blocked" : current,
      );
    }, 3500);
    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, [selectedUrl]);

  const handleIframeLoad = useCallback(() => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    try {
      const documentValue = iframeRef.current?.contentDocument;
      if (documentValue?.body) {
        setMode("loaded");
        setIframeLoaded("yes");
      } else {
        setMode("blocked");
        setIframeLoaded("blocked");
      }
    } catch {
      setMode("blocked");
      setIframeLoaded("blocked");
    }
  }, []);

  const handleIframeError = useCallback(() => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    setMode("blocked");
    setIframeLoaded("no");
  }, []);

  const showFallback =
    mode === "blocked" ||
    mode === "external-launch" ||
    mode === "job-space-link";

  return (
    <>
      <CommunicationPanel>
        <CommunicationPanelHeader
          eyebrow="Experimental embed"
          title="Google Chat access"
          description={`${googleEmail} · ${workspaceDomain}`}
          actions={
            <CommunicationBadge
              variant={
                mode === "loaded"
                  ? "success"
                  : mode === "blocked"
                    ? "warning"
                    : "neutral"
              }
            >
              {mode === "loaded" ? (
                <Wifi aria-hidden="true" />
              ) : mode === "blocked" ? (
                <WifiOff aria-hidden="true" />
              ) : (
                <Loader2 className="mnx-state-spinner" aria-hidden="true" />
              )}
              {MODE_LABELS[mode]}
            </CommunicationBadge>
          }
        />
        <div className="mnx-communication-panel-body">
          <CommunicationBadge variant="warning">
            <FlaskConical aria-hidden="true" />
            Experimental
          </CommunicationBadge>
          <CommunicationSelect
            aria-label="Google Chat URL"
            value={selectedUrl}
            onChange={(event) => setSelectedUrl(event.target.value)}
          >
            {(embedUrls.length > 0 ? embedUrls : DEFAULT_EMBED_URLS).map(
              (url) => (
                <option key={url} value={url}>
                  {url}
                </option>
              ),
            )}
          </CommunicationSelect>
        </div>
      </CommunicationPanel>

      <CommunicationPanel>
        {mode === "embed-attempt" ? (
          <WorkspaceAlert variant="info">
            <Loader2 className="mnx-state-spinner" aria-hidden="true" />
            Attempting to embed {selectedUrl}
          </WorkspaceAlert>
        ) : null}
        <div
          className={
            mode === "embed-attempt"
              ? "mnx-communication-embed"
              : "mnx-communication-embed is-hidden"
          }
          aria-hidden={mode !== "embed-attempt"}
        >
          <iframe
            ref={iframeRef}
            id="gclv-iframe"
            src={selectedUrl}
            title="Google Chat Live View (experimental)"
            width="100%"
            height="600"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        </div>
        {showFallback ? (
          <div className="mnx-communication-panel-body">
            <GoogleChatLiveViewFallback
              attemptedUrl={selectedUrl}
              jobSpaceUrl={jobContext?.googleSpaceUrl}
              jobLabel={jobContext?.jobLabel}
              canRetryProvisioning={jobContext?.canRetryProvisioning}
              onRetryProvisioning={() =>
                setFallbackUsed("retry-provisioning")
              }
            />
          </div>
        ) : null}
      </CommunicationPanel>

      <div className="mnx-communication-form-actions">
        <CommunicationButton
          onClick={() => {
            window.open(selectedUrl, "_blank", "noopener,noreferrer");
            setMode("external-launch");
            setFallbackUsed("new-tab");
          }}
        >
          <ExternalLink aria-hidden="true" />
          Quick launch
        </CommunicationButton>
        {jobContext?.googleSpaceUrl ? (
          <CommunicationButton
            onClick={() => {
              window.open(
                jobContext.googleSpaceUrl!,
                "_blank",
                "noopener,noreferrer",
              );
              setMode("job-space-link");
              setFallbackUsed("job-space-quick-launch");
            }}
          >
            <ExternalLink aria-hidden="true" />
            Job space {jobContext.jobNumber}
          </CommunicationButton>
        ) : null}
      </div>

      {isAdmin ? (
        <CommunicationPanel>
          <CommunicationPanelHeader
            eyebrow="Administration"
            title="Diagnostics"
            actions={
              <CommunicationButton
                onClick={() => setShowDiagnostics((current) => !current)}
                size="compact"
                aria-expanded={showDiagnostics}
              >
                {showDiagnostics ? (
                  <ChevronUp aria-hidden="true" />
                ) : (
                  <ChevronDown aria-hidden="true" />
                )}
                {showDiagnostics ? "Hide" : "Show"}
              </CommunicationButton>
            }
          />
          {showDiagnostics ? (
            <div className="mnx-communication-panel-body">
              <GoogleChatLiveViewDiagnostics
                settingEnabled
                iframeAttempted
                iframeLoaded={iframeLoaded}
                selectedUrl={selectedUrl}
                googleEmail={googleEmail}
                oauthStatus={oauthStatus}
                workspaceDomain={workspaceDomain}
                jobContextDetected={Boolean(jobContext)}
                jobSpaceLinked={Boolean(jobContext?.googleSpaceUrl)}
                lastTestAt={lastTestAt}
                fallbackUsed={fallbackUsed}
              />
            </div>
          ) : null}
        </CommunicationPanel>
      ) : null}
    </>
  );
}
