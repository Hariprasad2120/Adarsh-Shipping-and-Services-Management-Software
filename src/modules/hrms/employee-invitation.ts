import { createHash, randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";
import { getNow } from "@/lib/clock";
import { sendEmail } from "@/lib/email";
import { invalidateRbacCache } from "@/lib/rbac";
import { logSecurityEvent } from "@/lib/session-service";
import { syncEmployeeAppraisalSchedule } from "@/modules/ams/service";

const optionalId = z.string().trim().min(1).max(100).optional();
const optionalText = z.string().trim().max(2000).optional();
const optionalShortText = z.string().trim().max(200).optional();
const optionalDate = z.union([z.literal(""), z.iso.date()]).optional();

export const employeeInvitationInputSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100).default(""),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  employeeNumber: z.number().int().positive().nullable().default(null),
  designation: optionalShortText,
  employmentType: optionalShortText,
  branchId: optionalId,
  departmentId: optionalId,
  divisionId: optionalId,
  managerId: optionalId,
  tlId: optionalId,
  roleIds: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  joinDate: z.iso.date(),
  grade: optionalShortText,
  ctc: z.number().min(0).max(1_000_000_000).nullable().default(null),
  priorExperienceYears: z.number().min(0).max(100).default(0),
  fatherName: optionalShortText,
  personalEmail: z.union([z.literal(""), z.email()]).optional(),
  personalPhone: optionalShortText,
  dob: optionalDate,
  gender: optionalShortText,
  maritalStatus: optionalShortText,
  aadhaar: optionalShortText,
  pan: optionalShortText,
  presentAddress: optionalText,
  presentStateCode: optionalShortText,
  permanentAddress: optionalText,
  bankHolderName: optionalShortText,
  bankName: optionalShortText,
  bankAccount: optionalShortText,
  ifsc: optionalShortText,
  accountType: optionalShortText,
  paymentMode: optionalShortText,
});

export const basicEmployeeInvitationInputSchema = z.object({
  employeeNumber: z.number().int().positive(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email()),
});

export const employeeInvitationPasswordSchema = z
  .string()
  .min(12, "Password must contain at least 12 characters")
  .max(128, "Password must contain no more than 128 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

export type EmployeeInvitationInput = z.infer<
  typeof employeeInvitationInputSchema
>;
export type BasicEmployeeInvitationInput = z.infer<
  typeof basicEmployeeInvitationInputSchema
>;

type InternalEmployeeInvitationInput = Omit<
  EmployeeInvitationInput,
  "joinDate"
> & {
  joinDate: string | null;
};

const INVITATION_EXPIRY_HOURS = Math.max(
  1,
  Number(process.env.EMPLOYEE_INVITATION_EXPIRY_HOURS ?? 72),
);

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function newToken() {
  return randomBytes(32).toString("base64url");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function invitationLink(token: string) {
  return `${getAppUrl()}/invite/employee?token=${encodeURIComponent(token)}`;
}

function address(parts: Array<string | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ");
}

async function validateOrganisationReferences(
  orgId: string,
  input: InternalEmployeeInvitationInput,
) {
  const [branch, department, division, manager, teamLead, roles] =
    await Promise.all([
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
            where: { id: input.managerId, orgId, active: true },
            select: { id: true },
          })
        : null,
      input.tlId
        ? db.user.findFirst({
            where: { id: input.tlId, orgId, active: true },
            select: { id: true },
          })
        : null,
      input.roleIds.length > 0
        ? db.role.findMany({
            where: { id: { in: input.roleIds }, orgId },
            select: { id: true },
          })
        : db.role.findMany({
            where: { orgId, name: "Employee" },
            select: { id: true },
            take: 1,
          }),
    ]);

  if (input.branchId && !branch) throw new Error("Invalid branch");
  if (input.departmentId && !department)
    throw new Error("Invalid department");
  if (input.divisionId && !division) throw new Error("Invalid division");
  if (input.managerId && !manager)
    throw new Error("Invalid reporting manager");
  if (input.tlId && !teamLead)
    throw new Error("Invalid secondary reporting manager");
  if (input.roleIds.length > 0 && roles.length !== input.roleIds.length) {
    throw new Error("One or more roles do not belong to this organisation");
  }
  if (roles.length === 0) {
    throw new Error("The organisation must have an Employee role");
  }

  return roles.map((role) => role.id);
}

