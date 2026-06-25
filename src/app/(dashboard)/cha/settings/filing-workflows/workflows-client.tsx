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
  Link2,
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
  isActive: boolean;
  isStart: boolean;
  positionX: number;
  positionY: number;
  slaDuration: number;
  slaUnit: "BUSINESS_DAYS" | "CALENDAR_DAYS";
  commentsRequired: boolean;
  canBeSkipped: boolean;
  canBeRevisited: boolean;
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
const NODE_HEIGHT = 136;
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
    isActive: node.isActive !== false,
    isStart: !!node.isStart,
    positionX: Number(node.positionX ?? 120 + index * 40),
    positionY: Number(node.positionY ?? 120 + index * 30),
    slaDuration: Number(node.slaDuration ?? 2),
    slaUnit: node.slaUnit === "CALENDAR_DAYS" ? "CALENDAR_DAYS" : "BUSINESS_DAYS",
    commentsRequired: !!node.commentsRequired,
    canBeSkipped: !!node.canBeSkipped,
    canBeRevisited: node.canBeRevisited !== false,
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
    if (source && target && target.positionX <= source.positionX) {
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

function expandChecklistNodesForCanvas(rawNodes: any[], rawEdges: any[]) {
  const expandedNodes: NodeDraft[] = [];
  const remappedEdges: EdgeDraft[] = [];
  const bridgeMap = new Map<string, { firstKey: string; lastKey: string }>();

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
      remappedEdges.push({
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
  for (const edge of [...rawEdges, ...remappedEdges]) {
    const sourceKey = bridgeMap.get(edge.sourceKey)?.lastKey ?? edge.sourceKey;
    const targetKey = bridgeMap.get(edge.targetKey)?.firstKey ?? edge.targetKey;
    if (!sourceKey || !targetKey || sourceKey === targetKey) continue;
    const signature = `${sourceKey}:${targetKey}:${edge.label || ""}`;
    if (edgeSignatures.has(signature)) continue;
    edgeSignatures.add(signature);
    remappedEdges.push({
      id: edge.id || createId("edge"),
      sourceKey,
      targetKey,
      label: edge.label || null,
    });
  }

  return {
    nodes: expandedNodes,
    edges: remappedEdges,
  };
}

export function WorkflowsClient({ initialTemplates, availableRoles }: WorkflowsClientProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialTemplates[0]?.id || null);
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
    setActiveVersion(latest || null);
    setNodes(expanded.nodes);
    setEdges(expanded.edges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setLoadedSnapshot(serializeWorkflowSnapshot(expanded.nodes, expanded.edges));
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
    const baseName = newNodeName.trim() || "New Filing Node";
    const keyBase = slugify(baseName);
    const duplicateCount = nodes.filter((node) => node.key.startsWith(keyBase)).length;
    const node: NodeDraft = {
      id: createId("node"),
      key: duplicateCount === 0 ? keyBase : `${keyBase}_${duplicateCount + 1}`,
      name: baseName,
      description: "",
      category: newNodeCategory.trim() || "CHECK",
      isActive: true,
      isStart: nodes.every((entry) => !entry.isStart),
      positionX: 120 - Math.round(pan.x / zoom),
      positionY: 120 - Math.round(pan.y / zoom),
      slaDuration: 2,
      slaUnit: "BUSINESS_DAYS",
      commentsRequired: false,
      canBeSkipped: false,
      canBeRevisited: true,
      requireAllMandatoryChecklistItems: true,
      requireMandatoryPhotos: false,
      allowedRoles: ["Admin", "Manager", "Employee"],
      checklistItems: [],
      photoRequirements: [],
    };
    setNodes((prev) => [...prev, node]);
    setSelectedNodeId(node.id);
    setNewNodeName("");
  };

  const handleAddChecklistNode = () => {
    if (activeVersion?.isPublished) {
      toast.error("Published versions are read-only. Fork a new draft first.");
      return;
    }
    const baseName = newNodeName.trim() || "Checklist Item";
    const keyBase = slugify(baseName);
    const duplicateCount = nodes.filter((node) => node.key.startsWith(keyBase)).length;
    const node: NodeDraft = {
      id: createId("node"),
      key: duplicateCount === 0 ? keyBase : `${keyBase}_${duplicateCount + 1}`,
      name: baseName,
      description: "",
      category: "CHECKLIST_ITEM",
      isActive: true,
      isStart: nodes.every((entry) => !entry.isStart),
      positionX: 120 - Math.round(pan.x / zoom),
      positionY: 180 - Math.round(pan.y / zoom),
      slaDuration: 2,
      slaUnit: "BUSINESS_DAYS",
      commentsRequired: false,
      canBeSkipped: false,
      canBeRevisited: true,
      requireAllMandatoryChecklistItems: true,
      requireMandatoryPhotos: false,
      allowedRoles: ["Admin", "Manager", "Employee"],
      checklistItems: [
        {
          id: createId("item"),
          label: baseName,
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
          sortOrder: 1,
          isActive: true,
        },
      ],
      photoRequirements: [],
    };
    setNodes((prev) => [...prev, node]);
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setNewNodeName("");
    setNewNodeCategory("CHECKLIST_ITEM");
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

  const updateSelectedNode = (updater: (node: NodeDraft) => NodeDraft) => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.map((node) => (node.id === selectedNodeId ? updater(node) : node)));
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
                <CardTitle>Node Palette</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="ds-label block">Node Name</label>
                  <input value={newNodeName} onChange={(event) => setNewNodeName(event.target.value)} placeholder="First Check" className="w-full text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="ds-label block">Category</label>
                  <input value={newNodeCategory} onChange={(event) => setNewNodeCategory(event.target.value)} placeholder="CHECK" className="w-full text-sm" />
                </div>
                <Button className="w-full" onClick={handleAddNode} disabled={activeVersion?.isPublished}>
                  <Plus size={16} />
                  Add Configurable Node
                </Button>
                <Button variant="outline" className="w-full" onClick={handleAddChecklistNode} disabled={activeVersion?.isPublished}>
                  <Plus size={16} />
                  Add Checklist Node
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
                <p className="text-sm text-on-surface-variant">Drag nodes, connect valid handles, zoom with wheel or controls, and keep checklist items as standalone workflow nodes.</p>
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
                <Button variant="outline" size="sm" onClick={resetCanvasView}>
                  <RefreshCw size={14} />
                  Reset View
                </Button>
              </div>
            </div>

            <div
              ref={canvasRef}
              className="relative flex-1 overflow-hidden bg-surface-container-low"
              style={{ backgroundImage: "radial-gradient(var(--color-outline-variant) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
              onWheel={(event) => {
                event.preventDefault();
                if (event.ctrlKey || event.metaKey || event.altKey) {
                  const rect = canvasRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  const pointerX = event.clientX - rect.left;
                  const pointerY = event.clientY - rect.top;
                  const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((zoom + (event.deltaY < 0 ? 0.08 : -0.08)).toFixed(2))));
                  const scaleRatio = nextZoom / zoom;
                  setPan((current) => ({
                    x: Math.round(pointerX - (pointerX - current.x) * scaleRatio),
                    y: Math.round(pointerY - (pointerY - current.y) * scaleRatio),
                  }));
                  setZoom(nextZoom);
                  return;
                }
                setPan((current) => ({
                  x: current.x - event.deltaX,
                  y: current.y - event.deltaY,
                }));
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
                    const startX = source.positionX + NODE_WIDTH;
                    const startY = source.positionY + NODE_HEIGHT / 2;
                    const endX = target.positionX;
                    const endY = target.positionY + NODE_HEIGHT / 2;
                    const curve = Math.max(80, Math.abs(endX - startX) / 2);
                    return (
                      <g
                        key={edge.id}
                        className={selectedEdgeId === edge.id ? "text-[#fb923c]" : "text-[#00cec4]"}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedNodeId(null);
                          setSelectedEdgeId(edge.id);
                        }}
                      >
                        <path
                          d={`M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={selectedEdgeId === edge.id ? "3" : "2"}
                          markerEnd="url(#filing-arrow)"
                        />
                      </g>
                    );
                  })}
                  {connectingSourceKey ? (() => {
                    const source = nodes.find((node) => node.key === connectingSourceKey);
                    if (!source) return null;
                    const startX = source.positionX + NODE_WIDTH;
                    const startY = source.positionY + NODE_HEIGHT / 2;
                    const endX = connectionCursor.x;
                    const endY = connectionCursor.y;
                    const curve = Math.max(80, Math.abs(endX - startX) / 2);
                    return (
                      <path
                        d={`M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`}
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
                      className={`absolute rounded-xl border bg-surface p-4 text-left shadow-sm transition-all ${
                        selected ? "border-[#00cec4] shadow-[0_0_0_3px_rgba(0,206,196,0.18)]" : "border-outline-variant hover:shadow-[0_0_0_3px_rgba(0,206,196,0.12)]"
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
                        className={`absolute -left-2 top-[58px] h-4 w-4 rounded-full border-2 ${
                          hoveredTargetKey === node.key ? "border-[#00cec4] bg-[#00cec4]/20" : "border-outline bg-surface"
                        }`}
                      />
                      <div
                        data-node-key={node.key}
                        className="absolute -right-2 top-[58px] h-4 w-4 rounded-full border-2 border-[#00cec4] bg-surface"
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
                          <p className="mt-1 truncate text-xs text-on-surface-variant">{node.category}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {node.isStart ? <Badge variant="success">START</Badge> : null}
                          {!node.isActive ? <Badge variant="secondary">INACTIVE</Badge> : null}
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-xs text-on-surface-variant">
                        {node.description || "No stage description configured."}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-3 text-xs text-on-surface-variant">
                        <span>{node.checklistItems.filter((item) => item.isActive).length} active items</span>
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
              </div>

              <div className="ds-form-section space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="ds-h3 text-on-surface">Checklist Items</h3>
                  {selectedNode.category === "CHECKLIST_ITEM" ? (
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

                {selectedNode.category !== "CHECKLIST_ITEM" ? (
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
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div className="space-y-3">
                <Link2 size={28} className="mx-auto text-[#00cec4]" />
                <h2 className="ds-h3 text-on-surface">CONNECTOR SELECTED</h2>
                <p className="max-w-xs text-sm text-on-surface-variant">
                  {selectedEdge.sourceKey} routes into {selectedEdge.targetKey}. Use the canvas toolbar or your keyboard to delete this connector.
                </p>
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
