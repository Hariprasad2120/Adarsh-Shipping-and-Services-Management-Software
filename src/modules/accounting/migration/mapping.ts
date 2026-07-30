import { createHash } from "node:crypto";

import { canonicalPayload } from "../request-integrity";
import type {
  AccountingImportRecord,
  AccountingMapping,
  AccountingMappingType,
} from "./types";

export type MappingRequest = {
  type: AccountingMappingType;
  sourceValue: string;
};

function mappingRequests(record: AccountingImportRecord): MappingRequest[] {
  const payloadRequests = Array.isArray(record.payload.mappingRefs)
    ? record.payload.mappingRefs
    : [];
  const requests: MappingRequest[] = [
    { type: "ORGANIZATION", sourceValue: record.targetOrganizationRef },
    { type: "LEGAL_ENTITY", sourceValue: record.targetLegalEntityRef },
  ];
  for (const candidate of payloadRequests) {
    if (
      candidate &&
      typeof candidate === "object" &&
      typeof (candidate as { type?: unknown }).type === "string" &&
      typeof (candidate as { sourceValue?: unknown }).sourceValue === "string"
    ) {
      requests.push(candidate as MappingRequest);
    }
  }
  return requests;
}
export function mappingConfigurationHash(mapping: AccountingMapping) {
  return createHash("sha256")
    .update(
      canonicalPayload({
        sourceSystem: mapping.sourceSystem,
        targetOrganizationId: mapping.targetOrganizationId,
        targetLegalEntityId: mapping.targetLegalEntityId ?? null,
        mappingType: mapping.mappingType,
        sourceValue: mapping.sourceValue,
        targetType: mapping.targetType,
        targetId: mapping.targetId,
        version: mapping.version,
        status: mapping.status,
        decisionReference: mapping.decisionReference,
      }),
    )
    .digest("hex");
}

export function validateMappings(mappings: readonly AccountingMapping[]) {
  const seen = new Map<string, AccountingMapping[]>();
  for (const mapping of mappings) {
    if (!Number.isSafeInteger(mapping.version) || mapping.version < 1) {
      throw new Error("MAPPING_VERSION_INVALID");
    }
    if (!mapping.decisionReference.trim()) {
      throw new Error("MAPPING_DECISION_REFERENCE_REQUIRED");
    }
    const scope = [
      mapping.sourceSystem,
      mapping.targetOrganizationId,
      mapping.targetLegalEntityId ?? "*",
      mapping.mappingType,
      mapping.sourceValue,
    ].join("\u001f");
    const entries = seen.get(scope) ?? [];
    entries.push(mapping);
    seen.set(scope, entries);
  }
  for (const entries of seen.values()) {
    if (entries.filter((entry) => entry.status === "APPROVED").length > 1) {
      throw new Error("AMBIGUOUS_APPROVED_MAPPING");
    }
  }
}

export function resolveRecordMappings(input: {
  record: AccountingImportRecord;
  mappings: readonly AccountingMapping[];
}) {
  const resolved: Partial<Record<AccountingMappingType, string>> = {};
  let organizationId = "";
  let legalEntityId = "";
  for (const request of mappingRequests(input.record)) {
    const candidates = input.mappings.filter(
      (mapping) =>
        mapping.status === "APPROVED" &&
        mapping.sourceSystem === input.record.sourceSystem &&
        mapping.mappingType === request.type &&
        mapping.sourceValue === request.sourceValue &&
        (request.type !== "LEGAL_ENTITY" ||
          mapping.targetLegalEntityId == null ||
          mapping.targetLegalEntityId === mapping.targetId),
    );
    if (candidates.length === 0) {
      throw new Error(`MISSING_MAPPING:${request.type}`);
    }
    if (candidates.length > 1) {
      throw new Error(`AMBIGUOUS_MAPPING:${request.type}`);
    }
    const match = candidates[0];
    if (
      organizationId &&
      match.targetOrganizationId !== organizationId
    ) {
      throw new Error("MAPPING_ORGANIZATION_SCOPE_VIOLATION");
    }
    organizationId = match.targetOrganizationId;
    if (request.type === "LEGAL_ENTITY") {
      legalEntityId = match.targetId;
    } else if (
      match.targetLegalEntityId &&
      legalEntityId &&
      match.targetLegalEntityId !== legalEntityId
    ) {
      throw new Error("MAPPING_LEGAL_ENTITY_SCOPE_VIOLATION");
    }
    resolved[request.type] = match.targetId;
  }
  if (!organizationId || !legalEntityId) {
    throw new Error("MAPPING_SCOPE_INCOMPLETE");
  }
  return { organizationId, legalEntityId, resolved };
}
