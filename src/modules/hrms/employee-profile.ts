import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { revokeAllSessionsForUser } from "@/lib/session-service";
import { syncEmployeeAppraisalSchedule } from "@/modules/ams/service";

const optionalText = z.string().trim().max(2000).default("");
const optionalDate = z.union([z.literal(""), z.iso.date()]).default("");

export const employeeProfileFieldTypeSchema = z.enum([
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "DATE",
  "SELECT",
  "BOOLEAN",
]);

export const employeeProfileFieldInputSchema = z.object({
  label: z.string().trim().min(1).max(100),
  type: employeeProfileFieldTypeSchema.default("TEXT"),
  section: z.string().trim().min(1).max(100).default("Custom Details"),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  active: z.boolean().default(true),
  position: z.number().int().min(0).max(10000).default(0),
});

const repeatableRowSchema = z.object({
  id: z.string().trim().min(1).max(100),
});

export const employeeHrmsProfileDataSchema = z.object({
  nickname: optionalText,
  fatherName: optionalText,
  businessUnit: optionalText,
  location: optionalText,
  streams: optionalText,
  externalRole: optionalText,
  sourceOfHire: optionalText,
  aboutMe: optionalText,
  bloodGroup: optionalText,
  weddingDay: optionalDate,
  maritalStatus: optionalText,
  expertise: optionalText,
  workPhone: optionalText,
  extension: optionalText,
  seatingLocation: optionalText,
  tags: optionalText,
  personalEmail: optionalText,
  presentAddress: optionalText,
  presentStateCode: optionalText,
  permanentAddress: optionalText,
  bankHolderName: optionalText,
  paymentMode: optionalText,
  oldAccountNumber: optionalText,
  accountType: optionalText,
  onboardingStatus: optionalText,
  education: z
    .array(
      repeatableRowSchema.extend({
        instituteName: optionalText,
        degree: optionalText,
        specialization: optionalText,
        completionDate: optionalText,
      }),
    )
    .max(50)
    .default([]),
  workExperience: z
    .array(
      repeatableRowSchema.extend({
        companyName: optionalText,
        jobTitle: optionalText,
        fromDate: optionalDate,
        toDate: optionalDate,
        jobDescription: optionalText,
        relevant: z.boolean().default(false),
      }),
    )
    .max(50)
    .default([]),
  dependents: z
    .array(
      repeatableRowSchema.extend({
        name: optionalText,
        relationship: optionalText,
        dateOfBirth: optionalDate,
      }),
    )
    .max(50)
    .default([]),
});

export const employeeProfileUpdateSchema = z.object({
  employeeNumber: z.number().int().positive().nullable(),
  firstName: optionalText,
  lastName: optionalText,
  email: z.email(),
  designation: optionalText,
  branchId: z.string().nullable(),
  departmentId: z.string().nullable(),
  divisionId: z.string().nullable(),
  managerId: z.string().nullable(),
  tlId: z.string().nullable(),
  active: z.boolean(),
  dob: optionalDate,
  gender: optionalText,
  employmentType: optionalText,
  personalPhone: optionalText,
  aadhaar: optionalText,
  pan: optionalText,
  uan: optionalText,
  bankName: optionalText,
  bankAccount: optionalText,
  ifsc: optionalText,
  joinDate: z.iso.date(),
  exitDate: z.union([z.literal(""), z.iso.date()]),
  grade: optionalText,
  ctc: z.number().min(0).nullable(),
  basic: z.number().min(0).nullable(),
  hra: z.number().min(0).nullable(),
  conveyance: z.number().min(0).nullable(),
  transport: z.number().min(0).nullable(),
  travelling: z.number().min(0).nullable(),
  fixedAllowance: z.number().min(0).nullable(),
  stipend: z.number().min(0).nullable(),
  priorExperienceYears: z.number().min(0).max(100).nullable(),
  profile: employeeHrmsProfileDataSchema,
  customValues: z.record(
    z.string(),
    z.union([z.string().max(5000), z.number(), z.boolean(), z.null()]),
  ),
});

export const employeeSelfProfileUpdateSchema = z.object({
  firstName: optionalText,
  lastName: optionalText,
  dob: optionalDate,
  gender: optionalText,
  personalPhone: optionalText,
  aadhaar: optionalText,
  pan: optionalText,
  uan: optionalText,
  profile: z.object({
    nickname: optionalText,
    fatherName: optionalText,
    aboutMe: optionalText,
    bloodGroup: optionalText,
    weddingDay: optionalDate,
    maritalStatus: optionalText,
    expertise: optionalText,
    personalEmail: z
      .union([z.literal(""), z.email()])
      .default(""),
    presentAddress: optionalText,
    presentStateCode: optionalText,
    permanentAddress: optionalText,
    education: employeeHrmsProfileDataSchema.shape.education,
    workExperience: employeeHrmsProfileDataSchema.shape.workExperience,
    dependents: employeeHrmsProfileDataSchema.shape.dependents,
  }),
});

