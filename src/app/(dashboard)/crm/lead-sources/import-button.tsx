"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Play, Loader2, KeyRound } from "lucide-react";
import { runJustdialImportAction, testJustdialSessionAction } from "@/modules/crm/actions";

export function ImportButtons({ isImporting }: { isImporting: boolean }) {
  const [runningImport, setRunningImport] = useState(false);
  const [testingSession, setTestingSession] = useState(false);

  const handleImport = async () => {
    setRunningImport(true);
    toast.info("Playwright browser launched. Running lead import task...");
    try {
      const res = await runJustdialImportAction();
      if (res.ok) {
        toast.success("Justdial leads imported and processed successfully!");
        window.location.reload();
      } else {
        toast.error(res.error || "Import run failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred during import run.");
    } finally {
      setRunningImport(false);
    }
  };

  const handleTestSession = async () => {
    setTestingSession(true);
    toast.info("Testing Justdial session connection...");
    try {
      const res = await testJustdialSessionAction();
      if (res.ok) {
        toast.success(`Session Active! Connected page title: "${res.data || "Dashboard"}"`);
      } else {
        toast.error(res.error || "Session check failed. Cookies might be expired.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred during session check.");
    } finally {
      setTestingSession(false);
    }
  };

  const isPending = runningImport || isImporting;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleTestSession}
        disabled={testingSession || isPending}
        className="flex items-center gap-2 bg-[#161f28] hover:bg-[#1f2d3a] disabled:opacity-50 border border-[#1c212a] text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer"
        title="Check if injected cookies bypass Justdial login screen"
      >
        {testingSession ? (
          <Loader2 className="size-4 animate-spin text-[#00c4b6]" />
        ) : (
          <KeyRound className="size-4 text-slate-400" />
        )}
        <span>{testingSession ? "Testing..." : "Test Session"}</span>
      </button>

      <button
        onClick={handleImport}
        disabled={isPending || testingSession}
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
  );
}
