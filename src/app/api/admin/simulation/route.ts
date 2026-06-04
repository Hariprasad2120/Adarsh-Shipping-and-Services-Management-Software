import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { getClockState, setFrozenDate, getNow } from "@/lib/clock";
import { runAppraisalDailyJob } from "@/modules/ams/daily-job";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.org.manage");

  const state = await getClockState();
  return NextResponse.json({ frozenAt: state.frozenAt?.toISOString() ?? null });
}

const patchSchema = z.object({
  frozenAt: z.string().nullable(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.org.manage");

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const date = parsed.data.frozenAt ? new Date(parsed.data.frozenAt) : null;
  await setFrozenDate(date);

  let job = null;
  if (date) {
    job = await runAppraisalDailyJob(await getNow());
  }

  return NextResponse.json({ frozenAt: date?.toISOString() ?? null, job });
}

const postSchema = z.object({
  action: z.literal("run-daily-job"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.org.manage");

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const now = await getNow();
  const result = await runAppraisalDailyJob(now);
  return NextResponse.json(result);
}
