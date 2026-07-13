"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Workflow,
  X,
  PanelLeft,
  PanelRight,
  Settings2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PillToggle } from "@/components/ui/pill-toggle";
import * as actions from "@/modules/cha/actions";

interface WorkflowsClientProps {
  initialTemplates: any[];
  availableRoles: string[];
  availableJobTypes: { id: string; name: string }[];
}

type ValidityUnit = "BUSINESS_DAYS" | "CALENDAR_DAYS";

type DocumentValidityDraft = {
  documentType: string;
  requiresValidity: boolean;
  validityDuration: number | null;
  validityUnit: ValidityUnit;
  warningBeforeDuration: number | null;
  warningBeforeUnit: ValidityUnit;
  notifyBeforeExpiry: boolean;
};

type ChecklistItemDraft = DocumentValidityDraft & {
  id: string;
  label: string;
  description: string;
  isMandatory: boolean;
  requiresRemarks: boolean;
  allowsUpload: boolean;
  minUploads: number;
  maxUploads: number | null;
  acceptedFileTypes: string[];
  deadlineDuration: number;
  deadlineUnit: ValidityUnit;
  delayRemarksRequired: boolean;
  sortOrder: number;
  isActive: boolean;
};

type PhotoRequirementDraft = DocumentValidityDraft & {
  id: string;
  label: string;
  description: string;
  isMandatory: boolean;
  minPhotos: number;
  maxPhotos: number | null;
  acceptedFileTypes: string[];
  isVisibleInTimeline: boolean;
};

type FieldDefinitionDraft = {
  id: string;
  key: string;
  label: string;
  type: "TEXT" | "TEXTAREA" | "DATE";
  required: boolean;
  placeholder: string;
  helperText: string;
};

type DocumentRequirementDraft = {
  id: string;
  key: string;
  label: string;
  description: string;
  required: boolean;
  acceptedFileTypes: string[];
  minUploads: number;
  maxUploads: number | null;
  allowReplacement: boolean;
  allowPreview: boolean;
  documentType: string;
  requiresValidity: boolean;
  validityDuration: number | null;
  validityUnit: ValidityUnit;
  warningBeforeDuration: number | null;
  warningBeforeUnit: ValidityUnit;
  notifyBeforeExpiry: boolean;
  isVisibleInTimeline: boolean;
};

type AutoManagedNodeFields = {
  key: boolean;
  category: boolean;
  sectionKey: boolean;
  sectionName: boolean;
  branchKey: boolean;
  branchName: boolean;
  sortOrder: boolean;
};

type ConditionalSectionDraft = {
  key: string;
  label: string;
  type: string;
  defaultEnabled: boolean;
  unlocksDocuments: unknown[];
  unlocksFields: unknown[];
  config: Record<string, unknown> | null;
};

type PrerequisiteGateMode = "ALL" | "ANY";

type PrerequisiteGateDraft = {
  enabled: boolean;
  mode: PrerequisiteGateMode;
  requiredNodeKeys: string[];
};

type NodeActionConfigDraft = {
  prerequisiteGate: PrerequisiteGateDraft;
};

type DocumentRuleOptions = Partial<DocumentValidityDraft> & {
  allowsUpload?: boolean;
  minUploads?: number;
  maxUploads?: number | null;
  acceptedFileTypes?: string[];
  description?: string;
  isMandatory?: boolean;
  requiresRemarks?: boolean;
  delayRemarksRequired?: boolean;
  deadlineDuration?: number;
  deadlineUnit?: ValidityUnit;
};

type NodeDraft = {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  nodeType:
    | "CHECKLIST_NODE"
    | "START"
    | "END"
    | "DECISION"
    | "SECTION"
    | "NOTIFICATION";
  sectionKey: string;
  sectionName: string;
  branchKey: string;
  branchName: string;
  sortOrder: number;
  isActive: boolean;
  isStart: boolean;
  positionX: number;
  positionY: number;
  slaDuration: number;
  slaUnit: "BUSINESS_DAYS" | "CALENDAR_DAYS";
  commentsRequired: boolean;
  canBeSkipped: boolean;
  canBeRevisited: boolean;
  approvalRequired: boolean;
  approvalRoles: string[];
  requireAllMandatoryChecklistItems: boolean;
  requireMandatoryPhotos: boolean;
  allowedRoles: string[];
  checklistItems: ChecklistItemDraft[];
  photoRequirements: PhotoRequirementDraft[];
  fieldDefinitions: FieldDefinitionDraft[];
  documentRequirements: DocumentRequirementDraft[];
  conditionalSections: ConditionalSectionDraft[];
  actionConfig: NodeActionConfigDraft;
  autoManaged: AutoManagedNodeFields;
};

type CopiedNodeProperties = Pick<
  NodeDraft,
  | "description"
  | "category"
  | "nodeType"
  | "sectionKey"
  | "sectionName"
  | "branchKey"
  | "branchName"
  | "slaDuration"
  | "slaUnit"
  | "commentsRequired"
  | "canBeSkipped"
  | "canBeRevisited"
  | "approvalRequired"
  | "approvalRoles"
  | "requireAllMandatoryChecklistItems"
  | "requireMandatoryPhotos"
  | "allowedRoles"
  | "checklistItems"
  | "documentRequirements"
  | "conditionalSections"
  | "actionConfig"
>;

type EdgeDraft = {
  id: string;
  sourceKey: string;
  targetKey: string;
  label?: string | null;
};

const NODE_WIDTH = 272;
const NODE_HEIGHT = 154;
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.2;
const QUERY_PROCESSING_SECTION_KEY = "query_processing";

function createDefaultNodeActionConfig(): NodeActionConfigDraft {
  return {
    prerequisiteGate: {
      enabled: false,
      mode: "ALL",
      requiredNodeKeys: [],
    },
  };
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "node";
}

function createQueryProcessingSection(): ConditionalSectionDraft {
  return {
    key: QUERY_PROCESSING_SECTION_KEY,
    label: "Enable Query Processing",
    type: "TOGGLE",
    defaultEnabled: true,
    unlocksDocuments: [],
    unlocksFields: [],
    config: {
      moduleType: "CUSTOMS_QUERY_PROCESSING",
    },
  };
}

function createFieldDefinitionDraft(
  label: string,
  key: string,
  type: FieldDefinitionDraft["type"] = "TEXT",
  options: Partial<
    Omit<FieldDefinitionDraft, "id" | "label" | "key" | "type">
  > = {},
): FieldDefinitionDraft {
  return {
    id: createId("field"),
    key,
    label,
    type,
    required: options.required !== false,
    placeholder: options.placeholder || "",
    helperText: options.helperText || "",
  };
}

function createDocumentRequirementDraft(
  label: string,
  key: string,
  options: Partial<Omit<DocumentRequirementDraft, "id" | "label" | "key">> = {},
): DocumentRequirementDraft {
  return {
    id: createId("document"),
    key,
    label,
    description: options.description || "",
    required: options.required !== false,
    acceptedFileTypes: options.acceptedFileTypes || [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ],
    minUploads: options.minUploads ?? 1,
    maxUploads: options.maxUploads ?? null,
    allowReplacement: options.allowReplacement !== false,
    allowPreview: options.allowPreview !== false,
    documentType: options.documentType || label,
    requiresValidity: !!options.requiresValidity,
    validityDuration: options.validityDuration ?? null,
    validityUnit: options.validityUnit || "BUSINESS_DAYS",
    warningBeforeDuration: options.warningBeforeDuration ?? null,
    warningBeforeUnit: options.warningBeforeUnit || "BUSINESS_DAYS",
    notifyBeforeExpiry: !!options.notifyBeforeExpiry,
    isVisibleInTimeline: options.isVisibleInTimeline !== false,
  };
}

function createAutoManagedNodeFields(
  defaults: Partial<AutoManagedNodeFields> = {},
): AutoManagedNodeFields {
  return {
    key: defaults.key ?? true,
    category: defaults.category ?? true,
    sectionKey: defaults.sectionKey ?? true,
    sectionName: defaults.sectionName ?? true,
    branchKey: defaults.branchKey ?? true,
    branchName: defaults.branchName ?? true,
    sortOrder: defaults.sortOrder ?? true,
  };
}

function toTitleCaseFromSlug(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createBillFilingFieldDefinitions() {
  return [
    createFieldDefinitionDraft("Bill Filing Number", "bill_number", "TEXT", {
      placeholder: "Enter bill filing number",
      helperText: "Capture the filing reference number for this stage.",
    }),
    createFieldDefinitionDraft("Bill Filing Date", "bill_filing_date", "DATE", {
      placeholder: "Select bill filing date",
    }),
  ];
}

function createBillFilingDocumentRequirements() {
  return [
    createDocumentRequirementDraft("Bill Document", "bill_document", {
      acceptedFileTypes: ["application/pdf", "image/jpeg", "image/png"],
    }),
  ];
}

function normalizeValidityUnit(value: any): ValidityUnit {
  return value === "CALENDAR_DAYS" ? "CALENDAR_DAYS" : "BUSINESS_DAYS";
}

function normalizeDocumentValidity(item: any): DocumentValidityDraft {
  return {
    documentType: item.documentType || "",
    requiresValidity: !!item.requiresValidity,
    validityDuration:
      item.validityDuration === null ||
      item.validityDuration === undefined ||
      item.validityDuration === ""
        ? null
        : Math.max(1, Number(item.validityDuration)),
    validityUnit: normalizeValidityUnit(item.validityUnit),
    warningBeforeDuration:
      item.warningBeforeDuration === null ||
      item.warningBeforeDuration === undefined ||
      item.warningBeforeDuration === ""
        ? null
        : Math.max(1, Number(item.warningBeforeDuration)),
    warningBeforeUnit: normalizeValidityUnit(item.warningBeforeUnit),
    notifyBeforeExpiry: !!item.notifyBeforeExpiry,
  };
}

function normalizeChecklistItem(item: any, index: number): ChecklistItemDraft {
  return {
    ...normalizeDocumentValidity(item),
    id: item.id || createId("item"),
    label: item.label || "",
    description: item.description || "",
    isMandatory: item.isMandatory !== false,
    requiresRemarks: !!item.requiresRemarks,
    allowsUpload: !!item.allowsUpload,
    minUploads: Number(item.minUploads ?? 0),
    maxUploads:
      item.maxUploads === null || item.maxUploads === undefined
        ? null
        : Number(item.maxUploads),
    acceptedFileTypes: Array.isArray(item.acceptedFileTypes)
      ? item.acceptedFileTypes
      : [],
    deadlineDuration: Number(item.deadlineDuration ?? 2),
    deadlineUnit: normalizeValidityUnit(item.deadlineUnit),
    delayRemarksRequired: item.delayRemarksRequired !== false,
    sortOrder: Number(item.sortOrder ?? index + 1),
    isActive: item.isActive !== false,
  };
}

function normalizePhotoRequirement(item: any): PhotoRequirementDraft {
  return {
    ...normalizeDocumentValidity(item),
    id: item.id || createId("photo"),
    label: item.label || "",
    description: item.description || "",
    isMandatory: item.isMandatory !== false,
    minPhotos: Number(item.minPhotos ?? 1),
    maxPhotos:
      item.maxPhotos === null || item.maxPhotos === undefined
        ? null
        : Number(item.maxPhotos),
    acceptedFileTypes: Array.isArray(item.acceptedFileTypes)
      ? item.acceptedFileTypes
      : ["image/jpeg", "image/png", "application/pdf"],
    isVisibleInTimeline: item.isVisibleInTimeline !== false,
  };
}

function normalizeFieldDefinition(
  item: any,
  index: number,
): FieldDefinitionDraft {
  const rawType =
    typeof item?.type === "string" ? item.type.toUpperCase() : "TEXT";
  return {
    id: item.id || createId("field"),
    key: item.key || `field_${index + 1}`,
    label: item.label || `Field ${index + 1}`,
    type:
      rawType === "DATE"
        ? "DATE"
        : rawType === "TEXTAREA"
          ? "TEXTAREA"
          : "TEXT",
    required: item.required !== false,
    placeholder: item.placeholder || "",
    helperText: item.helperText || "",
  };
}

function normalizeDocumentRequirement(
  item: any,
  index: number,
): DocumentRequirementDraft {
  return {
    id: item.id || createId("document"),
    key: item.key || `document_${index + 1}`,
    label: item.label || `Document ${index + 1}`,
    description: item.description || "",
    required: item.required !== false,
    acceptedFileTypes: Array.isArray(item.acceptedFileTypes)
      ? item.acceptedFileTypes
      : ["application/pdf", "image/jpeg", "image/png"],
    minUploads: Number(item.minUploads ?? 1),
    maxUploads:
      item.maxUploads === null || item.maxUploads === undefined
        ? null
        : Number(item.maxUploads),
    allowReplacement: item.allowReplacement !== false,
    allowPreview: item.allowPreview !== false,
    documentType: item.documentType || item.label || `Document ${index + 1}`,
    requiresValidity: !!item.requiresValidity,
    validityDuration:
      item.validityDuration === null ||
      item.validityDuration === undefined ||
      item.validityDuration === ""
        ? null
        : Math.max(1, Number(item.validityDuration)),
    validityUnit: normalizeValidityUnit(item.validityUnit),
    warningBeforeDuration:
      item.warningBeforeDuration === null ||
      item.warningBeforeDuration === undefined ||
      item.warningBeforeDuration === ""
        ? null
        : Math.max(1, Number(item.warningBeforeDuration)),
    warningBeforeUnit: normalizeValidityUnit(item.warningBeforeUnit),
    notifyBeforeExpiry: !!item.notifyBeforeExpiry,
    isVisibleInTimeline: item.isVisibleInTimeline !== false,
  };
}

function normalizeLegacyPhotoRequirementAsDocument(
  item: any,
  index: number,
): DocumentRequirementDraft {
  const label = item.label || `Upload ${index + 1}`;
  return {
    id: createId("document"),
    key: `photo_${slugify(label)}_${index + 1}`,
    label,
    description: item.description || "",
    required: item.isMandatory !== false,
    acceptedFileTypes: Array.isArray(item.acceptedFileTypes)
      ? item.acceptedFileTypes
      : ["application/pdf", "image/jpeg", "image/png"],
    minUploads: Number(item.minPhotos ?? 1),
    maxUploads:
      item.maxPhotos === null || item.maxPhotos === undefined
        ? null
        : Number(item.maxPhotos),
    allowReplacement: true,
    allowPreview: true,
    documentType: item.documentType || label,
    requiresValidity: !!item.requiresValidity,
    validityDuration:
      item.validityDuration === null || item.validityDuration === undefined
        ? null
        : Math.max(1, Number(item.validityDuration)),
    validityUnit: normalizeValidityUnit(item.validityUnit),
    warningBeforeDuration:
      item.warningBeforeDuration === null ||
      item.warningBeforeDuration === undefined
        ? null
        : Math.max(1, Number(item.warningBeforeDuration)),
    warningBeforeUnit: normalizeValidityUnit(item.warningBeforeUnit),
    notifyBeforeExpiry: !!item.notifyBeforeExpiry,
    isVisibleInTimeline: item.isVisibleInTimeline !== false,
  };
}

function normalizeLegacyChecklistUploadAsDocument(
  item: any,
  index: number,
): DocumentRequirementDraft {
  const label =
    item.documentType || item.label || `Checklist Upload ${index + 1}`;
  return {
    id: createId("document"),
    key: `checklist_${slugify(label)}_${index + 1}`,
    label,
    description: item.description || "",
    required: item.isMandatory !== false,
    acceptedFileTypes: Array.isArray(item.acceptedFileTypes)
      ? item.acceptedFileTypes
      : ["application/pdf", "image/jpeg", "image/png"],
    minUploads: Number(item.minUploads ?? 1),
    maxUploads:
      item.maxUploads === null || item.maxUploads === undefined
        ? null
        : Number(item.maxUploads),
    allowReplacement: true,
    allowPreview: true,
    documentType: item.documentType || label,
    requiresValidity: !!item.requiresValidity,
    validityDuration:
      item.validityDuration === null || item.validityDuration === undefined
        ? null
        : Math.max(1, Number(item.validityDuration)),
    validityUnit: normalizeValidityUnit(item.validityUnit),
    warningBeforeDuration:
      item.warningBeforeDuration === null ||
      item.warningBeforeDuration === undefined
        ? null
        : Math.max(1, Number(item.warningBeforeDuration)),
    warningBeforeUnit: normalizeValidityUnit(item.warningBeforeUnit),
    notifyBeforeExpiry: !!item.notifyBeforeExpiry,
    isVisibleInTimeline: item.showInTimeline !== false,
  };
}

function normalizeConditionalSection(
  item: any,
  index: number,
): ConditionalSectionDraft {
  return {
    key: item.key || `section_${index + 1}`,
    label: item.label || `Section ${index + 1}`,
    type: item.type || "TOGGLE",
    defaultEnabled: !!item.defaultEnabled,
    unlocksDocuments: Array.isArray(item.unlocksDocuments)
      ? item.unlocksDocuments
      : [],
    unlocksFields: Array.isArray(item.unlocksFields) ? item.unlocksFields : [],
    config: item.config && typeof item.config === "object" ? item.config : null,
  };
}

function normalizePrerequisiteGate(value: any): PrerequisiteGateDraft {
  const raw = value && typeof value === "object" ? value : {};
  return {
    enabled: !!raw.enabled,
    mode: raw.mode === "ANY" ? "ANY" : "ALL",
    requiredNodeKeys: Array.isArray(raw.requiredNodeKeys)
      ? raw.requiredNodeKeys.filter(
          (entry: unknown): entry is string =>
            typeof entry === "string" && entry.trim().length > 0,
        )
      : [],
  };
}

function normalizeNodeActionConfig(value: any): NodeActionConfigDraft {
  const raw = value && typeof value === "object" ? value : {};
  return {
    prerequisiteGate: normalizePrerequisiteGate(raw.prerequisiteGate),
  };
}

function normalizeNode(node: any, index: number): NodeDraft {
  const normalizedDocumentRequirements = Array.isArray(
    node.documentRequirementsJson ?? node.documentRequirements,
  )
    ? (node.documentRequirementsJson ?? node.documentRequirements).map(
        normalizeDocumentRequirement,
      )
    : [];
  const normalizedLegacyPhotoRequirements = Array.isArray(node.photoRequirements)
    ? node.photoRequirements.map(normalizePhotoRequirement)
    : [];
  const normalizedChecklistItems = Array.isArray(node.checklistItems)
    ? node.checklistItems.map(normalizeChecklistItem)
    : [];
  const normalizedLegacyChecklistDocuments =
    normalizedDocumentRequirements.length === 0 &&
    normalizedLegacyPhotoRequirements.length === 0
      ? normalizedChecklistItems
          .filter(
            (item: ChecklistItemDraft) =>
              item.allowsUpload ||
              !!item.documentType ||
              item.requiresValidity ||
              item.notifyBeforeExpiry,
          )
          .map((item: ChecklistItemDraft, legacyIndex: number) =>
            normalizeLegacyChecklistUploadAsDocument(item, legacyIndex),
          )
      : [];
  const migratedChecklistItems = normalizedChecklistItems.map(
    (item: ChecklistItemDraft) => ({
    ...item,
    allowsUpload: false,
    minUploads: 0,
    maxUploads: null,
    acceptedFileTypes: [],
    documentType: "",
    requiresValidity: false,
    validityDuration: null,
    warningBeforeDuration: null,
    notifyBeforeExpiry: false,
  }),
  );
  return {
    id: node.id || createId("node"),
    key: node.key || `${slugify(node.name || "node")}_${index + 1}`,
    name: node.name || `Node ${index + 1}`,
    description: node.description || "",
    category: node.category || "CHECK",
    nodeType: node.nodeType || "CHECKLIST_NODE",
    sectionKey: node.sectionKey || "",
    sectionName: node.sectionName || "",
    branchKey: node.branchKey || "",
    branchName: node.branchName || "",
    sortOrder: Number(node.sortOrder ?? index + 1),
    isActive: node.isActive !== false,
    isStart: !!node.isStart,
    positionX: Number(node.positionX ?? 120 + index * 40),
    positionY: Number(node.positionY ?? 120 + index * 30),
    slaDuration: Number(node.slaDuration ?? 2),
    slaUnit:
      node.slaUnit === "CALENDAR_DAYS" ? "CALENDAR_DAYS" : "BUSINESS_DAYS",
    commentsRequired: !!node.commentsRequired,
    canBeSkipped: !!node.canBeSkipped,
    canBeRevisited: node.canBeRevisited !== false,
    approvalRequired: !!node.approvalRequired,
    approvalRoles: Array.isArray(node.approvalRoles) ? node.approvalRoles : [],
    requireAllMandatoryChecklistItems:
      node.requireAllMandatoryChecklistItems !== false,
    requireMandatoryPhotos: !!node.requireMandatoryPhotos,
    allowedRoles: Array.isArray(node.allowedRoles) ? node.allowedRoles : [],
    checklistItems:
      normalizedLegacyChecklistDocuments.length > 0
        ? migratedChecklistItems
        : normalizedChecklistItems,
    photoRequirements: [],
    fieldDefinitions: Array.isArray(
      node.fieldDefinitionsJson ?? node.fieldDefinitions,
    )
      ? (node.fieldDefinitionsJson ?? node.fieldDefinitions).map(
          normalizeFieldDefinition,
        )
      : [],
    documentRequirements:
      normalizedDocumentRequirements.length > 0
        ? normalizedDocumentRequirements
        : normalizedLegacyPhotoRequirements.length > 0
          ? normalizedLegacyPhotoRequirements.map(
              normalizeLegacyPhotoRequirementAsDocument,
            )
          : normalizedLegacyChecklistDocuments,
    conditionalSections: Array.isArray(
      node.conditionalSectionsJson ?? node.conditionalSections,
    )
      ? (node.conditionalSectionsJson ?? node.conditionalSections).map(
          normalizeConditionalSection,
        )
      : [],
    actionConfig: normalizeNodeActionConfig(
      node.actionConfigJson ?? node.actionConfig,
    ),
    autoManaged:
      node.autoManaged && typeof node.autoManaged === "object"
        ? createAutoManagedNodeFields(node.autoManaged)
        : createAutoManagedNodeFields({
            key: false,
            category: false,
            sectionKey: false,
            sectionName: false,
            branchKey: false,
            branchName: false,
            sortOrder: false,
          }),
  };
}

function buildValidation(nodes: NodeDraft[], edges: EdgeDraft[]) {
  const activeNodes = nodes.filter((node) => node.isActive);
  const activeNodeMap = new Map(activeNodes.map((node) => [node.key, node]));
  const errors: string[] = [];
  const warnings: string[] = [];
  const edgeSet = new Set<string>();
  const seenKeys = new Set<string>();

  const startNodes = activeNodes.filter((node) => node.isStart);
  if (activeNodes.length > 0 && startNodes.length !== 1) {
    errors.push(
      startNodes.length === 0
        ? "Exactly one start node is required."
        : "Only one start node can be active.",
    );
  }

  for (const node of activeNodes) {
    if (!node.key.trim()) {
      errors.push(`Node ${node.name || "untitled"} must have a key.`);
    }
    if (seenKeys.has(node.key)) {
      errors.push(`Duplicate node key ${node.key} detected.`);
    } else {
      seenKeys.add(node.key);
    }
    if (!node.name.trim()) {
      errors.push(`Node ${node.key} must have a name.`);
    }
    const activeItems = node.checklistItems.filter((item) => item.isActive);
    if (
      node.nodeType === "CHECKLIST_NODE" &&
      activeItems.length === 0 &&
      node.fieldDefinitions.length === 0 &&
      node.documentRequirements.length === 0 &&
      node.conditionalSections.length === 0
    ) {
      errors.push(
        `Checklist node ${node.name || node.key} must have at least one active checklist item, field, document, or conditional section.`,
      );
    }
    if (node.nodeType === "NOTIFICATION" && activeItems.length > 0) {
      warnings.push(
        `Notification node ${node.name || node.key} ignores checklist items.`,
      );
    }
    for (const item of activeItems) {
      if (!item.label.trim()) {
        errors.push(
          `Checklist items in ${node.name || node.key} must have a name.`,
        );
      }
      if (item.deadlineDuration <= 0) {
        errors.push(
          `Checklist item "${item.label || "Untitled"}" must have a valid SLA duration.`,
        );
      }
      if (
        item.allowsUpload &&
        item.maxUploads !== null &&
        item.maxUploads < item.minUploads
      ) {
        errors.push(
          `Checklist item "${item.label || "Untitled"}" has max uploads lower than min uploads.`,
        );
      }
    }
    for (const requirement of node.documentRequirements) {
      if (!requirement.label.trim()) {
        errors.push(
          `Document requirements in ${node.name || node.key} must have a name.`,
        );
      }
      if (requirement.minUploads < 0) {
        errors.push(
          `Document "${requirement.label || "Untitled"}" cannot require a negative minimum upload count.`,
        );
      }
      if (
        requirement.maxUploads !== null &&
        requirement.maxUploads < requirement.minUploads
      ) {
        errors.push(
          `Document "${requirement.label || "Untitled"}" has max uploads lower than min uploads.`,
        );
      }
    }

    const gate = node.actionConfig.prerequisiteGate;
    if (gate.enabled) {
      if (gate.requiredNodeKeys.length === 0) {
        errors.push(
          `Node ${node.name || node.key} has prerequisite gating enabled but no required stages selected.`,
        );
      }
      const duplicatePrereqs = gate.requiredNodeKeys.filter(
        (entry, idx, list) => list.indexOf(entry) !== idx,
      );
      if (duplicatePrereqs.length > 0) {
        errors.push(
          `Node ${node.name || node.key} has duplicate prerequisite stages.`,
        );
      }
      for (const requiredKey of gate.requiredNodeKeys) {
        if (requiredKey === node.key) {
          errors.push(
            `Node ${node.name || node.key} cannot require itself as a prerequisite.`,
          );
        } else if (!activeNodeMap.has(requiredKey)) {
          errors.push(
            `Node ${node.name || node.key} requires missing or inactive prerequisite stage ${requiredKey}.`,
          );
        }
      }
    }
  }

  for (const edge of edges) {
    if (edge.sourceKey === edge.targetKey) {
      errors.push(`Node ${edge.sourceKey} cannot connect to itself.`);
    }
    if (
      !activeNodeMap.has(edge.sourceKey) ||
      !activeNodeMap.has(edge.targetKey)
    ) {
      errors.push(
        `Edge ${edge.sourceKey} -> ${edge.targetKey} points to an inactive or missing node.`,
      );
    }
    const signature = `${edge.sourceKey}:${edge.targetKey}`;
    if (edgeSet.has(signature)) {
      errors.push(`Duplicate edge ${edge.sourceKey} -> ${edge.targetKey}.`);
    }
    edgeSet.add(signature);
  }

  const prereqAdjacency = new Map<string, string[]>();
  for (const node of activeNodes) {
    prereqAdjacency.set(
      node.key,
      node.actionConfig.prerequisiteGate.enabled
        ? [...node.actionConfig.prerequisiteGate.requiredNodeKeys]
        : [],
    );
  }
  const prereqVisited = new Set<string>();
  const prereqVisiting = new Set<string>();
  const prereqCycleNodes = new Set<string>();
  const visitPrereq = (nodeKey: string) => {
    if (prereqVisiting.has(nodeKey)) {
      prereqCycleNodes.add(nodeKey);
      return;
    }
    if (prereqVisited.has(nodeKey)) return;
    prereqVisiting.add(nodeKey);
    for (const nextKey of prereqAdjacency.get(nodeKey) || []) {
      if (activeNodeMap.has(nextKey)) {
        visitPrereq(nextKey);
      }
    }
    prereqVisiting.delete(nodeKey);
    prereqVisited.add(nodeKey);
  };
  for (const node of activeNodes) {
    visitPrereq(node.key);
  }
  if (prereqCycleNodes.size > 0) {
    errors.push(
      `Prerequisite cycle detected across: ${Array.from(prereqCycleNodes).join(", ")}.`,
    );
  }

  for (const node of activeNodes) {
    if (node.nodeType === "NOTIFICATION") {
      const outgoingCount = edges.filter(
        (edge) => edge.sourceKey === node.key,
      ).length;
      if (outgoingCount > 1) {
        errors.push(
          `Notification node ${node.name || node.key} can have at most one outgoing edge.`,
        );
      }
    }
  }

  if (startNodes.length === 1) {
    const visited = new Set<string>([startNodes[0].key]);
    const queue = [startNodes[0].key];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of edges.filter((entry) => entry.sourceKey === current)) {
        if (!visited.has(edge.targetKey) && activeNodeMap.has(edge.targetKey)) {
          visited.add(edge.targetKey);
          queue.push(edge.targetKey);
        }
      }
    }
    const disconnected = activeNodes.filter((node) => !visited.has(node.key));
    if (disconnected.length > 0) {
      errors.push(
        `Disconnected active nodes: ${disconnected.map((node) => node.name).join(", ")}.`,
      );
    }
  }

  for (const edge of edges) {
    const source = activeNodeMap.get(edge.sourceKey);
    const target = activeNodeMap.get(edge.targetKey);
    if (source && target && target.positionY <= source.positionY) {
      warnings.push(
        `Double-back path configured: ${source.name} -> ${target.name}.`,
      );
    }
  }

  return { errors, warnings };
}

