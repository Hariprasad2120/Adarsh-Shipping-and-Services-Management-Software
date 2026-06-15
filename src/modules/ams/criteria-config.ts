export type EvaluatorRole = "MANAGEMENT" | "MANAGER" | "TL" | "HR";
export type AppraisalFormPhase = "SELF" | "REVIEWER" | "MANAGEMENT";
export type SubmissionStatus = "DRAFT" | "SUBMITTED";

export type GradeInfo = {
  grade: string;
  label: string;
  minNormalized: number;
  maxNormalized: number;
};

export type AppraisalQuestionOption = {
  value: string;
  label: string;
};

export type AppraisalQuestionDefinition = {
  id: string;
  prompt: string;
  type: "text" | "textarea" | "radio" | "number";
  options?: AppraisalQuestionOption[];
  allowExplanation?: boolean;
  placeholder?: string;
  minValue?: number;
  maxValue?: number;
  startLabel?: string;
  endLabel?: string;
};

export type AppraisalSectionDefinition = {
  id: string;
  title: string;
  description?: string;
  questions: AppraisalQuestionDefinition[];
};

export type EmployeeInfoFieldDefinition = {
  id: string;
  label: string;
  type: "text" | "date" | "radio";
  options?: AppraisalQuestionOption[];
  placeholder?: string;
  showWhen?: {
    fieldId: string;
    equals: string;
  };
};

export type SelfRatingCopy = {
  title: string;
  description?: string;
};

export type FeedbackQuestionDefinition = AppraisalQuestionDefinition;

export type AppraisalSelfFormTemplate = {
  employeeInfoFields: EmployeeInfoFieldDefinition[];
  partASections: AppraisalSectionDefinition[];
  selfRating: SelfRatingCopy;
};

export type ReviewerCriterionSeed = {
  code: string;
  title: string;
  weightage: number;
  description: string;
  allowedEvaluatorRoles: EvaluatorRole[];
  subCriteria: string[];
};

export type SelfRatingCriterionSeed = {
  code: string;
  title: string;
  weightage: number;
};

export type QuestionResponse = {
  value?: string;
  option?: string;
  explanation?: string;
};

export type SelfAssessmentAnswers = {
  version: "v2";
  employeeInfo: Record<string, string>;
  responses: Record<string, QuestionResponse>;
  categoryPoints: Record<string, number>;
  feedback: string;
};

export type ReviewerRatingAnswers = {
  version: "v2";
  categoryPoints: Record<string, number>;
  subItemRatings: Record<string, Record<string, number>>;
  responses?: Record<string, Record<string, QuestionResponse>>;
  comments: Record<string, string>;
  previousCategoryPoints?: Record<string, number>;
  previousSubItemRatings?: Record<string, Record<string, number>>;
  changeReasons?: Record<string, string>;
};

export type ManagementReviewAnswers = ReviewerRatingAnswers;

export type AppraisalCriterionRecord = {
  id: string;
  code: string | null;
  label: string;
  description: string | null;
  weight: number;
  maxPoints: number;
  kind: string;
  reviewerOnly: boolean;
  meta: Record<string, unknown> | null;
  children: {
    id: string;
    code: string | null;
    label: string;
    weight: number;
    order: number;
  }[];
};

