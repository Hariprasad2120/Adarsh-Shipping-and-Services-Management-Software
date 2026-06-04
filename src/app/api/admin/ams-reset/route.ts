import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { resetAmsData } from "@/modules/ams/service";
import { z } from "zod";

const bodySchema = z.object({ confirm: z.literal(true) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.org.manage");

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Send { confirm: true } to confirm." }, { status: 400 });

  await resetAmsData(session.user.orgId!);
  return NextResponse.json({ ok: true });
}
