"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { EvaluatorRole } from "@/modules/ams/criteria-config";

type Phase = "SELF" | "REVIEWER" | "MANAGEMENT";

type Subtopic = {
  id: string;
  code: string;
  label: string;
  weight: number;
  order: number;
  maxPoints: number;
};

type QuestionType =
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "short_answer"
  | "paragraph"
  | "slider"
  | "linear_scale"
  | "rating"
  | "date"
  | "time";

type ResponseConfig = {
  startLabel: string;
  endLabel: string;
  increment: number;
};

type QuestionOption = {
  id: string;
  label: string;
};

type CriterionQuestion = {
  id: string;
  prompt: string;
  questionType: QuestionType;
  options: QuestionOption[];
  responseConfig: ResponseConfig;
};

type Topic = {
  id: string;
  code: string;
  label: string;
  description: string;
  order: number;
  weight: number;
  maxPoints: number;
  kind: string;
  reviewerOnly: boolean;
  questions: string[];
  questionType: QuestionType;
  responseConfig: ResponseConfig;
  questionItems: CriterionQuestion[];
  subtopics: Subtopic[];
  allowedRoles: EvaluatorRole[];
};

const PHASE_META: Record<Phase, { label: string; description: string }> = {
  SELF: { label: "Self Assessment", description: "Criteria employees evaluate themselves against." },
  REVIEWER: { label: "Reviewer", description: "Criteria used by managers and reviewers to rate employees." },
  MANAGEMENT: { label: "Management", description: "Criteria reserved for management-level review." },
};

const EVALUATOR_ROLES: { value: EvaluatorRole; label: string }[] = [
  { value: "MANAGEMENT", label: "Management" },
  { value: "MANAGER", label: "Manager" },
  { value: "TL", label: "Team Lead" },
  { value: "HR", label: "HR" },
];

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "short_answer", label: "Short answer" },
  { value: "paragraph", label: "Paragraph" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "checkboxes", label: "Checkboxes" },
  { value: "dropdown", label: "Dropdown" },
  { value: "slider", label: "Slider" },
  { value: "linear_scale", label: "Linear scale" },
  { value: "rating", label: "Rating" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
];

function hasOptions(type: QuestionType) {
  return type === "multiple_choice" || type === "checkboxes" || type === "dropdown";
}

function supportsResponseLabels(type: QuestionType) {
  return type === "slider" || type === "linear_scale" || type === "rating";
}

function getDefaultResponseConfig(type: QuestionType): ResponseConfig {
  switch (type) {
    case "slider":
      return { startLabel: "Low", endLabel: "High", increment: 5 };
    case "linear_scale":
      return { startLabel: "Low", endLabel: "High", increment: 5 };
    case "rating":
      return { startLabel: "Poor", endLabel: "Excellent", increment: 5 };
    default:
      return { startLabel: "", endLabel: "", increment: 5 };
  }
}

function normalizeIncrement(value: number | undefined, fallback = 5) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(2, Math.round(value as number));
}

function parseIncrementInput(value: string, fallback = 5) {
  if (value.trim() === "") return fallback;
  return normalizeIncrement(Number(value), fallback);
}

function createQuestionOption(label = ""): QuestionOption {
  return {
    id: `__option_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label,
  };
}

function createQuestion(): CriterionQuestion {
  return {
    id: `__question_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    prompt: "",
    questionType: "short_answer",
    options: [],
    responseConfig: getDefaultResponseConfig("short_answer"),
  };
}

function normalizeQuestionItems(questionItems: CriterionQuestion[]) {
  return questionItems.map((question, index) => ({
    ...question,
    id: question.id || `question-${index + 1}`,
    options: (question.options ?? []).map((option, optionIndex) => ({
      ...option,
      id: option.id || `option-${optionIndex + 1}`,
    })),
    responseConfig: {
      startLabel: question.responseConfig?.startLabel ?? "",
      endLabel: question.responseConfig?.endLabel ?? "",
      increment: normalizeIncrement(question.responseConfig?.increment, getDefaultResponseConfig(question.questionType).increment),
    },
  }));
}

function withOrderedSubtopics(subtopics: Subtopic[]) {
  return subtopics.map((subtopic, index) => ({ ...subtopic, order: index }));
}

function withOrderedTopics(topics: Topic[]) {
  return topics.map((topic, index) => ({ ...topic, order: index }));
}