export const REVIEWER_CRITERIA_SEED: ReviewerCriterionSeed[] = [
  {
    code: "core-performance-efficiency",
    title: "Core Performance & Efficiency",
    weightage: 25,
    description: "Quality, speed, and accuracy of work execution.",
    allowedEvaluatorRoles: ["MANAGEMENT", "MANAGER", "TL"],
    subCriteria: ["Quality", "Speed", "Accuracy"],
  },
  {
    code: "accountability-attendance",
    title: "Accountability & Attendance",
    weightage: 10,
    description: "Punctuality, reliability, and adherence to schedules.",
    allowedEvaluatorRoles: ["MANAGER", "TL", "HR"],
    subCriteria: ["Punctuality", "Reliability", "Adherence"],
  },
  {
    code: "collaboration-leadership",
    title: "Collaboration & Leadership",
    weightage: 15,
    description: "Teamwork, leadership abilities, and conflict resolution.",
    allowedEvaluatorRoles: ["MANAGEMENT", "MANAGER", "TL", "HR"],
    subCriteria: ["Teamwork", "Leadership abilities", "Conflict Resolution"],
  },
  {
    code: "client-stakeholder-satisfaction",
    title: "Client & Stakeholder Satisfaction",
    weightage: 15,
    description: "Responsiveness, relationship management, and feedback.",
    allowedEvaluatorRoles: ["MANAGEMENT", "MANAGER", "TL"],
    subCriteria: ["Responsiveness", "Relationship Management", "Feedback"],
  },
  {
    code: "compliance-risk-management",
    title: "Compliance & Risk Management",
    weightage: 10,
    description: "Adherence to policies, risk mitigation, and ethical conduct.",
    allowedEvaluatorRoles: ["MANAGEMENT", "MANAGER", "TL", "HR"],
    subCriteria: ["Adherence to policies", "Risk Mitigation", "Ethical Conduct"],
  },
  {
    code: "problem-solving-crisis-management",
    title: "Problem-Solving & Crisis Management",
    weightage: 15,
    description: "Decision-making, problem resolution, and crisis handling.",
    allowedEvaluatorRoles: ["MANAGEMENT", "MANAGER", "TL"],
    subCriteria: ["Decision-Making", "Problem Resolution", "Crisis Handling"],
  },
  {
    code: "organizational-contribution-engagement",
    title: "Organizational Contribution & Engagement",
    weightage: 10,
    description: "Initiative, participation in company activities, and alignment with goals.",
    allowedEvaluatorRoles: ["MANAGER", "TL", "HR"],
    subCriteria: ["Initiative", "Participation", "Alignment with goals"],
  },
  {
    code: "professionalism-communication",
    title: "Professionalism & Communication",
    weightage: 10,
    description: "Clarity, respect, responsiveness, and effective communication.",
    allowedEvaluatorRoles: ["MANAGEMENT", "MANAGER", "TL", "HR"],
    subCriteria: ["Clarity", "Respect", "Responsiveness", "Effectiveness communication"],
  },
  {
    code: "innovation-continuous-improvement",
    title: "Innovation & Continuous Improvement",
    weightage: 10,
    description: "Creativity, process improvements, and implementation of new ideas.",
    allowedEvaluatorRoles: ["MANAGEMENT", "MANAGER", "TL", "HR"],
    subCriteria: ["Creativity", "Process Improvements", "Implementation of new Ideas"],
  },
  {
    code: "adaptability-learning",
    title: "Adaptability & Learning",
    weightage: 10,
    description: "Willingness to learn, flexibility, and responsiveness to change.",
    allowedEvaluatorRoles: ["MANAGEMENT", "MANAGER", "TL", "HR"],
    subCriteria: ["Willingness to learn", "Flexibility", "Responsiveness to change"],
  },
  {
    code: "work-ethic-attitude",
    title: "Work Ethic & Attitude",
    weightage: 10,
    description: "Dedication, integrity, enthusiasm, and workplace behaviour.",
    allowedEvaluatorRoles: ["MANAGEMENT", "MANAGER", "TL", "HR"],
    subCriteria: ["Dedication", "Integrity", "Enthusiasm", "Workplace Behaviour"],
  },
  {
    code: "results-goal-achievement",
    title: "Results & Goal Achievement",
    weightage: 20,
    description: "Target completion, measurable impact, and overall contribution.",
    allowedEvaluatorRoles: ["MANAGEMENT", "MANAGER", "TL"],
    subCriteria: ["Target Completion", "Measurable Impact", "Overall Contribution"],
  },
];

export const SELF_RATING_CRITERIA_SEED: SelfRatingCriterionSeed[] = [
  { code: "core-performance-efficiency", title: "Core Performance & Efficiency", weightage: 25 },
  { code: "accountability-attendance", title: "Accountability & Attendance", weightage: 10 },
  { code: "collaboration-leadership", title: "Collaboration & Leadership", weightage: 15 },
  { code: "client-stakeholder-satisfaction", title: "Client & Stakeholder Satisfaction", weightage: 15 },
  { code: "compliance-risk-management", title: "Compliance & Risk Management", weightage: 10 },
  { code: "problem-solving-crisis-management", title: "Problem-Solving & Crisis Management", weightage: 15 },
  { code: "organizational-contribution-engagement", title: "Organizational Contribution & Engagement", weightage: 10 },
  { code: "professionalism-communication", title: "Professionalism & Communication", weightage: 10 },
  { code: "innovation-continuous-improvement", title: "Innovation & Continuous Improvement", weightage: 10 },
  { code: "adaptability-learning", title: "Adaptability & Learning", weightage: 10 },
];

