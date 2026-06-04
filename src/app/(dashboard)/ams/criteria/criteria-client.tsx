"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AppraisalQuestionDefinition,
  AppraisalSectionDefinition,
  AppraisalSelfFormTemplate,
  EmployeeInfoFieldDefinition,
  EvaluatorRole,
} from "@/modules/ams/criteria-config";

type Subtopic = {
  id: string;
  code: string;
  label: string;
  weight: number;
  order: number;
  maxPoints: number;
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
  allowedRoles: EvaluatorRole[];
  questions: string[];
  subtopics: Subtopic[];
};

type Phase = "SELF" | "REVIEWER" | "MANAGEMENT";

const PHASE_LABELS: Record<Phase, string> = {
  SELF: "Self-Assessment",
  REVIEWER: "Reviewer",
  MANAGEMENT: "Management",
};

const PHASES: Phase[] = ["SELF", "REVIEWER", "MANAGEMENT"];
const QUESTION_TYPE_OPTIONS: AppraisalQuestionDefinition["type"][] = ["text", "textarea", "radio", "number"];
const FIELD_TYPE_OPTIONS: EmployeeInfoFieldDefinition["type"][] = ["text", "date", "radio"];

function cloneTemplate(template: AppraisalSelfFormTemplate): AppraisalSelfFormTemplate {
  return structuredClone(template);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeOrder<T extends { order: number }>(items: T[]) {
  return items.map((item, index) => ({ ...item, order: index }));
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

async function patchCriterion(id: string, data: Record<string, unknown>) {
  const res = await fetch("/api/ams/criteria", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) throw new Error("Failed to update criterion");
}

async function createCriterion(data: Record<string, unknown>) {
  const res = await fetch("/api/ams/criteria", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create criterion");
}

async function deleteCriterion(id: string) {
  const res = await fetch("/api/ams/criteria", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("Failed to delete criterion");
}

async function saveSelfTemplate(template: AppraisalSelfFormTemplate) {
  const res = await fetch("/api/ams/self-form-template", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(template),
  });
  if (!res.ok) throw new Error("Failed to save self-assessment template");
  return res.json() as Promise<{ template: AppraisalSelfFormTemplate }>;
}

function TextInput({
  value,
  onChange,
  placeholder,
  className = "",
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: "text" | "number";
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm ${className}`}
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
    />
  );
}

function SaveNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-gray-600">{message}</p>;
}

function SelfFieldEditor({
  field,
  index,
  fields,
  onChange,
  onDelete,
  onMove,
}: {
  field: EmployeeInfoFieldDefinition;
  index: number;
  fields: EmployeeInfoFieldDefinition[];
  onChange: (field: EmployeeInfoFieldDefinition) => void;
  onDelete: () => void;
  onMove: (to: number) => void;
}) {
  const optionsValue = (field.options ?? []).map((option) => `${option.label}|${option.value}`).join("\n");

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900">Field {index + 1}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => onMove(index - 1)} disabled={index === 0} className="rounded border px-2 py-1 text-xs disabled:opacity-40">Up</button>
          <button type="button" onClick={() => onMove(index + 1)} disabled={index === fields.length - 1} className="rounded border px-2 py-1 text-xs disabled:opacity-40">Down</button>
          <button type="button" onClick={onDelete} className="rounded border border-red-200 px-2 py-1 text-xs text-red-600">Delete</button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <TextInput value={field.id} onChange={(value) => onChange({ ...field, id: value })} placeholder="Field id" />
        <TextInput value={field.label} onChange={(value) => onChange({ ...field, label: value })} placeholder="Field label" />
        <select
          value={field.type}
          onChange={(event) => onChange({ ...field, type: event.target.value as EmployeeInfoFieldDefinition["type"] })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {FIELD_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <TextInput value={field.placeholder ?? ""} onChange={(value) => onChange({ ...field, placeholder: value || undefined })} placeholder="Placeholder" />
      </div>
      {field.type === "radio" ? (
        <TextArea
          value={optionsValue}
          onChange={(value) => onChange({
            ...field,
            options: value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [label, rawValue] = line.split("|");
                return { label: label.trim(), value: (rawValue ?? label).trim() };
              }),
          })}
          placeholder="Option label|option-value"
          rows={4}
        />
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <TextInput
          value={field.showWhen?.fieldId ?? ""}
          onChange={(value) => onChange({
            ...field,
            showWhen: value ? { fieldId: value, equals: field.showWhen?.equals ?? "" } : undefined,
          })}
          placeholder="Conditional field id"
        />
        <TextInput
          value={field.showWhen?.equals ?? ""}
          onChange={(value) => onChange({
            ...field,
            showWhen: field.showWhen?.fieldId ? { fieldId: field.showWhen.fieldId, equals: value } : undefined,
          })}
          placeholder="Show when equals"
        />
      </div>
    </div>
  );
}

function QuestionEditor({
  question,
  title,
  onChange,
  onDelete,
  onMove,
  canMoveUp,
  canMoveDown,
  allowDelete = true,
}: {
  question: AppraisalQuestionDefinition;
  title?: string;
  onChange: (question: AppraisalQuestionDefinition) => void;
  onDelete?: () => void;
  onMove?: (delta: -1 | 1) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  allowDelete?: boolean;
}) {
  const optionsValue = (question.options ?? []).map((option) => `${option.label}|${option.value}`).join("\n");

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-900">{title ?? question.id}</p>
        <div className="flex gap-2">
          {onMove ? <button type="button" onClick={() => onMove(-1)} disabled={!canMoveUp} className="rounded border px-2 py-1 text-xs disabled:opacity-40">Up</button> : null}
          {onMove ? <button type="button" onClick={() => onMove(1)} disabled={!canMoveDown} className="rounded border px-2 py-1 text-xs disabled:opacity-40">Down</button> : null}
          {allowDelete && onDelete ? <button type="button" onClick={onDelete} className="rounded border border-red-200 px-2 py-1 text-xs text-red-600">Delete</button> : null}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <TextInput value={question.id} onChange={(value) => onChange({ ...question, id: value })} placeholder="Question id" />
        <select
          value={question.type}
          onChange={(event) => onChange({ ...question, type: event.target.value as AppraisalQuestionDefinition["type"] })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {QUESTION_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>
      <TextArea value={question.prompt} onChange={(value) => onChange({ ...question, prompt: value })} placeholder="Question prompt" />
      <div className="grid gap-3 md:grid-cols-2">
        <TextInput value={question.placeholder ?? ""} onChange={(value) => onChange({ ...question, placeholder: value || undefined })} placeholder="Placeholder" />
        <label className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={question.allowExplanation === true}
            onChange={(event) => onChange({ ...question, allowExplanation: event.target.checked })}
          />
          Allow explanation
        </label>
      </div>
      {question.type === "radio" ? (
        <TextArea
          value={optionsValue}
          onChange={(value) => onChange({
            ...question,
            options: value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [label, rawValue] = line.split("|");
                return { label: label.trim(), value: (rawValue ?? label).trim() };
              }),
          })}
          placeholder="Option label|option-value"
          rows={4}
        />
      ) : null}
    </div>
  );
}

function SectionEditor({
  section,
  onChange,
  onDelete,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  section: AppraisalSectionDefinition;
  onChange: (section: AppraisalSectionDefinition) => void;
  onDelete?: () => void;
  onMove?: (delta: -1 | 1) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 space-y-3">
          <TextInput value={section.id} onChange={(value) => onChange({ ...section, id: value })} placeholder="Section id" />
          <TextInput value={section.title} onChange={(value) => onChange({ ...section, title: value })} placeholder="Section title" />
          <TextArea value={section.description ?? ""} onChange={(value) => onChange({ ...section, description: value || undefined })} placeholder="Section description" rows={2} />
        </div>
        {onDelete || onMove ? (
          <div className="flex flex-col gap-2">
            {onMove ? <button type="button" onClick={() => onMove(-1)} disabled={!canMoveUp} className="rounded border px-2 py-1 text-xs disabled:opacity-40">Up</button> : null}
            {onMove ? <button type="button" onClick={() => onMove(1)} disabled={!canMoveDown} className="rounded border px-2 py-1 text-xs disabled:opacity-40">Down</button> : null}
            {onDelete ? <button type="button" onClick={onDelete} className="rounded border border-red-200 px-2 py-1 text-xs text-red-600">Delete</button> : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {section.questions.map((question, questionIndex) => (
          <QuestionEditor
            key={`${question.id}-${questionIndex}`}
            question={question}
            onChange={(nextQuestion) => onChange({
              ...section,
              questions: section.questions.map((item, index) => index === questionIndex ? nextQuestion : item),
            })}
            onDelete={() => onChange({
              ...section,
              questions: section.questions.filter((_, index) => index !== questionIndex),
            })}
            onMove={(delta) => onChange({
              ...section,
              questions: moveItem(section.questions, questionIndex, questionIndex + delta),
            })}
            canMoveUp={questionIndex > 0}
            canMoveDown={questionIndex < section.questions.length - 1}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange({
          ...section,
          questions: [
            ...section.questions,
            {
              id: `question-${section.questions.length + 1}`,
              prompt: "",
              type: "textarea",
            },
          ],
        })}
        className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700"
      >
        Add question
      </button>
    </div>
  );
}

function SelfTemplatePanel({
  initialTemplate,
}: {
  initialTemplate: AppraisalSelfFormTemplate;
}) {
  const [template, setTemplate] = useState<AppraisalSelfFormTemplate>(() => cloneTemplate(initialTemplate));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function persistTemplate() {
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveSelfTemplate(template);
      setTemplate(cloneTemplate(result.template));
      setMessage("Self-assessment template saved.");
    } catch {
      setMessage("Unable to save self-assessment template.");
    } finally {
      setSaving(false);
    }
  }

  const standaloneSections = useMemo(() => ([
    {
      key: "careerGrowthSection" as const,
      title: "Part B: Career Aspirations & Growth Perspective",
    },
    {
      key: "decisionMakingSection" as const,
      title: "Part B: Decision-Making & Managerial Capabilities",
    },
    {
      key: "retentionSection" as const,
      title: "Part C: Retention / Loyalty / Stability",
    },
    {
      key: "compensationSection" as const,
      title: "Part D: Compensation & Satisfaction",
    },
  ]), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Live Self-Assessment Template</h2>
          <p className="text-sm text-gray-500">Changes here apply immediately for this organization.</p>
        </div>
        <button
          type="button"
          onClick={() => void persistTemplate()}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Template"}
        </button>
      </div>
      <SaveNotice message={message} />

      <div className="space-y-4">
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Employee Information Fields</h3>
            <p className="text-sm text-gray-500">Edit profile fields and visibility rules.</p>
          </div>
          {template.employeeInfoFields.map((field, index) => (
            <SelfFieldEditor
              key={`${field.id}-${index}`}
              field={field}
              index={index}
              fields={template.employeeInfoFields}
              onChange={(nextField) => setTemplate((current) => ({
                ...current,
                employeeInfoFields: current.employeeInfoFields.map((item, itemIndex) => itemIndex === index ? nextField : item),
              }))}
              onDelete={() => setTemplate((current) => ({
                ...current,
                employeeInfoFields: current.employeeInfoFields.filter((_, itemIndex) => itemIndex !== index),
              }))}
              onMove={(to) => setTemplate((current) => ({
                ...current,
                employeeInfoFields: moveItem(current.employeeInfoFields, index, to),
              }))}
            />
          ))}
          <button
            type="button"
            onClick={() => setTemplate((current) => ({
              ...current,
              employeeInfoFields: [
                ...current.employeeInfoFields,
                { id: `field-${current.employeeInfoFields.length + 1}`, label: "", type: "text" },
              ],
            }))}
            className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700"
          >
            Add employee info field
          </button>
        </div>

        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <TextInput
              value={template.selfRating.title}
              onChange={(value) => setTemplate((current) => ({ ...current, selfRating: { ...current.selfRating, title: value } }))}
              placeholder="Self rating title"
            />
            <TextInput
              value={template.selfRating.description ?? ""}
              onChange={(value) => setTemplate((current) => ({ ...current, selfRating: { ...current.selfRating, description: value || undefined } }))}
              placeholder="Self rating description"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Part A Sections</p>
            <p className="text-sm text-gray-500">Questions shown before the self-rating table.</p>
          </div>
          {template.partASections.map((section, index) => (
            <SectionEditor
              key={`${section.id}-${index}`}
              section={section}
              onChange={(nextSection) => setTemplate((current) => ({
                ...current,
                partASections: current.partASections.map((item, itemIndex) => itemIndex === index ? nextSection : item),
              }))}
              onDelete={() => setTemplate((current) => ({
                ...current,
                partASections: current.partASections.filter((_, itemIndex) => itemIndex !== index),
              }))}
              onMove={(delta) => setTemplate((current) => ({
                ...current,
                partASections: moveItem(current.partASections, index, index + delta),
              }))}
              canMoveUp={index > 0}
              canMoveDown={index < template.partASections.length - 1}
            />
          ))}
          <button
            type="button"
            onClick={() => setTemplate((current) => ({
              ...current,
              partASections: [
                ...current.partASections,
                { id: `part-a-${current.partASections.length + 1}`, title: "", questions: [] },
              ],
            }))}
            className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700"
          >
            Add Part A section
          </button>
        </div>

        {standaloneSections.map(({ key, title }) => (
          <div key={key} className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <SectionEditor
              section={template[key]}
              onChange={(nextSection) => setTemplate((current) => ({ ...current, [key]: nextSection }))}
            />
          </div>
        ))}

        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-gray-900">Final Feedback Field</p>
          <QuestionEditor
            title="Feedback question"
            question={template.feedbackQuestion}
            onChange={(feedbackQuestion) => setTemplate((current) => ({ ...current, feedbackQuestion }))}
            allowDelete={false}
          />
        </div>
      </div>
    </div>
  );
}

function CriterionCard({
  topic,
  phase,
  topicIndex,
  totalTopics,
  onTopicChange,
  onPersistTopic,
  onPersistTopicOrder,
  onDeleteTopic,
  onPersistSubtopic,
  onPersistSubtopicOrder,
  onDeleteSubtopic,
  onAddSubtopic,
  saving,
}: {
  topic: Topic;
  phase: Phase;
  topicIndex: number;
  totalTopics: number;
  onTopicChange: (nextTopic: Topic) => void;
  onPersistTopic: () => Promise<void>;
  onPersistTopicOrder: (delta: -1 | 1) => Promise<void>;
  onDeleteTopic: () => Promise<void>;
  onPersistSubtopic: (subtopicId: string) => Promise<void>;
  onPersistSubtopicOrder: (subtopicId: string, delta: -1 | 1) => Promise<void>;
  onDeleteSubtopic: (subtopicId: string) => Promise<void>;
  onAddSubtopic: (draft: { code: string; label: string; weight: number }) => Promise<void>;
  saving: boolean;
}) {
  const [newSubtopicCode, setNewSubtopicCode] = useState("");
  const [newSubtopicLabel, setNewSubtopicLabel] = useState("");

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <TextInput value={topic.code} onChange={(value) => onTopicChange({ ...topic, code: value })} placeholder="Code" />
        <TextInput value={topic.label} onChange={(value) => onTopicChange({ ...topic, label: value })} placeholder="Title" />
        <TextInput value={String(topic.weight)} onChange={(value) => onTopicChange({ ...topic, weight: Number(value) || 0 })} placeholder="Weightage" type="number" />
        <TextInput value={String(topic.maxPoints)} onChange={(value) => onTopicChange({ ...topic, maxPoints: Number(value) || 0 })} placeholder="Max points" type="number" />
      </div>
      <TextArea value={topic.description} onChange={(value) => onTopicChange({ ...topic, description: value })} placeholder="Description" rows={2} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Allowed evaluator roles</p>
          <p className="text-sm text-gray-700">{phase === "SELF" ? "Employee self-rating only" : topic.allowedRoles.join(", ") || "None"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void onPersistTopic()} disabled={saving} className="rounded border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 disabled:opacity-50">Save criterion</button>
          <button type="button" onClick={() => void onPersistTopicOrder(-1)} disabled={saving || topicIndex === 0} className="rounded border px-2 py-1 text-xs disabled:opacity-40">Up</button>
          <button type="button" onClick={() => void onPersistTopicOrder(1)} disabled={saving || topicIndex === totalTopics - 1} className="rounded border px-2 py-1 text-xs disabled:opacity-40">Down</button>
          <button type="button" onClick={() => void onDeleteTopic()} disabled={saving} className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 disabled:opacity-50">Delete</button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-900">Sub-criteria</p>
        {topic.subtopics.map((subtopic, subtopicIndex) => (
          <div key={subtopic.id} className="space-y-3 rounded-lg border border-gray-200 p-3">
            <div className="grid gap-3 md:grid-cols-[1fr_1.5fr_120px]">
              <TextInput
                value={subtopic.code}
                onChange={(value) => onTopicChange({
                  ...topic,
                  subtopics: topic.subtopics.map((item) => item.id === subtopic.id ? { ...item, code: value } : item),
                })}
                placeholder="Code"
              />
              <TextInput
                value={subtopic.label}
                onChange={(value) => onTopicChange({
                  ...topic,
                  subtopics: topic.subtopics.map((item) => item.id === subtopic.id ? { ...item, label: value } : item),
                })}
                placeholder="Label"
              />
              <TextInput
                value={String(subtopic.weight)}
                onChange={(value) => onTopicChange({
                  ...topic,
                  subtopics: topic.subtopics.map((item) => item.id === subtopic.id ? { ...item, weight: Number(value) || 0 } : item),
                })}
                placeholder="Weight"
                type="number"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void onPersistSubtopic(subtopic.id)} disabled={saving} className="rounded border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 disabled:opacity-50">Save sub-criterion</button>
              <button type="button" onClick={() => void onPersistSubtopicOrder(subtopic.id, -1)} disabled={saving || subtopicIndex === 0} className="rounded border px-2 py-1 text-xs disabled:opacity-40">Up</button>
              <button type="button" onClick={() => void onPersistSubtopicOrder(subtopic.id, 1)} disabled={saving || subtopicIndex === topic.subtopics.length - 1} className="rounded border px-2 py-1 text-xs disabled:opacity-40">Down</button>
              <button type="button" onClick={() => void onDeleteSubtopic(subtopic.id)} disabled={saving} className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 disabled:opacity-50">Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <TextInput
          value={newSubtopicCode}
          onChange={setNewSubtopicCode}
          placeholder="New sub-criterion code"
        />
        <TextInput
          value={newSubtopicLabel}
          onChange={setNewSubtopicLabel}
          placeholder="New sub-criterion label"
        />
        <button
          type="button"
          onClick={async () => {
            const label = newSubtopicLabel.trim();
            if (!label) return;
            const code = newSubtopicCode.trim() || `${topic.code || slugify(topic.label)}-${topic.subtopics.length + 1}`;
            setNewSubtopicCode("");
            setNewSubtopicLabel("");
            await onAddSubtopic({ code, label, weight: 1 });
          }}
          disabled={saving || !newSubtopicLabel.trim()}
          className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 disabled:opacity-50"
        >
          Add sub-criterion
        </button>
      </div>
    </div>
  );
}

function CriterionEditorPanel({
  phase,
  tree,
  onTreeChange,
}: {
  phase: Phase;
  tree: Topic[];
  onTreeChange: (tree: Topic[]) => void;
}) {
  const router = useRouter();
  const [topicLabel, setTopicLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateTopic(topicId: string, updater: (topic: Topic) => Topic) {
    onTreeChange(tree.map((topic) => topic.id === topicId ? updater(topic) : topic));
  }

  async function withMessage(action: () => Promise<void>, successMessage: string, errorMessage: string) {
    setSaving(true);
    setMessage(null);
    try {
      await action();
      setMessage(successMessage);
    } catch {
      setMessage(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function persistTopic(topic: Topic) {
    await patchCriterion(topic.id, {
      code: topic.code.trim(),
      label: topic.label.trim(),
      description: topic.description.trim(),
      weight: topic.weight,
      maxPoints: topic.maxPoints,
    });
  }

  async function persistSubtopic(subtopic: Subtopic) {
    await patchCriterion(subtopic.id, {
      code: subtopic.code.trim(),
      label: subtopic.label.trim(),
      weight: subtopic.weight,
      maxPoints: subtopic.maxPoints,
    });
  }

  async function persistTopicOrder(topicId: string, delta: -1 | 1) {
    const fromIndex = tree.findIndex((topic) => topic.id === topicId);
    const toIndex = fromIndex + delta;
    if (fromIndex === -1 || toIndex < 0 || toIndex >= tree.length) return;
    const reordered = normalizeOrder(moveItem(tree, fromIndex, toIndex));
    onTreeChange(reordered);
    await Promise.all(reordered.map((topic, index) => patchCriterion(topic.id, { order: index })));
  }

  async function persistSubtopicOrder(topicId: string, subtopicId: string, delta: -1 | 1) {
    const topic = tree.find((item) => item.id === topicId);
    if (!topic) return;
    const fromIndex = topic.subtopics.findIndex((item) => item.id === subtopicId);
    const toIndex = fromIndex + delta;
    if (fromIndex === -1 || toIndex < 0 || toIndex >= topic.subtopics.length) return;
    const reorderedSubtopics = normalizeOrder(moveItem(topic.subtopics, fromIndex, toIndex));
    updateTopic(topicId, (current) => ({ ...current, subtopics: reorderedSubtopics }));
    await Promise.all(reorderedSubtopics.map((subtopic, index) => patchCriterion(subtopic.id, { order: index })));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 md:flex-row">
        <TextInput value={topicLabel} onChange={setTopicLabel} placeholder="New criterion title" />
        <button
          onClick={() => void withMessage(async () => {
            const label = topicLabel.trim();
            if (!label) return;
            await createCriterion({
              label,
              code: slugify(label),
              phase,
              order: tree.length,
              description: "",
              weight: 0,
              maxPoints: phase === "SELF" ? 5 : 0,
              kind: "CATEGORY",
            });
            setTopicLabel("");
            router.refresh();
          }, "Criterion added.", "Unable to add criterion.")}
          disabled={saving || !topicLabel.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Add criterion
        </button>
      </div>
      <SaveNotice message={message} />

      {tree.map((topic, topicIndex) => (
        <CriterionCard
          key={topic.id}
          topic={topic}
          phase={phase}
          topicIndex={topicIndex}
          totalTopics={tree.length}
          saving={saving}
          onTopicChange={(nextTopic) => updateTopic(topic.id, () => nextTopic)}
          onPersistTopic={() => withMessage(
            () => persistTopic(topic),
            "Criterion saved.",
            "Unable to save criterion changes.",
          )}
          onPersistTopicOrder={(delta) => withMessage(
            () => persistTopicOrder(topic.id, delta),
            "Criterion order updated.",
            "Unable to reorder criterion.",
          )}
          onDeleteTopic={() => withMessage(async () => {
            await deleteCriterion(topic.id);
            router.refresh();
          }, "Criterion deleted.", "Unable to delete criterion.")}
          onPersistSubtopic={(subtopicId) => withMessage(async () => {
            const subtopic = topic.subtopics.find((item) => item.id === subtopicId);
            if (!subtopic) return;
            await persistSubtopic(subtopic);
          }, "Sub-criterion saved.", "Unable to save sub-criterion.")}
          onPersistSubtopicOrder={(subtopicId, delta) => withMessage(
            () => persistSubtopicOrder(topic.id, subtopicId, delta),
            "Sub-criterion order updated.",
            "Unable to reorder sub-criterion.",
          )}
          onDeleteSubtopic={(subtopicId) => withMessage(async () => {
            await deleteCriterion(subtopicId);
            router.refresh();
          }, "Sub-criterion deleted.", "Unable to delete sub-criterion.")}
          onAddSubtopic={(draft) => withMessage(async () => {
            await createCriterion({
              label: draft.label.trim(),
              code: draft.code.trim() || slugify(draft.label),
              phase,
              parentId: topic.id,
              order: topic.subtopics.length,
              weight: draft.weight,
              maxPoints: 0,
              kind: "CATEGORY",
              reviewerOnly: true,
            });
            router.refresh();
          }, "Sub-criterion added.", "Unable to add sub-criterion.")}
        />
      ))}
    </div>
  );
}

export function CriteriaClient({
  selfTemplate,
  selfTree,
  reviewerTree,
  mgmtTree,
}: {
  selfTemplate: AppraisalSelfFormTemplate;
  selfTree: Topic[];
  reviewerTree: Topic[];
  mgmtTree: Topic[];
}) {
  const [activePhase, setActivePhase] = useState<Phase>("SELF");
  const [trees, setTrees] = useState<Record<Phase, Topic[]>>({
    SELF: selfTree,
    REVIEWER: reviewerTree,
    MANAGEMENT: mgmtTree,
  });

  return (
    <div className="space-y-5">
      <div className="flex w-fit gap-1 rounded-lg bg-gray-100 p-1">
        {PHASES.map((phase) => (
          <button
            key={phase}
            onClick={() => setActivePhase(phase)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              activePhase === phase
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {PHASE_LABELS[phase]}
          </button>
        ))}
      </div>

      {activePhase === "SELF" ? (
        <div className="space-y-8">
          <SelfTemplatePanel initialTemplate={selfTemplate} />
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Self Rating Criteria</h2>
              <p className="text-sm text-gray-500">These criteria power the employee self-rating table.</p>
            </div>
            <CriterionEditorPanel
              phase="SELF"
              tree={trees.SELF}
              onTreeChange={(nextTree) => setTrees((current) => ({ ...current, SELF: nextTree }))}
            />
          </div>
        </div>
      ) : (
        <CriterionEditorPanel
          phase={activePhase}
          tree={trees[activePhase]}
          onTreeChange={(nextTree) => setTrees((current) => ({ ...current, [activePhase]: nextTree }))}
        />
      )}
    </div>
  );
}
