/**
 * Live location SSE stream for the Overview / Live Sales map.
 *
 * Follows the same per-connection polling pattern used by
 * src/app/api/communication/chat/sse/route.ts — this codebase has no shared
 * pub/sub bus, so each SSE route re-polls its own data source on an interval
 * and pushes only when something changed.
 */
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getLatestLocationsForOrg, classifyFreshness } from "@/modules/hrms/location-tracking";

const POLL_INTERVAL_MS = 8000; // matches the "live sales" default capture cadence order of magnitude
const HEARTBEAT_MS = 15000;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const orgId = (session.user as any).orgId;
  if (!orgId) return new Response("No organization", { status: 400 });
  if (!(await can(session.user.id, "hrms.tracking.admin"))) return new Response("Forbidden", { status: 403 });

  let isAborted = false;
  let lastSignature = "";
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        if (isAborted) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          isAborted = true;
        }
      }

      async function pushLocations() {
        if (isAborted) return;
        try {
          const now = new Date();
          const latest = await getLatestLocationsForOrg(orgId);
          const employees = latest.map((loc) => ({ ...loc, freshness: classifyFreshness(loc.latestPoint?.timestamp ?? null, now) }));
          const signature = JSON.stringify(employees.map((e) => [e.userId, e.latestPoint?.id]));
          if (signature !== lastSignature) {
            lastSignature = signature;
            send("locations:update", { employees, serverTime: now.toISOString() });
          }
        } catch (err) {
          send("sync:status", { status: "error", message: err instanceof Error ? err.message : "poll failed" });
        }
      }

      send("sync:status", { status: "connected", timestamp: new Date().toISOString() });
      await pushLocations();

      const pollTimer = setInterval(pushLocations, POLL_INTERVAL_MS);
      const heartbeatTimer = setInterval(() => send("ping", { t: Date.now() }), HEARTBEAT_MS);

      req.signal.addEventListener("abort", () => {
        isAborted = true;
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
