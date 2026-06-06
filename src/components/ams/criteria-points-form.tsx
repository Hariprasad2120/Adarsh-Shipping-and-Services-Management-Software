"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DemoFillButton } from "@/components/demo-fill-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildReviewerDemoAnswers,
  buildSelfAssessmentDemoAnswers,
  demoPerformanceProfiles,
  type DemoPerformanceProfile,
} from "@/lib/demo-fill";
import { cn } from "@/lib/utils";
import {
  buildQuestionKey,
  buildDefaultSelfFormTemplate,
  clampRating,
  type AppraisalSelfFormTemplate,
  type QuestionResponse,
  type AppraisalQuestionDefinition,
  type AppraisalSectionDefinition,
  type ManagementReviewAnswers,
  type ReviewerRatingAnswers,
  type SelfAssessmentAnswers,
} from "@/modules/ams/criteria-config";
import type { CriterionPoint } from "@/modules/ams/types";

function emptySelfAnswers(): SelfAssessmentAnswers {
  return {
    version: "v2",
    employeeInfo: {},
    responses: {},
    categoryPoints: {},
    feedback: "",
  };
}

function emptyReviewerAnswers(): ReviewerRatingAnswers {
  return {
    version: "v2",
    categoryPoints: {},
    subItemRatings: {},
    comments: {},
  };
}

function normalizeSelfAnswers(initialAnswers?: SelfAssessmentAnswers | null): SelfAssessmentAnswers {
  return {
    ...emptySelfAnswers(),
    ...(initialAnswers ?? {}),
    employeeInfo: { ...(initialAnswers?.employeeInfo ?? {}) },
    responses: { ...(initialAnswers?.responses ?? {}) },
    categoryPoints: { ...(initialAnswers?.categoryPoints ?? {}) },
    feedback: initialAnswers?.feedback ?? "",
  };
}

function normalizeReviewerAnswers(initialAnswers?: ReviewerRatingAnswers | ManagementReviewAnswers | null): ReviewerRatingAnswers {
  return {
    ...emptyReviewerAnswers(),
    ...(initialAnswers ?? {}),
    categoryPoints: { ...(initialAnswers?.categoryPoints ?? {}) },
    subItemRatings: { ...(initialAnswers?.subItemRatings ?? {}) },
    comments: { ...(initialAnswers?.comments ?? {}) },
  };
}

function computeCriterionAverage(subItemRatings: Record<string, number>): number {
  const values = Object.values(subItemRatings).filter((value) => Number.isFinite(value));
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + clampRating(value), 0);
  return Math.round((total / values.length) * 10) / 10;
}

function hasText(value?: string) {
  return Boolean(value?.trim());
}

function isQuestionAnswered(question: AppraisalQuestionDefinition, value?: QuestionResponse): boolean {
  if (question.type === "radio") {
    if (!value?.option) return false;
    if (question.allowExplanation) return hasText(value.explanation);
    return true;
  }

  return hasText(value?.value);
}

export function RatingInput({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: number | "";
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <Input
      id={id}
      type="number"
      min={1}
      max={5}
      step={1}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(clampRating(Number(event.target.value)))}
      className="w-20 text-center font-semibold text-slate-900"
    />
  );
}

export function TextAnswerInput({
  label,
  value,
  onChange,
  disabled,
  multiline = true,
  placeholder,
  invalid = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  multiline?: boolean;
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {multiline ? (
        <textarea
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          placeholder={placeholder ?? "Type your answer"}
          className={cn(
            "min-h-28 w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 disabled:bg-slate-50",
            invalid
              ? "border-red-400 bg-red-50/60 focus:border-red-500 focus:ring-red-100"
              : "border-slate-200 focus:border-slate-400 focus:ring-slate-200",
          )}
        />
      ) : (
        <Input
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? "Type your answer"}
          className={cn(
            invalid && "border-red-400 bg-red-50/60 focus-visible:ring-red-100",
          )}
        />
      )}
    </div>
  );
}

