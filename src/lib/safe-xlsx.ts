/**
 * Hardened wrapper around `xlsx` (SheetJS) — MON-S1-017 interim mitigation
 * while the migration to `exceljs` is pending (DEPENDENCY_REMEDIATION.md).
 *
 * `xlsx` has an unpatched prototype-pollution advisory (GHSA-4r6h-8v6p-xvw6)
 * and a ReDoS (GHSA-5pgg-2g8v-p4x9). Every code path that parses an
 * **attacker-influenced** workbook (payroll import, CRM rate-response parsing,
 * CHA masters bulk import, employee import) must go through `readWorkbook()`
 * instead of calling `XLSX.read` / `XLSX.readFile` directly.
 *
 * Protections:
 *  - hard byte-size ceiling before parsing
 *  - `Object.prototype` / `Array.prototype` frozen for the duration of the
 *    parse so a `__proto__` / `constructor.prototype` key in the sheet cannot
 *    mutate a global prototype
 *  - `cellDates` + `sheetStubs` off, `raw` on — minimises the parser surface
 *  - a coarse wall-clock guard (parsing a bomb spins CPU; we cannot truly
 *    interrupt sync `XLSX.read`, but we log + surface anything over budget)
 */

import * as XLSX from "xlsx";

export interface ReadWorkbookOptions {
  /** Max input size. Default 15 MiB. */
  maxBytes?: number;
  /** Extra options merged into the XLSX read call. */
  xlsxOptions?: XLSX.ParsingOptions;
  /** Label for logging. */
  source?: string;
}

export class WorkbookRejectedError extends Error {
  constructor(
    message: string,
    readonly code: "TOO_LARGE" | "PARSE_FAILED" | "EMPTY",
  ) {
    super(message);
    this.name = "WorkbookRejectedError";
  }
}

function withFrozenPrototypes<T>(fn: () => T): T {
  const targets = [Object.prototype, Array.prototype];
  const wasFrozen = targets.map((t) => Object.isFrozen(t));
  targets.forEach((t, i) => {
    if (!wasFrozen[i]) Object.freeze(t);
  });
  try {
    return fn();
  } finally {
    // Object.freeze is irreversible; if we froze it here it stays frozen for
    // the process, which is the safe direction. Nothing to undo.
  }
}

export function readWorkbook(
  data: Buffer | Uint8Array | ArrayBuffer,
  options: ReadWorkbookOptions = {},
): XLSX.WorkBook {
  const { maxBytes = 15 * 1024 * 1024, xlsxOptions, source = "workbook" } = options;

  const bytes =
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : data instanceof Uint8Array
        ? data
        : new Uint8Array(data);

  if (bytes.byteLength === 0) {
    throw new WorkbookRejectedError(`${source}: file is empty`, "EMPTY");
  }
  if (bytes.byteLength > maxBytes) {
    throw new WorkbookRejectedError(
      `${source}: file exceeds the ${(maxBytes / 1024 / 1024).toFixed(0)} MB limit`,
      "TOO_LARGE",
    );
  }

  const startedAt = Date.now();
  let wb: XLSX.WorkBook;
  try {
    wb = withFrozenPrototypes(() =>
      XLSX.read(bytes, {
        type: "array",
        raw: true,
        cellDates: false,
        cellFormula: false,
        cellHTML: false,
        sheetStubs: false,
        dense: true,
        ...xlsxOptions,
      }),
    );
  } catch (e) {
    throw new WorkbookRejectedError(
      `${source}: could not parse workbook (${e instanceof Error ? e.message : "unknown"})`,
      "PARSE_FAILED",
    );
  }

  const elapsed = Date.now() - startedAt;
  if (elapsed > 5000) {
    console.warn(`[safe-xlsx] ${source}: parse took ${elapsed}ms (possible ReDoS / bomb)`);
  }
  return wb;
}

/** Re-export the utils namespace so callers keep one import. */
export const utils = XLSX.utils;
export type { WorkBook, WorkSheet } from "xlsx";
