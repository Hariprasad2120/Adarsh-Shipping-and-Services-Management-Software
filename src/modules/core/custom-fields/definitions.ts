/**
 * Stage 2 — enterprise platform: custom-field definition management.
 */

import { db } from "@/lib/db";
import { isFieldType } from "./validate";

export class CustomFieldError extends Error {
  constructor(
    message: string,
    readonly code: "INVALID" | "NOT_FOUND" | "DUPLICATE_KEY" = "INVALID",
  ) {
    super(message);
    this.name = "CustomFieldError";
  }
}

export type FieldDefinitionInput = {
  key: string;
  label: string;
  fieldType: string;
  section?: string;
  helpText?: string | null;
  required?: boolean;
  defaultValue?: unknown;
  options?: unknown;
  validation?: unknown;
  visibility?: "VISIBLE" | "HIDDEN" | "READONLY";
  readPermission?: string | null;
  writePermission?: string | null;
  position?: number;
  active?: boolean;
};

const KEY_RE = /^[a-z][a-z0-9_]{0,63}$/;

function normalise(input: FieldDefinitionInput) {
  const key = input.key?.trim();
  if (!key || !KEY_RE.test(key)) {
    throw new CustomFieldError(
      "key must be lower_snake_case, start with a letter, max 64 chars",
    );
  }
  if (!isFieldType(input.fieldType)) {
    throw new CustomFieldError(`unknown field type "${input.fieldType}"`);
  }
  if (!input.label?.trim()) throw new CustomFieldError("label is required");
  return {
    key,
    label: input.label.trim(),
    fieldType: input.fieldType,
    section: input.section?.trim() ?? "",
    helpText: input.helpText?.trim() || null,
    required: input.required ?? false,
    defaultValue: (input.defaultValue ?? undefined) as object | undefined,
    options: (input.options ?? undefined) as object | undefined,
    validation: (input.validation ?? undefined) as object | undefined,
    visibility: input.visibility ?? "VISIBLE",
    readPermission: input.readPermission?.trim() || null,
    writePermission: input.writePermission?.trim() || null,
    position: input.position ?? 0,
    active: input.active ?? true,
  };
}

export async function listFieldDefinitions(
  orgId: string,
  objectType: string,
  opts: { includeInactive?: boolean } = {},
) {
  return db.customFieldDefinition.findMany({
    where: { orgId, objectType, ...(opts.includeInactive ? {} : { active: true }) },
    orderBy: [{ position: "asc" }, { label: "asc" }],
  });
}

export async function getFieldDefinition(id: string, orgId: string) {
  const row = await db.customFieldDefinition.findFirst({ where: { id, orgId } });
  if (!row) throw new CustomFieldError("Custom field not found.", "NOT_FOUND");
  return row;
}

export async function createFieldDefinition(
  orgId: string,
  objectType: string,
  input: FieldDefinitionInput,
) {
  const data = normalise(input);
  const clash = await db.customFieldDefinition.findFirst({
    where: { orgId, objectType, key: data.key },
    select: { id: true },
  });
  if (clash) throw new CustomFieldError(`key "${data.key}" already exists`, "DUPLICATE_KEY");
  return db.customFieldDefinition.create({ data: { ...data, orgId, objectType } });
}

export async function updateFieldDefinition(
  id: string,
  orgId: string,
  input: FieldDefinitionInput,
) {
  const existing = await getFieldDefinition(id, orgId);
  const data = normalise({ ...input, key: input.key ?? existing.key });
  // Key changes are allowed only while the field has no values, to avoid
  // orphaning stored data.
  if (data.key !== existing.key) {
    const hasValues = await db.customFieldValue.count({ where: { definitionId: id } });
    if (hasValues > 0) {
      throw new CustomFieldError("Cannot rename a field that already has values.");
    }
    const clash = await db.customFieldDefinition.findFirst({
      where: { orgId, objectType: existing.objectType, key: data.key, NOT: { id } },
      select: { id: true },
    });
    if (clash) throw new CustomFieldError(`key "${data.key}" already exists`, "DUPLICATE_KEY");
  }
  return db.customFieldDefinition.update({
    where: { id },
    data: { ...data, rowVersion: { increment: 1 } },
  });
}

/** Soft delete — keeps stored values, hides the field. */
export async function deactivateFieldDefinition(id: string, orgId: string) {
  await getFieldDefinition(id, orgId);
  return db.customFieldDefinition.update({ where: { id }, data: { active: false } });
}

/** Hard delete — removes the field and all its values. */
export async function deleteFieldDefinition(id: string, orgId: string) {
  await getFieldDefinition(id, orgId);
  return db.customFieldDefinition.delete({ where: { id } });
}

export async function reorderFieldDefinitions(
  orgId: string,
  objectType: string,
  orderedIds: string[],
) {
  await db.$transaction(
    orderedIds.map((id, position) =>
      db.customFieldDefinition.updateMany({
        where: { id, orgId, objectType },
        data: { position },
      }),
    ),
  );
}
