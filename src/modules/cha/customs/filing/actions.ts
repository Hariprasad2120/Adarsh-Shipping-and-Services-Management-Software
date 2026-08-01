"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  getChaCustomsFeatureFlags,
  isChaCustomsFeatureEnabled,
} from "@/modules/cha/customs/feature-flags";
import {
  generateImportChecklistSnapshot,
  generateImportFlatFileSnapshot,
  saveImportBeMainDraft,
  saveImportIgmDraft,
  saveImportRemainingDraft,
} from "./import-drafts";
import {
  generateExportChecklistSnapshot,
  generateExportFlatFileSnapshot,
  registerExportFlatFileSignature,
  requestExportFlatFileSigning,
  saveExportRemainingDraft,
  saveExportInvoiceDraft,
  saveExportSbMainDraft,
} from "./export-drafts";
import { submitGeneratedIcegateFile } from "../icegate/service.server";
import { db } from "@/lib/db";

type FilingActionResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

async function requireImportDraftAccess() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Please sign in to continue.");
  }
  const orgId = session.user.orgId;
  if (!orgId) {
    throw new Error("Missing organisation configuration.");
  }
  await requirePermission(session.user.id, "cha.customs.filing.edit_draft");
  const flags = await getChaCustomsFeatureFlags(orgId);
  if (!isChaCustomsFeatureEnabled(flags, "CHA_IMPORT_FILING_WORKSPACE")) {
    throw new Error("Import filing workspace is disabled.");
  }
  return { actorId: session.user.id, orgId };
}

async function requireExportDraftAccess() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Please sign in to continue.");
  }
  const orgId = session.user.orgId;
  if (!orgId) {
    throw new Error("Missing organisation configuration.");
  }
  await requirePermission(session.user.id, "cha.customs.filing.edit_draft");
  const flags = await getChaCustomsFeatureFlags(orgId);
  if (!isChaCustomsFeatureEnabled(flags, "CHA_EXPORT_FILING_WORKSPACE")) {
    throw new Error("Export filing workspace is disabled.");
  }
  return { actorId: session.user.id, orgId };
}

function mapFilingError(error: unknown): { error: string; code?: string } {
  if (error instanceof Error && error.message === "CONCURRENCY_CONFLICT") {
    return {
      error: "Another user updated this filing draft. Reload the latest draft before saving again.",
      code: "CONCURRENCY_CONFLICT",
    };
  }
  if (error instanceof Error) {
    return { error: error.message };
  }
  return { error: "Unable to save customs filing draft." };
}

export async function saveImportBeMainDraftAction(
  jobId: string,
  input: unknown,
): Promise<FilingActionResponse<Awaited<ReturnType<typeof saveImportBeMainDraft>>>> {
  try {
    const { actorId, orgId } = await requireImportDraftAccess();
    const data = await saveImportBeMainDraft({ actorId, orgId, jobId, input });
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...mapFilingError(error) };
  }
}

export async function saveImportIgmDraftAction(
  jobId: string,
  input: unknown,
): Promise<FilingActionResponse<Awaited<ReturnType<typeof saveImportIgmDraft>>>> {
  try {
    const { actorId, orgId } = await requireImportDraftAccess();
    const data = await saveImportIgmDraft({ actorId, orgId, jobId, input });
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...mapFilingError(error) };
  }
}

export async function saveImportRemainingDraftAction(
  jobId: string,
  input: unknown,
): Promise<FilingActionResponse<Awaited<ReturnType<typeof saveImportRemainingDraft>>>> {
  try {
    const { actorId, orgId } = await requireImportDraftAccess();
    const data = await saveImportRemainingDraft({ actorId, orgId, jobId, input });
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...mapFilingError(error) };
  }
}

export async function generateImportChecklistSnapshotAction(
  jobId: string,
  lockVersion: number,
): Promise<FilingActionResponse<Awaited<ReturnType<typeof generateImportChecklistSnapshot>>>> {
  try {
    const { actorId, orgId } = await requireImportDraftAccess();
    await requirePermission(actorId, "cha.customs.filing.generate_artifact");
    const data = await generateImportChecklistSnapshot({ actorId, orgId, jobId, lockVersion });
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...mapFilingError(error) };
  }
}

export async function generateImportFlatFileSnapshotAction(
  jobId: string,
  lockVersion: number,
): Promise<FilingActionResponse<Awaited<ReturnType<typeof generateImportFlatFileSnapshot>>>> {
  try {
    const { actorId, orgId } = await requireImportDraftAccess();
    await requirePermission(actorId, "cha.customs.filing.generate_artifact");
    const data = await generateImportFlatFileSnapshot({ actorId, orgId, jobId, lockVersion });
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...mapFilingError(error) };
  }
}

