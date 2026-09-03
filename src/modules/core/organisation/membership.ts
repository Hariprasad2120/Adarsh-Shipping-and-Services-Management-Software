/**
 * Stage 2 — enterprise platform: organisation-membership service.
 *
 * Sits alongside the legacy `User.orgId` FK. A user may belong to several
 * organisations; `isPrimary` marks the home org that still mirrors `User.orgId`.
 * RBAC / session are not yet routed through this — see TASK.md Cluster 4.
 */

import { db } from "@/lib/db";
import {
  assertTransition,
  isMembershipStatus,
  type MembershipStatus,
} from "./membership-lifecycle";

export class MembershipError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "DUPLICATE" | "INVALID" = "NOT_FOUND",
  ) {
    super(message);
    this.name = "MembershipError";
  }
}

export async function listMemberships(userId: string) {
  return db.organisationMembership.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    include: { org: { select: { id: true, name: true, slug: true, active: true } } },
  });
}

export async function listOrgMembers(
  orgId: string,
  opts: { status?: MembershipStatus } = {},
) {
  return db.organisationMembership.findMany({
    where: { orgId, ...(opts.status ? { status: opts.status } : {}) },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true, active: true } } },
  });
}

export async function getMembership(userId: string, orgId: string) {
  return db.organisationMembership.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
}

export async function getPrimaryMembership(userId: string) {
  return db.organisationMembership.findFirst({
    where: { userId, isPrimary: true },
    include: { org: { select: { id: true, name: true, slug: true } } },
  });
}

/**
 * Idempotently ensure a user with a legacy `User.orgId` has a membership row and
 * a primary. Safe to call from login / provisioning.
 */
export async function ensurePrimaryMembership(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, orgId: true, active: true, activatedAt: true, createdAt: true },
  });
  if (!user?.orgId) return;

  const existing = await db.organisationMembership.findUnique({
    where: { orgId_userId: { orgId: user.orgId, userId } },
  });
  if (!existing) {
    await db.organisationMembership.create({
      data: {
        orgId: user.orgId,
        userId,
        status: user.active ? "ACTIVE" : "DEACTIVATED",
        isPrimary: true,
        joinedAt: user.activatedAt ?? user.createdAt,
      },
    });
    return;
  }

  const anyPrimary = await db.organisationMembership.findFirst({
    where: { userId, isPrimary: true },
    select: { id: true },
  });
  if (!anyPrimary) {
    await db.organisationMembership.update({
      where: { id: existing.id },
      data: { isPrimary: true },
    });
  }
}

export async function addMembership(input: {
  orgId: string;
  userId: string;
  status?: MembershipStatus;
  isPrimary?: boolean;
  invitedByUserId?: string;
}) {
  const status = input.status ?? "INVITED";
  if (!isMembershipStatus(status)) {
    throw new MembershipError(`invalid status "${status}"`, "INVALID");
  }
  const dup = await db.organisationMembership.findUnique({
    where: { orgId_userId: { orgId: input.orgId, userId: input.userId } },
    select: { id: true },
  });
  if (dup) throw new MembershipError("User is already a member of this organisation.", "DUPLICATE");

  return db.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.organisationMembership.updateMany({
        where: { userId: input.userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    return tx.organisationMembership.create({
      data: {
        orgId: input.orgId,
        userId: input.userId,
        status,
        isPrimary: input.isPrimary ?? false,
        invitedByUserId: input.invitedByUserId ?? null,
        joinedAt: status === "ACTIVE" ? new Date() : null,
      },
    });
  });
}

export async function setMembershipStatus(
  orgId: string,
  userId: string,
  next: MembershipStatus,
) {
  const current = await getMembership(userId, orgId);
  if (!current) throw new MembershipError("Membership not found.");
  assertTransition(current.status, next);

  return db.organisationMembership.update({
    where: { id: current.id },
    data: {
      status: next,
      joinedAt: next === "ACTIVE" && !current.joinedAt ? new Date() : current.joinedAt,
      deactivatedAt:
        next === "DEACTIVATED" || next === "ARCHIVED"
          ? (current.deactivatedAt ?? new Date())
          : next === "ACTIVE"
            ? null
            : current.deactivatedAt,
    },
  });
}

/** Move the user's primary flag to `orgId` (must already be a membership). */
export async function setPrimaryMembership(userId: string, orgId: string) {
  const target = await getMembership(userId, orgId);
  if (!target) throw new MembershipError("Membership not found.");
  await db.$transaction([
    db.organisationMembership.updateMany({
      where: { userId, isPrimary: true, NOT: { id: target.id } },
      data: { isPrimary: false },
    }),
    db.organisationMembership.update({ where: { id: target.id }, data: { isPrimary: true } }),
  ]);
}
