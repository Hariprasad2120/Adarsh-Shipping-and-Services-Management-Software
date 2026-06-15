import type { QuestionResponse, ReviewerRatingAnswers, SelfAssessmentAnswers } from "@/modules/ams/criteria-config";
import type { CriterionPoint } from "@/modules/ams/types";
import {
  buildQuestionKey,
  buildDefaultSelfFormTemplate,
  EMPLOYEE_INFO_FIELDS,
  type AppraisalQuestionDefinition,
  type AppraisalSelfFormTemplate,
} from "@/modules/ams/criteria-config";
import type { SalaryInputs } from "@/modules/hrms/salary-structure";

export const demoFillEnabled =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_DEMO_FILL !== "false";

type DemoFieldValue = string | number | boolean;
export type DemoPerformanceProfile = "poor" | "average" | "good";

const DEMO_PROFILE_COPY: Record<
  DemoPerformanceProfile,
  {
    label: string;
    minRating: number;
    maxRating: number;
    feedback: string;
    reviewerTone: string;
  }
> = {
  poor: {
    label: "Poor Performer",
    minRating: 1,
    maxRating: 2,
    feedback: "Demo feedback focused on support needed, closer coaching, and a clear improvement plan.",
    reviewerTone: "highlighting coaching needs, missed expectations, and closer follow-up.",
  },
  average: {
    label: "Average Performer",
    minRating: 2,
    maxRating: 4,
    feedback: "Demo feedback focused on steady delivery, consistency, and a few areas for improvement.",
    reviewerTone: "highlighting dependable delivery with room for improvement and stronger consistency.",
  },
  good: {
    label: "Good Performer",
    minRating: 4,
    maxRating: 5,
    feedback: "Demo feedback focused on growth, support, and long-term contribution.",
    reviewerTone: "highlighting strong performance, ownership, and reliable execution.",
  },
};

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
      employeeNumber: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      personalEmail: `demo.personal.${Date.now()}@gmail.com`,
      mobileNumber: "9876543210",
      fatherName: "Demo Kumar",
      dateOfBirth: formatDateForInput(new Date("1998-08-20")),
      aadhaar: "123412341234",
      panNumber: "ABCDE1234F",
      gender: "Male",
      maritalStatus: "Single",
      presentAddressLine1: "12 Demo Street",
      presentAddressLine2: "Near Port Road",
      presentCity: "Chennai",
      presentStateCode: "TN",
      presentPostalCode: "600001",
      presentCountry: "India",
      permanentAddressLine1: "42 Native Town",
      permanentAddressLine2: "West Block",
      permanentCity: "Madurai",
      permanentStateCode: "TN",
      permanentPostalCode: "625001",
      permanentCountry: "India",
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

function getRandomRating(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function buildSelfAssessmentDemoAnswers(
  criteria: CriterionPoint[],
  selfTemplate?: AppraisalSelfFormTemplate,
  profile: DemoPerformanceProfile = "average",
): SelfAssessmentAnswers {
  void criteria;
  void profile;
  const resolvedTemplate = selfTemplate ?? buildDefaultSelfFormTemplate();
  const allSections = resolvedTemplate.partASections;

  return {
    version: "v2",
    employeeInfo: Object.fromEntries(
      (resolvedTemplate.employeeInfoFields.length > 0 ? resolvedTemplate.employeeInfoFields : EMPLOYEE_INFO_FIELDS).map((field) => [
        field.id,
        field.id === "has-break-up-period" ? "no" : `Demo ${field.label.toLowerCase()}`,
      ]),
    ),
    responses: Object.fromEntries(
      allSections
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
    categoryPoints: {},
    feedback: "",
  };
}

export function buildReviewerDemoAnswers(
  criteria: CriterionPoint[],
  profile: DemoPerformanceProfile = "average",
): ReviewerRatingAnswers {
  const profileCopy = DEMO_PROFILE_COPY[profile];
  const categoryPoints: Record<string, number> = {};
  const comments: Record<string, string> = {};
  const subItemRatings: Record<string, Record<string, number>> = {};
  const responses: Record<string, Record<string, QuestionResponse>> = {};

  for (const criterion of criteria) {
    const questions: AppraisalQuestionDefinition[] = criterion.questionItems.length > 0
      ? criterion.questionItems
      : criterion.items.map((item) => ({ id: item.id, prompt: item.label, type: "number" }));
    const criterionRatings: Record<string, number> = {};
    const criterionResponses: Record<string, QuestionResponse> = {};

    for (const question of questions) {
      if (question.type === "number") {
        const rating = getRandomRating(profileCopy.minRating, profileCopy.maxRating);
        criterionRatings[question.id] = rating;
        criterionResponses[question.id] = { value: String(rating) };
        continue;
      }

      if (question.type === "radio") {
        criterionResponses[question.id] = {
          option: question.options?.[0]?.value,
          value: question.options?.[0]?.label,
          explanation: question.allowExplanation ? getQuestionAnswer(question.prompt, 0) : undefined,
        };
        continue;
      }

      criterionResponses[question.id] = { value: getQuestionAnswer(question.prompt, 0) };
    }

    const values = Object.values(criterionRatings);
    const average = values.length > 0
      ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
      : getRandomRating(profileCopy.minRating, profileCopy.maxRating);

    categoryPoints[criterion.id] = average;
    comments[criterion.id] = `Demo reviewer note for ${criterion.label.toLowerCase()} ${profileCopy.reviewerTone}`;
    subItemRatings[criterion.id] = criterionRatings;
    responses[criterion.id] = criterionResponses;
  }

  return {
    version: "v2",
    categoryPoints,
    subItemRatings,
    responses,
    comments,
  };
}

export const demoPerformanceProfiles = (Object.entries(DEMO_PROFILE_COPY) as Array<[DemoPerformanceProfile, { label: string }]>)
  .map(([value, config]) => ({ value, label: config.label }));
