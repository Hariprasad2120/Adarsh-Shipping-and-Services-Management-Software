import { db } from "@/lib/db";
import {
  buildSalaryRevisionSummary,
  computeSalaryRevisionStats,
  type SalaryRevisionSummary,
} from "./salary-revisions-shared";

export { buildSalaryRevisionSummary, computeSalaryRevisionStats };
export type { SalaryRevisionRecord, SalaryRevisionStats, SalaryRevisionSummary } from "./salary-revisions-shared";

export async function listSalaryRevisionSummaries(orgId: string) {
  const users = await db.user.findMany({
    where: { orgId },
    select: {
      id: true,
      name: true,
      designation: true,
      active: true,
      department: { select: { name: true } },
      employmentRecord: {
        select: {
          joinDate: true,
          ctc: true,
          priorExperienceYears: true,
          payrollMeta: true,
        },
      },
    },
  });

  return users
    .map((user) => buildSalaryRevisionSummary(user))
    .filter((summary): summary is SalaryRevisionSummary => summary !== null)
    .sort((left, right) => (right.latestRevision?.effectiveSort ?? 0) - (left.latestRevision?.effectiveSort ?? 0));
}

export async function getSalaryRevisionSummaryForUser(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      designation: true,
      active: true,
      department: { select: { name: true } },
      employmentRecord: {
        select: {
          joinDate: true,
          ctc: true,
          priorExperienceYears: true,
          payrollMeta: true,
        },
      },
    },
  });

  return user ? buildSalaryRevisionSummary(user) : null;
}
