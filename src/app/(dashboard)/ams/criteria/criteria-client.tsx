"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { EvaluatorRole } from "@/modules/ams/criteria-config";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash,
  Scale,
  Award,
  ListPlus,
  Eye,
  Edit3,
  ArrowUp,
  ArrowDown,
  Copy,
  RotateCcw,
  Upload,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Printer,
  FileText,
  FileDown,
} from "lucide-react";

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
  isExpanded?: boolean;
};

type SandboxScore = Record<string, number>;
type SandboxComment = Record<string, string>;

// ─── Phase metadata ───────────────────────────────────────────

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

// ─── Pure helpers ─────────────────────────────────────────────

function hasOptions(type: QuestionType) {
  return type === "multiple_choice" || type === "checkboxes" || type === "dropdown";
}

function supportsResponseLabels(type: QuestionType) {
  return type === "slider" || type === "linear_scale" || type === "rating";
}

function getDefaultResponseConfig(type: QuestionType): ResponseConfig {
  switch (type) {
    case "slider":
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
  return { id: `__option_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, label };
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
  return questionItems.map((q, i) => ({
    ...q,
    id: q.id || `question-${i + 1}`,
    options: (q.options ?? []).map((o, oi) => ({ ...o, id: o.id || `option-${oi + 1}` })),
    responseConfig: {
      startLabel: q.responseConfig?.startLabel ?? "",
      endLabel: q.responseConfig?.endLabel ?? "",
      increment: normalizeIncrement(q.responseConfig?.increment, getDefaultResponseConfig(q.questionType).increment),
    },
  }));
}

function withOrderedSubtopics(subtopics: Subtopic[]) {
  return subtopics.map((s, i) => ({ ...s, order: i }));
}

function withOrderedTopics(topics: Topic[]) {
  return topics.map((t, i) => ({ ...t, order: i }));
}

function reorderTopics(topics: Topic[], sourceId: string, targetId: string) {
  if (sourceId === targetId) return topics;
  const si = topics.findIndex((t) => t.id === sourceId);
  const ti = topics.findIndex((t) => t.id === targetId);
  if (si < 0 || ti < 0) return topics;
  const next = [...topics];
  const [moved] = next.splice(si, 1);
  next.splice(ti, 0, moved);
  return next;
}

function getNumericInputDisplayValue(value: number, emptyWhen: number[]) {
  return emptyWhen.includes(value) ? "" : String(value);
}

// ─── API helpers ──────────────────────────────────────────────

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

// ─── Phase chrome (border/accent colors only, using system palette) ──

function getPhaseChrome(phase: Phase) {
  switch (phase) {
    case "SELF":
      return {
        border: "border-l-[#00cec4]",
        accent: "border-[#00cec4]/30",
        shadow: "shadow-[0_16px_32px_-24px_rgba(0,206,196,0.25)]",
        ring: "ring-[#00cec4]/15",
      };
    case "REVIEWER":
      return {
        border: "border-l-secondary",
        accent: "border-secondary/25",
        shadow: "shadow-[0_16px_32px_-24px_rgba(0,81,213,0.2)]",
        ring: "ring-secondary/12",
      };
    case "MANAGEMENT":
      return {
        border: "border-l-on-tertiary-container",
        accent: "border-on-tertiary-container/30",
        shadow: "shadow-[0_16px_32px_-24px_rgba(255,155,64,0.2)]",
        ring: "ring-on-tertiary-container/12",
      };
  }
}

// ─── Role checkboxes ──────────────────────────────────────────

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
      <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">{title}</p>
      <div className="flex flex-wrap gap-2">
        {EVALUATOR_ROLES.map(({ value: role, label }) => {
          const checked = value.includes(role);
          return (
            <label
              key={role}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "flex cursor-pointer select-none items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
                checked
                  ? "border-primary/40 bg-primary/10 text-on-surface"
                  : "border-outline-variant/60 bg-surface text-on-surface-variant hover:border-primary/30",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? value.filter((e) => e !== role) : [...value, role])}
                className="hidden"
              />
              <div className={cn("flex h-3.5 w-3.5 items-center justify-center rounded border transition", checked ? "border-primary bg-primary" : "border-outline-variant")}>
                {checked && (
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 5 4.5 7.5 8 3" />
                  </svg>
                )}
              </div>
              {label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ─── Question option row ──────────────────────────────────────

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
    <div className="flex items-center gap-2">
      <Input
        type="text"
        value={option.label}
        onChange={(e) => onChange({ ...option, label: e.target.value })}
        placeholder={`Option ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
        className="flex-1 h-8 rounded-lg border-outline-variant/60 bg-surface px-3 text-sm text-on-surface"
      />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-1 px-1.5 text-on-surface-variant hover:text-red-500 bg-surface border border-outline-variant/40 hover:bg-red-50 rounded-lg cursor-pointer transition"
        title="Remove option"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Question row ─────────────────────────────────────────────

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
    <div className="rounded-xl border border-outline-variant/45 bg-surface px-4 py-4 space-y-3 transition hover:border-outline-variant">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Prompt */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="font-mono text-[9px] bg-on-surface text-surface px-1.5 py-0.5 rounded uppercase tracking-wider">
              Q{index + 1}
            </span>
            <span className="text-xs text-on-surface-variant">Evaluation prompt</span>
          </div>
          <Input
            type="text"
            value={question.prompt}
            onChange={(e) => onChange({ ...question, prompt: e.target.value })}
            placeholder="Type the question prompt here…"
            onClick={(e) => e.stopPropagation()}
            className="w-full h-9 text-sm text-on-surface bg-surface-container-low px-3 rounded-xl border-outline-variant/60"
          />
        </div>

        {/* Type + delete */}
        <div className="flex items-center gap-2 shrink-0 sm:pt-[26px]">
          <div className="w-[160px]">
            <DropdownSelect
              value={question.questionType}
              onValueChange={(val) => {
                const nextType = val as QuestionType;
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
              options={QUESTION_TYPES.map((e) => ({ value: e.value, label: e.label }))}
              ariaLabel={`Question ${index + 1} response type`}
              triggerClassName="h-9 border-outline-variant/60 bg-surface-container-low text-sm shadow-none hover:shadow-none"
            />
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 text-on-surface-variant hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition cursor-pointer"
            title="Delete question"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Options (MCQ) */}
      {optionCapable && (
        <div className="pl-4 py-3 border-l-2 border-dashed border-outline-variant/50 bg-surface-container-low rounded-xl space-y-2">
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-1.5">
            <span className="text-xs text-on-surface-variant">Answer options</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ ...question, options: [...question.options, createQuestionOption()] });
              }}
              className="px-2.5 py-1 rounded text-xs text-[#00cec4] bg-[#00cec4]/8 hover:bg-[#00cec4]/15 border border-[#00cec4]/20 transition cursor-pointer"
            >
              + Add option
            </button>
          </div>
          <div className="space-y-1.5">
            {question.options.map((opt, oi) => (
              <QuestionOptionRow
                key={opt.id}
                option={opt}
                index={oi}
                onChange={(next) => onChange({ ...question, options: question.options.map((o, ci) => ci === oi ? next : o) })}
                onDelete={() => onChange({ ...question, options: question.options.filter((_, ci) => ci !== oi) })}
              />
            ))}
          </div>
          {question.options.length === 0 && (
            <p className="text-xs text-on-surface-variant italic py-1">No options yet — add at least two choices.</p>
          )}
        </div>
      )}

      {/* Scale labels */}
      {labelCapable && (
        <div className="grid gap-3 sm:grid-cols-3">
          {(["startLabel", "endLabel"] as const).map((field) => (
            <label key={field} className="flex flex-col gap-1">
              <span className="text-xs text-on-surface-variant capitalize">{field === "startLabel" ? "Start label" : "End label"}</span>
              <Input
                type="text"
                value={question.responseConfig[field]}
                onChange={(e) => onChange({ ...question, responseConfig: { ...question.responseConfig, [field]: e.target.value } })}
                placeholder={getDefaultResponseConfig(question.questionType)[field] || (field === "startLabel" ? "Start" : "End")}
                onClick={(e) => e.stopPropagation()}
                className="h-8 rounded-lg border-outline-variant/60 bg-surface text-sm"
              />
            </label>
          ))}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant">Increment</span>
            <Input
              type="number"
              value={question.responseConfig.increment}
              onChange={(e) => onChange({
                ...question,
                responseConfig: { ...question.responseConfig, increment: parseIncrementInput(e.target.value, getDefaultResponseConfig(question.questionType).increment) },
              })}
              placeholder={String(getDefaultResponseConfig(question.questionType).increment)}
              onClick={(e) => e.stopPropagation()}
              className="h-8 rounded-lg border-outline-variant/60 bg-surface text-sm"
            />
          </label>
        </div>
      )}
    </div>
  );
}

