import type { CriterionPoint } from "@/components/ams/criteria-points-form";
import type { ReviewerRatingAnswers, SelfAssessmentAnswers } from "@/modules/ams/criteria-config";
import {
  buildQuestionKey,
  CAREER_GROWTH_SECTION,
  COMPENSATION_SECTION,
  DECISION_MAKING_SECTION,
  EMPLOYEE_INFO_FIELDS,
  RETENTION_SECTION,
  SELF_ASSESSMENT_PART_A_SECTIONS,
} from "@/modules/ams/criteria-config";
import type { SalaryInputs } from "@/modules/hrms/salary-structure";

export const demoFillEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_FILL === "true";

type DemoFieldValue = string | number | boolean;

export function formatDateForInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function applyDemoFieldValues(
  form: HTMLFormElement,
  values: Record<string, DemoFieldValue>,
) {
  for (const [name, rawValue] of Object.entries(values)) {
    const elements = form.elements.namedItem(name);
    if (!elements) continue;

    const nodes = elements instanceof RadioNodeList ? Array.from(elements) : [elements];
    for (const node of nodes) {
      if (!(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement)) {
        continue;
      }

      if (node instanceof HTMLInputElement && node.type === "checkbox") {
        node.checked = Boolean(rawValue);
      } else {
        node.value = String(rawValue);
      }

      node.dispatchEvent(new Event("input", { bubbles: true }));
      node.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}

export function getLoginDemoValues() {
  return {
    email: "demo.operations@adarshshipping.com",
    password: "Demo@12345",
  };
}

export function getSetupDemoValues() {
  return {
    orgName: "Adarsh Shipping Demo",
    name: "Demo Administrator",
    email: "admin.demo@adarshshipping.com",
    password: "Demo@12345",
  };
}

type OnboardingOrg = {
  branches: { id: string }[];
  departments: { id: string; divisions: { id: string }[] }[];
} | null;

type OnboardingRole = { id: string; name: string };
type OnboardingManager = { id: string };

export function getOnboardingDemoValues({
  org,
  roles,
  managers,
}: {
  org: OnboardingOrg;
  roles: OnboardingRole[];
  managers: OnboardingManager[];
}) {
  const department = org?.departments[0];
  const managerId = managers[0]?.id ?? "";
  const tlId = managers[1]?.id ?? managerId;
  const preferredRoles = roles.filter((role) => !["admin", "super admin"].includes(role.name.toLowerCase()));

  return {
    fields: {
      name: "Demo Employee",
      email: `demo.employee.${Date.now()}@adarshshipping.com`,
      password: "Demo@12345",
      designation: "Operations Executive",
      joinDate: formatDateForInput(new Date("2025-01-15")),
      grade: "L2",
      ctc: 480000,
      priorExperienceYears: 3,
    },
    dropdowns: {
      branchId: org?.branches[0]?.id ?? "",
      departmentId: department?.id ?? "",
      divisionId: department?.divisions[0]?.id ?? "",
      managerId,
      tlId,
    },
    roleIds: preferredRoles.slice(0, Math.min(2, preferredRoles.length)).map((role) => role.id),
  };
}

export function getLeaveDemoValues(leaveTypeId: string | undefined) {
  const from = new Date();
  from.setDate(from.getDate() + 2);

  const to = new Date(from);
  to.setDate(to.getDate() + 1);

  return {
    leaveTypeId: leaveTypeId ?? "",
    fromDate: formatDateForInput(from),
    toDate: formatDateForInput(to),
    halfDay: false,
    notes: "Demo leave request for client presentation.",
  };
}

export function getSalaryDemoValues(employees: { id: string }[]) {
  return {
    selectedEmployeeId: employees[0]?.id ?? "",
    inputs: {
      annualCTC: 720000,
      pfType: "CAPPED",
      city: "CHENNAI",
      monthlyIncentive: 5000,
      insurance: "FAMILY",
      taxRegime: "NEW",
    } satisfies SalaryInputs,
  };
}

function getQuestionAnswer(label: string, index: number) {
  return `Demo response ${index + 1} for ${label.toLowerCase()} showing ownership, consistency, and measurable impact.`;
}

export function buildSelfAssessmentDemoAnswers(
  criteria: CriterionPoint[],
  supplementary: CriterionPoint[],
): SelfAssessmentAnswers {
  void supplementary;
  return {
    version: "v2",
    employeeInfo: Object.fromEntries(
      EMPLOYEE_INFO_FIELDS.map((field) => [
        field.id,
        field.id === "has-break-up-period" ? "no" : `Demo ${field.label.toLowerCase()}`,
      ]),
    ),
    responses: Object.fromEntries(
      [...SELF_ASSESSMENT_PART_A_SECTIONS, CAREER_GROWTH_SECTION, DECISION_MAKING_SECTION, RETENTION_SECTION, COMPENSATION_SECTION]
        .flatMap((section) => section.questions.map((question, index) => [
          buildQuestionKey(section.id, question.id),
          question.type === "radio"
            ? {
                option: question.options?.[0]?.value,
                value: question.options?.[0]?.label,
                explanation: question.allowExplanation ? getQuestionAnswer(section.title, index) : undefined,
              }
            : {
                value: getQuestionAnswer(section.title, index),
              },
        ])),
    ),
    categoryPoints: Object.fromEntries(criteria.map((criterion) => [criterion.id, 4])),
    feedback: "Demo feedback focused on growth, support, and long-term contribution.",
  };
}

export function buildReviewerDemoAnswers(criteria: CriterionPoint[]): ReviewerRatingAnswers {
  const categoryPoints: Record<string, number> = {};
  const comments: Record<string, string> = {};
  const subItemRatings: Record<string, Record<string, number>> = {};

  for (const criterion of criteria) {
    categoryPoints[criterion.id] = 4;
    comments[criterion.id] = `Demo reviewer note for ${criterion.label.toLowerCase()} highlighting strong performance and reliable execution.`;
    subItemRatings[criterion.id] = Object.fromEntries(
      criterion.items.map((item) => [item.id, 4]),
    );
  }

  return {
    version: "v2",
    categoryPoints,
    subItemRatings,
    comments,
  };
}
