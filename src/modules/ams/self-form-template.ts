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
    minValue: typeof raw.minValue === "number" && Number.isFinite(raw.minValue) ? raw.minValue : undefined,
    maxValue: typeof raw.maxValue === "number" && Number.isFinite(raw.maxValue) ? raw.maxValue : undefined,
    startLabel: typeof raw.startLabel === "string" ? raw.startLabel : undefined,
    endLabel: typeof raw.endLabel === "string" ? raw.endLabel : undefined,
  };
}

function resolveCriterionQuestions(criterion: CriterionPoint): AppraisalQuestionDefinition[] {
  const meta = criterion.meta && typeof criterion.meta === "object"
    ? criterion.meta as Record<string, unknown>
    : null;

  const mapLegacyQuestion = (question: Record<string, unknown>, fallbackIndex: number): AppraisalQuestionDefinition | null => {
    const prompt = typeof question.prompt === "string" ? question.prompt.trim() : "";
    if (!prompt) return null;

    const questionType = typeof question.questionType === "string" ? question.questionType : "short_answer";
    const questionId = typeof question.id === "string" && question.id.trim()
      ? question.id
      : `question-${fallbackIndex + 1}`;

    switch (questionType) {
      case "paragraph":
        return { id: questionId, prompt, type: "textarea" };
      case "multiple_choice":
      case "dropdown":
        return {
          id: questionId,
          prompt,
          type: "radio",
          options: normalizeOptions(question.options),
        };
      case "checkboxes":
        return {
          id: questionId,
          prompt,
          type: "radio",
          options: normalizeOptions(question.options),
          allowExplanation: true,
        };
      case "slider":
      case "linear_scale":
      case "rating": {
        const responseConfig = question.responseConfig && typeof question.responseConfig === "object"
          ? question.responseConfig as Record<string, unknown>
          : null;
        const increment = typeof responseConfig?.increment === "number" && Number.isFinite(responseConfig.increment)
          ? Math.max(2, Math.round(responseConfig.increment))
          : 5;
        return {
          id: questionId,
          prompt,
          type: "number",
          minValue: 1,
          maxValue: increment,
          startLabel: typeof responseConfig?.startLabel === "string" ? responseConfig.startLabel : undefined,
          endLabel: typeof responseConfig?.endLabel === "string" ? responseConfig.endLabel : undefined,
        };
      }
      case "date":
        return { id: questionId, prompt, type: "text", placeholder: "DD/MM/YYYY" };
      case "time":
        return { id: questionId, prompt, type: "text", placeholder: "HH:MM" };
      case "short_answer":
      default:
        return { id: questionId, prompt, type: "text" };
    }
  };

  const stored = Array.isArray(meta?.questionItems)
    ? meta.questionItems
        .map((question, index) => {
          if (!question || typeof question !== "object") return null;
          const normalized = normalizeQuestion(question, index);
          if (normalized) return normalized;
          return mapLegacyQuestion(question as Record<string, unknown>, index);
        })
        .filter((question): question is AppraisalQuestionDefinition => question !== null)
    : [];

  if (stored.length > 0) return stored;

  if (criterion.questions.length > 0) {
    return criterion.questions.flatMap((prompt, index) => {
      if (!prompt.trim()) return [];
      return [{
        id: `question-${index + 1}`,
        prompt: prompt.trim(),
        type: "textarea" as const,
      }];
    });
  }

  return [{ id: "response", prompt: `Describe your performance in ${criterion.label}.`, type: "textarea" as const }];
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
  };
}

export function resolveSelfFormTemplate(
  criteria: CriterionPoint[],
  template?: AppraisalSelfFormTemplate | null,
): AppraisalSelfFormTemplate {
  const base = template ?? buildDefaultSelfFormTemplate();

  if (criteria.length === 0) {
    return { ...base, partASections: [] };
  }

  const partASections: AppraisalSectionDefinition[] = criteria.map((criterion) => ({
    id: `part-a-${criterion.code || criterion.id}`,
    title: criterion.label,
    description: criterion.description || undefined,
    questions: resolveCriterionQuestions(criterion),
  }));

  return { ...base, partASections };
}
