/**
 * Shared Mobile Auth Login
 *
 * Replaces the CRM-only mobile login with a unified endpoint
 * that supports module selection (CRM / HRMS).
 *
 * Backward-compatible: existing CRM app calls without `module`
 * field will default to CRM.
 */
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
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
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";
import { rateLimit, sanitizeText } from "@/lib/security";

export async function OPTIONS() {
  return mobileOptions();
}

export async function POST(request: Request) {
  try {
    const meta = extractRequestMeta(request);
    const limited = rateLimit(`mobile-login:${meta.ip ?? "unknown"}`, {
      limit: 30,
      windowMs: 60_000,
    });
    if (!limited.ok) return limited.response;

    const body = await request.json();
    const email = sanitizeText(body.email, 254).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const requestedModule = sanitizeText(body.module || "crm", 16);

    if (!email || !password) {
      return mobileJson({ error: "Email and password are required" }, 400);
    }

    const lock = isLoginLocked(email, meta.ip);
    if (lock.locked) {
      await logSecurityEvent({
        event: "LOGIN_LOCKED",
        outcome: "BLOCKED",
        email,
        ip: meta.ip,
        userAgent: meta.userAgent,
        reason: "MOBILE_LOGIN_LOCKOUT",
      });
      const response = mobileJson({ error: "Too many failed login attempts" }, 429);
      response.headers.set("Retry-After", String(Math.ceil((lock.retryAfterMs ?? 0) / 1000)));
      return response;
    }

    const user = await db.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
        faceEnrollment: { select: { id: true, isActive: true, enrolledAt: true } },
      },
    });

    if (!user || !user.active) {
      recordLoginFailure(email, meta.ip);
      return mobileJson({ error: "Invalid credentials or inactive account" }, 401);
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      const locked = recordLoginFailure(email, meta.ip);
      await logSecurityEvent({
        event: locked ? "LOGIN_LOCKED" : "LOGIN_FAILURE",
        outcome: locked ? "BLOCKED" : "FAILURE",
        userId: user.id,
        email,
        ip: meta.ip,
        userAgent: meta.userAgent,
        reason: "MOBILE_BAD_PASSWORD",
      });
      return mobileJson({ error: "Invalid credentials" }, 401);
    }

    // Determine available modules based on permissions
    const permissionKeys = user.roles.flatMap((ur) =>
      ur.role.permissions.map((rp) => rp.permission.key)
    );
    const roleNames = user.roles.map((ur) => ur.role.name);

    const availableModules: string[] = [];

    // CRM access check
    const hasCrm = permissionKeys.some((k) => k.startsWith("crm."));
    if (hasCrm) availableModules.push("crm");

    // HRMS access check
    const hasHrms = permissionKeys.some(
      (k) => k.startsWith("hrms.") || k.startsWith("attendance.")
    );
    if (hasHrms) availableModules.push("hrms");

    // Everyone can access HRMS for their own attendance
    if (!availableModules.includes("hrms")) {
      availableModules.push("hrms");
    }

    // Validate requested module (normalize to lowercase — Android sends UPPERCASE)
    const selectedModule = (requestedModule || "crm").toLowerCase();
    if (!availableModules.includes(selectedModule)) {
      return mobileJson({
        error: `You don't have access to the ${selectedModule.toUpperCase()} module`,
        availableModules,
      }, 403);
    }

    const token = await createSession({
      userId: user.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      rememberMe: true,
    });
    recordLoginSuccess(email, meta.ip);

    await logSecurityEvent({
      event: "LOGIN_SUCCESS",
      outcome: "SUCCESS",
      userId: user.id,
      email,
      ip: meta.ip,
      userAgent: meta.userAgent,
      sessionToken: token,
      reason: `MOBILE:${selectedModule}`,
    });

    return mobileJson({
      token,
      module: selectedModule,
      availableModules,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        orgId: user.orgId,
        designation: user.designation,
        employeeNumber: user.employeeNumber,
        roles: roleNames,
        permissions: permissionKeys,
        branch: user.branch,
        department: user.department,
        manager: user.manager ? { id: user.manager.id, name: user.manager.name } : null,
        faceEnrolled: user.faceEnrollment?.isActive ?? false,
      },
    });
  } catch (error: any) {
    console.error("mobile login API error:", error);
    return mobileJson({ error: error.message ?? "Internal Server Error" }, 500);
  }
}
