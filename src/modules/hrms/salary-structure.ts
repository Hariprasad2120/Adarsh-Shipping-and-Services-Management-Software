// Salary structure computation — ported from company Apps Script
// All monetary values in INR, monthly unless noted.

export type PFType = "CAPPED" | "UNCAPPED";
export type City = "CHENNAI" | "MUMBAI" | "DELHI" | "KOLKATA" | "MUNDRA";
export type InsuranceCoverage = "SELF" | "SELF_SPOUSE" | "FAMILY" | "FAMILY_PARENTS";
export type TaxRegime = "NEW" | "OLD";

export type SalaryInputs = {
  annualCTC: number;
  pfType: PFType;
  city: City;
  monthlyIncentive: number;
  insurance: InsuranceCoverage;
  taxRegime: TaxRegime;
};

export type SalaryBreakup = {
  // Earnings
  basic: number;
  hra: number;
  specialAllowance: number;
  monthlyIncentive: number;
  // Employer contributions (part of CTC)
  employerPF: number;
  gratuity: number;
  // Gross (CTC / 12)
  monthlyGross: number;
  // Deductions
  employeePF: number;
  esi: number;           // employee share (0 if gross > 21000)
  professionalTax: number;
  insurancePremium: number;
  // Take-home
  inHand: number;
  // Annualised
  annualCTC: number;
  annualGross: number;
  annualInHand: number;
};

// HRA rates by city (% of basic)
const HRA_RATE: Record<City, number> = {
  MUMBAI: 0.50,
  DELHI: 0.50,
  KOLKATA: 0.50,
  CHENNAI: 0.40,
  MUNDRA: 0.40,
};

// Professional Tax monthly (INR) by city
// PT applies if salary > threshold; simplified to standard monthly slab
const PT_MONTHLY: Record<City, number> = {
  CHENNAI: 208,   // ₹2500/yr → ~208/mo
  MUMBAI: 200,
  DELHI: 0,       // Delhi has no PT
  KOLKATA: 200,
  MUNDRA: 0,      // Gujarat PT varies; approximated to 0 for Mundra
};

// Insurance premiums per month (INR) — approximate group policy rates
const INSURANCE_PREMIUM: Record<InsuranceCoverage, number> = {
  SELF: 500,
  SELF_SPOUSE: 900,
  FAMILY: 1300,
  FAMILY_PARENTS: 2000,
};

export function computeSalary(inputs: SalaryInputs): SalaryBreakup {
  const { annualCTC, pfType, city, monthlyIncentive, insurance } = inputs;

  const monthlyGross = Math.round(annualCTC / 12);

  // Basic = 50% of annual CTC / 12
  const basic = Math.round(monthlyGross * 0.50);

  // HRA
  const hra = Math.round(basic * HRA_RATE[city]);

  // PF
  const employeePF = pfType === "CAPPED"
    ? 1800
    : Math.round(basic * 0.12);
  const employerPF = employeePF; // employer matches employee PF

  // Gratuity = 4.81% of basic
  const gratuity = Math.round(basic * 0.0481);

  // Special Allowance = gross - basic - HRA - incentive - employer PF - gratuity
  const specialAllowance = Math.max(
    0,
    monthlyGross - basic - hra - monthlyIncentive - employerPF - gratuity
  );

  // ESI (applicable if gross <= 21000): employee 0.75%, employer 3.25%
  const esiApplicable = monthlyGross <= 21000;
  const esi = esiApplicable ? Math.round(monthlyGross * 0.0075) : 0;

  // PT
  const professionalTax = PT_MONTHLY[city];

  // Insurance
  const insurancePremium = INSURANCE_PREMIUM[insurance];

  // In-Hand
  const inHand = monthlyGross - employeePF - esi - professionalTax - insurancePremium;

  return {
    basic,
    hra,
    specialAllowance,
    monthlyIncentive,
    employerPF,
    gratuity,
    monthlyGross,
    employeePF,
    esi,
    professionalTax,
    insurancePremium,
    inHand: Math.max(0, inHand),
    annualCTC,
    annualGross: monthlyGross * 12,
    annualInHand: Math.max(0, inHand) * 12,
  };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}
