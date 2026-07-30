"use client";

import { CrmButton, CrmDialogLayer } from "@/components/monolith/crm-workspace";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Play, Loader2, Monitor, Terminal } from "lucide-react";
import { runJustdialImportAction } from "@/modules/crm/actions";

export function ImportButtons({
  isImporting,
  orgId,
}: {
  isImporting: boolean;
  orgId: string;
}) {
  const [runningImport, setRunningImport] = useState(false);
  const [wasTriggeredByUser, setWasTriggeredByUser] = useState(false);

  // Scraper status state
  const [status, setStatus] = useState<any>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string>("");
  const [showViewport, setShowViewport] = useState(false);
  const prevStatusRef = React.useRef<string>("");

  const handleImport = async () => {
    setRunningImport(true);
    setWasTriggeredByUser(true);
    setShowViewport(true);
    toast.info("Playwright browser launched. Running lead import task...");
    try {
      const res = await runJustdialImportAction();
      if (res.ok) {
        toast.info("Justdial scraper started in the background.");
      } else {
        toast.error(res.error || "Failed to start import.");
        setRunningImport(false);
        setWasTriggeredByUser(false);
        setShowViewport(false);
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred starting the import.");
      setRunningImport(false);
      setWasTriggeredByUser(false);
      setShowViewport(false);
    }
  };

  // Poll for progress updates
  const active = runningImport || isImporting;
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (active) {
      const poll = async () => {
        try {
          const res = await fetch(
            `/api/crm/justdial-live?orgId=${orgId}&t=${Date.now()}`,
          );
          if (res.ok) {
            const data = await res.json();
            setStatus(data.status);
            setScreenshotUrl(data.screenshot);
            const currentStatus = data.status?.status;

            // Auto-open viewport if running and triggered by user
            if (
              currentStatus === "RUNNING" &&
              wasTriggeredByUser &&
              !showViewport
            ) {
              setShowViewport(true);
            }

            // Check if scraper completed
            if (currentStatus === "SUCCESS" || currentStatus === "FAILED") {
              if (wasTriggeredByUser) {
                if (currentStatus === "SUCCESS") {
                  toast.success(
                    data.status?.currentStep ||
                      "Justdial leads imported successfully!",
                  );
                } else {
                  toast.error(data.status?.currentStep || "Import run failed.");
                }
              }
              setWasTriggeredByUser(false);
              setRunningImport(false);
              window.location.reload();
            }
            prevStatusRef.current = currentStatus || "";
          }
        } catch (e) {
          console.error("[Live Viewport] Polling failed:", e);
        }
      };

      poll();
      intervalId = setInterval(poll, 2000);
    } else {
      setStatus(null);
      setScreenshotUrl("");
      setShowViewport(false);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [active, orgId, wasTriggeredByUser, showViewport]);

  const isPending = runningImport || isImporting;

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Show Viewport if importer is running */}
        {active && (
          <CrmButton
            onClick={() => setShowViewport(true)}
            className="flex items-center gap-1.5 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] border border-[var(--mnx-border)] text-[var(--mnx-accent)] px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer mr-1 animate-pulse"
            title="Show live scraper progress window"
          >
            <Monitor className="size-3.5" />
            <span>Show Viewport</span>
          </CrmButton>
        )}

        <CrmButton
          onClick={handleImport}
          disabled={isPending}
          className="flex items-center gap-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] disabled:opacity-50 text-mono-text px-4 py-2 rounded-lg text-sm font-bold transition-all mnx-shadow-panel cursor-pointer"
          title="Trigger manual browser scraper run"
        >
          {runningImport ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4 text-mono-text" />
          )}
          <span>
            {runningImport
              ? "Running Import..."
              : isImporting
                ? "Import Active..."
                : "Run Import Now"}
          </span>
        </CrmButton>
      </div>

      {/* Embedded Live Browser Viewport Modal */}
      {showViewport && (
        <CrmDialogLayer
          open={showViewport}
          onClose={() => setShowViewport(false)}
          size="workspace"
          labelledBy="justdial-live-viewport-title"
        >
          <div className="relative w-full max-w-5xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-xl shadow-2xl mnx-shadow-panel overflow-hidden flex flex-col max-h-[85vh]">
            {/* Mock Browser Header */}
            <div className="flex items-center justify-between bg-[var(--mnx-surface)] border-b border-[var(--mnx-border)] px-4 py-3 shrink-0">
              <div className="flex items-center gap-6 w-full">
                {/* Window Dots */}
                <div className="flex gap-1.5 shrink-0">
                  <span className="size-3 rounded-full bg-[var(--mnx-danger-bg)]" />
                  <span className="size-3 rounded-full bg-[var(--mnx-warning-bg)]" />
                  <span className="size-3 rounded-full bg-[var(--mnx-success-bg)]" />
                </div>

                {/* Mock Address Bar */}
                <div className="flex items-center gap-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] px-3 py-1 rounded-lg text-xs text-mono-muted w-full max-w-2xl font-mono select-none">
                  <Loader2 className="size-3 text-[var(--mnx-accent)] animate-spin shrink-0" />
                  <span id="justdial-live-viewport-title" className="truncate">
                    {status?.currentUrl ||
                      "https://wap.justdial.com/analytics/enquiries"}
                  </span>
                </div>
              </div>

              {/* Close/Minimize */}
              <CrmButton
                onClick={() => setShowViewport(false)}
                className="ml-4 px-3 py-1 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] border border-[var(--mnx-border)] text-mono-muted hover:text-mono-text rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0"
              >
                Minimize Viewport
              </CrmButton>
            </div>

            {/* Viewport & Logs Panel Split */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--mnx-border)] overflow-hidden grow">
              {/* Left Side: Live Screenshot Viewport (2 cols) */}
              <div className="md:col-span-2 p-4 flex flex-col justify-between bg-[var(--mnx-surface)] overflow-y-auto">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-mono-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-[var(--mnx-success-bg)] animate-pulse" />
                      Live Headless Scraper Stream
                    </span>
                    <span className="font-mono text-mono-muted">
                      {status?.timestamp
                        ? `Updated: ${new Date(status.timestamp).toLocaleTimeString()}`
                        : "Initializing..."}
                    </span>
                  </div>

                  {/* Screenshot Image Frame */}
                  <div className="border border-[var(--mnx-border)] rounded-lg bg-[var(--mnx-surface)] overflow-hidden aspect-video relative flex items-center justify-center shadow-inner group">
                    {screenshotUrl ? (
                      <img
                        src={screenshotUrl}
                        alt="Playwright Scraper Screenshot"
                        className="w-full h-full object-contain object-top"
                        onError={(e) => {
                          e.currentTarget.style.opacity = "0";
                        }}
                        onLoad={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                      />
                    ) : (
                      <div className="text-center space-y-2 text-mono-muted">
                        <Loader2 className="size-8 animate-spin mx-auto text-[var(--mnx-accent)]" />
                        <p className="text-xs">
                          Connecting to headless browser...
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scraper Status details */}
                <div className="mt-4 p-3 bg-[var(--mnx-surface)] rounded-lg border border-[var(--mnx-border)] space-y-2 shrink-0">
                  <div className="flex items-center justify-between text-xs font-bold text-mono-text">
                    <span>STATUS: {status?.status || "RUNNING"}</span>
                    <span>
                      Ingesting: {status?.processedCount ?? 0} /{" "}
                      {status?.totalCount ?? 0}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--mnx-surface)] rounded-full h-2 overflow-hidden border border-[var(--mnx-border)]">
                    <div
                      className="bg-[var(--mnx-accent)] h-full transition-all duration-500"
                      style={{
                        width: `${
                          status?.totalCount > 0
                            ? Math.min(
                                100,
                                ((status.processedCount || 0) /
                                  status.totalCount) *
                                  100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-mono-muted truncate">
                    <span className="text-[var(--mnx-accent)] font-semibold">
                      Active Step:
                    </span>{" "}
                    {status?.currentStep || "Booting RPA worker..."}
                  </p>
                </div>
              </div>

              {/* Right Side: Log Console (1 col) */}
              <div className="p-4 bg-[var(--mnx-surface)] flex flex-col justify-between overflow-hidden">
                <div className="space-y-3 flex flex-col overflow-hidden h-full">
                  <div className="flex items-center gap-1.5 text-xs text-mono-muted shrink-0">
                    <Terminal className="size-4 text-[var(--mnx-accent)]" />
                    <span className="font-semibold uppercase tracking-wider">
                      Console Output Logs
                    </span>
                  </div>

                  {/* Terminal Box */}
                  <div className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)] p-3 rounded-lg font-mono text-[11px] text-[var(--mnx-success)] overflow-y-auto space-y-1.5 grow leading-relaxed min-h-[180px] md:max-h-full shadow-inner select-text">
                    {status?.logs && status.logs.length > 0 ? (
                      status.logs.map((log: string, idx: number) => (
                        <div
                          key={idx}
                          className="whitespace-pre-wrap select-text"
                        >
                          <span className="text-mono-muted select-none mr-1.5">
                            &gt;
                          </span>
                          {log}
                        </div>
                      ))
                    ) : (
                      <div className="text-mono-muted italic">
                        Initializing console logs output buffer...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CrmDialogLayer>
      )}
    </>
  );
}
