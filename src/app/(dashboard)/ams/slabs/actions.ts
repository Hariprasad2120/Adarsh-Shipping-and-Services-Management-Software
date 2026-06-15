"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { GRADE_BANDS, HIKE_TABLE } from "@/modules/ams/criteria-config";

const createSchema = z.object({
  label: z.string().min(1, "Label is required"),
  grade: z.string().min(1, "Grade is required"),
  minRating: z.coerce.number().min(0).max(100),
  maxRating: z.coerce.number().min(0).max(100),
  hikePercent: z.coerce.number().min(0).max(100),
});

type Result = { ok: true } | { ok: false; error: string };

async function requireAccess() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  await requirePermission(session.user.id, "ams.cycle.manage");
  return session;
}

export async function createSlabAction(fd: FormData): Promise<Result> {
  try {
    await requireAccess();

    const parsed = createSchema.safeParse({
      label: fd.get("label"),
      grade: fd.get("grade"),
      minRating: fd.get("minRating"),
      maxRating: fd.get("maxRating"),
      hikePercent: fd.get("hikePercent"),
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]!.message };
    }

    await db.incrementSlab.create({ data: parsed.data });

    revalidatePath("/ams/slabs");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create slab" };
  }
}

export async function deleteSlabAction(fd: FormData): Promise<void> {
  try {
    await requireAccess();
    const id = fd.get("id") as string;
    if (!id) return;
    await db.incrementSlab.delete({ where: { id } });
    revalidatePath("/ams/slabs");
  } catch {}
}

export async function buildDefaultIncrementSlabs() {
  const DEFAULT_SLAB_TIERS = [
    { key: "upto15k", label: "Up to INR 15,000/mo" },
    { key: "upto30k", label: "INR 15,001-30,000/mo" },
    { key: "above30k", label: "Above INR 30,000/mo" },
  ] as const;

  return GRADE_BANDS.flatMap((band) =>
    DEFAULT_SLAB_TIERS.map((tier) => ({
      label: `Grade ${band.grade} (${tier.label})`,
      grade: band.grade,
      minRating: band.minNormalized,
      maxRating: band.maxNormalized,
      hikePercent: HIKE_TABLE[band.grade]?.[tier.key] ?? 0,
    })),
  );
}

export async function seedSlabsAction(): Promise<void> {
  try {
    await requireAccess();

    const defaults = await buildDefaultIncrementSlabs();

    await db.$transaction([
      db.incrementSlab.deleteMany(),
      db.incrementSlab.createMany({ data: defaults }),
    ]);

    revalidatePath("/ams/slabs");
  } catch {}
}