export async function saveExportSbMainDraftAction(
  jobId: string,
  input: unknown,
): Promise<FilingActionResponse<Awaited<ReturnType<typeof saveExportSbMainDraft>>>> {
  try {
    const { actorId, orgId } = await requireExportDraftAccess();
    const data = await saveExportSbMainDraft({ actorId, orgId, jobId, input });
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...mapFilingError(error) };
  }
}

export async function saveExportInvoiceDraftAction(
  jobId: string,
  input: unknown,
): Promise<FilingActionResponse<Awaited<ReturnType<typeof saveExportInvoiceDraft>>>> {
  try {
    const { actorId, orgId } = await requireExportDraftAccess();
    const data = await saveExportInvoiceDraft({ actorId, orgId, jobId, input });
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...mapFilingError(error) };
  }
}

export async function saveExportRemainingDraftAction(
  jobId: string,
  input: unknown,
): Promise<FilingActionResponse<Awaited<ReturnType<typeof saveExportRemainingDraft>>>> {
  try {
    const { actorId, orgId } = await requireExportDraftAccess();
    const data = await saveExportRemainingDraft({ actorId, orgId, jobId, input });
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...mapFilingError(error) };
  }
}

export async function generateExportChecklistSnapshotAction(
  jobId: string,
  lockVersion: number,
  withDeclaration: boolean,
): Promise<FilingActionResponse<Awaited<ReturnType<typeof generateExportChecklistSnapshot>>>> {
  try {
    const { actorId, orgId } = await requireExportDraftAccess();
    await requirePermission(actorId, "cha.customs.filing.generate_artifact");
    const data = await generateExportChecklistSnapshot({
      actorId,
      orgId,
      jobId,
      lockVersion,
      withDeclaration,
    });
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...mapFilingError(error) };
  }
}

export async function generateExportFlatFileSnapshotAction(
  jobId: string,
  lockVersion: number,
  dummyJob: boolean,
): Promise<FilingActionResponse<Awaited<ReturnType<typeof generateExportFlatFileSnapshot>>>> {
  try {
    const { actorId, orgId } = await requireExportDraftAccess();
    await requirePermission(actorId, "cha.customs.filing.generate_artifact");
    const data = await generateExportFlatFileSnapshot({
      actorId,
      orgId,
      jobId,
      lockVersion,
      dummyJob,
    });
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...mapFilingError(error) };
  }
}

export async function requestExportFlatFileSigningAction(
  jobId: string,
  generationId: string,
): Promise<FilingActionResponse<Awaited<ReturnType<typeof requestExportFlatFileSigning>>>> {
  try {
    const { actorId, orgId } = await requireExportDraftAccess();
    await requirePermission(actorId, "cha.customs.signing.register");
    const data = await requestExportFlatFileSigning({ actorId, orgId, jobId, generationId });
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...mapFilingError(error) };
  }
}

export async function registerExportFlatFileSignatureAction(
  jobId: string,
  generationId: string,
  signatureReference: string,
): Promise<FilingActionResponse<Awaited<ReturnType<typeof registerExportFlatFileSignature>>>> {
  try {
    const { actorId, orgId } = await requireExportDraftAccess();
    await requirePermission(actorId, "cha.customs.signing.register");
    const data = await registerExportFlatFileSignature({
      actorId,
      orgId,
      jobId,
      generationId,
      signatureReference,
    });
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...mapFilingError(error) };
  }
}

export async function submitExportFlatFileAction(
  jobId: string,
  generationId: string,
  confirmed: boolean,
): Promise<FilingActionResponse<Awaited<ReturnType<typeof submitGeneratedIcegateFile>>>> {
  try {
    if (!confirmed) {
      throw new Error("Export submission requires explicit confirmation.");
    }
    const { actorId, orgId } = await requireExportDraftAccess();
    await requirePermission(actorId, "cha.customs.icegate.submit");
    const generation = await db.chaCustomsFlatFileGeneration.findFirst({
      where: {
        id: generationId,
        profile: {
          jobId,
          job: { orgId },
        },
      },
      select: { signedAt: true, signingStatus: true },
    });
    if (!generation) {
      throw new Error("Flat-file generation not found.");
    }
    if (!generation.signedAt && generation.signingStatus !== "SIGNED") {
      throw new Error("A valid signature must be registered before export submission.");
    }
    const data = await submitGeneratedIcegateFile({
      actorId,
      orgId,
      jobId,
      flatFileGenerationId: generationId,
      documentType: "SB",
    });
    revalidatePath(`/cha/jobs/${jobId}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...mapFilingError(error) };
  }
}