async function issueInvitation(params: {
  orgId: string;
  userId: string;
  email: string;
  sentById: string;
}) {
  const token = newToken();
  const now = await getNow();
  const expiresAt = new Date(
    now.getTime() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000,
  );

  await db.employeeInvitation.updateMany({
    where: {
      userId: params.userId,
      consumedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: now },
  });
  const invitation = await db.employeeInvitation.create({
    data: {
      orgId: params.orgId,
      userId: params.userId,
      email: params.email,
      tokenHash: hashToken(token),
      expiresAt,
      sentById: params.sentById,
    },
  });

  return { invitation, token };
}

async function deliverInvitation(params: {
  invitationId: string;
  token: string;
  employeeName: string;
  email: string;
  organisationName: string;
}) {
  const link = invitationLink(params.token);
  const safeEmployeeName = escapeHtml(params.employeeName);
  const safeOrganisationName = escapeHtml(params.organisationName);

  try {
    await sendEmail({
      to: params.email,
      subject: `Join ${params.organisationName} on Monolith`,
      html: [
        `<p>Hello ${safeEmployeeName},</p>`,
        `<p>${safeOrganisationName} has invited you to join its Monolith workspace.</p>`,
        `<p><a href="${link}">Accept invitation and create your password</a></p>`,
        `<p>This secure link expires in ${INVITATION_EXPIRY_HOURS} hours and can only be used once.</p>`,
        `<p>If you were not expecting this invitation, you can ignore this email.</p>`,
      ].join(""),
      text: `Hello ${params.employeeName}, ${params.organisationName} has invited you to join its Monolith workspace. Accept the invitation and create your password: ${link}. This link expires in ${INVITATION_EXPIRY_HOURS} hours and can only be used once.`,
      metadata: {
        category: "employee_invitation",
        invitationId: params.invitationId,
      },
      idempotencyKey: `employee-invitation-${params.invitationId}`,
    });
    await db.employeeInvitation.update({
      where: { id: params.invitationId },
      data: {
        deliveryStatus: "SENT",
        deliveryError: null,
        sentAt: await getNow(),
      },
    });
    return "SENT" as const;
  } catch (error) {
    await db.employeeInvitation.update({
      where: { id: params.invitationId },
      data: {
        deliveryStatus: "FAILED",
        deliveryError:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Email delivery failed",
      },
    });
    return "FAILED" as const;
  }
}