export type EmployeeHrmsProfileData = z.infer<
  typeof employeeHrmsProfileDataSchema
>;
export type EmployeeProfileUpdate = z.infer<typeof employeeProfileUpdateSchema>;
export type EmployeeProfileFieldInput = z.infer<
  typeof employeeProfileFieldInputSchema
>;
export type EmployeeSelfProfileUpdate = z.infer<
  typeof employeeSelfProfileUpdateSchema
>;

function profileFieldKey(label: string) {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
  return base || "field";
}

export async function listEmployeeProfileFields(
  orgId: string,
  includeInactive = false,
) {
  return db.employeeProfileField.findMany({
    where: { orgId, ...(includeInactive ? {} : { active: true }) },
    orderBy: [{ section: "asc" }, { position: "asc" }, { label: "asc" }],
  });
}

export async function createEmployeeProfileField(
  orgId: string,
  input: EmployeeProfileFieldInput,
) {
  const stem = profileFieldKey(input.label);
  const matches = await db.employeeProfileField.findMany({
    where: { orgId, key: { startsWith: stem } },
    select: { key: true },
  });
  const existing = new Set(matches.map((field) => field.key));
  let key = stem;
  let suffix = 2;
  while (existing.has(key)) {
    key = `${stem}_${suffix}`;
    suffix += 1;
  }

  return db.employeeProfileField.create({
    data: {
      orgId,
      key,
      ...input,
      options: input.type === "SELECT" ? input.options : [],
    },
  });
}

export async function updateEmployeeProfileField(
  orgId: string,
  fieldId: string,
  input: EmployeeProfileFieldInput,
) {
  const existing = await db.employeeProfileField.findFirst({
    where: { id: fieldId, orgId },
    select: { id: true },
  });
  if (!existing) throw new Error("Employee profile field not found");

  return db.employeeProfileField.update({
    where: { id: fieldId },
    data: {
      ...input,
      options: input.type === "SELECT" ? input.options : [],
    },
  });
}

export async function deleteEmployeeProfileField(
  orgId: string,
  fieldId: string,
) {
  const result = await db.employeeProfileField.deleteMany({
    where: { id: fieldId, orgId },
  });
  if (result.count === 0) throw new Error("Employee profile field not found");
}

async function validateOrganisationReferences(
  orgId: string,
  input: EmployeeProfileUpdate,
) {
  const [branch, department, division, manager, teamLead] = await Promise.all([
    input.branchId
      ? db.branch.findFirst({
          where: { id: input.branchId, orgId },
          select: { id: true },
        })
      : null,
    input.departmentId
      ? db.department.findFirst({
          where: { id: input.departmentId, orgId },
          select: { id: true },
        })
      : null,
    input.divisionId
      ? db.division.findFirst({
          where: {
            id: input.divisionId,
            orgId,
            ...(input.departmentId
              ? { departmentId: input.departmentId }
              : {}),
          },
          select: { id: true },
        })
      : null,
    input.managerId
      ? db.user.findFirst({
          where: { id: input.managerId, orgId },
          select: { id: true },
        })
      : null,
    input.tlId
      ? db.user.findFirst({
          where: { id: input.tlId, orgId },
          select: { id: true },
        })
      : null,
  ]);

  if (input.branchId && !branch) throw new Error("Invalid branch");
  if (input.departmentId && !department)
    throw new Error("Invalid department");
  if (input.divisionId && !division) throw new Error("Invalid division");
  if (input.managerId && !manager) throw new Error("Invalid reporting manager");
  if (input.tlId && !teamLead)
    throw new Error("Invalid secondary reporting manager");
}

