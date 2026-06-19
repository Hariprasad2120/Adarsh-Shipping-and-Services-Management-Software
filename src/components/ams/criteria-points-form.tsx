"use client";

import { ChevronDown } from "lucide-react";
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

export type EmployeeSummaryField = {
  label: string;
  value: string;
};

type ReviewerCriterionValue = {
  categoryScore: number;
  subItemRatings: Record<string, number>;
  responses: Record<string, QuestionResponse>;
  comment: string;
  changeReason: string;
};

type RatingAnswers = ReviewerRatingAnswers | ManagementReviewAnswers;

function emptySelfAnswers(): SelfAssessmentAnswers {
  return {
    version: "v2",
    employeeInfo: {},
    responses: {},
    categoryPoints: {},
    feedback: "",
  };
}

function emptyReviewerAnswers(): RatingAnswers {
  return {
    version: "v2",
    categoryPoints: {},
    subItemRatings: {},
    responses: {},
    comments: {},
    previousCategoryPoints: {},
    previousSubItemRatings: {},
    changeReasons: {},
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

function normalizeReviewerAnswers(initialAnswers?: RatingAnswers | null): RatingAnswers {
  return {
    ...emptyReviewerAnswers(),
    ...(initialAnswers ?? {}),
    categoryPoints: { ...(initialAnswers?.categoryPoints ?? {}) },
    subItemRatings: { ...(initialAnswers?.subItemRatings ?? {}) },
    responses: Object.fromEntries(
      Object.entries(initialAnswers?.responses ?? {}).map(([criterionId, responses]) => [criterionId, { ...responses }]),
    ),
    comments: { ...(initialAnswers?.comments ?? {}) },
    previousCategoryPoints: { ...(initialAnswers?.previousCategoryPoints ?? {}) },
    previousSubItemRatings: Object.fromEntries(
      Object.entries(initialAnswers?.previousSubItemRatings ?? {}).map(([criterionId, ratings]) => [criterionId, { ...ratings }]),
    ),
    changeReasons: { ...(initialAnswers?.changeReasons ?? {}) },
  };
}

function getCriterionQuestions(criterion: CriterionPoint): AppraisalQuestionDefinition[] {
  if (criterion.questionItems.length > 0) {
    return criterion.questionItems;
  }

  return criterion.items.map((item) => ({
    id: item.id,
    prompt: item.label,
    type: "number",
    minValue: 1,
    maxValue: 5,
    startLabel: "Low",
    endLabel: "High",
  }));
}

function getReviewerQuestionResponse(
  criterionId: string,
  question: AppraisalQuestionDefinition,
  answers: RatingAnswers,
): QuestionResponse {
  const stored = answers.responses?.[criterionId]?.[question.id];
  if (stored) return stored;

  if (question.type === "number") {
    const numericValue = answers.subItemRatings?.[criterionId]?.[question.id];
    if (numericValue) return { value: String(numericValue) };
  }

  return {};
}

function renderResponseDisplay(value?: QuestionResponse) {
  if (!value) return null;
  return value.option
    ? [value.value ?? value.option, value.explanation].filter(Boolean).join(" - ")
    : value.value;
}

function computeCriterionAverage(subItemRatings: Record<string, number>): number {
  const values = Object.values(subItemRatings).filter((value) => Number.isFinite(value));
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + clampRating(value), 0);
  return Math.round((total / values.length) * 10) / 10;
}

function buildSliderStyle(value: number, minValue = 1, maxValue = 5) {
  const safeValue = Number.isFinite(value) ? Math.min(maxValue, Math.max(minValue, value)) : minValue;
  const range = maxValue - minValue;
  const progress = range === 0 ? 0 : ((safeValue - minValue) / range) * 100;
  return {
    background: `linear-gradient(90deg, #00cec4 0%, #00cec4 ${progress}%, #d7f7f4 ${progress}%, #d7f7f4 100%)`,
  };
}

function hasCriterionChanged(
  criterionId: string,
  current: RatingAnswers,
  baseline: RatingAnswers | null,
) {
  if (!baseline) return false;
  return (
    baseline.categoryPoints?.[criterionId] !== current.categoryPoints?.[criterionId] ||
    JSON.stringify(baseline.subItemRatings?.[criterionId] ?? {}) !==
      JSON.stringify(current.subItemRatings?.[criterionId] ?? {}) ||
    JSON.stringify(baseline.responses?.[criterionId] ?? {}) !==
      JSON.stringify(current.responses?.[criterionId] ?? {})
  );
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
              : "border-cyan-100 focus:border-[#00cec4] focus:ring-[#00cec4]/20",
          )}
        />
      ) : (
        <Input
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? "Type your answer"}
          className={cn(
            invalid
              ? "border-red-400 bg-red-50/60 focus-visible:ring-red-100"
              : "border-cyan-100 focus-visible:border-[#00cec4] focus-visible:ring-[#00cec4]/20",
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
                ? "border-cyan-300 bg-cyan-50/60 text-slate-950"
                : "border-slate-200 bg-white text-slate-700 hover:border-cyan-200",
              invalid && !value.option && "border-red-400 bg-red-50/60",
              disabled && "cursor-not-allowed opacity-70",
            )}
          >
            <input
              type="radio"
              disabled={disabled}
              checked={value.option === option.value}
              onChange={() => onChange({ ...value, option: option.value, value: option.label })}
              className="mt-0.5 accent-[#00cec4]"
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

