"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { decideArrear } from "@/modules/ams/service";

type Result = { ok: true } | { ok: false; error: string };

const schema = z.object({
  arrearId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT", "MARK_PAID"]),
  notes: z.string().max(2000).optional(),
});

export async function decideArrearAction(fd: FormData): Promise<Result> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    await requirePermission(session.user.id, "ams.hike.finalise");

    const parsed = schema.safeParse({
      arrearId: fd.get("arrearId"),
      action: fd.get("action"),
      notes: fd.get("notes") ?? undefined,
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

    await decideArrear(parsed.data.arrearId, session.user.id, parsed.data.action, parsed.data.notes);
    revalidatePath("/ams/arrears");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update arrear" };
  }
}
