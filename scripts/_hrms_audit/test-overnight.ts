/**
 * Cross-midnight punch-out verification. Sets up an overnight shift + an open
 * punch on day D, then calls the real punchOut() with a post-midnight time on
 * D+1 and asserts the D row was closed (not a fresh D+1 row). Cleans up.
 * Run: npx tsx scripts/_hrms_audit/test-overnight.ts
 */
import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { punchOut } from "../../src/modules/attendance/service";
import { resolveCheckOutAttendanceDate } from "../../src/lib/ot";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) } as any);
const USER = "cmtmjfnby000098bw4624ei2q"; // dineshan
const ORG = "cmr4m8jb10000ysbwuoj2bvvx";
const D = new Date(Date.UTC(2099, 5, 10));      // attendance day D (UTC-midnight IST label)
const Dp1 = new Date(Date.UTC(2099, 5, 11));

function expect(l: string, c: boolean) { console.log(`${c ? "PASS" : "FAIL"}  ${l}`); }

async function cleanup(shiftId?: string) {
  await db.attendancePunch.deleteMany({ where: { userId: USER, date: { in: [D, Dp1] } } });
  await db.attendancePunchEvent.deleteMany({ where: { userId: USER, attendanceDate: { in: [D, Dp1] } } });
  await db.otRecord.deleteMany({ where: { userId: USER, date: { in: [D, Dp1] } } });
  if (shiftId) {
    await db.shiftAssignment.deleteMany({ where: { userId: USER, shiftId } });
    await db.shift.deleteMany({ where: { id: shiftId } });
  }
}

async function main() {
  await cleanup();
  const existing = await db.shift.findFirst({ where: { orgId: ORG, name: "AUDIT Night 22-06" } });
  if (existing) await cleanup(existing.id);

  const shift = await db.shift.create({
    data: {
      orgId: ORG, name: "AUDIT Night 22-06", startTime: "22:00", endTime: "06:00",
      expectedWorkingMinutes: 480, graceAfterEndMins: 15, workingDays: "1,2,3,4,5,6,7",
      isActive: true, isDefault: false,
    },
  });
  await db.shiftAssignment.create({ data: { userId: USER, shiftId: shift.id, startDate: D } });

  // open punch on D: checked in 22:00 IST on D  => 16:30 UTC on D
  await db.attendancePunch.create({
    data: { userId: USER, date: D, inAt: new Date(Date.UTC(2099, 5, 10, 16, 30)), source: "web" },
  });

  // punch-out at 06:00 IST on D+1  => 00:30 UTC on D+1
  const punchAt = new Date(Date.UTC(2099, 5, 11, 0, 30));

  const resolved = await resolveCheckOutAttendanceDate(USER, ORG, punchAt);
  expect("resolver picks day D for 06:00 overnight check-out",
    resolved.getTime() === D.getTime());

  // late check-out at 09:00 IST on D+1 => 03:30 UTC — beyond end+grace -> D+1
  const lateResolved = await resolveCheckOutAttendanceDate(USER, ORG, new Date(Date.UTC(2099, 5, 11, 3, 30)));
  expect("resolver picks day D+1 for a 09:00 (stale) check-out",
    lateResolved.getTime() === Dp1.getTime());

  await punchOut(USER, punchAt);
  const dRow = await db.attendancePunch.findUnique({ where: { userId_date: { userId: USER, date: D } } });
  const dp1Row = await db.attendancePunch.findUnique({ where: { userId_date: { userId: USER, date: Dp1 } } });
  expect("day D row now has outAt", !!dRow?.outAt);
  expect("no orphan row created on D+1", !dp1Row);

  await cleanup(shift.id);
  console.log("cleaned up");
  await db.$disconnect();
}
main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
