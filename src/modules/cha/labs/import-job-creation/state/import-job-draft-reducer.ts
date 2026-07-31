import { createBlankImportJobDraft, createSampleImportJobDraft } from "../domain/import-job.defaults";
import type {
  ImportDeclarationRecord,
  ImportIgmRecord,
  ImportInvoiceRecord,
  ImportItemRecord,
  ImportJobDraft,
  ImportJobMainDetails,
  ImportJobTabId,
  ImportSupportingDocumentRecord,
} from "../domain/import-job.types";

export type ImportJobDraftAction =
  | { type: "restore"; draft: ImportJobDraft }
  | { type: "set-active-tab"; tab: ImportJobTabId }
  | { type: "update-main-details"; value: ImportJobMainDetails }
  | { type: "upsert-igm"; record: ImportIgmRecord }
  | { type: "delete-igm"; id: string }
  | { type: "upsert-invoice"; record: ImportInvoiceRecord }
  | { type: "delete-invoice"; id: string }
  | { type: "upsert-item"; record: ImportItemRecord }
  | { type: "delete-item"; id: string }
  | { type: "upsert-declaration"; record: ImportDeclarationRecord }
  | { type: "delete-declaration"; id: string }
  | { type: "upsert-document"; record: ImportSupportingDocumentRecord }
  | { type: "delete-document"; id: string }
  | { type: "update-checklist"; value: Partial<ImportJobDraft["checklistOptions"]> }
  | { type: "update-flat-file"; value: Partial<ImportJobDraft["flatFileOptions"]> }
  | { type: "lock" }
  | { type: "unlock" }
  | { type: "reset" }
  | { type: "load-sample" };

function touch(draft: ImportJobDraft): ImportJobDraft {
  return { ...draft, updatedAt: new Date().toISOString() };
}

function nextSerial<T extends { serialNo: number }>(records: T[]) {
  return records.reduce((max, record) => Math.max(max, record.serialNo), 0) + 1;
}

function upsertRecord<T extends { id: string; serialNo: number }>(records: T[], record: T) {
  const existingIndex = records.findIndex((candidate) => candidate.id === record.id);
  if (existingIndex === -1) return [...records, { ...record, serialNo: record.serialNo || nextSerial(records) }];
  return records.map((candidate, index) => (index === existingIndex ? record : candidate));
}

export function importJobDraftReducer(
  draft: ImportJobDraft,
  action: ImportJobDraftAction,
): ImportJobDraft {
  switch (action.type) {
    case "restore":
      return action.draft;
    case "set-active-tab":
      return touch({ ...draft, activeTab: action.tab });
    case "update-main-details":
      return touch({
        ...draft,
        mainDetails: action.value,
        checklistOptions: {
          ...draft.checklistOptions,
          selectedJobNo: action.value.jobNo,
          jobDate: action.value.jobDate,
        },
        flatFileOptions: {
          ...draft.flatFileOptions,
          selectedJobNo: action.value.jobNo,
          jobDate: action.value.jobDate,
        },
      });
    case "upsert-igm":
      return touch({ ...draft, igmRecords: upsertRecord(draft.igmRecords, action.record) });
    case "delete-igm":
      return touch({ ...draft, igmRecords: draft.igmRecords.filter((record) => record.id !== action.id) });
    case "upsert-invoice":
      return touch({ ...draft, invoiceRecords: upsertRecord(draft.invoiceRecords, action.record) });
    case "delete-invoice":
      return touch({
        ...draft,
        invoiceRecords: draft.invoiceRecords.filter((record) => record.id !== action.id),
      });
    case "upsert-item":
      return touch({ ...draft, itemRecords: upsertRecord(draft.itemRecords, action.record) });
    case "delete-item":
      return touch({ ...draft, itemRecords: draft.itemRecords.filter((record) => record.id !== action.id) });
    case "upsert-declaration":
      return touch({
        ...draft,
        declarationRecords: upsertRecord(draft.declarationRecords, action.record),
      });
    case "delete-declaration":
      return touch({
        ...draft,
        declarationRecords: draft.declarationRecords.filter((record) => record.id !== action.id),
      });
    case "upsert-document":
      return touch({
        ...draft,
        supportingDocumentRecords: upsertRecord(draft.supportingDocumentRecords, action.record),
      });
    case "delete-document":
      return touch({
        ...draft,
        supportingDocumentRecords: draft.supportingDocumentRecords.filter((record) => record.id !== action.id),
      });
    case "update-checklist":
      return touch({ ...draft, checklistOptions: { ...draft.checklistOptions, ...action.value } });
    case "update-flat-file":
      return touch({ ...draft, flatFileOptions: { ...draft.flatFileOptions, ...action.value } });
    case "lock":
      return touch({ ...draft, status: "LOCKED" });
    case "unlock":
      return touch({ ...draft, status: "DRAFT" });
    case "reset":
      return createBlankImportJobDraft();
    case "load-sample":
      return createSampleImportJobDraft();
    default:
      return draft;
  }
}
