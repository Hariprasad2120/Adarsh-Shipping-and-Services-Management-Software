import { db } from "@/lib/db";

export type AppraisalAuditLogCompatData = {
  appraisalId: string;
  actorId?: string;
  actorRole?: string;
  action?: string;
  fromStage?: string | null;
  toStage: string;
  note?: string;
  oldValue?: unknown;
  newValue?: unknown;
};

type AuditLogClient = Pick<typeof db, "appraisalAuditLog">;

function getMissingAuditColumn(error: unknown): string | null {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
        ? error.message
        : "";

  if (!message) return null;

  const relationMatch = message.match(/The column `([^`]+) of relation AppraisalAuditLog` does not exist/i);
  if (relationMatch?.[1]) return relationMatch[1];

  const qualifiedMatch = message.match(/The column `AppraisalAuditLog\.([^`]+)` does not exist/i);
  if (qualifiedMatch?.[1]) return qualifiedMatch[1];

  const genericMatch = message.match(/The column `([^`]+)` does not exist/i);
  if (!genericMatch?.[1]) return null;

  const [, rawColumn] = genericMatch;
  return rawColumn.startsWith("AppraisalAuditLog.") ? rawColumn.slice("AppraisalAuditLog.".length) : rawColumn;
}

export async function createAppraisalAuditLogCompat(
  data: AppraisalAuditLogCompatData,
  client: AuditLogClient = db,
) {
  const nextData: Record<string, unknown> = { ...data };

  while (true) {
    try {
      await client.appraisalAuditLog.create({ data: nextData as never });
      return;
    } catch (error) {
      const missingColumn = getMissingAuditColumn(error);
      if (!missingColumn || !(missingColumn in nextData)) {
        throw error;
      }
      delete nextData[missingColumn];
    }
  }
}
