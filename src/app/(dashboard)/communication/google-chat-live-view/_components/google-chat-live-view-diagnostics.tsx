"use client";

interface DiagnosticsProps {
  settingEnabled: boolean;
  iframeAttempted: boolean;
  iframeLoaded: "yes" | "no" | "blocked" | "unknown";
  selectedUrl: string;
  googleEmail: string;
  oauthStatus: "connected" | "expired" | "none";
  workspaceDomain: string;
  jobContextDetected: boolean;
  jobSpaceLinked: boolean;
  lastTestAt: string | null;
  fallbackUsed: string | null;
}

function DiagRow({ label, value, highlight }: { label: string; value: string; highlight?: "cyan" | "orange" }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-mono-border/30 last:border-0">
      <span className="text-xs text-mono-muted">{label}</span>
      <span
        className={`text-xs monolith-numeric font-medium ${
          highlight === "cyan"
            ? "text-[#F9D972]"
            : highlight === "orange"
            ? "text-[#D88700]"
            : "text-mono-text"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function GoogleChatLiveViewDiagnostics({
  settingEnabled,
  iframeAttempted,
  iframeLoaded,
  selectedUrl,
  googleEmail,
  oauthStatus,
  workspaceDomain,
  jobContextDetected,
  jobSpaceLinked,
  lastTestAt,
  fallbackUsed,
}: DiagnosticsProps) {
  const iframeLoadedLabel =
    iframeLoaded === "yes"
      ? "yes (unexpected)"
      : iframeLoaded === "no"
      ? "no — error"
      : iframeLoaded === "blocked"
      ? "blocked (expected)"
      : "unknown";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-widest text-mono-muted font-bold">
          Admin Diagnostics
        </span>
        <span className="px-2 py-0.5 rounded text-[10px] bg-mono-soft text-mono-muted border border-mono-border uppercase tracking-wide">
          Live View
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Column 1: Feature state */}
        <div className="space-y-1">
          <p className="monolith-label text-mono-muted mb-2">Feature State</p>
          <DiagRow
            label="Setting Enabled"
            value={settingEnabled ? "yes" : "no"}
            highlight={settingEnabled ? "cyan" : "orange"}
          />
          <DiagRow
            label="Iframe Attempted"
            value={iframeAttempted ? "yes" : "no"}
            highlight={iframeAttempted ? "cyan" : undefined}
          />
          <DiagRow
            label="Iframe Loaded"
            value={iframeLoadedLabel}
            highlight={
              iframeLoaded === "yes"
                ? "cyan"
                : iframeLoaded === "blocked"
                ? "orange"
                : undefined
            }
          />
          <DiagRow label="Selected Chat URL" value={selectedUrl} />
          <DiagRow
            label="Fallback Action Used"
            value={fallbackUsed || "none"}
            highlight={fallbackUsed ? "cyan" : undefined}
          />
        </div>

        {/* Column 2: Connection & context */}
        <div className="space-y-1">
          <p className="monolith-label text-mono-muted mb-2">Connection &amp; Context</p>
          <DiagRow label="Google Account" value={googleEmail} />
          <DiagRow
            label="OAuth Status"
            value={oauthStatus}
            highlight={oauthStatus === "connected" ? "cyan" : "orange"}
          />
          <DiagRow label="Workspace Domain" value={workspaceDomain} />
          <DiagRow
            label="Job Context Detected"
            value={jobContextDetected ? "yes" : "no"}
            highlight={jobContextDetected ? "cyan" : undefined}
          />
          <DiagRow
            label="Job Google Space Linked"
            value={jobSpaceLinked ? "yes" : "no"}
            highlight={jobSpaceLinked ? "cyan" : undefined}
          />
        </div>
      </div>

      {/* Test timestamp & UA */}
      <div className="space-y-1 pt-2 border-t border-mono-border/30">
        <DiagRow
          label="Last Test Timestamp"
          value={lastTestAt ? new Date(lastTestAt).toLocaleString("en-IN") : "—"}
        />
        <DiagRow
          label="Browser User Agent"
          value={typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) + "…" : "—"}
        />
      </div>

      <p className="text-[10px] text-mono-muted">
        ℹ️ This panel is only visible to admins and users with Communication Settings permission.
        No Google Chat data is logged or stored here.
      </p>
    </div>
  );
}
