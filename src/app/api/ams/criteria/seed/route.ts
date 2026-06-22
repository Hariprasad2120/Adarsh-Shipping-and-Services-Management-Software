import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { invalidateReviewerCriteria } from "@/modules/ams/criteria-cache";

function ratingQ(id: string, prompt: string) {
  return {
    id, prompt, questionType: "slider", options: [],
    responseConfig: { startLabel: "Needs Improvement", endLabel: "Excellent", increment: 5, step: 1 },
  };
}
function shortQ(id: string, prompt: string) {
  return { id, prompt, questionType: "short_text", options: [], responseConfig: { startLabel: "", endLabel: "", increment: 5, step: 1 } };
}
function longQ(id: string, prompt: string) {
  return { id, prompt, questionType: "long_text", options: [], responseConfig: { startLabel: "", endLabel: "", increment: 5, step: 1 } };
}
function yesNoQ(id: string, prompt: string) {
  return { id, prompt, questionType: "yes_no", options: [], responseConfig: { startLabel: "", endLabel: "", increment: 5, step: 1 } };
}
function yesNoExplQ(id: string, prompt: string) {
  return { id, prompt, questionType: "yes_no_with_explanation", options: [], responseConfig: { startLabel: "", endLabel: "", increment: 5, step: 1 } };
}
function choiceQ(id: string, prompt: string, options: string[]) {
  return {
    id, prompt, questionType: "single_choice",
    options: options.map((label, i) => ({ id: `${id}-opt-${i + 1}`, label })),
    responseConfig: { startLabel: "", endLabel: "", increment: 5, step: 1 },
  };
}
function choiceExplQ(id: string, prompt: string, options: string[]) {
  return {
    id, prompt, questionType: "single_choice_with_explanation",
    options: options.map((label, i) => ({ id: `${id}-opt-${i + 1}`, label })),
    responseConfig: { startLabel: "", endLabel: "", increment: 5, step: 1 },
  };
}

