import type { ImportJobDraft } from "../domain/import-job.types";

export interface ImportJobDraftRepository {
  load(): ImportJobDraft;
  save(draft: ImportJobDraft): void;
  clear(): void;
}
