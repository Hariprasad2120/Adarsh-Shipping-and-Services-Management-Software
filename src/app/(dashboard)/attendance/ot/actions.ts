"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { createOTEntry, decideOT } from "@/modules/attendance/service";

type Result = { ok: true } | { ok: false; error: string };

export async function requestOtAction(formData: FormData): Promise<Result> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    await requirePermission(session.user.id, "attendance.ot.request");

    const dateStr = formData.get("date") as string;
    const hoursStr = formData.get("hours") as string;
    const notes = formData.get("notes") as string;

    if (!dateStr || !hoursStr) {
      return { ok: false, error: "Missing required fields" };
    }

    const date = new Date(dateStr);
    const hours = parseFloat(hoursStr);

    if (isNaN(hours) || hours <= 0 || hours > 16) {
      return { ok: false, error: "Hours must be between 0.5 and 16" };
    }

    await createOTEntry(session.user.id, {
      date,
      hours,
      notes: notes || undefined,
    });

    revalidatePath("/attendance/ot");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to submit OT request" };
  }
}

export async function decideOtAction(formData: FormData): Promise<Result> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    await requirePermission(session.user.id, "attendance.ot.approve");

    const entryId = formData.get("entryId") as string;
    const decision = formData.get("decision") as "approved" | "rejected";

    if (!entryId || !decision) {
      return { ok: false, error: "Missing parameters" };
    }

    await decideOT(entryId, session.user.id, decision);

    revalidatePath("/attendance/ot");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to process OT decision" };
  }
}