export const EMPLOYEE_INFO_FIELDS: EmployeeInfoFieldDefinition[] = [
  { id: "name", label: "Name", type: "text" },
  { id: "department", label: "Department", type: "text" },
  { id: "position", label: "Position", type: "text" },
  { id: "previous-appraisal-date", label: "Date of Previous Appraisal Meeting", type: "date" },
  { id: "years-of-association", label: "Years of Association", type: "text" },
  {
    id: "has-break-up-period",
    label: "Do you have any break-up period with this organization?",
    type: "radio",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "break-up-reason",
    label: "If yes, reason",
    type: "text",
    showWhen: { fieldId: "has-break-up-period", equals: "yes" },
  },
];

export const SELF_ASSESSMENT_PART_A_SECTIONS: AppraisalSectionDefinition[] = [
  {
    id: "part-a-core-performance-efficiency",
    title: "Core Performance & Efficiency",
    questions: [
      { id: "accomplishments", prompt: "List three major accomplishments in your role over the last appraisal period.", type: "textarea" },
      { id: "met-targets", prompt: "Have you consistently met your targets? If not, what were the challenges?", type: "textarea" },
      { id: "accuracy-quality", prompt: "How do you ensure the accuracy and quality of your work?", type: "textarea" },
    ],
  },
  {
    id: "part-a-accountability-attendance",
    title: "Accountability & Attendance",
    questions: [
      { id: "unplanned-leaves", prompt: "How often have you taken unplanned leaves in the past 6 months?", type: "textarea" },
      { id: "tight-deadlines", prompt: "How do you manage workload when faced with tight deadlines?", type: "textarea" },
      { id: "ownership-example", prompt: "Give an example of when you took complete ownership of a critical task.", type: "textarea" },
    ],
  },
  {
    id: "part-a-collaboration-leadership",
    title: "Collaboration & Leadership",
    questions: [
      { id: "team-goal", prompt: "Describe a situation where you successfully worked with a team to achieve a goal.", type: "textarea" },
      { id: "mentoring-impact", prompt: "Have you mentored or helped a colleague? How did it impact them?", type: "textarea" },
      { id: "workplace-conflicts", prompt: "How do you handle workplace conflicts?", type: "textarea" },
    ],
  },
  {
    id: "part-a-client-stakeholder-satisfaction",
    title: "Client & Stakeholder Satisfaction",
    questions: [
      { id: "difficult-clients", prompt: "Have you handled any difficult clients? How did you resolve the situation?", type: "textarea" },
      { id: "client-satisfaction-steps", prompt: "What steps do you take to ensure client satisfaction in your role?", type: "textarea" },
    ],
  },
  {
    id: "part-a-compliance-risk-management",
    title: "Compliance & Risk Management",
    questions: [
      { id: "identified-risk", prompt: "Have you ever identified a risk in your department? How did you handle it?", type: "textarea" },
      { id: "policy-adherence", prompt: "How do you ensure adherence to company policies in your daily work?", type: "textarea" },
    ],
  },
  {
    id: "part-a-problem-solving-crisis-management",
    title: "Problem-Solving & Crisis Management",
    questions: [
      { id: "quick-decision", prompt: "Describe a time when you had to make a quick decision under pressure.", type: "textarea" },
      { id: "unexpected-challenges", prompt: "What is your approach to solving unexpected challenges?", type: "textarea" },
    ],
  },
  {
    id: "part-a-organizational-contribution-engagement",
    title: "Organizational Contribution & Engagement",
    questions: [
      { id: "company-activities", prompt: "Apart from your core responsibilities, how have you contributed to company activities?", type: "textarea" },
      { id: "additional-responsibilities", prompt: "Are you willing to take on additional responsibilities if needed?", type: "textarea" },
    ],
  },
  {
    id: "part-a-professionalism-communication",
    title: "Professionalism & Communication",
    questions: [
      { id: "effective-communication", prompt: "How do you ensure effective communication with your team and managers?", type: "textarea" },
      { id: "handle-feedback", prompt: "How do you handle feedback from seniors and colleagues?", type: "textarea" },
    ],
  },
  {
    id: "part-a-innovation-continuous-improvement",
    title: "Innovation & Continuous Improvement",
    questions: [
      { id: "department-improvements", prompt: "Have you suggested or implemented any improvements in your department?", type: "textarea" },
      { id: "last-skill-learned", prompt: "What was the last skill or knowledge area you proactively learned?", type: "textarea" },
    ],
  },
  {
    id: "part-a-adaptability-learning",
    title: "Adaptability & Learning",
    questions: [
      { id: "adapted-to-change", prompt: "Have you worked in a situation where you had to quickly adapt to changes? How did you manage?", type: "textarea" },
      { id: "industry-trends", prompt: "How do you stay updated with industry trends and new developments?", type: "textarea" },
    ],
  },
];