// ─── Criterion card ───────────────────────────────────────────

function CriterionCard({
  topic,
  phase,
  index,
  totalCount,
  dragging,
  isDragTarget,
  saving,
  dirty,
  onTopicChange,
  onSave,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  topic: Topic;
  phase: Phase;
  index: number;
  totalCount: number;
  dragging: boolean;
  isDragTarget: boolean;
  saving: boolean;
  dirty: boolean;
  onTopicChange: (next: Topic) => void;
  onSave: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
}) {
  const chrome = getPhaseChrome(phase);
  const isExpanded = topic.isExpanded !== false;
  const questionCount = topic.questionItems?.length || 0;

  return (
    <motion.div
      layoutId={topic.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
    >
      <div
        data-card-id={topic.id}
        onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
        onDrop={(e) => { e.preventDefault(); onDrop(); }}
        className={cn(
          "relative overflow-hidden rounded-2xl border-l-4 border-y border-r bg-surface transition-all duration-200",
          chrome.border,
          isDragTarget ? "border-dashed scale-[1.01]" : "border-outline-variant/60 shadow-ambient hover:shadow-ambient-hover",
          dragging ? "z-20 scale-[1.02] opacity-80 shadow-[0_24px_40px_-24px_rgba(15,23,42,0.3)]" : "",
        )}
      >
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-low px-4 md:px-5 py-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Reorder arrows */}
            <div className="flex items-center bg-surface rounded-lg border border-outline-variant/40 shrink-0">
              <button
                type="button"
                disabled={index === 0}
                onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                className="p-1 px-1.5 text-on-surface-variant hover:text-on-surface disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer"
                title="Move up"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <div className="h-3 w-px bg-outline-variant/50" />
              <button
                type="button"
                disabled={index === totalCount - 1}
                onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                className="p-1 px-1.5 text-on-surface-variant hover:text-on-surface disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer"
                title="Move down"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Code badge */}
            <span className="font-mono text-[10px] bg-on-surface text-surface px-2 py-0.5 rounded-md shrink-0">
              {topic.code || `C${index + 1}`}
            </span>

            {/* Collapsed summary / expanded label */}
            {!isExpanded ? (
              <div
                onClick={(e) => { e.stopPropagation(); onTopicChange({ ...topic, isExpanded: true }); }}
                className="flex items-center gap-2 cursor-pointer min-w-0 flex-1"
              >
                <span className="text-sm text-on-surface truncate">{topic.label || "Untitled criterion"}</span>
                <span className="text-xs text-[#00cec4] font-mono bg-[#00cec4]/8 border border-[#00cec4]/15 px-1.5 py-0.5 rounded shrink-0">
                  {topic.weight}× wt
                </span>
                <span className="text-xs text-secondary font-mono bg-secondary/8 border border-secondary/15 px-1.5 py-0.5 rounded shrink-0">
                  {topic.maxPoints} pts
                </span>
                {questionCount > 0 && (
                  <span className="hidden md:inline text-xs text-on-surface-variant shrink-0">
                    {questionCount} question{questionCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs uppercase tracking-widest text-on-surface-variant select-none">
                Criterion configuration
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {dirty && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onSave(); }}
                disabled={saving}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs text-white bg-[#00cec4] hover:bg-[#00b8af] border-0 shadow-sm transition disabled:opacity-60 cursor-pointer"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 text-on-surface-variant hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition cursor-pointer"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-secondary/8 border border-transparent hover:border-secondary/20 rounded-lg transition cursor-pointer"
              title="Duplicate"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onTopicChange({ ...topic, isExpanded: !isExpanded }); }}
              className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-transparent hover:border-outline-variant/40 rounded-lg transition cursor-pointer"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Expanded body */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="overflow-hidden bg-surface px-4 md:px-5 py-5 space-y-4"
            >
              {/* Name + code */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs uppercase tracking-widest text-on-surface-variant block">Criterion name</label>
                  <Input
                    type="text"
                    value={topic.label}
                    onChange={(e) => onTopicChange({ ...topic, label: e.target.value })}
                    placeholder="Criterion title"
                    onClick={(e) => e.stopPropagation()}
                    className="h-10 w-full rounded-xl border-outline-variant/60 bg-surface-container-low px-3.5 text-sm text-on-surface"
                  />
                </div>
                <div className="sm:col-span-1 space-y-1.5">
                  <label className="text-xs uppercase tracking-widest text-on-surface-variant block text-center">Ref code</label>
                  <Input
                    type="text"
                    value={topic.code}
                    onChange={(e) => onTopicChange({ ...topic, code: e.target.value })}
                    placeholder="e.g. C1"
                    onClick={(e) => e.stopPropagation()}
                    className="h-10 w-full rounded-xl border-outline-variant/60 bg-surface-container-low px-3 text-sm font-mono text-center uppercase text-on-surface"
                  />
                </div>
              </div>

              {/* Description + metrics */}
              <div className="grid gap-4 md:grid-cols-12">
                <div className="md:col-span-7 flex flex-col gap-1.5">
                  <span className="text-xs uppercase tracking-widest text-[#00cec4]">Description & guidelines</span>
                  <textarea
                    placeholder="Add explanations, instructions, or specific criteria points."
                    rows={4}
                    className="min-h-24 w-full resize-y rounded-xl border border-outline-variant/60 bg-surface-container-low px-3.5 py-2.5 text-sm text-on-surface outline-none transition focus:border-[#00cec4]/60 focus:ring-1 focus:ring-[#00cec4]/15 leading-relaxed"
                    value={topic.description}
                    onChange={(e) => onTopicChange({ ...topic, description: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div
                  className="md:col-span-5 grid grid-cols-2 gap-3.5 rounded-2xl border border-outline-variant/50 bg-surface-container-low p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-wide text-on-surface-variant block">Weightage</span>
                    <div className="relative">
                      <Input
                        type="number"
                        value={getNumericInputDisplayValue(topic.weight, [1])}
                        onChange={(e) => onTopicChange({ ...topic, weight: e.target.value === "" ? 1 : Number(e.target.value) || 0 })}
                        placeholder="Weight"
                        min={0}
                        className="h-9 w-full rounded-xl border-outline-variant/60 bg-surface px-2.5 pr-6 text-sm text-on-surface"
                      />
                      <span className="absolute right-2.5 top-2 text-xs text-on-surface-variant">×</span>
                    </div>
                    <p className="text-xs text-on-surface-variant">Impact weight</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-wide text-on-surface-variant block">Max points</span>
                    <Input
                      type="number"
                      value={getNumericInputDisplayValue(topic.maxPoints, [0])}
                      onChange={(e) => onTopicChange({ ...topic, maxPoints: e.target.value === "" ? 0 : Number(e.target.value) || 0 })}
                      placeholder="Points"
                      min={0}
                      className="h-9 w-full rounded-xl border-outline-variant/60 bg-surface px-2.5 text-sm text-on-surface"
                    />
                    <p className="text-xs text-on-surface-variant">Cap score</p>
                  </div>

                  <div className="col-span-2 pt-2.5 border-t border-outline-variant/30 text-xs">
                    {topic.questionItems.length === 0 ? (
                      <span className="text-on-surface-variant">No questions assigned yet.</span>
                    ) : (
                      <span className="text-[#00cec4] flex items-center gap-1">
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                        {topic.questionItems.length} question{topic.questionItems.length > 1 ? "s" : ""} configured
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Questions sub-module */}
              <div className="rounded-2xl border border-outline-variant/45 bg-surface-container-low p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-on-surface">Evaluation questions</p>
                    <p className="text-xs text-on-surface-variant">Add checkpoint parameters and choose a response type for each.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {topic.questionItems.length > 0 ? (
                    topic.questionItems.map((q, qi) => (
                      <QuestionRow
                        key={q.id}
                        question={q}
                        index={qi}
                        onChange={(next) => onTopicChange({
                          ...topic,
                          questionItems: normalizeQuestionItems(topic.questionItems.map((e, ci) => ci === qi ? next : e)),
                        })}
                        onDelete={() => onTopicChange({
                          ...topic,
                          questionItems: normalizeQuestionItems(topic.questionItems.filter((_, ci) => ci !== qi)),
                        })}
                      />
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-outline-variant/60 bg-surface px-4 py-8 text-center text-sm text-on-surface-variant">
                      No questions yet. Add the first evaluation question.
                    </div>
                  )}
                </div>

                <div
                  className="rounded-2xl border border-dashed border-outline-variant/50 hover:border-[#00cec4]/40 px-4 py-5 text-center transition duration-200 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTopicChange({
                      ...topic,
                      questionItems: normalizeQuestionItems([...topic.questionItems, createQuestion()]),
                    });
                  }}
                >
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-on-surface text-surface shadow-ambient hover:bg-[#00cec4] transition-all duration-200 hover:scale-105">
                    <Plus className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-widest text-on-surface-variant">Add question</p>
                </div>
              </div>

              {/* Role visibility */}
              {(phase === "REVIEWER" || phase === "MANAGEMENT") && (
                <div className="rounded-2xl border border-outline-variant/50 bg-surface p-4" onClick={(e) => e.stopPropagation()}>
                  <RoleCheckboxes
                    title={phase === "MANAGEMENT" ? "Eligible roles for rating" : "Visible to roles"}
                    value={topic.allowedRoles}
                    onChange={(next) => onTopicChange({ ...topic, allowedRoles: next })}
                  />
                </div>
              )}

              {/* Footer */}
              <div className="flex flex-col gap-3 border-t border-outline-variant/30 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-on-surface-variant">Changes are saved to the server on "Save".</span>
                <div className="flex items-center gap-2 self-end">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onTopicChange({ ...topic, isExpanded: false }); }}
                    className="inline-flex items-center rounded-xl border border-outline-variant/60 bg-surface text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-sm cursor-pointer h-8 px-3.5 transition"
                  >
                    Collapse
                  </button>
                  {dirty && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSave(); }}
                      disabled={saving}
                      className="inline-flex items-center h-8 px-4 rounded-xl text-sm text-white bg-[#00cec4] border-0 shadow-sm hover:bg-[#00b8af] transition disabled:opacity-60 cursor-pointer"
                    >
                      {saving ? "Saving…" : "Save criterion"}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Phase header ─────────────────────────────────────────────

function PhaseHeader({ phase }: { phase: Phase }) {
  const meta = PHASE_META[phase];
  const chrome = getPhaseChrome(phase);

  const phaseIcon: Record<Phase, React.ReactNode> = {
    SELF: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#00cec4]">
        <circle cx="12" cy="8" r="4" /><path d="M6 20v-1a6 6 0 0 1 12 0v1" />
      </svg>
    ),
    REVIEWER: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-secondary">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    MANAGEMENT: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-on-tertiary-container">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  };

  return (
    <div className={cn("rounded-xl border border-outline-variant/60 border-l-4 bg-surface px-6 py-5 shadow-ambient", chrome.border)}>
      <div className="flex items-center gap-3">
        {phaseIcon[phase]}
        <div>
          <h2 className="ds-h2 text-on-surface">{meta.label} Criteria</h2>
          <p className="mt-0.5 text-sm text-on-surface-variant">{meta.description}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Sandbox Evaluator ────────────────────────────────────────

function SandboxEvaluator({ topics, phase }: { topics: Topic[]; phase: Phase }) {
  const [sandboxScores, setSandboxScores] = useState<SandboxScore>({});
  const [sandboxComments, setSandboxComments] = useState<SandboxComment>({});
  const [overallNotes, setOverallNotes] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  const topicKey = topics.map((t) => t.id).join(",");

  useEffect(() => {
    const scores: SandboxScore = {};
    const comments: SandboxComment = {};
    topics.forEach((t) => t.questionItems.forEach((q) => { scores[q.id] = 0; comments[q.id] = ""; }));
    setSandboxScores(scores);
    setSandboxComments(comments);
    setOverallNotes("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, topicKey]);

  const totalMaxPoints = useMemo(() => topics.reduce((s, t) => s + t.maxPoints, 0), [topics]);
  const totalQuestions = useMemo(() => topics.reduce((s, t) => s + t.questionItems.length, 0), [topics]);

  const scoreReport = useMemo(() => {
    let earnedSum = 0;
    let maxSum = 0;
    const criterionScores: Record<string, { earned: number; max: number }> = {};

    topics.forEach((t) => {
      let critEarned = 0;
      let critMax = t.questionItems.length > 0 ? 0 : t.maxPoints;
      t.questionItems.forEach((q) => {
        const perQ = t.maxPoints / Math.max(t.questionItems.length, 1);
        critEarned += sandboxScores[q.id] ?? 0;
        critMax += perQ;
      });
      criterionScores[t.id] = { earned: critEarned, max: critMax };
      earnedSum += critEarned;
      maxSum += critMax;
    });

    const pct = maxSum > 0 ? (earnedSum / maxSum) * 100 : 0;

    let bracket = "Critical";
    let color = "text-red-500";
    let bgColor = "bg-red-50";
    let borderColor = "border-red-200";

    if (pct >= 90) { bracket = "Exceptional"; color = "text-emerald-600"; bgColor = "bg-emerald-50"; borderColor = "border-emerald-200"; }
    else if (pct >= 80) { bracket = "Strong & Compliant"; color = "text-[#00cec4]"; bgColor = "bg-[#00cec4]/8"; borderColor = "border-[#00cec4]/20"; }
    else if (pct >= 70) { bracket = "Meets Standards"; color = "text-amber-600"; bgColor = "bg-amber-50"; borderColor = "border-amber-200"; }
    else if (pct >= 50) { bracket = "Needs Development"; color = "text-orange-600"; bgColor = "bg-orange-50"; borderColor = "border-orange-200"; }

    return { earnedSum, maxSum, pct, criterionScores, bracket, color, bgColor, borderColor };
  }, [topics, sandboxScores]);

  const generateReport = () => {
    let r = `# Appraisal Criteria Evaluation Report\n`;
    r += `**Phase:** ${PHASE_META[phase].label}\n`;
    r += `**Date:** ${new Date().toLocaleDateString()}\n`;
    r += `**Score:** ${scoreReport.pct.toFixed(1)}% (${scoreReport.bracket})\n\n`;
    r += `## Summary Notes\n${overallNotes || "No notes provided."}\n\n`;
    r += `## Criterion Breakdown\n\n`;
    topics.forEach((t) => {
      const s = scoreReport.criterionScores[t.id];
      r += `### [${t.code || "—"}] ${t.label}\n* **Score:** ${s?.earned.toFixed(1) || 0} / ${s?.max.toFixed(1) || 0} pts\n\n`;
      if (t.questionItems.length > 0) {
        r += `| Question | Score | Comment |\n|:---|:---|:---|\n`;
        t.questionItems.forEach((q) => {
          r += `| ${q.prompt} | **${sandboxScores[q.id] ?? "-"}** | ${sandboxComments[q.id] || "None"} |\n`;
        });
        r += "\n";
      }
    });
    r += `\n*Generated via Monolith Engine — AMS*`;
    return r;
  };

  const copyReport = () => {
    void navigator.clipboard.writeText(generateReport()).then(() => {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    });
  };

  const resetSandbox = () => {
    const scores: SandboxScore = {};
    const comments: SandboxComment = {};
    topics.forEach((t) => t.questionItems.forEach((q) => { scores[q.id] = 0; comments[q.id] = ""; }));
    setSandboxScores(scores);
    setSandboxComments(comments);
    setOverallNotes("");
  };

  return (
    <div className="lg:col-span-5 space-y-4">
      <div className="sticky top-20 z-10 space-y-4">

        {/* Sandbox header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-[#00cec4]" />
            <h3 className="ds-h3 text-on-surface">Live Sandbox</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-on-surface text-surface text-sm hover:bg-on-surface-variant transition cursor-pointer"
            >
              <FileDown className="h-3.5 w-3.5 text-[#00cec4]" />
              Report
            </button>
            <button
              onClick={resetSandbox}
              className="inline-flex items-center gap-1 text-sm text-secondary bg-secondary/8 border border-secondary/20 hover:bg-secondary/15 rounded-lg px-2.5 py-1.5 transition cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
        </div>

        {/* Score gauge */}
        <div className="p-6 bg-surface rounded-2xl border border-outline-variant/60 shadow-ambient flex flex-col items-center text-center relative overflow-hidden transition hover:shadow-ambient-hover">
          <div className={`absolute top-0 inset-x-0 h-1 transition-all duration-300 ${scoreReport.pct >= 80 ? "bg-[#00cec4]" : scoreReport.pct >= 70 ? "bg-amber-400" : "bg-red-400"}`} />

          <span className="text-xs uppercase tracking-widest text-on-surface-variant block mb-1">
            Evaluated score
          </span>

          <div className="relative flex items-center justify-center my-2">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle cx="56" cy="56" r="46" stroke="var(--color-outline-variant)" strokeWidth="7" fill="transparent" />
              <circle
                cx="56" cy="56" r="46"
                stroke={scoreReport.pct >= 80 ? "#00cec4" : scoreReport.pct >= 70 ? "#f59e0b" : "#ef4444"}
                strokeWidth="7"
                strokeLinecap="round"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 46}
                strokeDashoffset={(1 - scoreReport.pct / 100) * (2 * Math.PI * 46)}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-mono text-on-surface leading-none">{scoreReport.pct.toFixed(1)}%</span>
              <span className="text-xs mt-1 text-[#00cec4] uppercase tracking-widest">ratio</span>
            </div>
          </div>

          <div className={`mt-2 px-4 py-1.5 rounded-full text-xs ${scoreReport.bgColor} ${scoreReport.color} border ${scoreReport.borderColor} uppercase tracking-wider select-none`}>
            {scoreReport.bracket}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 w-full pt-4 border-t border-outline-variant/30 text-xs">
            {[
              { label: "Criteria", value: topics.length },
              { label: "Questions", value: totalQuestions },
              { label: "Max pts", value: totalMaxPoints },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <span className="text-on-surface-variant block text-[10px] uppercase tracking-wide">{label}</span>
                <span className="text-sm font-mono text-on-surface">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sandbox form */}
        <div className="p-5 bg-surface rounded-2xl border border-outline-variant/60 shadow-ambient space-y-6 max-h-[520px] overflow-y-auto">
          <div className="pb-3 border-b border-outline-variant/30">
            <p className="text-sm text-on-surface flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-[#00cec4]" />
              Interactive assessment form
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Score each question to see real-time calculations.
            </p>
          </div>

          {topics.length === 0 ? (
            <p className="text-center py-8 text-sm text-on-surface-variant">
              No criteria defined. Add a criterion on the left to begin.
            </p>
          ) : (
            topics.map((t) => {
              const stats = scoreReport.criterionScores[t.id];
              return (
                <div key={t.id} className="space-y-3 pb-4 border-b border-outline-variant/25 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <p className="text-sm text-on-surface truncate">
                        {t.code ? `${t.code}. ` : ""}{t.label || "Untitled criterion"}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Weight: {t.weight}× · Max: {t.maxPoints} pts
                      </p>
                    </div>
                    <span className="font-mono text-xs text-[#00cec4] bg-[#00cec4]/8 px-2 py-0.5 rounded border border-[#00cec4]/15 shrink-0">
                      {(stats?.earned ?? 0).toFixed(1)} pts
                    </span>
                  </div>

                  <div className="space-y-2">
                    {t.questionItems.length > 0 ? (
                      t.questionItems.map((q) => {
                        const score = sandboxScores[q.id] ?? 0;
                        const comment = sandboxComments[q.id] ?? "";
                        const maxPerQ = t.maxPoints / Math.max(t.questionItems.length, 1);

                        return (
                          <div key={q.id} className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/40 space-y-2.5 transition hover:border-outline-variant">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm text-on-surface leading-relaxed flex-1">
                                {q.prompt || <em className="text-on-surface-variant">Untitled question</em>}
                              </p>
                              <span className="text-xs font-mono text-on-surface-variant bg-surface border border-outline-variant/40 px-2 py-0.5 rounded shrink-0">
                                {score.toFixed(1)} / {maxPerQ.toFixed(1)}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs text-on-surface-variant shrink-0">Score</span>
                              <input
                                type="range"
                                min={0}
                                max={maxPerQ}
                                step={0.5}
                                className="accent-[#00cec4] flex-1 cursor-pointer h-1.5 rounded-full"
                                value={score}
                                onChange={(e) => setSandboxScores((prev) => ({ ...prev, [q.id]: Number(e.target.value) }))}
                              />
                              <span className="text-xs font-mono text-on-surface w-7 text-right shrink-0">{score.toFixed(1)}</span>
                            </div>

                            <Input
                              type="text"
                              value={comment}
                              onChange={(e) => setSandboxComments((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              className="w-full text-sm bg-surface border-outline-variant/60 px-3 py-1.5 rounded-xl"
                              placeholder="Evaluator comment…"
                            />
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-on-surface-variant italic">No questions assigned to this criterion.</p>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Overall notes */}
          <div className="pt-3 border-t border-outline-variant/25">
            <label className="text-xs uppercase tracking-widest text-on-surface-variant block mb-1.5">
              Overall evaluator notes
            </label>
            <textarea
              rows={3}
              className="w-full text-sm p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container-low outline-none text-on-surface leading-relaxed transition focus:border-[#00cec4]/60"
              placeholder="Enter final synthesis, recommendations, or panel feedback…"
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Export modal */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-on-surface/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              className="bg-surface rounded-2xl border border-outline-variant/60 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.3)] max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
                <div>
                  <h3 className="ds-h3 text-on-surface">Assessment Report</h3>
                  <p className="text-xs text-on-surface-variant mt-1">Copy or print the formatted evaluation summary</p>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-sm text-on-surface-variant hover:text-on-surface cursor-pointer bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 py-1.5 px-3 rounded-lg transition"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-surface-container-low p-4 rounded-xl border border-outline-variant/40 font-mono text-xs text-on-surface-variant whitespace-pre-wrap leading-relaxed max-h-[50vh]">
                {generateReport()}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end border-t border-outline-variant/30 pt-3">
                <button
                  onClick={copyReport}
                  className="rounded-xl bg-on-surface text-surface text-sm py-2 px-4 transition hover:bg-on-surface-variant active:scale-95 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedReport ? <><Check className="h-4 w-4" /><span>Copied!</span></> : <><FileText className="h-4 w-4 text-[#00cec4]" /><span>Copy Markdown</span></>}
                </button>
                <button
                  onClick={() => {
                    const pw = window.open("", "_blank");
                    if (pw) {
                      pw.document.write(`<html><head><title>Appraisal Report</title><style>body{font-family:system-ui,sans-serif;padding:40px;color:#111827;line-height:1.6}h1{border-bottom:2px solid #00cec4;padding-bottom:8px}h2,h3{color:#374151;margin-top:24px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #d1d5db;padding:10px;text-align:left;font-size:13px}th{background:#f9fafb}</style></head><body><pre>${generateReport().replace(/</g, "&lt;")}</pre></body></html>`);
                      pw.document.close();
                      pw.print();
                    }
                  }}
                  className="rounded-xl border border-outline-variant/60 bg-surface text-sm py-2 px-4 text-on-surface hover:bg-surface-container transition active:scale-95 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-[#00cec4]" />
                  Print PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Topic normalizer ─────────────────────────────────────────

function normalizeTopic(topic: Topic): Topic {
  const qt = topic.questionType ?? "multiple_choice";
  return {
    ...topic,
    questionType: qt,
    responseConfig: {
      startLabel: topic.responseConfig?.startLabel ?? getDefaultResponseConfig(qt).startLabel,
      endLabel: topic.responseConfig?.endLabel ?? getDefaultResponseConfig(qt).endLabel,
      increment: normalizeIncrement(topic.responseConfig?.increment, getDefaultResponseConfig(qt).increment),
    },
    questionItems: normalizeQuestionItems(topic.questionItems ?? []),
    isExpanded: topic.isExpanded ?? true,
  };
}

// ─── Main client component ────────────────────────────────────

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
  const [phase, setPhase] = useState<Phase>("SELF");
  const [topicMap, setTopicMap] = useState<Record<Phase, Topic[]>>({
    SELF: withOrderedTopics(selfTree.map(normalizeTopic)),
    REVIEWER: withOrderedTopics(reviewerTree.map(normalizeTopic)),
    MANAGEMENT: withOrderedTopics(mgmtTree.map(normalizeTopic)),
  });
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [showImportArea, setShowImportArea] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const dragOrderRef = useRef<Topic[] | null>(null);

  const topics = topicMap[phase];

  const totalWeight = useMemo(() => topics.reduce((s, t) => s + t.weight, 0), [topics]);
  const totalMaxPoints = useMemo(() => topics.reduce((s, t) => s + t.maxPoints, 0), [topics]);
  const totalQuestions = useMemo(() => topics.reduce((s, t) => s + t.questionItems.length, 0), [topics]);

  function setTopicsForPhase(p: Phase, next: Topic[]) {
    setTopicMap((prev) => ({ ...prev, [p]: withOrderedTopics(next) }));
  }
  function setTopics(next: Topic[]) { setTopicsForPhase(phase, next); }
  function markDirty(id: string) { setDirtyIds((prev) => new Set(prev).add(id)); }
  function markClean(id: string) {
    setDirtyIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }

  function updateTopic(id: string, next: Topic) {
    setTopics(topics.map((t) =>
      t.id === id
        ? { ...next, subtopics: withOrderedSubtopics(next.subtopics), questionItems: normalizeQuestionItems(next.questionItems) }
        : t,
    ));
    markDirty(id);
  }

  function moveTopic(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= topics.length) return;
    const next = [...topics];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    const reindexed = withOrderedTopics(next);
    setTopicsForPhase(phase, reindexed);
    void Promise.all(reindexed.map((t) => apiPatch(t.id, { order: t.order }))).then(() => router.refresh()).catch(() => setError("Failed to update order."));
  }

  function duplicateTopic(id: string) {
    const source = topics.find((t) => t.id === id);
    if (!source) return;
    const clone: Topic = {
      ...JSON.parse(JSON.stringify(source)) as Topic,
      id: `__clone_${Date.now()}`,
      label: `${source.label} (Copy)`,
      isExpanded: true,
    };
    const si = topics.findIndex((t) => t.id === id);
    const next = [...topics];
    next.splice(si + 1, 0, clone);
    setTopicsForPhase(phase, withOrderedTopics(next));
    markDirty(clone.id);
  }

  async function saveTopic(topic: Topic) {
    setSavingIds((prev) => new Set(prev).add(topic.id));
    setError(null);
    try {
      if (topic.id.startsWith("__clone_") || topic.id.startsWith("__import_")) {
        const created = await apiCreate({
          label: topic.label || "Untitled",
          code: topic.code.trim() || undefined,
          description: topic.description,
          weight: topic.weight,
          maxPoints: topic.maxPoints,
          reviewerOnly: topic.reviewerOnly,
          kind: "CATEGORY",
          phase,
          order: topic.order,
          meta: {
            allowedEvaluatorRoles: topic.allowedRoles,
            questionType: topic.questionType,
            responseConfig: topic.responseConfig,
            questionItems: topic.questionItems,
          },
        });
        setTopicMap((prev) => ({
          ...prev,
          [phase]: prev[phase].map((t) => t.id === topic.id ? { ...t, id: created.id } : t),
        }));
        markClean(topic.id);
      } else {
        await apiPatch(topic.id, {
          label: topic.label || "Untitled",
          code: topic.code.trim() ? topic.code.trim() : undefined,
          description: topic.description,
          weight: topic.weight,
          maxPoints: topic.maxPoints,
          order: topic.order,
          reviewerOnly: topic.reviewerOnly,
          questions: topic.questionItems.map((q) => q.prompt.trim()).filter(Boolean),
          meta: {
            allowedEvaluatorRoles: topic.allowedRoles,
            questionType: topic.questionType,
            responseConfig: topic.responseConfig,
            questionItems: topic.questionItems,
          },
        });
        for (const s of topic.subtopics) {
          if (s.id.startsWith("__new_")) {
            const c = await apiCreate({ label: s.label || "Option", code: s.code.trim() || undefined, weight: s.weight, maxPoints: s.maxPoints, order: s.order, parentId: topic.id, phase, kind: "CATEGORY" });
            setTopicMap((prev) => ({ ...prev, [phase]: prev[phase].map((e) => e.id === topic.id ? { ...e, subtopics: e.subtopics.map((sub) => sub.id === s.id ? { ...sub, id: c.id } : sub) } : e) }));
          } else {
            await apiPatch(s.id, { label: s.label || "Option", code: s.code.trim() || undefined, weight: s.weight, maxPoints: s.maxPoints, order: s.order });
          }
        }
        markClean(topic.id);
      }
      router.refresh();
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setSavingIds((prev) => { const n = new Set(prev); n.delete(topic.id); return n; });
    }
  }

  async function persistTopicOrder(next: Topic[]) {
    const ordered = withOrderedTopics(next);
    setTopicsForPhase(phase, ordered);
    try {
      await Promise.all(ordered.filter((t) => !t.id.startsWith("__")).map((t) => apiPatch(t.id, { order: t.order })));
      router.refresh();
    } catch {
      setError("Order could not be updated.");
    }
  }

  async function moveTopicToTarget(topicId: string, targetId: string) {
    const next = dragOrderRef.current ?? reorderTopics(topics, topicId, targetId);
    setDraggingId(null);
    setDragTargetId(null);
    dragOrderRef.current = null;
    await persistTopicOrder(next);
  }

  async function deleteTopic(id: string) {
    if (!confirm("Delete this criterion? This cannot be undone.")) return;
    setError(null);
    try {
      if (!id.startsWith("__")) await apiDelete(id);
      const next = withOrderedTopics(topics.filter((t) => t.id !== id));
      setTopics(next);
      if (!id.startsWith("__")) {
        await Promise.all(next.filter((t) => !t.id.startsWith("__")).map((t) => apiPatch(t.id, { order: t.order })));
      }
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
        maxPoints: 10,
        reviewerOnly: false,
        kind: "CATEGORY",
        phase,
        order: topics.length,
        meta: { allowedEvaluatorRoles: [], questionType: "multiple_choice", responseConfig: getDefaultResponseConfig("multiple_choice"), questionItems: [] },
      });
      const newTopic: Topic = {
        id: created.id,
        label: "New Criterion",
        code: `C${topics.length + 1}`,
        description: "",
        weight: 1,
        maxPoints: 10,
        kind: "CATEGORY",
        reviewerOnly: false,
        questions: [],
        questionType: "multiple_choice",
        responseConfig: getDefaultResponseConfig("multiple_choice"),
        questionItems: [],
        subtopics: [],
        allowedRoles: [],
        order: topics.length,
        isExpanded: true,
      };
      setTopics([...topics, newTopic]);
      markDirty(created.id);
    } catch {
      setError("Failed to add criterion.");
    }
  }

  async function clearAllCriteria() {
    if (Object.values(topicMap).every((e) => e.length === 0)) return;
    if (!confirm("Clear all AMS criteria across all phases? This cannot be undone.")) return;
    setIsClearingAll(true);
    setError(null);
    try {
      await apiDeleteAll();
      setTopicMap({ SELF: [], REVIEWER: [], MANAGEMENT: [] });
      setDirtyIds(new Set());
      setSavingIds(new Set());
      router.refresh();
    } catch {
      setError("Failed to clear all criteria.");
    } finally {
      setIsClearingAll(false);
    }
  }

  function handleImportJson() {
    try {
      const parsed = JSON.parse(importJsonText) as Record<string, unknown>;
      if (!parsed.title || !Array.isArray(parsed.criteria)) throw new Error("Must contain a 'title' and 'criteria' array.");
      const criteria = (parsed.criteria as Record<string, unknown>[]).map((c, i): Topic => ({
        id: `__import_${Date.now()}_${i}`,
        label: String(c.title ?? `Criterion ${i + 1}`),
        code: String(c.code ?? `C${i + 1}`),
        description: String(c.description ?? ""),
        weight: Number(c.weightage ?? 1),
        maxPoints: Number(c.maxPoints ?? 10),
        kind: "CATEGORY",
        reviewerOnly: false,
        questions: [],
        questionType: "multiple_choice",
        responseConfig: getDefaultResponseConfig("multiple_choice"),
        questionItems: [],
        subtopics: [],
        allowedRoles: [],
        order: i,
        isExpanded: true,
      }));
      setTopicsForPhase(phase, withOrderedTopics(criteria));
      criteria.forEach((c) => markDirty(c.id));
      setShowImportArea(false);
      setImportError(null);
      setImportJsonText("");
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Invalid JSON.");
    }
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-on-surface border border-outline/30 flex items-center justify-center shadow-[0_4px_16px_-8px_rgba(0,206,196,0.35)] shrink-0">
          <Sparkles className="h-5 w-5 text-[#00cec4]" />
        </div>
        <div>
          <h1 className="ds-h1 text-on-surface">
            Rubric &amp; Criteria Builder
          </h1>
          <p className="text-sm text-on-surface-variant">
            Configure evaluation criteria, assign weightages, and test assessments live.
          </p>
        </div>
      </div>

      {/* Metric dashboard */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Hash className="h-5 w-5" />, label: "Criteria", value: topics.length, accent: "group-hover:text-[#00cec4] group-hover:bg-[#00cec4]/8" },
          { icon: <ListPlus className="h-5 w-5" />, label: "Questions", value: totalQuestions, accent: "group-hover:text-secondary group-hover:bg-secondary/8" },
          { icon: <Award className="h-5 w-5" />, label: "Max Points", value: totalMaxPoints, accent: "group-hover:text-primary group-hover:bg-primary/8" },
          { icon: <Scale className="h-5 w-5" />, label: "Total Weight", value: `${totalWeight}×`, accent: "group-hover:text-on-tertiary-container group-hover:bg-on-tertiary-container/8" },
        ].map(({ icon, label, value, accent }) => (
          <article
            key={label}
            className="card-top-accent group relative overflow-hidden rounded-[24px] border border-outline-variant/20 bg-white p-5 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.24)] transition duration-300 hover:-translate-y-1 hover:border-[#00cec4]/30 hover:shadow-[0_20px_40px_-24px_rgba(0,206,196,0.28)]"
          >
            <div className="absolute inset-x-0 top-0 h-14 bg-[linear-gradient(180deg,rgba(0,206,196,0.06),transparent)]" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between">
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-on-surface-variant transition duration-300 group-hover:scale-105 group-hover:bg-[#00cec4]/14", accent)}>
                  {icon}
                </div>
                <div className="size-4 text-slate-300 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#00cec4]">
                  <ArrowUpRight className="size-4" />
                </div>
              </div>

              <div className="mt-6">
                <p className="text-[2.35rem] font-extralight leading-none tracking-[-0.04em] text-slate-900">
                  {value}
                </p>
                <p className="mt-1.5 text-[14px] font-normal text-slate-500">{label}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Phase tabs */}
        <div className="flex w-fit gap-1 rounded-xl bg-surface-container p-1">
          {(["SELF", "REVIEWER", "MANAGEMENT"] as Phase[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPhase(value)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm transition",
                phase === value ? "bg-surface text-on-surface shadow-ambient" : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {PHASE_META[value].label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowImportArea(!showImportArea)}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-outline-variant/60 bg-surface px-5 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <Button
            type="button"
            onClick={() => void addCriterion()}
            className="h-12 rounded-2xl border-0 bg-[#00cec4] px-5 text-sm font-medium text-white shadow-[0_8px_20px_-12px_rgba(0,206,196,0.5)] hover:bg-[#00b8af]"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Criterion
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void clearAllCriteria()}
            disabled={isClearingAll || Object.values(topicMap).every((e) => e.length === 0)}
            className="h-12 rounded-2xl border-red-200 px-5 text-sm font-medium text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isClearingAll ? "Clearing…" : "Clear All"}
          </Button>
        </div>
      </div>

      {/* Import panel */}
      <AnimatePresence>
        {showImportArea && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 rounded-2xl border border-outline-variant/60 bg-surface shadow-ambient space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
                <div>
                  <p className="text-sm text-on-surface">Import Rubric Schema</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Paste a valid JSON rubric to import criteria structure.</p>
                </div>
                <button
                  onClick={() => setShowImportArea(false)}
                  className="text-sm text-on-surface-variant hover:text-on-surface cursor-pointer bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 py-1.5 px-3 rounded-lg transition"
                >
                  Close
                </button>
              </div>
              <textarea
                className="w-full h-36 font-mono text-xs p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container-low outline-none transition focus:border-[#00cec4]/60"
                placeholder='{"title": "My Rubric", "criteria": [{"title": "C1", "weightage": 1, "maxPoints": 10}]}'
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
              />
              {importError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {importError}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={handleImportJson}
                  className="px-4 py-1.5 rounded-xl bg-on-surface text-surface hover:bg-on-surface-variant transition text-sm cursor-pointer"
                >
                  Parse &amp; Import
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
          {error}
        </div>
      )}

      {/* Dual-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT: Criteria builder */}
        <div className="lg:col-span-7 space-y-5">
          <PhaseHeader phase={phase} />

          {/* Builder header */}
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
            <div className="flex items-center gap-2.5">
              <Edit3 className="h-4 w-4 text-[#00cec4]" />
              <h2 className="ds-h3 text-on-surface">Configure Criteria</h2>
            </div>
            <span className="text-xs text-on-surface-variant font-mono bg-surface-container py-1 px-2.5 rounded-lg border border-outline-variant/40">
              {topics.length} criterion{topics.length !== 1 ? "a" : ""}
            </span>
          </div>

          {/* Criteria list */}
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {topics.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="cursor-pointer rounded-2xl border-2 border-dashed border-outline-variant/50 hover:border-[#00cec4]/40 py-16 text-center transition duration-200"
                  onClick={() => void addCriterion()}
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-on-surface text-surface shadow-ambient hover:bg-[#00cec4] transition-all">
                    <Plus className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-on-surface">No criteria yet</p>
                  <p className="text-xs text-on-surface-variant mt-1">Click to add the first evaluation criterion</p>
                </motion.div>
              ) : (
                topics.map((topic, index) => (
                  <CriterionCard
                    key={topic.id}
                    topic={topic}
                    phase={phase}
                    index={index}
                    totalCount={topics.length}
                    dragging={draggingId === topic.id}
                    isDragTarget={draggingId !== null && dragTargetId === topic.id && draggingId !== topic.id}
                    saving={savingIds.has(topic.id)}
                    dirty={dirtyIds.has(topic.id)}
                    onTopicChange={(next) => updateTopic(topic.id, next)}
                    onSave={() => void saveTopic(topicMap[phase].find((e) => e.id === topic.id) ?? topic)}
                    onDelete={() => void deleteTopic(topic.id)}
                    onDuplicate={() => duplicateTopic(topic.id)}
                    onMoveUp={() => moveTopic(index, "up")}
                    onMoveDown={() => moveTopic(index, "down")}
                    onDragStart={() => { setDraggingId(topic.id); setDragTargetId(topic.id); dragOrderRef.current = topicMap[phase]; }}
                    onDragEnd={() => { setDraggingId(null); setDragTargetId(null); dragOrderRef.current = null; }}
                    onDragOver={() => {
                      if (draggingId && draggingId !== topic.id) {
                        setDragTargetId(topic.id);
                        const reordered = reorderTopics(topicMap[phase], draggingId, topic.id);
                        dragOrderRef.current = reordered;
                        setTopicsForPhase(phase, reordered);
                      }
                    }}
                    onDrop={() => { if (draggingId) void moveTopicToTarget(draggingId, topic.id); }}
                  />
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Add anchor */}
          {topics.length > 0 && (
            <div
              className="rounded-2xl border border-dashed border-outline-variant/50 hover:border-[#00cec4]/40 px-4 py-7 text-center transition duration-200 cursor-pointer"
              onClick={() => void addCriterion()}
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-on-surface text-surface shadow-ambient hover:bg-[#00cec4] transition-all duration-200 hover:scale-105">
                <Plus className="h-4 w-4" />
              </div>
              <p className="mt-3 text-xs uppercase tracking-widest text-on-surface-variant">Add criterion</p>
            </div>
          )}
        </div>

        {/* RIGHT: Sandbox */}
        <SandboxEvaluator topics={topics} phase={phase} />
      </div>
    </div>
  );
}
