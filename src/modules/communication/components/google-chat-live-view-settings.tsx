"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { toggleGoogleChatLiveView } from "@/modules/communication/actions/google-chat-live-view";
import { CommunicationBadge, CommunicationButton, CommunicationPanel, CommunicationPanelHeader } from "@/modules/communication/components/workspace/communication-workspace";
import { WorkspaceAlert } from "@/components/layout/workspace";

export function GoogleChatLiveViewSettings({ enabled }: { enabled: boolean }) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  function handleToggle() {
    const nextValue = !isEnabled;
    setIsEnabled(nextValue);
    setMessage(null);

    startTransition(async () => {
      const result = await toggleGoogleChatLiveView(nextValue);
      if (result.success) {
        setMessage({
          text: nextValue
            ? "Google Chat Live View enabled. Its workspace tab is now available."
            : "Google Chat Live View disabled.",
          type: "success",
        });
        setTimeout(() => setMessage(null), 5000);
      } else {
        setIsEnabled(!nextValue);
        setMessage({
          text: result.error || "Failed to save setting.",
          type: "error",
        });
        setTimeout(() => setMessage(null), 6000);
      }
    });
  }

  return (
    <CommunicationPanel>
      <CommunicationPanelHeader
        eyebrow="Experimental"
        title="Google Chat live view"
        description="Attempt to embed the Google Chat web interface with a controlled fallback when Google blocks framing."
      />
      <div className="mnx-communication-panel-body">
        <WorkspaceAlert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <span>
            This isolated feature does not change the existing Chat tab, sync
            jobs, OAuth connection, or job-space provisioning.
          </span>
        </WorkspaceAlert>
        <div className="mnx-communication-setting-row">
          <span>
            <strong>Live view availability</strong>
            <small>Disabled by default and loaded only when enabled.</small>
          </span>
          <CommunicationBadge variant="warning">
            Experimental
          </CommunicationBadge>
          <CommunicationButton
            id="gclv-settings-toggle"
            onClick={handleToggle}
            disabled={isPending}
            aria-label={
              isEnabled
                ? "Disable Google Chat Live View"
                : "Enable Google Chat Live View"
            }
            aria-pressed={isEnabled}
            size="compact"
          >
            {isPending ? "Saving…" : isEnabled ? "Enabled" : "Disabled"}
          </CommunicationButton>
        </div>
        {message ? (
          <WorkspaceAlert
            variant={message.type === "success" ? "success" : "danger"}
          >
            {message.text}
          </WorkspaceAlert>
        ) : null}
      </div>
    </CommunicationPanel>
  );
}
