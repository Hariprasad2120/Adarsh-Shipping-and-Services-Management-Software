"use client";

import * as React from "react";
import { createBlankImportJobDraft } from "../domain/import-job.defaults";
import type { ImportJobDraft } from "../domain/import-job.types";
import { LocalStorageImportJobDraftRepository } from "../repository/local-storage-import-job-repository";
import { importJobDraftReducer, type ImportJobDraftAction } from "./import-job-draft-reducer";

type ImportJobDraftContextValue = {
  draft: ImportJobDraft;
  dispatch: React.Dispatch<ImportJobDraftAction>;
  isLocked: boolean;
  isHydrated: boolean;
  hasUnsavedChanges: boolean;
  manualSave: () => void;
  resetDraft: () => void;
};

const ImportJobDraftContext = React.createContext<ImportJobDraftContextValue | null>(null);

export function ImportJobDraftProvider({ children }: { children: React.ReactNode }) {
  const repository = React.useMemo(() => new LocalStorageImportJobDraftRepository(), []);
  const [draft, dispatch] = React.useReducer(importJobDraftReducer, undefined, () =>
    createBlankImportJobDraft(),
  );
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const skipNextSave = React.useRef(true);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      dispatch({ type: "restore", draft: repository.load() });
      setIsHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [repository]);

  React.useEffect(() => {
    if (!isHydrated) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    setHasUnsavedChanges(true);
    const timeout = window.setTimeout(() => {
      repository.save(draft);
      setHasUnsavedChanges(false);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [draft, isHydrated, repository]);

  const manualSave = React.useCallback(() => {
    repository.save(draft);
    setHasUnsavedChanges(false);
  }, [draft, repository]);

  const resetDraft = React.useCallback(() => {
    repository.clear();
    dispatch({ type: "reset" });
    setHasUnsavedChanges(false);
  }, [repository]);

  const value = React.useMemo(
    () => ({
      draft,
      dispatch,
      isLocked: draft.status === "LOCKED",
      isHydrated,
      hasUnsavedChanges,
      manualSave,
      resetDraft,
    }),
    [draft, hasUnsavedChanges, isHydrated, manualSave, resetDraft],
  );

  return <ImportJobDraftContext.Provider value={value}>{children}</ImportJobDraftContext.Provider>;
}

export function useImportJobDraft() {
  const context = React.useContext(ImportJobDraftContext);
  if (!context) {
    throw new Error("useImportJobDraft must be used within ImportJobDraftProvider");
  }
  return context;
}
