"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import {
  activateCustomsMasterRecord,
  applyCustomsMasterImport,
  createCustomsMasterRecord,
  deactivateCustomsMasterRecord,
  previewCustomsMasterImport,
  updateCustomsMasterRecord,
} from "@/modules/cha/customs/masters/service";
import {
  getCustomsMasterDefinition,
  type CustomsMasterKey,
} from "@/modules/cha/customs/masters/definitions";
import { getChaCustomsFeatureFlags, isChaCustomsFeatureEnabled } from "@/modules/cha/customs/feature-flags";

export type MasterActionResult =
  | { ok: true; message: string; payload?: unknown }
  | { ok: false; message: string; code?: string };

type ActorContext =
  | { ok: true; actorId: string; orgId: string }
  | { ok: false; result: MasterActionResult };

async function getActorContext(permission: string): Promise<ActorContext> {
  const session = await getSession();
  if (!session?.user?.id || !session.user.orgId) redirect("/login");
  const flags = await getChaCustomsFeatureFlags(session.user.orgId);
  if (!isChaCustomsFeatureEnabled(flags, "CHA_CUSTOMS_MASTER_DATA")) {
    return { ok: false, result: { ok: false, code: "FEATURE_DISABLED", message: "Customs master data is disabled." } };
  }
  if (!(await can(session.user.id, permission))) {
    return {
      ok: false,
      result: { ok: false, code: "FORBIDDEN", message: "You do not have permission for this customs master action." },
    };
  }
  return { ok: true, actorId: session.user.id, orgId: session.user.orgId };
}

function errorResult(error: unknown): MasterActionResult {
  return {
    ok: false,
    code: error instanceof Error ? error.name : "ACTION_ERROR",
    message: error instanceof Error ? error.message : "Customs master action failed.",
  };
}

function formDataToRecord(masterType: CustomsMasterKey, formData: FormData) {
  const definition = getCustomsMasterDefinition(masterType);
  const raw = Object.fromEntries(formData.entries());
  return definition.schema.parse(definition.parseRawRow(raw, String(raw.datasetVersion ?? "manual")));
}

export async function saveCustomsMasterRecordAction(
  masterType: CustomsMasterKey,
  id: string | null,
  formData: FormData,
): Promise<MasterActionResult> {
  const context = await getActorContext("cha.customs.master.manage");
  if (!context.ok) return context.result;

  try {
    const reason = String(formData.get("reason") ?? "");
    const data = formDataToRecord(masterType, formData);
    if (id) {
      await updateCustomsMasterRecord({ ...context, masterType, id, data, reason });
    } else {
      await createCustomsMasterRecord({ ...context, masterType, data, reason });
    }
    revalidatePath("/cha/masters");
    return { ok: true, message: id ? "Customs master row updated." : "Customs master row created." };
  } catch (error) {
    return errorResult(error);
  }
}

export async function toggleCustomsMasterRecordAction(
  masterType: CustomsMasterKey,
  id: string,
  nextStatus: "ACTIVE" | "INACTIVE",
  reason: string,
): Promise<MasterActionResult> {
  const context = await getActorContext("cha.customs.master.manage");
  if (!context.ok) return context.result;

  try {
    const payload =
      nextStatus === "ACTIVE"
        ? await activateCustomsMasterRecord({ ...context, masterType, id, reason })
        : await deactivateCustomsMasterRecord({ ...context, masterType, id, reason });
    revalidatePath("/cha/masters");
    return {
      ok: true,
      message: nextStatus === "ACTIVE" ? "Customs master row activated." : "Customs master row deactivated.",
      payload,
    };
  } catch (error) {
    return errorResult(error);
  }
}

export async function previewCustomsMasterImportFromFormAction(
  masterType: CustomsMasterKey,
  formData: FormData,
): Promise<MasterActionResult> {
  const context = await getActorContext("cha.customs.master.view");
  if (!context.ok) return context.result;

  try {
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ok: false, code: "MISSING_FILE", message: "Choose an XLSX or CSV file." };
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const payload = await previewCustomsMasterImport({
      ...context,
      options: importOptionsFromForm(masterType, formData, file),
      bytes,
    });
    return { ok: true, message: "Dry run completed.", payload };
  } catch (error) {
    return errorResult(error);
  }
}

export async function applyCustomsMasterImportFromFormAction(
  masterType: CustomsMasterKey,
  formData: FormData,
): Promise<MasterActionResult> {
  const context = await getActorContext("cha.customs.master.bulk_import");
  if (!context.ok) return context.result;

  try {
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ok: false, code: "MISSING_FILE", message: "Choose an XLSX or CSV file." };
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const payload = await applyCustomsMasterImport({
      ...context,
      options: importOptionsFromForm(masterType, formData, file),
      bytes,
    });
    revalidatePath("/cha/masters");
    return { ok: true, message: "Import applied.", payload };
  } catch (error) {
    return errorResult(error);
  }
}

function importOptionsFromForm(masterType: CustomsMasterKey, formData: FormData, file: File) {
  return {
    masterType,
    fileName: file.name,
    mimeType: file.type,
    datasetVersion: String(formData.get("datasetVersion") ?? ""),
    sourceName: String(formData.get("sourceName") ?? "Controlled upload"),
    sourceReference: String(formData.get("sourceReference") ?? ""),
    sourceType: "XLSX_CSV_UPLOAD",
    sourcePublicationDate: formData.get("sourcePublicationDate") || undefined,
    sourceEffectiveDate: formData.get("sourceEffectiveDate") || undefined,
  };
}
