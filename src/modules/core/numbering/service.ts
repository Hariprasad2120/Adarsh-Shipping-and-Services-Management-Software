/**
 * Stage 2 — enterprise platform: concurrency-safe document numbering service.
 *
 * `allocateNumber()` bumps `nextValue` with a single atomic `UPDATE … RETURNING`
 * that also evaluates the period-reset condition, so two concurrent callers
 * serialise on the row's write lock and get distinct values.
 *
 * Gap behaviour: if you pass your own `tx`, a rollback un-spends the number
 * (gapless, but a crash between allocate and commit loses it). With no `tx` the
 * bump commits immediately in its own transaction (never a duplicate, may gap).
 * A strictly-gapless legal series must allocate inside the business `tx`.
 */

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  formatSequenceNumber,
  isResetPolicy,
  periodLabelFor,
  type ResetPolicy,
} from "./format";

export class NumberingError extends Error {
  constructor(
    message: string,
    readonly code: "SEQUENCE_NOT_FOUND" | "INVALID_DEFINITION" = "SEQUENCE_NOT_FOUND",
  ) {
    super(message);
    this.name = "NumberingError";
  }
}

export type SequenceScope = {
  orgId: string;
  moduleId: string;
  docType: string;
  legalEntityId?: string | null;
  scopeKey?: string;
};

export type SequenceDefinition = {
  prefix?: string;
  suffix?: string;
  padding?: number;
  startValue?: number;
  resetPolicy?: ResetPolicy;
  active?: boolean;
};

function normaliseScope(scope: SequenceScope) {
  if (!scope.orgId) throw new NumberingError("orgId is required", "INVALID_DEFINITION");
  if (!scope.moduleId || !scope.docType) {
    throw new NumberingError("moduleId and docType are required", "INVALID_DEFINITION");
  }
  return {
    orgId: scope.orgId,
    moduleId: scope.moduleId,
    docType: scope.docType,
    legalEntityId: scope.legalEntityId ?? null,
    scopeKey: scope.scopeKey ?? "",
  };
}

/** Create or update the definition for a sequence scope. Never touches `nextValue`. */
export async function upsertNumberingSequence(
  scope: SequenceScope,
  def: SequenceDefinition,
) {
  const s = normaliseScope(scope);
  if (def.resetPolicy && !isResetPolicy(def.resetPolicy)) {
    throw new NumberingError(`invalid resetPolicy: ${def.resetPolicy}`, "INVALID_DEFINITION");
  }
  const existing = await findSequence(db, s);
  const data = {
    prefix: def.prefix ?? "",
    suffix: def.suffix ?? "",
    padding: Math.max(def.padding ?? 1, 1),
    resetPolicy: def.resetPolicy ?? "NEVER",
    startValue: BigInt(def.startValue ?? 1),
    active: def.active ?? true,
  };
  if (existing) {
    return db.numberingSequence.update({ where: { id: existing.id }, data });
  }
  return db.numberingSequence.create({
    data: { ...s, ...data, nextValue: BigInt(def.startValue ?? 1) },
  });
}

async function findSequence(
  client: Prisma.TransactionClient | typeof db,
  s: ReturnType<typeof normaliseScope>,
) {
  return client.numberingSequence.findFirst({
    where: {
      orgId: s.orgId,
      moduleId: s.moduleId,
      docType: s.docType,
      legalEntityId: s.legalEntityId,
      scopeKey: s.scopeKey,
    },
  });
}

export async function getNumberingSequence(scope: SequenceScope) {
  return findSequence(db, normaliseScope(scope));
}

function needsFiscalContext(row: { resetPolicy: string; prefix: string; suffix: string }) {
  return (
    row.resetPolicy === "ANNUALLY" ||
    row.prefix.includes("{FY}") ||
    row.suffix.includes("{FY}")
  );
}

/**
 * Fiscal-year start month from OrganisationSettings, read directly (not through
 * the `unstable_cache` accessor) so numbering works from background jobs and
 * scripts that run outside a Next.js request context.
 */
async function fiscalStartMonth(orgId: string): Promise<number> {
  const row = await db.organisationSettings.findUnique({
    where: { orgId },
    select: { fiscalYearStartMonth: true },
  });
  return row?.fiscalYearStartMonth || 1;
}

export type AllocateResult = {
  formatted: string;
  value: bigint;
  sequenceId: string;
};

type AllocatedRow = {
  id: string;
  prefix: string;
  suffix: string;
  padding: number;
  value: bigint;
};

/**
 * Atomic bump: a single UPDATE … RETURNING evaluates the period-reset condition
 * against the current row under its write lock, so concurrent callers serialise
 * on that row and receive distinct values. Runs in its own implicit transaction
 * (no interactive `$transaction`), so it does not hold a pool connection open or
 * un-spend on an unrelated rollback.
 */
