/**
 * Stage 2 — enterprise platform: unified custom-field platform.
 *
 * `validate.*`    — pure value validation / normalisation (no code execution).
 * `definitions.*` — CustomFieldDefinition CRUD + reorder.
 * `values.*`      — validated, permission-gated value read / write.
 *
 * Converges `EmployeeProfileField` and `AccountingCustomFieldDefinition`; the
 * `CustomField` form-builder model is a different concept and stays separate.
 */
export * from "./validate";
export * from "./definitions";
export * from "./values";
