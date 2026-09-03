/**
 * Stage 2 — enterprise platform: reusable document numbering.
 *
 * `format.*`  — pure label / template / padding helpers.
 * `service.*` — `allocateNumber` (concurrency-safe), `previewNextNumber`,
 *               `upsertNumberingSequence`, `getNumberingSequence`.
 */
export * from "./format";
export * from "./service";