async function bump(
  client: Prisma.TransactionClient | typeof db,
  s: ReturnType<typeof normaliseScope>,
  wantedPeriod: string,
): Promise<AllocatedRow | undefined> {
  const rows = await client.$queryRaw<AllocatedRow[]>`
    UPDATE "NumberingSequence"
    SET "nextValue" = CASE
          WHEN "resetPolicy" <> 'NEVER' AND "periodLabel" <> ${wantedPeriod}
          THEN "startValue" + 1
          ELSE "nextValue" + 1
        END,
        "periodLabel" = CASE
          WHEN "resetPolicy" <> 'NEVER' THEN ${wantedPeriod}
          ELSE "periodLabel"
        END,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "orgId" = ${s.orgId}
      AND "moduleId" = ${s.moduleId}
      AND "docType" = ${s.docType}
      AND COALESCE("legalEntityId", '') = ${s.legalEntityId ?? ""}
      AND "scopeKey" = ${s.scopeKey}
      AND "active" = TRUE
    RETURNING "id", "prefix", "suffix", "padding",
              (CASE
                 WHEN "resetPolicy" <> 'NEVER' AND "periodLabel" <> ${wantedPeriod}
                 THEN "startValue"
                 ELSE "nextValue" - 1
               END) AS "value"
  `;
  return rows[0];
}

/**
 * Allocate the next number for a sequence scope.
 *
 * @param at    business date (for period reset + {FY}/{MM} tokens). Default now.
 * @param tx    allocate inside an existing transaction (rollback un-spends the
 *              number — use this for a strictly-gapless legal series).
 * @param createIfMissing  definition to auto-create the sequence on first use.
 */
export async function allocateNumber(
  scope: SequenceScope,
  opts: {
    at?: Date;
    tx?: Prisma.TransactionClient;
    createIfMissing?: SequenceDefinition;
  } = {},
): Promise<AllocateResult> {
  const s = normaliseScope(scope);
  const at = opts.at ?? new Date();
  const client = opts.tx ?? db;

  // Read the definition (unlocked) to decide whether a fiscal calendar is
  // needed and what period label to target. The atomic UPDATE re-checks the
  // reset condition against the live row, so a stale read here is self-healing.
  let def = await findSequence(db, s);

  if (!def) {
    if (!opts.createIfMissing) {
      throw new NumberingError(
        `no numbering sequence for ${s.moduleId}/${s.docType}`,
        "SEQUENCE_NOT_FOUND",
      );
    }
    try {
      await upsertNumberingSequence(scope, opts.createIfMissing);
    } catch {
      // Lost a create race — fine, the row now exists.
    }
    def = await findSequence(db, s);
    if (!def) {
      throw new NumberingError("failed to create numbering sequence", "INVALID_DEFINITION");
    }
  }

  const fyStart = (needsFiscalContext(def)) ? await fiscalStartMonth(s.orgId) : 1;
  const policy: ResetPolicy = isResetPolicy(def.resetPolicy) ? def.resetPolicy : "NEVER";
  const wantedPeriod = periodLabelFor(policy, at, fyStart);

  const row = await bump(client, s, wantedPeriod);
  if (!row) {
    throw new NumberingError(
      `numbering sequence for ${s.moduleId}/${s.docType} is inactive or was removed`,
      "SEQUENCE_NOT_FOUND",
    );
  }

  return {
    formatted: formatSequenceNumber(row, row.value, { date: at, fiscalYearStartMonth: fyStart }),
    value: row.value,
    sequenceId: row.id,
  };
}

/** Non-mutating preview of the number the next `allocateNumber` would return. */
export async function previewNextNumber(
  scope: SequenceScope,
  opts: { at?: Date } = {},
): Promise<AllocateResult> {
  const s = normaliseScope(scope);
  const at = opts.at ?? new Date();
  const row = await findSequence(db, s);
  if (!row) {
    throw new NumberingError(
      `no numbering sequence for ${s.moduleId}/${s.docType}`,
      "SEQUENCE_NOT_FOUND",
    );
  }
  const policy: ResetPolicy = isResetPolicy(row.resetPolicy) ? row.resetPolicy : "NEVER";
  const fyStart = (needsFiscalContext(row)) ? await fiscalStartMonth(s.orgId) : 1;
  const wantedPeriod = periodLabelFor(policy, at, fyStart);
  const value =
    policy !== "NEVER" && row.periodLabel !== wantedPeriod ? row.startValue : row.nextValue;
  return {
    formatted: formatSequenceNumber(row, value, { date: at, fiscalYearStartMonth: fyStart }),
    value,
    sequenceId: row.id,
  };
}