function ReviewerNumberQuestionInput({
  question,
  value,
  onChange,
  disabled,
  invalid = false,
}: {
  question: AppraisalQuestionDefinition;
  value: QuestionResponse;
  onChange: (value: QuestionResponse, numericValue: number) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const minValue = question.minValue ?? 1;
  const maxValue = question.maxValue ?? 5;
  const rawValue = Number(value.value ?? minValue);
  const numericValue = Number.isFinite(rawValue) ? Math.min(maxValue, Math.max(minValue, rawValue)) : minValue;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="text-sm font-medium text-slate-700">{question.prompt}</Label>
          <p className="text-xs text-on-surface-variant">
            {question.startLabel || "Low"} to {question.endLabel || "High"}
          </p>
        </div>
        <div className={cn("rounded-full px-3 py-1 text-xs font-semibold text-white", invalid ? "bg-red-400" : "bg-[#00cec4]")}>
          {numericValue}
        </div>
      </div>
      <input
        type="range"
        min={minValue}
        max={maxValue}
        step={1}
        value={numericValue}
        disabled={disabled}
        style={buildSliderStyle(numericValue, minValue, maxValue)}
        onChange={(event) => {
          const nextRaw = Number(event.target.value);
          const nextRating = Number.isFinite(nextRaw) ? Math.min(maxValue, Math.max(minValue, nextRaw)) : minValue;
          onChange({ ...value, value: String(nextRating) }, nextRating);
        }}
        className="cyan-range-slider h-2.5 w-full cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed"
      />
      <div className="flex justify-between text-xs font-medium text-on-surface-variant/60">
        <span>{question.startLabel || minValue}</span>
        <span>{question.endLabel || maxValue}</span>
      </div>
    </div>
  );
}

