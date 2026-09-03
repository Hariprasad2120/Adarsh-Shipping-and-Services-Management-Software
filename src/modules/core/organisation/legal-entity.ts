/**
 * Stage 2 — enterprise platform: legal-entity + organisation-structure service.
 *
 * A tenant (`Organisation`) contains one or more `LegalEntity` rows, exactly one
 * marked `isDefault`. Small organisations touch only the auto-created default;
 * corporate groups add subsidiaries. `BusinessUnit` and `CostCentre` are
 * optional layers below an entity.
 *
 * Every by-id mutation is tenant-scoped: an admin in one organisation cannot
 * read or change another organisation's structure (MON-S1 §10, mirrors
 * `core/organisation/service.ts`).
 */

import { db } from "@/lib/db";

export class LegalEntityError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "LAST_ENTITY"
      | "DEFAULT_ENTITY"
      | "HAS_BRANCHES"
      | "DUPLICATE_NAME" = "NOT_FOUND",
  ) {
    super(message);
    this.name = "LegalEntityError";
  }
}

export type LegalEntityInput = {
  name: string;
  legalName?: string | null;
  entityType?: string | null;
  registrationNumber?: string | null;
  taxIdentifiers?: Record<string, string> | null;
  country?: string | null;
};

/**
 * Pure guard — whether an entity may be deleted. Kept separate from the DB call
 * so it is unit-testable. `branchCount` = branches still pointing at it,
 * `entityCount` = total entities in the org.
 */
export function assertCanDeleteLegalEntity(
  entity: { isDefault: boolean },
  counts: { branchCount: number; entityCount: number },
): void {
  if (entity.isDefault) {
    throw new LegalEntityError(
      "The default legal entity cannot be deleted. Set another entity as default first.",
      "DEFAULT_ENTITY",
    );
  }
  if (counts.entityCount <= 1) {
    throw new LegalEntityError(
      "An organisation must keep at least one legal entity.",
      "LAST_ENTITY",
    );
  }
  if (counts.branchCount > 0) {
    throw new LegalEntityError(
      `This legal entity still has ${counts.branchCount} branch(es). Move them to another entity first.`,
      "HAS_BRANCHES",
    );
  }
}

/**
 * Idempotently guarantee the organisation has a default legal entity. Returns
 * the default entity's id. Safe to call from provisioning, the setup wizard, or
 * lazily on first structure read.
 */
export async function ensureDefaultLegalEntity(orgId: string): Promise<string> {
  if (!orgId) throw new LegalEntityError("No active organisation.", "NOT_FOUND");

  const existingDefault = await db.legalEntity.findFirst({
    where: { orgId, isDefault: true },
    select: { id: true },
  });
  if (existingDefault) return existingDefault.id;

  // An org may have entities but none flagged default (data drift) — promote the
  // oldest rather than creating a duplicate.
  const anyEntity = await db.legalEntity.findFirst({
    where: { orgId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (anyEntity) {
    await db.legalEntity.update({ where: { id: anyEntity.id }, data: { isDefault: true } });
    return anyEntity.id;
  }

  const org = await db.organisation.findUnique({ where: { id: orgId }, select: { name: true } });
  const created = await db.legalEntity.create({
    data: { orgId, name: org?.name ?? "Default Entity", legalName: org?.name ?? null, isDefault: true },
    select: { id: true },
  });
  return created.id;
}

export async function listLegalEntities(orgId: string) {
  return db.legalEntity.findMany({
    where: { orgId },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { branches: true, businessUnits: true, costCentres: true } } },
  });
}

async function assertEntityInOrg(id: string, orgId: string) {
  const row = await db.legalEntity.findFirst({ where: { id, orgId } });
  if (!row) throw new LegalEntityError("Legal entity not found.", "NOT_FOUND");
  return row;
}

export async function getLegalEntity(id: string, orgId: string) {
  return assertEntityInOrg(id, orgId);
}

function normaliseInput(input: LegalEntityInput) {
  const name = input.name?.trim();
  if (!name) throw new LegalEntityError("A name is required.", "DUPLICATE_NAME");
  return {
    name,
    legalName: input.legalName?.trim() || null,
    entityType: input.entityType?.trim() || null,
    registrationNumber: input.registrationNumber?.trim() || null,
    taxIdentifiers: input.taxIdentifiers ?? undefined,
    country: input.country?.trim()?.toUpperCase() || null,
  };
}

export async function createLegalEntity(orgId: string, input: LegalEntityInput) {
  const data = normaliseInput(input);
  const clash = await db.legalEntity.findFirst({
    where: { orgId, name: data.name },
    select: { id: true },
  });
  if (clash) throw new LegalEntityError("An entity with that name already exists.", "DUPLICATE_NAME");

  const count = await db.legalEntity.count({ where: { orgId } });
  return db.legalEntity.create({
    data: { ...data, orgId, isDefault: count === 0 },
  });
}

export async function updateLegalEntity(id: string, orgId: string, input: LegalEntityInput) {
  await assertEntityInOrg(id, orgId);
  const data = normaliseInput(input);
  const clash = await db.legalEntity.findFirst({
    where: { orgId, name: data.name, NOT: { id } },
    select: { id: true },
  });
  if (clash) throw new LegalEntityError("An entity with that name already exists.", "DUPLICATE_NAME");
  return db.legalEntity.update({ where: { id }, data });
}

/** Make `id` the organisation's default entity; unset the previous default. */
export async function setDefaultLegalEntity(id: string, orgId: string) {
  await assertEntityInOrg(id, orgId);
  await db.$transaction([
    db.legalEntity.updateMany({
      where: { orgId, isDefault: true, NOT: { id } },
      data: { isDefault: false },
    }),
    db.legalEntity.update({ where: { id }, data: { isDefault: true, active: true } }),
  ]);
}

export async function deleteLegalEntity(id: string, orgId: string) {
  const entity = await assertEntityInOrg(id, orgId);
  const [branchCount, entityCount] = await Promise.all([
    db.branch.count({ where: { orgId, legalEntityId: id } }),
    db.legalEntity.count({ where: { orgId } }),
  ]);
  assertCanDeleteLegalEntity(entity, { branchCount, entityCount });
  return db.legalEntity.delete({ where: { id } });
}
