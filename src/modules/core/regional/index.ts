/**
 * Stage 2 — enterprise platform: organisation regional / locale / fiscal layer.
 *
 * `format.*`   — pure, context-in formatting primitives (client-safe).
 * `settings.*` — DB-backed `OrganisationSettings` loader + writer (server only).
 */
export * from "./format";
export * from "./settings";
