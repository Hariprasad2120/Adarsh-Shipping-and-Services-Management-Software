"use server";

import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

function ratingSliderQuestion(id: string, prompt: string) {
  return {
    id,
    prompt,
    questionType: "slider",
    options: [],
    responseConfig: {
      startLabel: "Needs Improvement",
      endLabel: "Excellent",
      increment: 5,
      step: 1,
    },
  };
}

function textQ(id: string, prompt: string) {
  return { id, prompt, questionType: "short_text", options: [], responseConfig: { startLabel: "", endLabel: "", increment: 5, step: 1 } };
}

function longTextQ(id: string, prompt: string) {
  return { id, prompt, questionType: "long_text", options: [], responseConfig: { startLabel: "", endLabel: "", increment: 5, step: 1 } };
}

function yesNoQ(id: string, prompt: string) {
  return { id, prompt, questionType: "yes_no", options: [], responseConfig: { startLabel: "", endLabel: "", increment: 5, step: 1 } };
}

function yesNoExplQ(id: string, prompt: string) {
  return { id, prompt, questionType: "yes_no_with_explanation", options: [], responseConfig: { startLabel: "", endLabel: "", increment: 5, step: 1 } };
}

function dateQ(id: string, prompt: string) {
  return { id, prompt, questionType: "date", options: [], responseConfig: { startLabel: "", endLabel: "", increment: 5, step: 1 } };
}

function currencyQ(id: string, prompt: string) {
  return { id, prompt, questionType: "currency", options: [], responseConfig: { startLabel: "", endLabel: "", increment: 5, step: 1 } };
}

function choiceQ(id: string, prompt: string, options: string[]) {
  return {
    id,
    prompt,
    questionType: "single_choice",
    options: options.map((label, i) => ({ id: `${id}-opt-${i + 1}`, label })),
    responseConfig: { startLabel: "", endLabel: "", increment: 5, step: 1 },
  };
}

function choiceExplQ(id: string, prompt: string, options: string[]) {
  return {
    id,
    prompt,
    questionType: "single_choice_with_explanation",
    options: options.map((label, i) => ({ id: `${id}-opt-${i + 1}`, label })),
    responseConfig: { startLabel: "", endLabel: "", increment: 5, step: 1 },
  };
}

function reviewerRatingChoiceQuestion(id: string, prompt: string) {
  return {
    id,
    prompt,
    questionType: "single_choice",
    options: [
      { id: `${id}-opt-1`, label: "1 - Needs Improvement" },
      { id: `${id}-opt-2`, label: "2 - Below Expectations" },
      { id: `${id}-opt-3`, label: "3 - Meets Expectations" },
      { id: `${id}-opt-4`, label: "4 - Very Good" },
      { id: `${id}-opt-5`, label: "5 - Excellent" },
    ],
    responseConfig: { startLabel: "", endLabel: "", increment: 5, step: 1 },
  };
}

// ---------------------------------------------------------------------------
// SELF phase criteria
// ---------------------------------------------------------------------------