export async function updateEmployeeHrmsProfile(params: {
  orgId: string;
  userId: string;
  actorId: string;
  input: EmployeeProfileUpdate;
}) {
  const { orgId, userId, actorId, input } = params;
  const existingUser = await db.user.findFirst({
    where: { id: userId, orgId },
    select: { id: true, active: true },
  });
  if (!existingUser) throw new Error("Employee not found");
  if (input.managerId === userId || input.tlId === userId) {
    throw new Error("An employee cannot report to themselves");
  }

  await validateOrganisationReferences(orgId, input);

  const customFields = await listEmployeeProfileFields(orgId);
  const allowedCustomKeys = new Set(customFields.map((field) => field.key));
  const customValues = Object.fromEntries(
    Object.entries(input.customValues).filter(([key]) =>
      allowedCustomKeys.has(key),
    ),
  );
  for (const field of customFields) {
    const value = customValues[field.key];
    if (
      field.required &&
      (value === undefined || value === null || value === "")
    ) {
      throw new Error(`${field.label} is required`);
    }
    if (value === undefined || value === null || value === "") continue;
    if (field.type === "NUMBER" && typeof value !== "number") {
      throw new Error(`${field.label} must be a number`);
    }
    if (field.type === "BOOLEAN" && typeof value !== "boolean") {
      throw new Error(`${field.label} must be yes or no`);
    }
    if (field.type === "SELECT") {
      const options = Array.isArray(field.options)
        ? field.options.filter(
            (option): option is string => typeof option === "string",
          )
        : [];
      if (typeof value !== "string" || !options.includes(value)) {
        throw new Error(`${field.label} has an invalid selection`);
      }
    }
  }

  const displayName =
    [input.firstName, input.lastName].filter(Boolean).join(" ").trim() ||
    input.email;

  const updatedProfile = await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        employeeNumber: input.employeeNumber,
        firstName: input.firstName || null,
        lastName: input.lastName || null,
        name: displayName,
        email: input.email,
        designation: input.designation || null,
        branchId: input.branchId,
        departmentId: input.departmentId,
        divisionId: input.divisionId,
        managerId: input.managerId,
        tlId: input.tlId,
        active: input.active,
        dob: input.dob ? new Date(input.dob) : null,
        gender: input.gender || null,
        employmentType: input.employmentType || null,
        personalPhone: input.personalPhone || null,
        aadhaar: input.aadhaar || null,
        pan: input.pan || null,
        uan: input.uan || null,
        bankName: input.bankName || null,
        bankAccount: input.bankAccount || null,
        ifsc: input.ifsc || null,
      },
    });

    await tx.employmentRecord.upsert({
      where: { userId },
      update: {
        joinDate: new Date(input.joinDate),
        exitDate: input.exitDate ? new Date(input.exitDate) : null,
        grade: input.grade || null,
        ctc: input.ctc,
        basic: input.basic,
        hra: input.hra,
        conveyance: input.conveyance,
        transport: input.transport,
        travelling: input.travelling,
        fixedAllowance: input.fixedAllowance,
        stipend: input.stipend,
        priorExperienceYears: input.priorExperienceYears,
      },
      create: {
        userId,
        joinDate: new Date(input.joinDate),
        exitDate: input.exitDate ? new Date(input.exitDate) : null,
        grade: input.grade || null,
        ctc: input.ctc,
        basic: input.basic,
        hra: input.hra,
        conveyance: input.conveyance,
        transport: input.transport,
        travelling: input.travelling,
        fixedAllowance: input.fixedAllowance,
        stipend: input.stipend,
        priorExperienceYears: input.priorExperienceYears,
      },
    });

    return tx.employeeHrmsProfile.upsert({
      where: { userId },
      update: {
        data: input.profile as unknown as Prisma.InputJsonValue,
        customValues: customValues as Prisma.InputJsonValue,
        modifiedById: actorId,
      },
      create: {
        userId,
        data: input.profile as unknown as Prisma.InputJsonValue,
        customValues: customValues as Prisma.InputJsonValue,
        createdById: actorId,
        modifiedById: actorId,
      },
    });
  });

  if (existingUser.active && !input.active) {
    await revokeAllSessionsForUser({
      userId,
      actorUserId: actorId,
      reason: "USER_DISABLED",
    }).catch((error: unknown) =>
      console.error(
        "[employee-profile] Session revocation on disable failed:",
        error,
      ),
    );
  }

  if (!input.exitDate) {
    await syncEmployeeAppraisalSchedule({
      orgId,
      employeeId: userId,
      joinDate: new Date(input.joinDate),
      priorExperienceYears: input.priorExperienceYears ?? 0,
    });
  }

  return updatedProfile;
}

export async function updateEmployeeSelfProfile(params: {
  orgId: string;
  userId: string;
  input: EmployeeSelfProfileUpdate;
}) {
  const { orgId, userId, input } = params;
  const existing = await db.user.findFirst({
    where: { id: userId, orgId, active: true },
    include: { employeeProfile: true },
  });
  if (!existing) throw new Error("Employee not found");

  const existingData = employeeHrmsProfileDataSchema.parse(
    existing.employeeProfile?.data ?? {},
  );
  const mergedData: EmployeeHrmsProfileData = {
    ...existingData,
    ...input.profile,
  };
  const displayName =
    [input.firstName, input.lastName].filter(Boolean).join(" ").trim() ||
    existing.email;

  return db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        firstName: input.firstName || null,
        lastName: input.lastName || null,
        name: displayName,
        dob: input.dob ? new Date(input.dob) : null,
        gender: input.gender || null,
        personalPhone: input.personalPhone || null,
        aadhaar: input.aadhaar || null,
        pan: input.pan || null,
        uan: input.uan || null,
      },
    });

    return tx.employeeHrmsProfile.upsert({
      where: { userId },
      update: {
        data: mergedData as unknown as Prisma.InputJsonValue,
        modifiedById: userId,
      },
      create: {
        userId,
        data: mergedData as unknown as Prisma.InputJsonValue,
        customValues: {},
        createdById: userId,
        modifiedById: userId,
      },
    });
  });
}
