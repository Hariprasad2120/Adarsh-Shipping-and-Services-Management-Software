import { NextRequest, NextResponse } from "next/server";
import { forbiddenJson, isDebugRouteEnabled, rateLimit } from "@/lib/security";

const REDACTED_HEADERS = new Set(["authorization", "cookie", "x-goog-channel-token", "x-api-key"]);

export async function POST(req: NextRequest) {
  if (!isDebugRouteEnabled()) {
    return forbiddenJson("Debug route disabled", 404);
  }

  const limited = rateLimit(`google-chat-debug:${req.headers.get("x-forwarded-for") ?? "unknown"}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limited.ok) return limited.response;

  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k] = REDACTED_HEADERS.has(k.toLowerCase()) ? "[redacted]" : v;
  });
  const body = (await req.text()).slice(0, 8_192);
  console.log("[GChat Debug] Headers:", JSON.stringify(headers));
  console.log("[GChat Debug] Body:", body);
  return NextResponse.json({ received: true });
}
