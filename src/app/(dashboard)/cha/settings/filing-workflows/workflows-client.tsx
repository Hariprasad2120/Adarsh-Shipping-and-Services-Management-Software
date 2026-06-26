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
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as actions from "@/modules/cha/actions";

interface WorkflowsClientProps {
  initialTemplates: any[];
  availableRoles: string[];
  availableJobTypes: { id: string; name: string }[];
}

type ChecklistItemDraft = {
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
  deadlineUnit: "BUSINESS_DAYS" | "CALENDAR_DAYS";
  delayRemarksRequired: boolean;
  sortOrder: number;
  isActive: boolean;
};

type PhotoRequirementDraft = {
  id: string;
  label: string;
  description: string;
  isMandatory: boolean;
  minPhotos: number;
  maxPhotos: number | null;
  acceptedFileTypes: string[];
  isVisibleInTimeline: boolean;
};

type NodeDraft = {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  nodeType: "CHECKLIST_NODE" | "START" | "END" | "DECISION" | "SECTION" | "NOTIFICATION";
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
};

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

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "node";
}

function normalizeChecklistItem(item: any, index: number): ChecklistItemDraft {
  return {
    id: item.id || createId("item"),
    label: item.label || "",
    description: item.description || "",
    isMandatory: item.isMandatory !== false,
    requiresRemarks: !!item.requiresRemarks,
    allowsUpload: !!item.allowsUpload,
    minUploads: Number(item.minUploads ?? 0),
    maxUploads: item.maxUploads === null || item.maxUploads === undefined ? null : Number(item.maxUploads),
    acceptedFileTypes: Array.isArray(item.acceptedFileTypes) ? item.acceptedFileTypes : [],
    deadlineDuration: Number(item.deadlineDuration ?? 2),
    deadlineUnit: item.deadlineUnit === "CALENDAR_DAYS" ? "CALENDAR_DAYS" : "BUSINESS_DAYS",
    delayRemarksRequired: item.delayRemarksRequired !== false,
    sortOrder: Number(item.sortOrder ?? index + 1),
    isActive: item.isActive !== false,
  };
}

function normalizePhotoRequirement(item: any): PhotoRequirementDraft {
  return {
    id: item.id || createId("photo"),
    label: item.label || "",
    description: item.description || "",
    isMandatory: item.isMandatory !== false,
    minPhotos: Number(item.minPhotos ?? 1),
    maxPhotos: item.maxPhotos === null || item.maxPhotos === undefined ? null : Number(item.maxPhotos),
    acceptedFileTypes: Array.isArray(item.acceptedFileTypes) ? item.acceptedFileTypes : ["image/jpeg", "image/png", "application/pdf"],
    isVisibleInTimeline: item.isVisibleInTimeline !== false,
  };
}

function normalizeNode(node: any, index: number): NodeDraft {
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
    slaUnit: node.slaUnit === "CALENDAR_DAYS" ? "CALENDAR_DAYS" : "BUSINESS_DAYS",
    commentsRequired: !!node.commentsRequired,
    canBeSkipped: !!node.canBeSkipped,
    canBeRevisited: node.canBeRevisited !== false,
    approvalRequired: !!node.approvalRequired,
    approvalRoles: Array.isArray(node.approvalRoles) ? node.approvalRoles : [],
    requireAllMandatoryChecklistItems: node.requireAllMandatoryChecklistItems !== false,
    requireMandatoryPhotos: !!node.requireMandatoryPhotos,
    allowedRoles: Array.isArray(node.allowedRoles) ? node.allowedRoles : [],
    checklistItems: Array.isArray(node.checklistItems) ? node.checklistItems.map(normalizeChecklistItem) : [],
    photoRequirements: Array.isArray(node.photoRequirements) ? node.photoRequirements.map(normalizePhotoRequirement) : [],
  };
}

