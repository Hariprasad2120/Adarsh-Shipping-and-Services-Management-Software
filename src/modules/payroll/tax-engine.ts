import { db } from "@/lib/db";

// Annual income-tax estimator for Form 16 Part B. Slabs/config are seeded
// per fiscal year (current known law as of 2026-08-25) but stored in the DB
// so a future Budget change is a data edit, not a code change — same
// reasoning as EPF/ESI/Bonus (national law, safe to default with sensible
// numbers, unlike PT/LWF which are state-specific).
//
// This is a REASONABLE-EFFORT estimate for Form 16, not a certified tax
// filing computation: it doesn't model surcharge, marginal relief, HRA
// exemption calculation, or itemized Chapter VI-A deductions (only the
// generic EmployeeInvestmentDeclaration total). Label output as an estimate
// and tell the org to verify before filing.

const SEED_FISCAL_YEAR = "2026-27";

const NEW_REGIME_SLABS = [
  { minIncome: 0, maxIncome: 400000, ratePercent: 0 },
  { minIncome: 400000, maxIncome: 800000, ratePercent: 5 },
  { minIncome: 800000, maxIncome: 1200000, ratePercent: 10 },
  { minIncome: 1200000, maxIncome: 1600000, ratePercent: 15 },
  { minIncome: 1600000, maxIncome: 2000000, ratePercent: 20 },
  { minIncome: 2000000, maxIncome: 2400000, ratePercent: 25 },
  { minIncome: 2400000, maxIncome: null, ratePercent: 30 },
];
const OLD_REGIME_SLABS = [
  { minIncome: 0, maxIncome: 250000, ratePercent: 0 },
  { minIncome: 250000, maxIncome: 500000, ratePercent: 5 },
  { minIncome: 500000, maxIncome: 1000000, ratePercent: 20 },
  { minIncome: 1000000, maxIncome: null, ratePercent: 30 },
];

async function ensureSeeded(orgId: string) {
  const existing = await db.payrollStatutoryTaxRegimeConfig.findFirst({ where: { orgId } });
  if (existing) return;

  await db.$transaction([
    ...NEW_REGIME_SLABS.map((slab) =>
      db.payrollStatutoryTaxSlab.create({
        data: { orgId, fiscalYear: SEED_FISCAL_YEAR, regime: "NEW", ...slab },
      }),
    ),
    ...OLD_REGIME_SLABS.map((slab) =>
      db.payrollStatutoryTaxSlab.create({
        data: { orgId, fiscalYear: SEED_FISCAL_YEAR, regime: "OLD", ...slab },
      }),
    ),
    db.payrollStatutoryTaxRegimeConfig.create({
      data: { orgId, fiscalYear: SEED_FISCAL_YEAR, regime: "NEW", standardDeduction: 75000, rebateThreshold: 1200000, cessPercent: 4 },
    }),
    db.payrollStatutoryTaxRegimeConfig.create({
      data: { orgId, fiscalYear: SEED_FISCAL_YEAR, regime: "OLD", standardDeduction: 50000, rebateThreshold: 500000, cessPercent: 4 },
    }),
  ]);
}

export async function getTaxSlabs(orgId: string, fiscalYear: string, regime: "OLD" | "NEW") {
  await ensureSeeded(orgId);
  return db.payrollStatutoryTaxSlab.findMany({
    where: { orgId, fiscalYear, regime },
    orderBy: { minIncome: "asc" },
  });
}

export async function getTaxRegimeConfig(orgId: string, fiscalYear: string, regime: "OLD" | "NEW") {
  await ensureSeeded(orgId);
  return db.payrollStatutoryTaxRegimeConfig.findUnique({
    where: { orgId_fiscalYear_regime: { orgId, fiscalYear, regime } },
  });
}

function computeSlabTax(taxableIncome: number, slabs: Array<{ minIncome: number; maxIncome: number | null; ratePercent: number }>) {
  let tax = 0;
  for (const slab of slabs) {
    if (taxableIncome <= slab.minIncome) continue;
    const upper = slab.maxIncome == null ? taxableIncome : Math.min(taxableIncome, slab.maxIncome);
    const slice = Math.max(0, upper - slab.minIncome);
    tax += slice * (slab.ratePercent / 100);
  }
  return tax;
}

export type AnnualTaxEstimate = {
  fiscalYear: string;
  regime: "OLD" | "NEW";
  grossAnnualIncome: number;
  standardDeduction: number;
  chapterViaDeductions: number;
  taxableIncome: number;
  taxBeforeCess: number;
  cess: number;
  totalTax: number;
  rebateApplied: boolean;
};

export async function estimateAnnualTax(
  orgId: string,
  fiscalYear: string,
  regime: "OLD" | "NEW",
  grossAnnualIncome: number,
  chapterViaDeductions = 0,
): Promise<AnnualTaxEstimate> {
  const [slabs, config] = await Promise.all([
    getTaxSlabs(orgId, fiscalYear, regime),
    getTaxRegimeConfig(orgId, fiscalYear, regime),
  ]);
  const standardDeduction = config?.standardDeduction ?? (regime === "NEW" ? 75000 : 50000);
  const rebateThreshold = config?.rebateThreshold ?? (regime === "NEW" ? 1200000 : 500000);
  const cessPercent = config?.cessPercent ?? 4;

  const deductions = regime === "NEW" ? standardDeduction : standardDeduction + chapterViaDeductions;
  const taxableIncome = Math.max(0, grossAnnualIncome - deductions);

  let taxBeforeCess = computeSlabTax(taxableIncome, slabs.length > 0 ? slabs : regime === "NEW" ? NEW_REGIME_SLABS : OLD_REGIME_SLABS);
  const rebateApplied = taxableIncome <= rebateThreshold;
  if (rebateApplied) taxBeforeCess = 0;

  const cess = Math.round(taxBeforeCess * (cessPercent / 100) * 100) / 100;
  const totalTax = Math.round((taxBeforeCess + cess) * 100) / 100;

  return {
    fiscalYear,
    regime,
    grossAnnualIncome: Math.round(grossAnnualIncome * 100) / 100,
    standardDeduction,
    chapterViaDeductions: regime === "OLD" ? chapterViaDeductions : 0,
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    taxBeforeCess: Math.round(taxBeforeCess * 100) / 100,
    cess,
    totalTax,
    rebateApplied,
  };
}