async function createEmployeeInvitation(params: {
  orgId: string;
  actorId: string;
  input: InternalEmployeeInvitationInput;
}) {
  const { orgId, actorId, input } = params;
  const [existing, existingEmployeeNumber, organisation, roleIds] =
    await Promise.all([
    db.user.findFirst({
      where: { email: { equals: input.email, mode: "insensitive" } },
      select: { id: true },
    }),
    input.employeeNumber
      ? db.user.findUnique({
          where: { employeeNumber: input.employeeNumber },
          select: { id: true },
        })
      : null,
    db.organisation.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    }),
    validateOrganisationReferences(orgId, input),
    ]);
  if (existing) throw new Error("A user with this email already exists");
  if (existingEmployeeNumber) {
    throw new Error("This employee ID is already in use");
  }
  if (!organisation) throw new Error("Organisation not found");

  const now = await getNow();
  const displayName = [input.firstName, input.lastName]
    .filter(Boolean)
    .join(" ");
  const placeholderPasswordHash = await hash(newToken(), 12);
  const token = newToken();
  const expiresAt = new Date(
    now.getTime() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000,
  );

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        orgId,
        email: input.email,
        passwordHash: placeholderPasswordHash,
        name: displayName,
        firstName: input.firstName,
        lastName: input.lastName || null,
        employeeNumber: input.employeeNumber,
        designation: input.designation || null,
        employmentType: input.employmentType || null,
        branchId: input.branchId || null,
        departmentId: input.departmentId || null,
        divisionId: input.divisionId || null,
        managerId: input.managerId || null,
        tlId: input.tlId || null,
        dob: input.dob ? new Date(input.dob) : null,
        gender: input.gender || null,
        personalPhone: input.personalPhone || null,
        aadhaar: input.aadhaar || null,
        pan: input.pan || null,
        bankName: input.bankName || null,
        bankAccount: input.bankAccount || null,
        ifsc: input.ifsc || null,
        active: false,
      },
    });

    await tx.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId: user.id, roleId })),
    });
    if (input.joinDate) {
      await tx.employmentRecord.create({
        data: {
          userId: user.id,
          joinDate: new Date(input.joinDate),
          grade: input.grade || null,
          ctc: input.ctc,
          priorExperienceYears: input.priorExperienceYears,
        },
      });
    }
    await tx.employeeHrmsProfile.create({
      data: {
        userId: user.id,
        data: {
          nickname: "",
          fatherName: input.fatherName || "",
          businessUnit: "",
          location: "",
          streams: "",
          externalRole: "",
          sourceOfHire: "",
          aboutMe: "",
          bloodGroup: "",
          weddingDay: "",
          maritalStatus: input.maritalStatus || "",
          expertise: "",
          workPhone: "",
          extension: "",
          seatingLocation: "",
          tags: "",
          personalEmail: input.personalEmail || "",
          presentAddress: input.presentAddress || "",
          presentStateCode: input.presentStateCode || "",
          permanentAddress: input.permanentAddress || "",
          bankHolderName: input.bankHolderName || "",
          paymentMode: input.paymentMode || "",
          oldAccountNumber: "",
          accountType: input.accountType || "",
          onboardingStatus: "Not started",
          education: [],
          workExperience: [],
          dependents: [],
        },
        customValues: {},
        createdById: actorId,
        modifiedById: actorId,
      },
    });
    const invitation = await tx.employeeInvitation.create({
      data: {
        orgId,
        userId: user.id,
        email: input.email,
        tokenHash: hashToken(token),
        expiresAt,
        sentById: actorId,
      },
    });

    return { user, invitation };
  });

  invalidateRbacCache();
  const deliveryStatus = await deliverInvitation({
    invitationId: result.invitation.id,
    token,
    employeeName: displayName,
    email: input.email,
    organisationName: organisation.name,
  });

  await logSecurityEvent({
    event: "EMPLOYEE_INVITATION_CREATED",
    outcome: deliveryStatus === "SENT" ? "SUCCESS" : "FAILURE",
    userId: result.user.id,
    email: result.user.email,
    actorUserId: actorId,
    reason: `Invitation ${result.invitation.id}; delivery ${deliveryStatus}`,
  });

  return {
    user: result.user,
    invitation: {
      ...result.invitation,
      deliveryStatus,
    },
  };
}

export async function inviteEmployee(params: {
  orgId: string;
  actorId: string;
  input: EmployeeInvitationInput;
}) {
  return createEmployeeInvitation({
    ...params,
    input: {
      ...params.input,
      joinDate: params.input.joinDate,
    },
  });
}

export async function inviteBasicEmployee(params: {
  orgId: string;
  actorId: string;
  input: BasicEmployeeInvitationInput;
}) {
  return createEmployeeInvitation({
    orgId: params.orgId,
    actorId: params.actorId,
    input: {
      employeeNumber: params.input.employeeNumber,
      firstName: params.input.firstName,
      lastName: params.input.lastName,
      email: params.input.email,
      joinDate: null,
      roleIds: [],
      ctc: null,
      priorExperienceYears: 0,
    },
  });
}

export async function getEmployeeNumberSuggestion(orgId: string) {
  const [organisationMaximum, globalMaximum] = await Promise.all([
    db.user.aggregate({
      where: { orgId },
      _max: { employeeNumber: true },
    }),
    db.user.aggregate({
      _max: { employeeNumber: true },
    }),
  ]);
  const lastEmployeeNumber = organisationMaximum._max.employeeNumber;
  const nextEmployeeNumber =
    Math.max(
      organisationMaximum._max.employeeNumber ?? 0,
      globalMaximum._max.employeeNumber ?? 0,
    ) + 1;

  return {
    lastEmployeeNumber,
    nextEmployeeNumber,
  };
}