function reorderTopics(topics: Topic[], sourceId: string, targetId: string) {
  if (sourceId === targetId) return topics;

  const sourceIndex = topics.findIndex((topic) => topic.id === sourceId);
  const targetIndex = topics.findIndex((topic) => topic.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return topics;

  const next = [...topics];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

async function apiPatch(id: string, data: Record<string, unknown>) {
  const res = await fetch("/api/ams/criteria", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) throw new Error("Failed to update");
}

async function apiCreate(data: Record<string, unknown>) {
  const res = await fetch("/api/ams/criteria", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create");
  const payload = await res.json() as { id?: string; data?: { id?: string } };
  const id = payload.id ?? payload.data?.id;
  if (!id) throw new Error("Create response missing id");
  return { id };
}

async function apiDelete(id: string) {
  const res = await fetch("/api/ams/criteria", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("Failed to delete");
}

async function apiDeleteAll() {
  const res = await fetch("/api/ams/criteria", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clearAll: true }),
  });
  if (!res.ok) throw new Error("Failed to clear all criteria");
}

function DragDots() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" className="text-outline-variant">
      <circle cx="6" cy="5" r="1.5" />
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="6" cy="9" r="1.5" />
      <circle cx="12" cy="9" r="1.5" />
      <circle cx="6" cy="13" r="1.5" />
      <circle cx="12" cy="13" r="1.5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function ScrollArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconButton({
  title,
  onClick,
  disabled,
  className,
  children,
}: {
  title: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant/50 bg-surface-container-low text-on-surface-variant transition hover:border-secondary/25 hover:bg-surface hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
    >
      {children}
    </button>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  stopProp = true,
  className,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  stopProp?: boolean;
  className?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-on-surface-variant">{label}</span>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        onClick={stopProp ? (event) => event.stopPropagation() : undefined}
        className={cn("h-10 rounded-lg border-outline-variant/60 bg-surface px-3 py-2 text-sm", className)}
      />
    </label>
  );
}

function getNumericInputDisplayValue(value: number, emptyWhen: number[]) {
  return emptyWhen.includes(value) ? "" : String(value);
}

function getPhaseChrome(phase: Phase) {
  switch (phase) {
    case "SELF":
      return {
        border: "border-l-[#00cec4]",
        accent: "border-[#00cec4]/30",
        tint: "bg-[#00cec4]/[0.045]",
        header: "bg-[#00cec4]/[0.06]",
        ring: "ring-[#00cec4]/15",
        shadow: "shadow-[0_16px_32px_-24px_rgba(0,206,196,0.35)]",
      };
    case "REVIEWER":
      return {
        border: "border-l-[#0051d5]",
        accent: "border-[#0051d5]/25",
        tint: "bg-[#0051d5]/[0.035]",
        header: "bg-[#0051d5]/[0.05]",
        ring: "ring-[#0051d5]/12",
        shadow: "shadow-[0_16px_32px_-24px_rgba(0,81,213,0.28)]",
      };
    case "MANAGEMENT":
      return {
        border: "border-l-[#ff9b40]",
        accent: "border-[#ff9b40]/30",
        tint: "bg-[#ff9b40]/[0.05]",
        header: "bg-[#ff9b40]/[0.08]",
        ring: "ring-[#ff9b40]/12",
        shadow: "shadow-[0_16px_32px_-24px_rgba(255,155,64,0.3)]",
      };
  }
}

