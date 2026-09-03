/**
 * Liveness probe. No dependencies, no auth, always cheap — answers "is the
 * process up?". Use /api/ready for dependency checks.
 */

export const dynamic = "force-dynamic";

const STARTED_AT = Date.now();

export async function GET() {
  return Response.json(
    {
      status: "ok",
      uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
      version: process.env.APP_VERSION ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
