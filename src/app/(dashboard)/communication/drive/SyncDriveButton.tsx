"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { syncJobWorkspaceAction } from "./actions";

export default function SyncDriveButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await syncJobWorkspaceAction(jobId);
      if (res.ok) {
        setSuccess(true);
        router.refresh();
      } else {
        setError(res.error || "Failed to sync Drive folder");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during sync");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <button
        onClick={handleSync}
        disabled={loading}
        className="inline-flex items-center justify-center space-x-2 bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] disabled:opacity-60 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all shadow-sm"
      >
        <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        <span>{loading ? "Syncing Workspace..." : "Sync to Google Shared Drive"}</span>
      </button>

      {success && (
        <div className="flex items-center space-x-1.5 text-xs text-emerald-500 font-semibold mt-1">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>Workspace successfully provisioned & synced!</span>
        </div>
      )}

      {error && (
        <div className="flex items-start space-x-1.5 text-xs text-orange-500 font-semibold mt-1">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}
    </div>
  );
}