export const FEEDBACK_QUESTION: AppraisalQuestionDefinition = {
  id: "final-feedback",
  prompt: "Feedback",
  type: "textarea",
};

export const DEFAULT_SELF_RATING_COPY: SelfRatingCopy = {
  title: "Employee Self Rating",
  description: "Rate yourself on a scale from 1 to 5.",
};

export function buildDefaultSelfFormTemplate(): AppraisalSelfFormTemplate {
  return {
    employeeInfoFields: structuredClone(EMPLOYEE_INFO_FIELDS),
    partASections: structuredClone(SELF_ASSESSMENT_PART_A_SECTIONS),
    selfRating: structuredClone(DEFAULT_SELF_RATING_COPY),
  };
}

export const GRADE_BANDS: GradeInfo[] = [
  { grade: "A+", label: "Outstanding", minNormalized: 91, maxNormalized: 100 },
  { grade: "A", label: "Excellent", minNormalized: 81, maxNormalized: 90 },
  { grade: "B+", label: "Good", minNormalized: 71, maxNormalized: 80 },
  { grade: "B", label: "Satisfactory", minNormalized: 66, maxNormalized: 70 },
  { grade: "C+", label: "Average", minNormalized: 61, maxNormalized: 65 },
  { grade: "C", label: "Below Average", minNormalized: 51, maxNormalized: 60 },
  { grade: "D", label: "Poor", minNormalized: 0, maxNormalized: 50 },
];

export const HIKE_TABLE: Record<string, { upto15k: number; upto30k: number; above30k: number }> = {
  "A+": { upto15k: 50, upto30k: 30, above30k: 25 },
  "A": { upto15k: 40, upto30k: 25, above30k: 20 },
  "B+": { upto15k: 25, upto30k: 20, above30k: 15 },
  "B": { upto15k: 20, upto30k: 15, above30k: 5 },
  "C+": { upto15k: 10, upto30k: 5, above30k: 0 },
  "C": { upto15k: 5, upto30k: 0, above30k: 0 },
  "D": { upto15k: 0, upto30k: 0, above30k: 0 },
};

export function normalizeScore(raw: number, maxPoints: number): number {
  if (maxPoints === 0) return 0;
  return (raw / maxPoints) * 100;
}

export function getGrade(normalizedScore: number): GradeInfo {
  const floored = Math.floor(normalizedScore);
  return GRADE_BANDS.find((band) => floored >= band.minNormalized && floored <= band.maxNormalized)
    ?? GRADE_BANDS[GRADE_BANDS.length - 1];
}

export function getSalaryTier(monthlyGross: number): "upto15k" | "upto30k" | "above30k" {
  if (monthlyGross <= 15000) return "upto15k";
  if (monthlyGross <= 30000) return "upto30k";
  return "above30k";
}

export function getHikePercent(grade: string, monthlyGross: number): number {
  const row = HIKE_TABLE[grade];
  if (!row) return 0;
  return row[getSalaryTier(monthlyGross)];
}

export function getAllowedRoles(record: AppraisalCriterionRecord): EvaluatorRole[] {
  const allowed = record.meta?.allowedEvaluatorRoles;
  if (!Array.isArray(allowed)) return [];
  return allowed.filter((value): value is EvaluatorRole =>
    value === "MANAGEMENT" || value === "MANAGER" || value === "TL" || value === "HR"
  );
}

export function canRateCriteria(userRole: EvaluatorRole, criterion: AppraisalCriterionRecord): boolean {
  return getAllowedRoles(criterion).includes(userRole);
}

export function getVisibleCriteriaForRole(userRole: EvaluatorRole, allCriteria: AppraisalCriterionRecord[]) {
  return allCriteria.filter((criterion) => canRateCriteria(userRole, criterion));
}

export function getVisibleFormForUser(userRole: EvaluatorRole | "EMPLOYEE") {
  if (userRole === "EMPLOYEE") return "SELF_ASSESSMENT";
  if (["MANAGEMENT", "MANAGER", "TL", "HR"].includes(userRole)) return "REVIEWER_RATING";
  return "NO_ACCESS";
}

export function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(5, Math.max(1, Math.round(value)));
}

export function buildQuestionKey(sectionId: string, questionId: string): string {
  return `${sectionId}.${questionId}`;
}

export function isSubmittedStatus(status?: string | null): status is "SUBMITTED" {
  return status === "SUBMITTED";
}