export async function resendEmployeeInvitation(params: {
  orgId: string;
  actorId: string;
  userId: string;
}) {
  const user = await db.user.findFirst({
    where: { id: params.userId, orgId: params.orgId },
    include: { org: { select: { name: true } } },
  });
  if (!user) throw new Error("Employee not found");
  if (user.active || user.activatedAt) {
    throw new Error("This employee has already activated their account");
  }
  if (!user.org) throw new Error("Organisation not found");

  const issued = await issueInvitation({
    orgId: params.orgId,
    userId: user.id,
    email: user.email,
    sentById: params.actorId,
  });
  const deliveryStatus = await deliverInvitation({
    invitationId: issued.invitation.id,
    token: issued.token,
    employeeName: user.name,
    email: user.email,
    organisationName: user.org.name,
  });

  await logSecurityEvent({
    event: "EMPLOYEE_INVITATION_RESENT",
    outcome: deliveryStatus === "SENT" ? "SUCCESS" : "FAILURE",
    userId: user.id,
    email: user.email,
    actorUserId: params.actorId,
    reason: `Invitation ${issued.invitation.id}; delivery ${deliveryStatus}`,
  });

  return { invitationId: issued.invitation.id, deliveryStatus };
}

export async function getEmployeeInvitation(token: string) {
  const invitation = await db.employeeInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      org: { select: { name: true } },
      user: { select: { firstName: true, name: true, email: true } },
    },
  });
  const now = await getNow();
  if (
    !invitation ||
    invitation.consumedAt ||
    invitation.revokedAt ||
    invitation.expiresAt <= now
  ) {
    throw new Error("This invitation link is invalid or has expired");
  }

  return {
    employeeName: invitation.user.firstName || invitation.user.name,
    email: invitation.user.email,
    organisationName: invitation.org.name,
    expiresAt: invitation.expiresAt,
  };
}

export async function acceptEmployeeInvitation(params: {
  token: string;
  password: string;
}) {
  const password = employeeInvitationPasswordSchema.parse(params.password);
  const invitation = await db.employeeInvitation.findUnique({
    where: { tokenHash: hashToken(params.token) },
    include: {
      user: {
        include: {
          employmentRecord: true,
        },
      },
      org: { select: { name: true } },
    },
  });
  const now = await getNow();
  if (
    !invitation ||
    invitation.consumedAt ||
    invitation.revokedAt ||
    invitation.expiresAt <= now
  ) {
    throw new Error("This invitation link is invalid or has expired");
  }

  const passwordHash = await hash(password, 12);
  await db.$transaction(async (tx) => {
    const consumed = await tx.employeeInvitation.updateMany({
      where: {
        id: invitation.id,
        consumedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) {
      throw new Error("This invitation link has already been used");
    }

    await tx.user.update({
      where: { id: invitation.userId },
      data: {
        passwordHash,
        active: true,
        emailVerifiedAt: now,
        activatedAt: now,
      },
    });
    await tx.employeeInvitation.updateMany({
      where: {
        userId: invitation.userId,
        id: { not: invitation.id },
        consumedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: now },
    });
  });

  invalidateRbacCache();
  if (invitation.user.employmentRecord) {
    await syncEmployeeAppraisalSchedule({
      orgId: invitation.orgId,
      employeeId: invitation.userId,
      joinDate: invitation.user.employmentRecord.joinDate,
      priorExperienceYears:
        invitation.user.employmentRecord.priorExperienceYears ?? 0,
    }).catch((error) =>
      console.error(
        "[employee-invitation] Appraisal schedule sync failed:",
        error,
      ),
    );
  }
  await logSecurityEvent({
    event: "EMPLOYEE_INVITATION_ACCEPTED",
    outcome: "SUCCESS",
    userId: invitation.userId,
    email: invitation.email,
    reason: `Invitation ${invitation.id} accepted`,
  });

  return {
    organisationName: invitation.org.name,
    userId: invitation.userId,
  };
}

export function buildAddressFromParts(parts: Array<string | undefined>) {
  return address(parts);
}