function serializeWorkflowSnapshot(nodes: NodeDraft[], edges: EdgeDraft[]) {
  return JSON.stringify({
    nodes: nodes
      .map((node) => ({
        ...node,
        checklistItems: [...node.checklistItems].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        ),
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
    edges: [...edges]
      .map((edge) => ({
        sourceKey: edge.sourceKey,
        targetKey: edge.targetKey,
        label: edge.label || null,
      }))
      .sort((a, b) =>
        `${a.sourceKey}:${a.targetKey}`.localeCompare(
          `${b.sourceKey}:${b.targetKey}`,
        ),
      ),
  });
}

function createDocumentValidityDraft(
  options: DocumentRuleOptions = {},
): DocumentValidityDraft {
  return {
    documentType: options.documentType || "",
    requiresValidity: !!options.requiresValidity,
    validityDuration: options.validityDuration ?? null,
    validityUnit: options.validityUnit || "BUSINESS_DAYS",
    warningBeforeDuration: options.warningBeforeDuration ?? null,
    warningBeforeUnit: options.warningBeforeUnit || "BUSINESS_DAYS",
    notifyBeforeExpiry: !!options.notifyBeforeExpiry,
  };
}

function createChecklistItemDraft(
  label: string,
  sortOrder = 1,
  options: DocumentRuleOptions = {},
): ChecklistItemDraft {
  return {
    ...createDocumentValidityDraft(options),
    id: createId("item"),
    label,
    description: options.description || "",
    isMandatory: options.isMandatory !== false,
    requiresRemarks: !!options.requiresRemarks,
    allowsUpload: !!options.allowsUpload,
    minUploads: Number(options.minUploads ?? 0),
    maxUploads: options.maxUploads ?? null,
    acceptedFileTypes: options.acceptedFileTypes || [],
    deadlineDuration: Number(options.deadlineDuration ?? 2),
    deadlineUnit: options.deadlineUnit || "BUSINESS_DAYS",
    delayRemarksRequired: options.delayRemarksRequired !== false,
    sortOrder,
    isActive: true,
  };
}

function createStageUploadSlot(
  label: string,
  options: DocumentRuleOptions = {},
): PhotoRequirementDraft {
  const requiresUpload = options.allowsUpload !== false;
  return {
    ...createDocumentValidityDraft(options),
    id: createId("photo"),
    label,
    description:
      options.description ||
      "Upload supporting document, photo, or proof for this workflow node.",
    isMandatory: options.isMandatory !== false,
    minPhotos: Number(options.minUploads ?? (requiresUpload ? 1 : 0)),
    maxPhotos: options.maxUploads ?? null,
    acceptedFileTypes: options.acceptedFileTypes || [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ],
    isVisibleInTimeline: true,
  };
}

function getNextUniqueNodeKey(baseKey: string, nodes: NodeDraft[]) {
  if (!nodes.some((node) => node.key === baseKey)) {
    return baseKey;
  }
  let counter = 2;
  while (nodes.some((node) => node.key === `${baseKey}_${counter}`)) {
    counter += 1;
  }
  return `${baseKey}_${counter}`;
}

function getDefaultNodeCategory(nodeType: NodeDraft["nodeType"]) {
  switch (nodeType) {
    case "START":
      return "START";
    case "END":
      return "END";
    case "DECISION":
      return "DECISION";
    case "NOTIFICATION":
      return "NOTIFICATION";
    case "CHECKLIST_NODE":
      return "CHECKLIST_ITEM";
    default:
      return "MAIN_STAGE";
  }
}

function applyAutoManagedNodeMetadata(
  node: NodeDraft,
  nodes: NodeDraft[],
  contextNode?: NodeDraft | null,
): NodeDraft {
  const baseKey = slugify(node.name || node.key || "node");
  const derivedSectionKey = contextNode?.sectionKey || baseKey;
  const derivedSectionName =
    contextNode?.sectionName || node.name || toTitleCaseFromSlug(derivedSectionKey);
  const derivedBranchKey = contextNode?.branchKey || "";
  const derivedBranchName = contextNode?.branchName || "";
  const nodesExcludingSelf = nodes.filter((entry) => entry.id !== node.id);
  const nextSortOrder =
    nodesExcludingSelf.filter(
      (entry) =>
        (entry.sectionKey || "") === derivedSectionKey &&
        (entry.branchKey || "") === derivedBranchKey,
    ).length + 1;

  return {
    ...node,
    key: node.autoManaged.key
      ? getNextUniqueNodeKey(baseKey, nodesExcludingSelf)
      : node.key,
    category: node.autoManaged.category
      ? getDefaultNodeCategory(node.nodeType)
      : node.category,
    sectionKey: node.autoManaged.sectionKey ? derivedSectionKey : node.sectionKey,
    sectionName: node.autoManaged.sectionName
      ? derivedSectionName
      : node.sectionName,
    branchKey: node.autoManaged.branchKey ? derivedBranchKey : node.branchKey,
    branchName: node.autoManaged.branchName
      ? derivedBranchName
      : node.branchName,
    sortOrder: node.autoManaged.sortOrder ? nextSortOrder : node.sortOrder,
    approvalRoles: node.approvalRequired ? node.approvalRoles : [],
  };
}

function createWorkflowStageNode(
  name: string,
  key: string,
  order: number,
  x: number,
  y: number,
  isStart = false,
  options: {
    description?: string;
    category?: string;
    nodeType?: NodeDraft["nodeType"];
    sectionKey?: string;
    sectionName?: string;
    branchKey?: string;
    branchName?: string;
    canBeSkipped?: boolean;
    requireMandatoryPhotos?: boolean;
    photoRequirements?: PhotoRequirementDraft[];
    fieldDefinitions?: FieldDefinitionDraft[];
    documentRequirements?: DocumentRequirementDraft[];
    conditionalSections?: ConditionalSectionDraft[];
  } = {},
): NodeDraft {
  return {
    id: createId("node"),
    key,
    name,
    description: options.description || "Configurable filing workflow node.",
    category: options.category || "MAIN_STAGE",
    nodeType: options.nodeType || "SECTION",
    sectionKey: options.sectionKey ?? key,
    sectionName: options.sectionName ?? name,
    branchKey: options.branchKey || "",
    branchName: options.branchName || "",
    sortOrder: order,
    isActive: true,
    isStart,
    positionX: x,
    positionY: y,
    slaDuration: 2,
    slaUnit: "BUSINESS_DAYS",
    commentsRequired: false,
    canBeSkipped: !!options.canBeSkipped,
    canBeRevisited: true,
    approvalRequired: false,
    approvalRoles: [],
    requireAllMandatoryChecklistItems: true,
    requireMandatoryPhotos: !!options.requireMandatoryPhotos,
    allowedRoles: [],
    checklistItems: [],
    photoRequirements: options.photoRequirements || [],
    fieldDefinitions: options.fieldDefinitions || [],
    documentRequirements: options.documentRequirements || [],
    conditionalSections: options.conditionalSections || [],
    actionConfig: createDefaultNodeActionConfig(),
    autoManaged: createAutoManagedNodeFields(),
  };
}

function createWorkflowChecklistNode(
  label: string,
  key: string,
  order: number,
  x: number,
  y: number,
  sectionName: string,
  sectionKey: string,
  branchName = "",
  branchKey = "",
  options: DocumentRuleOptions & {
    nodeDescription?: string;
    canBeSkipped?: boolean;
    photoRequirements?: PhotoRequirementDraft[];
    fieldDefinitions?: FieldDefinitionDraft[];
    documentRequirements?: DocumentRequirementDraft[];
    conditionalSections?: ConditionalSectionDraft[];
  } = {},
): NodeDraft {
  const checklistOptions: DocumentRuleOptions = {
    ...options,
    allowsUpload: false,
    minUploads: 0,
    maxUploads: null,
    acceptedFileTypes: [],
    documentType: "",
    requiresValidity: false,
    validityDuration: null,
    warningBeforeDuration: null,
    notifyBeforeExpiry: false,
  };
  return {
    id: createId("node"),
    key,
    name: label,
    description:
      options.nodeDescription ||
      options.description ||
      "Standalone configurable checklist node. It can be rerouted, delayed, revisited, or branched independently.",
    category: "CHECKLIST_ITEM",
    nodeType: "CHECKLIST_NODE",
    sectionKey,
    sectionName,
    branchKey,
    branchName,
    sortOrder: order,
    isActive: true,
    isStart: false,
    positionX: x,
    positionY: y,
    slaDuration: Number(options.deadlineDuration ?? 2),
    slaUnit: options.deadlineUnit || "BUSINESS_DAYS",
    commentsRequired: false,
    canBeSkipped: !!options.canBeSkipped,
    canBeRevisited: true,
    approvalRequired: false,
    approvalRoles: [],
    requireAllMandatoryChecklistItems:
      options.isMandatory === false ? false : true,
    requireMandatoryPhotos: false,
    allowedRoles: [],
    checklistItems: [createChecklistItemDraft(label, 1, checklistOptions)],
    photoRequirements: options.photoRequirements || [],
    fieldDefinitions: options.fieldDefinitions || [],
    documentRequirements:
      options.documentRequirements ||
      (options.allowsUpload
        ? [
            createDocumentRequirementDraft(
              `${options.documentType || label} Upload`,
              `${slugify(options.documentType || label)}_upload`,
              {
                description:
                  options.description ||
                  "Upload the required supporting document for this stage.",
                required: options.isMandatory !== false,
                acceptedFileTypes:
                  options.acceptedFileTypes || [
                    "application/pdf",
                    "image/jpeg",
                    "image/png",
                  ],
                minUploads: options.minUploads ?? 1,
                maxUploads: options.maxUploads ?? null,
                documentType: options.documentType || label,
                requiresValidity: !!options.requiresValidity,
                validityDuration: options.validityDuration ?? null,
                validityUnit: options.validityUnit || "BUSINESS_DAYS",
                warningBeforeDuration: options.warningBeforeDuration ?? null,
                warningBeforeUnit:
                  options.warningBeforeUnit || "BUSINESS_DAYS",
                notifyBeforeExpiry: !!options.notifyBeforeExpiry,
              },
            ),
          ]
        : []),
    conditionalSections: options.conditionalSections || [],
    actionConfig: createDefaultNodeActionConfig(),
    autoManaged: createAutoManagedNodeFields(),
  };
}

function createWorkflowNotificationNode(
  name: string,
  key: string,
  order: number,
  x: number,
  y: number,
): NodeDraft {
  return {
    id: createId("node"),
    key,
    name,
    description:
      "Automatically notifies the job owner, assigned manager, and all assigned users, then moves to the next connected node.",
    category: "NOTIFICATION",
    nodeType: "NOTIFICATION",
    sectionKey: "",
    sectionName: "",
    branchKey: "",
    branchName: "",
    sortOrder: order,
    isActive: true,
    isStart: false,
    positionX: x,
    positionY: y,
    slaDuration: 1,
    slaUnit: "BUSINESS_DAYS",
    commentsRequired: false,
    canBeSkipped: false,
    canBeRevisited: true,
    approvalRequired: false,
    approvalRoles: [],
    requireAllMandatoryChecklistItems: false,
    requireMandatoryPhotos: false,
    allowedRoles: [],
    checklistItems: [],
    photoRequirements: [],
    fieldDefinitions: [],
    documentRequirements: [],
    conditionalSections: [],
    actionConfig: createDefaultNodeActionConfig(),
    autoManaged: createAutoManagedNodeFields(),
  };
}

function connectNodes(
  sourceKey: string,
  targetKey: string,
  label?: string,
): EdgeDraft {
  return {
    id: createId("edge"),
    sourceKey,
    targetKey,
    label: label || null,
  };
}

function buildChaFilingBlueprintDraft() {
  const nodes: NodeDraft[] = [];
  const edges: EdgeDraft[] = [];
  let order = 1;

  const startX = 1060;
  const importFirstCheckX = 120;
  const importSecondCheckX = 680;
  const importRmsX = 520;
  const importOpenBillX = 900;
  const exportFirstCheckX = 1240;
  const exportSecondCheckX = 1800;
  const exportRmsX = 1640;
  const exportOpenBillX = 2020;
  const startY = 120;
  const rowGap = 190;

  const pdfAndImageTypes = ["application/pdf", "image/jpeg", "image/png"];
  const imageAndReportTypes = ["image/jpeg", "image/png", "application/pdf"];
  const eWayBillTypes = ["application/pdf", "image/jpeg", "image/png"];

  const addEdge = (sourceKey: string, targetKey: string, label?: string) => {
    edges.push(connectNodes(sourceKey, targetKey, label));
  };

  const addStage = (
    name: string,
    key: string,
    x: number,
    y: number,
    isStart = false,
    options: Parameters<typeof createWorkflowStageNode>[6] = {},
  ) => {
    const node = createWorkflowStageNode(
      name,
      key,
      order++,
      x,
      y,
      isStart,
      options,
    );
    nodes.push(node);
    return node;
  };

  const addChecklist = (
    label: string,
    key: string,
    x: number,
    y: number,
    sectionName: string,
    sectionKey: string,
    branchName = "",
    branchKey = "",
    options: Parameters<typeof createWorkflowChecklistNode>[9] = {},
  ) => {
    const node = createWorkflowChecklistNode(
      label,
      key,
      order++,
      x,
      y,
      sectionName,
      sectionKey,
      branchName,
      branchKey,
      options,
    );
    nodes.push(node);
    return node;
  };

  const addSequentialChecklistPath = (
    entries: Array<{
      label: string;
      key: string;
      options?: Parameters<typeof createWorkflowChecklistNode>[9];
    }>,
    x: number,
    startYForPath: number,
    sectionName: string,
    sectionKey: string,
    branchName = "",
    branchKey = "",
    sourceKey: string,
    firstEdgeLabel: string,
  ) => {
    let previousKey = sourceKey;
    let lastKey = sourceKey;
    entries.forEach((entry, index) => {
      const node = addChecklist(
        entry.label,
        entry.key,
        x,
        startYForPath + index * rowGap,
        sectionName,
        sectionKey,
        branchName,
        branchKey,
        entry.options || {},
      );
      addEdge(previousKey, node.key, index === 0 ? firstEdgeLabel : "Next");
      previousKey = node.key;
      lastKey = node.key;
    });
    return lastKey;
  };

  const examinationOptions: Parameters<typeof createWorkflowChecklistNode>[9] =
    {
      allowsUpload: false,
      minUploads: 0,
      acceptedFileTypes: [],
      documentType: "",
      requiresValidity: false,
      validityDuration: null,
      validityUnit: "CALENDAR_DAYS",
      warningBeforeDuration: null,
      warningBeforeUnit: "CALENDAR_DAYS",
      notifyBeforeExpiry: false,
      description:
        "Upload examination photos and CE/Lab report file. Capture validity date so warnings and notifications can run before expiry.",
      nodeDescription:
        "Examination requires photos, CE/Lab report upload, validity tracking, warning, and notification.",
      documentRequirements: [
        createDocumentRequirementDraft("CE/Lab Report", "ce_lab_report", {
          description:
            "Upload CE/Lab report and capture validity date for warning/notification.",
          required: true,
          acceptedFileTypes: ["application/pdf", "image/jpeg", "image/png"],
          minUploads: 1,
          documentType: "CE/Lab Report",
          requiresValidity: true,
          validityUnit: "CALENDAR_DAYS",
          warningBeforeDuration: 1,
          warningBeforeUnit: "CALENDAR_DAYS",
          notifyBeforeExpiry: true,
        }),
        createDocumentRequirementDraft(
          "Examination Photos",
          "examination_photos",
          {
            description: "Upload one or more examination photos.",
            required: true,
            acceptedFileTypes: ["image/jpeg", "image/png"],
            minUploads: 1,
            documentType: "Examination Photos",
          },
        ),
      ],
    };

  const dutyOptionalOptions: Parameters<typeof createWorkflowChecklistNode>[9] =
    {
      isMandatory: false,
      canBeSkipped: true,
      description:
        "Duty is optional. Users can proceed without completing this checklist node.",
      nodeDescription:
        "Optional duty node. This can be skipped when duty is not applicable or already handled.",
    };

  const oocDocumentOptions: Parameters<typeof createWorkflowChecklistNode>[9] =
    {
      allowsUpload: true,
      minUploads: 1,
      acceptedFileTypes: pdfAndImageTypes,
      documentType: "OOC Document",
      description:
        "Upload the Out of Charge document before completing this node.",
      nodeDescription: "OOC requires document upload.",
      documentRequirements: [
        createDocumentRequirementDraft("OOC Document", "ooc_document", {
          description: "Upload OOC document.",
          required: true,
          acceptedFileTypes: pdfAndImageTypes,
          minUploads: 1,
          documentType: "OOC Document",
        }),
      ],
    };

  const deliveryEWayBillOptions: Parameters<
    typeof createWorkflowChecklistNode
  >[9] = {
    allowsUpload: true,
    minUploads: 1,
    acceptedFileTypes: eWayBillTypes,
    documentType: "E-Way Bill",
    requiresValidity: true,
    validityDuration: null,
    validityUnit: "CALENDAR_DAYS",
    warningBeforeDuration: 1,
    warningBeforeUnit: "CALENDAR_DAYS",
    notifyBeforeExpiry: true,
    description:
      "Upload E-Way Bill and capture validity date. Warning and notification should run before expiry.",
    nodeDescription:
      "Delivery requires E-Way Bill upload with validity tracking and expiry notification.",
    documentRequirements: [
      createDocumentRequirementDraft("E-Way Bill", "e_way_bill", {
        description:
          "Upload E-Way Bill and capture validity date for warning/notification.",
        required: true,
        acceptedFileTypes: eWayBillTypes,
        minUploads: 1,
        documentType: "E-Way Bill",
        requiresValidity: true,
        validityUnit: "CALENDAR_DAYS",
        warningBeforeDuration: 1,
        warningBeforeUnit: "CALENDAR_DAYS",
        notifyBeforeExpiry: true,
      }),
    ],
  };

  const requiredDocumentOptions = (
    documentType: string,
    description: string,
  ): Parameters<typeof createWorkflowChecklistNode>[9] => ({
    allowsUpload: true,
    minUploads: 1,
    acceptedFileTypes: pdfAndImageTypes,
    documentType,
    description,
    nodeDescription: `${documentType} upload is mandatory for this node.`,
    documentRequirements: [
      createDocumentRequirementDraft(documentType, slugify(documentType), {
        description,
        required: true,
        acceptedFileTypes: pdfAndImageTypes,
        minUploads: 1,
        documentType,
      }),
    ],
  });

  const buildBillFlow = ({
    flowLabel,
    flowKey,
    copyGenerationLabel,
    firstCheckX,
    secondCheckX,
    rmsX,
    openBillX,
    entrySourceKey,
    entryEdgeLabel,
    flowKind,
  }: {
    flowLabel: string;
    flowKey: string;
    copyGenerationLabel: string;
    firstCheckX: number;
    secondCheckX: number;
    rmsX: number;
    openBillX: number;
    entrySourceKey: string;
    entryEdgeLabel: string;
    flowKind: "IMPORT" | "EXPORT";
  }) => {
    const checkTypeDecision = addStage(
      `Choose ${flowLabel} Check Type`,
      `${flowKey}_choose_check_type`,
      secondCheckX - (secondCheckX - firstCheckX) / 2,
      startY + rowGap * 2,
      false,
      {
        category: "DECISION",
        nodeType: "DECISION",
        sectionKey: `${flowKey}_routing`,
        sectionName: `${flowLabel} Routing`,
        description: `User decision point: choose whether this ${flowKind === "IMPORT" ? "import" : "export"} filing needs First Check or Second Check after the common bill filing step.`,
      },
    );
    addEdge(entrySourceKey, checkTypeDecision.key, entryEdgeLabel);

    const firstCheckStage = addStage(
      `${flowLabel} First Check`,
      `${flowKey}_first_check`,
      firstCheckX,
      startY + rowGap * 3,
      false,
      {
        sectionKey: `${flowKey}_first_check`,
        sectionName: `${flowLabel} First Check`,
        description: `${flowLabel} First Check workflow path selected by the user after the shared Bill Filing step.`,
      },
    );
    addEdge(checkTypeDecision.key, firstCheckStage.key, "First Check");

    const firstCheckLastKey = addSequentialChecklistPath(
      [
        {
          label: copyGenerationLabel,
          key: `${flowKey}_first_check_copy_generation`,
        },
        {
          label: "Goods Registration",
          key: `${flowKey}_first_check_goods_registration`,
        },
        {
          label: "Examination",
          key: `${flowKey}_first_check_examination`,
          options: examinationOptions,
        },
        { label: "Group Forward", key: `${flowKey}_first_check_group_forward` },
        { label: "Assessment", key: `${flowKey}_first_check_assessment` },
        {
          label: "Duty",
          key: `${flowKey}_first_check_duty`,
          options: dutyOptionalOptions,
        },
        {
          label: "OOC",
          key: `${flowKey}_first_check_ooc`,
          options: oocDocumentOptions,
        },
        {
          label: "Delivery",
          key: `${flowKey}_first_check_delivery`,
          options: deliveryEWayBillOptions,
        },
      ],
      firstCheckX,
      startY + rowGap * 4,
      `${flowLabel} First Check`,
      `${flowKey}_first_check`,
      "",
      "",
      firstCheckStage.key,
      `Start ${flowLabel} First Check`,
    );

    const secondCheckStage = addStage(
      `${flowLabel} Second Check`,
      `${flowKey}_second_check`,
      secondCheckX,
      startY + rowGap * 3,
      false,
      {
        sectionKey: `${flowKey}_second_check`,
        sectionName: `${flowLabel} Second Check`,
        description: `${flowLabel} Second Check workflow path selected by the user after the shared Bill Filing step.`,
      },
    );
    addEdge(checkTypeDecision.key, secondCheckStage.key, "Second Check");

    const secondCheckDecision = addStage(
      `Choose ${flowLabel} Second Check Category`,
      `${flowKey}_choose_second_check_category`,
      secondCheckX,
      startY + rowGap * 4,
      false,
      {
        category: "DECISION",
        nodeType: "DECISION",
        sectionKey: `${flowKey}_second_check`,
        sectionName: `${flowLabel} Second Check`,
        description: `User decision point under ${flowLabel} Second Check: choose RMS or Open Bill.`,
      },
    );
    addEdge(
      secondCheckStage.key,
      secondCheckDecision.key,
      "Choose RMS/Open Bill",
    );

    const rmsStage = addStage(
      `${flowLabel} RMS`,
      `${flowKey}_second_check_rms`,
      rmsX,
      startY + rowGap * 5,
      false,
      {
        category: "BRANCH",
        sectionKey: `${flowKey}_second_check`,
        sectionName: `${flowLabel} Second Check`,
        branchKey: "rms",
        branchName: "RMS",
        description: `${flowLabel} RMS branch under Second Check. Duty is copied from the other checks and comes before OOC.`,
      },
    );
    addEdge(secondCheckDecision.key, rmsStage.key, "RMS");

    const rmsLastKey = addSequentialChecklistPath(
      [
        {
          label: "Duty",
          key: `${flowKey}_second_check_rms_duty`,
          options: dutyOptionalOptions,
        },
        {
          label: "OOC",
          key: `${flowKey}_second_check_rms_ooc`,
          options: requiredDocumentOptions(
            `${flowLabel} RMS OOC Document`,
            `Upload ${flowLabel} RMS OOC document.`,
          ),
        },
        {
          label: "Delivery",
          key: `${flowKey}_second_check_rms_delivery`,
          options: requiredDocumentOptions(
            `${flowLabel} RMS Delivery Document`,
            `Upload delivery document for ${flowLabel} RMS.`,
          ),
        },
      ],
      rmsX,
      startY + rowGap * 6,
      `${flowLabel} Second Check`,
      `${flowKey}_second_check`,
      "RMS",
      "rms",
      rmsStage.key,
      `Start ${flowLabel} RMS`,
    );

    const openBillStage = addStage(
      `${flowLabel} Open Bill`,
      `${flowKey}_second_check_open_bill`,
      openBillX,
      startY + rowGap * 5,
      false,
      {
        category: "BRANCH",
        sectionKey: `${flowKey}_second_check`,
        sectionName: `${flowLabel} Second Check`,
        branchKey: "open_bill",
        branchName: "Open Bill",
        description: `${flowLabel} Open Bill branch under Second Check.`,
      },
    );
    addEdge(secondCheckDecision.key, openBillStage.key, "Open Bill");

    const openBillLastKey = addSequentialChecklistPath(
      [
        {
          label: "Assessment",
          key: `${flowKey}_second_check_open_bill_assessment`,
        },
        {
          label: "Goods Registration",
          key: `${flowKey}_second_check_open_bill_goods_registration`,
        },
        {
          label: "Examination",
          key: `${flowKey}_second_check_open_bill_examination`,
          options: examinationOptions,
        },
        {
          label: "Duty",
          key: `${flowKey}_second_check_open_bill_duty`,
          options: dutyOptionalOptions,
        },
        {
          label: "OOC",
          key: `${flowKey}_second_check_open_bill_ooc`,
          options: oocDocumentOptions,
        },
        {
          label: "Delivery",
          key: `${flowKey}_second_check_open_bill_delivery`,
          options: deliveryEWayBillOptions,
        },
      ],
      openBillX,
      startY + rowGap * 6,
      `${flowLabel} Second Check`,
      `${flowKey}_second_check`,
      "Open Bill",
      "open_bill",
      openBillStage.key,
      `Start ${flowLabel} Open Bill`,
    );

    return {
      firstCheckLastKey,
      rmsLastKey,
      openBillLastKey,
    };
  };

  const billFiling = addStage(
    "Bill Filing",
    "bill_filing",
    startX,
    startY,
    true,
    {
      sectionKey: "bill_filing",
      sectionName: "Bill Filing",
      description:
        "Capture the bill filing number, filing date, configured uploads, and optional customs query handling before choosing the filing path.",
      fieldDefinitions: createBillFilingFieldDefinitions(),
      documentRequirements: createBillFilingDocumentRequirements(),
      conditionalSections: [createQueryProcessingSection()],
    },
  );

  const flowDecision = addStage(
    "Choose Filing Flow",
    "choose_filing_flow",
    startX,
    startY + rowGap,
    false,
    {
      category: "DECISION",
      nodeType: "DECISION",
      sectionKey: "routing",
      sectionName: "Routing",
      description:
        "Choose Import/Bill of Entry flow or Export/Shipping Bill flow. Backend should later auto-select this from clearance type.",
    },
  );
  addEdge(billFiling.key, flowDecision.key, "Select Filing Flow");

  const importFlow = buildBillFlow({
    flowLabel: "Import BE",
    flowKey: "import_be",
    copyGenerationLabel: "BE Copy Generation",
    firstCheckX: importFirstCheckX,
    secondCheckX: importSecondCheckX,
    rmsX: importRmsX,
    openBillX: importOpenBillX,
    entrySourceKey: flowDecision.key,
    entryEdgeLabel: "Import / Bill of Entry",
    flowKind: "IMPORT",
  });

  const exportFlow = buildBillFlow({
    flowLabel: "Export SB",
    flowKey: "export_sb",
    copyGenerationLabel: "SB Copy Generation",
    firstCheckX: exportFirstCheckX,
    secondCheckX: exportSecondCheckX,
    rmsX: exportRmsX,
    openBillX: exportOpenBillX,
    entrySourceKey: flowDecision.key,
    entryEdgeLabel: "Export / Shipping Bill",
    flowKind: "EXPORT",
  });

  const amendmentDecisionY = startY + rowGap * 14;
  const amendmentDecision = addStage(
    "Amendment Required?",
    "amendment_required",
    startX,
    amendmentDecisionY,
    false,
    {
      category: "DECISION",
      nodeType: "DECISION",
      sectionKey: "amendment",
      sectionName: "Amendment",
      description:
        "Optional decision point. User can skip amendment or proceed to amendment when required.",
    },
  );

  [
    { key: importFlow.firstCheckLastKey, label: "Import First Check Complete" },
    { key: importFlow.rmsLastKey, label: "Import RMS Complete" },
    { key: importFlow.openBillLastKey, label: "Import Open Bill Complete" },
    { key: exportFlow.firstCheckLastKey, label: "Export First Check Complete" },
    { key: exportFlow.rmsLastKey, label: "Export RMS Complete" },
    { key: exportFlow.openBillLastKey, label: "Export Open Bill Complete" },
  ].forEach(({ key, label }) => addEdge(key, amendmentDecision.key, label));

  const amendment = addStage(
    "Amendment",
    "amendment",
    startX,
    amendmentDecisionY + rowGap,
    false,
    {
      category: "OPTIONAL_STAGE",
      sectionKey: "amendment",
      sectionName: "Amendment",
      canBeSkipped: true,
      description:
        "Optional amendment workflow placeholder. Add configurable amendment checklist nodes only when amendment is required.",
    },
  );

  const completed = addStage(
    "Filing Complete",
    "filing_complete",
    startX,
    amendmentDecisionY + rowGap * 2,
    false,
    {
      category: "END",
      nodeType: "END",
      sectionKey: "completed",
      sectionName: "Completed",
      description: "End of the filing workflow.",
    },
  );

  addEdge(amendmentDecision.key, amendment.key, "Do Amendment");
  addEdge(amendmentDecision.key, completed.key, "Skip Amendment");
  addEdge(amendment.key, completed.key, "Amendment Complete");

  return { nodes, edges };
}
function getConnectorPath(source: NodeDraft, target: NodeDraft) {
  const sourceCenterX = source.positionX + NODE_WIDTH / 2;
  const sourceCenterY = source.positionY + NODE_HEIGHT / 2;
  const targetCenterX = target.positionX + NODE_WIDTH / 2;
  const targetCenterY = target.positionY + NODE_HEIGHT / 2;
  const isBackRoute = target.positionY <= source.positionY;
  const isSideRoute =
    Math.abs(targetCenterX - sourceCenterX) > NODE_WIDTH &&
    Math.abs(targetCenterY - sourceCenterY) < NODE_HEIGHT * 1.4;

  if (isBackRoute || isSideRoute) {
    const startX =
      targetCenterX < sourceCenterX
        ? source.positionX
        : source.positionX + NODE_WIDTH;
    const startY = sourceCenterY;
    const endX =
      targetCenterX < sourceCenterX
        ? target.positionX + NODE_WIDTH
        : target.positionX;
    const endY = targetCenterY;
    const controlOffset = Math.max(120, Math.abs(endX - startX) / 2);
    const c1x = startX + (endX > startX ? controlOffset : -controlOffset);
    const c2x = endX - (endX > startX ? controlOffset : -controlOffset);
    return {
      path: `M ${startX} ${startY} C ${c1x} ${startY}, ${c2x} ${endY}, ${endX} ${endY}`,
      labelX: (startX + endX) / 2,
      labelY: (startY + endY) / 2 - 12,
      isBackRoute,
    };
  }

  const startX = sourceCenterX;
  const startY = source.positionY + NODE_HEIGHT;
  const endX = targetCenterX;
  const endY = target.positionY;
  const curve = Math.max(90, Math.abs(endY - startY) / 2);
  return {
    path: `M ${startX} ${startY} C ${startX} ${startY + curve}, ${endX} ${endY - curve}, ${endX} ${endY}`,
    labelX: (startX + endX) / 2,
    labelY: (startY + endY) / 2,
    isBackRoute,
  };
}

function describeNodeType(node: NodeDraft) {
  if (node.nodeType === "SECTION" && node.category === "MAIN_STAGE")
    return "MAIN STAGE";
  if (node.category === "BRANCH") return "BRANCH";
  if (node.category === "CHECKLIST_ITEM") return "CHECKLIST";
  return node.nodeType.replace(/_/g, " ");
}

function autoArrangeNodes(nodes: NodeDraft[], edges: EdgeDraft[]) {
  if (nodes.length === 0) {
    return nodes;
  }

  const VERTICAL_GAP = 180;
  const HORIZONTAL_GAP = 360;
  const ROOT_GAP_UNITS = 1.5;
  const SIBLING_GAP_UNITS = 0.45;
  const START_X = 120;
  const START_Y = 120;
  const nextPositions = new Map<string, { x: number; y: number }>();
  const nodeByKey = new Map(nodes.map((node) => [node.key, node]));
  const outgoing = new Map<string, EdgeDraft[]>();
  const incoming = new Map<string, EdgeDraft[]>();

  for (const node of nodes) {
    outgoing.set(node.key, []);
    incoming.set(node.key, []);
  }

  for (const edge of edges) {
    if (!nodeByKey.has(edge.sourceKey) || !nodeByKey.has(edge.targetKey)) {
      continue;
    }
    outgoing.get(edge.sourceKey)?.push(edge);
    incoming.get(edge.targetKey)?.push(edge);
  }

  const compareNodes = (leftKey: string, rightKey: string) => {
    const left = nodeByKey.get(leftKey);
    const right = nodeByKey.get(rightKey);
    if (!left || !right) return 0;
    return (
      left.sortOrder - right.sortOrder ||
      left.positionY - right.positionY ||
      left.positionX - right.positionX ||
      left.name.localeCompare(right.name)
    );
  };

  const compareEdges = (left: EdgeDraft, right: EdgeDraft) => {
    const leftLabel = (left.label || "").toLowerCase();
    const rightLabel = (right.label || "").toLowerCase();
    return (
      leftLabel.localeCompare(rightLabel) ||
      compareNodes(left.targetKey, right.targetKey)
    );
  };

  for (const nodeEdges of outgoing.values()) {
    nodeEdges.sort(compareEdges);
  }
  for (const nodeEdges of incoming.values()) {
    nodeEdges.sort((left, right) => compareNodes(left.sourceKey, right.sourceKey));
  }

  const remainingInDegree = new Map<string, number>();
  for (const node of nodes) {
    remainingInDegree.set(node.key, incoming.get(node.key)?.length || 0);
  }

  const topoQueue = nodes
    .filter(
      (node) => node.isStart || (remainingInDegree.get(node.key) || 0) === 0,
    )
    .sort((left, right) => compareNodes(left.key, right.key));
  const topoOrder: string[] = [];
  const seenInTopo = new Set<string>();

  while (topoQueue.length > 0) {
    const current = topoQueue.shift()!;
    if (seenInTopo.has(current.key)) continue;
    seenInTopo.add(current.key);
    topoOrder.push(current.key);

    for (const edge of outgoing.get(current.key) || []) {
      const nextCount = (remainingInDegree.get(edge.targetKey) || 0) - 1;
      remainingInDegree.set(edge.targetKey, nextCount);
      if (nextCount <= 0) {
        const target = nodeByKey.get(edge.targetKey);
        if (target) {
          topoQueue.push(target);
          topoQueue.sort((left, right) => compareNodes(left.key, right.key));
        }
      }
    }
  }

  nodes
    .filter((node) => !seenInTopo.has(node.key))
    .sort((left, right) => compareNodes(left.key, right.key))
    .forEach((node) => topoOrder.push(node.key));

  const depthByKey = new Map<string, number>();
  for (const key of topoOrder) {
    const parents = incoming.get(key) || [];
    const depth =
      parents.length === 0
        ? 0
        : Math.max(
            ...parents.map(
              (edge) => (depthByKey.get(edge.sourceKey) ?? 0) + 1,
            ),
          );
    depthByKey.set(key, depth);
  }

  const primaryParentByKey = new Map<string, string>();
  for (const key of topoOrder) {
    const parents = incoming.get(key) || [];
    if (parents.length === 0) continue;
    const primaryParent = [...parents].sort((left, right) => {
      const leftDepth = depthByKey.get(left.sourceKey) ?? 0;
      const rightDepth = depthByKey.get(right.sourceKey) ?? 0;
      return (
        rightDepth - leftDepth ||
        compareNodes(left.sourceKey, right.sourceKey)
      );
    })[0];
    if (primaryParent) {
      primaryParentByKey.set(key, primaryParent.sourceKey);
    }
  }

  const treeChildren = new Map<string, string[]>();
  for (const node of nodes) {
    treeChildren.set(node.key, []);
  }
  for (const [childKey, parentKey] of primaryParentByKey.entries()) {
    treeChildren.get(parentKey)?.push(childKey);
  }
  for (const [parentKey, childKeys] of treeChildren.entries()) {
    childKeys.sort((leftKey, rightKey) => {
      const leftEdge = (outgoing.get(parentKey) || []).find(
        (edge) => edge.targetKey === leftKey,
      );
      const rightEdge = (outgoing.get(parentKey) || []).find(
        (edge) => edge.targetKey === rightKey,
      );
      if (leftEdge && rightEdge) {
        return compareEdges(leftEdge, rightEdge);
      }
      return compareNodes(leftKey, rightKey);
    });
  }

  const subtreeWidthByKey = new Map<string, number>();
  const measureSubtree = (key: string): number => {
    if (subtreeWidthByKey.has(key)) {
      return subtreeWidthByKey.get(key)!;
    }
    const childKeys = treeChildren.get(key) || [];
    if (childKeys.length === 0) {
      subtreeWidthByKey.set(key, 1);
      return 1;
    }
    if (childKeys.length === 1) {
      const width = Math.max(1, measureSubtree(childKeys[0]));
      subtreeWidthByKey.set(key, width);
      return width;
    }
    const width =
      childKeys.reduce((sum, childKey) => sum + measureSubtree(childKey), 0) +
      SIBLING_GAP_UNITS * (childKeys.length - 1);
    subtreeWidthByKey.set(key, width);
    return width;
  };

  const centerByKey = new Map<string, number>();
  const positionTree = (key: string, startUnit: number) => {
    const childKeys = treeChildren.get(key) || [];
    const subtreeWidth = subtreeWidthByKey.get(key) ?? measureSubtree(key);
    if (childKeys.length === 0) {
      centerByKey.set(key, startUnit + subtreeWidth / 2);
      return;
    }

    let cursor = startUnit;
    for (const childKey of childKeys) {
      const childWidth = subtreeWidthByKey.get(childKey) ?? measureSubtree(childKey);
      positionTree(childKey, cursor);
      cursor += childWidth + SIBLING_GAP_UNITS;
    }

    const firstCenter = centerByKey.get(childKeys[0]) ?? startUnit + 0.5;
    const lastCenter =
      centerByKey.get(childKeys[childKeys.length - 1]) ??
      startUnit + subtreeWidth - 0.5;
    centerByKey.set(key, (firstCenter + lastCenter) / 2);
  };

  const rootKeys = topoOrder.filter((key) => !primaryParentByKey.has(key));
  let rootCursor = 0;
  for (const rootKey of rootKeys) {
    const width = measureSubtree(rootKey);
    positionTree(rootKey, rootCursor);
    rootCursor += width + ROOT_GAP_UNITS;
  }

  for (const key of topoOrder) {
    const parentEdges = incoming.get(key) || [];
    if (parentEdges.length < 2) continue;
    const parentCenters = parentEdges
      .map((edge) => centerByKey.get(edge.sourceKey))
      .filter((value): value is number => typeof value === "number");
    if (parentCenters.length >= 2) {
      centerByKey.set(
        key,
        parentCenters.reduce((sum, value) => sum + value, 0) /
          parentCenters.length,
      );
    }
  }

  for (const node of nodes) {
    const centerUnit = centerByKey.get(node.key);
    const depth = depthByKey.get(node.key) ?? 0;
    nextPositions.set(node.id, {
      x:
        centerUnit === undefined
          ? node.positionX
          : Math.round(START_X + centerUnit * HORIZONTAL_GAP - NODE_WIDTH / 2),
      y: START_Y + depth * VERTICAL_GAP,
    });
  }

  return nodes.map((node) => ({
    ...node,
    positionX: nextPositions.get(node.id)?.x ?? node.positionX,
    positionY: nextPositions.get(node.id)?.y ?? node.positionY,
  }));
}

function expandChecklistNodesForCanvas(rawNodes: any[], rawEdges: any[]) {
  const expandedNodes: NodeDraft[] = [];
  const generatedEdges: EdgeDraft[] = [];
  const finalEdges: EdgeDraft[] = [];
  const bridgeMap = new Map<string, { firstKey: string; lastKey: string }>();
  let didExpand = false;

  for (const [index, rawNode] of rawNodes.entries()) {
    const normalizedNode = normalizeNode(rawNode, index);
    const activeChecklistItems = normalizedNode.checklistItems.filter(
      (item) => item.isActive,
    );
    const shouldExpand =
      normalizedNode.category !== "CHECKLIST_ITEM" &&
      activeChecklistItems.length > 0;

    if (!shouldExpand) {
      expandedNodes.push(normalizedNode);
      continue;
    }
    didExpand = true;

    const orderedItems = [...normalizedNode.checklistItems].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const checklistNodes = orderedItems.map((item, itemIndex) => {
      const itemKey = `${normalizedNode.key}_item_${itemIndex + 1}`;
      return {
        ...normalizedNode,
        id: createId("node"),
        key: itemKey,
        name: item.label || `${normalizedNode.name} Item ${itemIndex + 1}`,
        description: item.description || normalizedNode.description,
        category: "CHECKLIST_ITEM",
        isStart: normalizedNode.isStart && itemIndex === 0,
        positionX: normalizedNode.positionX + itemIndex * (NODE_WIDTH + 48),
        positionY: normalizedNode.positionY,
        checklistItems: [{ ...item, sortOrder: 1 }],
        photoRequirements:
          itemIndex === 0 ? normalizedNode.photoRequirements : [],
      } satisfies NodeDraft;
    });

    for (
      let itemIndex = 0;
      itemIndex < checklistNodes.length - 1;
      itemIndex += 1
    ) {
      generatedEdges.push({
        id: createId("edge"),
        sourceKey: checklistNodes[itemIndex].key,
        targetKey: checklistNodes[itemIndex + 1].key,
        label: "Checklist Sequence",
      });
    }

    bridgeMap.set(normalizedNode.key, {
      firstKey: checklistNodes[0].key,
      lastKey: checklistNodes[checklistNodes.length - 1].key,
    });
    expandedNodes.push(...checklistNodes);
  }

  const edgeSignatures = new Set<string>();
  for (const edge of [...generatedEdges, ...rawEdges]) {
    const sourceKey = bridgeMap.get(edge.sourceKey)?.lastKey ?? edge.sourceKey;
    const targetKey = bridgeMap.get(edge.targetKey)?.firstKey ?? edge.targetKey;
    if (!sourceKey || !targetKey || sourceKey === targetKey) continue;
    const signature = `${sourceKey}:${targetKey}:${edge.label || ""}`;
    if (edgeSignatures.has(signature)) continue;
    edgeSignatures.add(signature);
    finalEdges.push({
      id: edge.id || createId("edge"),
      sourceKey,
      targetKey,
      label: edge.label || null,
    });
  }

  return {
    nodes: expandedNodes,
    edges: finalEdges,
    didExpand,
  };
}

export function WorkflowsClient({
  initialTemplates,
  availableRoles,
  availableJobTypes,
}: WorkflowsClientProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const capturedPointerElementRef = useRef<HTMLElement | null>(null);
  const bodyInteractionStyleRef = useRef<{
    userSelect: string;
    cursor: string;
  } | null>(null);

  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    initialTemplates[0]?.id || null,
  );
  const [selectedClearanceTypeId, setSelectedClearanceTypeId] =
    useState<string>("");
  const [activeVersion, setActiveVersion] = useState<any>(null);
  const [nodes, setNodes] = useState<NodeDraft[]>([]);
  const [edges, setEdges] = useState<EdgeDraft[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeType, setNewNodeType] =
    useState<NodeDraft["nodeType"]>("SECTION");
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [connectingSourceKey, setConnectingSourceKey] = useState<string | null>(
    null,
  );
  const [connectionCursor, setConnectionCursor] = useState({ x: 0, y: 0 });
  const [hoveredTargetKey, setHoveredTargetKey] = useState<string | null>(null);
  const [loadedSnapshot, setLoadedSnapshot] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [validationOpen, setValidationOpen] = useState(false);
  const [copiedNodeProperties, setCopiedNodeProperties] =
    useState<CopiedNodeProperties | null>(null);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  const validation = useMemo(
    () => buildValidation(nodes, edges),
    [nodes, edges],
  );
  const hasUnsavedChanges = useMemo(
    () => serializeWorkflowSnapshot(nodes, edges) !== loadedSnapshot,
    [edges, loadedSnapshot, nodes],
  );
  const showEditableActions = !activeVersion?.isPublished || hasUnsavedChanges;
  const importStarterType = useMemo(
    () =>
      availableJobTypes.find(
        (jobType) => jobType.name.trim().toLowerCase() === "import clearance",
      ) ?? null,
    [availableJobTypes],
  );
  const exportStarterType = useMemo(
    () =>
      availableJobTypes.find(
        (jobType) => jobType.name.trim().toLowerCase() === "export clearance",
      ) ?? null,
    [availableJobTypes],
  );

  const screenToCanvas = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  };

  const lockDocumentInteraction = (cursor = "grabbing") => {
    if (typeof document === "undefined" || bodyInteractionStyleRef.current)
      return;
    bodyInteractionStyleRef.current = {
      userSelect: document.body.style.userSelect,
      cursor: document.body.style.cursor,
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = cursor;
  };

  const unlockDocumentInteraction = () => {
    if (typeof document === "undefined" || !bodyInteractionStyleRef.current)
      return;
    document.body.style.userSelect = bodyInteractionStyleRef.current.userSelect;
    document.body.style.cursor = bodyInteractionStyleRef.current.cursor;
    bodyInteractionStyleRef.current = null;
  };

  const capturePointer = (element: HTMLElement | null, pointerId: number) => {
    if (!element) return;
    try {
      element.setPointerCapture(pointerId);
      capturedPointerElementRef.current = element;
    } catch {
      capturedPointerElementRef.current = null;
    }
  };

  const releaseCapturedPointer = (pointerId: number) => {
    const element = capturedPointerElementRef.current;
    if (!element) return;
    try {
      if (element.hasPointerCapture(pointerId)) {
        element.releasePointerCapture(pointerId);
      }
    } catch {
      // Pointer capture may already be released by the browser.
    } finally {
      capturedPointerElementRef.current = null;
    }
  };

  const upsertTemplateSummary = (data: any) => {
    const latest = data?.versions?.[0] ?? null;
    const summary = {
      id: data.id,
      name: data.name,
      description: data.description,
      clearanceType: data.clearanceType ?? null,
      versions: latest
        ? [
            {
              id: latest.id,
              versionNumber: latest.versionNumber,
              isPublished: latest.isPublished,
              isActive: latest.isActive,
              createdAt: latest.createdAt,
              updatedAt: latest.updatedAt,
              createdById: latest.createdById,
            },
          ]
        : [],
    };

    setTemplates((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.id === summary.id);
      if (existingIndex === -1) {
        return [summary, ...prev];
      }
      const next = [...prev];
      next[existingIndex] = { ...next[existingIndex], ...summary };
      return next;
    });
  };

  const applyTemplateData = (data: any) => {
    const latest = data.versions?.[0] ?? null;

    // Loading must be a pure read of the persisted graph. Never inject, migrate,
    // restore, or infer nodes here. A saved empty graph must remain empty.
    const persistedNodes = Array.isArray(latest?.nodes) ? latest.nodes : [];
    const persistedEdges = Array.isArray(latest?.edges) ? latest.edges : [];
    const normalizedNodes = persistedNodes.map(normalizeNode);
    const normalizedEdges = persistedEdges.map((edge: any, index: number) => ({
      id: edge.id || createId(`edge_${index}`),
      sourceKey: edge.sourceKey,
      targetKey: edge.targetKey,
      label: edge.label || null,
    }));

    setSelectedClearanceTypeId(
      data.clearanceType?.id || data.clearanceTypeId || "",
    );
    setActiveVersion(latest);
    setNodes(normalizedNodes);
    setEdges(normalizedEdges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setPropertiesOpen(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    upsertTemplateSummary(data);

    // Even an empty persisted version is a valid saved state.
    setLoadedSnapshot(
      serializeWorkflowSnapshot(normalizedNodes, normalizedEdges),
    );
  };

  const ensureEditableDraft = async (options?: { silentSuccess?: boolean }) => {
    if (!activeVersion?.isPublished) {
      return null;
    }
    const payload = buildTemplatePayload();
    const result = await actions.saveFilingWorkflowDraftAction(
      selectedTemplateId,
      {
        name: payload.name,
        description: payload.description,
        clearanceTypeId: payload.clearanceTypeId,
        nodes: nodes.map((node) => ({
          ...node,
          id: undefined,
          checklistItems: node.checklistItems.map((item) => ({
            ...item,
            id: undefined,
          })),
          photoRequirements: node.photoRequirements.map((item) => ({
            ...item,
            id: undefined,
          })),
          fieldDefinitions: node.fieldDefinitions.map((item) => ({
            ...item,
            id: undefined,
          })),
          documentRequirements: node.documentRequirements.map((item) => ({
            ...item,
            id: undefined,
          })),
        })),
        edges,
      },
    );
    if (!result.ok) {
      toast.error(result.error || "Failed to create editable draft.");
      return null;
    }
    if (!options?.silentSuccess) {
      toast.success("Switched to editable draft.");
    }
    if (result.data) {
      setSelectedTemplateId(result.data.id);
      applyTemplateData(result.data);
      return result.data;
    }
    if (selectedTemplateId) {
      await loadTemplateDetails(selectedTemplateId);
    }
    return null;
  };

  const loadTemplateDetails = async (templateId: string) => {
    const result = await actions.getFilingWorkflowDetailsAction(templateId);
    if (!result.ok) {
      toast.error(result.error || "Failed to load workflow details.");
      return;
    }
    if (!result.data) {
      toast.error("Failed to load workflow details.");
      return;
    }
    applyTemplateData(result.data);
  };

  useEffect(() => {
    if (!selectedTemplateId) {
      setActiveVersion(null);
      setNodes([]);
      setEdges([]);
      setLoadedSnapshot(serializeWorkflowSnapshot([], []));
      return;
    }
    loadTemplateDetails(selectedTemplateId);
  }, [selectedTemplateId]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (draggingNodeId || isPanning || connectingSourceKey) {
        event.preventDefault();
      }

      if (draggingNodeId) {
        const coords = screenToCanvas(event.clientX, event.clientY);
        setNodes((prev) =>
          prev.map((node) =>
            node.id === draggingNodeId
              ? {
                  ...node,
                  positionX: Math.round(coords.x - dragOffset.x),
                  positionY: Math.round(coords.y - dragOffset.y),
                }
              : node,
          ),
        );
      } else if (isPanning) {
        setPan({
          x: event.clientX - panStart.x,
          y: event.clientY - panStart.y,
        });
      } else if (connectingSourceKey) {
        const coords = screenToCanvas(event.clientX, event.clientY);
        setConnectionCursor(coords);
        const hovered = (
          document.elementFromPoint(
            event.clientX,
            event.clientY,
          ) as HTMLElement | null
        )?.closest("[data-handle-role='target']") as HTMLElement | null;
        setHoveredTargetKey(hovered?.dataset.nodeKey || null);
      }
    };

    const handleUp = (event: PointerEvent) => {
      if (connectingSourceKey) {
        const target = (
          document.elementFromPoint(
            event.clientX,
            event.clientY,
          ) as HTMLElement | null
        )?.closest("[data-handle-role='target']") as HTMLElement | null;
        const targetKey = target?.dataset.nodeKey || null;
        if (targetKey) {
          if (targetKey === connectingSourceKey) {
            toast.error("A node cannot connect to itself.");
          } else if (
            edges.some(
              (edge) =>
                edge.sourceKey === connectingSourceKey &&
                edge.targetKey === targetKey,
            )
          ) {
            toast.error("That connection already exists.");
          } else if (
            !nodes.find((node) => node.key === targetKey && node.isActive)
          ) {
            toast.error("Connections can only target active nodes.");
          } else {
            setEdges((prev) => [
              ...prev,
              {
                id: createId("edge"),
                sourceKey: connectingSourceKey,
                targetKey,
              },
            ]);
            toast.success("Connection created.");
          }
        }
      }
      setDraggingNodeId(null);
      setIsPanning(false);
      setConnectingSourceKey(null);
      setHoveredTargetKey(null);
      releaseCapturedPointer(event.pointerId);
      unlockDocumentInteraction();
    };

    const cancelInteraction = (event: PointerEvent) => {
      setDraggingNodeId(null);
      setIsPanning(false);
      setConnectingSourceKey(null);
      setHoveredTargetKey(null);
      releaseCapturedPointer(event.pointerId);
      unlockDocumentInteraction();
    };

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", cancelInteraction);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", cancelInteraction);
      unlockDocumentInteraction();
    };
  }, [
    connectingSourceKey,
    dragOffset.x,
    dragOffset.y,
    draggingNodeId,
    edges,
    isPanning,
    nodes,
    panStart.x,
    panStart.y,
    zoom,
    pan.x,
    pan.y,
  ]);

  const handleAddNode = async () => {
    if (activeVersion?.isPublished) {
      const draft = await ensureEditableDraft();
      if (!draft) return;
    }
    const baseName =
      newNodeName.trim() ||
      (newNodeType === "NOTIFICATION"
        ? "Notification"
        : newNodeType === "CHECKLIST_NODE"
          ? "Checklist Item"
          : "New Stage");
    const key = getNextUniqueNodeKey(slugify(baseName), nodes);
    const contextNode =
      selectedNode ??
      (connectingSourceKey
        ? nodes.find((node) => node.key === connectingSourceKey) ?? null
        : null);
    let node =
      newNodeType === "CHECKLIST_NODE"
        ? createWorkflowChecklistNode(
            baseName,
            key,
            nodes.length + 1,
            120 - Math.round(pan.x / zoom),
            180 - Math.round(pan.y / zoom),
            contextNode?.sectionName || "",
            contextNode?.sectionKey || "",
            contextNode?.branchName || "",
            contextNode?.branchKey || "",
          )
        : newNodeType === "NOTIFICATION"
          ? createWorkflowNotificationNode(
              baseName,
              key,
              nodes.length + 1,
              120 - Math.round(pan.x / zoom),
              180 - Math.round(pan.y / zoom),
            )
          : createWorkflowStageNode(
              baseName,
              key,
              nodes.length + 1,
              120 - Math.round(pan.x / zoom),
              120 - Math.round(pan.y / zoom),
              nodes.every((entry) => !entry.isStart),
              { nodeType: newNodeType },
            );
    node.isStart = nodes.every((entry) => !entry.isStart);
    node = applyAutoManagedNodeMetadata(node, [...nodes, node], contextNode);
    setNodes((prev) => [...prev, node]);
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setPropertiesOpen(true);
    setNewNodeName("");
  };

  const handleAddChecklistNode = async () => {
    if (!selectedNode) return;
    if (activeVersion?.isPublished) {
      const draft = await ensureEditableDraft();
      if (!draft) return;
    }
    const baseName = "Checklist Item";
    const key = getNextUniqueNodeKey(slugify(baseName), nodes);
    let node = createWorkflowChecklistNode(
      baseName,
      key,
      nodes.length + 1,
      selectedNode.positionX + 120,
      selectedNode.positionY + 180,
      selectedNode.sectionName || "",
      selectedNode.sectionKey || "",
      selectedNode.branchName || "",
      selectedNode.branchKey || "",
    );
    node = applyAutoManagedNodeMetadata(node, [...nodes, node], selectedNode);
    setNodes((prev) => [...prev, node]);
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setPropertiesOpen(true);
  };

  const fitCanvasView = () => {
    if (nodes.length === 0 || !canvasRef.current) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const activeNodes = nodes.filter((node) => node.isActive);
    const sourceNodes = activeNodes.length > 0 ? activeNodes : nodes;
    const minX = Math.min(...sourceNodes.map((node) => node.positionX));
    const minY = Math.min(...sourceNodes.map((node) => node.positionY));
    const maxX = Math.max(
      ...sourceNodes.map((node) => node.positionX + NODE_WIDTH),
    );
    const maxY = Math.max(
      ...sourceNodes.map((node) => node.positionY + NODE_HEIGHT),
    );
    const width = Math.max(maxX - minX, NODE_WIDTH);
    const height = Math.max(maxY - minY, NODE_HEIGHT);
    const nextZoom = Math.min(
      MAX_ZOOM,
      Math.max(
        MIN_ZOOM,
        Math.min((rect.width - 96) / width, (rect.height - 96) / height),
      ),
    );
    setZoom(Number(nextZoom.toFixed(2)));
    setPan({
      x: Math.round((rect.width - width * nextZoom) / 2 - minX * nextZoom),
      y: Math.round((rect.height - height * nextZoom) / 2 - minY * nextZoom),
    });
  };

  const resetCanvasView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const applyAutoArrange = () => {
    const arrangedNodes = autoArrangeNodes(nodes, edges);
    setNodes(arrangedNodes);
    setSelectedEdgeId(null);
    setSelectedNodeId(null);
    requestAnimationFrame(() => {
      fitCanvasView();
    });
  };

  const updateSelectedNode = (updater: (node: NodeDraft) => NodeDraft) => {
    if (!selectedNodeId) return;
    if (activeVersion?.isPublished && selectedNode) {
      const currentNodeKey = selectedNode.key;
      void (async () => {
        const draft = await ensureEditableDraft();
        if (!draft) return;
        setNodes((prev) =>
          prev.map((node) => (node.key === currentNodeKey ? updater(node) : node)),
        );
        setSelectedNodeId(
          draft.versions?.[0]?.nodes
            ?.map(normalizeNode)
            .find((node: NodeDraft) => node.key === currentNodeKey)?.id ?? null,
        );
        setPropertiesOpen(true);
      })();
      return;
    }
    setNodes((prev) =>
      prev.map((node) => (node.id === selectedNodeId ? updater(node) : node)),
    );
  };

  const updateSelectedEdge = (updater: (edge: EdgeDraft) => EdgeDraft) => {
    if (!selectedEdgeId) return;
    if (activeVersion?.isPublished && selectedEdge) {
      const currentEdge = selectedEdge;
      void (async () => {
        const draft = await ensureEditableDraft();
        if (!draft) return;
        setEdges((prev) =>
          prev.map((edge) =>
            edge.sourceKey === currentEdge.sourceKey &&
            edge.targetKey === currentEdge.targetKey &&
            edge.label === currentEdge.label
              ? updater(edge)
              : edge,
          ),
        );
        const normalizedEdges = Array.isArray(draft.versions?.[0]?.edges)
          ? draft.versions[0].edges.map((edge: any, index: number) => ({
              id: edge.id || createId(`edge_${index}`),
              sourceKey: edge.sourceKey,
              targetKey: edge.targetKey,
              label: edge.label || null,
            }))
          : [];
        setSelectedEdgeId(
          normalizedEdges.find(
            (edge: EdgeDraft) =>
              edge.sourceKey === currentEdge.sourceKey &&
              edge.targetKey === currentEdge.targetKey &&
              edge.label === currentEdge.label,
          )?.id ?? null,
        );
        setPropertiesOpen(true);
      })();
      return;
    }
    setEdges((prev) =>
      prev.map((edge) => (edge.id === selectedEdgeId ? updater(edge) : edge)),
    );
  };

  const copyNodeProperties = (node: NodeDraft) => {
    setCopiedNodeProperties({
      description: node.description,
      category: node.category,
      nodeType: node.nodeType,
      sectionKey: node.sectionKey,
      sectionName: node.sectionName,
      branchKey: node.branchKey,
      branchName: node.branchName,
      slaDuration: node.slaDuration,
      slaUnit: node.slaUnit,
      commentsRequired: node.commentsRequired,
      canBeSkipped: node.canBeSkipped,
      canBeRevisited: node.canBeRevisited,
      approvalRequired: node.approvalRequired,
      approvalRoles: [...node.approvalRoles],
      requireAllMandatoryChecklistItems:
        node.requireAllMandatoryChecklistItems,
      requireMandatoryPhotos: false,
      allowedRoles: [...node.allowedRoles],
      checklistItems: node.checklistItems.map((item) => ({ ...item })),
      documentRequirements: node.documentRequirements.map((item) => ({
        ...item,
      })),
      conditionalSections: node.conditionalSections.map((item) => ({
        ...item,
      })),
      actionConfig: {
        prerequisiteGate: {
          ...node.actionConfig.prerequisiteGate,
          requiredNodeKeys: [
            ...node.actionConfig.prerequisiteGate.requiredNodeKeys,
          ],
        },
      },
    });
    toast.success(`Copied properties from ${node.name}.`);
  };

  const applyCopiedNodeProperties = () => {
    if (!selectedNode || !copiedNodeProperties) return;
    updateSelectedNode((node) =>
      applyAutoManagedNodeMetadata(
        {
          ...node,
          ...copiedNodeProperties,
          checklistItems: copiedNodeProperties.checklistItems.map((item) => ({
            ...item,
            id: createId("item"),
          })),
          documentRequirements: copiedNodeProperties.documentRequirements.map(
            (item) => ({
              ...item,
              id: createId("document"),
            }),
          ),
          conditionalSections: copiedNodeProperties.conditionalSections.map(
            (item) => ({ ...item }),
          ),
        },
        nodes,
        node,
      ),
    );
    toast.success(`Applied copied properties to ${selectedNode.name}.`);
  };

  const loadChaBlueprintDraft = async (starterClearanceTypeId?: string | null) => {
    if (activeVersion?.isPublished) {
      const draft = await ensureEditableDraft();
      if (!draft) return;
    }
    if (
      hasUnsavedChanges &&
      !window.confirm(
        "Replace the current draft canvas with the editable CHA blueprint starter? Unsaved canvas changes will be overwritten.",
      )
    ) {
      return;
    }
    const payload = buildTemplatePayload();
    const result = await actions.loadStarterFilingWorkflowAction(
      selectedTemplateId,
      {
        ...payload,
        starterClearanceTypeId: starterClearanceTypeId || null,
      },
    );
    if (!result.ok) {
      toast.error(result.error || "Failed to load starter workflow.");
      return;
    }
    if (result.data) {
      setSelectedTemplateId(result.data.id);
      applyTemplateData(result.data);
    }
    toast.success("Starter workflow loaded.");
  };

  const addChecklistItem = () => {
    updateSelectedNode((node) => ({
      ...node,
      checklistItems: [
        ...node.checklistItems,
        createChecklistItemDraft(
          "New Checklist Item",
          node.checklistItems.length + 1,
        ),
      ],
    }));
  };

  const updateChecklistItem = (
    itemId: string,
    updater: (item: ChecklistItemDraft) => ChecklistItemDraft,
  ) => {
    updateSelectedNode((node) => ({
      ...node,
      checklistItems: node.checklistItems.map((item) =>
        item.id === itemId ? updater(item) : item,
      ),
    }));
  };

  const reorderChecklistItem = (itemId: string, direction: -1 | 1) => {
    updateSelectedNode((node) => {
      const index = node.checklistItems.findIndex((item) => item.id === itemId);
      const nextIndex = index + direction;
      if (
        index < 0 ||
        nextIndex < 0 ||
        nextIndex >= node.checklistItems.length
      ) {
        return node;
      }
      const nextItems = [...node.checklistItems];
      const [item] = nextItems.splice(index, 1);
      nextItems.splice(nextIndex, 0, item);
      return {
        ...node,
        checklistItems: nextItems.map((entry, orderIndex) => ({
          ...entry,
          sortOrder: orderIndex + 1,
        })),
      };
    });
  };

  const addFieldDefinition = () => {
    updateSelectedNode((node) => ({
      ...node,
      fieldDefinitions: [
        ...node.fieldDefinitions,
        createFieldDefinitionDraft(
          "New Field",
          `field_${node.fieldDefinitions.length + 1}`,
        ),
      ],
    }));
  };

  const updateFieldDefinition = (
    fieldId: string,
    updater: (item: FieldDefinitionDraft) => FieldDefinitionDraft,
  ) => {
    updateSelectedNode((node) => ({
      ...node,
      fieldDefinitions: node.fieldDefinitions.map((item) =>
        item.id === fieldId ? updater(item) : item,
      ),
    }));
  };

  const addDocumentRequirement = () => {
    updateSelectedNode((node) => ({
      ...node,
      documentRequirements: [
        ...node.documentRequirements,
        createDocumentRequirementDraft(
          "New Document",
          `document_${node.documentRequirements.length + 1}`,
        ),
      ],
    }));
  };

  const updateDocumentRequirement = (
    documentId: string,
    updater: (item: DocumentRequirementDraft) => DocumentRequirementDraft,
  ) => {
    updateSelectedNode((node) => ({
      ...node,
      documentRequirements: node.documentRequirements.map((item) =>
        item.id === documentId ? updater(item) : item,
      ),
    }));
  };

  const buildTemplatePayload = () => {
    const template = templates.find((entry) => entry.id === selectedTemplateId);
    return {
      name: template?.name || `Filing Workflow ${templates.length + 1}`,
      description: template?.description || "",
      clearanceTypeId: selectedClearanceTypeId || null,
    };
  };

  const saveDraft = async (): Promise<string | null> => {
    const payload = buildTemplatePayload();
    const result = await actions.saveFilingWorkflowDraftAction(
      selectedTemplateId,
      {
        name: payload.name,
        description: payload.description,
        clearanceTypeId: payload.clearanceTypeId,
        nodes,
        edges,
      },
    );
    if (!result.ok) {
      toast.error(result.error || "Failed to save workflow draft.");
      return null;
    }

    const savedVersionId =
      result.data?.versions?.[0]?.id ?? activeVersion?.id ?? null;
    toast.success("Draft saved.");

    if (result.data) {
      setSelectedTemplateId(result.data.id);
      applyTemplateData(result.data);
    } else {
      if (selectedTemplateId) {
        await loadTemplateDetails(selectedTemplateId);
      }
    }

    return savedVersionId;
  };

  const deleteSelectedEdge = async () => {
    if (!selectedEdge) {
      return;
    }
    if (activeVersion?.isPublished) {
      const draft = await ensureEditableDraft();
      if (!draft) return;
    }
    if (
      !window.confirm(
        `Delete connector from ${selectedEdge.sourceKey} to ${selectedEdge.targetKey}?`,
      )
    ) {
      return;
    }
    const nextEdges = edges.filter((edge) => edge.id !== selectedEdge.id);
    setEdges(nextEdges);
    setSelectedEdgeId(null);
    setPropertiesOpen(false);

    const payload = buildTemplatePayload();
    const result = await actions.saveFilingWorkflowDraftAction(
      selectedTemplateId,
      {
        name: payload.name,
        description: payload.description,
        clearanceTypeId: payload.clearanceTypeId,
        nodes,
        edges: nextEdges,
      },
    );
    if (!result.ok) {
      toast.error(result.error || "Failed to persist connector deletion.");
      return;
    }
    toast.success("Connector deleted.");
    if (result.data) {
      applyTemplateData(result.data);
    } else if (selectedTemplateId) {
      await loadTemplateDetails(selectedTemplateId);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedEdgeId &&
        !activeVersion?.isPublished
      ) {
        event.preventDefault();
        void deleteSelectedEdge();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeVersion?.isPublished, selectedEdgeId, deleteSelectedEdge]);

  const publishWorkflow = async () => {
    if (validation.errors.length > 0) {
      toast.error("Resolve workflow validation errors before publishing.");
      return;
    }

    // Publish the exact version returned by save. React state does not update
    // synchronously, so reading activeVersion immediately after save can publish
    // a stale version.
    const savedVersionId = await saveDraft();
    if (!savedVersionId) return;

    const result = await actions.publishFilingWorkflowAction(savedVersionId);
    if (!result.ok) {
      toast.error(result.error || "Failed to publish workflow.");
      return;
    }
    toast.success("Workflow published.");
    await loadTemplateDetails(selectedTemplateId!);
  };

  const forkDraft = async () => {
    const draft = await ensureEditableDraft({ silentSuccess: true });
    if (!draft) return;
    toast.success("New draft created from published version.");
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-outline-variant/60 bg-surface shadow-sm">
      <div className="border-b border-outline-variant bg-surface-container-low/65 px-4 py-3 lg:px-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(720px,auto)] xl:items-start">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                mode="icon"
                size="sm"
                onClick={() => router.push("/cha/settings")}
                aria-label="Back to CHA settings"
                title="Back to CHA settings"
              >
                <ArrowLeft size={16} />
              </Button>
              <h1 className="ds-h1 text-on-surface">
                FILING WORKFLOW BLUEPRINT
              </h1>
              <Badge
                variant={activeVersion?.isPublished ? "success" : "warning"}
              >
                {activeVersion
                  ? `${activeVersion.isPublished ? "PUBLISHED" : "DRAFT"} V${activeVersion.versionNumber}`
                  : "NO VERSION"}
              </Badge>
              {hasUnsavedChanges ? (
                <Badge variant="warning">UNSAVED CHANGES</Badge>
              ) : (
                <Badge variant="secondary">SYNCED</Badge>
              )}
            </div>
            <p className="max-w-3xl text-sm text-on-surface-variant">
              Build configurable filing stages, checklist deadlines, and
              non-linear routing without hardcoded CHA node types.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[220px_220px_auto] xl:items-end">
            <div className="space-y-1.5 xl:self-end">
              <label className="ds-label block">Workflow Draft</label>
              <select
                value={selectedTemplateId || ""}
                onChange={(event) =>
                  setSelectedTemplateId(event.target.value || null)
                }
                className="w-full text-sm"
              >
                <option value="">New Workflow Draft</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 xl:self-end">
              <label className="ds-label block">Clearance Type</label>
              <select
                value={selectedClearanceTypeId}
                onChange={(event) =>
                  setSelectedClearanceTypeId(event.target.value)
                }
                className="w-full text-sm"
                disabled={activeVersion?.isPublished}
              >
                <option value="">All Clearance Types</option>
                {availableJobTypes.map((jobType) => (
                  <option key={jobType.id} value={jobType.id}>
                    {jobType.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-end gap-2 xl:justify-end xl:self-end">
              {showEditableActions ? (
                <>
                  <Button
                    variant="outline"
                    className="h-10 px-4"
                    onClick={saveDraft}
                  >
                    <Save size={16} />
                    Save Draft
                  </Button>
                  <Button className="h-10 px-4" onClick={publishWorkflow}>
                    <CheckCircle2 size={16} />
                    Publish Workflow
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="h-10 px-4" onClick={forkDraft}>
                  <RefreshCw size={16} />
                  Fork Draft
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`relative grid min-h-0 flex-1 overflow-hidden ${
          paletteOpen && propertiesOpen
            ? "lg:grid-cols-[320px_minmax(0,1fr)_430px]"
            : paletteOpen
              ? "lg:grid-cols-[320px_minmax(0,1fr)]"
              : propertiesOpen
                ? "lg:grid-cols-[minmax(0,1fr)_430px]"
                : "lg:grid-cols-[minmax(0,1fr)]"
        }`}
      >
        <aside
          data-canvas-ui="true"
          className={`absolute inset-y-0 left-0 z-40 w-[min(330px,calc(100%-1rem))] overflow-y-auto border-r border-outline-variant bg-surface-container-low shadow-2xl transition-transform duration-200 ${paletteOpen ? "translate-x-0" : "pointer-events-none -translate-x-full"} ${paletteOpen ? "lg:static lg:z-0 lg:w-auto lg:translate-x-0 lg:pointer-events-auto lg:shadow-none" : "lg:hidden"}`}
        >
          <div className="space-y-3 p-2.5 lg:p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="ds-label">Elements</p>
                <h2 className="ds-h3 text-on-surface">Blueprint Palette</h2>
              </div>
              <Button
                variant="outline"
                mode="icon"
                size="sm"
                onClick={() => setPaletteOpen(false)}
                aria-label="Close workflow palette"
                title="Close workflow palette"
                className="lg:hidden"
              >
                <X size={15} />
              </Button>
            </div>

            <Card className="card-left-accent overflow-hidden">
              <CardHeader className="space-y-1.5 px-3 pb-0 pt-3">
                <p className="ds-label">Starter</p>
                <CardTitle>Workflow Blueprint</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-3">
                <div className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface-variant">
                  Load the explicit starter workflow as editable nodes. Stages,
                  checklist deadlines, upload slots, and connectors can all be
                  changed after load.
                  <span className="mt-2 block ds-label text-on-surface-variant">
                    AVAILABLE ROLES {availableRoles.length || 0}
                  </span>
                </div>
                <div className="grid gap-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      void loadChaBlueprintDraft(importStarterType?.id ?? null)
                    }
                    disabled={!importStarterType}
                  >
                    <Workflow size={16} />
                    Load Import Starter
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      void loadChaBlueprintDraft(exportStarterType?.id ?? null)
                    }
                    disabled={!exportStarterType}
                  >
                    <Workflow size={16} />
                    Load Export Starter
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="space-y-1.5 px-3 pb-0 pt-3">
                <p className="ds-label">Insert</p>
                <CardTitle>Add Node</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-3">
                <div className="space-y-1.5">
                  <label className="ds-label block">Node Name</label>
                  <input
                    value={newNodeName}
                    onChange={(event) => setNewNodeName(event.target.value)}
                    placeholder="First Check"
                    className="w-full text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="ds-label block">Node Type</label>
                  <select
                    value={newNodeType}
                    onChange={(event) =>
                      setNewNodeType(event.target.value as NodeDraft["nodeType"])
                    }
                    className="w-full text-sm"
                  >
                    <option value="SECTION">Section</option>
                    <option value="CHECKLIST_NODE">Checklist Node</option>
                    <option value="DECISION">Decision</option>
                    <option value="NOTIFICATION">Notification</option>
                    <option value="START">Start</option>
                    <option value="END">End</option>
                  </select>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => void handleAddNode()}
                >
                  <Plus size={16} />
                  Add Node
                </Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="space-y-1.5 px-3 pb-0 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="ds-label">Validation</p>
                    <CardTitle>Publish Checks</CardTitle>
                  </div>
                  <Badge
                    variant={
                      validation.errors.length > 0 ? "warning" : "secondary"
                    }
                  >
                    {validation.errors.length} ERR
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 p-3">
                {validation.errors.length === 0 &&
                validation.warnings.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">
                    No blocking validation issues in the current draft.
                  </p>
                ) : null}
                {validation.errors.map((message) => (
                  <div
                    key={message}
                    className="card-left-accent-orange rounded-xl bg-surface px-3 py-2 text-sm text-on-surface"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        size={16}
                        className="mt-0.5 text-[#fb923c]"
                      />
                      <span>{message}</span>
                    </div>
                  </div>
                ))}
                {validation.warnings.map((message) => (
                  <div
                    key={message}
                    className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface-variant"
                  >
                    <div className="flex items-start gap-2">
                      <Workflow size={16} className="mt-0.5 text-[#00cec4]" />
                      <span>{message}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </aside>

        <main className="min-w-0 border-y border-outline-variant bg-surface lg:border-y-0">
          <div className="flex h-full flex-col">
            <div className="border-b border-outline-variant bg-surface-container-low/65 px-3 py-2 lg:px-4">
              <div className="flex items-center justify-between gap-2">
                <div className="hidden items-center gap-2 lg:flex">
                  <Button
                    variant="outline"
                    mode="icon"
                    size="sm"
                    onClick={() => setPaletteOpen((value) => !value)}
                    aria-label={paletteOpen ? "Hide elements panel" : "Show elements panel"}
                    title="Elements"
                  >
                    <PanelLeft size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    mode="icon"
                    size="sm"
                    onClick={() => setPropertiesOpen((value) => !value)}
                    aria-label={propertiesOpen ? "Hide properties panel" : "Show properties panel"}
                    title="Properties"
                  >
                    <PanelRight size={14} />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    mode="icon"
                    size="sm"
                    onClick={() => setPaletteOpen(true)}
                    aria-label="Open elements panel"
                    title="Elements"
                    className="lg:hidden"
                  >
                    <PanelLeft size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    mode="icon"
                    size="sm"
                    onClick={() => setPropertiesOpen(true)}
                    aria-label="Open properties"
                    title="Properties"
                    className="lg:hidden"
                  >
                    <PanelRight size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    mode="icon"
                    size="sm"
                    onClick={() => setValidationOpen((value) => !value)}
                    aria-label="Toggle validation"
                    title="Validation"
                    className="lg:hidden"
                  >
                    <Settings2 size={14} />
                  </Button>
                  <div className="flex h-8 items-center gap-1 rounded-md border border-outline-variant bg-surface p-0.5 shadow-sm">
                    <Button
                      variant="outline"
                      mode="icon"
                      size="sm"
                      onClick={() =>
                        setZoom((value) =>
                          Math.max(MIN_ZOOM, Number((value - 0.1).toFixed(2))),
                        )
                      }
                      aria-label="Zoom out"
                      title="Zoom out"
                    >
                      <ZoomOut size={15} />
                    </Button>
                    <span className="min-w-10 px-1 text-center text-[11px] text-on-surface-variant ds-numeric">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      variant="outline"
                      mode="icon"
                      size="sm"
                      onClick={() =>
                        setZoom((value) =>
                          Math.min(MAX_ZOOM, Number((value + 0.1).toFixed(2))),
                        )
                      }
                      aria-label="Zoom in"
                      title="Zoom in"
                    >
                      <ZoomIn size={15} />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    mode="icon"
                    size="sm"
                    onClick={fitCanvasView}
                    aria-label="Fit view"
                    title="Fit View"
                  >
                    <Workflow size={13} />
                  </Button>
                  <Button
                    variant="outline"
                    mode="icon"
                    size="sm"
                    onClick={applyAutoArrange}
                    aria-label="Auto arrange"
                    title="Auto Arrange"
                  >
                    <Settings2 size={13} />
                  </Button>
                  <Button
                    variant="outline"
                    mode="icon"
                    size="sm"
                    onClick={resetCanvasView}
                    aria-label="Reset view"
                    title="Reset View"
                  >
                    <RefreshCw size={13} />
                  </Button>
                  {selectedEdge ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void deleteSelectedEdge()}
                      disabled={activeVersion?.isPublished}
                      className="border-[#fb923c]/50 text-[#fb923c] hover:bg-surface"
                    >
                      <Trash2 size={14} />
                      Delete Connector
                    </Button>
                  ) : null}
                </div>
              </div>
              {selectedEdge ? (
                <div className="mt-3 rounded-xl border border-outline-variant bg-surface-container-low/60 px-3 py-2 text-xs text-on-surface-variant">
                  <span className="ds-label mr-2">Selected Connector</span>
                  <span className="ds-numeric">
                    {selectedEdge.sourceKey} → {selectedEdge.targetKey}
                  </span>
                </div>
              ) : null}
            </div>

            <div
              ref={canvasRef}
              className="relative flex-1 overflow-hidden bg-surface-container-low select-none cursor-grab active:cursor-grabbing"
              style={{
                backgroundColor: "var(--color-surface-container-low)",
                backgroundImage:
                  "linear-gradient(rgba(0,206,196,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,206,196,0.08) 1px, transparent 1px), radial-gradient(rgba(0,206,196,0.28) 1px, transparent 1px)",
                backgroundSize: "48px 48px, 48px 48px, 12px 12px",
                touchAction: "none",
              }}
              onWheel={(event) => {
                event.preventDefault();
                const rect = canvasRef.current?.getBoundingClientRect();
                if (!rect) return;

                if (event.shiftKey) {
                  setPan((current) => ({
                    x: current.x - event.deltaY,
                    y: current.y,
                  }));
                  return;
                }

                const pointerX = event.clientX - rect.left;
                const pointerY = event.clientY - rect.top;
                const zoomStep =
                  event.ctrlKey || event.metaKey || event.altKey ? 0.14 : 0.08;
                const nextZoom = Math.min(
                  MAX_ZOOM,
                  Math.max(
                    MIN_ZOOM,
                    Number(
                      (
                        zoom + (event.deltaY < 0 ? zoomStep : -zoomStep)
                      ).toFixed(2),
                    ),
                  ),
                );
                const scaleRatio = nextZoom / zoom;

                setPan((current) => ({
                  x: Math.round(pointerX - (pointerX - current.x) * scaleRatio),
                  y: Math.round(pointerY - (pointerY - current.y) * scaleRatio),
                }));
                setZoom(nextZoom);
              }}
              onPointerDown={(event) => {
                const target = event.target as HTMLElement;
                if (
                  target.closest(
                    "[data-canvas-ui='true'], input, textarea, select, button",
                  )
                )
                  return;
                event.preventDefault();
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
                setPropertiesOpen(false);
                setIsPanning(true);
                setPanStart({
                  x: event.clientX - pan.x,
                  y: event.clientY - pan.y,
                });
                lockDocumentInteraction("grabbing");
                capturePointer(event.currentTarget, event.pointerId);
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "0 0",
                }}
              >
                <svg className="absolute inset-0 h-[8000px] w-[8000px] overflow-visible">
                  <defs>
                    <marker
                      id="filing-arrow"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                    </marker>
                  </defs>
                  {edges.map((edge) => {
                    const source = nodes.find(
                      (node) => node.key === edge.sourceKey,
                    );
                    const target = nodes.find(
                      (node) => node.key === edge.targetKey,
                    );
                    if (!source || !target) return null;
                    const connector = getConnectorPath(source, target);
                    const selected = selectedEdgeId === edge.id;
                    return (
                      <g
                        key={edge.id}
                        className={
                          selected
                            ? "text-[#fb923c]"
                            : connector.isBackRoute
                              ? "text-[#fb923c]"
                              : "text-[#00cec4]"
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedNodeId(null);
                          setSelectedEdgeId(edge.id);
                          setPropertiesOpen(true);
                        }}
                      >
                        <path
                          d={connector.path}
                          fill="none"
                          stroke="transparent"
                          strokeWidth="16"
                          className="cursor-pointer"
                        />
                        <path
                          d={connector.path}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={selected ? "3" : "2"}
                          strokeDasharray={
                            connector.isBackRoute ? "8 7" : undefined
                          }
                          markerEnd="url(#filing-arrow)"
                          className="drop-shadow-sm"
                        />
                        {edge.label ? (
                          <foreignObject
                            x={connector.labelX - 70}
                            y={connector.labelY - 12}
                            width="140"
                            height="28"
                            className="pointer-events-none overflow-visible"
                          >
                            <div className="truncate rounded-full border border-outline-variant bg-surface/95 px-2 py-1 text-center text-[10px] uppercase tracking-[0.1em] text-on-surface-variant shadow-sm">
                              {edge.label}
                            </div>
                          </foreignObject>
                        ) : null}
                      </g>
                    );
                  })}
                  {connectingSourceKey
                    ? (() => {
                        const source = nodes.find(
                          (node) => node.key === connectingSourceKey,
                        );
                        if (!source) return null;
                        const startX = source.positionX + NODE_WIDTH / 2;
                        const startY = source.positionY + NODE_HEIGHT;
                        const endX = connectionCursor.x;
                        const endY = connectionCursor.y;
                        const curve = Math.max(80, Math.abs(endY - startY) / 2);
                        return (
                          <path
                            d={`M ${startX} ${startY} C ${startX} ${startY + curve}, ${endX} ${endY - curve}, ${endX} ${endY}`}
                            fill="none"
                            stroke="var(--color-on-surface-variant)"
                            strokeDasharray="8 6"
                            strokeWidth="2"
                          />
                        );
                      })()
                    : null}
                </svg>

                {nodes.map((node) => {
                  const selected = node.id === selectedNodeId;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={`absolute rounded-2xl border bg-surface/95 p-4 text-left shadow-sm backdrop-blur transition-all ${
                        selected
                          ? "border-[#00cec4] shadow-[0_0_0_3px_rgba(0,206,196,0.18),0_18px_42px_-28px_rgba(0,206,196,0.75)]"
                          : "border-outline-variant hover:border-[#00cec4]/60 hover:shadow-[0_0_0_3px_rgba(0,206,196,0.12)]"
                      } ${node.isActive ? "" : "opacity-55"}`}
                      style={{
                        left: node.positionX,
                        top: node.positionY,
                        width: NODE_WIDTH,
                        height: NODE_HEIGHT,
                      }}
                      onClick={() => {
                        setSelectedNodeId(node.id);
                        setSelectedEdgeId(null);
                        setPropertiesOpen(true);
                      }}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (activeVersion?.isPublished) {
                          void ensureEditableDraft();
                          return;
                        }
                        setSelectedEdgeId(null);
                        setSelectedNodeId(node.id);
                        setPropertiesOpen(true);
                        const coords = screenToCanvas(
                          event.clientX,
                          event.clientY,
                        );
                        setDraggingNodeId(node.id);
                        setDragOffset({
                          x: coords.x - node.positionX,
                          y: coords.y - node.positionY,
                        });
                        lockDocumentInteraction("grabbing");
                        capturePointer(event.currentTarget, event.pointerId);
                      }}
                    >
                      <div
                        data-handle-role="target"
                        data-node-key={node.key}
                        title="Drop connector here"
                        className={`absolute left-[126px] -top-2 h-4 w-4 rounded-full border-2 ${
                          hoveredTargetKey === node.key
                            ? "border-[#00cec4] bg-[#00cec4]/20"
                            : "border-outline bg-surface"
                        }`}
                      />
                      <div
                        data-handle-role="target"
                        data-node-key={node.key}
                        title="Drop connector here"
                        className={`absolute -left-2 top-[68px] h-4 w-4 rounded-full border-2 ${
                          hoveredTargetKey === node.key
                            ? "border-[#00cec4] bg-[#00cec4]/20"
                            : "border-outline bg-surface"
                        }`}
                      />
                      <div
                        data-node-key={node.key}
                        title="Drag to connect"
                        className="absolute bottom-[-8px] left-[126px] h-4 w-4 rounded-full border-2 border-[#00cec4] bg-surface shadow-[0_0_0_3px_rgba(0,206,196,0.12)]"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (activeVersion?.isPublished || !node.isActive)
                            return;
                          setSelectedNodeId(node.id);
                          setSelectedEdgeId(null);
                          setPropertiesOpen(false);
                          setConnectingSourceKey(node.key);
                          setConnectionCursor({
                            x: node.positionX + NODE_WIDTH / 2,
                            y: node.positionY + NODE_HEIGHT,
                          });
                          lockDocumentInteraction("crosshair");
                          capturePointer(event.currentTarget, event.pointerId);
                        }}
                      />
                      <div
                        data-node-key={node.key}
                        title="Drag to connect"
                        className="absolute -right-2 top-[68px] h-4 w-4 rounded-full border-2 border-[#00cec4] bg-surface shadow-[0_0_0_3px_rgba(0,206,196,0.12)]"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (activeVersion?.isPublished || !node.isActive)
                            return;
                          setSelectedNodeId(node.id);
                          setSelectedEdgeId(null);
                          setPropertiesOpen(false);
                          setConnectingSourceKey(node.key);
                          setConnectionCursor({
                            x: node.positionX + NODE_WIDTH,
                            y: node.positionY + NODE_HEIGHT / 2,
                          });
                          lockDocumentInteraction("crosshair");
                          capturePointer(event.currentTarget, event.pointerId);
                        }}
                      />

                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-on-surface">
                            {node.name}
                          </p>
                          <p className="mt-1 truncate text-xs text-on-surface-variant">
                            {[
                              node.sectionName || node.category,
                              node.branchName,
                            ]
                              .filter(Boolean)
                              .join(" / ")}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {node.isStart ? (
                            <Badge variant="success">START</Badge>
                          ) : null}
                          {node.nodeType === "NOTIFICATION" ? (
                            <Badge variant="warning">NOTIFY</Badge>
                          ) : null}
                          {node.branchName ? (
                            <Badge variant="secondary">
                              {node.branchName.toUpperCase()}
                            </Badge>
                          ) : null}
                          {node.documentRequirements.length > 0 ? (
                            <Badge variant="secondary">
                              {node.documentRequirements.length} UPLOAD
                            </Badge>
                          ) : null}
                          {!node.isActive ? (
                            <Badge variant="secondary">INACTIVE</Badge>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-xs text-on-surface-variant">
                        {node.description || "No stage description configured."}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-3 text-xs text-on-surface-variant">
                        <span>{describeNodeType(node)}</span>
                        <span className="ds-numeric">
                          {node.slaDuration}{" "}
                          {node.slaUnit === "BUSINESS_DAYS" ? "BD" : "CD"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        {validationOpen ? (
          <div
            data-canvas-ui="true"
            className="absolute bottom-4 left-4 z-30 max-h-[45%] w-[min(420px,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-outline-variant bg-surface/95 p-4 shadow-2xl backdrop-blur lg:hidden"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="ds-label">Publish Checks</p>
                <h3 className="ds-h3 text-on-surface">Validation</h3>
              </div>
              <Button
                variant="outline"
                mode="icon"
                size="sm"
                onClick={() => setValidationOpen(false)}
                aria-label="Close validation panel"
              >
                <X size={15} />
              </Button>
            </div>
            <div className="space-y-3">
              {validation.errors.length === 0 &&
              validation.warnings.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  No blocking validation issues in the current draft.
                </p>
              ) : null}
              {validation.errors.map((message) => (
                <div
                  key={message}
                  className="card-left-accent-orange rounded-xl bg-surface-container-low p-3 text-sm text-on-surface"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      size={16}
                      className="mt-0.5 text-[#fb923c]"
                    />
                    <span>{message}</span>
                  </div>
                </div>
              ))}
              {validation.warnings.map((message) => (
                <div
                  key={message}
                  className="rounded-xl border border-outline-variant bg-surface-container-low p-3 text-sm text-on-surface-variant"
                >
                  <div className="flex items-start gap-2">
                    <Workflow size={16} className="mt-0.5 text-[#00cec4]" />
                    <span>{message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <aside
          data-canvas-ui="true"
          className={`absolute inset-y-0 right-0 z-40 w-[min(430px,calc(100%-1rem))] overflow-y-auto border-l border-outline-variant bg-surface-container-low shadow-2xl transition-transform duration-200 ${
            propertiesOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
          } ${propertiesOpen ? "lg:static lg:z-0 lg:w-auto lg:translate-x-0 lg:pointer-events-auto lg:shadow-none" : "lg:hidden"}`}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant bg-surface-container-low/95 px-4 py-3 backdrop-blur lg:px-5">
            <div>
              <p className="ds-label">Properties</p>
              <p className="text-sm font-semibold text-on-surface">
                {selectedNode?.name ||
                  (selectedEdge ? "Connector" : "Nothing selected")}
              </p>
            </div>
            <Button
              variant="outline"
              mode="icon"
              size="sm"
              onClick={() => setPropertiesOpen(false)}
              aria-label="Close properties"
              title="Close properties"
              className="lg:hidden"
            >
              <X size={15} />
            </Button>
          </div>
          {selectedNode ? (
            <div className="space-y-3 p-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="ds-label">Node Overview</p>
                  <h2 className="ds-h2 text-on-surface">{selectedNode.name}</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {selectedNode.description || "No stage description configured yet."}
                  </p>
                </div>
                <div className="flex w-[168px] shrink-0 flex-col items-stretch gap-2 self-start">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyNodeProperties(selectedNode)}
                    disabled={activeVersion?.isPublished}
                    className="w-full justify-center whitespace-nowrap text-center"
                  >
                    Copy Properties
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyCopiedNodeProperties}
                    disabled={!copiedNodeProperties}
                    className="w-full justify-center whitespace-nowrap text-center"
                  >
                    Apply Copied
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void (async () => {
                        if (activeVersion?.isPublished) {
                          const draft = await ensureEditableDraft({
                            silentSuccess: true,
                          });
                          if (!draft) return;
                        }
                        setNodes((prev) =>
                          prev.filter((node) => node.id !== selectedNode.id),
                        );
                        setEdges((prev) =>
                          prev.filter(
                            (edge) =>
                              edge.sourceKey !== selectedNode.key &&
                              edge.targetKey !== selectedNode.key,
                          ),
                        );
                        setSelectedNodeId(null);
                        setPropertiesOpen(false);
                      })();
                    }}
                    aria-label="Delete node"
                    className="w-full justify-center whitespace-nowrap text-center border-red-500/35 text-red-400 hover:bg-surface"
                  >
                    <Trash2 size={15} />
                    Delete Node
                  </Button>
                </div>
              </div>

              <div className="grid gap-1.5 md:grid-cols-2">
                <div className="rounded-xl border border-outline-variant bg-surface p-2">
                  <p className="ds-label">Type</p>
                  <p className="mt-1 text-sm font-medium text-on-surface">
                    {selectedNode.nodeType}
                  </p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface p-2">
                  <p className="ds-label">Section / Branch</p>
                  <p className="mt-1 text-sm font-medium text-on-surface">
                    {[selectedNode.sectionName || "No section", selectedNode.branchName || "No branch"]
                      .join(" / ")}
                  </p>
                </div>
              </div>

              <div className="ds-form-section rounded-xl border border-outline-variant bg-surface p-2.5 space-y-2.5">
                <h3 className="ds-h3 text-on-surface">Core Settings</h3>
                <div className="space-y-1.5">
                  <label className="ds-label block">Node Name</label>
                  <input
                    value={selectedNode.name}
                    onChange={(event) =>
                      updateSelectedNode((node) =>
                        applyAutoManagedNodeMetadata(
                          {
                            ...node,
                            name: event.target.value,
                          },
                          nodes,
                          nodes.find((entry) => entry.id === node.id) ?? null,
                        ),
                      )
                    }
                    className="w-full text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="ds-label block">Description</label>
                  <textarea
                    value={selectedNode.description}
                    onChange={(event) =>
                      updateSelectedNode((node) => ({
                        ...node,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-1.5">
                    <label className="ds-label block">Stage SLA</label>
                    <input
                      type="number"
                      min={1}
                      value={selectedNode.slaDuration}
                      onChange={(event) =>
                        updateSelectedNode((node) => ({
                          ...node,
                          slaDuration: Math.max(
                            1,
                            Number(event.target.value || 1),
                          ),
                        }))
                      }
                      className="w-full text-sm ds-numeric"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="ds-label block">SLA Unit</label>
                    <select
                      value={selectedNode.slaUnit}
                      onChange={(event) =>
                        updateSelectedNode((node) => ({
                          ...node,
                          slaUnit: event.target.value as NodeDraft["slaUnit"],
                        }))
                      }
                      className="w-full text-sm"
                    >
                      <option value="BUSINESS_DAYS">Business Days</option>
                      <option value="CALENDAR_DAYS">Calendar Days</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-2 text-sm text-on-surface">
                  {(
                    [
                      {
                        label: "Active",
                        checked: selectedNode.isActive,
                        buildUpdate: (checked: boolean) => ({
                          isActive: checked,
                        }),
                      },
                      {
                        label: "Start Node",
                        checked: selectedNode.isStart,
                        buildUpdate: (checked: boolean) => ({
                          isStart: checked,
                        }),
                      },
                      {
                        label: "Completion Remarks",
                        checked: selectedNode.commentsRequired,
                        buildUpdate: (checked: boolean) => ({
                          commentsRequired: checked,
                        }),
                      },
                      {
                        label: "Allow Double-Back",
                        checked: selectedNode.canBeRevisited,
                        buildUpdate: (checked: boolean) => ({
                          canBeRevisited: checked,
                        }),
                      },
                      {
                        label: "Approval Required",
                        checked: selectedNode.approvalRequired,
                        buildUpdate: (checked: boolean) => ({
                          approvalRequired: checked,
                        }),
                      },
                      {
                        label: "Checklist Gate",
                        checked: selectedNode.requireAllMandatoryChecklistItems,
                        buildUpdate: (checked: boolean) => ({
                          requireAllMandatoryChecklistItems: checked,
                        }),
                      },
                    ] as const
                  ).map(({ label, checked, buildUpdate }) => (
                    <PillToggle
                      key={label}
                      checked={checked as boolean}
                      label={label}
                      density="compact"
                      onCheckedChange={(nextChecked) => {
                          if (label === "Start Node" && nextChecked) {
                            setNodes((prev) =>
                              prev.map((node) => ({
                                ...node,
                                isStart: node.id === selectedNode.id,
                              })),
                            );
                            return;
                          }
                          updateSelectedNode((node) => ({
                            ...node,
                            ...buildUpdate(nextChecked),
                          }));
                        }}
                    />
                  ))}
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-2">
                  <p className="ds-label">Auto-Filled Metadata</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-on-surface-variant">
                    <span>Key: <span className="ds-numeric text-on-surface">{selectedNode.key}</span></span>
                    <span>Type: <span className="text-on-surface">{selectedNode.nodeType}</span></span>
                    <span>Section: <span className="text-on-surface">{selectedNode.sectionName || "None"}</span></span>
                    <span>Branch: <span className="text-on-surface">{selectedNode.branchName || "None"}</span></span>
                    <span>Sort: <span className="ds-numeric text-on-surface">{selectedNode.sortOrder}</span></span>
                    <span>
                      Mode:{" "}
                      <span className="text-on-surface">
                        {Object.values(selectedNode.autoManaged).every(Boolean)
                          ? "Auto-managed"
                          : "Manual overrides"}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-2">
                  <PillToggle
                    checked={selectedNode.conditionalSections.some(
                      (section) => section.key === QUERY_PROCESSING_SECTION_KEY,
                    )}
                    label="Enable Query Processing Module"
                    description="Adds the reusable post-filing customs query workflow to this node."
                    density="compact"
                    onCheckedChange={(nextChecked) =>
                      updateSelectedNode((node) => ({
                        ...node,
                        conditionalSections: nextChecked
                          ? node.conditionalSections.some(
                              (section) =>
                                section.key === QUERY_PROCESSING_SECTION_KEY,
                            )
                            ? node.conditionalSections
                            : [
                                ...node.conditionalSections,
                                createQueryProcessingSection(),
                              ]
                          : node.conditionalSections.filter(
                              (section) =>
                                section.key !== QUERY_PROCESSING_SECTION_KEY,
                            ),
                      }))
                    }
                  />
                  <p className="mt-2 text-xs text-on-surface-variant">
                    Operators can record whether no query was raised, open a
                    query thread, post offline response updates, and clear the
                    query before moving ahead.
                  </p>
                </div>
                {selectedNode.nodeType !== "START" &&
                selectedNode.nodeType !== "END" &&
                selectedNode.nodeType !== "NOTIFICATION" ? (
                  <div className="rounded-xl border border-outline-variant bg-surface-container-low p-2 space-y-2">
                    <PillToggle
                      checked={
                        selectedNode.actionConfig.prerequisiteGate.enabled
                      }
                      label="Enable Stage Prerequisites"
                      description="Block this stage at runtime until the required earlier stage nodes have been completed."
                      density="compact"
                      onCheckedChange={(nextChecked) =>
                        updateSelectedNode((node) => ({
                          ...node,
                          actionConfig: {
                            ...node.actionConfig,
                            prerequisiteGate: {
                              ...node.actionConfig.prerequisiteGate,
                              enabled: nextChecked,
                            },
                          },
                        }))
                      }
                    />
                    {selectedNode.actionConfig.prerequisiteGate.enabled ? (
                      <>
                        <div className="space-y-1.5">
                          <label className="ds-label block">
                            Prerequisite Mode
                          </label>
                          <select
                            value={
                              selectedNode.actionConfig.prerequisiteGate.mode
                            }
                            onChange={(event) =>
                              updateSelectedNode((node) => ({
                                ...node,
                                actionConfig: {
                                  ...node.actionConfig,
                                  prerequisiteGate: {
                                    ...node.actionConfig.prerequisiteGate,
                                    mode:
                                      event.target.value === "ANY"
                                        ? "ANY"
                                        : "ALL",
                                  },
                                },
                              }))
                            }
                            className="w-full text-sm"
                          >
                            <option value="ALL">
                              All selected stages must be completed
                            </option>
                            <option value="ANY">
                              Any one selected stage may unlock this stage
                            </option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="ds-label block">
                            Required Stages
                          </label>
                          <div className="max-h-44 space-y-2 overflow-y-auto rounded-xl border border-outline-variant bg-surface p-3">
                            {nodes
                              .filter(
                                (node) =>
                                  node.isActive &&
                                  node.key !== selectedNode.key,
                              )
                              .map((node) => {
                                const checked =
                                  selectedNode.actionConfig.prerequisiteGate.requiredNodeKeys.includes(
                                    node.key,
                                  );
                                return (
                                  <PillToggle
                                    key={node.key}
                                    checked={checked}
                                    density="compact"
                                    className="min-h-0 bg-surface-container-low"
                                    label={
                                      <span className="flex flex-wrap items-center gap-2">
                                        <span>{node.name}</span>
                                        <span className="ds-label">
                                          {node.key}
                                        </span>
                                      </span>
                                    }
                                    onCheckedChange={(nextChecked) =>
                                        updateSelectedNode((current) => ({
                                          ...current,
                                          actionConfig: {
                                            ...current.actionConfig,
                                            prerequisiteGate: {
                                              ...current.actionConfig
                                                .prerequisiteGate,
                                              requiredNodeKeys: nextChecked
                                                ? [
                                                    ...current.actionConfig
                                                      .prerequisiteGate
                                                      .requiredNodeKeys,
                                                    node.key,
                                                  ]
                                                : current.actionConfig.prerequisiteGate.requiredNodeKeys.filter(
                                                    (entry) =>
                                                      entry !== node.key,
                                                  ),
                                            },
                                          },
                                        }))
                                      }
                                  />
                                );
                              })}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
                <details className="rounded-xl border border-outline-variant bg-surface p-3">
                  <summary className="cursor-pointer text-sm font-medium text-on-surface">
                    Advanced Routing And Metadata
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                      <label className="ds-label block">Key</label>
                      <input
                        value={selectedNode.key}
                        onChange={(event) => {
                          const nextKey = slugify(event.target.value);
                          const previousKey = selectedNode.key;
                          updateSelectedNode((node) => ({
                            ...node,
                            autoManaged: {
                              ...node.autoManaged,
                              key: false,
                            },
                            key: nextKey,
                          }));
                          if (nextKey !== previousKey) {
                            setEdges((prev) =>
                              prev.map((edge) => ({
                                ...edge,
                                sourceKey:
                                  edge.sourceKey === previousKey
                                    ? nextKey
                                    : edge.sourceKey,
                                targetKey:
                                  edge.targetKey === previousKey
                                    ? nextKey
                                    : edge.targetKey,
                              })),
                            );
                          }
                        }}
                        className="w-full text-sm ds-numeric"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="ds-label block">Node Type</label>
                        <select
                          value={selectedNode.nodeType}
                          onChange={(event) =>
                            updateSelectedNode((node) =>
                              applyAutoManagedNodeMetadata(
                                {
                                  ...node,
                                  nodeType: event.target
                                    .value as NodeDraft["nodeType"],
                                },
                                nodes,
                                node,
                              ),
                            )
                          }
                          className="w-full text-sm"
                        >
                          <option value="START">Start</option>
                          <option value="CHECKLIST_NODE">Checklist Node</option>
                          <option value="NOTIFICATION">Notification</option>
                          <option value="DECISION">Decision</option>
                          <option value="SECTION">Section</option>
                          <option value="END">End</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="ds-label block">Sort Order</label>
                        <input
                          type="number"
                          min={1}
                          value={selectedNode.sortOrder}
                          onChange={(event) =>
                            updateSelectedNode((node) => ({
                              ...node,
                              autoManaged: {
                                ...node.autoManaged,
                                sortOrder: false,
                              },
                              sortOrder: Math.max(
                                1,
                                Number(event.target.value || 1),
                              ),
                            }))
                          }
                          className="w-full text-sm ds-numeric"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="ds-label block">Category</label>
                      <input
                        value={selectedNode.category}
                        onChange={(event) =>
                          updateSelectedNode((node) => ({
                            ...node,
                            autoManaged: {
                              ...node.autoManaged,
                              category: false,
                            },
                            category: event.target.value,
                          }))
                        }
                        className="w-full text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="ds-label block">Section Key</label>
                      <input
                        value={selectedNode.sectionKey}
                        onChange={(event) =>
                          updateSelectedNode((node) => ({
                            ...node,
                            autoManaged: {
                              ...node.autoManaged,
                              sectionKey: false,
                            },
                            sectionKey: slugify(event.target.value),
                          }))
                          }
                          className="w-full text-sm ds-numeric"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="ds-label block">Section Label</label>
                      <input
                        value={selectedNode.sectionName}
                        onChange={(event) =>
                          updateSelectedNode((node) => ({
                            ...node,
                            autoManaged: {
                              ...node.autoManaged,
                              sectionName: false,
                            },
                            sectionName: event.target.value,
                          }))
                          }
                          className="w-full text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="ds-label block">Branch Key</label>
                      <input
                        value={selectedNode.branchKey}
                        onChange={(event) =>
                          updateSelectedNode((node) => ({
                            ...node,
                            autoManaged: {
                              ...node.autoManaged,
                              branchKey: false,
                            },
                            branchKey: slugify(event.target.value),
                          }))
                          }
                          className="w-full text-sm ds-numeric"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="ds-label block">Branch Label</label>
                      <input
                        value={selectedNode.branchName}
                        onChange={(event) =>
                          updateSelectedNode((node) => ({
                            ...node,
                            autoManaged: {
                              ...node.autoManaged,
                              branchName: false,
                            },
                            branchName: event.target.value,
                          }))
                          }
                          className="w-full text-sm"
                        />
                      </div>
                    </div>
                    {selectedNode.approvalRequired ? (
                      <div className="space-y-1.5">
                        <label className="ds-label block">Approval Roles</label>
                        <input
                          value={selectedNode.approvalRoles.join(", ")}
                          onChange={(event) =>
                            updateSelectedNode((node) => ({
                              ...node,
                              approvalRoles: event.target.value
                                .split(",")
                                .map((value) => value.trim())
                                .filter(Boolean),
                            }))
                          }
                          className="w-full text-sm"
                          placeholder="Manager, Admin"
                        />
                      </div>
                    ) : null}
                    <div className="space-y-1.5">
                      <label className="ds-label block">
                        Allowed Processor Roles
                      </label>
                      <input
                        value={selectedNode.allowedRoles.join(", ")}
                        onChange={(event) =>
                          updateSelectedNode((node) => ({
                            ...node,
                            allowedRoles: event.target.value
                              .split(",")
                              .map((value) => value.trim())
                              .filter(Boolean),
                          }))
                        }
                        className="w-full text-sm"
                        placeholder="Leave empty so anyone concerned with the job can process it"
                      />
                      <p className="text-xs text-on-surface-variant">
                        Empty means anyone who can access the job can complete
                        this node.
                      </p>
                    </div>
                  </div>
                </details>
                {selectedNode.nodeType === "NOTIFICATION" ? (
                  <div className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                    This node runs automatically. When the workflow enters it,
                    the job owner, assigned manager, and all assigned users
                    receive a notification, then the workflow advances through
                    its single connected path.
                  </div>
                ) : null}
              </div>

              <div className="ds-form-section space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="ds-h3 text-on-surface">Stage Fields</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addFieldDefinition}
                  >
                    <Plus size={14} />
                    Add Field
                  </Button>
                </div>
                <div className="space-y-3">
                  {selectedNode.fieldDefinitions.map((field) => (
                    <div
                      key={field.id}
                      className="rounded-xl border border-outline-variant bg-surface-container-low p-4"
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-on-surface">
                          {field.label || "Untitled Field"}
                        </p>
                        <Button
                          variant="outline"
                          mode="icon"
                          size="sm"
                          onClick={() =>
                            updateSelectedNode((node) => ({
                              ...node,
                              fieldDefinitions: node.fieldDefinitions.filter(
                                (entry) => entry.id !== field.id,
                              ),
                            }))
                          }
                          aria-label="Delete field"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            value={field.label}
                            onChange={(event) =>
                              updateFieldDefinition(field.id, (current) => ({
                                ...current,
                                label: event.target.value,
                              }))
                            }
                            className="w-full text-sm"
                            placeholder="Field label"
                          />
                          <input
                            value={field.key}
                            onChange={(event) =>
                              updateFieldDefinition(field.id, (current) => ({
                                ...current,
                                key: slugify(event.target.value),
                              }))
                            }
                            className="w-full text-sm ds-numeric"
                            placeholder="field_key"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <select
                            value={field.type}
                            onChange={(event) =>
                              updateFieldDefinition(field.id, (current) => ({
                                ...current,
                                type: event.target
                                  .value as FieldDefinitionDraft["type"],
                              }))
                            }
                            className="w-full text-sm"
                          >
                            <option value="TEXT">Text</option>
                            <option value="TEXTAREA">Textarea</option>
                            <option value="DATE">Date</option>
                          </select>
                          <PillToggle
                            checked={field.required}
                            label="Required"
                            density="compact"
                            className="min-h-0"
                            onCheckedChange={(nextChecked) =>
                              updateFieldDefinition(field.id, (current) => ({
                                ...current,
                                required: nextChecked,
                              }))
                            }
                          />
                        </div>
                        <input
                          value={field.placeholder}
                          onChange={(event) =>
                            updateFieldDefinition(field.id, (current) => ({
                              ...current,
                              placeholder: event.target.value,
                            }))
                          }
                          className="w-full text-sm"
                          placeholder="Placeholder"
                        />
                        <textarea
                          value={field.helperText}
                          onChange={(event) =>
                            updateFieldDefinition(field.id, (current) => ({
                              ...current,
                              helperText: event.target.value,
                            }))
                          }
                          rows={2}
                          className="w-full text-sm"
                          placeholder="Helper text"
                        />
                      </div>
                    </div>
                  ))}
                  {selectedNode.fieldDefinitions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-6 text-sm text-on-surface-variant">
                      No node-level fields configured for this stage.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="ds-form-section space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="ds-h3 text-on-surface">Required Documents</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addDocumentRequirement}
                  >
                    <Plus size={14} />
                    Add Document
                  </Button>
                </div>
                <div className="space-y-3">
                  {selectedNode.documentRequirements.map((requirement) => (
                    <div
                      key={requirement.id}
                      className="rounded-xl border border-outline-variant bg-surface-container-low p-2.5"
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-on-surface">
                          {requirement.label || "Untitled Document"}
                        </p>
                        <Button
                          variant="outline"
                          mode="icon"
                          size="sm"
                          onClick={() =>
                            updateSelectedNode((node) => ({
                              ...node,
                              documentRequirements:
                                node.documentRequirements.filter(
                                  (entry) => entry.id !== requirement.id,
                                ),
                            }))
                          }
                          aria-label="Delete document"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            value={requirement.label}
                            onChange={(event) =>
                              updateDocumentRequirement(
                                requirement.id,
                                (current) => ({
                                  ...current,
                                  label: event.target.value,
                                }),
                              )
                            }
                            className="w-full text-sm"
                            placeholder="Document label"
                          />
                          <input
                            value={requirement.key}
                            onChange={(event) =>
                              updateDocumentRequirement(
                                requirement.id,
                                (current) => ({
                                  ...current,
                                  key: slugify(event.target.value),
                                }),
                              )
                            }
                            className="w-full text-sm ds-numeric"
                            placeholder="document_key"
                          />
                        </div>
                        <textarea
                          value={requirement.description}
                          onChange={(event) =>
                            updateDocumentRequirement(
                              requirement.id,
                              (current) => ({
                                ...current,
                                description: event.target.value,
                              }),
                            )
                          }
                          rows={2}
                          className="w-full text-sm"
                          placeholder="Operator guidance"
                        />
                        <input
                          value={requirement.acceptedFileTypes.join(", ")}
                          onChange={(event) =>
                            updateDocumentRequirement(
                              requirement.id,
                              (current) => ({
                                ...current,
                                acceptedFileTypes: event.target.value
                                  .split(",")
                                  .map((value) => value.trim())
                                  .filter(Boolean),
                              }),
                            )
                          }
                          className="w-full text-sm"
                          placeholder="application/pdf, image/jpeg"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="number"
                            min={0}
                            value={requirement.minUploads}
                            onChange={(event) =>
                              updateDocumentRequirement(
                                requirement.id,
                                (current) => ({
                                  ...current,
                                  minUploads: Math.max(
                                    0,
                                    Number(event.target.value || 0),
                                  ),
                                }),
                              )
                            }
                            className="w-full text-sm ds-numeric"
                            placeholder="Minimum uploads"
                          />
                          <input
                            type="number"
                            min={requirement.minUploads}
                            value={requirement.maxUploads ?? ""}
                            onChange={(event) =>
                              updateDocumentRequirement(
                                requirement.id,
                                (current) => ({
                                  ...current,
                                  maxUploads: event.target.value
                                    ? Math.max(
                                        current.minUploads,
                                        Number(event.target.value),
                                      )
                                    : null,
                                }),
                              )
                            }
                            className="w-full text-sm ds-numeric"
                            placeholder="Maximum uploads"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <select
                            value={requirement.validityUnit}
                            onChange={(event) =>
                              updateDocumentRequirement(
                                requirement.id,
                                (current) => ({
                                  ...current,
                                  validityUnit: event.target
                                    .value as ValidityUnit,
                                }),
                              )
                            }
                            className="w-full text-sm"
                          >
                            <option value="BUSINESS_DAYS">Validity Unit</option>
                            <option value="CALENDAR_DAYS">Calendar Days</option>
                          </select>
                          <input
                            type="number"
                            min={1}
                            value={requirement.warningBeforeDuration ?? ""}
                            onChange={(event) =>
                              updateDocumentRequirement(
                                requirement.id,
                                (current) => ({
                                  ...current,
                                  warningBeforeDuration: event.target.value
                                    ? Math.max(1, Number(event.target.value))
                                    : null,
                                }),
                              )
                            }
                            className="w-full text-sm ds-numeric"
                            placeholder="Warn before expiry"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-on-surface">
                          <PillToggle
                            checked={requirement.required}
                            label="Required"
                            density="compact"
                            onCheckedChange={(nextChecked) =>
                              updateDocumentRequirement(
                                requirement.id,
                                (current) => ({
                                  ...current,
                                  required: nextChecked,
                                }),
                              )
                            }
                          />
                          <PillToggle
                            checked={requirement.allowReplacement}
                            label="Replaceable"
                            density="compact"
                            onCheckedChange={(nextChecked) =>
                              updateDocumentRequirement(
                                requirement.id,
                                (current) => ({
                                  ...current,
                                  allowReplacement: nextChecked,
                                }),
                              )
                            }
                          />
                          <PillToggle
                            checked={requirement.allowPreview}
                            label="Preview"
                            density="compact"
                            onCheckedChange={(nextChecked) =>
                              updateDocumentRequirement(
                                requirement.id,
                                (current) => ({
                                  ...current,
                                  allowPreview: nextChecked,
                                }),
                              )
                            }
                          />
                          <PillToggle
                            checked={requirement.requiresValidity}
                            label="Validity"
                            density="compact"
                            onCheckedChange={(nextChecked) =>
                              updateDocumentRequirement(
                                requirement.id,
                                (current) => ({
                                  ...current,
                                  requiresValidity: nextChecked,
                                }),
                              )
                            }
                          />
                          <PillToggle
                            checked={requirement.notifyBeforeExpiry}
                            label="Notify Before Expiry"
                            tone="warning"
                            density="compact"
                            onCheckedChange={(nextChecked) =>
                              updateDocumentRequirement(
                                requirement.id,
                                (current) => ({
                                  ...current,
                                  notifyBeforeExpiry: nextChecked,
                                }),
                              )
                            }
                          />
                          <PillToggle
                            checked={requirement.isVisibleInTimeline}
                            label="Timeline Visible"
                            density="compact"
                            onCheckedChange={(nextChecked) =>
                              updateDocumentRequirement(
                                requirement.id,
                                (current) => ({
                                  ...current,
                                  isVisibleInTimeline: nextChecked,
                                }),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedNode.documentRequirements.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-6 text-sm text-on-surface-variant">
                      No node-level document requirements configured for this
                      stage.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="ds-form-section space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="ds-h3 text-on-surface">Checklist Items</h3>
                  {selectedNode.nodeType === "CHECKLIST_NODE" ? (
                    selectedNode.checklistItems.length === 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addChecklistItem}
                      >
                        <Plus size={14} />
                        Add Item
                      </Button>
                    ) : (
                      <Badge variant="success">STANDALONE CHECKLIST NODE</Badge>
                    )
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddChecklistNode}
                    >
                      <Plus size={14} />
                      Add Checklist Node
                    </Button>
                  )}
                </div>

                {selectedNode.nodeType === "NOTIFICATION" ? (
                  <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                    Notification nodes do not use checklist items. Use the node
                    name as the notification title and the description as the
                    message body.
                  </div>
                ) : null}

                {selectedNode.nodeType !== "CHECKLIST_NODE" &&
                selectedNode.nodeType !== "NOTIFICATION" ? (
                  <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                    Checklist items should be modeled as separate nodes. Use{" "}
                    <span className="font-medium text-on-surface">
                      Add Checklist Node
                    </span>{" "}
                    for new workflow checks.
                  </div>
                ) : null}

                {selectedNode.checklistItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-6 text-sm text-on-surface-variant">
                    No checklist items configured for this node yet.
                  </div>
                ) : null}

                <div className="space-y-4">
                  {selectedNode.checklistItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-outline-variant bg-surface-container-low p-2.5"
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          <p className="ds-label">Item {index + 1}</p>
                          <p className="text-sm font-semibold text-on-surface">
                            {item.label || "Untitled Checklist Item"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            mode="icon"
                            size="sm"
                            onClick={() => reorderChecklistItem(item.id, -1)}
                            aria-label="Move checklist item up"
                          >
                            <ChevronUp size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            mode="icon"
                            size="sm"
                            onClick={() => reorderChecklistItem(item.id, 1)}
                            aria-label="Move checklist item down"
                          >
                            <ChevronDown size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            mode="icon"
                            size="sm"
                            onClick={() =>
                              updateSelectedNode((node) => ({
                                ...node,
                                checklistItems: node.checklistItems.filter(
                                  (entry) => entry.id !== item.id,
                                ),
                              }))
                            }
                            aria-label="Delete checklist item"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <input
                          value={item.label}
                          onChange={(event) =>
                            updateChecklistItem(item.id, (current) => ({
                              ...current,
                              label: event.target.value,
                            }))
                          }
                          className="w-full text-sm"
                          placeholder="Checklist item name"
                        />
                        <textarea
                          value={item.description}
                          onChange={(event) =>
                            updateChecklistItem(item.id, (current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          rows={2}
                          className="w-full text-sm"
                          placeholder="Help text or operator guidance"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="space-y-1.5">
                            <label className="ds-label block">Deadline</label>
                            <input
                              type="number"
                              min={1}
                              value={item.deadlineDuration}
                              onChange={(event) =>
                                updateChecklistItem(item.id, (current) => ({
                                  ...current,
                                  deadlineDuration: Math.max(
                                    1,
                                    Number(event.target.value || 1),
                                  ),
                                }))
                              }
                              className="w-full text-sm ds-numeric"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="ds-label block">
                              Deadline Unit
                            </label>
                            <select
                              value={item.deadlineUnit}
                              onChange={(event) =>
                                updateChecklistItem(item.id, (current) => ({
                                  ...current,
                                  deadlineUnit: event.target
                                    .value as ChecklistItemDraft["deadlineUnit"],
                                }))
                              }
                              className="w-full text-sm"
                            >
                              <option value="BUSINESS_DAYS">
                                Business Days
                              </option>
                              <option value="CALENDAR_DAYS">
                                Calendar Days
                              </option>
                            </select>
                          </div>
                        </div>

                        <div className="grid gap-2 text-sm text-on-surface">
                          {(
                            [
                              {
                                label: "Mandatory",
                                checked: item.isMandatory,
                                field: "isMandatory",
                              },
                              {
                                label: "Completion Remarks",
                                checked: item.requiresRemarks,
                                field: "requiresRemarks",
                              },
                              {
                                label: "Delay Remarks Required",
                                checked: item.delayRemarksRequired,
                                field: "delayRemarksRequired",
                              },
                              {
                                label: "Active",
                                checked: item.isActive,
                                field: "isActive",
                              },
                            ] as const
                          ).map(({ label, checked, field }) => (
                            <PillToggle
                              key={label}
                              checked={checked as boolean}
                              label={label}
                              density="compact"
                              onCheckedChange={(nextChecked) =>
                                  updateChecklistItem(item.id, (current) => ({
                                    ...current,
                                    [field]: nextChecked,
                                  }))
                                }
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : selectedEdge ? (
            <div className="space-y-6 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="ds-label">Selected Connector</p>
                  <h2 className="ds-h2 text-on-surface">Route Settings</h2>
                </div>
                <Button
                  variant="outline"
                  mode="icon"
                  size="sm"
                  onClick={() => void deleteSelectedEdge()}
                  disabled={activeVersion?.isPublished}
                  aria-label="Delete connector"
                >
                  <Trash2 size={15} />
                </Button>
              </div>

              <div className="ds-form-section space-y-4">
                <h3 className="ds-h3 text-on-surface">Connector</h3>
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3 text-sm text-on-surface">
                  <div className="ds-label text-on-surface-variant">From</div>
                  <div className="mt-1 break-all ds-numeric">
                    {selectedEdge.sourceKey}
                  </div>
                  <div className="mt-3 ds-label text-on-surface-variant">
                    To
                  </div>
                  <div className="mt-1 break-all ds-numeric">
                    {selectedEdge.targetKey}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="ds-label block">Connector Label</label>
                  <input
                    value={selectedEdge.label || ""}
                    onChange={(event) =>
                      updateSelectedEdge((edge) => ({
                        ...edge,
                        label: event.target.value || null,
                      }))
                    }
                    className="w-full text-sm"
                    placeholder="Example: RMS Path, Recheck BE, Next"
                    disabled={activeVersion?.isPublished}
                  />
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3 text-xs text-on-surface-variant">
                  Backward connectors are allowed. Use them for cases like
                  Examination returning to Bill of Entry upload, then routing
                  forward again.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <div className="space-y-3">
                <span className="ds-icon-badge mx-auto">
                  <Workflow size={18} />
                </span>
                <h2 className="ds-h3 text-on-surface">SELECT A NODE</h2>
                <p className="max-w-xs text-sm text-on-surface-variant">
                  Choose a node on the canvas to edit checklist deadlines,
                  upload rules, and route behavior.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
