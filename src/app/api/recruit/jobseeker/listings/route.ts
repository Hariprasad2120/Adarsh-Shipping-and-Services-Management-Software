import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { listJobListings, addManualJobListing, dismissJobListing, saveJob } from "@/modules/recruit/jobseeker-service";

export async function GET(req: NextRequest) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.jobseeker.jobs.search");

  const { searchParams } = new URL(req.url);
  return ok(
    await listJobListings(session!.user.id, {
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 25),
      search: searchParams.get("search") ?? undefined,
      source: searchParams.get("source") ?? undefined,
    })
  );
}

const addSchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  location: z.string().max(200).optional(),
  workplaceType: z.string().max(50).optional(),
  employmentType: z.string().max(50).optional(),
  description: z.string().max(50000).optional(),
  canonicalUrl: z.string().url().max(1000).optional(),
  salaryMin: z.number().min(0).optional(),
  salaryMax: z.number().min(0).optional(),
  postedAt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.jobseeker.jobs.search");

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "dismiss") {
    const { listingId } = await req.json();
    if (!listingId) return err("listingId required");
    await dismissJobListing(session!.user.id, listingId);
    return ok({ ok: true });
  }

  if (action === "save") {
    const { listingId, notes } = await req.json();
    if (!listingId) return err("listingId required");
    await saveJob(session!.user.id, listingId, notes);
    return ok({ ok: true });
  }

  const parsed = addSchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input: " + parsed.error.message);

  const listing = await addManualJobListing(session!.user.id, {
    ...parsed.data,
    postedAt: parsed.data.postedAt ? new Date(parsed.data.postedAt) : undefined,
  });
  return ok(listing, 201);
}