function RoleCheckboxes({
  title = "Visible to roles",
  value,
  onChange,
}: {
  title?: string;
  value: EvaluatorRole[];
  onChange: (next: EvaluatorRole[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-on-surface-variant">{title}</p>
      <div className="flex flex-wrap gap-2">
        {EVALUATOR_ROLES.map(({ value: role, label }) => {
          const checked = value.includes(role);
          return (
            <label
              key={role}
              onClick={(event) => event.stopPropagation()}
              className={cn(
                "flex cursor-pointer select-none items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition",
                checked
                  ? "border-primary/40 bg-primary/10 text-on-surface"
                  : "border-outline-variant/60 bg-surface text-on-surface-variant hover:border-primary/30",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? value.filter((entry) => entry !== role) : [...value, role])}
                className="hidden"
              />
              <div className={cn("flex h-3.5 w-3.5 items-center justify-center rounded border transition", checked ? "border-primary bg-primary" : "border-outline-variant")}>
                {checked ? (
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 5 4.5 7.5 8 3" />
                  </svg>
                ) : null}
              </div>
              {label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function QuestionOptionRow({
  option,
  index,
  onChange,
  onDelete,
}: {
  option: QuestionOption;
  index: number;
  onChange: (next: QuestionOption) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-outline-variant/40 bg-surface px-3 py-2.5">
      <div className="h-4 w-4 rounded-full border-2 border-outline-variant" />
      <Input
        type="text"
        value={option.label}
        onChange={(event) => onChange({ ...option, label: event.target.value })}
        placeholder={`Option ${index + 1}`}
        onClick={(event) => event.stopPropagation()}
        className="h-9 flex-1 border-0 bg-transparent px-0 py-0 text-sm shadow-none focus:ring-0 hover:border-transparent"
      />
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onDelete(); }}
        className="p-1 text-on-surface-variant hover:text-red-500"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function QuestionRow({
  question,
  index,
  onChange,
  onDelete,
}: {
  question: CriterionQuestion;
  index: number;
  onChange: (next: CriterionQuestion) => void;
  onDelete: () => void;
}) {
  const optionCapable = hasOptions(question.questionType);
  const labelCapable = supportsResponseLabels(question.questionType);

  return (
    <div className="space-y-4 rounded-2xl border border-outline-variant/45 bg-surface px-4 py-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
        <FieldInput
          label={`Question ${index + 1}`}
          value={question.prompt}
          onChange={(value) => onChange({ ...question, prompt: value })}
          placeholder="Type the question prompt"
        />
        <div className="w-full shrink-0 lg:w-56">
          <p className="mb-1.5 text-xs font-medium text-on-surface-variant">Response type</p>
          <DropdownSelect
            value={question.questionType}
            onValueChange={(value) => {
              const nextType = value as QuestionType;
              onChange({
                ...question,
                questionType: nextType,
                options: hasOptions(nextType)
                  ? (optionCapable ? question.options : [createQuestionOption(), createQuestionOption()])
                  : [],
                responseConfig: supportsResponseLabels(nextType)
                  ? (labelCapable ? question.responseConfig : getDefaultResponseConfig(nextType))
                  : getDefaultResponseConfig(nextType),
              });
            }}
            options={QUESTION_TYPES.map((entry) => ({ value: entry.value, label: entry.label }))}
            ariaLabel={`Question ${index + 1} response type`}
            triggerClassName="h-10 border-outline-variant/60 bg-surface-container-low text-sm shadow-none hover:shadow-none"
          />
        </div>
        <div className="flex items-end">
          <IconButton title="Delete question" onClick={(event) => { event.stopPropagation(); onDelete(); }} className="hover:border-red-200 hover:text-red-600">
            <TrashIcon />
          </IconButton>
        </div>
      </div>

      {optionCapable ? (
        <div className="space-y-3 rounded-2xl border border-outline-variant/35 bg-surface-container-low px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-on-surface">Options</p>
              <p className="text-xs text-on-surface-variant">Add the choices for this question.</p>
            </div>
            <Button
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onChange({ ...question, options: [...question.options, createQuestionOption()] });
              }}
              className="border-0 bg-[#00cec4] text-white shadow-[0_14px_28px_-18px_rgba(0,174,198,0.45)] hover:bg-[#00b8af]"
            >
              Add option
            </Button>
          </div>
          <div className="space-y-2">
            {question.options.map((option, optionIndex) => (
              <QuestionOptionRow
                key={option.id}
                option={option}
                index={optionIndex}
                onChange={(nextOption) => onChange({
                  ...question,
                  options: question.options.map((entry, currentIndex) => currentIndex === optionIndex ? nextOption : entry),
                })}
                onDelete={() => onChange({
                  ...question,
                  options: question.options.filter((_, currentIndex) => currentIndex !== optionIndex),
                })}
              />
            ))}
          </div>
        </div>
      ) : null}

      {labelCapable ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <FieldInput
            label="Start label"
            value={question.responseConfig.startLabel}
            onChange={(value) => onChange({ ...question, responseConfig: { ...question.responseConfig, startLabel: value } })}
            placeholder={getDefaultResponseConfig(question.questionType).startLabel || "Start"}
          />
          <FieldInput
            label="End label"
            value={question.responseConfig.endLabel}
            onChange={(value) => onChange({ ...question, responseConfig: { ...question.responseConfig, endLabel: value } })}
            placeholder={getDefaultResponseConfig(question.questionType).endLabel || "End"}
          />
          <FieldInput
            label="Increment"
            value={question.responseConfig.increment}
            onChange={(value) => onChange({
              ...question,
              responseConfig: { ...question.responseConfig, increment: parseIncrementInput(value, getDefaultResponseConfig(question.questionType).increment) },
            })}
            type="number"
            placeholder={String(getDefaultResponseConfig(question.questionType).increment)}
          />
        </div>
      ) : null}
    </div>
  );
}

function CriterionCard({
  topic,
  phase,
  isActive,
  dragging,
  onActivate,
  onTopicChange,
  onSave,
  onDelete,
  onHandleClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragTarget,
  saving,
  dirty,
}: {
  topic: Topic;
  phase: Phase;
  isActive: boolean;
  dragging: boolean;
  onActivate: () => void;
  onTopicChange: (next: Topic) => void;
  onSave: () => void;
  onDelete: () => void;
  onHandleClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  isDragTarget: boolean;
  saving: boolean;
  dirty: boolean;
}) {
  const chrome = getPhaseChrome(phase);

  return (
    <div
      data-card-id={topic.id}
      onClick={onActivate}
      onDragOver={(event) => { event.preventDefault(); onDragOver(); }}
      onDrop={(event) => { event.preventDefault(); onDrop(); }}
      className={cn(
        "relative cursor-pointer overflow-hidden rounded-2xl border-l-4 border-y border-r bg-white transition-all duration-200 ease-out",
        chrome.border,
        isActive
          ? cn(chrome.accent, chrome.shadow, chrome.ring, "ring-1")
          : "border-outline-variant/60 shadow-ambient hover:shadow-ambient-hover",
        isDragTarget ? "border-dashed scale-[1.01]" : "",
        dragging ? "z-20 scale-[1.02] opacity-85 shadow-[0_24px_40px_-24px_rgba(15,23,42,0.35)]" : "",
      )}
    >
      <div className="flex items-center justify-between border-b border-outline-variant/35 bg-white px-5 py-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-on-surface-variant">
          <button
            type="button"
            draggable
            aria-label="Drag to reorder or click to collapse"
            title="Drag to reorder or click to collapse"
            onClick={(event) => { event.stopPropagation(); onHandleClick(); }}
            onDragStart={(event) => { event.stopPropagation(); onDragStart(); }}
            onDragEnd={(event) => { event.stopPropagation(); onDragEnd(); }}
            className="inline-flex h-8 w-8 cursor-grab items-center justify-center text-outline-variant transition hover:text-[#008b85] active:cursor-grabbing"
          >
            <DragDots />
          </button>
          <span>Criterion</span>
        </div>
      </div>

      <div className="space-y-5 bg-white px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-on-surface-variant">Criteria Name</p>
            {isActive ? (
              <Input
                type="text"
                value={topic.label}
                onChange={(event) => onTopicChange({ ...topic, label: event.target.value })}
                placeholder="Criterion title"
                onClick={(event) => event.stopPropagation()}
                className="h-12 rounded-xl border-outline-variant/60 bg-surface-container-low px-4 text-base font-medium"
              />
            ) : (
              <p className="rounded-xl bg-surface-container-low px-4 py-3 text-base font-medium text-on-surface">
                {topic.label || <span className="italic text-on-surface-variant">Untitled criterion</span>}
              </p>
            )}
          </div>
        </div>

        {isActive ? (
          <>
            <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low px-4 py-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-on-surface">Questions</p>
                  <p className="text-xs text-on-surface-variant">Add questions and choose the response type for each one individually.</p>
                </div>
                <Button
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onTopicChange({
                      ...topic,
                      questionItems: normalizeQuestionItems([...topic.questionItems, createQuestion()]),
                    });
                  }}
                  className="border-0 bg-[#00cec4] text-white shadow-[0_14px_28px_-18px_rgba(0,174,198,0.45)] hover:bg-[#00b8af]"
                >
                  Add question
                </Button>
              </div>
              <div className="space-y-3">
                {topic.questionItems.map((question, index) => (
                  <QuestionRow
                    key={question.id}
                    question={question}
                    index={index}
                    onChange={(nextQuestion) => onTopicChange({
                      ...topic,
                      questionItems: normalizeQuestionItems(
                        topic.questionItems.map((entry, currentIndex) => currentIndex === index ? nextQuestion : entry),
                      ),
                    })}
                    onDelete={() => onTopicChange({
                      ...topic,
                      questionItems: normalizeQuestionItems(
                        topic.questionItems.filter((_, currentIndex) => currentIndex !== index),
                      ),
                    })}
                  />
                ))}
              </div>
              {topic.questionItems.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-outline-variant/60 bg-surface px-4 py-6 text-center text-sm text-on-surface-variant">
                  No questions yet. Add the first question and choose its response type.
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-on-surface-variant">Description</span>
                <textarea
                  value={topic.description}
                  onChange={(event) => onTopicChange({ ...topic, description: event.target.value })}
                  placeholder="Add a short explanation or instructions for this criterion."
                  rows={4}
                  onClick={(event) => event.stopPropagation()}
                  className="min-h-28 w-full resize-y rounded-xl border border-outline-variant/60 bg-surface px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                />
              </label>

              <div className="grid gap-3 rounded-2xl border border-outline-variant/50 bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_110px_110px] xl:w-[320px] xl:grid-cols-1" onClick={(event) => event.stopPropagation()}>
                <FieldInput label="Code" value={topic.code} onChange={(value) => onTopicChange({ ...topic, code: value })} placeholder="C1" />
                <FieldInput
                  label="Weightage"
                  value={getNumericInputDisplayValue(topic.weight, [1])}
                  onChange={(value) => onTopicChange({ ...topic, weight: value === "" ? 1 : Number(value) || 0 })}
                  type="number"
                  placeholder="Weightage"
                  className="h-9 px-2.5 text-sm"
                />
                <FieldInput
                  label="Max points"
                  value={getNumericInputDisplayValue(topic.maxPoints, [0])}
                  onChange={(value) => onTopicChange({ ...topic, maxPoints: value === "" ? 0 : Number(value) || 0 })}
                  type="number"
                  placeholder="Max points"
                  className="h-9 px-2.5 text-sm"
                />
              </div>
            </div>

            {phase === "REVIEWER" || phase === "MANAGEMENT" ? (
              <div className="rounded-2xl border border-outline-variant/50 bg-surface p-4" onClick={(event) => event.stopPropagation()}>
                <RoleCheckboxes
                  title={phase === "MANAGEMENT" ? "Eligible roles for rating" : "Visible to roles"}
                  value={topic.allowedRoles}
                  onChange={(next) => onTopicChange({ ...topic, allowedRoles: next })}
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-outline-variant/40 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <IconButton title="Delete" onClick={(event) => { event.stopPropagation(); onDelete(); }} className="hover:border-red-200 hover:text-red-600">
                  <TrashIcon />
                </IconButton>
              </div>
              <div className="flex items-center gap-3" onClick={(event) => event.stopPropagation()}>
                {dirty ? (
                  <Button
                    size="sm"
                    onClick={(event) => { event.stopPropagation(); onSave(); }}
                    disabled={saving}
                    className="border-0 bg-[#00cec4] text-white shadow-[0_14px_28px_-18px_rgba(0,174,198,0.45)] hover:bg-[#00b8af]"
                  >
                    {saving ? "Saving..." : "Save criterion"}
                  </Button>
                ) : (
                  <span className="text-xs font-medium text-on-surface-variant">Saved</span>
                )}
              </div>
            </div>
          </>
        ) : (
          (topic.subtopics.length > 0 || topic.questionItems.length > 0 || topic.description) ? (
            <p className="rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
              {topic.questionItems.length > 0
                ? `${topic.questionItems.length} question${topic.questionItems.length > 1 ? "s" : ""}`
                : topic.subtopics.length > 0
                ? `${topic.subtopics.length} sub-criterion${topic.subtopics.length > 1 ? "a" : ""}`
                : topic.description.slice(0, 80) + (topic.description.length > 80 ? "..." : "")}
            </p>
          ) : null
        )}
      </div>
    </div>
  );
}

function InlineAddCriterion({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-outline-variant/60 bg-surface-container-low px-4 py-4">
      <button
        type="button"
        onClick={onAdd}
        aria-label="Add criterion below"
        title="Add criterion below"
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#00cec4] text-white shadow-[0_14px_28px_-18px_rgba(0,174,198,0.45)] transition hover:scale-105 hover:bg-[#00b8af]"
      >
        <PlusIcon />
      </button>
    </div>
  );
}

function ScrollToBottomButton({ onClick, visible }: { onClick: () => void; visible: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scroll to bottom"
      className={cn(
        "fixed bottom-6 right-6 z-20 inline-flex items-center gap-2 rounded-full border border-[#00cec4]/10 bg-[#00cec4]/4.5 px-4 py-2 text-xs font-medium text-slate-500 backdrop-blur-[6px] transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-[#00cec4]/25 hover:bg-[#00cec4]/9 hover:text-slate-700 hover:shadow-[0_12px_28px_-20px_rgba(0,206,196,0.55)]",
        visible ? "opacity-80" : "pointer-events-none opacity-0 translate-y-2",
      )}
    >
      <span>Scroll to bottom</span>
      <ScrollArrowIcon />
    </button>
  );
}

function PhaseHeader({ phase }: { phase: Phase }) {
  const meta = PHASE_META[phase];
  const chrome = getPhaseChrome(phase);
  const icons: Record<Phase, React.ReactNode> = {
    SELF: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[#00cec4]">
        <circle cx="12" cy="8" r="4" />
        <path d="M6 20v-1a6 6 0 0 1 12 0v1" />
      </svg>
    ),
    REVIEWER: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[#0051d5]">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    MANAGEMENT: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[#ff9b40]">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  };

  return (
    <div className={cn("rounded-xl border border-outline-variant/60 border-l-4 bg-surface px-6 py-5 shadow-ambient", chrome.border)}>
      <div className="flex items-center gap-3">
        {icons[phase]}
        <div>
          <h2 className="ds-h2 text-on-surface">{meta.label} Criteria</h2>
          <p className="mt-0.5 text-sm text-on-surface-variant">{meta.description}</p>
        </div>
      </div>
    </div>
  );
}

export function CriteriaClient({
  selfTree,
  reviewerTree,
  mgmtTree,
}: {
  selfTree: Topic[];
  reviewerTree: Topic[];
  mgmtTree: Topic[];
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("SELF");
  const [topicMap, setTopicMap] = useState<Record<Phase, Topic[]>>({
    SELF: withOrderedTopics(selfTree.map((topic) => ({
      ...topic,
      questionType: topic.questionType ?? "multiple_choice",
      responseConfig: {
        startLabel: topic.responseConfig?.startLabel ?? getDefaultResponseConfig(topic.questionType ?? "multiple_choice").startLabel,
        endLabel: topic.responseConfig?.endLabel ?? getDefaultResponseConfig(topic.questionType ?? "multiple_choice").endLabel,
        increment: normalizeIncrement(topic.responseConfig?.increment, getDefaultResponseConfig(topic.questionType ?? "multiple_choice").increment),
      },
      questionItems: normalizeQuestionItems(topic.questionItems ?? []),
    }))),
    REVIEWER: withOrderedTopics(reviewerTree.map((topic) => ({
      ...topic,
      questionType: topic.questionType ?? "multiple_choice",
      responseConfig: {
        startLabel: topic.responseConfig?.startLabel ?? getDefaultResponseConfig(topic.questionType ?? "multiple_choice").startLabel,
        endLabel: topic.responseConfig?.endLabel ?? getDefaultResponseConfig(topic.questionType ?? "multiple_choice").endLabel,
        increment: normalizeIncrement(topic.responseConfig?.increment, getDefaultResponseConfig(topic.questionType ?? "multiple_choice").increment),
      },
      questionItems: normalizeQuestionItems(topic.questionItems ?? []),
    }))),
    MANAGEMENT: withOrderedTopics(mgmtTree.map((topic) => ({
      ...topic,
      questionType: topic.questionType ?? "multiple_choice",
      responseConfig: {
        startLabel: topic.responseConfig?.startLabel ?? getDefaultResponseConfig(topic.questionType ?? "multiple_choice").startLabel,
        endLabel: topic.responseConfig?.endLabel ?? getDefaultResponseConfig(topic.questionType ?? "multiple_choice").endLabel,
        increment: normalizeIncrement(topic.responseConfig?.increment, getDefaultResponseConfig(topic.questionType ?? "multiple_choice").increment),
      },
      questionItems: normalizeQuestionItems(topic.questionItems ?? []),
    }))),
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const dragOrderRef = useRef<Topic[] | null>(null);

  const topics = topicMap[phase];

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (
        !target.closest("[data-card-id]") &&
        !target.closest("[data-dropdown-select-content]") &&
        !target.closest("[data-dropdown-select-trigger]")
      ) {
        setActiveId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleScroll() {
      const documentHeight = document.documentElement.scrollHeight;
      const viewportBottom = window.scrollY + window.innerHeight;
      setShowScrollButton(documentHeight - viewportBottom > 280);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [phase, topics.length, activeId]);

  function setTopicsForPhase(currentPhase: Phase, next: Topic[]) {
    setTopicMap((previous) => ({ ...previous, [currentPhase]: withOrderedTopics(next) }));
  }

  function setTopics(next: Topic[]) {
    setTopicsForPhase(phase, next);
  }

  function markDirty(id: string) {
    setDirtyIds((previous) => new Set(previous).add(id));
  }

  function markClean(id: string) {
    setDirtyIds((previous) => {
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
  }

  function updateTopic(id: string, next: Topic) {
    setTopics(topics.map((topic) => (
      topic.id === id
        ? { ...next, subtopics: withOrderedSubtopics(next.subtopics), questionItems: normalizeQuestionItems(next.questionItems) }
        : topic
    )));
    markDirty(id);
  }

  async function saveTopic(topic: Topic) {
    setSavingIds((previous) => new Set(previous).add(topic.id));
    setError(null);

    try {
      await apiPatch(topic.id, {
        label: topic.label || "Untitled",
        code: topic.code.trim() ? topic.code.trim() : undefined,
        description: topic.description,
        weight: topic.weight,
        maxPoints: topic.maxPoints,
        order: topic.order,
        reviewerOnly: topic.reviewerOnly,
        questions: topic.questionItems.map((question) => question.prompt.trim()).filter(Boolean),
        meta: {
          allowedEvaluatorRoles: topic.allowedRoles,
          questionType: topic.questionType,
          responseConfig: topic.responseConfig,
          questionItems: topic.questionItems,
        },
      });

      for (const subtopic of topic.subtopics) {
        if (subtopic.id.startsWith("__new_")) {
          const created = await apiCreate({
            label: subtopic.label || "Option",
            code: subtopic.code.trim() ? subtopic.code.trim() : undefined,
            weight: subtopic.weight,
            maxPoints: subtopic.maxPoints,
            order: subtopic.order,
            parentId: topic.id,
            phase,
            kind: "CATEGORY",
          });
          setTopicMap((previous) => ({
            ...previous,
            [phase]: previous[phase].map((entry) => (
              entry.id === topic.id
                ? {
                    ...entry,
                    subtopics: entry.subtopics.map((current) => (current.id === subtopic.id ? { ...current, id: created.id } : current)),
                  }
                : entry
            )),
          }));
        } else {
          await apiPatch(subtopic.id, {
            label: subtopic.label || "Option",
            code: subtopic.code.trim() ? subtopic.code.trim() : undefined,
            weight: subtopic.weight,
            maxPoints: subtopic.maxPoints,
            order: subtopic.order,
          });
        }
      }

      markClean(topic.id);
      router.refresh();
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setSavingIds((previous) => {
        const next = new Set(previous);
        next.delete(topic.id);
        return next;
      });
    }
  }

  async function persistTopicOrder(next: Topic[]) {
    const ordered = withOrderedTopics(next);
    setTopicsForPhase(phase, ordered);
    setError(null);
    try {
      await Promise.all(ordered.map((topic) => apiPatch(topic.id, { order: topic.order })));
      router.refresh();
    } catch {
      setError("Section order could not be updated. Please try again.");
    }
  }

  async function moveTopicToTarget(topicId: string, targetId: string) {
    const next = dragOrderRef.current ?? reorderTopics(topics, topicId, targetId);
    setDraggingId(null);
    setDragTargetId(null);
    dragOrderRef.current = null;
    await persistTopicOrder(next);
    setActiveId(topicId);
  }

  async function deleteTopic(id: string) {
    if (!confirm("Delete this criterion? This cannot be undone.")) return;
    setError(null);
    try {
      await apiDelete(id);
      const next = withOrderedTopics(topics.filter((topic) => topic.id !== id));
      setTopics(next);
      if (activeId === id) {
        setActiveId(next.at(-1)?.id ?? null);
      }
      await Promise.all(next.map((topic) => apiPatch(topic.id, { order: topic.order })));
      router.refresh();
    } catch {
      setError("Delete failed. Please try again.");
    }
  }

  async function addCriterion() {
    setError(null);
    try {
      const created = await apiCreate({
        label: "New Criterion",
        description: "",
        weight: 1,
        maxPoints: 0,
        reviewerOnly: false,
        kind: "CATEGORY",
        phase,
        order: topics.length,
        meta: {
          allowedEvaluatorRoles: [],
          questionType: "multiple_choice",
          responseConfig: getDefaultResponseConfig("multiple_choice"),
          questionItems: [],
        },
      });

      const newTopic: Topic = {
        id: created.id,
        label: "New Criterion",
        code: "",
        description: "",
        weight: 1,
        maxPoints: 0,
        kind: "CATEGORY",
        reviewerOnly: false,
        questions: [],
        questionType: "multiple_choice",
        responseConfig: getDefaultResponseConfig("multiple_choice"),
        questionItems: [],
        subtopics: [],
        allowedRoles: [],
        order: topics.length,
      };

      setTopics([...topics, newTopic]);
      setActiveId(created.id);
      markDirty(created.id);
    } catch {
      setError("Failed to add criterion.");
    }
  }

  async function clearAllCriteria() {
    if (topics.length === 0 && Object.values(topicMap).every((entries) => entries.length === 0)) return;
    if (!confirm("Clear all AMS criteria across self, reviewer, and management phases? This cannot be undone.")) return;

    setIsClearingAll(true);
    setError(null);
    try {
      await apiDeleteAll();
      setTopicMap({ SELF: [], REVIEWER: [], MANAGEMENT: [] });
      setActiveId(null);
      setDirtyIds(new Set());
      setSavingIds(new Set());
      router.refresh();
    } catch {
      setError("Failed to clear all criteria.");
    } finally {
      setIsClearingAll(false);
    }
  }

  function scrollToBottom() {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }

  return (
    <div ref={containerRef} className="space-y-5 pb-10">
      <div>
        <h1 className="ds-h1 text-on-surface">Appraisal Criteria</h1>
        <p className="text-sm text-on-surface-variant">Configure evaluation criteria for each appraisal phase.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit gap-1 rounded-xl bg-surface-container p-1">
          {(["SELF", "REVIEWER", "MANAGEMENT"] as Phase[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => { setPhase(value); setActiveId(null); }}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition",
                phase === value ? "bg-surface text-on-surface shadow-ambient" : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {PHASE_META[value].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => void addCriterion()}
            className="border-0 bg-[#00cec4] text-white shadow-[0_14px_28px_-18px_rgba(0,174,198,0.45)] hover:bg-[#00b8af]"
          >
            Add criterion
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void clearAllCriteria()}
            disabled={isClearingAll || Object.values(topicMap).every((entries) => entries.length === 0)}
            className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isClearingAll ? "Clearing..." : "Clear all criteria"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="space-y-4">
        <PhaseHeader phase={phase} />

        {topics.length === 0 ? (
          <div className="cursor-pointer rounded-2xl border-2 border-dashed border-outline-variant/60 py-16 text-center transition hover:border-secondary/40" onClick={() => void addCriterion()}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mx-auto mb-2 text-on-surface-variant">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <p className="text-sm text-on-surface-variant">No criteria yet. Click to add the first one.</p>
          </div>
        ) : (
          topics.map((topic, index) => {
            const showInlineAdd = activeId ? activeId === topic.id : index === topics.length - 1;
            return (
              <div key={topic.id} className="space-y-3">
                <CriterionCard
                  topic={topic}
                  phase={phase}
                  isActive={activeId === topic.id}
                  dragging={draggingId === topic.id}
                  onActivate={() => setActiveId(topic.id)}
                  onTopicChange={(next) => updateTopic(topic.id, next)}
                  onSave={() => void saveTopic(topicMap[phase].find((entry) => entry.id === topic.id) ?? topic)}
                  onDelete={() => void deleteTopic(topic.id)}
                  onHandleClick={() => { setActiveId(activeId === topic.id ? null : topic.id); }}
                  onDragStart={() => {
                    setDraggingId(topic.id);
                    setDragTargetId(topic.id);
                    dragOrderRef.current = topicMap[phase];
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDragTargetId(null);
                    dragOrderRef.current = null;
                  }}
                  onDragOver={() => {
                    if (draggingId && draggingId !== topic.id) {
                      setDragTargetId(topic.id);
                      const reordered = reorderTopics(topicMap[phase], draggingId, topic.id);
                      dragOrderRef.current = reordered;
                      setTopicsForPhase(phase, reordered);
                    }
                  }}
                  onDrop={() => {
                    if (draggingId) {
                      void moveTopicToTarget(draggingId, topic.id);
                    }
                  }}
                  isDragTarget={draggingId !== null && dragTargetId === topic.id && draggingId !== topic.id}
                  saving={savingIds.has(topic.id)}
                  dirty={dirtyIds.has(topic.id)}
                />
                {showInlineAdd ? <InlineAddCriterion onAdd={() => void addCriterion()} /> : null}
              </div>
            );
          })
        )}
      </div>

      <ScrollToBottomButton visible={showScrollButton} onClick={scrollToBottom} />
    </div>
  );
}
