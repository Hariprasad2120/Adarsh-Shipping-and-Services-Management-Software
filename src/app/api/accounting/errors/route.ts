import { getSessionOrUnauth } from "@/lib/api-helpers";

const MAX_REPORT_BYTES = 32 * 1024;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9-]{8,80}$/;

function redactSecrets(value: string) {
  return value
    .replace(
      /postgres(?:ql)?:\/\/[^@\s]+@/gi,
      "postgresql://[credentials-redacted]@",
    )
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

function boundedString(value: unknown, limit: number) {
  if (typeof value !== "string") return undefined;
  return redactSecrets(value).slice(0, limit);
}

export async function POST(request: Request) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_REPORT_BYTES) {
    return new Response(null, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return new Response(null, { status: 400 });
  }

  const correlationId = boundedString(body.correlationId, 80);
  if (!correlationId || !CORRELATION_ID_PATTERN.test(correlationId)) {
    return new Response(null, { status: 400 });
  }

  console.error("[accounting-error-boundary]", {
    correlationId,
    digest: boundedString(body.digest, 160),
    error: {
      message: boundedString(body.message, 8_000),
      name: boundedString(body.name, 200),
      stack: boundedString(body.stack, 20_000),
    },
    orgId: session?.user.orgId ?? null,
    userId: session?.user.id ?? null,
  });

  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