const SELF_CRITERIA = [
  // Employee Info
  {
    code: "EMP-INFO",
    label: "Employee Information",
    description: "Basic employee details for this appraisal period.",
    weight: 0,
    phase: "SELF",
    order: 0,
    maxPoints: 0,
    kind: "SUPPLEMENTARY",
    reviewerOnly: false,
    meta: {
      questionItems: [
        textQ("emp-name", "Full Name"),
        textQ("emp-id", "Employee ID"),
        textQ("emp-dept", "Department"),
        textQ("emp-desig", "Designation"),
        textQ("emp-doj", "Date of Joining"),
        textQ("emp-branch", "Branch / Location"),
        textQ("emp-appraiser", "Name of Appraiser"),
        textQ("emp-period", "Appraisal Period"),
      ],
    },
  },

  // Part A — 10 performance criteria
  {
    code: "PA-01",
    label: "Quality of Work",
    description: "Accuracy, thoroughness, and excellence in task completion.",
    weight: 10,
    phase: "SELF",
    order: 1,
    maxPoints: 5,
    kind: "CATEGORY",
    reviewerOnly: false,
    meta: {
      questionItems: [
        longTextQ("pa01-q1", "Describe the quality of work you have delivered during this appraisal period. Mention specific achievements or projects."),
        longTextQ("pa01-q2", "Provide examples where your work quality met or exceeded expectations."),
        ratingSliderQuestion("pa01-self-rating", "Self Rating — Quality of Work"),
      ],
    },
  },
  {
    code: "PA-02",
    label: "Quantity of Work / Productivity",
    description: "Volume of work completed relative to targets and expectations.",
    weight: 10,
    phase: "SELF",
    order: 2,
    maxPoints: 5,
    kind: "CATEGORY",
    reviewerOnly: false,
    meta: {
      questionItems: [
        longTextQ("pa02-q1", "How would you describe your productivity and output during this period? Mention targets set vs. achieved."),
        longTextQ("pa02-q2", "Were there any factors that affected your productivity? How did you manage them?"),
        ratingSliderQuestion("pa02-self-rating", "Self Rating — Quantity of Work / Productivity"),
      ],
    },
  },
  {
    code: "PA-03",
    label: "Job Knowledge & Skills",
    description: "Depth of knowledge in role-specific functions and willingness to learn.",
    weight: 10,
    phase: "SELF",
    order: 3,
    maxPoints: 5,
    kind: "CATEGORY",
    reviewerOnly: false,
    meta: {
      questionItems: [
        longTextQ("pa03-q1", "Describe your current level of job knowledge and skills relevant to your role."),
        longTextQ("pa03-q2", "What new skills or knowledge did you acquire during this appraisal period?"),
        ratingSliderQuestion("pa03-self-rating", "Self Rating — Job Knowledge & Skills"),
      ],
    },
  },
  {
    code: "PA-04",
    label: "Reliability & Dependability",
    description: "Consistency, punctuality, and following through on commitments.",
    weight: 10,
    phase: "SELF",
    order: 4,
    maxPoints: 5,
    kind: "CATEGORY",
    reviewerOnly: false,
    meta: {
      questionItems: [
        longTextQ("pa04-q1", "Describe how you have demonstrated reliability and dependability in your role."),
        yesNoExplQ("pa04-q2", "Did you consistently meet deadlines and commitments during this period? Please explain."),
        ratingSliderQuestion("pa04-self-rating", "Self Rating — Reliability & Dependability"),
      ],
    },
  },
  {
    code: "PA-05",
    label: "Initiative & Innovation",
    description: "Proactively identifying opportunities and driving improvements.",
    weight: 10,
    phase: "SELF",
    order: 5,
    maxPoints: 5,
    kind: "CATEGORY",
    reviewerOnly: false,
    meta: {
      questionItems: [
        longTextQ("pa05-q1", "Describe any initiatives you took or innovations you introduced during this period."),
        longTextQ("pa05-q2", "What was the outcome or impact of your initiative?"),
        ratingSliderQuestion("pa05-self-rating", "Self Rating — Initiative & Innovation"),
      ],
    },
  },
  {
    code: "PA-06",
    label: "Communication Skills",
    description: "Clarity, effectiveness, and professionalism in written and verbal communication.",
    weight: 10,
    phase: "SELF",
    order: 6,
    maxPoints: 5,
    kind: "CATEGORY",
    reviewerOnly: false,
    meta: {
      questionItems: [
        longTextQ("pa06-q1", "How would you describe your communication skills — both verbal and written?"),
        longTextQ("pa06-q2", "Give an example where effective communication helped resolve a challenge or improved a process."),
        ratingSliderQuestion("pa06-self-rating", "Self Rating — Communication Skills"),
      ],
    },
  },
  {
    code: "PA-07",
    label: "Teamwork & Collaboration",
    description: "Ability to work constructively with colleagues and contribute to team goals.",
    weight: 10,
    phase: "SELF",
    order: 7,
    maxPoints: 5,
    kind: "CATEGORY",
    reviewerOnly: false,
    meta: {
      questionItems: [
        longTextQ("pa07-q1", "Describe how you contributed to your team's success during this period."),
        longTextQ("pa07-q2", "Give an example of a situation where teamwork was essential and your role in it."),
        ratingSliderQuestion("pa07-self-rating", "Self Rating — Teamwork & Collaboration"),
      ],
    },
  },
  {
    code: "PA-08",
    label: "Customer / Client Service",
    description: "Responsiveness, professionalism, and satisfaction in serving customers or internal stakeholders.",
    weight: 10,
    phase: "SELF",
    order: 8,
    maxPoints: 5,
    kind: "CATEGORY",
    reviewerOnly: false,
    meta: {
      questionItems: [
        longTextQ("pa08-q1", "Describe how you served customers or internal stakeholders during this period."),
        longTextQ("pa08-q2", "Share a specific example of handling a difficult customer situation or feedback."),
        ratingSliderQuestion("pa08-self-rating", "Self Rating — Customer / Client Service"),
      ],
    },
  },
  {
    code: "PA-09",
    label: "Adherence to Policies & Compliance",
    description: "Following company rules, safety guidelines, and regulatory requirements.",
    weight: 10,
    phase: "SELF",
    order: 9,
    maxPoints: 5,
    kind: "CATEGORY",
    reviewerOnly: false,
    meta: {
      questionItems: [
        longTextQ("pa09-q1", "How have you ensured compliance with company policies and procedures during this period?"),
        yesNoExplQ("pa09-q2", "Were there any compliance issues or policy violations during this period? Please explain."),
        ratingSliderQuestion("pa09-self-rating", "Self Rating — Adherence to Policies & Compliance"),
      ],
    },
  },
  {
    code: "PA-10",
    label: "Leadership & People Management",
    description: "Guidance, mentoring, and motivation of team members (for supervisory roles).",
    weight: 10,
    phase: "SELF",
    order: 10,
    maxPoints: 5,
    kind: "CATEGORY",
    reviewerOnly: false,
    meta: {
      questionItems: [
        longTextQ("pa10-q1", "Describe how you have led, mentored, or motivated your team during this period. (If not applicable, write N/A.)"),
        longTextQ("pa10-q2", "What specific steps did you take to develop team members' skills or performance?"),
        ratingSliderQuestion("pa10-self-rating", "Self Rating — Leadership & People Management"),
      ],
    },
  },

  // Part B — Career Aspirations & Decision-Making
  {
    code: "PB-CAREER",
    label: "Career Aspirations",
    description: "Employee's career goals and development expectations.",
    weight: 0,
    phase: "SELF",
    order: 11,
    maxPoints: 0,
    kind: "SUPPLEMENTARY",
    reviewerOnly: false,
    meta: {
      questionItems: [
        longTextQ("pb-career-q1", "What are your career goals for the next 1–2 years?"),
        longTextQ("pb-career-q2", "What skills or training would help you achieve those goals?"),
        longTextQ("pb-career-q3", "Is there a specific role or responsibility you would like to take on?"),
      ],
    },
  },
  {
    code: "PB-DECISION",
    label: "Decision-Making & Problem Solving",
    description: "How the employee approaches decisions and resolves challenges.",
    weight: 0,
    phase: "SELF",
    order: 12,
    maxPoints: 0,
    kind: "SUPPLEMENTARY",
    reviewerOnly: false,
    meta: {
      questionItems: [
        longTextQ("pb-decision-q1", "Describe a difficult decision you made during this period and the outcome."),
        longTextQ("pb-decision-q2", "How do you approach problem solving when faced with a challenge?"),
      ],
    },
  },

  // Part C — Retention
  {
    code: "PC-RETENTION",
    label: "Retention & Engagement",
    description: "Factors related to employee satisfaction and intent to stay.",
    weight: 0,
    phase: "SELF",
    order: 13,
    maxPoints: 0,
    kind: "SUPPLEMENTARY",
    reviewerOnly: false,
    meta: {
      questionItems: [
        choiceQ("pc-ret-satisfaction", "How satisfied are you with your current role and responsibilities?", [
          "Very Satisfied",
          "Satisfied",
          "Neutral",
          "Dissatisfied",
          "Very Dissatisfied",
        ]),
        yesNoExplQ("pc-ret-stay", "Do you see yourself continuing with the organisation for the next 2 years? Please explain."),
        longTextQ("pc-ret-improve", "What could the organisation do to improve your workplace experience?"),
      ],
    },
  },

  // Part D — Compensation
  {
    code: "PD-COMPENSATION",
    label: "Compensation & Benefits",
    description: "Current compensation details and increment expectations.",
    weight: 0,
    phase: "SELF",
    order: 14,
    maxPoints: 0,
    kind: "SUPPLEMENTARY",
    reviewerOnly: false,
    meta: {
      questionItems: [
        currencyQ("pd-ctc-current", "Current CTC (₹ per annum)"),
        currencyQ("pd-ctc-expected", "Expected CTC (₹ per annum)"),
        longTextQ("pd-ctc-justification", "Justification for expected increment / CTC revision"),
        dateQ("pd-last-increment-date", "Date of Last Increment"),
        currencyQ("pd-last-increment-amount", "Amount of Last Increment (₹)"),
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// REVIEWER phase criteria
// ---------------------------------------------------------------------------

const ALL_REVIEWER_ROLES = ["MANAGEMENT", "MANAGER", "TL", "HR"];

function reviewerCriterion(
  code: string,
  label: string,
  description: string,
  order: number,
  allowedRoles: string[],
  questionItems: object[],
) {
  return {
    code,
    label,
    description,
    weight: 10,
    phase: "REVIEWER",
    order,
    maxPoints: 5,
    kind: "CATEGORY",
    reviewerOnly: true,
    meta: {
      allowedEvaluatorRoles: allowedRoles,
      questionItems,
    },
  };
}

const REVIEWER_CRITERIA = [
  reviewerCriterion("RV-01", "Quality of Work", "Evaluator assessment of work quality.", 1, ALL_REVIEWER_ROLES, [
    reviewerRatingChoiceQuestion("rv01-rating", "Rating — Quality of Work"),
    longTextQ("rv01-remarks", "Remarks"),
  ]),
  reviewerCriterion("RV-02", "Quantity of Work / Productivity", "Evaluator assessment of output volume.", 2, ALL_REVIEWER_ROLES, [
    reviewerRatingChoiceQuestion("rv02-rating", "Rating — Quantity of Work / Productivity"),
    longTextQ("rv02-remarks", "Remarks"),
  ]),
  reviewerCriterion("RV-03", "Job Knowledge & Skills", "Evaluator assessment of job knowledge.", 3, ALL_REVIEWER_ROLES, [
    reviewerRatingChoiceQuestion("rv03-rating", "Rating — Job Knowledge & Skills"),
    longTextQ("rv03-remarks", "Remarks"),
  ]),
  reviewerCriterion("RV-04", "Reliability & Dependability", "Evaluator assessment of reliability.", 4, ALL_REVIEWER_ROLES, [
    reviewerRatingChoiceQuestion("rv04-rating", "Rating — Reliability & Dependability"),
    longTextQ("rv04-remarks", "Remarks"),
  ]),
  reviewerCriterion("RV-05", "Initiative & Innovation", "Evaluator assessment of initiative.", 5, ALL_REVIEWER_ROLES, [
    reviewerRatingChoiceQuestion("rv05-rating", "Rating — Initiative & Innovation"),
    longTextQ("rv05-remarks", "Remarks"),
  ]),
  reviewerCriterion("RV-06", "Communication Skills", "Evaluator assessment of communication.", 6, ALL_REVIEWER_ROLES, [
    reviewerRatingChoiceQuestion("rv06-rating", "Rating — Communication Skills"),
    longTextQ("rv06-remarks", "Remarks"),
  ]),
  reviewerCriterion("RV-07", "Teamwork & Collaboration", "Evaluator assessment of teamwork.", 7, ALL_REVIEWER_ROLES, [
    reviewerRatingChoiceQuestion("rv07-rating", "Rating — Teamwork & Collaboration"),
    longTextQ("rv07-remarks", "Remarks"),
  ]),
  reviewerCriterion("RV-08", "Customer / Client Service", "Evaluator assessment of service quality.", 8, ALL_REVIEWER_ROLES, [
    reviewerRatingChoiceQuestion("rv08-rating", "Rating — Customer / Client Service"),
    longTextQ("rv08-remarks", "Remarks"),
  ]),
  reviewerCriterion("RV-09", "Adherence to Policies & Compliance", "Evaluator assessment of policy adherence.", 9, ALL_REVIEWER_ROLES, [
    reviewerRatingChoiceQuestion("rv09-rating", "Rating — Adherence to Policies & Compliance"),
    longTextQ("rv09-remarks", "Remarks"),
  ]),
  reviewerCriterion("RV-10", "Leadership & People Management", "Evaluator assessment of leadership.", 10, ALL_REVIEWER_ROLES, [
    reviewerRatingChoiceQuestion("rv10-rating", "Rating — Leadership & People Management"),
    longTextQ("rv10-remarks", "Remarks"),
  ]),
  reviewerCriterion("RV-11", "Overall Performance Assessment", "Holistic overall rating by evaluator.", 11, ALL_REVIEWER_ROLES, [
    reviewerRatingChoiceQuestion("rv11-rating", "Overall Rating"),
    longTextQ("rv11-remarks", "Overall Remarks"),
  ]),
  reviewerCriterion("RV-12", "Training & Development Needs", "Identified training needs for next period.", 12, ALL_REVIEWER_ROLES, [
    longTextQ("rv12-training-needs", "Training / Development needs identified for the next appraisal period"),
    choiceExplQ("rv12-priority", "Priority of Training", ["High", "Medium", "Low"]),
  ]),

  // Final Remarks — role-specific so each role only sees their own
  {
    code: "FR-MGMT",
    label: "Final Remarks — Management",
    description: "Management's final remarks and recommendation.",
    weight: 0,
    phase: "REVIEWER",
    order: 13,
    maxPoints: 0,
    kind: "SUPPLEMENTARY",
    reviewerOnly: true,
    meta: {
      allowedEvaluatorRoles: ["MANAGEMENT"],
      questionItems: [
        longTextQ("fr-mgmt-remarks", "Final Remarks (Management)"),
        choiceQ("fr-mgmt-recommendation", "Recommendation", [
          "Promote",
          "Increment",
          "Lateral Move",
          "No Change",
          "Performance Improvement Plan",
        ]),
        yesNoQ("fr-mgmt-confirmed", "Appraisal Confirmed by Management"),
      ],
    },
  },
  {
    code: "FR-MANAGER",
    label: "Final Remarks — Manager",
    description: "Line manager's final remarks and recommendation.",
    weight: 0,
    phase: "REVIEWER",
    order: 14,
    maxPoints: 0,
    kind: "SUPPLEMENTARY",
    reviewerOnly: true,
    meta: {
      allowedEvaluatorRoles: ["MANAGER"],
      questionItems: [
        longTextQ("fr-manager-remarks", "Final Remarks (Manager)"),
        choiceQ("fr-manager-recommendation", "Recommendation", [
          "Promote",
          "Increment",
          "Lateral Move",
          "No Change",
          "Performance Improvement Plan",
        ]),
        yesNoQ("fr-manager-confirmed", "Appraisal Confirmed by Manager"),
      ],
    },
  },
  {
    code: "FR-TL",
    label: "Final Remarks — Team Lead",
    description: "Team Lead's final remarks and recommendation.",
    weight: 0,
    phase: "REVIEWER",
    order: 15,
    maxPoints: 0,
    kind: "SUPPLEMENTARY",
    reviewerOnly: true,
    meta: {
      allowedEvaluatorRoles: ["TL"],
      questionItems: [
        longTextQ("fr-tl-remarks", "Final Remarks (Team Lead)"),
        choiceQ("fr-tl-recommendation", "Recommendation", [
          "Promote",
          "Increment",
          "Lateral Move",
          "No Change",
          "Performance Improvement Plan",
        ]),
        yesNoQ("fr-tl-confirmed", "Appraisal Confirmed by Team Lead"),
      ],
    },
  },
  {
    code: "FR-HR",
    label: "Final Remarks — HR",
    description: "HR's final remarks, increment decision, and sign-off.",
    weight: 0,
    phase: "REVIEWER",
    order: 16,
    maxPoints: 0,
    kind: "SUPPLEMENTARY",
    reviewerOnly: true,
    meta: {
      allowedEvaluatorRoles: ["HR"],
      questionItems: [
        longTextQ("fr-hr-remarks", "Final Remarks (HR)"),
        currencyQ("fr-hr-increment-amount", "Increment Amount Approved (₹)"),
        currencyQ("fr-hr-new-ctc", "Revised CTC (₹ per annum)"),
        dateQ("fr-hr-effective-date", "Effective Date of Increment"),
        yesNoQ("fr-hr-confirmed", "Appraisal Signed Off by HR"),
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function seedAppraisalCriteria(): Promise<{ success: boolean; message: string; created: number }> {
  const session = await auth();
  if (!session) return { success: false, message: "Unauthorized", created: 0 };
  await requirePermission(session.user.id, "ams.criteria.manage");

  const orgId = session.user.orgId!;

  // Clear existing criteria for this org
  await db.appraisalCriterion.deleteMany({ where: { orgId } });

  const allCriteria = [...SELF_CRITERIA, ...REVIEWER_CRITERIA];
  let created = 0;

  for (const criterion of allCriteria) {
    await db.appraisalCriterion.create({
      data: {
        orgId,
        code: criterion.code,
        label: criterion.label,
        description: criterion.description,
        weight: criterion.weight,
        phase: criterion.phase,
        order: criterion.order,
        maxPoints: criterion.maxPoints,
        kind: criterion.kind,
        reviewerOnly: criterion.reviewerOnly,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: criterion.meta as any,
      },
    });
    created++;
  }

  return { success: true, message: `Seeded ${created} criteria records`, created };
}
