import {
  buildDefaultSelfFormTemplate,
  type AppraisalSelfFormTemplate,
  type AppraisalQuestionDefinition,
  type AppraisalSectionDefinition,
  type EmployeeInfoFieldDefinition,
} from "./criteria-config";
import type { CriterionPoint } from "./types";

function normalizeOptions(options: unknown) {
  if (!Array.isArray(options)) return undefined;
  const normalized = options
    .map((option) => {
      if (!option || typeof option !== "object") return null;
      const value = "value" in option && typeof option.value === "string" ? option.value : null;
      const label = "label" in option && typeof option.label === "string" ? option.label : null;
      if (!value || !label) return null;
      return { value, label };
    })
    .filter((option): option is { value: string; label: string } => option !== null);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeQuestion(question: unknown, fallbackIndex: number): AppraisalQuestionDefinition | null {
  if (!question || typeof question !== "object") return null;
  const raw = question as Record<string, unknown>;
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id : `question-${fallbackIndex + 1}`;
  const prompt = typeof raw.prompt === "string" ? raw.prompt : "";
  const type = raw.type;
  if (!["text", "textarea", "radio", "number"].includes(String(type)) || !prompt.trim()) return null;

  return {
    id,
    prompt,
    type: type as AppraisalQuestionDefinition["type"],
    options: normalizeOptions(raw.options),
    allowExplanation: raw.allowExplanation === true,
    placeholder: typeof raw.placeholder === "string" ? raw.placeholder : undefined,
  };
}

function normalizeSection(section: unknown, fallbackId: string): AppraisalSectionDefinition | null {
  if (!section || typeof section !== "object") return null;
  const raw = section as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title : "";
  if (!title.trim()) return null;

  const questions = Array.isArray(raw.questions)
    ? raw.questions
        .map((question, index) => normalizeQuestion(question, index))
        .filter((question): question is AppraisalQuestionDefinition => question !== null)
    : [];

  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : fallbackId,
    title,
    description: typeof raw.description === "string" ? raw.description : undefined,
    questions,
  };
}

function normalizeEmployeeField(field: unknown, fallbackIndex: number): EmployeeInfoFieldDefinition | null {
  if (!field || typeof field !== "object") return null;
  const raw = field as Record<string, unknown>;
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id : `field-${fallbackIndex + 1}`;
  const label = typeof raw.label === "string" ? raw.label : "";
  const type = raw.type;
  if (!["text", "date", "radio"].includes(String(type)) || !label.trim()) return null;

  const showWhen = raw.showWhen && typeof raw.showWhen === "object"
    ? (() => {
        const candidate = raw.showWhen as Record<string, unknown>;
        return typeof candidate.fieldId === "string" && typeof candidate.equals === "string"
          ? { fieldId: candidate.fieldId, equals: candidate.equals }
          : undefined;
      })()
    : undefined;

  return {
    id,
    label,
    type: type as EmployeeInfoFieldDefinition["type"],
    options: normalizeOptions(raw.options),
    placeholder: typeof raw.placeholder === "string" ? raw.placeholder : undefined,
    showWhen,
  };
}

export function normalizeSelfFormTemplate(content: unknown): AppraisalSelfFormTemplate {
  const fallback = buildDefaultSelfFormTemplate();
  if (!content || typeof content !== "object") return fallback;
  const raw = content as Record<string, unknown>;

  const employeeInfoFields = Array.isArray(raw.employeeInfoFields)
    ? raw.employeeInfoFields
        .map((field, index) => normalizeEmployeeField(field, index))
        .filter((field): field is EmployeeInfoFieldDefinition => field !== null)
    : fallback.employeeInfoFields;

  const partASections = Array.isArray(raw.partASections)
    ? raw.partASections
        .map((section, index) => normalizeSection(section, `part-a-${index + 1}`))
        .filter((section): section is AppraisalSectionDefinition => section !== null)
    : fallback.partASections;

  const careerGrowthSection = normalizeSection(raw.careerGrowthSection, fallback.careerGrowthSection.id) ?? fallback.careerGrowthSection;
  const decisionMakingSection = normalizeSection(raw.decisionMakingSection, fallback.decisionMakingSection.id) ?? fallback.decisionMakingSection;
  const retentionSection = normalizeSection(raw.retentionSection, fallback.retentionSection.id) ?? fallback.retentionSection;
  const compensationSection = normalizeSection(raw.compensationSection, fallback.compensationSection.id) ?? fallback.compensationSection;
  const feedbackQuestion = normalizeQuestion(raw.feedbackQuestion, 0) ?? fallback.feedbackQuestion;

  const selfRating = raw.selfRating && typeof raw.selfRating === "object"
    ? {
        title: typeof (raw.selfRating as Record<string, unknown>).title === "string"
          ? (raw.selfRating as Record<string, unknown>).title as string
          : fallback.selfRating.title,
        description: typeof (raw.selfRating as Record<string, unknown>).description === "string"
          ? (raw.selfRating as Record<string, unknown>).description as string
          : fallback.selfRating.description,
      }
    : fallback.selfRating;

  return {
    employeeInfoFields: employeeInfoFields.length > 0 ? employeeInfoFields : fallback.employeeInfoFields,
    partASections: partASections.length > 0 ? partASections : fallback.partASections,
    selfRating,
    careerGrowthSection,
    decisionMakingSection,
    retentionSection,
    compensationSection,
    feedbackQuestion,
  };
}

export function resolveSelfFormTemplate(
  criteria: CriterionPoint[],
  template?: AppraisalSelfFormTemplate | null,
): AppraisalSelfFormTemplate {
  const base = template ?? buildDefaultSelfFormTemplate();

  const criteriaWithQuestions = criteria.filter((c) => c.questionItems.length > 0);
  if (criteriaWithQuestions.length === 0) return base;

  const partASections: AppraisalSectionDefinition[] = criteriaWithQuestions.map((criterion) => ({
    id: `part-a-${criterion.code || criterion.id}`,
    title: criterion.label,
    description: criterion.description || undefined,
    questions: criterion.questionItems as AppraisalQuestionDefinition[],
  }));

  return {
    ...base,
    partASections,
    careerGrowthSection: { ...base.careerGrowthSection, questions: [] },
    decisionMakingSection: { ...base.decisionMakingSection, questions: [] },
    retentionSection: { ...base.retentionSection, questions: [] },
    compensationSection: { ...base.compensationSection, questions: [] },
    feedbackQuestion: { ...base.feedbackQuestion, prompt: "" },
  };
}
