"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { syncJobWorkspaceAction } from "./actions";
import { CommunicationButton } from "@/modules/communication/components/workspace/communication-workspace";
import { WorkspaceAlert } from "@/components/layout/workspace";

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
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during sync",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mnx-communication-inline-action">
      <CommunicationButton
        onClick={handleSync}
        disabled={loading}
        variant="primary"
      >
        <RefreshCw className={loading ? "mnx-state-spinner" : undefined} aria-hidden="true" />
        <span>{loading ? "Syncing Workspace..." : "Sync to Google Shared Drive"}</span>
      </CommunicationButton>

      {success && (
        <WorkspaceAlert variant="success">
          <CheckCircle2 aria-hidden="true" />
          <span>Workspace successfully provisioned & synced!</span>
        </WorkspaceAlert>
      )}

      {error && (
        <WorkspaceAlert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <span>{error}</span>
        </WorkspaceAlert>
      )}
    </div>
  );
}
