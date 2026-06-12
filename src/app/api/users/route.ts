import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { listUsers, createUser } from "@/modules/core/user/service";
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

function compactJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => compactJson(item))
      .filter((item): item is Prisma.InputJsonValue => item !== undefined);
    return items.length > 0 ? items : undefined;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, entryValue]) => [key, compactJson(entryValue)] as const)
      .filter(([, entryValue]) => entryValue !== undefined);

    return entries.length > 0 ? (Object.fromEntries(entries) as Prisma.InputJsonValue) : undefined;
  }

  return value === undefined ? undefined : (value as Prisma.InputJsonValue);
}

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
  return ok(users.map((user) => {
    const { passwordHash, ...safeUser } = user;
    void passwordHash;
    return safeUser;
  }));
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
  payrollMeta: z.object({
    employeeNumber: z.string().optional(),
    personalDetails: z.object({
      personalEmail: z.string().optional(),
      fatherName: z.string().optional(),
      mobileNumber: z.string().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.string().optional(),
      maritalStatus: z.string().optional(),
      panNumber: z.string().optional(),
      aadhaar: z.string().optional(),
    }).optional(),
    personalAddress: z.object({
      addressLine1: z.string().optional(),
      addressLine2: z.string().optional(),
      city: z.string().optional(),
      stateCode: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    }).optional(),
    bankDetails: z.object({
      holderName: z.string().optional(),
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      ifscCode: z.string().optional(),
      accountType: z.string().optional(),
      paymentMode: z.string().optional(),
      stateCode: z.string().optional(),
    }).optional(),
    workLocation: z.object({
      addressLine1: z.string().optional(),
      addressLine2: z.string().optional(),
      city: z.string().optional(),
      stateCode: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    }).optional(),
  }).optional(),
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
    payrollMeta: compactJson(parsed.data.payrollMeta),
  });

  const { passwordHash, ...safe } = user;
  void passwordHash;
  return ok(safe, 201);
}
