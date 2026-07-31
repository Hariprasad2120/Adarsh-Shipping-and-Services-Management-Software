"use client";

import { Lock, RotateCcw, Save, TestTube2, Unlock } from "lucide-react";
import {
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspacePageHeader,
} from "@/components/monolith";

type ImportJobHeaderProps = {
  canReset: boolean;
  hasUnsavedChanges: boolean;
  isLocked: boolean;
  updatedAt: string;
  onLoadSample: () => void;
  onLockToggle: () => void;
  onManualSave: () => void;
  onReset: () => void;
};

export function ImportJobHeader({
  canReset,
  hasUnsavedChanges,
  isLocked,
  onLoadSample,
  onLockToggle,
  onManualSave,
  onReset,
  updatedAt,
}: ImportJobHeaderProps) {
  return (
    <div className="space-y-4">
      <WorkspacePageHeader
        eyebrow="CHA experimental workspace"
        title="Import Job Creation Lab"
        description="A functional testing workspace for import data entry, calculations, checklist summaries, and deterministic flat-file output."
        icon={<TestTube2 aria-hidden="true" />}
        actions={
          <>
            <WorkspaceBadge variant="warning">TEST LAB</WorkspaceBadge>
            <WorkspaceAction size="compact" variant="outline" onClick={onLoadSample} disabled={isLocked}>
              Load sample data
            </WorkspaceAction>
            <WorkspaceAction size="compact" variant="outline" onClick={onManualSave}>
              <Save aria-hidden="true" />
              Save
            </WorkspaceAction>
            <WorkspaceAction size="compact" variant="outline" onClick={onLockToggle}>
              {isLocked ? <Unlock aria-hidden="true" /> : <Lock aria-hidden="true" />}
              {isLocked ? "Unlock" : "Lock"}
            </WorkspaceAction>
            <WorkspaceAction size="compact" variant="destructive" onClick={onReset} disabled={!canReset}>
              <RotateCcw aria-hidden="true" />
              Reset Draft
            </WorkspaceAction>
          </>
        }
      />
      <WorkspaceAlert variant={isLocked ? "warning" : "info"}>
        <strong>This workspace is isolated from live CHA jobs.</strong>{" "}
        {isLocked
          ? "Draft is locked. Unlock to edit."
          : hasUnsavedChanges
            ? "Unsaved changes are waiting for automatic save."
            : `Draft saved locally. Last updated ${updatedAt || "now"}.`}
      </WorkspaceAlert>
    </div>
  );
}
