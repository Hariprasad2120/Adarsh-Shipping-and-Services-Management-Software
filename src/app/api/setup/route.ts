import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { z } from "zod";

export async function GET() {
  const admin = await db.user.findFirst({ where: { isPlatformAdmin: true, active: true } });
  return NextResponse.json({ setupNeeded: !admin });
}

const setupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  orgName: z.string().min(1),
});

export async function POST(req: NextRequest) {
  // Block if admin already exists
  const existing = await db.user.findFirst({ where: { isPlatformAdmin: true } });
  if (existing) {
    return NextResponse.json({ error: "Setup already complete." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password, orgName } = parsed.data;
  const passwordHash = await hash(password, 12);

  const slug = orgName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  // Create org + platform admin in one transaction
  const result = await db.$transaction(async (tx) => {
    const org = await tx.organisation.create({
      data: { name: orgName, slug },
    });

    const user = await tx.user.create({
      data: {
        orgId: org.id,
        email,
        passwordHash,
        name,
        isPlatformAdmin: true,
        active: true,
      },
    });

    // Seed system roles for this org
    const systemRoles = ["Admin", "HR", "Manager", "TL", "Director", "Employee"];
    for (const roleName of systemRoles) {
      await tx.role.create({
        data: { orgId: org.id, name: roleName, isSystem: true },
      });
    }

    // Assign Admin role to platform admin user
    const adminRole = await tx.role.findFirst({ where: { orgId: org.id, name: "Admin" } });
    if (adminRole) {
      await tx.userRole.create({ data: { userId: user.id, roleId: adminRole.id } });
    }

    return { org, user };
  });

  return NextResponse.json({ success: true, orgId: result.org.id, userId: result.user.id });
}
