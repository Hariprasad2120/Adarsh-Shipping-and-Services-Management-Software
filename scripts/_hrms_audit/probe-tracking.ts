import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) } as any);
const orgId = "cmr4m8jb10000ysbwuoj2bvvx";
async function t(name: string, fn: () => Promise<unknown>) {
  try { const r = await fn(); console.log(`OK  ${name}: ${Array.isArray(r) ? r.length + " rows" : String(r)}`); }
  catch (e) { console.log(`ERR ${name}: ${(e as Error).message.split("\n").slice(0, 3).join(" | ")}`); }
}
async function main() {
  await t("attendanceSession", () => db.attendanceSession.findMany({ where: { orgId, status: "ACTIVE" }, include: { user: { select: { id: true, name: true, designation: true } } } }));
  await t("locationTrackingSession", () => db.locationTrackingSession.findMany({ where: { orgId, status: "ACTIVE" }, include: { user: { select: { id: true, name: true } }, locationPoints: { orderBy: { timestamp: "desc" }, take: 1 } } }));
  await t("trackingAlert", () => db.trackingAlert.findMany({ where: { orgId, resolvedAt: null }, include: { user: { select: { id: true, name: true, email: true, designation: true } } }, orderBy: { createdAt: "desc" }, take: 100 }));
  await t("onDutyRequest ACTIVE", () => db.onDutyRequest.findMany({ where: { orgId, status: "ACTIVE" }, include: { user: { select: { id: true, name: true, email: true, designation: true } }, trackingSessions: { where: { status: "ACTIVE" }, include: { locationPoints: { orderBy: { timestamp: "desc" }, take: 1 } } } } }));
  await t("employeeFaceEnrollment", () => db.employeeFaceEnrollment.count({ where: { orgId, isActive: true } }));
  await db.$disconnect();
}
main();
