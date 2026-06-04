import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { createBranch } from "@/modules/core/organisation/service";
import { z } from "zod";

const schema = z.object({ name: z.string().min(1), code: z.string().min(1) });

export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "hrms.org_structure.manage");

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const branch = await createBranch(session!.user.orgId!, parsed.data.name, parsed.data.code);
  return ok(branch, 201);
}
