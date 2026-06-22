import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { listJobSeekerResumes, getJobSeekerResume, getOrCreateJobSeekerProfile } from "@/modules/recruit/jobseeker-service";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.jobseeker.resume.manage");

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const resume = await getJobSeekerResume(session!.user.id, id);
    if (!resume) return err("Not found", 404);
    return ok(resume);
  }
  return ok(await listJobSeekerResumes(session!.user.id));
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  fileKey: z.string().min(1).max(500),
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().min(1),
  isBase: z.boolean().optional().default(false),
  resumeHash: z.string().max(100).optional(),
  masterProfileJson: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.jobseeker.resume.manage");

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input: " + parsed.error.message);

  const ownerId = session!.user.id;
  const profile = await getOrCreateJobSeekerProfile(ownerId);

  const { masterProfileJson, ...rest } = parsed.data;

  const resume = await db.recruitJobSeekerResume.create({
    data: {
      ownerId,
      profileId: profile.id,
      ...rest,
      masterProfileJson: masterProfileJson as import("@/generated/prisma/client").Prisma.InputJsonValue ?? undefined,
    },
  });
  return ok(resume, 201);
}

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  isBase: z.boolean().optional(),
  masterProfileJson: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(req: NextRequest) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.jobseeker.resume.manage");

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input: " + parsed.error.message);

  const ownerId = session!.user.id;
  const { id, masterProfileJson, ...rest } = parsed.data;

  const existing = await db.recruitJobSeekerResume.findFirst({ where: { id, ownerId } });
  if (!existing) return err("Not found", 404);

  const updated = await db.recruitJobSeekerResume.update({
    where: { id },
    data: {
      ...rest,
      masterProfileJson: masterProfileJson as import("@/generated/prisma/client").Prisma.InputJsonValue ?? undefined,
      version: { increment: 1 },
    },
  });
  return ok(updated);
}
