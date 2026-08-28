import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { computeAppraisalScore } from "@/modules/ams/service";
import { AppraisalLetterDocument, type AppraisalLetterData } from "./appraisal-letter-document";

export async function generateAppraisalLetterBuffer(
  orgId: string,
  appraisalId: string,
  variant: "OUTCOME" | "INCREMENT",
): Promise<{ buffer: Buffer; fileName: string } | null> {
  const appraisal = await db.appraisal.findFirst({
    where: { id: appraisalId, cycle: { orgId } },
    include: {
      cycle: { select: { name: true, year: true } },
      employee: { select: { name: true, employeeNumber: true, designation: true } },
      hikeDecision: { include: { decidedBy: { select: { name: true } } } },
    },
  });
  if (!appraisal || !appraisal.hikeDecision) return null;

  const org = await db.organisation.findUnique({ where: { id: orgId }, select: { name: true } });

  let grade: string | null = null;
  let gradeLabel: string | null = null;
  let finalScore: number | null = null;
  try {
    const score = await computeAppraisalScore(appraisalId);
    grade = score.grade;
    gradeLabel = score.gradeLabel;
    finalScore = score.finalNormalized;
  } catch {
    // score not resolvable — letter still renders with hike figures
  }

  const decision = appraisal.hikeDecision;
  const data: AppraisalLetterData = {
    variant,
    organisationName: org?.name ?? "Organisation",
    employeeName: appraisal.employee.name,
    employeeNumber: appraisal.employee.employeeNumber != null ? String(appraisal.employee.employeeNumber) : null,
    designation: appraisal.employee.designation,
    cycleLabel: `${appraisal.cycle.name} (${appraisal.cycle.year})`,
    issuedOn: (decision.finalisedAt ?? new Date()).toISOString(),
    grade,
    gradeLabel,
    finalScore,
    hikePercent: decision.percent,
    previousSalary: decision.previousSalary ?? null,
    finalSalary: decision.finalSalary ?? null,
    effectiveFrom: decision.effectiveFrom.toISOString(),
    signatoryName: decision.decidedBy?.name ?? "Head of Human Resources",
    acknowledgedOn: appraisal.outcomeAckedAt ? appraisal.outcomeAckedAt.toISOString() : null,
  };

  const buffer = await renderToBuffer(<AppraisalLetterDocument data={data} />);
  const slug = variant === "INCREMENT" ? "Increment" : "Outcome";
  const safeName = appraisal.employee.name.replace(/[^a-z0-9]+/gi, "-");
  return { buffer, fileName: `Appraisal-${slug}-${safeName}-${appraisal.cycle.year}.pdf` };
}
