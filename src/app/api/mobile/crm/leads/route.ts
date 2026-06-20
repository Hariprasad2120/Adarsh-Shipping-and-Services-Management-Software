import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(request: Request) {
  try {
    const user = await getMobileUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin / platform admin sees ALL org leads; regular users see only their own
    const isAdmin =
      user.isPlatformAdmin ||
      user.roles?.some((ur: any) => {
        const roleName = (ur.role?.name ?? "").toLowerCase();
        return roleName === "admin" || roleName === "superadmin" || roleName === "manager";
      });

    const where: any = {
      orgId: user.orgId ?? undefined,
      isConverted: false,
    };

    if (!isAdmin) {
      where.ownerId = user.id;
    }

    const leads = await db.crmLead.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ leads });
  } catch (error: any) {
    console.error("mobile leads API error:", error);
    return NextResponse.json({ error: error.message ?? "Internal Server Error" }, { status: 500 });
  }
}
