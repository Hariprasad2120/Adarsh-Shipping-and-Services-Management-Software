/**
 * Seeds LeaveComplianceTemplate rows from the researched dataset in
 * docs/leave-management/INDIA_COMPLIANCE_RESEARCH.md. Every row is created
 * at status = "DRAFT" — per spec §27, promotion to VERIFIED/PUBLISHED
 * requires explicit legal counsel sign-off, which this script does not
 * grant. Run manually: npx tsx scripts/seed-leave-compliance-templates.ts
 */
import { db } from "../src/lib/db";

const VERIFIED_DATE = new Date("2026-08-14");
const SOURCE_NOTE =
  "Regulatory template based on the referenced rule set. HR/legal review is recommended before publication.";

const templates = [
  {
    jurisdictionCountry: "India",
    jurisdictionState: null,
    jurisdictionLocality: null,
    establishmentType: null,
    leaveCategory: "MATERNITY",
    statutoryName: "Maternity Benefit Act, 1961 (as amended 2017)",
    effectiveFrom: new Date("1961-12-12"),
    effectiveUntil: null,
    statutoryMinimum: {
      amount: 26,
      unit: "WEEKS",
      note: "26 weeks for fewer than two surviving children, 12 weeks for third+ child, max 8 weeks pre-delivery. 12 weeks for commissioning/adopting mothers (adoption under 3 months).",
    },
    eligibility: { minDaysWorkedInPrecedingYear: 80 },
    legalSource: "Maternity Benefit Act, 1961, Sections 5, 5(2), 8, 11, 11A",
    sourceUrl:
      "https://www.indiacode.nic.in/bitstream/123456789/9324/1/the_maternity_benefit_act_1961.pdf",
    notes: `${SOURCE_NOTE} Duration/eligibility figures solidly corroborated. Medical bonus exact current amount NOT verified — flag for legal review.`,
  },
  {
    jurisdictionCountry: "India",
    jurisdictionState: null,
    jurisdictionLocality: null,
    establishmentType: "PRIVATE_SECTOR",
    leaveCategory: "PATERNITY",
    statutoryName: "No central statutory paternity leave minimum (private sector)",
    effectiveFrom: new Date("1972-01-01"),
    effectiveUntil: null,
    statutoryMinimum: {
      amount: 0,
      unit: "DAYS",
      note: "CCS (Leave) Rules 1972 Rule 551(A) grants 15 days but applies ONLY to Central Government employees, not private sector. No central statutory minimum exists for private-sector paternity leave in India.",
    },
    eligibility: null,
    legalSource: "CCS (Leave) Rules, 1972, Rule 551(A) — central govt only, cited for contrast",
    sourceUrl: "https://www.referencer.in/CS_Regulations/CCS_Leave_Rules_1972/Chapter_05.aspx",
    notes: `${SOURCE_NOTE} This is an explicit "no statutory minimum" marker so the compliance UI doesn't silently omit paternity leave nor invent a number. Any company paternity leave is a discretionary benefit, not a compliance floor.`,
  },
  {
    jurisdictionCountry: "India",
    jurisdictionState: "Tamil Nadu",
    jurisdictionLocality: null,
    establishmentType: "SHOP_OR_COMMERCIAL_ESTABLISHMENT",
    leaveCategory: "EARNED_LEAVE",
    statutoryName: "Tamil Nadu Shops and Establishments Act, 1947",
    effectiveFrom: new Date("1947-01-01"),
    effectiveUntil: null,
    statutoryMinimum: {
      amount: 12,
      unit: "DAYS",
      note: "1 day per 20 days worked after 12 months continuous service (~12 days/year at full attendance); accumulation up to 45 days.",
    },
    eligibility: { minMonthsContinuousService: 12 },
    legalSource: "Tamil Nadu Shops and Establishments Act, 1947, Section 25",
    sourceUrl:
      "https://www.indiacode.nic.in/bitstream/123456789/13171/1/tn-shops-and-establishments-act_1947.pdf",
    notes: `${SOURCE_NOTE} Solidly verified. Also carries statutory casual leave (12 days/year) and sick leave (12 days/year) — modeled as separate template rows if needed; this row covers earned leave.`,
  },
  {
    jurisdictionCountry: "India",
    jurisdictionState: "Maharashtra",
    jurisdictionLocality: null,
    establishmentType: "SHOP_OR_COMMERCIAL_ESTABLISHMENT",
    leaveCategory: "EARNED_LEAVE",
    statutoryName: "Maharashtra Shops and Establishments (Regulation of Employment and Conditions of Service) Act, 2017",
    effectiveFrom: new Date("2017-01-01"),
    effectiveUntil: null,
    statutoryMinimum: {
      amount: null,
      unit: "DAYS",
      note: "Two overlapping formulas found: 1 day per 20 days worked (240+ days/year) OR up to 5 days per 60 days worked (3+ months employed). Precedence unresolved — requires legal review before setting a definitive amount. Accumulation capped at 45 days.",
    },
    eligibility: { minDaysWorkedInYear: 240 },
    legalSource: "Maharashtra Shops and Establishments Act, 2017, Section 18",
    sourceUrl: "https://www.indiacode.nic.in/bitstream/123456789/19710/1/shops_and_establishments.pdf",
    notes: `${SOURCE_NOTE} DUAL FORMULA UNRESOLVED — statutoryMinimum.amount deliberately left null rather than guessing. No distinct statutory sick-leave clause was found either (possible gap or naming difference) — flag for legal review before relying on this template for automated below-minimum warnings.`,
  },
  {
    jurisdictionCountry: "India",
    jurisdictionState: "Gujarat",
    jurisdictionLocality: null,
    establishmentType: "SHOP_OR_COMMERCIAL_ESTABLISHMENT",
    leaveCategory: "EARNED_LEAVE",
    statutoryName: "Gujarat Shops and Establishments (Regulation of Employment and Conditions of Service) Act, 2019",
    effectiveFrom: new Date("2019-01-01"),
    effectiveUntil: null,
    statutoryMinimum: {
      amount: null,
      unit: "DAYS",
      note: "1 day per 20 days worked for workers with 240+ days worked in the calendar year; accumulation up to 63 days. Amount left null (ratio-based, not flat) — pending legal review for exact annualized figure.",
    },
    eligibility: { minDaysWorkedInYear: 240 },
    legalSource: "Gujarat Shops and Establishments Act, 2019, Section 18",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/19334",
    notes: `${SOURCE_NOTE} Solidly verified — consistent across independent sources. Also carries 7 days casual leave/year and 7 days sick leave/year (separate template rows if needed).`,
  },
  {
    jurisdictionCountry: "India",
    jurisdictionState: "Delhi",
    jurisdictionLocality: null,
    establishmentType: "SHOP_OR_COMMERCIAL_ESTABLISHMENT",
    leaveCategory: "EARNED_LEAVE",
    statutoryName: "Delhi Shops and Establishments Act, 1954",
    effectiveFrom: new Date("1954-01-01"),
    effectiveUntil: null,
    statutoryMinimum: {
      amount: 15,
      unit: "DAYS",
      note: "Not less than 15 days privilege leave after every 12 months' continuous employment (pro-rated 5 days per completed 4-month period). Accumulation capped at 3x annual entitlement (up to 45 days). Watchmen/caretakers get minimum 30 days/year.",
    },
    eligibility: { minMonthsContinuousService: 12 },
    legalSource: "Delhi Shops and Establishments Act, 1954, Sections 22 and 23",
    sourceUrl: "https://labour.delhi.gov.in/labour/delhi-shops-act-1954",
    notes: `${SOURCE_NOTE} HIGHEST CONFIDENCE entry — fetched directly from the official labour.delhi.gov.in page. Also carries combined casual/sick leave: not less than 12 days/year (separate template row if needed).`,
  },
  {
    jurisdictionCountry: "India",
    jurisdictionState: "Tamil Nadu",
    jurisdictionLocality: null,
    establishmentType: "INDUSTRIAL_ESTABLISHMENT",
    leaveCategory: "PUBLIC_HOLIDAYS",
    statutoryName: "Tamil Nadu Industrial Establishments (National, Festival and Special Holidays) Act, 1958",
    effectiveFrom: new Date("1958-01-01"),
    effectiveUntil: null,
    statutoryMinimum: {
      amount: 10,
      unit: "DAYS",
      note: "4 fixed national holidays (Republic Day, May Day, Independence Day, Gandhi Jayanti) plus 5 additional festival holidays selected in consultation with employer/employees — approximately 10 total. Exact count NOT independently re-verified against parsed primary text (source PDF could not be machine-parsed).",
    },
    eligibility: null,
    legalSource: "Tamil Nadu Industrial Establishments (National, Festival and Special Holidays) Act, 1958",
    sourceUrl: "https://labour.tn.gov.in/pdf/archives/NATIONAL-FESTIVAL-AND-SPECIAL-HOLIDAYS-ACT-1958.pdf",
    notes: `${SOURCE_NOTE} Day count broadly verified but not confirmed against parsed primary text — flag for legal review. NOT a central law; Maharashtra/Gujarat/Delhi have their own separate holiday legislation, not yet researched.`,
  },
  {
    jurisdictionCountry: "India",
    jurisdictionState: null,
    jurisdictionLocality: null,
    establishmentType: "FACTORY",
    leaveCategory: "EARNED_LEAVE",
    statutoryName: "Factories Act, 1948",
    effectiveFrom: new Date("1948-01-01"),
    effectiveUntil: null,
    statutoryMinimum: {
      amount: null,
      unit: "DAYS",
      note: "Adult workers: 1 day per 20 days worked in preceding calendar year. Child workers (15-18): 1 day per 15 days worked. Eligibility: 240+ days worked in the factory. Encashable on separation.",
    },
    eligibility: { minDaysWorkedInYear: 240, appliesOnlyIfFactoryRegistered: true },
    legalSource: "Factories Act, 1948, Section 79",
    sourceUrl:
      "https://www.indiacode.nic.in/show-data?actid=AC_CEN_6_6_000010_194863_1517807319577&sectionId=9386&sectionno=79&orderno=92",
    notes: `${SOURCE_NOTE} Formula and encashment rule solidly verified. APPLICABILITY IS CONDITIONAL — only relevant if a branch/warehouse is registered as a "factory" under the Act. Confirm this operational fact before activating.`,
  },
];

async function main() {
  let created = 0;
  let skipped = 0;
  for (const t of templates) {
    const existing = await db.leaveComplianceTemplate.findFirst({
      where: {
        jurisdictionCountry: t.jurisdictionCountry,
        jurisdictionState: t.jurisdictionState,
        statutoryName: t.statutoryName,
        leaveCategory: t.leaveCategory,
      },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await db.leaveComplianceTemplate.create({
      data: {
        ...t,
        verifiedDate: VERIFIED_DATE,
        version: 1,
        status: "DRAFT", // never auto-promoted — see file header
      },
    });
    created++;
  }
  console.log(`Seeded ${created} compliance template(s), skipped ${skipped} already-existing.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
