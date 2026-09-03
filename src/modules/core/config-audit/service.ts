/**
 * Stage 2 — enterprise platform: configuration audit trail.
 *
 * Append-only. `recordConfigChange` is the single write path; there is no update
 * or delete. Sensitive values are redacted before storage. Failures to write an
 * audit row are swallowed (logged to console) so auditing never breaks the
 * business action it is recording — the deployment is expected to monitor for a
 * gap rather than have the app crash.
 */

import { db } from "@/lib/db";
import { extractRequestMeta } from "@/lib/session-service";
import { diffKeys, redact, summarise } from "./redact";

export type ConfigAuditActor =
  | { userId: string; label?: string }
  | { userId?: undefined; label: string };

export type RecordConfigChangeInput = {
  orgId: string;
  actor: ConfigAuditActor;
  action: string;
  targetType: string;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
  /** Extra key names to redact beyond the built-in sensitive-key detector. */
  redactKeys?: string[];
  reason?: string | null;
  source?: "app" | "api" | "provisioning" | "system";
  result?: "SUCCESS" | "FAILURE";
  /** Request to lift ip / user-agent from. */
  request?: Request | null;
  correlationId?: string | null;
  summary?: string;
};

export async function recordConfigChange(input: RecordConfigChangeInput): Promise<void> {
  try {
    const changedKeys =
      input.before !== undefined || input.after !== undefined
        ? diffKeys(input.before, input.after)
        : [];
    const meta = extractRequestMeta(input.request ?? null);

    await db.configAuditEntry.create({
      data: {
        orgId: input.orgId,
        actorUserId: input.actor.userId ?? null,
        actorLabel: input.actor.label ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        summary: input.summary ?? summarise(input.action, changedKeys),
        before:
          input.before === undefined
            ? undefined
            : (redact(input.before, input.redactKeys) as object),
        after:
          input.after === undefined
            ? undefined
            : (redact(input.after, input.redactKeys) as object),
        changedKeys,
        reason: input.reason ?? null,
        source: input.source ?? "app",
        result: input.result ?? "SUCCESS",
        ip: meta.ip,
        userAgent: meta.userAgent,
        correlationId: input.correlationId ?? null,
      },
    });
  } catch (err) {
    console.error("[config-audit] failed to record change", {
      action: input.action,
      targetType: input.targetType,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

export type ConfigAuditQuery = {
  targetType?: string;
  targetId?: string;
  action?: string;
  actorUserId?: string;
  limit?: number;
  /** `createdAt` ISO string of the last row from the previous page. */
  cursor?: string;
};

export async function listConfigAudit(orgId: string, q: ConfigAuditQuery = {}) {
  const limit = Math.min(Math.max(q.limit ?? 50, 1), 200);
  const rows = await db.configAuditEntry.findMany({
    where: {
      orgId,
      ...(q.targetType ? { targetType: q.targetType } : {}),
      ...(q.targetId ? { targetId: q.targetId } : {}),
      ...(q.action ? { action: q.action } : {}),
      ...(q.actorUserId ? { actorUserId: q.actorUserId } : {}),
      ...(q.cursor ? { createdAt: { lt: new Date(q.cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: { actor: { select: { id: true, name: true, email: true } } },
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    entries: page,
    nextCursor: hasMore ? page[page.length - 1].createdAt.toISOString() : null,
  };
}
