"use client";

import { createBlankImportJobDraft } from "../domain/import-job.defaults";
import { parseStoredDraft, serializeDraftForStorage } from "../domain/import-job-serializer";
import type { ImportJobDraft } from "../domain/import-job.types";
import type { ImportJobDraftRepository } from "./import-job-draft-repository";

export const IMPORT_JOB_LAB_STORAGE_KEY = "monolith:cha-import-job-creation-lab:v1";

export class LocalStorageImportJobDraftRepository implements ImportJobDraftRepository {
  constructor(private readonly storage: Storage | null = typeof window === "undefined" ? null : window.localStorage) {}

  load(): ImportJobDraft {
    if (!this.storage) return createBlankImportJobDraft();
    return parseStoredDraft(this.storage.getItem(IMPORT_JOB_LAB_STORAGE_KEY));
  }

  save(draft: ImportJobDraft): void {
    if (!this.storage) return;
    this.storage.setItem(IMPORT_JOB_LAB_STORAGE_KEY, serializeDraftForStorage(draft));
  }

  clear(): void {
    if (!this.storage) return;
    this.storage.removeItem(IMPORT_JOB_LAB_STORAGE_KEY);
  }
}
