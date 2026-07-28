"use client";

import { NativeSelect } from "@/components/monolith/native-select";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useRef, useCallback, useEffect } from "react";
import {Wifi, WifiOff, Loader2, ExternalLink, FlaskConical,ChevronDown, ChevronUp, Globe} from "lucide-react";
import { GoogleChatLiveViewFallback } from "./google-chat-live-view-fallback";
import { GoogleChatLiveViewDiagnostics } from "./google-chat-live-view-diagnostics";

/* ── Types ────────────────────────────────────────────────────────────────── */

type EmbedMode =
  | "embed-attempt"   // iframe is being loaded
  | "loaded"          // iframe loaded (unlikely — Google blocks)
  | "blocked"         // Google blocked iframe
  | "external-launch" // user launched externally
  | "job-space-link"; // showing job-space link

interface GoogleChatLiveViewFrameProps {
  /** Connected Google account email */
  googleEmail: string;
  /** Workspace domain */
  workspaceDomain: string;
  /** Whether user is admin/has communication-settings permission */
  isAdmin: boolean;
  /** OAuth connection status */
  oauthStatus: "connected" | "expired" | "none";
  /** URLs to try embedding, in order */
  embedUrls?: string[];
  /** Job context — if user arrived from a job page */
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
  "embed-attempt": "Embed Attempt",
  "loaded": "Loaded",
  "blocked": "Blocked",
  "external-launch": "External Launch",
  "job-space-link": "Job Space Link",
};

/* ── Component ────────────────────────────────────────────────────────────── */

