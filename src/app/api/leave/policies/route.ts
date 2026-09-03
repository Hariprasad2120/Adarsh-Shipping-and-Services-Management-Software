import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission, apiError } from "@/lib/rbac";
import { db } from "@/lib/db";
import { createLeaveType, createPolicyVersion, publishPolicyVersion } from "@/modules/leave/policy";
import { LeavePolicyConfigSchema } from "@/modules/leave/policy-config.schema";

const ApplicabilityRuleSchema = z.object({
  mode: z.enum(["INCLUDE", "EXCLUDE"]),
  dimension: z.enum(["BRANCH", "DEPARTMENT", "DIVISION", "DESIGNATION", "EMPLOYMENT_TYPE", "EMPLOYEE"]),
  value: z.string().min(1),
});

const BodySchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  classification: z.enum(["PAID", "UNPAID", "ON_DUTY", "RESTRICTED_HOLIDAY", "PARTIALLY_PAID"]),
  unit: z.enum(["DAY", "HOUR"]).default("DAY"),
  effectiveFrom: z.string().transform((s) => new Date(s)),
  configuration: LeavePolicyConfigSchema,
  applicabilityRules: z.array(ApplicabilityRuleSchema).optional().default([]),
  publishImmediately: z.boolean().optional().default(false),
});

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  if (!session!.user.orgId) return err("User has no organisation", 400);

  const leaveTypes = await db.leaveType.findMany({
    where: { orgId: session!.user.orgId },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  return ok(leaveTypes);
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;
    if (!session!.user.orgId) return err("User has no organisation", 400);
    await requirePermission(session!.user.id, "attendance.leave.manage");

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return err("Invalid input");

    const leaveType = await createLeaveType(
      { orgId: session!.user.orgId, name: parsed.data.name, code: parsed.data.code },
      session!.user.id,
    );

    const version = await createPolicyVersion(
      {
        leaveTypeId: leaveType.id,
        classification: parsed.data.classification,
        unit: parsed.data.unit,
        effectiveFrom: parsed.data.effectiveFrom,
        configuration: parsed.data.configuration,
        applicabilityRules: parsed.data.applicabilityRules,
      },
      session!.user.id,
    );

    const published = parsed.data.publishImmediately
      ? await publishPolicyVersion(version.id, session!.user.orgId!, session!.user.id)
      : version;

    return ok({ leaveType, version: published }, 201);
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") return apiError(error);
    const message = error instanceof Error ? error.message : "Bad request";
    return err(message);
  }
}
