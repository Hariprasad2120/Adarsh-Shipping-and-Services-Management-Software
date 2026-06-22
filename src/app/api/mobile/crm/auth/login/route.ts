import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import crypto from "crypto";
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";

export async function OPTIONS() {
  return mobileOptions();
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return mobileJson({ error: "Email and password are required" }, 400);
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
      return mobileJson({ error: "Invalid credentials or inactive account" }, 401);
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      return mobileJson({ error: "Invalid credentials" }, 401);
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
