import "server-only";

import { db } from "@/lib/db";
import { logChaAudit } from "@/modules/cha/service";

export type ChaCustomsWorkspaceDirection = "IMPORT" | "EXPORT";

export type ChaCustomsFilingWorkspaceAccess = {
  enabled: boolean;
  canView: boolean;
  canEditDraft: boolean;
  direction: ChaCustomsWorkspaceDirection | null;
  profile: {
    id: string;
    currentDraftVersion: number;
    lockVersion: number;
    status: string;
    isLocked: boolean;
    beMainStatus: string;
    igmStatus: string;
    importInvoiceStatus: string;
    importItemStatus: string;
    importDeclarationStatus: string;
    importDocumentStatus: string;
    sbMainStatus: string;
    exportInvoiceStatus: string;
    exportItemStatus: string;
    exportDocumentStatus: string;
    checklistStatus: string;
    flatFileStatus: string;
  } | null;
};

function normalizeDirection(value: string | null | undefined): ChaCustomsWorkspaceDirection | null {
  if (value === "IMPORT" || value === "EXPORT") return value;
  return null;
}

export async function ensureCustomsFilingProfileForJob(params: {
  actorId: string;
  orgId: string;
  jobId: string;
  direction: ChaCustomsWorkspaceDirection;
}) {
  const job = await db.chaJob.findFirst({
    where: { id: params.jobId, orgId: params.orgId, deletedAt: null },
    select: {
      id: true,
      jobType: { select: { movementDirection: true } },
    },
  });

  if (!job) {
    throw new Error("CHA job not found.");
  }

  const jobDirection = normalizeDirection(job.jobType?.movementDirection);
  if (jobDirection && jobDirection !== params.direction) {
    throw new Error(`Selected job type is ${jobDirection.toLowerCase()}, not ${params.direction.toLowerCase()}.`);
  }

  const existingProfile = await db.chaCustomsFilingProfile.findUnique({
    where: { jobId: params.jobId },
  });
  if (existingProfile) {
    return existingProfile;
  }

  const profile = await db.chaCustomsFilingProfile.create({
    data: {
      jobId: params.jobId,
      movementDirection: params.direction,
      createdById: params.actorId,
      updatedById: params.actorId,
    },
  });

  await logChaAudit({
    orgId: params.orgId,
    jobId: params.jobId,
    entityType: "ChaCustomsFilingProfile",
    entityId: profile.id,
    event: "CUSTOMS_FILING_PROFILE_READY",
    actorId: params.actorId,
    newState: profile.status,
    remarks: `${params.direction} customs filing profile initialized`,
  });

  return profile;
}

export async function getCustomsFilingWorkspaceAccess(params: {
  orgId: string;
  jobId: string;
  movementDirection?: string | null;
  flags: {
    CHA_IMPORT_FILING_WORKSPACE: boolean;
    CHA_EXPORT_FILING_WORKSPACE: boolean;
  };
  canView: boolean;
  canEditDraft: boolean;
}): Promise<ChaCustomsFilingWorkspaceAccess> {
  const direction = normalizeDirection(params.movementDirection);
  const enabled =
    (direction === "IMPORT" && params.flags.CHA_IMPORT_FILING_WORKSPACE) ||
    (direction === "EXPORT" && params.flags.CHA_EXPORT_FILING_WORKSPACE);

  if (!direction || !enabled || !params.canView) {
    return {
      enabled: Boolean(direction && enabled),
      canView: params.canView,
      canEditDraft: params.canEditDraft,
      direction,
      profile: null,
    };
  }

  const profile = await db.chaCustomsFilingProfile.findUnique({
    where: { jobId: params.jobId },
    select: {
      id: true,
      currentDraftVersion: true,
      lockVersion: true,
      status: true,
      isLocked: true,
      beMainStatus: true,
      igmStatus: true,
      importInvoiceStatus: true,
      importItemStatus: true,
      importDeclarationStatus: true,
      importDocumentStatus: true,
      sbMainStatus: true,
      exportInvoiceStatus: true,
      exportItemStatus: true,
      exportDocumentStatus: true,
      checklistStatus: true,
      flatFileStatus: true,
    },
  });

  return {
    enabled,
    canView: params.canView,
    canEditDraft: params.canEditDraft,
    direction,
    profile,
  };
}
