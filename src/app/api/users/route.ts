import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { listUsers, createUser } from "@/modules/core/user/service";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "hrms.employee.read");

  const { searchParams } = new URL(req.url);
  const users = await listUsers(session!.user.orgId!, {
    branchId: searchParams.get("branchId") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    divisionId: searchParams.get("divisionId") ?? undefined,
    roleId: searchParams.get("roleId") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    active: searchParams.has("active") ? searchParams.get("active") === "true" : undefined,
  });

  // Strip password hashes from response
  return ok(users.map(({ passwordHash: _, ...u }) => u));
}

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  designation: z.string().optional(),
  branchId: z.string().optional(),
  departmentId: z.string().optional(),
  divisionId: z.string().optional(),
  managerId: z.string().optional(),
  tlId: z.string().optional(),
  roleIds: z.array(z.string()),
  joinDate: z.string(),
  grade: z.string().optional(),
  ctc: z.number().optional(),
  priorExperienceYears: z.number().min(0).optional(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "hrms.employee.create");

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return err(JSON.stringify(parsed.error.flatten()), 400);

  const user = await createUser({
    ...parsed.data,
    orgId: session!.user.orgId!,
    joinDate: new Date(parsed.data.joinDate),
  });

  const { passwordHash: _, ...safe } = user;
  return ok(safe, 201);
}
