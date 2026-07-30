import { boundedSafeMessage, redactSensitiveFields } from "./security";

export type MigrationTelemetryEvent = {
  event: string;
  correlationId: string;
  batchIdentifier: string;
  recordKey?: string;
  classification?: string;
  durationMs?: number;
  count?: number;
};

export function migrationTelemetry(
  event: MigrationTelemetryEvent,
): MigrationTelemetryEvent {
  if (!/^[A-Z][A-Z0-9_]{2,63}$/.test(event.event)) {
    throw new Error("TELEMETRY_EVENT_CODE_INVALID");
  }
  const safe = redactSensitiveFields(event) as MigrationTelemetryEvent;
  return {
    ...safe,
    correlationId: boundedSafeMessage(safe.correlationId).slice(0, 128),
    batchIdentifier: boundedSafeMessage(safe.batchIdentifier).slice(0, 128),
    recordKey: safe.recordKey?.slice(0, 64),
    classification: safe.classification?.slice(0, 64),
    durationMs:
      safe.durationMs == null
        ? undefined
        : Math.max(0, Math.min(safe.durationMs, 86_400_000)),
    count:
      safe.count == null ? undefined : Math.max(0, Math.min(safe.count, 1_000_000)),
  };
}
