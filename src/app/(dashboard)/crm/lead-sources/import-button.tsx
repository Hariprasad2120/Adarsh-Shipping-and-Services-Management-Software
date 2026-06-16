"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Play, Loader2, Monitor, Terminal } from "lucide-react";
import { runJustdialImportAction } from "@/modules/crm/actions";

export function ImportButtons({ isImporting, orgId }: { isImporting: boolean; orgId: string }) {
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
          const res = await fetch(`/api/crm/justdial-live?orgId=${orgId}&t=${Date.now()}`);
          if (res.ok) {
            const data = await res.json();
            setStatus(data.status);
            setScreenshotUrl(data.screenshot);
            const currentStatus = data.status?.status;
            
            // Auto-open viewport if running and triggered by user
            if (currentStatus === "RUNNING" && wasTriggeredByUser && !showViewport) {
              setShowViewport(true);
            }

            // Check if scraper completed
            if (currentStatus === "SUCCESS" || currentStatus === "FAILED") {
              if (wasTriggeredByUser) {
                if (currentStatus === "SUCCESS") {
                  toast.success(data.status?.currentStep || "Justdial leads imported successfully!");
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
          <button
            onClick={() => setShowViewport(true)}
            className="flex items-center gap-1.5 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-[#00c4b6] px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer mr-1 animate-pulse"
            title="Show live scraper progress window"
          >
            <Monitor className="size-3.5" />
            <span>Show Viewport</span>
          </button>
        )}

        <button
          onClick={handleImport}
          disabled={isPending}
          className="flex items-center gap-2 bg-[#00c4b6] hover:bg-[#00b0a3] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md shadow-[#00c4b6]/10 cursor-pointer"
          title="Trigger manual browser scraper run"
        >
          {runningImport ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4 text-white" />
          )}
          <span>{runningImport ? "Running Import..." : isImporting ? "Import Active..." : "Run Import Now"}</span>
        </button>
      </div>

      {/* Embedded Live Browser Viewport Modal */}
      {showViewport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl bg-[#0a0d12] border border-[#1c212a] rounded-xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Mock Browser Header */}
            <div className="flex items-center justify-between bg-[#0f1319] border-b border-[#1c212a] px-4 py-3 shrink-0">
              <div className="flex items-center gap-6 w-full">
                {/* Window Dots */}
                <div className="flex gap-1.5 shrink-0">
                  <span className="size-3 rounded-full bg-red-500/80" />
                  <span className="size-3 rounded-full bg-yellow-500/80" />
                  <span className="size-3 rounded-full bg-green-500/80" />
                </div>
                
                {/* Mock Address Bar */}
                <div className="flex items-center gap-2 bg-[#0a0d12] border border-[#1c212a] px-3 py-1 rounded-lg text-xs text-slate-400 w-full max-w-2xl font-mono select-none">
                  <Loader2 className="size-3 text-[#00c4b6] animate-spin shrink-0" />
                  <span className="truncate">{status?.currentUrl || "https://wap.justdial.com/analytics/enquiries"}</span>
                </div>
              </div>

              {/* Close/Minimize */}
              <button
                onClick={() => setShowViewport(false)}
                className="ml-4 px-3 py-1 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0"
              >
                Minimize Viewport
              </button>
            </div>

            {/* Viewport & Logs Panel Split */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#1c212a] overflow-hidden grow">
              
              {/* Left Side: Live Screenshot Viewport (2 cols) */}
              <div className="md:col-span-2 p-4 flex flex-col justify-between bg-[#07090d] overflow-y-auto">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Headless Scraper Stream
                    </span>
                    <span className="font-mono text-slate-500">
                      {status?.timestamp ? `Updated: ${new Date(status.timestamp).toLocaleTimeString()}` : "Initializing..."}
                    </span>
                  </div>

                  {/* Screenshot Image Frame */}
                  <div className="border border-[#1c212a] rounded-lg bg-[#0f1319] overflow-hidden aspect-video relative flex items-center justify-center shadow-inner group">
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
                      <div className="text-center space-y-2 text-slate-500">
                        <Loader2 className="size-8 animate-spin mx-auto text-[#00c4b6]" />
                        <p className="text-xs">Connecting to headless browser...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scraper Status details */}
                <div className="mt-4 p-3 bg-[#0f1319] rounded-lg border border-[#1c212a] space-y-2 shrink-0">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>STATUS: {status?.status || "RUNNING"}</span>
                    <span>
                      Ingesting: {status?.processedCount ?? 0} / {status?.totalCount ?? 0}
                    </span>
                  </div>
                  <div className="w-full bg-[#0a0d12] rounded-full h-2 overflow-hidden border border-[#1c212a]">
                    <div
                      className="bg-[#00c4b6] h-full transition-all duration-500"
                      style={{
                        width: `${
                          status?.totalCount > 0
                            ? Math.min(100, ((status.processedCount || 0) / status.totalCount) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-300 truncate">
                    <span className="text-[#00c4b6] font-semibold">Active Step:</span> {status?.currentStep || "Booting RPA worker..."}
                  </p>
                </div>
              </div>

              {/* Right Side: Log Console (1 col) */}
              <div className="p-4 bg-[#0a0d12] flex flex-col justify-between overflow-hidden">
                <div className="space-y-3 flex flex-col overflow-hidden h-full">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                    <Terminal className="size-4 text-[#00c4b6]" />
                    <span className="font-semibold uppercase tracking-wider">Console Output Logs</span>
                  </div>

                  {/* Terminal Box */}
                  <div className="bg-[#05070a] border border-[#1c212a] p-3 rounded-lg font-mono text-[11px] text-emerald-400 overflow-y-auto space-y-1.5 grow leading-relaxed min-h-[180px] md:max-h-full shadow-inner select-text">
                    {status?.logs && status.logs.length > 0 ? (
                      status.logs.map((log: string, idx: number) => (
                        <div key={idx} className="whitespace-pre-wrap select-text">
                          <span className="text-slate-600 select-none mr-1.5">&gt;</span>
                          {log}
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-600 italic">Initializing console logs output buffer...</div>
                    )}
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
}
