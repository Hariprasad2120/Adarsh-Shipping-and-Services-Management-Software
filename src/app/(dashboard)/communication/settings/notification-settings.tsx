"use client";

import { useEffect, useState } from "react";
import { Monitor, Volume2, VolumeX } from "lucide-react";
import { CommunicationBadge, CommunicationButton, CommunicationPanel, CommunicationPanelHeader } from "@/modules/communication/components/workspace/communication-workspace";
import { WorkspaceAlert } from "@/components/layout/workspace";

export function NotificationSettings() {
  const [desktopEnabled, setDesktopEnabled] = useState(false);
  const [browserPermission, setBrowserPermission] = useState("default");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setDesktopEnabled(
          localStorage.getItem("monolith_chat_desktop_notif") === "true",
        );
      } catch {
        // Storage may be unavailable in a restricted browser context.
      }
      if (typeof Notification !== "undefined") {
        setBrowserPermission(Notification.permission);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleDesktop() {
    const nextValue = !desktopEnabled;
    setDesktopEnabled(nextValue);
    localStorage.setItem(
      "monolith_chat_desktop_notif",
      nextValue ? "true" : "false",
    );
  }

  async function requestPermission() {
    if (typeof Notification !== "undefined") {
      setBrowserPermission(await Notification.requestPermission());
    }
  }

  return (
    <CommunicationPanel>
      <CommunicationPanelHeader eyebrow="Preferences" title="Chat notifications" />
      <div className="mnx-communication-panel-body">
        <div className="mnx-communication-setting-row">
          <Volume2 aria-hidden="true" />
          <span>
            <strong>In-app notifications</strong>
            <small>Toast alerts inside Monolith when messages arrive.</small>
          </span>
          <CommunicationBadge variant="success">Always on</CommunicationBadge>
        </div>
        <div className="mnx-communication-setting-row">
          <Monitor aria-hidden="true" />
          <span>
            <strong>Desktop notifications</strong>
            <small>System alerts when Monolith is minimised.</small>
          </span>
          <CommunicationButton
            onClick={toggleDesktop}
            aria-pressed={desktopEnabled}
            size="compact"
          >
            {desktopEnabled ? "Enabled" : "Disabled"}
          </CommunicationButton>
        </div>
        {desktopEnabled && browserPermission !== "granted" ? (
          <WorkspaceAlert variant="warning">
            <VolumeX aria-hidden="true" />
            <span>
              {browserPermission === "denied"
                ? "Notifications are blocked in browser settings."
                : "Browser permission is required for desktop notifications."}
            </span>
            {browserPermission !== "denied" ? (
              <CommunicationButton
                onClick={requestPermission}
                size="compact"
              >
                Allow
              </CommunicationButton>
            ) : null}
          </WorkspaceAlert>
        ) : null}
      </div>
    </CommunicationPanel>
  );
}
