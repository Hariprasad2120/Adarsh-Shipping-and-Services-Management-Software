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
import crypto from "crypto";
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";

export async function OPTIONS() {
  return mobileOptions();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, module } = body;

    if (!email || !password) {
      return mobileJson({ error: "Email and password are required" }, 400);
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
      return mobileJson({ error: "Invalid credentials or inactive account" }, 401);
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
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

    // Validate requested module
    const selectedModule = module || "crm"; // Default to CRM for backward compatibility
    if (!availableModules.includes(selectedModule)) {
      return mobileJson({
        error: `You don't have access to the ${selectedModule.toUpperCase()} module`,
        availableModules,
      }, 403);
    }

    // Generate session token
    const token = crypto.randomBytes(32).toString("hex");

    // Create session in DB
    await db.userSession.create({
      data: {
        userId: user.id,
        token,
        status: "ACTIVE",
        userAgent: request.headers.get("user-agent") ?? undefined,
        ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      },
    });

    // Log security event
    await db.securityEvent.create({
      data: {
        userId: user.id,
        event: "MOBILE_LOGIN",
        outcome: "SUCCESS",
        ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
        details: { module: selectedModule },
      },
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
