import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  deleteBranch,
  updateBranch,
  updateDepartment,
  updateDivision,
  updateRolePermissions,
} from "@/modules/core/organisation/service";
import { resetPassword, updateUserRoles } from "@/modules/core/user/service";
import { assertAppraisalInOrg, activateCycle, closeCycle } from "@/modules/ams/service";
import { publishPolicyVersion } from "@/modules/leave/policy";
import { decideOT } from "@/modules/attendance/service";
import { addCaseComment } from "@/modules/hrms/service";

/**
 * MON-S1 §10 — org-structure / role / user mutations must be tenant-scoped.
 * An admin in org A must not be able to touch org B's branch / department /
 * division / role / user by supplying its id.
 */

const HAS_DB = Boolean(process.env.DATABASE_URL);
const runId = Date.now();

describe.skipIf(!HAS_DB)("cross-tenant org-structure isolation", () => {
  let orgA = "";
  let orgB = "";
  let branchB = "";
  let deptB = "";
  let divB = "";
  let roleB = "";
  let userB = "";

  beforeAll(async () => {
    const [a, b] = await Promise.all([
      db.organisation.create({ data: { name: `OS A ${runId}`, slug: `os-a-${runId}` } }),
      db.organisation.create({ data: { name: `OS B ${runId}`, slug: `os-b-${runId}` } }),
    ]);
    orgA = a.id;
    orgB = b.id;
    const branch = await db.branch.create({ data: { orgId: orgB, name: "B-Branch", code: `BB${runId}` } });
    branchB = branch.id;
    const dept = await db.department.create({ data: { orgId: orgB, name: "B-Dept", code: `BD${runId}` } });
    deptB = dept.id;
    const div = await db.division.create({ data: { orgId: orgB, departmentId: deptB, name: "B-Div" } });
    divB = div.id;
    const role = await db.role.create({ data: { orgId: orgB, name: `B-Role ${runId}`, isSystem: false } });
    roleB = role.id;
    const user = await db.user.create({
      data: { orgId: orgB, email: `os-b-${runId}@t.local`, name: "B", passwordHash: "$2b$10$aaaaaaaaaaaaaaaaaaaaaa", active: true },
    });
    userB = user.id;
  });

  afterAll(async () => {
    await db.userRole.deleteMany({ where: { userId: userB } });
    await db.rolePermission.deleteMany({ where: { roleId: roleB } });
    await db.user.deleteMany({ where: { id: userB } });
    await db.role.deleteMany({ where: { id: roleB } });
    await db.division.deleteMany({ where: { id: divB } });
    await db.department.deleteMany({ where: { id: deptB } });
    await db.branch.deleteMany({ where: { id: branchB } });
    await db.organisation.deleteMany({ where: { id: { in: [orgA, orgB] } } });
  });

  it("updateBranch / deleteBranch reject an org-B id from an org-A caller", async () => {
    await expect(updateBranch(branchB, orgA, "hacked", "HK")).rejects.toThrow(/not found/i);
    await expect(deleteBranch(branchB, orgA)).rejects.toThrow(/not found/i);
    expect((await db.branch.findUnique({ where: { id: branchB } }))?.name).toBe("B-Branch");
  });

  it("updateDepartment / updateDivision reject cross-org ids", async () => {
    await expect(updateDepartment(deptB, orgA, "x", "X")).rejects.toThrow(/not found/i);
    await expect(updateDivision(divB, orgA, "x")).rejects.toThrow(/not found/i);
  });

  it("updateRolePermissions rejects an org-B role for an org-A caller", async () => {
    await expect(updateRolePermissions(roleB, orgA, [])).rejects.toThrow(/not found/i);
    expect(await db.rolePermission.count({ where: { roleId: roleB } })).toBe(0);
  });

  it("resetPassword rejects an org-B user for an org-A caller", async () => {
    const before = (await db.user.findUnique({ where: { id: userB } }))!.passwordHash;
    await expect(resetPassword(userB, orgA, "a-strong-new-password-1")).rejects.toThrow(/not found/i);
    expect((await db.user.findUnique({ where: { id: userB } }))!.passwordHash).toBe(before);
  });

  it("AMS: appraisal-cycle activate/close and appraisal guard reject non-org ids", async () => {
    const cycleB = await db.appraisalCycle.create({
      data: { orgId: orgB, name: `Cyc ${runId}`, year: 2026, status: "DRAFT" },
    });
    try {
      await expect(activateCycle(cycleB.id, orgA)).rejects.toThrow(/not found/i);
      await expect(closeCycle(cycleB.id, orgA)).rejects.toThrow(/not found/i);
      await expect(assertAppraisalInOrg("nope-" + runId, orgA)).rejects.toThrow(/not found/i);
      expect((await db.appraisalCycle.findUnique({ where: { id: cycleB.id } }))?.status).toBe("DRAFT");
      // Same-org call passes the guard.
      await activateCycle(cycleB.id, orgB);
      expect((await db.appraisalCycle.findUnique({ where: { id: cycleB.id } }))?.status).toBe("ACTIVE");
    } finally {
      await db.appraisalCycle.delete({ where: { id: cycleB.id } });
    }
  });

  it("leave: publishPolicyVersion rejects a cross-org version", async () => {
    const lt = await db.leaveType.create({ data: { orgId: orgB, name: `LT ${runId}`, code: `LT${runId}` } });
    const v = await db.leavePolicyVersion.create({
      data: { leaveTypeId: lt.id, version: 1, status: "DRAFT", effectiveFrom: new Date(), configuration: {} },
    });
    try {
      await expect(publishPolicyVersion(v.id, orgA, "actor")).rejects.toThrow(/not found/i);
      expect((await db.leavePolicyVersion.findUnique({ where: { id: v.id } }))?.status).toBe("DRAFT");
    } finally {
      await db.leavePolicyVersion.delete({ where: { id: v.id } });
      await db.leaveType.delete({ where: { id: lt.id } });
    }
  });

  it("attendance: decideOT rejects an OT entry whose employee is in another org", async () => {
    const ot = await db.oTEntry.create({
      data: { userId: userB, date: new Date(), hours: 2, status: "pending" },
    });
    try {
      await expect(decideOT(ot.id, orgA, "approver", "approved")).rejects.toThrow(/not found/i);
      expect((await db.oTEntry.findUnique({ where: { id: ot.id } }))?.status).toBe("pending");
    } finally {
      await db.oTEntry.delete({ where: { id: ot.id } });
    }
  });

  it("hrms: addCaseComment rejects a case not in the caller's org", async () => {
    // The guard is `hRCase.findFirst({ where: { id, orgId } })` -> a case id
    // that does not resolve within the caller's org is rejected.
    await expect(addCaseComment(`no-such-case-${runId}`, orgA, userB, "x")).rejects.toThrow(
      /not found/i,
    );
  });

  it("updateUserRoles rejects a cross-org user and drops foreign role ids", async () => {
    await expect(updateUserRoles(userB, orgA, [roleB])).rejects.toThrow(/not found/i);
    // Same-org call: a role id from another org is silently dropped, not assigned.
    const roleA = await db.role.create({ data: { orgId: orgA, name: `A-Role ${runId}`, isSystem: false } });
    const userA = await db.user.create({
      data: { orgId: orgA, email: `os-a-${runId}@t.local`, name: "A", passwordHash: "$2b$10$aaaaaaaaaaaaaaaaaaaaaa", active: true },
    });
    try {
      await updateUserRoles(userA.id, orgA, [roleB, roleA.id]);
      const assigned = await db.userRole.findMany({ where: { userId: userA.id }, select: { roleId: true } });
      expect(assigned.map((r) => r.roleId)).toEqual([roleA.id]);
    } finally {
      await db.userRole.deleteMany({ where: { userId: userA.id } });
      await db.user.deleteMany({ where: { id: userA.id } });
      await db.role.deleteMany({ where: { id: roleA.id } });
    }
  });
});