function buildValidation(nodes: NodeDraft[], edges: EdgeDraft[]) {
  const activeNodes = nodes.filter((node) => node.isActive);
  const activeNodeMap = new Map(activeNodes.map((node) => [node.key, node]));
  const errors: string[] = [];
  const warnings: string[] = [];
  const edgeSet = new Set<string>();

  if (activeNodes.length === 0) {
    errors.push("At least one active node is required.");
  }

  const startNodes = activeNodes.filter((node) => node.isStart);
  if (startNodes.length !== 1) {
    errors.push(startNodes.length === 0 ? "Exactly one start node is required." : "Only one start node can be active.");
  }

  for (const node of activeNodes) {
    if (!node.name.trim()) {
      errors.push(`Node ${node.key} must have a name.`);
    }
    const activeItems = node.checklistItems.filter((item) => item.isActive);
    if (node.nodeType === "CHECKLIST_NODE" && activeItems.length === 0) {
      errors.push(`Checklist node ${node.name || node.key} must have at least one active checklist item.`);
    }
    if (node.nodeType === "NOTIFICATION" && activeItems.length > 0) {
      warnings.push(`Notification node ${node.name || node.key} ignores checklist items.`);
    }
    for (const item of activeItems) {
      if (!item.label.trim()) {
        errors.push(`Checklist items in ${node.name || node.key} must have a name.`);
      }
      if (item.deadlineDuration <= 0) {
        errors.push(`Checklist item "${item.label || "Untitled"}" must have a valid SLA duration.`);
      }
      if (item.allowsUpload && item.maxUploads !== null && item.maxUploads < item.minUploads) {
        errors.push(`Checklist item "${item.label || "Untitled"}" has max uploads lower than min uploads.`);
      }
    }
  }

  for (const edge of edges) {
    if (edge.sourceKey === edge.targetKey) {
      errors.push(`Node ${edge.sourceKey} cannot connect to itself.`);
    }
    if (!activeNodeMap.has(edge.sourceKey) || !activeNodeMap.has(edge.targetKey)) {
      errors.push(`Edge ${edge.sourceKey} -> ${edge.targetKey} points to an inactive or missing node.`);
    }
    const signature = `${edge.sourceKey}:${edge.targetKey}`;
    if (edgeSet.has(signature)) {
      errors.push(`Duplicate edge ${edge.sourceKey} -> ${edge.targetKey}.`);
    }
    edgeSet.add(signature);
  }

  for (const node of activeNodes) {
    if (node.nodeType === "NOTIFICATION") {
      const outgoingCount = edges.filter((edge) => edge.sourceKey === node.key).length;
      if (outgoingCount > 1) {
        errors.push(`Notification node ${node.name || node.key} can have at most one outgoing edge.`);
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
      errors.push(`Disconnected active nodes: ${disconnected.map((node) => node.name).join(", ")}.`);
    }
  }

  for (const edge of edges) {
    const source = activeNodeMap.get(edge.sourceKey);
    const target = activeNodeMap.get(edge.targetKey);
    if (source && target && target.positionY <= source.positionY) {
      warnings.push(`Double-back path configured: ${source.name} -> ${target.name}.`);
    }
  }

  return { errors, warnings };
}

function serializeWorkflowSnapshot(nodes: NodeDraft[], edges: EdgeDraft[]) {
  return JSON.stringify({
    nodes: nodes.map((node) => ({
      ...node,
      checklistItems: [...node.checklistItems].sort((a, b) => a.sortOrder - b.sortOrder),
    })).sort((a, b) => a.key.localeCompare(b.key)),
    edges: [...edges]
      .map((edge) => ({ sourceKey: edge.sourceKey, targetKey: edge.targetKey, label: edge.label || null }))
      .sort((a, b) => `${a.sourceKey}:${a.targetKey}`.localeCompare(`${b.sourceKey}:${b.targetKey}`)),
  });
}

function createChecklistItemDraft(label: string, sortOrder = 1): ChecklistItemDraft {
  return {
    id: createId("item"),
    label,
    description: "",
    isMandatory: true,
    requiresRemarks: false,
    allowsUpload: false,
    minUploads: 0,
    maxUploads: null,
    acceptedFileTypes: [],
    deadlineDuration: 2,
    deadlineUnit: "BUSINESS_DAYS",
    delayRemarksRequired: true,
    sortOrder,
    isActive: true,
  };
}

function createStageUploadSlot(label: string): PhotoRequirementDraft {
  return {
    id: createId("photo"),
    label: `${label} upload`,
    description: "Upload stage-level proof, bill copy, screenshot, or supporting document if required for this main filing stage.",
    isMandatory: false,
    minPhotos: 0,
    maxPhotos: null,
    acceptedFileTypes: ["image/jpeg", "image/png", "application/pdf"],
    isVisibleInTimeline: true,
  };
}

function createWorkflowStageNode(
  name: string,
  key: string,
  order: number,
  x: number,
  y: number,
  isStart = false,
): NodeDraft {
  return {
    id: createId("node"),
    key,
    name,
    description: "Main filing stage. Use upload slots below to decide whether proof/photo/document upload is optional or mandatory.",
    category: "MAIN_STAGE",
    nodeType: "SECTION",
    sectionKey: key,
    sectionName: name,
    branchKey: "",
    branchName: "",
    sortOrder: order,
    isActive: true,
    isStart,
    positionX: x,
    positionY: y,
    slaDuration: 2,
    slaUnit: "BUSINESS_DAYS",
    commentsRequired: false,
    canBeSkipped: false,
    canBeRevisited: true,
    approvalRequired: false,
    approvalRoles: [],
    requireAllMandatoryChecklistItems: true,
    requireMandatoryPhotos: false,
    allowedRoles: [],
    checklistItems: [],
    photoRequirements: [createStageUploadSlot(name)],
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
): NodeDraft {
  return {
    id: createId("node"),
    key,
    name: label,
    description: "Standalone configurable checklist node. It can be rerouted, delayed, revisited, or branched independently.",
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
    slaDuration: 2,
    slaUnit: "BUSINESS_DAYS",
    commentsRequired: false,
    canBeSkipped: false,
    canBeRevisited: true,
    approvalRequired: false,
    approvalRoles: [],
    requireAllMandatoryChecklistItems: true,
    requireMandatoryPhotos: false,
    allowedRoles: [],
    checklistItems: [createChecklistItemDraft(label, 1)],
    photoRequirements: [],
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
    description: "Automatically notifies the job owner, assigned manager, and all assigned users, then moves to the next connected node.",
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
  };
}

function connectNodes(sourceKey: string, targetKey: string, label?: string): EdgeDraft {
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
  const firstCheckItems = [
    "Bill of Entry",
    "Goods Registration",
    "Examination",
    "CE",
    "Group Forward",
    "Assessment",
    "Duty",
    "OOC",
    "Delivery",
  ];
  const rmsItems = ["Goods Registration", "Duty", "Assessment", "OOC", "Delivery"];
  const openBillItems = ["Assessment", "Goods Registration", "Examination", "Duty", "OOC", "Delivery"];

  const leftX = 120;
  const branchX = 500;
  const yStart = 120;
  const rowGap = 190;
  let order = 1;

  const firstCheck = createWorkflowStageNode("First Check", "first_check", order++, leftX, yStart, true);
  nodes.push(firstCheck);

  let previousKey = firstCheck.key;
  firstCheckItems.forEach((label, index) => {
    const key = `first_check_${slugify(label)}`;
    const node = createWorkflowChecklistNode(label, key, order++, leftX, yStart + (index + 1) * rowGap, "First Check", "first_check");
    nodes.push(node);
    edges.push(connectNodes(previousKey, key, index === 0 ? "Start First Check" : "Next"));
    previousKey = key;
  });

  const secondCheckY = yStart + (firstCheckItems.length + 1) * rowGap + 80;
  const secondCheck = createWorkflowStageNode("Second Check", "second_check", order++, leftX, secondCheckY);
  nodes.push(secondCheck);
  edges.push(connectNodes(previousKey, secondCheck.key, "Move to Second Check"));

  const rmsStageY = secondCheckY + rowGap;
  const rmsStage = createWorkflowStageNode("RMS", "second_check_rms", order++, leftX, rmsStageY);
  rmsStage.category = "BRANCH";
  rmsStage.sectionKey = "second_check";
  rmsStage.sectionName = "Second Check";
  rmsStage.branchKey = "rms";
  rmsStage.branchName = "RMS";
  nodes.push(rmsStage);
  edges.push(connectNodes(secondCheck.key, rmsStage.key, "RMS Path"));

  let rmsPreviousKey = rmsStage.key;
  rmsItems.forEach((label, index) => {
    const key = `second_check_rms_${slugify(label)}`;
    const node = createWorkflowChecklistNode(label, key, order++, leftX, rmsStageY + (index + 1) * rowGap, "Second Check", "second_check", "RMS", "rms");
    nodes.push(node);
    edges.push(connectNodes(rmsPreviousKey, key, index === 0 ? "Start RMS" : "Next"));
    rmsPreviousKey = key;
  });

  const openBillStage = createWorkflowStageNode("Open Bill", "second_check_open_bill", order++, branchX, rmsStageY);
  openBillStage.category = "BRANCH";
  openBillStage.sectionKey = "second_check";
  openBillStage.sectionName = "Second Check";
  openBillStage.branchKey = "open_bill";
  openBillStage.branchName = "Open Bill";
  nodes.push(openBillStage);
  edges.push(connectNodes(secondCheck.key, openBillStage.key, "Open Bill Path"));

  let openBillPreviousKey = openBillStage.key;
  openBillItems.forEach((label, index) => {
    const key = `second_check_open_bill_${slugify(label)}`;
    const node = createWorkflowChecklistNode(label, key, order++, branchX, rmsStageY + (index + 1) * rowGap, "Second Check", "second_check", "Open Bill", "open_bill");
    nodes.push(node);
    edges.push(connectNodes(openBillPreviousKey, key, index === 0 ? "Start Open Bill" : "Next"));
    openBillPreviousKey = key;
  });

  const amendmentY = Math.max(
    rmsStageY + (rmsItems.length + 2) * rowGap,
    rmsStageY + (openBillItems.length + 2) * rowGap,
  );
  const amendment = createWorkflowStageNode("Amendment", "amendment", order++, Math.round((leftX + branchX) / 2), amendmentY);
  amendment.description = "Future amendment flow placeholder. Add checklist nodes below this stage when amendment processing rules are finalized.";
  nodes.push(amendment);
  edges.push(connectNodes(rmsPreviousKey, amendment.key, "RMS Complete"));
  edges.push(connectNodes(openBillPreviousKey, amendment.key, "Open Bill Complete"));

  return { nodes, edges };
}

function getConnectorPath(source: NodeDraft, target: NodeDraft) {
  const sourceCenterX = source.positionX + NODE_WIDTH / 2;
  const sourceCenterY = source.positionY + NODE_HEIGHT / 2;
  const targetCenterX = target.positionX + NODE_WIDTH / 2;
  const targetCenterY = target.positionY + NODE_HEIGHT / 2;
  const isBackRoute = target.positionY <= source.positionY;
  const isSideRoute = Math.abs(targetCenterX - sourceCenterX) > NODE_WIDTH && Math.abs(targetCenterY - sourceCenterY) < NODE_HEIGHT * 1.4;

  if (isBackRoute || isSideRoute) {
    const startX = targetCenterX < sourceCenterX ? source.positionX : source.positionX + NODE_WIDTH;
    const startY = sourceCenterY;
    const endX = targetCenterX < sourceCenterX ? target.positionX + NODE_WIDTH : target.positionX;
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
  if (node.nodeType === "SECTION" && node.category === "MAIN_STAGE") return "MAIN STAGE";
  if (node.category === "BRANCH") return "BRANCH";
  if (node.category === "CHECKLIST_ITEM") return "CHECKLIST";
  return node.nodeType.replace(/_/g, " ");
}

function autoArrangeNodes(nodes: NodeDraft[], edges: EdgeDraft[]) {
  if (nodes.length === 0) {
    return nodes;
  }

  const sections = new Map<string, NodeDraft[]>();
  for (const node of nodes) {
    const sectionId = node.sectionKey || node.sectionName || node.category || "workflow";
    const bucket = sections.get(sectionId) ?? [];
    bucket.push(node);
    sections.set(sectionId, bucket);
  }

  const orderedSections = Array.from(sections.entries()).sort(([, leftNodes], [, rightNodes]) => {
    const leftOrder = Math.min(...leftNodes.map((node) => node.sortOrder || Number.MAX_SAFE_INTEGER));
    const rightOrder = Math.min(...rightNodes.map((node) => node.sortOrder || Number.MAX_SAFE_INTEGER));
    return leftOrder - rightOrder;
  });

  const VERTICAL_GAP = 180;
  const SECTION_GAP = 120;
  const BRANCH_GAP = 340;
  const START_X = 120;
  const START_Y = 120;
  let currentY = START_Y;
  const nextPositions = new Map<string, { x: number; y: number }>();

  for (const [, sectionNodes] of orderedSections) {
    const branches = new Map<string, NodeDraft[]>();
    for (const node of sectionNodes) {
      const branchId = node.branchKey || node.branchName || "__default";
      const bucket = branches.get(branchId) ?? [];
      bucket.push(node);
      branches.set(branchId, bucket);
    }

    const orderedBranches = Array.from(branches.entries()).sort(([, leftNodes], [, rightNodes]) => {
      const leftOrder = Math.min(...leftNodes.map((node) => node.sortOrder || Number.MAX_SAFE_INTEGER));
      const rightOrder = Math.min(...rightNodes.map((node) => node.sortOrder || Number.MAX_SAFE_INTEGER));
      return leftOrder - rightOrder;
    });

    let tallestBranch = 0;
    orderedBranches.forEach(([, branchNodes], branchIndex) => {
      const sortedBranchNodes = [...branchNodes].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
      sortedBranchNodes.forEach((node, rowIndex) => {
        nextPositions.set(node.id, {
          x: START_X + branchIndex * BRANCH_GAP,
          y: currentY + rowIndex * VERTICAL_GAP,
        });
      });
      tallestBranch = Math.max(tallestBranch, sortedBranchNodes.length);
    });

    currentY += Math.max(1, tallestBranch) * VERTICAL_GAP + SECTION_GAP;
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
    const activeChecklistItems = normalizedNode.checklistItems.filter((item) => item.isActive);
    const shouldExpand =
      normalizedNode.category !== "CHECKLIST_ITEM" &&
      activeChecklistItems.length > 0;

    if (!shouldExpand) {
      expandedNodes.push(normalizedNode);
      continue;
    }
    didExpand = true;

    const orderedItems = [...normalizedNode.checklistItems].sort((a, b) => a.sortOrder - b.sortOrder);
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
        photoRequirements: itemIndex === 0 ? normalizedNode.photoRequirements : [],
      } satisfies NodeDraft;
    });

    for (let itemIndex = 0; itemIndex < checklistNodes.length - 1; itemIndex += 1) {
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

export function WorkflowsClient({ initialTemplates, availableRoles, availableJobTypes }: WorkflowsClientProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialTemplates[0]?.id || null);
  const [selectedClearanceTypeId, setSelectedClearanceTypeId] = useState<string>("");
  const [activeVersion, setActiveVersion] = useState<any>(null);
  const [nodes, setNodes] = useState<NodeDraft[]>([]);
  const [edges, setEdges] = useState<EdgeDraft[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeCategory, setNewNodeCategory] = useState("CHECK");
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [connectingSourceKey, setConnectingSourceKey] = useState<string | null>(null);
  const [connectionCursor, setConnectionCursor] = useState({ x: 0, y: 0 });
  const [hoveredTargetKey, setHoveredTargetKey] = useState<string | null>(null);
  const [loadedSnapshot, setLoadedSnapshot] = useState("");

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  const validation = useMemo(() => buildValidation(nodes, edges), [nodes, edges]);
  const hasUnsavedChanges = useMemo(
    () => serializeWorkflowSnapshot(nodes, edges) !== loadedSnapshot,
    [edges, loadedSnapshot, nodes],
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
    const latest = result.data.versions?.[0];
    const expanded = expandChecklistNodesForCanvas(latest?.nodes || [], latest?.edges || []);
    const arrangedNodes = expanded.didExpand ? autoArrangeNodes(expanded.nodes, expanded.edges) : expanded.nodes;
    setSelectedClearanceTypeId(result.data.clearanceType?.id || result.data.clearanceTypeId || "");
    setActiveVersion(latest || null);
    setNodes(arrangedNodes);
    setEdges(expanded.edges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setLoadedSnapshot(serializeWorkflowSnapshot(arrangedNodes, expanded.edges));
  };

  useEffect(() => {
    if (selectedTemplateId) {
      loadTemplateDetails(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
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
        const hovered = (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest("[data-handle-role='target']") as HTMLElement | null;
        setHoveredTargetKey(hovered?.dataset.nodeKey || null);
      }
    };

    const handleUp = (event: MouseEvent) => {
      if (connectingSourceKey) {
        const target = (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest("[data-handle-role='target']") as HTMLElement | null;
        const targetKey = target?.dataset.nodeKey || null;
        if (targetKey) {
          if (targetKey === connectingSourceKey) {
            toast.error("A node cannot connect to itself.");
          } else if (edges.some((edge) => edge.sourceKey === connectingSourceKey && edge.targetKey === targetKey)) {
            toast.error("That connection already exists.");
          } else if (!nodes.find((node) => node.key === targetKey && node.isActive)) {
            toast.error("Connections can only target active nodes.");
          } else {
            setEdges((prev) => [...prev, { id: createId("edge"), sourceKey: connectingSourceKey, targetKey }]);
            toast.success("Connection created.");
          }
        }
      }
      setDraggingNodeId(null);
      setIsPanning(false);
      setConnectingSourceKey(null);
      setHoveredTargetKey(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [connectingSourceKey, dragOffset.x, dragOffset.y, draggingNodeId, edges, isPanning, nodes, panStart.x, panStart.y, zoom, pan.x, pan.y]);

  const handleAddNode = () => {
    if (activeVersion?.isPublished) {
      toast.error("Published versions are read-only. Fork a new draft first.");
      return;
    }
    const baseName = newNodeName.trim() || "New Main Stage";
    const keyBase = slugify(baseName);
    const duplicateCount = nodes.filter((node) => node.key.startsWith(keyBase)).length;
    const key = duplicateCount === 0 ? keyBase : `${keyBase}_${duplicateCount + 1}`;
    const node = createWorkflowStageNode(
      baseName,
      key,
      nodes.length + 1,
      120 - Math.round(pan.x / zoom),
      120 - Math.round(pan.y / zoom),
      nodes.every((entry) => !entry.isStart),
    );
    node.category = newNodeCategory.trim() || "MAIN_STAGE";
    setNodes((prev) => [...prev, node]);
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setNewNodeName("");
    setNewNodeCategory("MAIN_STAGE");
  };

  const handleAddChecklistNode = () => {
    if (activeVersion?.isPublished) {
      toast.error("Published versions are read-only. Fork a new draft first.");
      return;
    }
    const baseName = newNodeName.trim() || "Checklist Item";
    const keyBase = slugify(baseName);
    const duplicateCount = nodes.filter((node) => node.key.startsWith(keyBase)).length;
    const key = duplicateCount === 0 ? keyBase : `${keyBase}_${duplicateCount + 1}`;
    const node = createWorkflowChecklistNode(
      baseName,
      key,
      nodes.length + 1,
      120 - Math.round(pan.x / zoom),
      180 - Math.round(pan.y / zoom),
      "",
      "",
    );
    node.isStart = nodes.every((entry) => !entry.isStart);
    setNodes((prev) => [...prev, node]);
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setNewNodeName("");
    setNewNodeCategory("CHECKLIST_ITEM");
  };

  const handleAddNotificationNode = () => {
    if (activeVersion?.isPublished) {
      toast.error("Published versions are read-only. Fork a new draft first.");
      return;
    }
    const baseName = newNodeName.trim() || "Notification";
    const keyBase = slugify(baseName);
    const duplicateCount = nodes.filter((node) => node.key.startsWith(keyBase)).length;
    const key = duplicateCount === 0 ? keyBase : `${keyBase}_${duplicateCount + 1}`;
    const node = createWorkflowNotificationNode(
      baseName,
      key,
      nodes.length + 1,
      120 - Math.round(pan.x / zoom),
      180 - Math.round(pan.y / zoom),
    );
    node.isStart = nodes.every((entry) => !entry.isStart);
    setNodes((prev) => [...prev, node]);
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setNewNodeName("");
    setNewNodeCategory("NOTIFICATION");
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
    const maxX = Math.max(...sourceNodes.map((node) => node.positionX + NODE_WIDTH));
    const maxY = Math.max(...sourceNodes.map((node) => node.positionY + NODE_HEIGHT));
    const width = Math.max(maxX - minX, NODE_WIDTH);
    const height = Math.max(maxY - minY, NODE_HEIGHT);
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min((rect.width - 96) / width, (rect.height - 96) / height)));
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
    setNodes((prev) => prev.map((node) => (node.id === selectedNodeId ? updater(node) : node)));
  };

  const updateSelectedEdge = (updater: (edge: EdgeDraft) => EdgeDraft) => {
    if (!selectedEdgeId) return;
    setEdges((prev) => prev.map((edge) => (edge.id === selectedEdgeId ? updater(edge) : edge)));
  };

  const loadChaBlueprintDraft = () => {
    if (activeVersion?.isPublished) {
      toast.error("Published versions are read-only. Fork a new draft first.");
      return;
    }
    if (hasUnsavedChanges && !window.confirm("Replace the current draft canvas with the editable CHA blueprint starter? Unsaved canvas changes will be overwritten.")) {
      return;
    }
    const blueprint = buildChaFilingBlueprintDraft();
    setNodes(blueprint.nodes);
    setEdges(blueprint.edges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setZoom(0.78);
    setPan({ x: 60, y: 20 });
    toast.success("Editable CHA filing blueprint loaded.");
  };

  const addChecklistItem = () => {
    updateSelectedNode((node) => ({
      ...node,
      checklistItems: [
        ...node.checklistItems,
        {
          id: createId("item"),
          label: "New Checklist Item",
          description: "",
          isMandatory: true,
          requiresRemarks: false,
          allowsUpload: false,
          minUploads: 0,
          maxUploads: null,
          acceptedFileTypes: [],
          deadlineDuration: 2,
          deadlineUnit: "BUSINESS_DAYS",
          delayRemarksRequired: true,
          sortOrder: node.checklistItems.length + 1,
          isActive: true,
        },
      ],
    }));
  };

  const updateChecklistItem = (itemId: string, updater: (item: ChecklistItemDraft) => ChecklistItemDraft) => {
    updateSelectedNode((node) => ({
      ...node,
      checklistItems: node.checklistItems.map((item) => (item.id === itemId ? updater(item) : item)),
    }));
  };

  const reorderChecklistItem = (itemId: string, direction: -1 | 1) => {
    updateSelectedNode((node) => {
      const index = node.checklistItems.findIndex((item) => item.id === itemId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= node.checklistItems.length) {
        return node;
      }
      const nextItems = [...node.checklistItems];
      const [item] = nextItems.splice(index, 1);
      nextItems.splice(nextIndex, 0, item);
      return {
        ...node,
        checklistItems: nextItems.map((entry, orderIndex) => ({ ...entry, sortOrder: orderIndex + 1 })),
      };
    });
  };

  const addPhotoRequirement = () => {
    updateSelectedNode((node) => ({
      ...node,
      photoRequirements: [
        ...node.photoRequirements,
        {
          id: createId("photo"),
          label: "Stage Upload Slot",
          description: "",
          isMandatory: false,
          minPhotos: 0,
          maxPhotos: null,
          acceptedFileTypes: ["image/jpeg", "image/png", "application/pdf"],
          isVisibleInTimeline: true,
        },
      ],
    }));
  };

  const updatePhotoRequirement = (photoId: string, updater: (item: PhotoRequirementDraft) => PhotoRequirementDraft) => {
    updateSelectedNode((node) => ({
      ...node,
      photoRequirements: node.photoRequirements.map((item) => (item.id === photoId ? updater(item) : item)),
    }));
  };

  const saveDraft = async () => {
    if (!selectedTemplateId) return false;
    const template = templates.find((entry) => entry.id === selectedTemplateId);
    const result = await actions.saveFilingWorkflowDraftAction(selectedTemplateId, {
      name: template?.name || "Filing Workflow",
      description: template?.description || "",
      clearanceTypeId: selectedClearanceTypeId || null,
      nodes,
      edges,
    });
    if (!result.ok) {
      toast.error(result.error || "Failed to save workflow draft.");
      return false;
    }
    toast.success("Draft saved.");
    await loadTemplateDetails(selectedTemplateId);
    return true;
  };

  const deleteSelectedEdge = async () => {
    if (!selectedEdge || activeVersion?.isPublished) {
      return;
    }
    if (!window.confirm(`Delete connector from ${selectedEdge.sourceKey} to ${selectedEdge.targetKey}?`)) {
      return;
    }
    const nextEdges = edges.filter((edge) => edge.id !== selectedEdge.id);
    setEdges(nextEdges);
    setSelectedEdgeId(null);

    const template = templates.find((entry) => entry.id === selectedTemplateId);
    const result = await actions.saveFilingWorkflowDraftAction(selectedTemplateId, {
      name: template?.name || "Filing Workflow",
      description: template?.description || "",
      clearanceTypeId: selectedClearanceTypeId || null,
      nodes,
      edges: nextEdges,
    });
    if (!result.ok) {
      toast.error(result.error || "Failed to persist connector deletion.");
      return;
    }
    toast.success("Connector deleted.");
    if (selectedTemplateId) {
      await loadTemplateDetails(selectedTemplateId);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Delete" || event.key === "Backspace") && selectedEdgeId && !activeVersion?.isPublished) {
        event.preventDefault();
        void deleteSelectedEdge();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeVersion?.isPublished, selectedEdgeId, deleteSelectedEdge]);

  const publishWorkflow = async () => {
    if (!activeVersion) return;
    if (validation.errors.length > 0) {
      toast.error("Resolve workflow validation errors before publishing.");
      return;
    }
    const saved = await saveDraft();
    if (!saved) {
      return;
    }
    const latest = await actions.getFilingWorkflowDetailsAction(selectedTemplateId!);
    const versionId = latest.ok ? latest.data?.versions?.[0]?.id : activeVersion.id;
    const result = await actions.publishFilingWorkflowAction(versionId);
    if (!result.ok) {
      toast.error(result.error || "Failed to publish workflow.");
      return;
    }
    toast.success("Workflow published.");
    await loadTemplateDetails(selectedTemplateId!);
  };

  const forkDraft = async () => {
    if (!selectedTemplateId) return;
    const template = templates.find((entry) => entry.id === selectedTemplateId);
    const result = await actions.saveFilingWorkflowDraftAction(selectedTemplateId, {
      name: template?.name || "Filing Workflow",
      description: template?.description || "",
      clearanceTypeId: selectedClearanceTypeId || null,
      nodes: nodes.map((node) => ({
        ...node,
        id: undefined,
        checklistItems: node.checklistItems.map((item) => ({ ...item, id: undefined })),
        photoRequirements: node.photoRequirements.map((item) => ({ ...item, id: undefined })),
      })),
      edges,
    });
    if (!result.ok) {
      toast.error(result.error || "Failed to fork draft.");
      return;
    }
    toast.success("New draft created from published version.");
    await loadTemplateDetails(selectedTemplateId);
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] w-full flex-col overflow-hidden rounded-3xl border border-outline-variant bg-surface shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-outline-variant bg-surface px-5 py-4">
        <div className="flex items-start gap-3">
          <Button variant="outline" mode="icon" size="sm" onClick={() => router.push("/cha/settings")} aria-label="Back to CHA settings">
            <ArrowLeft size={16} />
          </Button>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="ds-h1 text-on-surface">FILING WORKFLOW BLUEPRINT</h1>
              <Badge variant={activeVersion?.isPublished ? "success" : "warning"}>
                {activeVersion ? `${activeVersion.isPublished ? "PUBLISHED" : "DRAFT"} V${activeVersion.versionNumber}` : "NO VERSION"}
              </Badge>
            </div>
            <p className="text-sm text-on-surface-variant">
              Build configurable filing stages, checklist deadlines, and non-linear routing without hardcoded CHA node types.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedTemplateId || ""}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
            className="min-w-52 text-sm"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <select
            value={selectedClearanceTypeId}
            onChange={(event) => setSelectedClearanceTypeId(event.target.value)}
            className="min-w-52 text-sm"
            disabled={activeVersion?.isPublished}
          >
            <option value="">All Clearance Types</option>
            {availableJobTypes.map((jobType) => (
              <option key={jobType.id} value={jobType.id}>
                {jobType.name}
              </option>
            ))}
          </select>
          {activeVersion?.isPublished ? (
            <Button variant="outline" onClick={forkDraft}>
              <RefreshCw size={16} />
              Fork Draft
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={saveDraft}>
                <Save size={16} />
                Save Draft
              </Button>
              <Button onClick={publishWorkflow}>
                <CheckCircle2 size={16} />
                Publish Workflow
              </Button>
            </>
          )}
          {hasUnsavedChanges ? (
            <Badge variant="warning">UNSAVED CHANGES</Badge>
          ) : (
            <Badge variant="secondary">SYNCED</Badge>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="w-[310px] shrink-0 overflow-y-auto border-r border-outline-variant bg-surface-container-low">
          <div className="space-y-5 p-5">
            <Card className="card-left-accent">
              <CardHeader>
                <CardTitle>Blueprint Palette</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-outline-variant bg-surface p-3 text-xs text-on-surface-variant">
                  Load the CHA starter as editable nodes only. After loading, every stage, checklist, deadline, upload slot, and connector can be changed.
                  <span className="mt-2 block">Processor roles are empty by default, so anyone with job access can work the filing node. Available roles: {availableRoles.length || 0}.</span>
                </div>
                <Button className="w-full" onClick={loadChaBlueprintDraft} disabled={activeVersion?.isPublished}>
                  <Workflow size={16} />
                  Load CHA Filing Blueprint
                </Button>
                <div className="space-y-1.5">
                  <label className="ds-label block">Node Name</label>
                  <input value={newNodeName} onChange={(event) => setNewNodeName(event.target.value)} placeholder="First Check" className="w-full text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="ds-label block">Category</label>
                  <input value={newNodeCategory} onChange={(event) => setNewNodeCategory(event.target.value)} placeholder="MAIN_STAGE" className="w-full text-sm" />
                </div>
                <Button variant="outline" className="w-full" onClick={handleAddNode} disabled={activeVersion?.isPublished}>
                  <Plus size={16} />
                  Add Main Stage Node
                </Button>
                <Button variant="outline" className="w-full" onClick={handleAddChecklistNode} disabled={activeVersion?.isPublished}>
                  <Plus size={16} />
                  Add Checklist Node
                </Button>
                <Button variant="outline" className="w-full" onClick={handleAddNotificationNode} disabled={activeVersion?.isPublished}>
                  <Plus size={16} />
                  Add Notification Node
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Publish Checks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {validation.errors.length === 0 && validation.warnings.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No blocking validation issues in the current draft.</p>
                ) : null}
                {validation.errors.map((message) => (
                  <div key={message} className="card-left-accent-orange rounded-xl bg-surface p-3 text-sm text-on-surface">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="mt-0.5 text-[#fb923c]" />
                      <span>{message}</span>
                    </div>
                  </div>
                ))}
                {validation.warnings.map((message) => (
                  <div key={message} className="rounded-xl border border-outline-variant bg-surface p-3 text-sm text-on-surface-variant">
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

        <main className="min-w-0 flex-1 bg-surface">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
              <div>
                <p className="ds-label">Canvas</p>
                <p className="text-sm text-on-surface-variant">Blueprint mode: drag nodes, connect handles, zoom with wheel, branch RMS/Open Bill, and route back to any passed stage when required.</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {selectedEdge ? (
                  <div className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-3 py-1.5">
                    <span className="text-xs text-on-surface-variant">
                      {selectedEdge.sourceKey} → {selectedEdge.targetKey}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => void deleteSelectedEdge()} disabled={activeVersion?.isPublished}>
                      <Trash2 size={14} />
                      Delete Connector
                    </Button>
                  </div>
                ) : null}
                <div className="flex items-center gap-1 rounded-xl border border-outline-variant bg-surface p-1">
                  <Button variant="outline" mode="icon" size="sm" onClick={() => setZoom((value) => Math.max(MIN_ZOOM, Number((value - 0.1).toFixed(2))))} aria-label="Zoom out">
                    <ZoomOut size={15} />
                  </Button>
                  <span className="min-w-14 text-center text-xs text-on-surface-variant ds-numeric">{Math.round(zoom * 100)}%</span>
                  <Button variant="outline" mode="icon" size="sm" onClick={() => setZoom((value) => Math.min(MAX_ZOOM, Number((value + 0.1).toFixed(2))))} aria-label="Zoom in">
                    <ZoomIn size={15} />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={fitCanvasView}>
                  <Workflow size={14} />
                  Fit View
                </Button>
                <Button variant="outline" size="sm" onClick={applyAutoArrange}>
                  <Workflow size={14} />
                  Auto Arrange
                </Button>
                <Button variant="outline" size="sm" onClick={resetCanvasView}>
                  <RefreshCw size={14} />
                  Reset View
                </Button>
              </div>
            </div>

            <div
              ref={canvasRef}
              className="relative flex-1 overflow-hidden bg-surface-container-low"
              style={{
                backgroundColor: "var(--color-surface-container-low)",
                backgroundImage:
                  "linear-gradient(rgba(0,206,196,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,206,196,0.08) 1px, transparent 1px), radial-gradient(rgba(0,206,196,0.28) 1px, transparent 1px)",
                backgroundSize: "48px 48px, 48px 48px, 12px 12px",
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
                const zoomStep = event.ctrlKey || event.metaKey || event.altKey ? 0.14 : 0.08;
                const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((zoom + (event.deltaY < 0 ? zoomStep : -zoomStep)).toFixed(2))));
                const scaleRatio = nextZoom / zoom;

                setPan((current) => ({
                  x: Math.round(pointerX - (pointerX - current.x) * scaleRatio),
                  y: Math.round(pointerY - (pointerY - current.y) * scaleRatio),
                }));
                setZoom(nextZoom);
              }}
              onMouseDown={(event) => {
                // Node buttons and connect handles call stopPropagation so they never reach here.
                // Everything else (canvas bg, inner transform div, SVG) should pan.
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
                setIsPanning(true);
                setPanStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "0 0",
                }}
              >
                <svg className="absolute inset-0 h-[2800px] w-[2800px] overflow-visible">
                  <defs>
                    <marker id="filing-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                    </marker>
                  </defs>
                  {edges.map((edge) => {
                    const source = nodes.find((node) => node.key === edge.sourceKey);
                    const target = nodes.find((node) => node.key === edge.targetKey);
                    if (!source || !target) return null;
                    const connector = getConnectorPath(source, target);
                    const selected = selectedEdgeId === edge.id;
                    return (
                      <g
                        key={edge.id}
                        className={selected ? "text-[#fb923c]" : connector.isBackRoute ? "text-[#fb923c]" : "text-[#00cec4]"}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedNodeId(null);
                          setSelectedEdgeId(edge.id);
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
                          strokeDasharray={connector.isBackRoute ? "8 7" : undefined}
                          markerEnd="url(#filing-arrow)"
                          className="drop-shadow-sm"
                        />
                        {edge.label ? (
                          <foreignObject x={connector.labelX - 70} y={connector.labelY - 12} width="140" height="28" className="pointer-events-none overflow-visible">
                            <div className="truncate rounded-full border border-outline-variant bg-surface/95 px-2 py-1 text-center text-[10px] uppercase tracking-[0.1em] text-on-surface-variant shadow-sm">
                              {edge.label}
                            </div>
                          </foreignObject>
                        ) : null}
                      </g>
                    );
                  })}
                  {connectingSourceKey ? (() => {
                    const source = nodes.find((node) => node.key === connectingSourceKey);
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
                  })() : null}
                </svg>

                {nodes.map((node) => {
                  const selected = node.id === selectedNodeId;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={`absolute rounded-2xl border bg-surface/95 p-4 text-left shadow-sm backdrop-blur transition-all ${selected ? "border-[#00cec4] shadow-[0_0_0_3px_rgba(0,206,196,0.18),0_18px_42px_-28px_rgba(0,206,196,0.75)]" : "border-outline-variant hover:border-[#00cec4]/60 hover:shadow-[0_0_0_3px_rgba(0,206,196,0.12)]"
                        } ${node.isActive ? "" : "opacity-55"}`}
                      style={{ left: node.positionX, top: node.positionY, width: NODE_WIDTH, height: NODE_HEIGHT }}
                      onClick={() => setSelectedNodeId(node.id)}
                      onMouseDown={(event) => {
                        event.stopPropagation();
                        if (activeVersion?.isPublished) return;
                        setSelectedEdgeId(null);
                        const coords = screenToCanvas(event.clientX, event.clientY);
                        setDraggingNodeId(node.id);
                        setDragOffset({ x: coords.x - node.positionX, y: coords.y - node.positionY });
                      }}
                    >
                      <div
                        data-handle-role="target"
                        data-node-key={node.key}
                        title="Drop connector here"
                        className={`absolute left-[126px] -top-2 h-4 w-4 rounded-full border-2 ${hoveredTargetKey === node.key ? "border-[#00cec4] bg-[#00cec4]/20" : "border-outline bg-surface"
                          }`}
                      />
                      <div
                        data-handle-role="target"
                        data-node-key={node.key}
                        title="Drop connector here"
                        className={`absolute -left-2 top-[68px] h-4 w-4 rounded-full border-2 ${hoveredTargetKey === node.key ? "border-[#00cec4] bg-[#00cec4]/20" : "border-outline bg-surface"
                          }`}
                      />
                      <div
                        data-node-key={node.key}
                        title="Drag to connect"
                        className="absolute bottom-[-8px] left-[126px] h-4 w-4 rounded-full border-2 border-[#00cec4] bg-surface shadow-[0_0_0_3px_rgba(0,206,196,0.12)]"
                        onMouseDown={(event) => {
                          event.stopPropagation();
                          if (activeVersion?.isPublished || !node.isActive) return;
                          setConnectingSourceKey(node.key);
                          setConnectionCursor({ x: node.positionX + NODE_WIDTH / 2, y: node.positionY + NODE_HEIGHT });
                        }}
                      />
                      <div
                        data-node-key={node.key}
                        title="Drag to connect"
                        className="absolute -right-2 top-[68px] h-4 w-4 rounded-full border-2 border-[#00cec4] bg-surface shadow-[0_0_0_3px_rgba(0,206,196,0.12)]"
                        onMouseDown={(event) => {
                          event.stopPropagation();
                          if (activeVersion?.isPublished || !node.isActive) return;
                          setConnectingSourceKey(node.key);
                          setConnectionCursor({ x: node.positionX + NODE_WIDTH, y: node.positionY + NODE_HEIGHT / 2 });
                        }}
                      />

                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-on-surface">{node.name}</p>
                          <p className="mt-1 truncate text-xs text-on-surface-variant">
                            {[node.sectionName || node.category, node.branchName].filter(Boolean).join(" / ")}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {node.isStart ? <Badge variant="success">START</Badge> : null}
                          {node.nodeType === "NOTIFICATION" ? <Badge variant="warning">NOTIFY</Badge> : null}
                          {node.branchName ? <Badge variant="secondary">{node.branchName.toUpperCase()}</Badge> : null}
                          {node.photoRequirements.length > 0 ? <Badge variant="secondary">{node.photoRequirements.length} UPLOAD</Badge> : null}
                          {!node.isActive ? <Badge variant="secondary">INACTIVE</Badge> : null}
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-xs text-on-surface-variant">
                        {node.description || "No stage description configured."}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-3 text-xs text-on-surface-variant">
                        <span>{describeNodeType(node)}</span>
                        <span className="ds-numeric">{node.slaDuration} {node.slaUnit === "BUSINESS_DAYS" ? "BD" : "CD"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        <aside className="w-[420px] shrink-0 overflow-y-auto border-l border-outline-variant bg-surface">
          {selectedNode ? (
            <div className="space-y-6 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="ds-label">Selected Node</p>
                  <h2 className="ds-h2 text-on-surface">{selectedNode.name}</h2>
                </div>
                <Button
                  variant="outline"
                  mode="icon"
                  size="sm"
                  onClick={() => {
                    if (activeVersion?.isPublished) return;
                    setNodes((prev) => prev.filter((node) => node.id !== selectedNode.id));
                    setEdges((prev) => prev.filter((edge) => edge.sourceKey !== selectedNode.key && edge.targetKey !== selectedNode.key));
                    setSelectedNodeId(null);
                  }}
                  aria-label="Delete node"
                >
                  <Trash2 size={15} />
                </Button>
              </div>

              <div className="ds-form-section space-y-4">
                <h3 className="ds-h3 text-on-surface">Node Settings</h3>
                <div className="space-y-1.5">
                  <label className="ds-label block">Node Name</label>
                  <input value={selectedNode.name} onChange={(event) => updateSelectedNode((node) => ({ ...node, name: event.target.value }))} className="w-full text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="ds-label block">Key</label>
                  <input value={selectedNode.key} onChange={(event) => updateSelectedNode((node) => ({ ...node, key: slugify(event.target.value) }))} className="w-full text-sm ds-numeric" />
                </div>
                <div className="space-y-1.5">
                  <label className="ds-label block">Category</label>
                  <input value={selectedNode.category} onChange={(event) => updateSelectedNode((node) => ({ ...node, category: event.target.value }))} className="w-full text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="ds-label block">Node Type</label>
                    <select
                      value={selectedNode.nodeType}
                      onChange={(event) => updateSelectedNode((node) => ({ ...node, nodeType: event.target.value as NodeDraft["nodeType"] }))}
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
                      onChange={(event) => updateSelectedNode((node) => ({ ...node, sortOrder: Math.max(1, Number(event.target.value || 1)) }))}
                      className="w-full text-sm ds-numeric"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="ds-label block">Section Key</label>
                    <input value={selectedNode.sectionKey} onChange={(event) => updateSelectedNode((node) => ({ ...node, sectionKey: slugify(event.target.value) }))} className="w-full text-sm ds-numeric" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="ds-label block">Section Label</label>
                    <input value={selectedNode.sectionName} onChange={(event) => updateSelectedNode((node) => ({ ...node, sectionName: event.target.value }))} className="w-full text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="ds-label block">Branch Key</label>
                    <input value={selectedNode.branchKey} onChange={(event) => updateSelectedNode((node) => ({ ...node, branchKey: slugify(event.target.value) }))} className="w-full text-sm ds-numeric" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="ds-label block">Branch Label</label>
                    <input value={selectedNode.branchName} onChange={(event) => updateSelectedNode((node) => ({ ...node, branchName: event.target.value }))} className="w-full text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="ds-label block">Description</label>
                  <textarea value={selectedNode.description} onChange={(event) => updateSelectedNode((node) => ({ ...node, description: event.target.value }))} rows={3} className="w-full text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="ds-label block">Stage SLA</label>
                    <input
                      type="number"
                      min={1}
                      value={selectedNode.slaDuration}
                      onChange={(event) => updateSelectedNode((node) => ({ ...node, slaDuration: Math.max(1, Number(event.target.value || 1)) }))}
                      className="w-full text-sm ds-numeric"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="ds-label block">SLA Unit</label>
                    <select
                      value={selectedNode.slaUnit}
                      onChange={(event) => updateSelectedNode((node) => ({ ...node, slaUnit: event.target.value as NodeDraft["slaUnit"] }))}
                      className="w-full text-sm"
                    >
                      <option value="BUSINESS_DAYS">Business Days</option>
                      <option value="CALENDAR_DAYS">Calendar Days</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm text-on-surface">
                  {([
                    { label: "Active", checked: selectedNode.isActive, buildUpdate: (checked: boolean) => ({ isActive: checked }) },
                    { label: "Start Node", checked: selectedNode.isStart, buildUpdate: (checked: boolean) => ({ isStart: checked }) },
                    { label: "Completion Remarks", checked: selectedNode.commentsRequired, buildUpdate: (checked: boolean) => ({ commentsRequired: checked }) },
                    { label: "Allow Double-Back", checked: selectedNode.canBeRevisited, buildUpdate: (checked: boolean) => ({ canBeRevisited: checked }) },
                    { label: "Approval Required", checked: selectedNode.approvalRequired, buildUpdate: (checked: boolean) => ({ approvalRequired: checked }) },
                    { label: "Checklist Gate", checked: selectedNode.requireAllMandatoryChecklistItems, buildUpdate: (checked: boolean) => ({ requireAllMandatoryChecklistItems: checked }) },
                    { label: "Stage Upload Gate", checked: selectedNode.requireMandatoryPhotos, buildUpdate: (checked: boolean) => ({ requireMandatoryPhotos: checked }) },
                  ] as const).map(({ label, checked, buildUpdate }) => (
                    <label key={label} className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2">
                      <input
                        type="checkbox"
                        checked={checked as boolean}
                        onChange={(event) => {
                          if (label === "Start Node" && event.target.checked) {
                            setNodes((prev) => prev.map((node) => ({ ...node, isStart: node.id === selectedNode.id })));
                            return;
                          }
                          updateSelectedNode((node) => ({ ...node, ...buildUpdate(event.target.checked) }));
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {selectedNode.approvalRequired ? (
                  <div className="space-y-1.5">
                    <label className="ds-label block">Approval Roles</label>
                    <input
                      value={selectedNode.approvalRoles.join(", ")}
                      onChange={(event) => updateSelectedNode((node) => ({
                        ...node,
                        approvalRoles: event.target.value.split(",").map((value) => value.trim()).filter(Boolean),
                      }))}
                      className="w-full text-sm"
                      placeholder="Manager, Admin"
                    />
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <label className="ds-label block">Allowed Processor Roles</label>
                  <input
                    value={selectedNode.allowedRoles.join(", ")}
                    onChange={(event) => updateSelectedNode((node) => ({
                      ...node,
                      allowedRoles: event.target.value.split(",").map((value) => value.trim()).filter(Boolean),
                    }))}
                    className="w-full text-sm"
                    placeholder="Leave empty so anyone concerned with the job can process it"
                  />
                  <p className="text-xs text-on-surface-variant">
                    Empty means anyone who can access the job can complete this node.
                  </p>
                </div>
                {selectedNode.nodeType === "NOTIFICATION" ? (
                  <div className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                    This node runs automatically. When the workflow enters it, the job owner, assigned manager, and all assigned users receive a notification, then the workflow advances through its single connected path.
                  </div>
                ) : null}
              </div>

              <div className="ds-form-section space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="ds-h3 text-on-surface">Checklist Items</h3>
                  {selectedNode.nodeType === "CHECKLIST_NODE" ? (
                    selectedNode.checklistItems.length === 0 ? (
                      <Button variant="outline" size="sm" onClick={addChecklistItem}>
                        <Plus size={14} />
                        Add Item
                      </Button>
                    ) : (
                      <Badge variant="success">STANDALONE CHECKLIST NODE</Badge>
                    )
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleAddChecklistNode}>
                      <Plus size={14} />
                      Add Checklist Node
                    </Button>
                  )}
                </div>

                {selectedNode.nodeType === "NOTIFICATION" ? (
                  <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                    Notification nodes do not use checklist items. Use the node name as the notification title and the description as the message body.
                  </div>
                ) : null}

                {selectedNode.nodeType !== "CHECKLIST_NODE" && selectedNode.nodeType !== "NOTIFICATION" ? (
                  <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                    Checklist items should be modeled as separate nodes. Use <span className="font-medium text-on-surface">Add Checklist Node</span> for new workflow checks.
                  </div>
                ) : null}

                {selectedNode.checklistItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-6 text-sm text-on-surface-variant">
                    No checklist items configured for this node yet.
                  </div>
                ) : null}

                <div className="space-y-4">
                  {selectedNode.checklistItems.map((item, index) => (
                    <div key={item.id} className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          <p className="ds-label">Item {index + 1}</p>
                          <p className="text-sm font-semibold text-on-surface">{item.label || "Untitled Checklist Item"}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" mode="icon" size="sm" onClick={() => reorderChecklistItem(item.id, -1)} aria-label="Move checklist item up">
                            <ChevronUp size={14} />
                          </Button>
                          <Button variant="outline" mode="icon" size="sm" onClick={() => reorderChecklistItem(item.id, 1)} aria-label="Move checklist item down">
                            <ChevronDown size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            mode="icon"
                            size="sm"
                            onClick={() => updateSelectedNode((node) => ({ ...node, checklistItems: node.checklistItems.filter((entry) => entry.id !== item.id) }))}
                            aria-label="Delete checklist item"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <input value={item.label} onChange={(event) => updateChecklistItem(item.id, (current) => ({ ...current, label: event.target.value }))} className="w-full text-sm" placeholder="Checklist item name" />
                        <textarea value={item.description} onChange={(event) => updateChecklistItem(item.id, (current) => ({ ...current, description: event.target.value }))} rows={2} className="w-full text-sm" placeholder="Help text or operator guidance" />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="ds-label block">Deadline</label>
                            <input
                              type="number"
                              min={1}
                              value={item.deadlineDuration}
                              onChange={(event) => updateChecklistItem(item.id, (current) => ({ ...current, deadlineDuration: Math.max(1, Number(event.target.value || 1)) }))}
                              className="w-full text-sm ds-numeric"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="ds-label block">Deadline Unit</label>
                            <select
                              value={item.deadlineUnit}
                              onChange={(event) => updateChecklistItem(item.id, (current) => ({ ...current, deadlineUnit: event.target.value as ChecklistItemDraft["deadlineUnit"] }))}
                              className="w-full text-sm"
                            >
                              <option value="BUSINESS_DAYS">Business Days</option>
                              <option value="CALENDAR_DAYS">Calendar Days</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm text-on-surface">
                          {([
                            { label: "Mandatory", checked: item.isMandatory, field: "isMandatory" },
                            { label: "Completion Remarks", checked: item.requiresRemarks, field: "requiresRemarks" },
                            { label: "Allow Uploads", checked: item.allowsUpload, field: "allowsUpload" },
                            { label: "Delay Remarks Required", checked: item.delayRemarksRequired, field: "delayRemarksRequired" },
                            { label: "Active", checked: item.isActive, field: "isActive" },
                          ] as const).map(({ label, checked, field }) => (
                            <label key={label} className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-3 py-2">
                              <input
                                type="checkbox"
                                checked={checked as boolean}
                                onChange={(event) =>
                                  updateChecklistItem(item.id, (current) => ({
                                    ...current,
                                    [field]: event.target.checked,
                                  }))
                                }
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>

                        {item.allowsUpload ? (
                          <div className="rounded-xl border border-outline-variant bg-surface p-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="ds-label block">Min Uploads</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={item.minUploads}
                                  onChange={(event) => updateChecklistItem(item.id, (current) => ({ ...current, minUploads: Math.max(0, Number(event.target.value || 0)) }))}
                                  className="w-full text-sm ds-numeric"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="ds-label block">Max Uploads</label>
                                <input
                                  type="number"
                                  min={item.minUploads}
                                  value={item.maxUploads ?? ""}
                                  onChange={(event) =>
                                    updateChecklistItem(item.id, (current) => ({
                                      ...current,
                                      maxUploads: event.target.value ? Math.max(current.minUploads, Number(event.target.value)) : null,
                                    }))
                                  }
                                  className="w-full text-sm ds-numeric"
                                  placeholder="No limit"
                                />
                              </div>
                            </div>
                            <div className="mt-3 space-y-1.5">
                              <label className="ds-label block">Accepted File Types</label>
                              <input
                                value={item.acceptedFileTypes.join(", ")}
                                onChange={(event) =>
                                  updateChecklistItem(item.id, (current) => ({
                                    ...current,
                                    acceptedFileTypes: event.target.value.split(",").map((value) => value.trim()).filter(Boolean),
                                  }))
                                }
                                className="w-full text-sm"
                                placeholder="image/jpeg, application/pdf"
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ds-form-section space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="ds-h3 text-on-surface">Stage Upload Slots</h3>
                  <Button variant="outline" size="sm" onClick={addPhotoRequirement}>
                    <Plus size={14} />
                    Add Upload Slot
                  </Button>
                </div>
                <div className="space-y-3">
                  {selectedNode.photoRequirements.map((photo) => (
                    <div key={photo.id} className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-on-surface">{photo.label || "Untitled Upload Slot"}</p>
                        <Button
                          variant="outline"
                          mode="icon"
                          size="sm"
                          onClick={() => updateSelectedNode((node) => ({ ...node, photoRequirements: node.photoRequirements.filter((entry) => entry.id !== photo.id) }))}
                          aria-label="Delete upload slot"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <input value={photo.label} onChange={(event) => updatePhotoRequirement(photo.id, (current) => ({ ...current, label: event.target.value }))} className="w-full text-sm" placeholder="Upload slot label" />
                        <textarea value={photo.description} onChange={(event) => updatePhotoRequirement(photo.id, (current) => ({ ...current, description: event.target.value }))} rows={2} className="w-full text-sm" placeholder="What should operators upload here?" />
                        <div className="grid grid-cols-2 gap-3">
                          <input type="number" min={0} value={photo.minPhotos} onChange={(event) => updatePhotoRequirement(photo.id, (current) => ({ ...current, minPhotos: Math.max(0, Number(event.target.value || 0)) }))} className="w-full text-sm ds-numeric" placeholder="Min uploads" />
                          <input type="number" min={photo.minPhotos} value={photo.maxPhotos ?? ""} onChange={(event) => updatePhotoRequirement(photo.id, (current) => ({ ...current, maxPhotos: event.target.value ? Math.max(current.minPhotos, Number(event.target.value)) : null }))} className="w-full text-sm ds-numeric" placeholder="Max uploads" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm text-on-surface">
                          <label className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-3 py-2">
                            <input
                              type="checkbox"
                              checked={photo.isMandatory}
                              onChange={(event) => updatePhotoRequirement(photo.id, (current) => ({ ...current, isMandatory: event.target.checked, minPhotos: event.target.checked && current.minPhotos === 0 ? 1 : current.minPhotos }))}
                            />
                            <span>Mandatory</span>
                          </label>
                          <label className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-3 py-2">
                            <input
                              type="checkbox"
                              checked={photo.isVisibleInTimeline}
                              onChange={(event) => updatePhotoRequirement(photo.id, (current) => ({ ...current, isVisibleInTimeline: event.target.checked }))}
                            />
                            <span>Timeline</span>
                          </label>
                        </div>
                        <div className="space-y-1.5">
                          <label className="ds-label block">Accepted File Types</label>
                          <input
                            value={photo.acceptedFileTypes.join(", ")}
                            onChange={(event) => updatePhotoRequirement(photo.id, (current) => ({
                              ...current,
                              acceptedFileTypes: event.target.value.split(",").map((value) => value.trim()).filter(Boolean),
                            }))}
                            className="w-full text-sm"
                            placeholder="image/jpeg, image/png, application/pdf"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedNode.photoRequirements.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-6 text-sm text-on-surface-variant">
                      No stage-level upload slots configured for this node.
                    </div>
                  ) : null}
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
                  <div className="mt-1 break-all ds-numeric">{selectedEdge.sourceKey}</div>
                  <div className="mt-3 ds-label text-on-surface-variant">To</div>
                  <div className="mt-1 break-all ds-numeric">{selectedEdge.targetKey}</div>
                </div>
                <div className="space-y-1.5">
                  <label className="ds-label block">Connector Label</label>
                  <input
                    value={selectedEdge.label || ""}
                    onChange={(event) => updateSelectedEdge((edge) => ({ ...edge, label: event.target.value || null }))}
                    className="w-full text-sm"
                    placeholder="Example: RMS Path, Recheck BE, Next"
                    disabled={activeVersion?.isPublished}
                  />
                </div>
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3 text-xs text-on-surface-variant">
                  Backward connectors are allowed. Use them for cases like Examination returning to Bill of Entry upload, then routing forward again.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div className="space-y-3">
                <Workflow size={28} className="mx-auto text-[#00cec4]" />
                <h2 className="ds-h3 text-on-surface">SELECT A NODE</h2>
                <p className="max-w-xs text-sm text-on-surface-variant">
                  Choose a node on the canvas to edit checklist deadlines, upload rules, and route behavior.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
