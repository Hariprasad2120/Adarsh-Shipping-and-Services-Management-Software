"use client";

import { useState, useEffect } from "react";
import { Bell, Monitor, Volume2, VolumeX } from "lucide-react";

export function NotificationSettings() {
  const [desktopEnabled, setDesktopEnabled] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<string>("default");

  useEffect(() => {
    // Load saved preference
    try {
      const stored = localStorage.getItem("monolith_chat_desktop_notif");
      if (stored === "true") setDesktopEnabled(true);
    } catch {}
    
    // Check browser permission
    if (typeof Notification !== "undefined") {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const toggleDesktop = () => {
    const newValue = !desktopEnabled;
    setDesktopEnabled(newValue);
    localStorage.setItem("monolith_chat_desktop_notif", newValue ? "true" : "false");
  };

  const requestPermission = async () => {
    if (typeof Notification !== "undefined") {
      const result = await Notification.requestPermission();
      setBrowserPermission(result);
    }
  };

  return (
    <div className="rounded-xl border border-mono-border bg-mono-card p-6 shadow-sm space-y-4">
      <h3 className="monolith-h3 text-mono-text flex items-center gap-2">
        <Bell size={16} className="text-[#F9D972]" />
        <span>Chat Notifications</span>
      </h3>

      <div className="space-y-3">
        {/* In-app notifications (always on) */}
        <div className="flex items-center justify-between p-3 bg-mono-soft border border-mono-border rounded-xl">
          <div className="flex items-center gap-3">
            <Volume2 size={16} className="text-[#F9D972] shrink-0" />
            <div>
              <span className="text-xs font-bold text-mono-text block">In-App Notifications</span>
              <span className="text-[10px] text-mono-muted block">
                Toast alerts inside Monolith when new messages arrive
              </span>
            </div>
          </div>
          <span className="text-[9px] font-bold text-[#F9D972] uppercase tracking-wider bg-[#F9D972]/10 px-2 py-1 rounded-lg">
            Always On
          </span>
        </div>

        {/* Desktop notifications toggle */}
        <div className="flex items-center justify-between p-3 bg-mono-soft border border-mono-border rounded-xl">
          <div className="flex items-center gap-3">
            <Monitor size={16} className={desktopEnabled ? "text-[#F9D972]" : "text-mono-muted"} />
            <div>
              <span className="text-xs font-bold text-mono-text block">Desktop Notifications</span>
              <span className="text-[10px] text-mono-muted block">
                System-level alerts even when Monolith is minimized
              </span>
            </div>
          </div>
          <button
            onClick={toggleDesktop}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              desktopEnabled ? "bg-[#F9D972]" : "bg-outline-variant"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                desktopEnabled ? "translate-x-4.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Browser permission status */}
        {desktopEnabled && browserPermission !== "granted" && (
          <div className="flex items-center justify-between p-3 bg-[#D88700]/5 border border-[#D88700]/20 rounded-xl">
            <div className="flex items-center gap-3">
              <VolumeX size={16} className="text-[#D88700] shrink-0" />
              <div>
                <span className="text-xs font-bold text-mono-text block">Browser Permission Required</span>
                <span className="text-[10px] text-mono-muted block">
                  {browserPermission === "denied"
                    ? "Notifications are blocked. Please enable them in your browser settings."
                    : "Click below to allow desktop notifications in this browser."}
                </span>
              </div>
            </div>
            {browserPermission !== "denied" && (
              <button
                onClick={requestPermission}
                className="bg-[#F9D972] text-white hover:bg-[#E8C85D] px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shrink-0"
              >
                Allow
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