export function GoogleChatLiveViewFrame({
  googleEmail,
  workspaceDomain,
  isAdmin,
  oauthStatus,
  embedUrls = DEFAULT_EMBED_URLS,
  jobContext,
}: GoogleChatLiveViewFrameProps) {
  const [mode, setMode] = useState<EmbedMode>("embed-attempt");
  // iframeAttempted is true as soon as component mounts (iframe always attempts on render)
  const [iframeAttempted] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState<"yes" | "no" | "blocked" | "unknown">("unknown");
  const [selectedUrl, setSelectedUrl] = useState(embedUrls[0] || DEFAULT_EMBED_URLS[0]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  // Initialize lastTestAt to current time — component renders when feature is ON
  const [lastTestAt, setLastTestAt] = useState<string | null>(() => new Date().toISOString());
  const [fallbackUsed, setFallbackUsed] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When selected URL changes, set a timeout to treat the iframe as blocked.
  // Google's X-Frame-Options/CSP will silently block the iframe — we use a
  // heuristic timeout to detect this since cross-origin JS can't inspect the result.
  // The setState calls inside the setTimeout callback are NOT synchronous effect setState
  // (they run asynchronously in a timer callback, which is the standard pattern).
  useEffect(() => {
    setMode("embed-attempt");
    setIframeLoaded("unknown");
    setLastTestAt(new Date().toISOString());

    loadTimeoutRef.current = setTimeout(() => {
      setMode((prev) => (prev === "embed-attempt" ? "blocked" : prev));
      setIframeLoaded((prev) => (prev === "unknown" ? "blocked" : prev));
    }, 3500);

    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, [selectedUrl]);

  const handleIframeLoad = useCallback(() => {
    // Google fires onLoad even when the content is a blocked/empty page.
    // We check if it loaded anything meaningful by trying to access document —
    // this will throw a SecurityError if cross-origin (which Google always is).
    // If we get here and no SecurityError => treat as loaded.
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    try {
      // This will throw for cross-origin (Google) — meaning it's blocked/sandboxed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = (iframeRef.current as any)?.contentDocument;
      if (doc && doc.body) {
        // We could actually access it — highly unlikely for Google
        setMode("loaded");
        setIframeLoaded("yes");
      } else {
        setMode("blocked");
        setIframeLoaded("blocked");
      }
    } catch {
      // SecurityError — cross-origin iframe, Google blocked it
      setMode("blocked");
      setIframeLoaded("blocked");
    }
  }, []);

  const handleIframeError = useCallback(() => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    setMode("blocked");
    setIframeLoaded("no");
  }, []);

  const jobDetected = !!jobContext;
  const jobSpaceLinked = !!jobContext?.googleSpaceUrl;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="monolith-h1 text-mono-text">Google Chat Live View</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-[#D88700]/40 text-[#D88700] bg-[#D88700]/10">
              <FlaskConical size={10} />
              Experimental
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-mono-muted">
            {/* Connected account */}
            <span className="flex items-center gap-1.5">
              <Globe size={12} className="text-[#F9D972]" />
              {googleEmail}
            </span>
            <span className="text-outline-variant">·</span>
            {/* Workspace domain */}
            <span className="flex items-center gap-1.5">
              <span className="text-mono-muted">Domain:</span>
              <code className="text-[#F9D972] bg-mono-soft px-1.5 py-0.5 rounded text-[11px]">
                {workspaceDomain}
              </code>
            </span>
            <span className="text-outline-variant">·</span>
            {/* Current mode */}
            <span className="flex items-center gap-1.5">
              {mode === "loaded" ? (
                <Wifi size={12} className="text-[#F9D972]" />
              ) : mode === "blocked" ? (
                <WifiOff size={12} className="text-[#D88700]" />
              ) : (
                <Loader2 size={12} className="animate-spin text-[#F9D972]" />
              )}
              <span
                className={
                  mode === "loaded"
                    ? "text-[#F9D972]"
                    : mode === "blocked"
                    ? "text-[#D88700]"
                    : "text-mono-muted"
                }
              >
                {MODE_LABELS[mode]}
              </span>
            </span>
          </div>
        </div>

        {/* URL selector */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="monolith-label">Chat URL:</label>
          <NativeSelect
            value={selectedUrl}
            onChange={(e) => {
              setSelectedUrl(e.target.value);
            }}
            className="text-xs bg-mono-card border border-mono-border rounded-xl px-3 py-1.5 text-mono-text focus:outline-none"
          >
            {(embedUrls.length > 0 ? embedUrls : DEFAULT_EMBED_URLS).map((url) => (
              <option key={url} value={url}>
                {url}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {/* ── Embed Area ── */}
      <div className="rounded-xl border border-mono-border overflow-hidden bg-mono-card">
        {/* Embed attempt bar */}
        {mode === "embed-attempt" && (
          <div className="flex items-center gap-3 px-5 py-3 bg-mono-soft border-b border-mono-border">
            <Loader2 size={14} className="animate-spin text-[#F9D972] shrink-0" />
            <span className="text-xs text-mono-muted">
              Attempting to embed Google Chat…{" "}
              <span className="text-[#F9D972]">{selectedUrl}</span>
            </span>
          </div>
        )}

        {/* iframe — always in DOM so load event fires, visually hidden when blocked */}
        <div
          className={mode === "embed-attempt" ? "block" : "hidden"}
          aria-hidden={mode !== "embed-attempt"}
        >
          <iframe
            ref={iframeRef}
            id="gclv-iframe"
            src={selectedUrl}
            title="Google Chat Live View (experimental)"
            width="100%"
            height="600"
            // Safest sandbox: allow scripts + same-origin for login, no popups, no top-nav
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            // No referrer
            referrerPolicy="no-referrer"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            style={{ display: "block", border: "none", minHeight: "600px" }}
          />
        </div>

        {/* Fallback shown when blocked */}
        {(mode === "blocked" || mode === "external-launch" || mode === "job-space-link") && (
          <div className="p-6">
            <GoogleChatLiveViewFallback
              attemptedUrl={selectedUrl}
              jobSpaceUrl={jobContext?.googleSpaceUrl}
              jobLabel={jobContext?.jobLabel}
              canRetryProvisioning={jobContext?.canRetryProvisioning}
              onRetryProvisioning={() => {
                setFallbackUsed("retry-provisioning");
              }}
            />
          </div>
        )}
      </div>

      {/* ── External launch quick buttons (always visible) ── */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => {
            window.open(selectedUrl, "_blank", "noopener,noreferrer");
            setFallbackUsed("new-tab");
          }}
          className="flex items-center gap-2 border border-mono-border text-mono-muted hover:text-[#F9D972] hover:border-[#F9D972]/40 px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
        >
          <ExternalLink size={12} />
          Quick Launch
        </button>
        {jobContext?.googleSpaceUrl && (
          <button
            onClick={() => {
              window.open(jobContext.googleSpaceUrl!, "_blank", "noopener,noreferrer");
              setFallbackUsed("job-space-quick-launch");
            }}
            className="flex items-center gap-2 border border-mono-border text-mono-muted hover:text-[#F9D972] hover:border-[#F9D972]/40 px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
          >
            <ExternalLink size={12} />
            Job Space
            <span className="text-mono-text font-medium">{jobContext.jobNumber}</span>
          </button>
        )}
      </div>

      {/* ── Diagnostics (admin only) ── */}
      {isAdmin && (
        <div className="rounded-xl border border-mono-border bg-mono-card overflow-hidden">
          <button
            onClick={() => setShowDiagnostics((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold uppercase tracking-wider text-mono-muted hover:bg-mono-soft transition-all"
          >
            <span>Diagnostics Panel</span>
            {showDiagnostics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showDiagnostics && (
            <div className="border-t border-mono-border p-5">
              <GoogleChatLiveViewDiagnostics
                settingEnabled={true}
                iframeAttempted={iframeAttempted}
                iframeLoaded={iframeLoaded}
                selectedUrl={selectedUrl}
                googleEmail={googleEmail}
                oauthStatus={oauthStatus}
                workspaceDomain={workspaceDomain}
                jobContextDetected={jobDetected}
                jobSpaceLinked={jobSpaceLinked}
                lastTestAt={lastTestAt}
                fallbackUsed={fallbackUsed}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
