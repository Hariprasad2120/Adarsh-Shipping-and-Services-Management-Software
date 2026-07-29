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

function DiagnosticRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
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
    <div className="mnx-communication-diagnostics">
      <dl>
        <DiagnosticRow
          label="Setting enabled"
          value={settingEnabled ? "yes" : "no"}
        />
        <DiagnosticRow
          label="Iframe attempted"
          value={iframeAttempted ? "yes" : "no"}
        />
        <DiagnosticRow label="Iframe loaded" value={iframeLoadedLabel} />
        <DiagnosticRow label="Selected Chat URL" value={selectedUrl} />
        <DiagnosticRow
          label="Fallback action"
          value={fallbackUsed ?? "none"}
        />
        <DiagnosticRow label="Google account" value={googleEmail} />
        <DiagnosticRow label="OAuth status" value={oauthStatus} />
        <DiagnosticRow label="Workspace domain" value={workspaceDomain} />
        <DiagnosticRow
          label="Job context"
          value={jobContextDetected ? "detected" : "not detected"}
        />
        <DiagnosticRow
          label="Job space"
          value={jobSpaceLinked ? "linked" : "not linked"}
        />
        <DiagnosticRow
          label="Last test"
          value={
            lastTestAt
              ? new Date(lastTestAt).toLocaleString("en-IN")
              : "—"
          }
        />
        <DiagnosticRow
          label="Browser user agent"
          value={
            typeof navigator !== "undefined"
              ? `${navigator.userAgent.slice(0, 80)}…`
              : "—"
          }
        />
      </dl>
      <p>
        Visible only to administrators and users with Communication Settings
        permission. Google Chat message data is not logged here.
      </p>
    </div>
  );
}
