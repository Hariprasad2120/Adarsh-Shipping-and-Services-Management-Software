export type PFType = "CAPPED" | "UNCAPPED";
export type City = "CHENNAI" | "MUMBAI" | "DELHI" | "KOLKATA" | "MUNDRA";
export type InsuranceCoverage = "NIL" | "SELF" | "SELF_SPOUSE" | "FAMILY" | "FAMILY_PARENTS";
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
  annualCTC: number;
  monthlyCTC: number;
  basic: number;
  hra: number;
  employerPF: number;
  employeePF: number;
  travelAllowance: number;
  specialAllowance: number;
  gross: number;
  monthlyGross: number;
  annualGross: number;
  esiEmployer: number;
  esi: number;
  professionalTax: number;
  gratuity: number;
  insurancePremium: number;
  tax: number;
  inHand: number;
  finalTakeHome: number;
  annualInHand: number;
  annualFinalTakeHome: number;
};

const CITY_LABELS: Record<City, string> = {
  CHENNAI: "Chennai",
  MUMBAI: "Mumbai",
  DELHI: "Delhi",
  KOLKATA: "Kolkata",
  MUNDRA: "Mundra",
};

function hraRateFor(city: City) {
  return city === "CHENNAI" ? 0.5 : 0.4;
}

function professionalTaxFor(city: City, gross: number) {
  if (city === "CHENNAI") {
    if (gross <= 12000) return 0;
    if (gross <= 21000) return 200;
    return 208;
  }

  if (city === "DELHI" || city === "MUNDRA") return 0;
  return 200;
}

function insurancePremiumFor(annualCTC: number, coverage: InsuranceCoverage, gross: number) {
  if (coverage === "NIL" || gross <= 21000) return 0;

  const base =
    annualCTC < 400000
      ? 1000
      : annualCTC < 800000
        ? 1500
        : 2000;

  const multiplier =
    coverage === "SELF"
      ? 1
      : coverage === "SELF_SPOUSE"
        ? 1.5
        : coverage === "FAMILY"
          ? 2
          : 2.5;

  return Math.round(base * multiplier);
}

function monthlyTaxFor(annualCTC: number, taxRegime: TaxRegime) {
  if (taxRegime === "OLD") {
    return Math.round((annualCTC * 0.1) / 12);
  }

  const taxable = annualCTC - 50000;
  if (taxable > 1500000) {
    return Math.round((60000 + (taxable - 1500000) * 0.3) / 12);
  }
  if (taxable > 1200000) {
    return Math.round(((taxable - 1200000) * 0.2) / 12);
  }
  return 0;
}

export function computeSalary(inputs: SalaryInputs): SalaryBreakup {
  const { annualCTC, pfType, city, monthlyIncentive, insurance, taxRegime } = inputs;

  const monthlyCTC = Math.round(annualCTC / 12);
  const basic = Math.round(monthlyCTC * 0.5);
  const hra = Math.round(basic * hraRateFor(city));
  const employerPF = pfType === "CAPPED" ? Math.min(Math.round(basic * 0.12), 1800) : Math.round(basic * 0.12);
  const employeePF = employerPF;
  const travelAllowance = Math.round(basic * 0.15);
  const specialAllowance = Math.max(0, monthlyCTC - (basic + hra + employerPF + travelAllowance));
  const gross = basic + hra + specialAllowance + travelAllowance;

  const esiEmployer = gross <= 21000 ? Math.round(gross * 0.0325) : 0;
  const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
  const professionalTax = professionalTaxFor(city, gross);
  const insurancePremium = insurancePremiumFor(annualCTC, insurance, gross);
  const gratuity = Math.round(basic * 0.0481);
  const tax = monthlyTaxFor(annualCTC, taxRegime);
  const inHand = Math.max(0, gross - employeePF - esi - professionalTax);
  const finalTakeHome = Math.max(0, inHand - tax + monthlyIncentive);

  return {
    annualCTC,
    monthlyCTC,
    basic,
    hra,
    employerPF,
    employeePF,
    travelAllowance,
    specialAllowance,
    gross,
    monthlyGross: gross,
    annualGross: gross * 12,
    esiEmployer,
    esi,
    professionalTax,
    gratuity,
    insurancePremium,
    tax,
    inHand,
    finalTakeHome,
    annualInHand: inHand * 12,
    annualFinalTakeHome: finalTakeHome * 12,
  };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function cityLabel(city: City) {
  return CITY_LABELS[city];
}
