"use client";

import { useState, useTransition } from "react";
import { FlaskConical, ToggleLeft, ToggleRight, AlertTriangle } from "lucide-react";
import { toggleGoogleChatLiveView } from "../actions";

interface GoogleChatLiveViewSettingsProps {
  /** Current value of the setting from DB */
  enabled: boolean;
}

export function GoogleChatLiveViewSettings({ enabled }: GoogleChatLiveViewSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleToggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    setMessage(null);

    startTransition(async () => {
      const result = await toggleGoogleChatLiveView(newValue);
      if (result.success) {
        setMessage({
          text: newValue
            ? "Google Chat Live View enabled. The new tab will appear in the Communication navigation bar."
            : "Google Chat Live View disabled. The tab has been removed.",
          type: "success",
        });
        setTimeout(() => setMessage(null), 5000);
      } else {
        // Revert on failure
        setIsEnabled(!newValue);
        setMessage({ text: result.error || "Failed to save setting.", type: "error" });
        setTimeout(() => setMessage(null), 6000);
      }
    });
  };

  return (
    <div className="rounded-xl border border-mono-border bg-mono-card p-6 shadow-sm space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2.5">
        <span className="monolith-icon-badge" style={{ background: "rgba(251,146,60,0.10)", color: "#D88700" }}>
          <FlaskConical size={16} />
        </span>
        <div>
          <h2 className="monolith-h2 text-mono-text">Experimental</h2>
          <p className="text-xs text-mono-muted mt-0.5">
            Features under active development. May change or be removed.
          </p>
        </div>
      </div>

      {/* Disclaimer banner */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-mono-soft border border-mono-border">
        <AlertTriangle size={14} className="text-[#D88700] shrink-0 mt-0.5" />
        <p className="text-xs text-mono-muted leading-relaxed">
          Experimental features are isolated and removable. Enabling them does not affect the
          existing Chat tab, sync jobs, OAuth connections, or job-space provisioning.
        </p>
      </div>

      {/* Toggle row */}
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-mono-text uppercase tracking-wide">
              Google Chat Live View
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-[#D88700]/40 text-[#D88700] bg-[#D88700]/10">
              Experimental
            </span>
          </div>
          <p className="text-xs text-mono-muted leading-relaxed max-w-lg">
            Adds a &quot;Google Chat Live View&quot; tab to the Communication navigation bar (between Chat and
            Job Spaces). Attempts to embed the real Google Chat web UI in an iframe. If Google blocks
            embedding (which is expected), clean fallback actions are shown instead.
          </p>
          <p className="text-[10px] text-mono-muted">
            Default: <strong>OFF</strong>. When OFF, no code loads, no APIs are called, and no existing
            tabs are affected.
          </p>
        </div>

        {/* Toggle button */}
        <button
          id="gclv-settings-toggle"
          onClick={handleToggle}
          disabled={isPending}
          aria-label={isEnabled ? "Disable Google Chat Live View" : "Enable Google Chat Live View"}
          aria-pressed={isEnabled}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-60 disabled:pointer-events-none ${
            isEnabled
              ? "bg-[#F9D972]/10 border-[#F9D972]/40 text-[#F9D972] hover:bg-[#F9D972]/20"
              : "bg-mono-card border-mono-border text-mono-muted hover:bg-mono-soft"
          }`}
        >
          {isEnabled ? (
            <>
              <ToggleRight size={16} />
              <span>Enabled</span>
            </>
          ) : (
            <>
              <ToggleLeft size={16} />
              <span>Disabled</span>
            </>
          )}
        </button>
      </div>

      {/* Feedback message */}
      {message && (
        <p
          className={`text-xs px-3 py-2 rounded-xl border ${
            message.type === "success"
              ? "text-[#F9D972] bg-[#F9D972]/10 border-[#F9D972]/30"
              : "text-[#D88700] bg-[#D88700]/10 border-[#D88700]/30"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
