import { describe, expect, it } from "vitest";
import { createSampleImportJobDraft } from "../domain/import-job.defaults";
import {
  buildStructuredTestFlatFile,
  checksumDraft,
  migrateStoredDraft,
  stableStringify,
} from "../domain/import-job-serializer";

describe("import job serializer", () => {
  it("produces stable serializer output", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe("{\"a\":2,\"b\":1}");
  });

  it("generates deterministic flat-file output with a checksum", () => {
    const draft = createSampleImportJobDraft();
    const first = buildStructuredTestFlatFile(draft, "2026-07-31T00:00:00.000Z");
    const second = buildStructuredTestFlatFile(draft, "2026-07-31T00:00:00.000Z");

    expect(first.flatFile).toBe(second.flatFile);
    expect(first.flatFile.split("\n")[0]).toBe("TEST FILE — NOT FOR ICEGATE SUBMISSION");
    expect(first.checksum).toBe(checksumDraft(draft));
  });

  it("migrates older stored draft shapes to version 1", () => {
    const migrated = migrateStoredDraft({ schemaVersion: 0, mainDetails: { jobNo: "OLD" } });

    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.mainDetails.jobNo).toBe("OLD");
    expect(migrated.movementDirection).toBe("IMPORT");
  });
});