function ratingChoiceQ(id: string, prompt: string) {
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
// SELF phase — exact structure from PDF
// ---------------------------------------------------------------------------

const SELF_CRITERIA = [
  // ── Employee Information ──────────────────────────────────────────────
  {
    code: "EMP-INFO", label: "Employee Information",
    description: "",
    weight: 0, phase: "SELF", order: 0, maxPoints: 0, kind: "SUPPLEMENTARY", reviewerOnly: false,
    meta: {
      questionItems: [
        shortQ("emp-name", "Name"),
        shortQ("emp-dept", "Department"),
        shortQ("emp-position", "Position"),
        shortQ("emp-prev-appraisal", "Date of Previous Appraisal Meeting"),
        shortQ("emp-years", "Years of Association with Adarsh Shipping and Services"),
        yesNoQ("emp-breakup", "Do you have any break-up period with this organization?"),
        longQ("emp-breakup-reason", "If YES, please specify the reason for the break-up period"),
      ],
    },
  },

  // ── Part A — 10 criteria ─────────────────────────────────────────────
  {
    code: "PA-01", label: "Core Performance & Efficiency",
    description: "The quality, speed, and accuracy of work execution.",
    weight: 10, phase: "SELF", order: 1, maxPoints: 5, kind: "CATEGORY", reviewerOnly: false,
    meta: {
      questionItems: [
        longQ("pa01-q1", "List three major accomplishments in your role over the last appraisal period."),
        longQ("pa01-q2", "Have you consistently met your targets? If not, what were the challenges?"),
        longQ("pa01-q3", "How do you ensure the accuracy and quality of your work?"),
        ratingQ("pa01-rating", "Self Rating — Core Performance & Efficiency"),
      ],
    },
  },
  {
    code: "PA-02", label: "Accountability & Attendance",
    description: "Punctuality, reliability, and adherence to schedules.",
    weight: 10, phase: "SELF", order: 2, maxPoints: 5, kind: "CATEGORY", reviewerOnly: false,
    meta: {
      questionItems: [
        shortQ("pa02-q1", "How often have you taken unplanned leaves in the past 6 months?"),
        longQ("pa02-q2", "How do you manage workload when faced with tight deadlines?"),
        longQ("pa02-q3", "Give an example of when you took complete ownership of a critical task."),
        ratingQ("pa02-rating", "Self Rating — Accountability & Attendance"),
      ],
    },
  },
  {
    code: "PA-03", label: "Collaboration & Leadership",
    description: "Teamwork, leadership abilities, and conflict resolution.",
    weight: 15, phase: "SELF", order: 3, maxPoints: 5, kind: "CATEGORY", reviewerOnly: false,
    meta: {
      questionItems: [
        longQ("pa03-q1", "Describe a situation where you successfully worked with a team to achieve a goal."),
        longQ("pa03-q2", "Have you mentored or helped a colleague? How did it impact them?"),
        longQ("pa03-q3", "How do you handle workplace conflicts?"),
        ratingQ("pa03-rating", "Self Rating — Collaboration & Leadership"),
      ],
    },
  },
  {
    code: "PA-04", label: "Client & Stakeholder Satisfaction",
    description: "Responsiveness, relationship management, and feedback.",
    weight: 15, phase: "SELF", order: 4, maxPoints: 5, kind: "CATEGORY", reviewerOnly: false,
    meta: {
      questionItems: [
        longQ("pa04-q1", "Have you handled any difficult clients? How did you resolve the situation?"),
        longQ("pa04-q2", "What steps do you take to ensure client satisfaction in your role?"),
        ratingQ("pa04-rating", "Self Rating — Client & Stakeholder Satisfaction"),
      ],
    },
  },
  {
    code: "PA-05", label: "Compliance & Risk Management",
    description: "Adherence to policies, risk mitigation, and ethical conduct.",
    weight: 10, phase: "SELF", order: 5, maxPoints: 5, kind: "CATEGORY", reviewerOnly: false,
    meta: {
      questionItems: [
        longQ("pa05-q1", "Have you ever identified a risk in your department? How did you handle it?"),
        longQ("pa05-q2", "How do you ensure adherence to company policies in your daily work?"),
        ratingQ("pa05-rating", "Self Rating — Compliance & Risk Management"),
      ],
    },
  },
  {
    code: "PA-06", label: "Problem-Solving & Crisis Management",
    description: "Decision-making, problem resolution, and crisis handling.",
    weight: 15, phase: "SELF", order: 6, maxPoints: 5, kind: "CATEGORY", reviewerOnly: false,
    meta: {
      questionItems: [
        longQ("pa06-q1", "Describe a time when you had to make a quick decision under pressure."),
        longQ("pa06-q2", "What is your approach to solving unexpected challenges?"),
        ratingQ("pa06-rating", "Self Rating — Problem-Solving & Crisis Management"),
      ],
    },
  },
  {
    code: "PA-07", label: "Organizational Contribution & Engagement",
    description: "Initiative, participation in company activities, and alignment with goals.",
    weight: 10, phase: "SELF", order: 7, maxPoints: 5, kind: "CATEGORY", reviewerOnly: false,
    meta: {
      questionItems: [
        longQ("pa07-q1", "Apart from your core responsibilities, how have you contributed to company activities?"),
        yesNoExplQ("pa07-q2", "Are you willing to take on additional responsibilities if needed?"),
        ratingQ("pa07-rating", "Self Rating — Organizational Contribution & Engagement"),
      ],
    },
  },
  {
    code: "PA-08", label: "Professionalism & Communication",
    description: "Clarity, respect, responsiveness, and effective communication.",
    weight: 10, phase: "SELF", order: 8, maxPoints: 5, kind: "CATEGORY", reviewerOnly: false,
    meta: {
      questionItems: [
        longQ("pa08-q1", "How do you ensure effective communication with your team and managers?"),
        longQ("pa08-q2", "How do you handle feedback from seniors and colleagues?"),
        ratingQ("pa08-rating", "Self Rating — Professionalism & Communication"),
      ],
    },
  },
  {
    code: "PA-09", label: "Innovation & Continuous Improvement",
    description: "Creativity, process improvements, and implementation of new ideas.",
    weight: 10, phase: "SELF", order: 9, maxPoints: 5, kind: "CATEGORY", reviewerOnly: false,
    meta: {
      questionItems: [
        longQ("pa09-q1", "Have you suggested or implemented any improvements in your department?"),
        longQ("pa09-q2", "What was the last skill or knowledge area you proactively learned?"),
        ratingQ("pa09-rating", "Self Rating — Innovation & Continuous Improvement"),
      ],
    },
  },
  {
    code: "PA-10", label: "Adaptability & Learning",
    description: "Willingness to learn, flexibility, and responsiveness to change.",
    weight: 10, phase: "SELF", order: 10, maxPoints: 5, kind: "CATEGORY", reviewerOnly: false,
    meta: {
      questionItems: [
        longQ("pa10-q1", "Have you worked in a situation where you had to quickly adapt to changes? How did you manage?"),
        longQ("pa10-q2", "How do you stay updated with industry trends and new developments?"),
        ratingQ("pa10-rating", "Self Rating — Adaptability & Learning"),
      ],
    },
  },

  // ── Part B ────────────────────────────────────────────────────────────
  {
    code: "PB-CAREER", label: "Career Aspirations & Growth Perspective",
    description: "",
    weight: 0, phase: "SELF", order: 11, maxPoints: 0, kind: "SUPPLEMENTARY", reviewerOnly: false,
    meta: {
      questionItems: [
        longQ("pb-c1", "Where do you see yourself in the next 3 years within this company?"),
        longQ("pb-c2", "If given an opportunity for a leadership role, what would you do differently from current managers?"),
        longQ("pb-c3", "What motivates you more: Growth opportunities or financial incentives? Explain why."),
        yesNoExplQ("pb-c4", "Would you be open to learning new roles outside your current job description?"),
      ],
    },
  },
  {
    code: "PB-DECISION", label: "Decision-Making & Managerial Capabilities",
    description: "These questions require logical reasoning and critical thinking. Avoid internet-based answers.",
    weight: 0, phase: "SELF", order: 12, maxPoints: 0, kind: "SUPPLEMENTARY", reviewerOnly: false,
    meta: {
      questionItems: [
        choiceExplQ("pb-d1",
          "Q1: You are assigned to lead a team, but one of your team members consistently underperforms despite repeated guidance. What is your first step?",
          [
            "a) Report to higher management immediately",
            "b) Have a one-on-one conversation to understand the issue",
            "c) Assign their work to someone else to avoid delays",
            "d) Ignore and continue managing other tasks",
          ]
        ),
        choiceExplQ("pb-d2",
          "Q2: If you are given a chance to implement a major change in your department, how would you convince your team to support it?",
          [
            "a) Enforce it as a rule and expect compliance",
            "b) Explain its benefits and take their feedback before implementing",
            "c) Wait for management approval before taking any steps",
            "d) Implement it immediately and justify later",
          ]
        ),
        choiceExplQ("pb-d3",
          "Q3: A junior colleague makes a critical mistake that affects an ongoing project. How do you respond?",
          [
            "a) Blame them and report to management",
            "b) Identify the issue, guide them to fix it, and ensure it doesn't happen again",
            "c) Fix the problem yourself and inform them later",
            "d) Avoid involvement and let the manager handle it",
          ]
        ),
        choiceExplQ("pb-d4",
          "Q4: During a crisis at work, where multiple urgent tasks arise, how do you prioritize?",
          [
            "a) Complete the easiest tasks first",
            "b) Focus on tasks that impact business operations most",
            "c) Delegate everything to other employees",
            "d) Wait for instructions from management",
          ]
        ),
        longQ("pb-d5",
          "Q5: You have two job offers — Company A offers a higher salary but no growth opportunities; Company B offers a moderate salary but a clear growth path. Which one would you choose and why?"
        ),
      ],
    },
  },

  // ── Part C — Retention ────────────────────────────────────────────────
  {
    code: "PC-RETENTION", label: "Retention",
    description: "",
    weight: 0, phase: "SELF", order: 13, maxPoints: 0, kind: "SUPPLEMENTARY", reviewerOnly: false,
    meta: {
      questionItems: [
        choiceQ("pc-1",
          "1. How long do you see yourself working with Adarsh Shipping and Services?",
          ["a) Less than a year", "b) 1-3 years", "c) 3-5 years", "d) Long-term"]
        ),
        choiceExplQ("pc-2",
          "2. If you were offered a 20% salary hike to leave immediately for another company, what would you do?",
          [
            "a) Accept without second thought",
            "b) Consider factors beyond salary before deciding",
            "c) Decline and discuss growth opportunities internally",
            "d) Negotiate a better offer with the current company",
          ]
        ),
        choiceExplQ("pc-3",
          "3. If you had to choose between job stability and a 50% higher salary elsewhere but with risk, what would you prioritize?",
          [
            "a) Stability",
            "b) Higher salary",
            "c) Depends on the role and responsibilities",
            "d) Would negotiate for a middle ground",
          ]
        ),
        longQ("pc-4",
          "4. If Adarsh Shipping and Services introduces a new role with greater responsibilities but no immediate salary hike, would you take it? Why or why not?"
        ),
      ],
    },
  },

  // ── Part D — Compensation & Satisfaction ─────────────────────────────
  {
    code: "PD-COMPENSATION", label: "Compensation & Satisfaction",
    description: "",
    weight: 0, phase: "SELF", order: 14, maxPoints: 0, kind: "SUPPLEMENTARY", reviewerOnly: false,
    meta: {
      questionItems: [
        longQ("pd-1", "1. What is your current salary (Annual & Monthly CTC)?"),
        longQ("pd-2", "2. What is your expected salary for the year April 2024?"),
        yesNoExplQ("pd-3", "3. Are you satisfied with your current salary? If No, please provide a reason."),
        longQ("pd-4", "4. What would make you feel more valued in this organization aside from salary increments?"),
      ],
    },
  },

  // ── Feedback ─────────────────────────────────────────────────────────
  {
    code: "FEEDBACK", label: "Feedback",
    description: "",
    weight: 0, phase: "SELF", order: 15, maxPoints: 0, kind: "SUPPLEMENTARY", reviewerOnly: false,
    meta: {
      questionItems: [
        longQ("feedback-1", "Additional feedback, queries, or comments"),
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// REVIEWER phase — exact structure + role assignments from PDF (page 12)
// ---------------------------------------------------------------------------
// Roles: MANAGEMENT = MNG, MANAGER = Manager, TL = TL, HR = HR

const ALL = ["MANAGEMENT", "MANAGER", "TL", "HR"];
const NO_HR = ["MANAGEMENT", "MANAGER", "TL"];
const NO_MGMT = ["MANAGER", "TL", "HR"];

function rvCriterion(
  code: string, label: string, description: string,
  weight: number, order: number, maxPoints: number,
  roles: string[], subItems: string[],
) {
  return {
    code, label, description,
    weight, phase: "REVIEWER", order, maxPoints,
    kind: maxPoints > 0 ? "CATEGORY" : "SUPPLEMENTARY",
    reviewerOnly: true,
    meta: {
      allowedEvaluatorRoles: roles,
      questionItems: [
        ...subItems.map((item, i) => ratingChoiceQ(`${code.toLowerCase()}-sub${i + 1}`, item)),
        longQ(`${code.toLowerCase()}-comments`, "Comments"),
      ],
    },
  };
}

const REVIEWER_CRITERIA = [
  rvCriterion(
    "RV-01", "Core Performance & Efficiency",
    "The quality, speed, and accuracy of work execution. Measures productivity, attention to detail, and consistency in delivering high-quality work efficiently.",
    25, 1, 5, NO_HR,
    ["Quality", "Speed", "Accuracy"],
  ),
  rvCriterion(
    "RV-02", "Accountability & Attendance",
    "Punctuality, reliability, and adherence to schedules. Ensures employees are dependable, meet deadlines, and maintain a strong presence in the workplace.",
    10, 2, 5, NO_MGMT,
    ["Punctuality", "Reliability", "Adherence"],
  ),
  rvCriterion(
    "RV-03", "Collaboration & Leadership",
    "Teamwork, leadership abilities, and conflict resolution. Assesses ability to work effectively with colleagues, lead when necessary, and manage conflicts constructively.",
    15, 3, 5, ALL,
    ["Teamwork", "Leadership Abilities", "Conflict Resolution"],
  ),
  rvCriterion(
    "RV-04", "Client & Stakeholder Satisfaction",
    "Responsiveness, relationship management, and feedback. Reflects how well employees handle interactions with clients and stakeholders.",
    15, 4, 5, NO_HR,
    ["Responsiveness", "Relationship Management", "Feedback"],
  ),
  rvCriterion(
    "RV-05", "Compliance & Risk Management",
    "Adherence to policies, risk mitigation, and ethical conduct. Employees must follow company policies, minimize risks, and uphold ethical standards.",
    10, 5, 5, ALL,
    ["Adherence to Policies", "Risk Mitigation", "Ethical Conduct"],
  ),
  rvCriterion(
    "RV-06", "Problem-Solving & Crisis Management",
    "Decision-making, problem resolution, and crisis handling. Measures the ability to think critically, resolve challenges effectively, and manage high-pressure situations.",
    15, 6, 5, NO_HR,
    ["Decision-Making", "Problem Resolution", "Crisis Handling"],
  ),
  rvCriterion(
    "RV-07", "Organizational Contribution & Engagement",
    "Initiative, participation in company activities, and alignment with goals. Employees assessed on involvement in organizational initiatives and alignment with company objectives.",
    10, 7, 5, NO_MGMT,
    ["Initiative", "Participation", "Alignment with Goals"],
  ),
  rvCriterion(
    "RV-08", "Professionalism & Communication",
    "Clarity, respect, responsiveness, and effective communication. Ensures employees communicate professionally, clearly, and respectfully.",
    10, 8, 5, ALL,
    ["Clarity", "Respect", "Responsiveness", "Effectiveness of Communication"],
  ),
  rvCriterion(
    "RV-09", "Innovation & Continuous Improvement",
    "Creativity, process improvements, and implementation of new ideas. Recognizes employees who contribute innovative solutions and help improve processes.",
    10, 9, 5, ALL,
    ["Creativity", "Process Improvements", "Implementation of New Ideas"],
  ),
  rvCriterion(
    "RV-10", "Adaptability & Learning",
    "Willingness to learn, flexibility, and responsiveness to change. Employees should embrace new challenges, adapt to change, and continuously seek growth.",
    10, 10, 5, ALL,
    ["Willingness to Learn", "Flexibility", "Responsiveness to Change"],
  ),
  rvCriterion(
    "RV-11", "Work Ethic & Attitude",
    "Dedication, integrity, enthusiasm, and workplace behavior. Measures overall commitment, moral conduct, and attitude towards work.",
    10, 11, 5, ALL,
    ["Dedication", "Integrity", "Enthusiasm", "Workplace Behaviour"],
  ),
  rvCriterion(
    "RV-12", "Results & Goal Achievement",
    "Target completion, measurable impact, and overall contribution. Employees assessed on ability to meet or exceed goals and contribute to the company's success.",
    20, 12, 5, NO_HR,
    ["Target Completion", "Measurable Impact", "Overall Contribution"],
  ),

  // Final Remarks — role-specific
  {
    code: "FR-MGMT", label: "Final Remarks — Management",
    description: "",
    weight: 0, phase: "REVIEWER", order: 13, maxPoints: 0, kind: "SUPPLEMENTARY", reviewerOnly: true,
    meta: {
      allowedEvaluatorRoles: ["MANAGEMENT"],
      questionItems: [longQ("fr-mgmt", "Final Remarks (Management)")],
    },
  },
  {
    code: "FR-MANAGER", label: "Final Remarks — Manager",
    description: "",
    weight: 0, phase: "REVIEWER", order: 14, maxPoints: 0, kind: "SUPPLEMENTARY", reviewerOnly: true,
    meta: {
      allowedEvaluatorRoles: ["MANAGER"],
      questionItems: [longQ("fr-manager", "Final Remarks (Manager)")],
    },
  },
  {
    code: "FR-TL", label: "Final Remarks — Team Lead",
    description: "",
    weight: 0, phase: "REVIEWER", order: 15, maxPoints: 0, kind: "SUPPLEMENTARY", reviewerOnly: true,
    meta: {
      allowedEvaluatorRoles: ["TL"],
      questionItems: [longQ("fr-tl", "Final Remarks (Team Lead)")],
    },
  },
  {
    code: "FR-HR", label: "Final Remarks — HR",
    description: "",
    weight: 0, phase: "REVIEWER", order: 16, maxPoints: 0, kind: "SUPPLEMENTARY", reviewerOnly: true,
    meta: {
      allowedEvaluatorRoles: ["HR"],
      questionItems: [longQ("fr-hr", "Final Remarks (HR)")],
    },
  },
];

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "ams.criteria.manage");

  const orgId = session!.user.orgId!;

  await db.appraisalCriterion.deleteMany({ where: { orgId } });

  const allCriteria = [...SELF_CRITERIA, ...REVIEWER_CRITERIA];
  for (const criterion of allCriteria) {
    await db.appraisalCriterion.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { orgId, ...(criterion as any) },
    });
  }

  invalidateReviewerCriteria(orgId);
  return ok({ seeded: allCriteria.length });
}
