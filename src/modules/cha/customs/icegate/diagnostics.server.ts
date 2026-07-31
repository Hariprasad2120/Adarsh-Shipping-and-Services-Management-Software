import "server-only";
import { requirePermission } from "@/lib/rbac";
import { loadIcegateConfig } from "./config.server";
import { MockIcegateClient } from "./mock-client.server";
import { RealIcegateClient } from "./client.server";
import type { IcegateClient } from "./types";

export async function getIcegateDiagnostics(actorId: string, client?: IcegateClient) {
  await requirePermission(actorId, "cha.customs.icegate.configure");
  const config = loadIcegateConfig();
  const resolvedClient = client ?? (config.mockMode ? new MockIcegateClient() : new RealIcegateClient(config));
  const health = await resolvedClient.validateConfiguration();
  return {
    configured: health.configured,
    enabledCapabilities: health.enabledCapabilities,
    environmentName: health.environmentName,
    certificateReadable: health.certificateReadable,
    lastSafeHealthCheckAt: health.lastSafeHealthCheckAt,
    safeErrorCategory: health.safeErrorCategory,
  };
}
