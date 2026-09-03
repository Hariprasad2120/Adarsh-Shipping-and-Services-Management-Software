/**
 * Stage 2 — enterprise platform: custom-field value read / write.
 *
 * Values are validated against their definition before persistence and can be
 * gated by per-field `readPermission` / `writePermission`. Pass a `can`
 * predicate (usually `(key) => can(userId, key)` from `@/lib/rbac`) to enforce
 * those gates; omit it only for trusted server-to-server callers.
 */

import { db } from "@/lib/db";
import { CustomFieldError } from "./definitions";
import { validateFieldValue } from "./validate";

export type PermissionCheck = (permissionKey: string) => boolean | Promise<boolean>;

async function allow(check: PermissionCheck | undefined, key: string | null): Promise<boolean> {
  if (!key) return true;
  if (!check) return true;
  return check(key);
}

/**
 * Read the custom-field values for one object as `{ key: value }`. Fields the
 * caller may not read (`readPermission`) and inactive fields are omitted;
 * fields with no stored value fall back to their `defaultValue` (or null).
 */
export async function getFieldValues(
  orgId: string,
  objectType: string,
  objectId: string,
  opts: { can?: PermissionCheck } = {},
): Promise<Record<string, unknown>> {
  const defs = await db.customFieldDefinition.findMany({
    where: { orgId, objectType, active: true },
    include: { values: { where: { objectId } } },
    orderBy: [{ position: "asc" }],
  });

  const out: Record<string, unknown> = {};
  for (const def of defs) {
    if (!(await allow(opts.can, def.readPermission))) continue;
    const stored = def.values[0];
    out[def.key] = stored ? stored.value : (def.defaultValue ?? null);
  }
  return out;
}

/** Batch read for many objects of the same type — avoids N+1. */
export async function getFieldValuesForMany(
  orgId: string,
  objectType: string,
  objectIds: string[],
  opts: { can?: PermissionCheck } = {},
): Promise<Record<string, Record<string, unknown>>> {
  if (objectIds.length === 0) return {};
  const defs = await db.customFieldDefinition.findMany({
    where: { orgId, objectType, active: true },
    orderBy: [{ position: "asc" }],
  });
  const readable = [];
  for (const def of defs) {
    if (await allow(opts.can, def.readPermission)) readable.push(def);
  }
  const rows = await db.customFieldValue.findMany({
    where: { orgId, objectType, objectId: { in: objectIds }, definitionId: { in: readable.map((d) => d.id) } },
  });
  const byObject = new Map<string, Map<string, unknown>>();
  for (const r of rows) {
    if (!byObject.has(r.objectId)) byObject.set(r.objectId, new Map());
    byObject.get(r.objectId)!.set(r.definitionId, r.value);
  }
  const out: Record<string, Record<string, unknown>> = {};
  for (const id of objectIds) {
    const rec: Record<string, unknown> = {};
    for (const def of readable) {
      rec[def.key] = byObject.get(id)?.get(def.id) ?? def.defaultValue ?? null;
    }
    out[id] = rec;
  }
  return out;
}

/**
 * Write a patch of custom-field values for one object. Every key must map to an
 * active definition, pass `writePermission`, and validate. All-or-nothing: on
 * any error nothing is written.
 */
export async function setFieldValues(
  orgId: string,
  objectType: string,
  objectId: string,
  patch: Record<string, unknown>,
  opts: { can?: PermissionCheck } = {},
): Promise<Record<string, unknown>> {
  const keys = Object.keys(patch);
  if (keys.length === 0) return {};

  const defs = await db.customFieldDefinition.findMany({
    where: { orgId, objectType, key: { in: keys }, active: true },
  });
  const byKey = new Map(defs.map((d) => [d.key, d]));

  const writes: { definitionId: string; value: unknown }[] = [];
  const errors: string[] = [];

  for (const key of keys) {
    const def = byKey.get(key);
    if (!def) {
      errors.push(`unknown or inactive custom field "${key}"`);
      continue;
    }
    if (def.visibility === "READONLY") {
      errors.push(`custom field "${key}" is read-only`);
      continue;
    }
    if (!(await allow(opts.can, def.writePermission))) {
      errors.push(`not permitted to write custom field "${key}"`);
      continue;
    }
    const r = validateFieldValue(def, patch[key]);
    if (!r.ok) {
      errors.push(r.error);
      continue;
    }
    writes.push({ definitionId: def.id, value: r.value });
  }

  if (errors.length > 0) {
    throw new CustomFieldError(errors.join("; "), "INVALID");
  }

  await db.$transaction(
    writes.map((w) =>
      w.value === null
        ? db.customFieldValue.deleteMany({
            where: { definitionId: w.definitionId, objectId },
          })
        : db.customFieldValue.upsert({
            where: { definitionId_objectId: { definitionId: w.definitionId, objectId } },
            create: {
              orgId,
              objectType,
              objectId,
              definitionId: w.definitionId,
              value: w.value as object,
            },
            update: { value: w.value as object },
          }),
    ),
  );

  return getFieldValues(orgId, objectType, objectId, opts);
}
