"use server";

import {
  applyCustomsMasterImport,
  createCustomsMasterRecord,
  deactivateCustomsMasterRecord,
  previewCustomsMasterImport,
  queryCustomsMasterGrid,
  updateCustomsMasterRecord,
} from "./service";
import { type CustomsMasterKey } from "./definitions";
import { requireCustomsMasterPermission } from "./security";
import { type MasterGridQueryInput } from "./schemas";

export async function queryCustomsMasterGridAction(actorId: string, masterType: CustomsMasterKey, query?: MasterGridQueryInput) {
  const orgId = await requireCustomsMasterPermission(actorId, "cha.customs.master.view");
  return queryCustomsMasterGrid({ actorId, orgId, masterType, query });
}

export async function previewCustomsMasterImportAction(actorId: string, options: unknown, bytes: Uint8Array) {
  const orgId = await requireCustomsMasterPermission(actorId, "cha.customs.master.view");
  return previewCustomsMasterImport({ actorId, orgId, options, bytes });
}

export async function applyCustomsMasterImportAction(actorId: string, options: unknown, bytes: Uint8Array) {
  const orgId = await requireCustomsMasterPermission(actorId, "cha.customs.master.bulk_import");
  return applyCustomsMasterImport({ actorId, orgId, options, bytes });
}

export async function createCustomsMasterRecordAction(
  actorId: string,
  masterType: CustomsMasterKey,
  data: Record<string, unknown>,
  reason?: string,
) {
  const orgId = await requireCustomsMasterPermission(actorId, "cha.customs.master.manage");
  return createCustomsMasterRecord({ actorId, orgId, masterType, data, reason });
}

export async function updateCustomsMasterRecordAction(
  actorId: string,
  masterType: CustomsMasterKey,
  id: string,
  data: Record<string, unknown>,
  reason?: string,
) {
  const orgId = await requireCustomsMasterPermission(actorId, "cha.customs.master.manage");
  return updateCustomsMasterRecord({ actorId, orgId, masterType, id, data, reason });
}

export async function deactivateCustomsMasterRecordAction(
  actorId: string,
  masterType: CustomsMasterKey,
  id: string,
  reason: string,
) {
  const orgId = await requireCustomsMasterPermission(actorId, "cha.customs.master.manage");
  return deactivateCustomsMasterRecord({ actorId, orgId, masterType, id, reason });
}
