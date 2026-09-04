/**
 * Maker-checker + IDOR + self-approval verification for REGULARIZATION.
 * Exercises executeApprovalDecision directly. Creates and then deletes its
 * own test rows. Run: npx tsx scripts/_hrms_audit/test-maker-checker.ts
 */
import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { executeApprovalDecision } from "../../src/modules/hrms/service";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) } as any);

const HR = "cmr4m8ui30059ysbwpmv9ov5j";        // hr@adarshshipping.in (checker)
const DINESHAN = "cmtmjfnby000098bw4624ei2q";   // dineshan.accounts@… (maker)
const ORG = "cmr4m8jb10000ysbwuoj2bvvx";

function expect(label: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
}

async function main() {
  // clean any leftover
  const day = new Date(Date.UTC(2099, 0, 15));
  await db.attendanceRegularization.deleteMany({ where: { userId: DINESHAN, date: day } });

  const reg = await db.attendanceRegularization.create({
    data: {
      userId: DINESHAN, date: day,
      requestedIn: new Date(Date.UTC(2099, 0, 15, 3, 30)),
      requestedOut: new Date(Date.UTC(2099, 0, 15, 12, 30)),
      reason: "audit test", status: "PENDING",
    },
  });
  console.log(`created regularization ${reg.id}`);

  // 1. self-approval blocked
  let selfBlocked = false;
  try { await executeApprovalDecision(DINESHAN, ORG, reg.id, "REGULARIZATION", "APPROVED"); }
  catch (e) { selfBlocked = /your own/i.test((e as Error).message); }
  expect("maker cannot approve own regularization", selfBlocked);

  // 2. cross-tenant / bogus id -> not found
  let idorBlocked = false;
  try { await executeApprovalDecision(HR, ORG, "does-not-exist-id", "REGULARIZATION", "APPROVED"); }
  catch (e) { idorBlocked = /not found/i.test((e as Error).message); }
  expect("unknown/cross-org id rejected as not found", idorBlocked);

  // 3. checker approves
  await executeApprovalDecision(HR, ORG, reg.id, "REGULARIZATION", "APPROVED", "looks fine");
  const after = await db.attendanceRegularization.findUnique({ where: { id: reg.id } });
  expect("status -> APPROVED", after?.status === "APPROVED");
  expect("approvedById -> checker", after?.approvedById === HR);
  expect("remarks stored", after?.remarks === "looks fine");

  // 4. audit row written
  const audit = await db.hrmsAuditLog.findFirst({
    where: { orgId: ORG, userId: HR, action: "REGULARIZATION_APPROVED" },
    orderBy: { createdAt: "desc" },
  });
  const d = (audit?.details ?? {}) as Record<string, unknown>;
  expect("audit row written", !!audit && d.requestId === reg.id && d.subjectUserId === DINESHAN);

  // cleanup
  await db.attendanceRegularization.deleteMany({ where: { id: reg.id } });
  if (audit) await db.hrmsAuditLog.deleteMany({ where: { id: audit.id } });
  console.log("cleaned up");
  await db.$disconnect();
}
main();