function SelfNumberQuestionInput({
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
  const minValue = question.minValue ?? 1;
  const maxValue = question.maxValue ?? 5;
  const rawValue = Number(value.value);
  const numericValue = Number.isFinite(rawValue) && rawValue >= minValue ? Math.min(maxValue, Math.max(minValue, rawValue)) : minValue;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="text-sm font-medium text-slate-700">{question.prompt}</Label>
          {(question.startLabel || question.endLabel) ? (
            <p className="text-xs text-on-surface-variant">
              {question.startLabel || "Low"} to {question.endLabel || "High"}
            </p>
          ) : null}
        </div>
        <div className={cn("rounded-full px-3 py-1 text-xs font-semibold text-white", invalid ? "bg-red-400" : "bg-[#00cec4]")}>
          {numericValue}
        </div>
      </div>
      <input
        type="range"
        min={minValue}
        max={maxValue}
        step={1}
        value={numericValue}
        disabled={disabled}
        style={buildSliderStyle(numericValue, minValue, maxValue)}
        onChange={(event) => {
          const nextRaw = Number(event.target.value);
          const nextNum = Number.isFinite(nextRaw) ? Math.min(maxValue, Math.max(minValue, nextRaw)) : minValue;
          onChange({ ...value, value: String(nextNum) });
        }}
        className="cyan-range-slider h-2.5 w-full cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed"
      />
      <div className="flex justify-between text-xs font-medium text-on-surface-variant/60">
        <span>{question.startLabel || minValue}</span>
        <span>{question.endLabel || maxValue}</span>
      </div>
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
      className="min-h-24 w-full rounded-xl border border-cyan-100 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#00cec4] focus:ring-2 focus:ring-[#00cec4]/20 disabled:bg-slate-50"
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
    <div className="overflow-x-auto rounded-2xl border border-outline-variant/40 bg-surface">
      <table className="min-w-full divide-y divide-outline-variant/30 text-sm">
        <thead className="bg-surface-container-low text-on-surface">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-on-surface-variant">
              Competency
            </th>
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-on-surface-variant">
              Weightage
            </th>
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-on-surface-variant">
              Self Rating (1-5)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/30 bg-surface">
          {criteria.map((criterion) => (
            <tr key={criterion.id} className="hover:bg-surface-container-low/80 transition-colors">
              <td className="px-5 py-4 text-sm text-on-surface">{criterion.label}</td>
              <td className="px-5 py-4 text-sm text-on-surface-variant">{criterion.weightage}</td>
              <td className="px-5 py-4">
                {onChange ? (
                  <RatingInput
                    id={`self-rating-${criterion.id}`}
                    value={ratings[criterion.id] ?? ""}
                    disabled={disabled}
                    onChange={(value) => onChange(criterion.id, value)}
                  />
                ) : (
                  <span className="ds-numeric font-semibold text-on-surface">
                    {ratings[criterion.id] ?? "-"}
                  </span>
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
  missingFieldIds = new Set<string>(),
  sectionIndex = 0,
}: {
  section: AppraisalSectionDefinition;
  responses: Record<string, QuestionResponse>;
  onChange: (key: string, value: QuestionResponse) => void;
  disabled?: boolean;
  missingFieldIds?: Set<string>;
  sectionIndex?: number;
}) {
  const answeredCount = section.questions.filter((q) => {
    const key = buildQuestionKey(section.id, q.id);
    return isQuestionAnswered(q, responses[key]);
  }).length;
  const total = section.questions.length;
  const allDone = total > 0 && answeredCount === total;

  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface shadow-sm">
      <div
        className={cn(
          "flex items-center gap-4 border-b px-6 py-4 transition",
          allDone
            ? "border-[#00cec4]/25 bg-surface"
            : "border-outline-variant/30 bg-surface",
        )}
      >
        <div className={cn("h-11 w-1.5 shrink-0 rounded-full", allDone ? "bg-[#00cec4]" : "bg-[#00cec4]/55")} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#008b85]">
            Criterion {sectionIndex + 1}
          </p>
          <h3 className="mt-1 text-base font-semibold uppercase tracking-[0.12em] leading-tight text-on-surface">
            {section.title}
          </h3>
          {section.description ? (
            <p className="mt-0.5 text-xs text-on-surface-variant">{section.description}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
            allDone ? "bg-[#00cec4]/10 text-[#008b85]" : "bg-surface-container text-on-surface-variant",
          )}
        >
          {answeredCount}/{total}
        </div>
      </div>

      <div className="divide-y divide-outline-variant/20">
        {section.questions.map((question, qi) => {
          const questionKey = buildQuestionKey(section.id, question.id);
          const value = responses[questionKey] ?? {};
          const invalid = missingFieldIds.has(questionKey);

          return (
            <div
              key={questionKey}
              data-field-id={questionKey}
              className={cn("px-6 py-5 transition", invalid ? "bg-red-50/50" : "bg-white")}
            >
              <div className="mb-3 min-w-0">
                <p className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", invalid ? "text-red-600" : "text-on-surface-variant")}>
                  Question {qi + 1}
                </p>
              </div>
              <div className="min-w-0">
                {question.type === "radio" ? (
                  <OptionQuestionInput
                    question={question}
                    value={value}
                    onChange={(nextValue) => onChange(questionKey, nextValue)}
                    disabled={disabled}
                    invalid={invalid}
                  />
                ) : question.type === "number" ? (
                  <SelfNumberQuestionInput
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
                    multiline={question.type !== "text"}
                    placeholder={question.placeholder}
                    invalid={invalid}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReviewerCriteriaSection({
  criterion,
  value,
  baselineValue,
  onChange,
  disabled,
  invalidSubItemIds = new Set<string>(),
  commentInvalid = false,
  changeReasonInvalid = false,
  showComparison = false,
}: {
  criterion: CriterionPoint;
  value: ReviewerCriterionValue;
  baselineValue?: ReviewerCriterionValue | null;
  onChange: (nextValue: ReviewerCriterionValue) => void;
  disabled?: boolean;
  invalidSubItemIds?: Set<string>;
  commentInvalid?: boolean;
  changeReasonInvalid?: boolean;
  showComparison?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChanged = showComparison && !!baselineValue && baselineValue.categoryScore !== value.categoryScore;
  const questions = getCriterionQuestions(criterion);
  const hasInvalid = invalidSubItemIds.size > 0 || commentInvalid || changeReasonInvalid;

  return (
    <Card id={`reviewer-criterion-${criterion.id}`}>
      <CardContent className="space-y-4">
        {/* Collapsible header */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "flex w-full flex-wrap items-start justify-between gap-3 pb-3 text-left",
            collapsed ? "" : "border-b border-outline-variant/20",
            hasInvalid && collapsed ? "rounded-lg border border-red-200 bg-red-50/40 px-3 py-2" : "",
          )}
        >
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="ds-h3 text-on-surface">{criterion.label}</h3>
              <Badge variant="secondary">{criterion.weightage}%</Badge>
              {hasInvalid && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                  Incomplete
                </span>
              )}
            </div>
            {criterion.description ? (
              <p className="text-sm text-on-surface-variant">{criterion.description}</p>
            ) : null}
            {hasChanged ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-semibold text-red-600 line-through">
                  {baselineValue?.categoryScore ?? "-"}
                </span>
                <span className="text-on-surface-variant/60">to</span>
                <span className="rounded-full border border-[#00cec4]/30 bg-[#00cec4]/10 px-3 py-1 font-semibold text-[#008b85]">
                  {value.categoryScore || "-"}
                </span>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">Overall Rating</p>
              <p className="ds-numeric text-lg font-semibold text-[#008b85]">{value.categoryScore || "-"}</p>
            </div>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-on-surface-variant/60 transition-transform duration-200",
                collapsed ? "rotate-0" : "rotate-180",
              )}
            />
          </div>
        </button>

        {!collapsed && (
          <>
            <div className="space-y-3">
              {questions.map((question) => {
                const currentValue = value.responses[question.id] ?? {};
                const invalid = invalidSubItemIds.has(question.id);

                return (
                  <div
                    key={question.id}
                    data-field-id={`criterion:${criterion.id}:${question.id}`}
                    className={cn(
                      "space-y-3 border-b py-3 last:border-b-0",
                      invalid ? "border-red-200" : "border-outline-variant/20",
                    )}
                  >
                    {question.type === "radio" ? (
                      <OptionQuestionInput
                        question={question}
                        value={currentValue}
                        onChange={(nextResponse) => onChange({
                          ...value,
                          responses: { ...value.responses, [question.id]: nextResponse },
                        })}
                        disabled={disabled}
                        invalid={invalid}
                      />
                    ) : question.type === "number" ? (
                      <ReviewerNumberQuestionInput
                        question={question}
                        value={currentValue}
                        disabled={disabled}
                        invalid={invalid}
                        onChange={(nextResponse, numericValue) => {
                          const nextResponses = { ...value.responses, [question.id]: nextResponse };
                          const nextSubItemRatings = { ...value.subItemRatings, [question.id]: numericValue };
                          onChange({
                            ...value,
                            responses: nextResponses,
                            subItemRatings: nextSubItemRatings,
                            categoryScore: computeCriterionAverage(nextSubItemRatings),
                          });
                        }}
                      />
                    ) : (
                      <TextAnswerInput
                        label={question.prompt}
                        value={currentValue.value ?? ""}
                        onChange={(nextValue) => onChange({
                          ...value,
                          responses: { ...value.responses, [question.id]: { ...currentValue, value: nextValue } },
                        })}
                        disabled={disabled}
                        multiline={question.type !== "text"}
                        placeholder={question.placeholder}
                        invalid={invalid}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div
              className={cn(
                "space-y-2",
                commentInvalid && "rounded-xl border border-red-400 bg-red-50/70 p-3",
              )}
              data-field-id={`comment:${criterion.id}`}
            >
              <Label className="text-sm font-medium text-on-surface-variant">Comments</Label>
              <ReviewerCommentBox
                value={value.comment}
                onChange={(comment) => onChange({ ...value, comment })}
                disabled={disabled}
              />
            </div>

            {showComparison ? (
              <div
                data-field-id={`change-reason:${criterion.id}`}
                className={cn(
                  "space-y-2",
                  changeReasonInvalid && "rounded-xl border border-red-400 bg-red-50/70 p-3",
                )}
              >
                <Label className="text-sm font-medium text-on-surface-variant">Reason for rating change</Label>
                <ReviewerCommentBox
                  value={value.changeReason}
                  onChange={(changeReason) => onChange({ ...value, changeReason })}
                  disabled={disabled}
                />
                <p className="text-xs text-on-surface-variant/70">
                  Explain why this criterion was changed from the last submitted rating.
                </p>
              </div>
            ) : null}
          </>
        )}
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
    <div className="sticky top-4 z-10 space-y-3 rounded-2xl border border-outline-variant/40 bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-on-surface-variant">Progress</span>
        <span className="rounded-full bg-[#00cec4]/10 px-3 py-1 text-[#008b85]">
          {completed}/{total}
        </span>
      </div>
      <div className="overflow-hidden rounded-full border border-[#00cec4]/20 bg-surface-container p-1">
        <div
          className="h-2.5 rounded-full bg-linear-to-r from-[#00cec4] via-[#00b8af] to-sky-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-on-surface-variant/70">{pct}% complete</p>
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
    <Button
      type="button"
      variant="outline"
      disabled={disabled || pending}
      onClick={onClick}
      className="border-cyan-200 bg-white text-[#008b85] hover:bg-cyan-50 hover:text-[#007a75]"
    >
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
    <Button
      type="button"
      disabled={disabled || pending}
      onClick={onClick}
      className="border-0 bg-[#00cec4] text-white hover:bg-[#00b8af]"
    >
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
  isResubmission = false,
  submitLabel,
  showDemoFill = true,
}: {
  mode: "self" | "reviewer" | "management";
  criteria: CriterionPoint[];
  initialAnswers: SelfAssessmentAnswers | RatingAnswers | null | undefined;
  onSaveDraft: (answers: SelfAssessmentAnswers | RatingAnswers) => Promise<void> | void;
  onSubmitFinal: (answers: SelfAssessmentAnswers | RatingAnswers) => Promise<void> | void;
  disabled?: boolean;
  selfTemplate?: AppraisalSelfFormTemplate;
  isResubmission?: boolean;
  submitLabel?: string;
  showDemoFill?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const resolvedSelfTemplate = useMemo(
    () => selfTemplate ?? buildDefaultSelfFormTemplate(),
    [selfTemplate],
  );
  const allSelfSections = useMemo(
    () => resolvedSelfTemplate.partASections,
    [resolvedSelfTemplate],
  );
  const [selfAnswers, setSelfAnswers] = useState(() => normalizeSelfAnswers(mode === "self" ? (initialAnswers as SelfAssessmentAnswers | null | undefined) : null));
  const [reviewerAnswers, setReviewerAnswers] = useState(() => normalizeReviewerAnswers(mode !== "self" ? (initialAnswers as RatingAnswers | null | undefined) : null));
  const [missingFieldIds, setMissingFieldIds] = useState<Set<string>>(new Set());
  const [formPrompt, setFormPrompt] = useState<string | null>(null);
  const [demoProfile, setDemoProfile] = useState<DemoPerformanceProfile>("average");
  const deferredSelf = useDeferredValue(selfAnswers);
  const deferredReviewer = useDeferredValue(reviewerAnswers);
  const baselineReviewerAnswers = useMemo(
    () => (mode === "self" || !isResubmission ? null : normalizeReviewerAnswers(initialAnswers as RatingAnswers | null | undefined)),
    [initialAnswers, mode, isResubmission],
  );

  const questionCount = useMemo(() => {
    if (mode !== "self") {
      return criteria.reduce((count, criterion) => {
        const changed = hasCriterionChanged(criterion.id, deferredReviewer, baselineReviewerAnswers);
        return count + getCriterionQuestions(criterion).length + (changed ? 1 : 0);
      }, 0);
    }

    return allSelfSections.reduce((count, section) => count + section.questions.length, 0);
  }, [allSelfSections, baselineReviewerAnswers, criteria, deferredReviewer, mode]);

  const completedCount = useMemo(() => {
    if (mode !== "self") {
      return criteria.reduce((count, criterion) => {
        const responses = deferredReviewer.responses?.[criterion.id] ?? {};
        const subCount = getCriterionQuestions(criterion).filter((question) => (
          question.type === "number"
            ? Boolean(deferredReviewer.subItemRatings[criterion.id]?.[question.id])
            : isQuestionAnswered(question, responses[question.id])
        )).length;
        const changed = hasCriterionChanged(criterion.id, deferredReviewer, baselineReviewerAnswers);
        const changeReasonCount = changed && deferredReviewer.changeReasons?.[criterion.id]?.trim() ? 1 : 0;
        return count + subCount + changeReasonCount;
      }, 0);
    }

    return allSelfSections.reduce((count, section) => (
      count
      + section.questions.filter((question) => {
        const questionKey = buildQuestionKey(section.id, question.id);
        return isQuestionAnswered(question, deferredSelf.responses[questionKey]);
      }).length
    ), 0);
  }, [allSelfSections, baselineReviewerAnswers, criteria, deferredReviewer, deferredSelf, mode]);

  const readOnly = disabled;

  function clearMissingField(fieldId: string) {
    setMissingFieldIds((current) => {
      if (!current.has(fieldId)) return current;
      const next = new Set(current);
      next.delete(fieldId);
      return next;
    });
    setFormPrompt(null);
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

  function validateReviewerAssessment() {
    const missing: string[] = [];

    for (const criterion of criteria) {
      const subRatings = reviewerAnswers.subItemRatings[criterion.id] ?? {};
      const responses = reviewerAnswers.responses?.[criterion.id] ?? {};
      const changed = hasCriterionChanged(criterion.id, reviewerAnswers, baselineReviewerAnswers);

      if (!isResubmission || changed) {
        for (const question of getCriterionQuestions(criterion)) {
          const isAnswered = question.type === "number"
            ? Boolean(subRatings[question.id])
            : isQuestionAnswered(question, responses[question.id]) || Boolean(subRatings[question.id]);
          if (!isAnswered) {
            missing.push(`criterion:${criterion.id}:${question.id}`);
          }
        }
      }

      if (changed && !reviewerAnswers.changeReasons?.[criterion.id]?.trim()) {
        missing.push(`change-reason:${criterion.id}`);
      }
    }

    return missing;
  }

  const reviewerMissing = useMemo(() => {
    const missing: string[] = [];

    for (const criterion of criteria) {
      const subRatings = reviewerAnswers.subItemRatings[criterion.id] ?? {};
      const responses = reviewerAnswers.responses?.[criterion.id] ?? {};
      const changed = hasCriterionChanged(criterion.id, reviewerAnswers, baselineReviewerAnswers);

      // On resubmission, unchanged criteria were already validated in the prior submission — skip re-checking
      if (!isResubmission || changed) {
        for (const question of getCriterionQuestions(criterion)) {
          const isAnswered = question.type === "number"
            ? Boolean(subRatings[question.id])
            : isQuestionAnswered(question, responses[question.id]) || Boolean(subRatings[question.id]);
          if (!isAnswered) {
            missing.push(`criterion:${criterion.id}:${question.id}`);
          }
        }
      }

      if (changed && !reviewerAnswers.changeReasons?.[criterion.id]?.trim()) {
        missing.push(`change-reason:${criterion.id}`);
      }
    }

    return missing;
  }, [baselineReviewerAnswers, criteria, isResubmission, reviewerAnswers]);
  const reviewerSubmitDisabled = mode !== "self" && reviewerMissing.length > 0;

  function runAction(action: "draft" | "submit") {
    if (mode === "self" && action === "submit") {
      const missing = validateSelfAssessment();
      if (missing.length > 0) {
        setMissingFieldIds(new Set(missing));
        setFormPrompt("Fill every required question before submitting the self-assessment.");
        requestAnimationFrame(() => focusFirstMissingField(missing));
        return;
      }
    }

    if (mode !== "self" && action === "submit") {
      const missing = validateReviewerAssessment();
      if (missing.length > 0) {
        setMissingFieldIds(new Set(missing));
        setFormPrompt("Rate every criterion and add a reason for any edited rating before submitting.");
        requestAnimationFrame(() => focusFirstMissingField(missing));
        return;
      }
    }

    startTransition(async () => {
      if (mode === "self") {
        setMissingFieldIds(new Set());
        setFormPrompt(null);
        if (action === "draft") {
          await onSaveDraft(selfAnswers);
        } else {
          await onSubmitFinal(selfAnswers);
        }
        return;
      }

      const normalized: RatingAnswers = {
        ...reviewerAnswers,
        categoryPoints: criteria.reduce<Record<string, number>>((acc, criterion) => {
          const subItemRatings = reviewerAnswers.subItemRatings[criterion.id] ?? {};
          const average = computeCriterionAverage(subItemRatings);
          if (average > 0) acc[criterion.id] = average;
          return acc;
        }, {}),
        previousCategoryPoints: baselineReviewerAnswers?.categoryPoints,
        previousSubItemRatings: baselineReviewerAnswers?.subItemRatings,
        changeReasons: criteria.reduce<Record<string, string>>((acc, criterion) => {
          const changed = hasCriterionChanged(criterion.id, reviewerAnswers, baselineReviewerAnswers);
          const reason = reviewerAnswers.changeReasons?.[criterion.id]?.trim();
          if (changed && reason) {
            acc[criterion.id] = reason;
          }
          return acc;
        }, {}),
      };
      setMissingFieldIds(new Set());
      setFormPrompt(null);

      if (action === "draft") {
        await onSaveDraft(normalized);
      } else {
        await onSubmitFinal(normalized);
      }
    });
  }

  return (
    <div className="space-y-5">
      {mode === "self" ? (
        <>
          {/* Sticky compact progress */}
          <div className="sticky top-2 z-10 overflow-hidden rounded-2xl border border-outline-variant/35 bg-surface/95 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-on-surface-variant">Progress</span>
                  <span className="text-xs font-semibold text-[#008b85]">{completedCount} / {questionCount}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-[#00cec4] to-sky-400 transition-[width] duration-500"
                    style={{ width: `${questionCount === 0 ? 0 : Math.round((completedCount / questionCount) * 100)}%` }}
                  />
                </div>
              </div>
              {!readOnly && showDemoFill ? (
                <DemoFillButton
                  profiles={demoPerformanceProfiles}
                  selectedProfile={demoProfile}
                  onProfileChange={setDemoProfile}
                  onClick={() => {
                    setMissingFieldIds(new Set());
                    setFormPrompt(null);
                    setSelfAnswers(normalizeSelfAnswers(buildSelfAssessmentDemoAnswers(criteria, resolvedSelfTemplate, demoProfile)));
                  }}
                />
              ) : null}
            </div>
          </div>

          {formPrompt ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formPrompt}
            </div>
          ) : null}

          {resolvedSelfTemplate.partASections.map((section, i) => (
            <SelfAssessmentSection
              key={section.id}
              section={section}
              sectionIndex={i}
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


        </>
      ) : (
        <>
          <FormProgress total={questionCount} completed={completedCount} />

          {formPrompt ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formPrompt}
            </div>
          ) : null}

          {!readOnly && showDemoFill ? (
            <div className="flex justify-end">
              <DemoFillButton
                profiles={demoPerformanceProfiles}
                selectedProfile={demoProfile}
                onProfileChange={setDemoProfile}
                onClick={() => {
                  setMissingFieldIds(new Set());
                  setFormPrompt(null);
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
                responses: Object.fromEntries(
                  getCriterionQuestions(criterion).map((question) => [
                    question.id,
                    getReviewerQuestionResponse(criterion.id, question, reviewerAnswers),
                  ]),
                ),
                comment: reviewerAnswers.comments[criterion.id] ?? "",
                changeReason: reviewerAnswers.changeReasons?.[criterion.id] ?? "",
              }}
              baselineValue={baselineReviewerAnswers ? {
                categoryScore: baselineReviewerAnswers.categoryPoints[criterion.id] ?? computeCriterionAverage(baselineReviewerAnswers.subItemRatings[criterion.id] ?? {}),
                subItemRatings: baselineReviewerAnswers.subItemRatings[criterion.id] ?? {},
                responses: Object.fromEntries(
                  getCriterionQuestions(criterion).map((question) => [
                    question.id,
                    getReviewerQuestionResponse(criterion.id, question, baselineReviewerAnswers),
                  ]),
                ),
                comment: baselineReviewerAnswers.comments[criterion.id] ?? "",
                changeReason: baselineReviewerAnswers.changeReasons?.[criterion.id] ?? "",
              } : null}
              onChange={(nextValue) => {
                getCriterionQuestions(criterion).forEach((question) => clearMissingField(`criterion:${criterion.id}:${question.id}`));
                clearMissingField(`change-reason:${criterion.id}`);
                setReviewerAnswers((current) => ({
                  ...current,
                  categoryPoints: { ...current.categoryPoints, [criterion.id]: nextValue.categoryScore },
                  subItemRatings: { ...current.subItemRatings, [criterion.id]: nextValue.subItemRatings },
                  responses: { ...current.responses, [criterion.id]: nextValue.responses },
                  comments: { ...current.comments, [criterion.id]: nextValue.comment },
                  changeReasons: { ...current.changeReasons, [criterion.id]: nextValue.changeReason },
                }));
              }}
              invalidSubItemIds={new Set(
                getCriterionQuestions(criterion)
                  .filter((question) => missingFieldIds.has(`criterion:${criterion.id}:${question.id}`))
                  .map((question) => question.id),
              )}
              changeReasonInvalid={missingFieldIds.has(`change-reason:${criterion.id}`)}
              showComparison={hasCriterionChanged(criterion.id, reviewerAnswers, baselineReviewerAnswers)}
              disabled={readOnly}
            />
          ))}
        </>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-outline-variant/40 pt-4">
        {!readOnly ? (
          <>
            <SaveDraftButton onClick={() => runAction("draft")} pending={isPending} />
            {reviewerSubmitDisabled ? (
              <Button
                type="button"
                variant="outline"
                className="border-cyan-200 bg-white text-[#008b85] hover:bg-cyan-50 hover:text-[#007a75]"
                onClick={() => {
                  const missing = validateReviewerAssessment();
                  setMissingFieldIds(new Set(missing));
                  setFormPrompt("Rate every criterion and add a reason for any edited rating before submitting.");
                  requestAnimationFrame(() => focusFirstMissingField(missing));
                }}
              >
                Review Missing Items
              </Button>
            ) : null}
            <SubmitButton
              onClick={() => runAction("submit")}
              pending={isPending}
              disabled={reviewerSubmitDisabled}
              label={submitLabel ?? (mode === "self" ? "Submit Self-Assessment" : isResubmission ? "Update Rating" : "Submit Rating")}
            />
          </>
        ) : (
          <p className="text-sm text-on-surface-variant">This submission is read-only.</p>
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

    const display = renderResponseDisplay(value);
    if (!display) return null;

    return (
      <div key={key} className="border-b border-outline-variant/20 py-3 last:border-b-0">
        <p className="mb-1 text-xs text-on-surface-variant/50">{question.prompt}</p>
        <p className="text-sm text-on-surface">{display}</p>
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
  onReviewerFieldNavigate,
}: {
  criteria: CriterionPoint[];
  supplementary: CriterionPoint[];
  answers: SelfAssessmentAnswers | RatingAnswers | null;
  editCount?: number;
  selfTemplate?: AppraisalSelfFormTemplate;
  onReviewerFieldNavigate?: (fieldId: string) => void;
}) {
  void supplementary;
  if (!answers) {
    return <p className="text-sm italic text-slate-400">No submission yet.</p>;
  }

  if ("employeeInfo" in answers) {
    const resolvedSelfTemplate = selfTemplate ?? buildDefaultSelfFormTemplate();
    const allSelfSections = resolvedSelfTemplate.partASections;

    return (
      <div className="space-y-5">
        {editCount !== undefined ? (
          <p className="text-xs text-on-surface-variant/70">Edited {editCount} time{editCount === 1 ? "" : "s"}</p>
        ) : null}

        {allSelfSections.map((section) => {
          const content = renderQuestionResponse(section, answers).filter(Boolean);

          if (content.length === 0) return null;

          return (
            <div key={section.id} className="space-y-0">
              <div className="mb-1 flex flex-wrap items-start justify-between gap-3 border-l-4 border-[#00cec4] pl-3">
                <h3 className="ds-h3 text-slate-900">{section.title}</h3>
              </div>
              {content}
            </div>
          );
        })}

      </div>
    );
  }

  return (
    <div className="space-y-5">
      {criteria.map((criterion) => {
        const categoryScore = answers.categoryPoints[criterion.id];
        const subItemRatings = answers.subItemRatings[criterion.id] ?? {};
        const responses = answers.responses?.[criterion.id] ?? {};
        const comment = answers.comments[criterion.id];
        const previousCategoryScore = answers.previousCategoryPoints?.[criterion.id];
        const changeReason = answers.changeReasons?.[criterion.id];
        const questions = getCriterionQuestions(criterion);
        if (!categoryScore && Object.keys(subItemRatings).length === 0 && Object.keys(responses).length === 0 && !comment) return null;

        return (
          <div key={criterion.id} className="space-y-0">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3 border-l-4 border-[#00cec4] pl-3">
              <div>
                {onReviewerFieldNavigate ? (
                  <button
                    type="button"
                    onClick={() => onReviewerFieldNavigate(`reviewer-criterion:${criterion.id}`)}
                    className="text-left transition hover:text-[#008b85] hover:underline"
                  >
                    <h3 className="ds-h3 text-current">{criterion.label}</h3>
                  </button>
                ) : (
                  <h3 className="ds-h3 text-on-surface">{criterion.label}</h3>
                )}
                {criterion.description ? (
                  <p className="text-xs text-on-surface-variant">{criterion.description}</p>
                ) : null}
                {typeof previousCategoryScore === "number" && previousCategoryScore !== categoryScore ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-semibold text-red-600 line-through">
                      {previousCategoryScore}
                    </span>
                    <span className="text-on-surface-variant/60">→</span>
                    <span className="rounded-full border border-[#00cec4]/30 bg-[#00cec4]/10 px-2 py-0.5 font-semibold text-[#008b85]">
                      {categoryScore ?? "-"}
                    </span>
                  </div>
                ) : null}
              </div>
              <Badge variant="secondary">Overall {categoryScore ?? "-"}</Badge>
            </div>

            {questions.map((question) => {
              const response = getReviewerQuestionResponse(criterion.id, question, answers);
              const display = question.type === "number"
                ? response.value ?? (subItemRatings[question.id] ? String(subItemRatings[question.id]) : null)
                : renderResponseDisplay(response);
              if (!display) return null;
              return (
                <div key={question.id} className="border-b border-outline-variant/20 py-3 last:border-b-0">
                  {onReviewerFieldNavigate ? (
                    <button
                      type="button"
                      onClick={() => onReviewerFieldNavigate(`criterion:${criterion.id}:${question.id}`)}
                      className="mb-1 block text-left text-xs text-on-surface-variant/50 transition hover:text-[#008b85] hover:underline"
                    >
                      {question.prompt}
                    </button>
                  ) : (
                    <p className="mb-1 text-xs text-on-surface-variant/50">{question.prompt}</p>
                  )}
                  <p className={cn("text-sm font-semibold text-on-surface", question.type === "number" && "ds-numeric")}>{display}</p>
                </div>
              );
            })}

            {comment ? (
              <div className="border-b border-outline-variant/20 py-3 last:border-b-0">
                <p className="mb-1 text-xs text-on-surface-variant/50">Comments</p>
                <p className="text-sm text-on-surface-variant">{comment}</p>
              </div>
            ) : null}

            {changeReason ? (
              <div className="py-3">
                <p className="mb-1 text-xs text-on-surface-variant/50">Reason for change</p>
                <p className="text-sm text-on-surface">{changeReason}</p>
              </div>
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
  isResubmission,
  submitLabel,
  showDemoFill = true,
}: {
  criteria: CriterionPoint[];
  supplementary: CriterionPoint[];
  initialAnswers: SelfAssessmentAnswers | RatingAnswers | null | undefined;
  mode: "self" | "reviewer" | "management";
  onSaveDraft: (answers: SelfAssessmentAnswers | RatingAnswers) => Promise<void> | void;
  onSubmitFinal: (answers: SelfAssessmentAnswers | RatingAnswers) => Promise<void> | void;
  disabled?: boolean;
  selfTemplate?: AppraisalSelfFormTemplate;
  isResubmission?: boolean;
  submitLabel?: string;
  showDemoFill?: boolean;
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
      isResubmission={isResubmission}
      submitLabel={submitLabel}
      showDemoFill={showDemoFill}
    />
  );
}
