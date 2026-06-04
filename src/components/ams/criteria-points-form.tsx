"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  buildQuestionKey,
  buildDefaultSelfFormTemplate,
  clampRating,
  type AppraisalSelfFormTemplate,
  type EvaluatorRole,
  type QuestionResponse,
  type AppraisalQuestionDefinition,
  type AppraisalSectionDefinition,
  type ManagementReviewAnswers,
  type ReviewerRatingAnswers,
  type SelfAssessmentAnswers,
} from "@/modules/ams/criteria-config";

export type SupplementaryMeta = Record<string, never> | null;

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
  meta: SupplementaryMeta;
};

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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {multiline ? (
        <textarea
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          placeholder={placeholder ?? "Type your answer"}
          className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
        />
      ) : (
        <Input
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? "Type your answer"}
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
}: {
  question: AppraisalQuestionDefinition;
  value: QuestionResponse;
  onChange: (value: QuestionResponse) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-slate-700">{question.prompt}</Label>
      <div className="space-y-2">
        {(question.options ?? []).map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition",
              value.option === option.value
                ? "border-slate-500 bg-slate-50 text-slate-950"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
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
}: {
  section: AppraisalSectionDefinition;
  responses: Record<string, QuestionResponse>;
  onChange: (key: string, value: QuestionResponse) => void;
  disabled?: boolean;
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

          if (question.type === "radio") {
            return (
              <OptionQuestionInput
                key={questionKey}
                question={question}
                value={value}
                onChange={(nextValue) => onChange(questionKey, nextValue)}
                disabled={disabled}
              />
            );
          }

          return (
            <TextAnswerInput
              key={questionKey}
              label={question.prompt}
              value={value.value ?? ""}
              onChange={(nextValue) => onChange(questionKey, { ...value, value: nextValue })}
              disabled={disabled}
              multiline={question.type !== "text" && question.type !== "number"}
              placeholder={question.placeholder}
            />
          );
        })}
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

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Sub-criteria</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Rating (1-5)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {criterion.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-slate-900">{item.label}</td>
                  <td className="px-4 py-3">
                    <RatingInput
                      id={`criterion-${criterion.id}-${item.id}`}
                      value={value.subItemRatings[item.id] ?? ""}
                      disabled={disabled}
                      onChange={(nextRating) => {
                        const nextSubItemRatings = { ...value.subItemRatings, [item.id]: nextRating };
                        onChange({
                          ...value,
                          subItemRatings: nextSubItemRatings,
                          categoryScore: computeCriterionAverage(nextSubItemRatings),
                        });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  submitted,
  selfTemplate,
}: {
  mode: "self" | "reviewer" | "management";
  criteria: CriterionPoint[];
  initialAnswers: SelfAssessmentAnswers | ReviewerRatingAnswers | ManagementReviewAnswers | null | undefined;
  onSaveDraft: (answers: SelfAssessmentAnswers | ReviewerRatingAnswers) => Promise<void> | void;
  onSubmitFinal: (answers: SelfAssessmentAnswers | ReviewerRatingAnswers) => Promise<void> | void;
  disabled?: boolean;
  submitted?: boolean;
  selfTemplate?: AppraisalSelfFormTemplate;
}) {
  const [isPending, startTransition] = useTransition();
  const resolvedSelfTemplate = useMemo(
    () => selfTemplate ?? buildDefaultSelfFormTemplate(),
    [selfTemplate],
  );
  const allSelfSections = useMemo(() => ([
    ...resolvedSelfTemplate.partASections,
    resolvedSelfTemplate.careerGrowthSection,
    resolvedSelfTemplate.decisionMakingSection,
    resolvedSelfTemplate.retentionSection,
    resolvedSelfTemplate.compensationSection,
  ]), [resolvedSelfTemplate]);
  const [selfAnswers, setSelfAnswers] = useState(() => normalizeSelfAnswers(mode === "self" ? (initialAnswers as SelfAssessmentAnswers | null | undefined) : null));
  const [reviewerAnswers, setReviewerAnswers] = useState(() => normalizeReviewerAnswers(mode !== "self" ? (initialAnswers as ReviewerRatingAnswers | null | undefined) : null));
  const deferredSelf = useDeferredValue(selfAnswers);
  const deferredReviewer = useDeferredValue(reviewerAnswers);

  const questionCount = useMemo(() => {
    if (mode !== "self") {
      return criteria.reduce((count, criterion) => count + criterion.items.length + 1, 0);
    }

    return resolvedSelfTemplate.employeeInfoFields.length
      + allSelfSections.reduce((count, section) => count + section.questions.length, 0)
      + criteria.length
      + 1;
  }, [allSelfSections, criteria, mode, resolvedSelfTemplate.employeeInfoFields.length]);

  const completedCount = useMemo(() => {
    if (mode !== "self") {
      const criterionCompletions = criteria.reduce((count, criterion) => {
        const subRatings = deferredReviewer.subItemRatings[criterion.id] ?? {};
        const subCount = criterion.items.filter((item) => Boolean(subRatings[item.id])).length;
        const commentCount = deferredReviewer.comments[criterion.id]?.trim() ? 1 : 0;
        return count + subCount + commentCount;
      }, 0);
      return criterionCompletions;
    }

    const employeeInfoCount = resolvedSelfTemplate.employeeInfoFields.filter((field) => {
      if (field.showWhen) {
        return deferredSelf.employeeInfo[field.showWhen.fieldId] === field.showWhen.equals
          && Boolean(deferredSelf.employeeInfo[field.id]?.trim());
      }
      return Boolean(deferredSelf.employeeInfo[field.id]?.trim());
    }).length;

    const responseCount = Object.values(deferredSelf.responses).filter((value) =>
      Boolean(value.option || value.value?.trim() || value.explanation?.trim())
    ).length;
    const selfRatingCount = Object.values(deferredSelf.categoryPoints).filter(Boolean).length;
    const feedbackCount = deferredSelf.feedback.trim() ? 1 : 0;
    return employeeInfoCount + responseCount + selfRatingCount + feedbackCount;
  }, [criteria, deferredReviewer, deferredSelf, mode, resolvedSelfTemplate.employeeInfoFields]);

  const readOnly = disabled || submitted;

  function runAction(action: "draft" | "submit") {
    startTransition(async () => {
      if (mode === "self") {
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
          <Card>
            <CardContent className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-900">Employee Information</h3>
                <p className="text-sm text-slate-500">Review and complete your profile details for this appraisal form.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {resolvedSelfTemplate.employeeInfoFields.map((field) => {
                  if (field.showWhen) {
                    const visible = selfAnswers.employeeInfo[field.showWhen.fieldId] === field.showWhen.equals;
                    if (!visible) return null;
                  }

                  if (field.type === "radio") {
                    return (
                      <div key={field.id} className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-medium text-slate-700">{field.label}</Label>
                        <div className="flex flex-wrap gap-2">
                          {(field.options ?? []).map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              disabled={readOnly}
                              onClick={() => setSelfAnswers((current) => ({
                                ...current,
                                employeeInfo: { ...current.employeeInfo, [field.id]: option.value },
                              }))}
                              className={cn(
                                "rounded-full border px-4 py-2 text-sm transition",
                                selfAnswers.employeeInfo[field.id] === option.value
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-slate-300 bg-white text-slate-700",
                                readOnly && "cursor-not-allowed opacity-70",
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={field.id} className={field.type === "date" ? "" : "md:col-span-1"}>
                      <TextAnswerInput
                        label={field.label}
                        value={selfAnswers.employeeInfo[field.id] ?? ""}
                        onChange={(value) => setSelfAnswers((current) => ({
                          ...current,
                          employeeInfo: { ...current.employeeInfo, [field.id]: value },
                        }))}
                        disabled={readOnly}
                        multiline={false}
                        placeholder={field.placeholder}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Part A: Employee Self-Assessment</h2>
            <p className="text-sm text-slate-500">Respond to each section with clear examples and context.</p>
          </div>
          {resolvedSelfTemplate.partASections.map((section) => (
            <SelfAssessmentSection
              key={section.id}
              section={section}
              responses={selfAnswers.responses}
              onChange={(key, value) => setSelfAnswers((current) => ({
                ...current,
                responses: { ...current.responses, [key]: value },
              }))}
              disabled={readOnly}
            />
          ))}

          <Card>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-900">{resolvedSelfTemplate.selfRating.title}</h3>
                <p className="text-sm text-slate-500">{resolvedSelfTemplate.selfRating.description ?? "Rate yourself on a scale from 1 to 5."}</p>
              </div>
              <CriteriaRatingTable
                criteria={criteria}
                ratings={selfAnswers.categoryPoints}
                onChange={(criterionId, value) => setSelfAnswers((current) => ({
                  ...current,
                  categoryPoints: { ...current.categoryPoints, [criterionId]: value },
                }))}
                disabled={readOnly}
              />
            </CardContent>
          </Card>

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
              onChange={(key, value) => setSelfAnswers((current) => ({
                ...current,
                responses: { ...current.responses, [key]: value },
              }))}
              disabled={readOnly}
            />
          ))}

          <Card>
            <CardContent>
              <TextAnswerInput
                label={resolvedSelfTemplate.feedbackQuestion.prompt}
                value={selfAnswers.feedback}
                onChange={(feedback) => setSelfAnswers((current) => ({ ...current, feedback }))}
                disabled={readOnly}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        criteria.map((criterion) => (
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
        ))
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

        <div className="grid gap-3 md:grid-cols-2">
          {resolvedSelfTemplate.employeeInfoFields.map((field) => {
            const value = answers.employeeInfo[field.id];
            if (!value) return null;
            return (
              <div key={field.id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">{field.label}</p>
                <p className="mt-1 text-sm text-slate-700">{value}</p>
              </div>
            );
          })}
        </div>

        {allSelfSections.map((section) => {
          const content = renderQuestionResponse(section, answers).filter(Boolean);
          if (content.length === 0) return null;
          return (
            <div key={section.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
              {content}
            </div>
          );
        })}

        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">{resolvedSelfTemplate.selfRating.title}</h3>
          <CriteriaRatingTable criteria={criteria} ratings={answers.categoryPoints} />
        </div>

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
  submitted,
  selfTemplate,
}: {
  criteria: CriterionPoint[];
  supplementary: CriterionPoint[];
  initialAnswers: SelfAssessmentAnswers | ReviewerRatingAnswers | ManagementReviewAnswers | null | undefined;
  mode: "self" | "reviewer" | "management";
  onSaveDraft: (answers: SelfAssessmentAnswers | ReviewerRatingAnswers) => Promise<void> | void;
  onSubmitFinal: (answers: SelfAssessmentAnswers | ReviewerRatingAnswers) => Promise<void> | void;
  disabled?: boolean;
  submitted?: boolean;
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
      submitted={submitted}
      selfTemplate={selfTemplate}
    />
  );
}