export function OptionQuestionInput({
  question,
  value,
  onChange,
  disabled,
  invalid = false,
}: {
  question: AppraisalQuestionDefinition;
  value: QuestionResponse;
  onChange: (value: QuestionResponse) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-slate-700">{question.prompt}</Label>
      <div className="space-y-2">
        {(question.options ?? []).map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition",
              value.option === option.value
                ? "border-slate-500 bg-slate-50 text-slate-950"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
              invalid && !value.option && "border-red-400 bg-red-50/60",
              disabled && "cursor-not-allowed opacity-70",
            )}
          >
            <input
              type="radio"
              disabled={disabled}
              checked={value.option === option.value}
              onChange={() => onChange({ ...value, option: option.value, value: option.label })}
              className="mt-0.5 accent-slate-700"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {question.allowExplanation ? (
        <TextAnswerInput
          label="Explanation"
          value={value.explanation ?? ""}
          onChange={(explanation) => onChange({ ...value, explanation })}
          disabled={disabled}
          invalid={invalid && !hasText(value.explanation)}
        />
      ) : null}
    </div>
  );
}

export function ReviewerCommentBox({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <textarea
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      rows={3}
      placeholder="Add evaluator comments"
      className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
    />
  );
}

export function CriteriaRatingTable({
  criteria,
  ratings,
  onChange,
  disabled,
}: {
  criteria: CriterionPoint[];
  ratings: Record<string, number>;
  onChange?: (criterionId: string, value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Competency</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Weightage</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Self Rating (1-5)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {criteria.map((criterion) => (
            <tr key={criterion.id}>
              <td className="px-4 py-3 text-slate-900">{criterion.label}</td>
              <td className="px-4 py-3 text-slate-600">{criterion.weightage}</td>
              <td className="px-4 py-3">
                {onChange ? (
                  <RatingInput
                    id={`self-rating-${criterion.id}`}
                    value={ratings[criterion.id] ?? ""}
                    disabled={disabled}
                    onChange={(value) => onChange(criterion.id, value)}
                  />
                ) : (
                  <span className="font-medium text-slate-900">{ratings[criterion.id] ?? "-"}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SelfAssessmentSection({
  section,
  responses,
  onChange,
  disabled,
  criterion,
  rating,
  onRatingChange,
  missingFieldIds = new Set<string>(),
}: {
  section: AppraisalSectionDefinition;
  responses: Record<string, QuestionResponse>;
  onChange: (key: string, value: QuestionResponse) => void;
  disabled?: boolean;
  criterion?: CriterionPoint;
  rating?: number;
  onRatingChange?: (value: number) => void;
  missingFieldIds?: Set<string>;
}) {
  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-900">{section.title}</h3>
          {section.description ? <p className="text-sm text-slate-500">{section.description}</p> : null}
        </div>

        {section.questions.map((question) => {
          const questionKey = buildQuestionKey(section.id, question.id);
          const value = responses[questionKey] ?? {};
          const invalid = missingFieldIds.has(questionKey);

          return (
            <div
              key={questionKey}
              data-field-id={questionKey}
              className={cn(
                "rounded-2xl border p-4 transition",
                invalid ? "border-red-400 bg-red-50/70" : "border-slate-200 bg-white",
              )}
            >
              {question.type === "radio" ? (
                <OptionQuestionInput
                  question={question}
                  value={value}
                  onChange={(nextValue) => onChange(questionKey, nextValue)}
                  disabled={disabled}
                  invalid={invalid}
                />
              ) : (
                <TextAnswerInput
                  label={question.prompt}
                  value={value.value ?? ""}
                  onChange={(nextValue) => onChange(questionKey, { ...value, value: nextValue })}
                  disabled={disabled}
                  multiline={question.type !== "text" && question.type !== "number"}
                  placeholder={question.placeholder}
                  invalid={invalid}
                />
              )}
            </div>
          );
        })}

        {criterion && onRatingChange ? (
          <div
            data-field-id={`rating:${criterion.id}`}
            className={cn(
              "rounded-2xl border px-4 py-4 transition",
              missingFieldIds.has(`rating:${criterion.id}`)
                ? "border-red-400 bg-red-50/70"
                : "border-slate-200 bg-slate-50/70",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Self Rating</p>
                <p className="text-xs text-slate-500">
                  Rate your performance for this section on a scale of 1 to 5.
                </p>
              </div>
              <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                {rating ?? "Not rated"}
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={rating ?? 1}
              disabled={disabled}
              onChange={(event) => onRatingChange(clampRating(Number(event.target.value)))}
              className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-slate-900 disabled:cursor-not-allowed"
            />
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ReviewerCriteriaSection({
  criterion,
  value,
  onChange,
  disabled,
}: {
  criterion: CriterionPoint;
  value: {
    categoryScore: number;
    subItemRatings: Record<string, number>;
    comment: string;
  };
  onChange: (nextValue: { categoryScore: number; subItemRatings: Record<string, number>; comment: string }) => void;
  disabled?: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">{criterion.label}</h3>
              <Badge variant="secondary">{criterion.weightage}%</Badge>
            </div>
            <p className="text-sm text-slate-500">{criterion.description}</p>
          </div>
          <div className="rounded-xl bg-slate-100 px-3 py-2 text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">Overall Rating</p>
            <p className="text-lg font-semibold text-slate-900">{value.categoryScore || "-"}</p>
          </div>
        </div>

        <div className="space-y-3">
          {criterion.items.map((item) => {
            const currentRating = value.subItemRatings[item.id];

            return (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">Rate this sub-criterion on a scale of 1 to 5.</p>
                  </div>
                  <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                    {currentRating ?? "Not rated"}
                  </div>
                </div>
                <input
                  id={`criterion-${criterion.id}-${item.id}`}
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={currentRating ?? 1}
                  disabled={disabled}
                  onChange={(event) => {
                    const nextRating = clampRating(Number(event.target.value));
                    const nextSubItemRatings = { ...value.subItemRatings, [item.id]: nextRating };
                    onChange({
                      ...value,
                      subItemRatings: nextSubItemRatings,
                      categoryScore: computeCriterionAverage(nextSubItemRatings),
                    });
                  }}
                  className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-slate-900 disabled:cursor-not-allowed"
                />
                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">Comments</Label>
          <ReviewerCommentBox
            value={value.comment}
            onChange={(comment) => onChange({ ...value, comment })}
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function FormProgress({
  total,
  completed,
}: {
  total: number;
  completed: number;
}) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">Progress</span>
        <span className="text-slate-500">{completed}/{total}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function SaveDraftButton({
  onClick,
  disabled,
  pending,
}: {
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
}) {
  return (
    <Button type="button" variant="outline" disabled={disabled || pending} onClick={onClick}>
      {pending ? "Saving..." : "Save Draft"}
    </Button>
  );
}

export function SubmitButton({
  onClick,
  disabled,
  pending,
  label = "Submit Final",
}: {
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
  label?: string;
}) {
  return (
    <Button type="button" disabled={disabled || pending} onClick={onClick}>
      {pending ? "Submitting..." : label}
    </Button>
  );
}

export function DynamicAppraisalForm({
  mode,
  criteria,
  initialAnswers,
  onSaveDraft,
  onSubmitFinal,
  disabled,
  selfTemplate,
}: {
  mode: "self" | "reviewer" | "management";
  criteria: CriterionPoint[];
  initialAnswers: SelfAssessmentAnswers | ReviewerRatingAnswers | ManagementReviewAnswers | null | undefined;
  onSaveDraft: (answers: SelfAssessmentAnswers | ReviewerRatingAnswers) => Promise<void> | void;
  onSubmitFinal: (answers: SelfAssessmentAnswers | ReviewerRatingAnswers) => Promise<void> | void;
  disabled?: boolean;
  selfTemplate?: AppraisalSelfFormTemplate;
}) {
  const [isPending, startTransition] = useTransition();
  const resolvedSelfTemplate = useMemo(
    () => selfTemplate ?? buildDefaultSelfFormTemplate(),
    [selfTemplate],
  );
  const allSelfSections = useMemo(
    () => ([
      ...resolvedSelfTemplate.partASections,
      resolvedSelfTemplate.careerGrowthSection,
      resolvedSelfTemplate.decisionMakingSection,
      resolvedSelfTemplate.retentionSection,
      resolvedSelfTemplate.compensationSection,
    ]),
    [resolvedSelfTemplate],
  );
  const partARatingCriteria = useMemo(
    () => criteria.slice(0, resolvedSelfTemplate.partASections.length),
    [criteria, resolvedSelfTemplate.partASections.length],
  );
  const [selfAnswers, setSelfAnswers] = useState(() => normalizeSelfAnswers(mode === "self" ? (initialAnswers as SelfAssessmentAnswers | null | undefined) : null));
  const [reviewerAnswers, setReviewerAnswers] = useState(() => normalizeReviewerAnswers(mode !== "self" ? (initialAnswers as ReviewerRatingAnswers | null | undefined) : null));
  const [missingFieldIds, setMissingFieldIds] = useState<Set<string>>(new Set());
  const [demoProfile, setDemoProfile] = useState<DemoPerformanceProfile>("average");
  const deferredSelf = useDeferredValue(selfAnswers);
  const deferredReviewer = useDeferredValue(reviewerAnswers);

  const questionCount = useMemo(() => {
    if (mode !== "self") {
      return criteria.reduce((count, criterion) => count + criterion.items.length + 1, 0);
    }

    return allSelfSections.reduce((count, section) => count + section.questions.length, 0)
      + partARatingCriteria.length
      + 1;
  }, [allSelfSections, criteria, mode, partARatingCriteria.length]);

  const completedCount = useMemo(() => {
    if (mode !== "self") {
      return criteria.reduce((count, criterion) => {
        const subRatings = deferredReviewer.subItemRatings[criterion.id] ?? {};
        const subCount = criterion.items.filter((item) => Boolean(subRatings[item.id])).length;
        const commentCount = deferredReviewer.comments[criterion.id]?.trim() ? 1 : 0;
        return count + subCount + commentCount;
      }, 0);
    }

    const responseCount = allSelfSections.reduce((count, section) => (
      count
      + section.questions.filter((question) => {
        const questionKey = buildQuestionKey(section.id, question.id);
        return isQuestionAnswered(question, deferredSelf.responses[questionKey]);
      }).length
    ), 0);
    const selfRatingCount = partARatingCriteria.filter((criterion) => Boolean(deferredSelf.categoryPoints[criterion.id])).length;
    const feedbackCount = deferredSelf.feedback.trim() ? 1 : 0;

    return responseCount + selfRatingCount + feedbackCount;
  }, [allSelfSections, criteria, deferredReviewer, deferredSelf, mode, partARatingCriteria]);

  const readOnly = disabled;

  function clearMissingField(fieldId: string) {
    setMissingFieldIds((current) => {
      if (!current.has(fieldId)) return current;
      const next = new Set(current);
      next.delete(fieldId);
      return next;
    });
  }

  function validateSelfAssessment(): string[] {
    const missing: string[] = [];

    for (const section of allSelfSections) {
      for (const question of section.questions) {
        const questionKey = buildQuestionKey(section.id, question.id);
        if (!isQuestionAnswered(question, selfAnswers.responses[questionKey])) {
          missing.push(questionKey);
        }
      }
    }

    for (const criterion of partARatingCriteria) {
      if (!selfAnswers.categoryPoints[criterion.id]) {
        missing.push(`rating:${criterion.id}`);
      }
    }

    if (!selfAnswers.feedback.trim()) {
      missing.push("feedback");
    }

    return missing;
  }

  function focusFirstMissingField(missing: string[]) {
    if (missing.length === 0) return;
    const firstField = document.querySelector<HTMLElement>(`[data-field-id="${CSS.escape(missing[0])}"]`);
    if (!firstField) return;

    firstField.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = firstField.querySelector<HTMLElement>("textarea, input, button");
    focusable?.focus();
  }

  function runAction(action: "draft" | "submit") {
    if (mode === "self" && action === "submit") {
      const missing = validateSelfAssessment();
      if (missing.length > 0) {
        setMissingFieldIds(new Set(missing));
        requestAnimationFrame(() => focusFirstMissingField(missing));
        return;
      }
    }

    startTransition(async () => {
      if (mode === "self") {
        setMissingFieldIds(new Set());
        if (action === "draft") {
          await onSaveDraft(selfAnswers);
        } else {
          await onSubmitFinal(selfAnswers);
        }
        return;
      }

      const normalized: ReviewerRatingAnswers = {
        ...reviewerAnswers,
        categoryPoints: criteria.reduce<Record<string, number>>((acc, criterion) => {
          const subItemRatings = reviewerAnswers.subItemRatings[criterion.id] ?? {};
          const average = computeCriterionAverage(subItemRatings);
          if (average > 0) acc[criterion.id] = average;
          return acc;
        }, {}),
      };

      if (action === "draft") {
        await onSaveDraft(normalized);
      } else {
        await onSubmitFinal(normalized);
      }
    });
  }

  return (
    <div className="space-y-6">
      <FormProgress total={questionCount} completed={completedCount} />

      {mode === "self" ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">Employee Self-Assessment</h2>
              <p className="text-sm text-slate-500">
                Answer every question and rate yourself section by section. You can keep updating the form until the deadline.
              </p>
            </div>
            {!readOnly ? (
              <DemoFillButton
                profiles={demoPerformanceProfiles}
                selectedProfile={demoProfile}
                onProfileChange={setDemoProfile}
                onClick={() => {
                  setMissingFieldIds(new Set());
                  setSelfAnswers(normalizeSelfAnswers(buildSelfAssessmentDemoAnswers(criteria, resolvedSelfTemplate, demoProfile)));
                }}
              />
            ) : null}
          </div>

          {resolvedSelfTemplate.partASections.map((section, index) => {
            const criterion = partARatingCriteria[index];
            return (
              <SelfAssessmentSection
                key={section.id}
                section={section}
                responses={selfAnswers.responses}
                onChange={(key, value) => {
                  clearMissingField(key);
                  setSelfAnswers((current) => ({
                    ...current,
                    responses: { ...current.responses, [key]: value },
                  }));
                }}
                disabled={readOnly}
                criterion={criterion}
                rating={criterion ? selfAnswers.categoryPoints[criterion.id] : undefined}
                onRatingChange={criterion ? ((value) => {
                  clearMissingField(`rating:${criterion.id}`);
                  setSelfAnswers((current) => ({
                    ...current,
                    categoryPoints: { ...current.categoryPoints, [criterion.id]: value },
                  }));
                }) : undefined}
                missingFieldIds={missingFieldIds}
              />
            );
          })}

          {[
            resolvedSelfTemplate.careerGrowthSection,
            resolvedSelfTemplate.decisionMakingSection,
            resolvedSelfTemplate.retentionSection,
            resolvedSelfTemplate.compensationSection,
          ].map((section) => (
            <SelfAssessmentSection
              key={section.id}
              section={section}
              responses={selfAnswers.responses}
              onChange={(key, value) => {
                clearMissingField(key);
                setSelfAnswers((current) => ({
                  ...current,
                  responses: { ...current.responses, [key]: value },
                }));
              }}
              disabled={readOnly}
              missingFieldIds={missingFieldIds}
            />
          ))}

          <Card>
            <CardContent>
              <div
                data-field-id="feedback"
                className={cn(
                  "rounded-2xl border p-4 transition",
                  missingFieldIds.has("feedback") ? "border-red-400 bg-red-50/70" : "border-slate-200 bg-white",
                )}
              >
                <TextAnswerInput
                  label={resolvedSelfTemplate.feedbackQuestion.prompt}
                  value={selfAnswers.feedback}
                  onChange={(feedback) => {
                    clearMissingField("feedback");
                    setSelfAnswers((current) => ({ ...current, feedback }));
                  }}
                  disabled={readOnly}
                  invalid={missingFieldIds.has("feedback")}
                />
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {!readOnly ? (
            <div className="flex justify-end">
              <DemoFillButton
                profiles={demoPerformanceProfiles}
                selectedProfile={demoProfile}
                onProfileChange={setDemoProfile}
                onClick={() => {
                  setReviewerAnswers(normalizeReviewerAnswers(buildReviewerDemoAnswers(criteria, demoProfile)));
                }}
              />
            </div>
          ) : null}
          {criteria.map((criterion) => (
            <ReviewerCriteriaSection
              key={criterion.id}
              criterion={criterion}
              value={{
                categoryScore: reviewerAnswers.categoryPoints[criterion.id] ?? computeCriterionAverage(reviewerAnswers.subItemRatings[criterion.id] ?? {}),
                subItemRatings: reviewerAnswers.subItemRatings[criterion.id] ?? {},
                comment: reviewerAnswers.comments[criterion.id] ?? "",
              }}
              onChange={(nextValue) => setReviewerAnswers((current) => ({
                ...current,
                categoryPoints: { ...current.categoryPoints, [criterion.id]: nextValue.categoryScore },
                subItemRatings: { ...current.subItemRatings, [criterion.id]: nextValue.subItemRatings },
                comments: { ...current.comments, [criterion.id]: nextValue.comment },
              }))}
              disabled={readOnly}
            />
          ))}
        </>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
        {!readOnly ? (
          <>
            <SaveDraftButton onClick={() => runAction("draft")} pending={isPending} />
            <SubmitButton
              onClick={() => runAction("submit")}
              pending={isPending}
              label={mode === "self" ? "Submit Self-Assessment" : "Submit Final Rating"}
            />
          </>
        ) : (
          <p className="text-sm text-slate-500">This submission is read-only.</p>
        )}
      </div>
    </div>
  );
}

function renderQuestionResponse(section: AppraisalSectionDefinition, answers: SelfAssessmentAnswers) {
  return section.questions.map((question) => {
    const key = buildQuestionKey(section.id, question.id);
    const value = answers.responses[key];
    if (!value) return null;

    const display = value.option
      ? [value.value ?? value.option, value.explanation].filter(Boolean).join(" - ")
      : value.value;

    if (!display) return null;

    return (
      <div key={key} className="space-y-1">
        <p className="text-sm font-medium text-slate-700">{question.prompt}</p>
        <p className="text-sm text-slate-600">{display}</p>
      </div>
    );
  });
}

export function CriteriaPointsView({
  criteria,
  supplementary,
  answers,
  editCount,
  selfTemplate,
}: {
  criteria: CriterionPoint[];
  supplementary: CriterionPoint[];
  answers: SelfAssessmentAnswers | ReviewerRatingAnswers | ManagementReviewAnswers | null;
  editCount?: number;
  selfTemplate?: AppraisalSelfFormTemplate;
}) {
  void supplementary;
  if (!answers) {
    return <p className="text-sm italic text-slate-400">No submission yet.</p>;
  }

  if ("employeeInfo" in answers) {
    const resolvedSelfTemplate = selfTemplate ?? buildDefaultSelfFormTemplate();
    const partARatingCriteria = criteria.slice(0, resolvedSelfTemplate.partASections.length);
    const allSelfSections = [
      ...resolvedSelfTemplate.partASections,
      resolvedSelfTemplate.careerGrowthSection,
      resolvedSelfTemplate.decisionMakingSection,
      resolvedSelfTemplate.retentionSection,
      resolvedSelfTemplate.compensationSection,
    ];

    return (
      <div className="space-y-5">
        {editCount !== undefined ? (
          <p className="text-xs text-slate-400">Edited {editCount} time{editCount === 1 ? "" : "s"}</p>
        ) : null}

        {allSelfSections.map((section, index) => {
          const content = renderQuestionResponse(section, answers).filter(Boolean);
          const criterion = index < partARatingCriteria.length ? partARatingCriteria[index] : null;
          const rating = criterion ? answers.categoryPoints[criterion.id] : null;

          if (content.length === 0 && !rating) return null;

          return (
            <div key={section.id} className="space-y-4 rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
                {criterion ? (
                  <Badge variant="secondary">Self rating {rating ?? "-"}</Badge>
                ) : null}
              </div>
              {content}
            </div>
          );
        })}

        {answers.feedback ? (
          <div className="space-y-1 rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">{resolvedSelfTemplate.feedbackQuestion.prompt}</p>
            <p className="text-sm text-slate-600">{answers.feedback}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {criteria.map((criterion) => {
        const categoryScore = answers.categoryPoints[criterion.id];
        const subItemRatings = answers.subItemRatings[criterion.id] ?? {};
        const comment = answers.comments[criterion.id];
        if (!categoryScore && Object.keys(subItemRatings).length === 0 && !comment) return null;

        return (
          <div key={criterion.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{criterion.label}</p>
                <p className="text-xs text-slate-500">{criterion.description}</p>
              </div>
              <Badge variant="secondary">Overall {categoryScore ?? "-"}</Badge>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {criterion.items.map((item) => {
                const value = subItemRatings[item.id];
                if (!value) return null;
                return (
                  <div key={item.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-700">{item.label}:</span>{" "}
                    <span className="text-slate-600">{value}</span>
                  </div>
                );
              })}
            </div>
            {comment ? (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{comment}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function CriteriaPointsForm({
  criteria,
  initialAnswers,
  mode,
  onSaveDraft,
  onSubmitFinal,
  disabled,
  selfTemplate,
}: {
  criteria: CriterionPoint[];
  supplementary: CriterionPoint[];
  initialAnswers: SelfAssessmentAnswers | ReviewerRatingAnswers | ManagementReviewAnswers | null | undefined;
  mode: "self" | "reviewer" | "management";
  onSaveDraft: (answers: SelfAssessmentAnswers | ReviewerRatingAnswers) => Promise<void> | void;
  onSubmitFinal: (answers: SelfAssessmentAnswers | ReviewerRatingAnswers) => Promise<void> | void;
  disabled?: boolean;
  selfTemplate?: AppraisalSelfFormTemplate;
}) {
  return (
    <DynamicAppraisalForm
      mode={mode}
      criteria={criteria}
      initialAnswers={initialAnswers}
      onSaveDraft={onSaveDraft}
      onSubmitFinal={onSubmitFinal}
      disabled={disabled}
      selfTemplate={selfTemplate}
    />
  );
}
