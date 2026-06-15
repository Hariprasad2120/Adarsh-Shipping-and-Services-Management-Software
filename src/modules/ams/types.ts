import type { AppraisalQuestionDefinition, EvaluatorRole } from "@/modules/ams/criteria-config";

export type SupplementaryMeta = Record<string, unknown> | null;

export type CriterionSubItem = {
  id: string;
  code: string;
  label: string;
  weight: number;
};

export type CriterionPoint = {
  id: string;
  code: string;
  label: string;
  description: string;
  weightage: number;
  maxPoints: number;
  kind: string;
  reviewerOnly: boolean;
  allowedRoles: EvaluatorRole[];
  items: CriterionSubItem[];
  questions: string[];
  questionItems: AppraisalQuestionDefinition[];
  meta: SupplementaryMeta;
};
