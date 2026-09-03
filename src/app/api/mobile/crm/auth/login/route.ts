import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";
import {
  extractRequestMeta,
  createSession,
  logSecurityEvent,
} from "@/lib/session-service";
import {
  isLoginLocked,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/lib/login-rate-limit";
import { rateLimitShared, sanitizeText } from "@/lib/security";

export async function OPTIONS() {
  return mobileOptions();
}

export async function POST(request: Request) {
  try {
    const meta = extractRequestMeta(request);
    const limited = await rateLimitShared(`mobile-crm-login:${meta.ip ?? "unknown"}`, {
      limit: 30,
      windowMs: 60_000,
    });
    if (!limited.ok) return limited.response;

    const body = await request.json();
    const email = sanitizeText(body.email, 254).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return mobileJson({ error: "Email and password are required" }, 400);
    }

    const lock = await isLoginLocked(email, meta.ip);
    if (lock.locked) {
      const response = mobileJson({ error: "Too many failed login attempts" }, 429);
      response.headers.set("Retry-After", String(Math.ceil((lock.retryAfterMs ?? 0) / 1000)));
      return response;
    }

    const user = await db.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.active) {
      await recordLoginFailure(email, meta.ip);
      return mobileJson({ error: "Invalid credentials or inactive account" }, 401);
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      const locked = await recordLoginFailure(email, meta.ip);
      await logSecurityEvent({
        event: locked ? "LOGIN_LOCKED" : "LOGIN_FAILURE",
        outcome: locked ? "BLOCKED" : "FAILURE",
        userId: user.id,
        email,
        ip: meta.ip,
        userAgent: meta.userAgent,
        reason: "MOBILE_CRM_BAD_PASSWORD",
      });
      return mobileJson({ error: "Invalid credentials" }, 401);
    }

    const token = await createSession({
      userId: user.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      rememberMe: true,
    });
    await recordLoginSuccess(email, meta.ip);
    await logSecurityEvent({
      event: "LOGIN_SUCCESS",
      outcome: "SUCCESS",
      userId: user.id,
      email,
      ip: meta.ip,
      userAgent: meta.userAgent,
      sessionToken: token,
      reason: "MOBILE_CRM",
    });

    return mobileJson({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        orgId: user.orgId,
        roles: user.roles.map((ur) => ur.role.name),
      },
    });
  } catch (error: any) {
    console.error("mobile login API error:", error);
    return mobileJson({ error: error.message ?? "Internal Server Error" }, 500);
  }
}
