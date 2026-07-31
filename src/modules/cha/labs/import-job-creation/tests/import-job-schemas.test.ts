import { describe, expect, it } from "vitest";
import { createBlankImportJobDraft, createSampleImportJobDraft } from "../domain/import-job.defaults";
import {
  importInvoiceRecordSchema,
  importItemRecordSchema,
  importMainDetailsSchema,
} from "../domain/import-job.schemas";

describe("import job schemas", () => {
  it("rejects missing required main details", () => {
    const result = importMainDetailsSchema.safeParse(createBlankImportJobDraft().mainDetails);

    expect(result.success).toBe(false);
  });

  it("accepts valid sample main details", () => {
    const result = importMainDetailsSchema.safeParse(createSampleImportJobDraft().mainDetails);

    expect(result.success).toBe(true);
  });

  it("blocks invalid invoice and item records", () => {
    expect(importInvoiceRecordSchema.safeParse({}).success).toBe(false);
    expect(importItemRecordSchema.safeParse({}).success).toBe(false);
  });
});
