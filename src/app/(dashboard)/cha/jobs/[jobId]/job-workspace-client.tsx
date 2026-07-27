"use client";

import { NativeSelect } from "@/components/ui/native-select";
import { DateInput } from "@/components/ui/date-input";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Upload, CheckCircle2, AlertTriangle, FolderOpen, ArrowRight, ShieldCheck, AlertCircle, Plus, Trash2, Check, Database, ExternalLink, Undo2, RotateCcw, Mail, History, ChevronDown, ChevronLeft, ChevronRight, Pencil, Lock, BarChart2, CreditCard, ClipboardList, HelpCircle, Clock3, LoaderCircle, LockKeyhole, Search, Maximize2, Copy, UserRound, CalendarDays, Building2, Package, MapPin, Plane, Ship, Bookmark, RefreshCcw, Zap, Boxes, Moon, X, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { FileUploadField } from "@/components/ui/file-upload-field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import * as actions from "@/modules/cha/actions";
import { DoValidityPanel } from "./do-validity-panel";
import {
  FilingDocumentPreviewDrawer,
  DocumentDropzone,
  RequirementDocumentCard,
  UploadedWorkflowDocumentCard,
  WorkflowDocumentsSectionHeader,
  type WorkflowDocumentRequirement,
  type WorkflowDocumentVersion,
} from "./workflow-documents-section";
import { NeonCheckbox } from "@/components/ui/neon-checkbox";
import {
  ChaDueDateWarningNote,
} from "@/app/(dashboard)/cha/_components/cha-due-date-warning-note";
import type { DueDateWarningViewModel } from "@/app/(dashboard)/cha/_components/cha-due-date-warning-indicator";
import {
  formatChaBadgeLabel,
  getChaDocumentStatusBadgeVariant,
  getChaJobStatusBadgeVariant,
} from "@/lib/cha-badges";
import { cn } from "@/lib/utils";

interface JobWorkspaceClientProps {
  job: any;
  users: { id: string; name: string; email: string }[];
  expenseCategories: string[];
  selfApprovalAllowed: boolean;
  currentUserId: string;
  canDeleteJob: boolean;
  canApproveDeleteJob: boolean;
  canDeleteDoc: boolean;
  canManageSettings: boolean;
  canInternalApproveChecklist: boolean;
  canCustomerApproveChecklist: boolean;
  canUpdateJob: boolean;
  canRequestExpenses: boolean;
  canManageExpenses: boolean;
  canPayExpenses: boolean;
  internalApproversCount: number;
  initialTab?: string;
  focusField?: string;
  managers?: { id: string; name: string; email: string; branchId: string | null }[];
}

function getPaymentProofLinks(paymentProofKey?: string | null) {
  if (!paymentProofKey) return [];
  try {
    const parsed = JSON.parse(paymentProofKey);
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
    }
  } catch {
    // Older payments stored a single URL directly.
  }
  return [paymentProofKey];
}

function getReceiptLinks(receiptKey?: string | null) {
  if (!receiptKey) return [];
  try {
    const parsed = JSON.parse(receiptKey);
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
    }
  } catch {
    // Older line items stored a single URL directly.
  }
  return [receiptKey];
}

const STAGES = [
  { key: "DOCUMENT_COLLECTION", label: "Doc Collection" },
  { key: "ADDITIONAL_DATA", label: "Additional Data" },
  { key: "CHECKLIST_PREPARATION", label: "Checklist Prep" },
  { key: "CHECKLIST_APPROVAL", label: "Checklist Approval" },
  { key: "FILING", label: "Filing Stage" },
  { key: "FILED", label: "Filed / Complete" },
];

const WORKFLOW_UI_STAGES = [
  { key: "DOCUMENT_COLLECTION", label: "Doc Collection" },
  { key: "ADDITIONAL_DATA", label: "Additional Data" },
  { key: "CHECKLIST", label: "Checklist" },
  { key: "FILING", label: "Filing Stage" },
  { key: "EXPENSES", label: "Expenses" },
  { key: "FILED", label: "Filed / Complete" },
];

const CHA_OVERVIEW_BANNER_ART = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 420" fill="none">
  <rect width="1600" height="420" fill="#EAF4FF"/>
  <path d="M0 112C148 76 280 70 412 88C544 106 690 148 862 136C1034 124 1224 52 1600 76V420H0V112Z" fill="#D8ECFF"/>
  <path d="M0 150C162 126 314 132 490 158C666 184 806 212 968 194C1130 176 1298 108 1600 118V420H0V150Z" fill="#C9E4FF"/>
  <path d="M1210 116H1248V258H1210V116Z" fill="#8CB9E8"/>
  <path d="M1272 82H1310V258H1272V82Z" fill="#79AADF"/>
  <path d="M1370 108H1408V258H1370V108Z" fill="#8CB9E8"/>
  <path d="M1248 116L1338 168H1158L1248 116Z" fill="#7CAFE3"/>
  <path d="M1310 82L1422 152H1198L1310 82Z" fill="#72A6DD"/>
  <path d="M1408 108L1512 170H1304L1408 108Z" fill="#83B4E5"/>
  <path d="M934 116L1088 104L1222 138L1314 160L1268 296L866 296L894 178L934 116Z" fill="#103F73"/>
  <path d="M922 178H1288L1262 314H840L856 274L922 178Z" fill="#0E315B"/>
  <rect x="962" y="96" width="30" height="80" rx="4" fill="#E4EEF8"/>
  <rect x="1044" y="76" width="22" height="98" rx="4" fill="#E4EEF8"/>
  <path d="M1054 70C1064 58 1072 42 1074 24C1078 46 1088 60 1102 72L1054 70Z" fill="#E4EEF8"/>
  <rect x="928" y="148" width="52" height="30" fill="#BA473A"/>
  <rect x="980" y="148" width="52" height="30" fill="#D17D52"/>
  <rect x="1032" y="148" width="52" height="30" fill="#4E7FB7"/>
  <rect x="1084" y="148" width="52" height="30" fill="#CC6547"/>
  <rect x="1136" y="148" width="52" height="30" fill="#4E7FB7"/>
  <rect x="926" y="118" width="58" height="30" fill="#4E7FB7"/>
  <rect x="984" y="118" width="58" height="30" fill="#D17D52"/>
  <rect x="1042" y="118" width="58" height="30" fill="#4E7FB7"/>
  <rect x="1100" y="118" width="58" height="30" fill="#CC6547"/>
  <rect x="1158" y="118" width="58" height="30" fill="#4E7FB7"/>
  <path d="M0 322C194 294 394 288 608 304C822 320 1124 352 1600 330V420H0V322Z" fill="#5FA7E6"/>
  <path d="M0 342C188 322 438 316 664 334C890 352 1148 388 1600 360V420H0V342Z" fill="#408FD6"/>
  <path d="M754 60C800 18 884 10 930 56" stroke="#9AD0F8" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 12"/>
  <path d="M742 84C828 30 930 26 1016 74" stroke="#9AD0F8" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 14"/>
</svg>
`)}`;

const CHA_OVERVIEW_MAP_ART = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 420" fill="none">
  <rect width="900" height="420" rx="30" fill="#F8FBFF"/>
  <path d="M98 250C180 192 250 176 338 170C446 162 560 198 650 182C714 170 764 140 818 92" stroke="#2563EB" stroke-width="5" stroke-linecap="round" stroke-dasharray="12 14"/>
  <circle cx="126" cy="250" r="14" fill="#22C55E"/>
  <circle cx="126" cy="250" r="26" fill="#22C55E" fill-opacity=".14"/>
  <circle cx="792" cy="96" r="14" fill="#2563EB"/>
  <circle cx="792" cy="96" r="26" fill="#2563EB" fill-opacity=".14"/>
  <circle cx="470" cy="188" r="16" fill="#0EA5E9"/>
  <circle cx="470" cy="188" r="34" fill="#0EA5E9" fill-opacity=".12"/>
  <path d="M454 188H486" stroke="white" stroke-width="4" stroke-linecap="round"/>
  <path d="M462 180L486 188L462 196" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M132 130C240 76 374 54 520 72C644 88 742 136 828 204" stroke="#BFDBFE" stroke-width="2.5" stroke-dasharray="10 12"/>
  <path d="M86 328C210 258 338 244 512 270C632 288 728 326 820 300" stroke="#DBEAFE" stroke-width="2.5" stroke-dasharray="8 12"/>
</svg>
`)}`;

type WorkspaceTab =
  | "overview"
  | "docs"
  | "additionalData"
  | "checklist"
  | "filing"
  | "advances"
  | "expenses"
  | "audit";

type ContainerEntry = {
  containerNumber: string;
};


type AdditionalDataDraft = {
  vesselInwardDate: string;
  importGeneralManifest: string;
  exportGeneralManifest: string;
  customManifestValue: string;
  containerEntries: ContainerEntry[];
  mblNumber: string;
  hblNumber: string;
  deliveryOrderValidity: string;
};

type FilingValidationWarning = {
  message: string;
  details: string[];
  fieldKeys: string[];
  checklistItemIds: string[];
  checklistRemarkItemIds: string[];
  checklistDelayRemarkItemIds: string[];
  documentRequirementKeys: string[];
  photoRequirementIds: string[];
  miscKeys: string[];
};

function hasAdditionalDataDraftContent(draft: AdditionalDataDraft) {
  return Boolean(
    draft.vesselInwardDate ||
    draft.deliveryOrderValidity ||
    draft.importGeneralManifest ||
    draft.exportGeneralManifest ||
    draft.customManifestValue ||
    draft.mblNumber ||
    draft.hblNumber ||
    draft.containerEntries.some((entry) => entry.containerNumber.trim()),
  );
}

type FilingNodeDraft = {
  checklistResponses: Record<string, { isChecked: boolean; remarks?: string; fileKey?: string; delayRemarks?: string }>;
  filingFieldValues: Record<string, string>;
  filingToggleStates: Record<string, boolean>;
  filingToggleStateDetails: Record<string, { isEnabled: boolean; state: Record<string, unknown> | null }>;
  filingQueryDetails: string;
  filingQueryOfficerName: string;
  filingQueryReceivedAt: string;
  filingQueryReferenceNumber: string;
  filingQueryResponderNames: Record<string, string>;
  filingQueryStatusUpdates: Record<string, string>;
  filingQueryTitle: string;
  nodeRemarks: string;
  nodeDelayRemarks: string;
  selectedNextNodeKey: string;
};

function getAdditionalDataDraftStorageKey(jobId: string) {
  return `cha_additional_data_draft:${jobId}`;
}

function getAdditionalDataManualSaveStorageKey(jobId: string) {
  return `cha_additional_data_saved:${jobId}`;
}

function formatSummaryList(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function getFilingNodeDraftStorageKey(jobId: string, nodeRunId: string) {
  return `cha_filing_node_draft:${jobId}:${nodeRunId}`;
}

function getDefaultTabForStage(stage: string): WorkspaceTab {
  if (stage === "ADDITIONAL_DATA") return "additionalData";
  if (stage === "CHECKLIST_PREPARATION" || stage === "CHECKLIST_APPROVAL") return "checklist";
  if (stage === "FILING") return "filing";
  if (stage === "FILED") return "expenses";
  return "docs";
}

function getWorkflowUiStageKey(stage: string) {
  if (stage === "CHECKLIST_PREPARATION" || stage === "CHECKLIST_APPROVAL") return "CHECKLIST";
  if (stage === "FILED") return "EXPENSES";
  return stage;
}

function getWorkflowUiStageIndex(stage: string) {
  return WORKFLOW_UI_STAGES.findIndex((item) => item.key === getWorkflowUiStageKey(stage));
}

function getValiditySummary(validityDate?: string | null) {
  if (!validityDate) return null;
  const parsed = new Date(validityDate);
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diffDays = Math.ceil((target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return {
      tone: "destructive" as const,
      label: "Expired",
      detail: `Expired on ${parsed.toLocaleDateString("en-IN")}`,
    };
  }
  if (diffDays <= 4) {
    return {
      tone: "warning" as const,
      label: "Near Expiry",
      detail: `Expires in ${diffDays} day(s) on ${parsed.toLocaleDateString("en-IN")}`,
    };
  }
  return {
    tone: "neutral" as const,
    label: "Valid",
    detail: `Valid until ${parsed.toLocaleDateString("en-IN")}`,
  };
}

function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  }
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function getDaysRemainingSummary(dateValue?: string | null) {
  if (!dateValue) {
    return {
      tone: "neutral" as const,
      label: "Not required",
    };
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return {
      tone: "neutral" as const,
      label: "Not set",
    };
  }

  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diffDays = Math.ceil((target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      tone: "destructive" as const,
      label: "Expired",
    };
  }

  if (diffDays <= 4) {
    return {
      tone: "warning" as const,
      label: `${diffDays} day${diffDays === 1 ? "" : "s"} left`,
    };
  }

  return {
    tone: "success" as const,
    label: `${diffDays} day${diffDays === 1 ? "" : "s"} left`,
  };
}

function getDefaultContainerEntry(): ContainerEntry {
  return {
    containerNumber: "",
  };
}

function normalizeContainerEntries(value: unknown): ContainerEntry[] {
  if (!Array.isArray(value)) {
    return [getDefaultContainerEntry()];
  }

  const normalized = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const containerNumber =
        "containerNumber" in entry && typeof entry.containerNumber === "string" ? entry.containerNumber : "";

      return {
        containerNumber,
      };
    })
    .filter((entry): entry is ContainerEntry => entry !== null);

  return normalized.length ? normalized : [getDefaultContainerEntry()];
}


function normalizeAdditionalDataDraft(value: unknown): AdditionalDataDraft | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const draft = value as Partial<AdditionalDataDraft>;

  return {
    vesselInwardDate: typeof draft.vesselInwardDate === "string" ? draft.vesselInwardDate : "",
    importGeneralManifest:
      typeof draft.importGeneralManifest === "string" ? draft.importGeneralManifest : "",
    exportGeneralManifest:
      typeof draft.exportGeneralManifest === "string" ? draft.exportGeneralManifest : "",
    customManifestValue: typeof draft.customManifestValue === "string" ? draft.customManifestValue : "",
    containerEntries: normalizeContainerEntries(draft.containerEntries),
    mblNumber: typeof draft.mblNumber === "string" ? draft.mblNumber : "",
    hblNumber: typeof draft.hblNumber === "string" ? draft.hblNumber : "",
    deliveryOrderValidity: typeof draft.deliveryOrderValidity === "string" ? draft.deliveryOrderValidity : "",
  };
}

function normalizeFilingNodeDraft(value: unknown): FilingNodeDraft | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const draft = value as Partial<FilingNodeDraft>;

  return {
    checklistResponses:
      draft.checklistResponses && typeof draft.checklistResponses === "object" ? draft.checklistResponses : {},
    filingFieldValues:
      draft.filingFieldValues && typeof draft.filingFieldValues === "object" ? draft.filingFieldValues : {},
    filingToggleStates:
      draft.filingToggleStates && typeof draft.filingToggleStates === "object" ? draft.filingToggleStates : {},
    filingToggleStateDetails:
      draft.filingToggleStateDetails && typeof draft.filingToggleStateDetails === "object"
        ? draft.filingToggleStateDetails
        : {},
    filingQueryDetails: typeof draft.filingQueryDetails === "string" ? draft.filingQueryDetails : "",
    filingQueryOfficerName: typeof draft.filingQueryOfficerName === "string" ? draft.filingQueryOfficerName : "",
    filingQueryReceivedAt: typeof draft.filingQueryReceivedAt === "string" ? draft.filingQueryReceivedAt : "",
    filingQueryReferenceNumber:
      typeof draft.filingQueryReferenceNumber === "string" ? draft.filingQueryReferenceNumber : "",
    filingQueryResponderNames:
      draft.filingQueryResponderNames && typeof draft.filingQueryResponderNames === "object"
        ? draft.filingQueryResponderNames
        : {},
    filingQueryStatusUpdates:
      draft.filingQueryStatusUpdates && typeof draft.filingQueryStatusUpdates === "object"
        ? draft.filingQueryStatusUpdates
        : {},
    filingQueryTitle: typeof draft.filingQueryTitle === "string" ? draft.filingQueryTitle : "",
    nodeRemarks: typeof draft.nodeRemarks === "string" ? draft.nodeRemarks : "",
    nodeDelayRemarks: typeof draft.nodeDelayRemarks === "string" ? draft.nodeDelayRemarks : "",
    selectedNextNodeKey: typeof draft.selectedNextNodeKey === "string" ? draft.selectedNextNodeKey : "",
  };
}

function mergeFilingChecklistResponses(
  serverResponses: Record<string, { isChecked: boolean; remarks?: string; fileKey?: string; delayRemarks?: string }>,
  draftResponses: Record<string, { isChecked: boolean; remarks?: string; fileKey?: string; delayRemarks?: string }>,
) {
  const merged = { ...serverResponses };

  for (const [itemId, draftResponse] of Object.entries(draftResponses)) {
    const serverResponse = merged[itemId];
    if (!serverResponse) {
      merged[itemId] = draftResponse;
      continue;
    }

    merged[itemId] = {
      isChecked: draftResponse.isChecked ?? serverResponse.isChecked,
      remarks: draftResponse.remarks?.trim() ? draftResponse.remarks : serverResponse.remarks,
      fileKey: draftResponse.fileKey || serverResponse.fileKey,
      delayRemarks: draftResponse.delayRemarks?.trim() ? draftResponse.delayRemarks : serverResponse.delayRemarks,
    };
  }

  return merged;
}

function AdditionalDataStatCard({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div className="card-cyan-outline card-top-accent rounded-xl border border-outline-variant/40 bg-surface p-3 shadow-sm">
      <span className="ds-label">{label}</span>
      <p className={`mt-1 text-sm text-on-surface ${numeric ? "ds-numeric" : ""}`}>{value}</p>
    </div>
  );
}

function SectionHeading({
  title,
  description,
  aside,
}: {
  title: string;
  description?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="grid grid-cols-[4px_minmax(0,1fr)] items-center gap-4">
          <span className="h-7 w-1 rounded-sm bg-[#00cec4]" aria-hidden="true" />
          <h3 className="ds-h3 text-on-surface">{title}</h3>
        </div>
        {description ? <p className="pl-5 text-sm text-on-surface-variant">{description}</p> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

function WarningNoteToggle({
  title,
  description,
  open,
  onToggle,
}: {
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="group/warning-note relative shrink-0">
      <button
        type="button"
        aria-label={title}
        aria-expanded={open}
        onClick={onToggle}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#fb923c]/45 bg-[#fb923c]/10 text-[#fb923c] shadow-sm transition-transform duration-200 hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00cec4]/30"
      >
        <AlertTriangle size={14} strokeWidth={2.2} />
      </button>
      <div
        className={`card-top-accent-orange absolute right-0 top-full z-20 mt-2 w-[20rem] max-w-[calc(100vw-2rem)] rounded-xl border border-[#fb923c]/30 bg-surface px-4 py-3 shadow-[0_20px_44px_-26px_rgba(251,146,60,0.45)] transition-all duration-200 ${open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-1 opacity-0 group-hover/warning-note:pointer-events-auto group-hover/warning-note:translate-y-0 group-hover/warning-note:opacity-100"
          }`}
      >
        <h4 className="ds-label !text-[#fb923c]">{title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-on-surface">{description}</p>
      </div>
    </div>
  );
}

function InfoNoteToggle({
  title,
  description,
  open,
  onToggle,
}: {
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="group/info-note relative shrink-0">
      <button
        type="button"
        aria-label={title}
        aria-expanded={open}
        onClick={onToggle}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#00cec4]/45 bg-[#00cec4]/10 text-[#00cec4] shadow-sm transition-transform duration-200 hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00cec4]/30"
      >
        <AlertCircle size={14} strokeWidth={2.2} />
      </button>
      <div
        className={`card-top-accent absolute right-0 top-full z-20 mt-2 w-[20rem] max-w-[calc(100vw-2rem)] rounded-xl border border-[#00cec4]/30 bg-surface px-4 py-3 shadow-[0_20px_44px_-26px_rgba(0,206,196,0.45)] transition-all duration-200 ${open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-1 opacity-0 group-hover/info-note:pointer-events-auto group-hover/info-note:translate-y-0 group-hover/info-note:opacity-100"
          }`}
      >
        <h4 className="ds-label !text-[#00cec4]">{title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-on-surface">{description}</p>
      </div>
    </div>
  );
}

interface SlideToCompleteProps {
  onComplete: () => Promise<boolean>;
  disabled?: boolean;
  text?: string;
  helperText?: string;
  accessibleName?: string;
}

interface MilestoneCardProps {
  stageKey: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
  isLocked: boolean;
  percentage: number;
  validationState: string;
  statusLabel?: string;
  assignedUser?: string;
  dueDate?: string | null;
  completedAt?: string | null;
  summary: React.ReactNode;
  children: React.ReactNode;
  isExpanded: boolean;
  isSpotlit?: boolean;
  onToggle: (stageKey: string) => void;
}

interface FilingWorkflowStatusBannerProps {
  activeNodeName: string;
  activeNodeSequence: number | null;
  activeNodeSubtitle: string | null;
  completedSteps: Array<{
    id: string;
    nodeName: string;
    completedAt: string | null;
    completedByName: string | null;
    status?: string;
  }>;
  nextStageName: string | null;
  isBlocked: boolean;
  isCompleting: boolean;
  activeStatusLabel?: string | null;
  activeStatusDescription?: string | null;
}

function MilestoneCard({
  stageKey,
  title,
  description,
  isCompleted,
  isActive,
  isLocked,
  percentage,
  validationState,
  statusLabel,
  assignedUser,
  dueDate,
  completedAt,
  summary,
  children,
  isExpanded,
  isSpotlit = false,
  onToggle,
}: MilestoneCardProps) {
  const cardBorderClass = isActive
    ? "border-[#00cec4]/35 bg-surface shadow-[0_28px_60px_-38px_rgba(0,206,196,0.32)]"
    : isCompleted
      ? "border-[#00cec4]/25 bg-surface"
      : "border-outline-variant/30 bg-surface-container-low/30 opacity-70";

  const badgeVariant = "secondary";

  return (
    <div
      id={`workflow-stage-${stageKey.toLowerCase()}`}
      data-stage-key={stageKey}
      className={`scroll-mt-32 overflow-hidden rounded-xl border bg-surface transition-all duration-500 ${cardBorderClass} ${isSpotlit
          ? "ring-2 ring-[#00cec4]/30 shadow-[0_28px_56px_-34px_rgba(0,206,196,0.4)]"
          : ""
        }`}
      style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
    >
      <div
        onClick={() => {
          if (isLocked) return;
          onToggle(stageKey);
        }}
        className={`select-none flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between ${isLocked ? "cursor-not-allowed" : "cursor-pointer hover:bg-surface-container-low/45"
          }`}
      >
        <div className="flex min-w-0 items-center gap-4 lg:flex-1">
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-full text-xs transition-all ${isCompleted
                ? "border border-[#00cec4] bg-surface text-[#00cec4]"
                : isActive
                  ? "border border-[#00cec4] bg-surface text-[#00cec4]"
                  : "border border-outline-variant bg-surface text-on-surface-variant/40"
              }`}
          >
            {isCompleted ? <Check size={14} /> : isLocked ? <Lock size={12} /> : percentage + "%"}
          </span>
          <div className="grid min-w-0 flex-1 grid-cols-[4px_minmax(0,1fr)] items-start gap-x-4 gap-y-1">
            <div aria-hidden="true" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="ds-label">Workflow Stage</span>
              <Badge
                variant={badgeVariant}
                className={`uppercase tracking-wider text-[10px] ${isCompleted || isActive ? "!border-[#00cec4]/35 !bg-transparent !text-[#00cec4]" : ""
                  }`}
              >
                {statusLabel ?? (isCompleted ? "Completed" : isActive ? "Active" : "Locked")}
              </Badge>
              {assignedUser ? (
                <span className="rounded-full border border-outline-variant/30 bg-surface-container-low px-2.5 py-1 text-[10px] font-medium text-on-surface-variant">
                  {assignedUser}
                </span>
              ) : null}
            </div>
            <span className="h-7 w-1 rounded-sm bg-[#00cec4]" aria-hidden="true" />
            <div>
              <h3 className="ds-h3 text-on-surface">
                {title}
              </h3>
            </div>
            <div aria-hidden="true" />
            <p className="max-w-xl text-sm leading-snug text-on-surface-variant">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 self-end lg:self-center">
          {/* Inline Stats */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="rounded-xl border border-outline-variant/25 bg-surface-container-low/60 px-3 py-1.5 text-right">
              <p className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">Readiness</p>
              <p className="text-[11px] font-medium text-on-surface">{validationState}</p>
            </div>
            <div className="rounded-xl border border-outline-variant/25 bg-surface-container-low/60 px-3 py-1.5 text-right">
              <p className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">Progress</p>
              <p className="text-[11px] font-bold text-[#00cec4] ds-numeric">{percentage}%</p>
            </div>
            <div className="rounded-xl border border-outline-variant/25 bg-surface-container-low/60 px-3 py-1.5 text-right">
              <p className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">{isCompleted ? "Closed" : "Due"}</p>
              <p className="text-[11px] font-medium text-on-surface">{isCompleted ? (completedAt || "Pending") : (dueDate || "Open")}</p>
            </div>
          </div>
          {!isLocked && (
            <ChevronDown
              size={18}
              className={`text-on-surface-variant transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
            />
          )}
        </div>
      </div>

      {isExpanded && !isLocked && (
        <div className="space-y-4 border-t border-outline-variant/25 bg-surface px-5 py-5">
          {children}
        </div>
      )}

      {!isExpanded && isCompleted && summary && (
        <div className="rounded-b-xl border-t border-outline-variant/20 bg-surface-container-low/50 px-5 py-3">
          {summary}
        </div>
      )}
    </div>
  );
}

function FilingWorkflowStatusBanner({
  activeNodeName,
  activeNodeSequence,
  activeNodeSubtitle,
  completedSteps,
  nextStageName,
  isBlocked,
  isCompleting,
  activeStatusLabel,
  activeStatusDescription,
}: FilingWorkflowStatusBannerProps) {
  const statusLabel = activeStatusLabel || (isCompleting
    ? "Completing..."
    : isBlocked
      ? "Blocked"
      : "In Progress");
  const latestCompletedStep = completedSteps[0] || null;
  const latestCompletedDateLabel = latestCompletedStep?.completedAt
    ? new Date(latestCompletedStep.completedAt).toLocaleDateString("en-IN")
    : null;
  const latestCompletedTimeLabel = latestCompletedStep?.completedAt
    ? new Date(latestCompletedStep.completedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : null;

  const activeDescription =
    activeStatusDescription ||
    activeNodeSubtitle ||
    "Complete this active stage to continue the filing workflow.";

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)_32px_minmax(0,1fr)] lg:items-center">
      <div className="flex min-h-[92px] min-w-0 items-center gap-3 rounded-xl border border-outline-variant/45 bg-surface px-4 py-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#00cec4]/35 bg-[#00cec4]/10 text-[#00cec4]">
          <CheckCircle2 size={17} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 space-y-0.5">
          <span className="ds-label text-[#00a9b2]">Previous</span>
          <p className="truncate text-sm font-medium text-on-surface">
            {latestCompletedStep
              ? `${latestCompletedStep.nodeName}${latestCompletedStep.status === "SKIPPED" ? " (Skipped)" : ""}`
              : "No prior stage"}
          </p>
          <p className="truncate text-xs text-on-surface-variant">
            {latestCompletedDateLabel ? [latestCompletedDateLabel, latestCompletedTimeLabel].filter(Boolean).join(" | ") : "First active stage"}
          </p>
        </div>
      </div>

      <div className="hidden items-center lg:flex">
        <span className="h-px w-full bg-outline-variant/70" />
      </div>

      <div className="relative flex min-h-[92px] min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-[#00cec4]/35 bg-[#00cec4]/8 px-4 py-3">
        <span className="absolute inset-x-4 top-0 h-0.5 rounded-b-full bg-[#00cec4]" aria-hidden="true" />
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#00cec4]/40 bg-surface text-[#00cec4]">
          <FolderOpen size={17} />
        </span>
        <div className="min-w-0 space-y-0.5">
          <span className="ds-label text-[#00a9b2]">{statusLabel}</span>
          <p className="truncate text-sm font-medium text-on-surface">
            {activeNodeSequence ? <span className="ds-numeric mr-1.5 text-[#00a9b2]">{String(activeNodeSequence).padStart(2, "0")}.</span> : null}
            {activeNodeName}
          </p>
          <p className="truncate text-xs text-on-surface-variant">{activeDescription}</p>
        </div>
      </div>

      <div className="hidden items-center lg:flex">
        <span className="h-px w-full bg-outline-variant/70" />
      </div>

      <div className="flex min-h-[92px] min-w-0 items-center gap-3 rounded-xl border border-outline-variant/45 bg-surface px-4 py-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-outline-variant/70 bg-surface-container-low text-on-surface-variant">
          <ArrowRight size={17} />
        </span>
        <div className="min-w-0 space-y-0.5">
          <span className="ds-label text-on-surface-variant">Up Next</span>
          <p className="truncate text-sm font-medium text-on-surface">{nextStageName || "Workflow Completion"}</p>
          <p className="truncate text-xs text-on-surface-variant">{nextStageName ? "Unlocks after completion" : "Finalizes after this step"}</p>
        </div>
      </div>
    </div>
  );
}

function SlideToComplete({
  onComplete,
  disabled = false,
  text = "Slide to complete this step",
  helperText = "Slide all the way to the right",
  accessibleName = "Slide to complete the current filing workflow step",
}: SlideToCompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startOffsetRef = useRef(0);
  const [sliderPos, setSliderPos] = useState(0);
  const [maxDistance, setMaxDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const thumbWidth = 80;
  const horizontalInset = 6;
  const contentStart = 96;
  const mobileContentStart = 104;

  useEffect(() => {
    const updateMaxDistance = () => {
      const width = containerRef.current?.clientWidth ?? 0;
      setMaxDistance(Math.max(0, width - thumbWidth - horizontalInset * 2));
    };

    updateMaxDistance();
    window.addEventListener("resize", updateMaxDistance);

    return () => {
      window.removeEventListener("resize", updateMaxDistance);
    };
  }, []);

  const progressRatio = maxDistance > 0 ? sliderPos / maxDistance : 0;
  const progressPercent = Math.round(progressRatio * 100);
  const actionVerb = text.toLowerCase().includes("skip") ? "skip" : text.toLowerCase().includes("file") ? "file" : "complete";
  const actionVerbPresent = actionVerb === "skip" ? "skip" : actionVerb === "file" ? "file" : "complete";
  const actionVerbProgress = actionVerb === "skip" ? "Skipping..." : actionVerb === "file" ? "Filing..." : "Completing...";
  const actionVerbGerund = actionVerb === "skip" ? "skipping" : actionVerb === "file" ? "filing" : "completing";
  const actionObject = actionVerb === "skip" ? "this stage" : actionVerb === "file" ? "customs bill" : "this step";

  const triggerCompletion = async () => {
    if (disabled || isSubmitting) return;
    setIsSubmitting(true);
    setSliderPos(maxDistance);
    const didComplete = await onComplete();
    if (!didComplete) {
      setSliderPos(0);
      setIsSubmitting(false);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || isSubmitting) return;
    setIsDragging(true);
    startOffsetRef.current = event.clientX - sliderPos;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled || isSubmitting) return;
    const nextPos = Math.max(0, Math.min(event.clientX - startOffsetRef.current, maxDistance));
    setSliderPos(nextPos);
  };

  const resetDrag = (target: HTMLDivElement | null, pointerId?: number) => {
    setIsDragging(false);
    if (target && pointerId !== undefined && target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
  };

  const handlePointerUp = async (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    resetDrag(event.currentTarget, event.pointerId);

    if (progressRatio >= 0.94) {
      await triggerCompletion();
      return;
    }

    setSliderPos(0);
  };

  const stepKeyboardProgress = async (direction: "forward" | "backward" | "complete") => {
    if (disabled || isSubmitting) return;
    if (direction === "complete") {
      await triggerCompletion();
      return;
    }

    const stepSize = Math.max(maxDistance / 5, 32);
    const nextPos =
      direction === "forward"
        ? Math.min(maxDistance, sliderPos + stepSize)
        : Math.max(0, sliderPos - stepSize);
    setSliderPos(nextPos);

    if (maxDistance > 0 && nextPos / maxDistance >= 0.94) {
      await triggerCompletion();
    }
  };

  return (
    <div
      ref={containerRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={accessibleName}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progressPercent}
      aria-valuetext={isSubmitting ? `${actionVerbGerund} ${actionObject}` : `${progressPercent}% complete`}
      aria-busy={isSubmitting}
      className={cn(
        "relative h-[60px] w-full overflow-visible rounded-full border border-[#00cec4]/30 bg-surface shadow-[0_14px_28px_-18px_rgba(0,206,196,0.24)] outline-none select-none",
        disabled || isSubmitting ? "cursor-not-allowed opacity-70" : "cursor-ew-resize touch-none",
        "focus-visible:ring-2 focus-visible:ring-[#00cec4]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => void handlePointerUp(event)}
      onPointerCancel={(event) => {
        resetDrag(event.currentTarget, event.pointerId);
        setSliderPos(0);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          void stepKeyboardProgress("forward");
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          void stepKeyboardProgress("backward");
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void stepKeyboardProgress("complete");
        } else if (event.key === "Home") {
          event.preventDefault();
          setSliderPos(0);
        } else if (event.key === "End") {
          event.preventDefault();
          void stepKeyboardProgress("complete");
        }
      }}
    >
      <div
        className="absolute inset-y-[6px] left-[6px] rounded-full bg-[linear-gradient(90deg,rgba(0,206,196,0.16),rgba(0,206,196,0.04))] transition-[width] duration-300 ease-out"
        style={{ width: `${Math.max(thumbWidth, sliderPos + thumbWidth)}px` }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 hidden items-center text-sm text-[#00cec4]/45 md:flex"
        style={{ paddingLeft: `${contentStart}px` }}
      >
        <span className="animate-[workflow-chevron_1.15s_ease-in-out_infinite] font-semibold">{">"}</span>
        <span className="ml-2 animate-[workflow-chevron_1.15s_ease-in-out_infinite_0.12s] font-semibold">{">"}</span>
        <span className="ml-2 animate-[workflow-chevron_1.15s_ease-in-out_infinite_0.24s] font-semibold">{">"}</span>
      </div>
      <div
        className={cn(
          "absolute left-[6px] top-[6px] flex h-[48px] w-[80px] items-center justify-center rounded-full border border-[#00cec4] bg-[linear-gradient(135deg,#00cec4,#00b8af)] shadow-[0_10px_22px_-10px_rgba(0,206,196,0.75)]",
          isDragging ? "" : "transition-transform duration-300 ease-out",
        )}
        style={{ transform: `translateX(${sliderPos}px) scale(${isDragging ? 1.04 : 1})` }}
      >
        <ArrowRight size={22} className="text-white shrink-0" style={{ color: '#ffffff', stroke: '#ffffff' }} />
      </div>
      <div
        className="relative z-10 grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pr-4 sm:pr-6"
        style={{ paddingLeft: `${mobileContentStart}px` }}
      >
        <div className="min-w-0 justify-self-center text-center leading-none">
          <p className="text-[10px] font-normal uppercase tracking-[0.12em] text-[#00a9b2]">{isSubmitting ? actionVerbProgress : "Slide to"}</p>
          <p className="mt-1 truncate text-sm font-normal uppercase tracking-[0.04em] text-on-surface">
            <span className="text-[#00a9b2]">{isSubmitting ? actionVerbGerund : actionVerbPresent}</span> {actionObject}
          </p>
        </div>
        <span className="hidden items-center gap-1.5 text-[11px] text-on-surface-variant sm:inline-flex">
          <LockKeyhole size={12} className="text-[#00cec4]" />
          {helperText}
        </span>
      </div>
    </div>
  );
}

type FilingAttachmentValidityRowProps = {
  attachment: any;
  draftValidityDate: string;
  isEditingValidity: boolean;
  isSaving: boolean;
  onDraftChange: (value: string) => void;
  onRemove: () => void;
  onSaveValidity: (value: string | null) => void;
  onToggleValidity: (enabled: boolean) => void;
};

function FilingAttachmentValidityRow({
  attachment,
  draftValidityDate,
  isEditingValidity,
  isSaving,
  onDraftChange,
  onRemove,
  onSaveValidity,
  onToggleValidity,
}: FilingAttachmentValidityRowProps) {
  const currentValidityDate =
    draftValidityDate || toDateInputValue(attachment.validityDate);
  const validitySummary = getValiditySummary(currentValidityDate || null);
  const hasValidityDate = currentValidityDate.length > 0;
  const validityEnabled = hasValidityDate || isEditingValidity;

  return (
    <div className="rounded-xl border border-outline-variant/35 bg-surface px-3 py-3">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#00cec4]/25 bg-[#00cec4]/10 text-[#00a9b2]">
          <FileText className="size-4" aria-hidden={true} />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <a
                href={attachment.fileKey}
                target="_blank"
                rel="noreferrer"
                className="block truncate pr-2 text-sm font-medium text-on-surface transition-colors hover:text-[#00cec4] hover:underline"
              >
                {attachment.fileName}
              </a>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-on-surface-variant">
                <span className="ds-label">Selected</span>
                <span className="ds-numeric">
                  {attachment.uploadedAt ? `Uploaded ${new Date(attachment.uploadedAt).toLocaleDateString("en-IN")}` : "Uploaded"}
                </span>
                {validitySummary ? (
                  <span
                    className={`rounded-full px-2 py-0.5 uppercase tracking-[0.12em] ${validitySummary.tone === "destructive"
                        ? "bg-red-500/10 text-red-600"
                        : validitySummary.tone === "warning"
                          ? "bg-[#fb923c]/12 text-[#c76628]"
                          : "bg-surface-container-low text-on-surface-variant"
                      }`}
                  >
                    {validitySummary.label}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-start gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={validityEnabled}
                onClick={() => onToggleValidity(!validityEnabled)}
                className={`ds-plain inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] transition-all ${validityEnabled
                    ? "border-[#00cec4]/35 bg-[#00cec4]/10 text-[#0f766e]"
                    : "border-outline-variant/35 bg-surface text-on-surface-variant"
                  }`}
              >
                <span
                  className={`relative inline-flex h-3.5 w-6 items-center rounded-full border transition-all ${validityEnabled
                      ? "border-[#00cec4]/45 bg-[#00cec4]/18"
                      : "border-outline-variant/35 bg-surface-container-low"
                    }`}
                >
                  <span
                    className={`absolute top-[1px] h-2.5 w-2.5 rounded-full bg-surface shadow-sm transition-transform ${validityEnabled ? "translate-x-[12px]" : "translate-x-[1px]"
                      }`}
                  />
                </span>
                Validity
              </button>
              <button
                type="button"
                aria-label="Remove file"
                title="Remove file"
                onClick={onRemove}
                className="group ds-plain inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-outline-variant/25 bg-surface text-on-surface-variant transition-all duration-200 hover:border-red-500/25 hover:bg-red-500/8 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/25"
              >
                <X className="size-3.5 shrink-0 transition-transform duration-200 group-hover:rotate-90" aria-hidden={true} />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {validityEnabled ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <DateInput
                  value={currentValidityDate}
                  onChange={(event) => onDraftChange(event.target.value)}
                  className="h-8 w-[144px] min-w-[144px]"
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-2.5 text-[10px]"
                  disabled={isSaving || !currentValidityDate}
                  onClick={() => onSaveValidity(currentValidityDate)}
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-[10px]"
                  disabled={isSaving}
                  onClick={() => onSaveValidity(null)}
                >
                  Clear
                </Button>
              </div>
            ) : (
              <span className="text-[10px] text-on-surface-variant">Optional validity date</span>
            )}
            {validityEnabled && validitySummary?.detail ? (
              <span className="text-[10px] text-on-surface-variant">{validitySummary.detail}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function JobWorkspaceClient({
  job,
  users,
  expenseCategories,
  currentUserId,
  canDeleteJob,
  canApproveDeleteJob,
  canDeleteDoc,
  canManageSettings,
  canInternalApproveChecklist,
  canCustomerApproveChecklist,
  canUpdateJob,
  canRequestExpenses,
  canManageExpenses,
  canPayExpenses,
  internalApproversCount,
  initialTab,
  focusField,
  managers = [],
}: JobWorkspaceClientProps) {
  const router = useRouter();
  const [, startRefreshTransition] = useTransition();
  const filingFormRef = useRef<HTMLFormElement>(null);
  const filingActiveNodeCardRef = useRef<HTMLDivElement>(null);
  const nodeRemarksTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => {
    if (initialTab && ["overview", "docs", "additionalData", "checklist", "filing", "advances", "expenses", "audit"].includes(initialTab)) {
      return initialTab as WorkspaceTab;
    }
    return getDefaultTabForStage(job.stage);
  });
  const [expandedStageKey, setExpandedStageKey] = useState<string | null>(() => {
    if (initialTab) {
      if (initialTab === "docs") return "DOCUMENT_COLLECTION";
      if (initialTab === "additionalData") return "ADDITIONAL_DATA";
      if (initialTab === "checklist") return "CHECKLIST";
      if (initialTab === "filing") return job.stage === "FILED" ? "FILED" : "FILING";
    }
    return getWorkflowUiStageKey(job.stage);
  });
  const [stageFocusKey, setStageFocusKey] = useState<string | null>(null);
  const stageScrollAnimationRef = useRef<number | null>(null);
  const stageFocusTimeoutRef = useRef<number | null>(null);
  const pendingStageNavigationRef = useRef<string | null>(null);
  const pendingStageScrollRef = useRef<string | null>(null);
  const initialStageScrollHandledRef = useRef(false);
  const overviewStageScrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab((currentTab) => {
      if (currentTab === "overview" || currentTab === "audit" || currentTab === "advances" || currentTab === "expenses") {
        return currentTab;
      }
      return getDefaultTabForStage(job.stage);
    });
  }, [job.stage]);

  useEffect(() => {
    return () => {
      if (stageScrollAnimationRef.current !== null) {
        window.clearTimeout(stageScrollAnimationRef.current);
      }
      if (stageFocusTimeoutRef.current !== null) {
        window.clearTimeout(stageFocusTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const pendingStage = pendingStageScrollRef.current;
    if (!pendingStage || expandedStageKey !== pendingStage) {
      return;
    }

    const target = document.getElementById(`workflow-stage-${pendingStage.toLowerCase()}`);
    if (!target) {
      return;
    }

    pendingStageScrollRef.current = null;
    animateStageScrollIntoView(pendingStage);
  }, [activeTab, expandedStageKey]);

  useEffect(() => {
    if (activeTab !== "expenses") return;
    window.setTimeout(() => {
      const scroller = overviewStageScrollerRef.current;
      if (!scroller) return;
      scroller.scrollTo({ left: scroller.scrollWidth, behavior: "smooth" });
    }, 80);
  }, [activeTab]);

  useEffect(() => {
    if (initialStageScrollHandledRef.current || initialTab === "overview") {
      return;
    }
    const activeStageKey = getWorkflowUiStageKey(job.stage);
    const activeStageTab = getDefaultTabForStage(job.stage);
    if (activeTab !== activeStageTab || expandedStageKey !== activeStageKey) {
      return;
    }
    initialStageScrollHandledRef.current = true;
    window.setTimeout(() => animateStageScrollIntoView(activeStageKey), 120);
  }, [activeTab, expandedStageKey, initialTab, job.stage]);

  // Submitting States
  const [loading, setLoading] = useState<string | null>(null);
  const [documentRequirements, setDocumentRequirements] = useState<any[]>(job.documentRequirements);

  // Manager Assignment State
  const [isEditingManager, setIsEditingManager] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState(job.assignedManagerId || "");

  useEffect(() => {
    setSelectedManagerId(job.assignedManagerId || "");
  }, [job.assignedManagerId]);

  useEffect(() => {
    setDocumentRequirements(job.documentRequirements);
  }, [job.documentRequirements]);

  const filteredManagers = useMemo(() => {
    if (!managers) return [];
    const branchManagers = managers.filter((m: any) => m.branchId === job.branchId);
    return branchManagers.length > 0 ? branchManagers : managers;
  }, [managers, job.branchId]);

  const [section49Flag, setSection49Flag] = useState<any>(job.filingSection49Flag ?? null);
  const [showSection49Modal, setShowSection49Modal] = useState(false);
  const [section49Remarks, setSection49Remarks] = useState("");
  const [section49ValidityDate, setSection49ValidityDate] = useState(
    job.filingSection49Flag?.validityDate ? job.filingSection49Flag.validityDate.slice(0, 10) : "",
  );
  const [section49ExtensionDate, setSection49ExtensionDate] = useState("");
  const [section49ExtensionFile, setSection49ExtensionFile] = useState<File | null>(null);
  const [openWarningNote, setOpenWarningNote] = useState<"bill-filing" | "query-processing" | null>(null);
  const additionalDataStageAvailable = job.stage !== "DOCUMENT_COLLECTION";
  const additionalDataManualSaveStorageKey = getAdditionalDataManualSaveStorageKey(job.id);
  const [hasManuallySavedAdditionalData, setHasManuallySavedAdditionalData] = useState(false);
  const [isAdditionalDataEditing, setIsAdditionalDataEditing] = useState(
    () => job.stage === "ADDITIONAL_DATA",
  );

  useEffect(() => {
    setSection49Flag(job.filingSection49Flag ?? null);
    setSection49ValidityDate(job.filingSection49Flag?.validityDate ? job.filingSection49Flag.validityDate.slice(0, 10) : "");
  }, [job.filingSection49Flag]);

  useEffect(() => {
    if (job.stage !== "ADDITIONAL_DATA") {
      setHasManuallySavedAdditionalData(false);
      return;
    }

    try {
      setHasManuallySavedAdditionalData(localStorage.getItem(additionalDataManualSaveStorageKey) === "true");
    } catch {
      setHasManuallySavedAdditionalData(false);
    }
  }, [additionalDataManualSaveStorageKey, job.stage]);

  useEffect(() => {
    setIsAdditionalDataEditing(job.stage === "ADDITIONAL_DATA" && !hasManuallySavedAdditionalData);
  }, [hasManuallySavedAdditionalData, job.id, job.stage]);


  const [dueDateWarnings, setDueDateWarnings] = useState<DueDateWarningViewModel[]>(job.dueDateWarnings ?? []);

  useEffect(() => {
    setDueDateWarnings(job.dueDateWarnings ?? []);
  }, [job.dueDateWarnings]);

  const visibleDocumentRequirements = useMemo(() => {
    return documentRequirements.filter((req: any) => {
      const categoryName = req.requirementItem?.category?.name || req.category || "General Documents";
      if (categoryName !== "Customs Validity Documents") {
        return true;
      }

      const hasPersistedState =
        req.status !== "PENDING" || (Array.isArray(req.versions) && req.versions.length > 0) || !!req.exception;

      if (req.name === "Section 49") {
        return !!section49Flag?.isEnabled || hasPersistedState;
      }

      if (req.name === "Extension") {
        return true;
      }

      return true;
    });
  }, [
    documentRequirements,
    section49Flag?.isEnabled,
  ]);

  const getDisplayWorkflowRequirement = useCallback((rawReq: any) => {
    const chaCurrentVersion = rawReq.versions?.find((version: any) => version.isCurrent) || rawReq.versions?.[0] || null;
    if (chaCurrentVersion) {
      return {
        ...rawReq,
        usesCustomerSubmission: false,
        customerSubmission: rawReq.customerSubmissions?.[0] ?? null,
      };
    }

    const customerSubmission = rawReq.customerSubmissions?.[0] ?? null;
    const customerVersion = customerSubmission?.versions?.[0] ?? null;
    if (!customerSubmission || !customerVersion) {
      return {
        ...rawReq,
        usesCustomerSubmission: false,
        customerSubmission: null,
      };
    }

    return {
      ...rawReq,
      status: customerSubmission.status === "ACCEPTED" ? "UPLOADED" : customerSubmission.status,
      usesCustomerSubmission: true,
      customerSubmission,
      versions: [
        {
          id: customerVersion.id,
          fileKey: `/api/cha/customer-documents/${customerVersion.id}`,
          fileName: customerVersion.fileName,
          mimeType: customerVersion.mimeType || "application/octet-stream",
          sizeBytes: customerVersion.sizeBytes,
          checksum: customerVersion.checksum,
          uploadedById: customerSubmission.portalUserId,
          uploadedBy: { name: customerSubmission.portalUser?.name || "Customer Portal" },
          uploadedAt: customerVersion.uploadedAt,
          isCurrent: true,
          source: "CUSTOMER_PORTAL",
        },
      ],
    };
  }, []);

  const bulkNaEligibleRequirements = useMemo(
    () =>
      visibleDocumentRequirements.filter(
        (req: any) => req.status !== "UPLOADED" && req.status !== "NOT_AVAILABLE",
      ),
    [visibleDocumentRequirements],
  );

  const firstUnresolvedMandatoryDocumentId = useMemo(() => {
    const unresolvedRequirement = visibleDocumentRequirements.find((req: any) => {
      const isExempted = req.status === "NOT_AVAILABLE" || !!req.exception;
      return req.isMandatory && req.status !== "UPLOADED" && !isExempted;
    });
    return unresolvedRequirement?.id ?? null;
  }, [visibleDocumentRequirements]);

  const [documentSearchQuery, setDocumentSearchQuery] = useState("");
  const [documentsFilterMode, setDocumentsFilterMode] = useState<"ALL" | "PENDING" | "UPLOADED" | "DECLARED_EXEMPTION" | "MARKED_NA">("ALL");
  const [selectedDocumentRequirementId, setSelectedDocumentRequirementId] = useState<string | null>(null);
  const [isDocumentDrawerOpen, setIsDocumentDrawerOpen] = useState(true);
  const [documentDrawerTab, setDocumentDrawerTab] = useState<"preview" | "details">("preview");

  const previewDrawerRef = useRef<HTMLDivElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const [previewOffset, setPreviewOffset] = useState(0);

  const updatePreviewOffset = useCallback(() => {
    if (!selectedDocumentRequirementId || !isDocumentDrawerOpen) {
      setPreviewOffset(0);
      return;
    }
    // Small delay to ensure DOM is updated and height has settled
    setTimeout(() => {
      const cardElement = documentRequirementCardRefs.current[selectedDocumentRequirementId];
      const dropzoneElement = dropzoneRef.current;
      if (cardElement && dropzoneElement) {
        const cardRect = cardElement.getBoundingClientRect();
        const dropzoneRect = dropzoneElement.getBoundingClientRect();
        const gap = 20; // space-y-5 is 20px gap
        const naturalDrawerTop = dropzoneRect.bottom + gap;
        const offset = Math.max(0, cardRect.top - naturalDrawerTop);
        setPreviewOffset(offset);
      }
    }, 50);
  }, [selectedDocumentRequirementId, isDocumentDrawerOpen]);

  useEffect(() => {
    updatePreviewOffset();
    window.addEventListener("scroll", updatePreviewOffset, { passive: true });
    window.addEventListener("resize", updatePreviewOffset);
    return () => {
      window.removeEventListener("scroll", updatePreviewOffset);
      window.removeEventListener("resize", updatePreviewOffset);
    };
  }, [updatePreviewOffset]);

  const filteredWorkflowDocuments = useMemo(() => {
    const normalizedQuery = documentSearchQuery.trim().toLowerCase();
    return visibleDocumentRequirements
      .map((rawReq: any) => getDisplayWorkflowRequirement(rawReq))
      .filter((rawReq: any) => {
      const req = rawReq as WorkflowDocumentRequirement & { customerSubmission?: any; usesCustomerSubmission?: boolean };
      const currentVersion = req.versions.find((version) => version.isCurrent) || req.versions[0];
      const matchesQuery =
        !normalizedQuery ||
        [
          req.name,
          req.category,
          req.requirementItem?.category?.name,
          currentVersion?.fileName,
        ]
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          .some((value) => value.toLowerCase().includes(normalizedQuery));

      if (!matchesQuery) return false;

      if (documentsFilterMode === "UPLOADED") return !!currentVersion && !["REUPLOAD_REQUIRED", "CLARIFICATION_REQUIRED", "REJECTED"].includes(req.status);
      if (documentsFilterMode === "DECLARED_EXEMPTION") return !!req.exception && req.exception.reason !== "N/A";
      if (documentsFilterMode === "MARKED_NA") return req.status === "NOT_AVAILABLE" || req.exception?.reason === "N/A";
      if (documentsFilterMode === "PENDING") {
        if (req.status === "NOT_AVAILABLE" || !!req.exception) return false;
        return !currentVersion || ["REUPLOAD_REQUIRED", "CLARIFICATION_REQUIRED", "REJECTED"].includes(req.status);
      }
      return true;
    });
  }, [documentSearchQuery, documentsFilterMode, getDisplayWorkflowRequirement, visibleDocumentRequirements]);

  const topRequirementCards = useMemo(
    () =>
      filteredWorkflowDocuments.filter((req: any) => {
        const currentVersion = req.versions.find((version: WorkflowDocumentVersion) => version.isCurrent) || req.versions[0];
        return !currentVersion || ["REUPLOAD_REQUIRED", "CLARIFICATION_REQUIRED", "REJECTED"].includes(req.status);
      }),
    [filteredWorkflowDocuments],
  );

  const uploadedWorkflowDocuments = useMemo(
    () =>
      filteredWorkflowDocuments.filter((req: any) => {
        const currentVersion = req.versions.find((version: any) => version.isCurrent) || req.versions[0];
        return !!currentVersion && !["REUPLOAD_REQUIRED", "CLARIFICATION_REQUIRED", "REJECTED"].includes(req.status);
      }),
    [filteredWorkflowDocuments],
  );

  const selectedWorkflowDocumentRequirement = useMemo(() => {
    const matchingRequirement = filteredWorkflowDocuments.find((req: WorkflowDocumentRequirement) => req.id === selectedDocumentRequirementId);
    if (matchingRequirement) return matchingRequirement;
    return uploadedWorkflowDocuments[0] ?? topRequirementCards[0] ?? filteredWorkflowDocuments[0] ?? null;
  }, [filteredWorkflowDocuments, selectedDocumentRequirementId, topRequirementCards, uploadedWorkflowDocuments]);

  const selectedWorkflowDocumentVersion = useMemo(() => {
    if (!selectedWorkflowDocumentRequirement) return null;
    return selectedWorkflowDocumentRequirement.versions.find((version: WorkflowDocumentVersion) => version.isCurrent) || selectedWorkflowDocumentRequirement.versions[0] || null;
  }, [selectedWorkflowDocumentRequirement]);
  const getRequirementCategoryName = (requirement: WorkflowDocumentRequirement) =>
    requirement.requirementItem?.category?.name || requirement.category || "General Documents";
  const getRequirementCategorySortOrder = (requirement: WorkflowDocumentRequirement) => {
    const rawOrder =
      (requirement.requirementItem?.category as { sortOrder?: number | null } | undefined)?.sortOrder ?? null;
    return typeof rawOrder === "number" ? rawOrder : Number.MAX_SAFE_INTEGER;
  };
  const getRequirementItemSortOrder = (requirement: WorkflowDocumentRequirement) => {
    const rawOrder =
      (requirement.requirementItem as { sortOrder?: number | null } | undefined)?.sortOrder ?? null;
    return typeof rawOrder === "number" ? rawOrder : Number.MAX_SAFE_INTEGER;
  };
  const sortWorkflowRequirements = useCallback((left: WorkflowDocumentRequirement, right: WorkflowDocumentRequirement) => {
    const categoryOrderDiff = getRequirementCategorySortOrder(left) - getRequirementCategorySortOrder(right);
    if (categoryOrderDiff !== 0) return categoryOrderDiff;

    const categoryNameDiff = getRequirementCategoryName(left).localeCompare(getRequirementCategoryName(right));
    if (categoryNameDiff !== 0) return categoryNameDiff;

    const itemOrderDiff = getRequirementItemSortOrder(left) - getRequirementItemSortOrder(right);
    if (itemOrderDiff !== 0) return itemOrderDiff;

    return left.name.localeCompare(right.name);
  }, []);
  const groupedPendingWorkflowDocuments = useMemo(() => {
    const grouped = new Map<string, WorkflowDocumentRequirement[]>();
    for (const requirement of topRequirementCards) {
      const categoryName = getRequirementCategoryName(requirement);
      if (!grouped.has(categoryName)) {
        grouped.set(categoryName, []);
      }
      grouped.get(categoryName)?.push(requirement);
    }

    return Array.from(grouped.entries())
      .map(([categoryName, requirements]) => ({
        categoryName,
        requirements: [...requirements].sort(sortWorkflowRequirements),
        sortOrder: requirements.reduce((lowest, current) => Math.min(lowest, getRequirementCategorySortOrder(current)), Number.MAX_SAFE_INTEGER),
      }))
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
        return left.categoryName.localeCompare(right.categoryName);
      });
  }, [sortWorkflowRequirements, topRequirementCards]);
  const sortedUploadedWorkflowDocuments = useMemo(
    () => [...uploadedWorkflowDocuments].sort(sortWorkflowRequirements),
    [sortWorkflowRequirements, uploadedWorkflowDocuments],
  );


  // Document Collection Form State
  const [exceptionReason, setExceptionReason] = useState("");
  const [activeDocReqId, setActiveDocReqId] = useState<string | null>(null);
  const [uploadDocumentModalReqId, setUploadDocumentModalReqId] = useState<string | null>(null);
  const [bulkNaConfirmOpen, setBulkNaConfirmOpen] = useState(false);
  const [isCustomDocumentModalOpen, setIsCustomDocumentModalOpen] = useState(false);
  const [customDocumentName, setCustomDocumentName] = useState("");
  const [customDocumentFile, setCustomDocumentFile] = useState<File | null>(null);
  const [customerApprovalNow, setCustomerApprovalNow] = useState(() => Date.now());
  const activeExceptionRequirement =
    activeDocReqId ? documentRequirements.find((req: any) => req.id === activeDocReqId) ?? null : null;
  const section49Requirement = visibleDocumentRequirements.find((req: any) => req.name === "Section 49") ?? null;
  const section49CurrentVersion = section49Requirement?.versions.find((version: any) => version.isCurrent) ?? section49Requirement?.versions?.[0] ?? null;
  const section49EffectiveValidityDate = section49Flag?.validityDate || section49CurrentVersion?.validityDate || null;
  const section49ValiditySummary = getValiditySummary(section49EffectiveValidityDate);
  const section49WarningActive = Boolean(
    section49Requirement &&
    section49EffectiveValidityDate &&
    ["warning", "destructive"].includes(section49ValiditySummary?.tone || ""),
  );

  // Custom Document Requirements Configuration State additions
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [viewingVersion, setViewingVersion] = useState<any | null>(null);
  const [proceedErrors, setProceedErrors] = useState<string[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [highlightedDocumentReqId, setHighlightedDocumentReqId] = useState<string | null>(null);
  const documentRequirementCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const uploadDocumentModalRequirement = uploadDocumentModalReqId
    ? documentRequirements.find((req) => req.id === uploadDocumentModalReqId) ?? null
    : null;

  useEffect(() => {
    if (activeTab !== "docs" || !selectedDocumentRequirementId) {
      return;
    }

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const clickedInsideDocumentCard = Object.values(documentRequirementCardRefs.current).some((cardElement) =>
        cardElement?.contains(target),
      );
      const clickedInsidePreviewDrawer = previewDrawerRef.current?.contains(target);
      const clickedInsideDropzone = dropzoneRef.current?.contains(target);
      const clickedInsideOverlay = target instanceof Element && Boolean(target.closest('[role="dialog"], [data-radix-popper-content-wrapper]'));

      if (clickedInsideDocumentCard || clickedInsidePreviewDrawer || clickedInsideDropzone || clickedInsideOverlay) {
        return;
      }

      setSelectedDocumentRequirementId(null);
      setIsDocumentDrawerOpen(false);
      setPreviewOffset(0);
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return () => document.removeEventListener("pointerdown", handleDocumentPointerDown);
  }, [activeTab, selectedDocumentRequirementId]);

  useEffect(() => {
    if (viewingVersion) {
      setLoadingPreview(true);
    }
  }, [viewingVersion?.id]);

  useEffect(() => {
    if (initialTab && ["overview", "docs", "additionalData", "checklist", "filing", "advances", "expenses", "audit"].includes(initialTab)) {
      setActiveTab(initialTab as WorkspaceTab);
    }
    if (focusField === "deliveryOrderValidity" || focusField === "deliveryOrderExtensionDate") {
      const timer = setTimeout(() => {
        const input = document.getElementById(focusField);
        if (input instanceof HTMLInputElement) {
          input.scrollIntoView({ behavior: "smooth", block: "center" });
          input.focus();
          input.click();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialTab, focusField]);

  useEffect(() => {
    if (!highlightedDocumentReqId || activeTab !== "docs") {
      return;
    }

    const timer = window.setTimeout(() => {
      const card = documentRequirementCardRefs.current[highlightedDocumentReqId];
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [activeTab, highlightedDocumentReqId]);

  useEffect(() => {
    if (highlightedDocumentReqId && highlightedDocumentReqId !== firstUnresolvedMandatoryDocumentId) {
      setHighlightedDocumentReqId(null);
    }
  }, [firstUnresolvedMandatoryDocumentId, highlightedDocumentReqId]);

  // Additional Data Form State
  const [vesselInwardDate, setVesselInwardDate] = useState(
    job.additionalData?.vesselInwardDate ? job.additionalData.vesselInwardDate.slice(0, 10) : ""
  );
  const [importGeneralManifest, setImportGeneralManifest] = useState(
    job.additionalData?.importGeneralManifest !== null && job.additionalData?.importGeneralManifest !== undefined
      ? String(job.additionalData.importGeneralManifest)
      : ""
  );
  const [exportGeneralManifest, setExportGeneralManifest] = useState(
    job.additionalData?.exportGeneralManifest !== null && job.additionalData?.exportGeneralManifest !== undefined
      ? String(job.additionalData.exportGeneralManifest)
      : ""
  );
  const [customManifestValue, setCustomManifestValue] = useState(
    job.additionalData?.customManifestValue !== null && job.additionalData?.customManifestValue !== undefined
      ? String(job.additionalData.customManifestValue)
      : ""
  );
  const [containerEntries, setContainerEntries] = useState<ContainerEntry[]>(
    normalizeContainerEntries(job.additionalData?.containerDetails)
  );
  const [mblNumber, setMblNumber] = useState(job.additionalData?.mblNumber || "");
  const [hblNumber, setHblNumber] = useState(job.additionalData?.hblNumber || "");
  const [deliveryOrderValidity, setDeliveryOrderValidity] = useState(
    job.additionalData?.deliveryOrderValidity ? job.additionalData.deliveryOrderValidity.slice(0, 10) : ""
  );
  const additionalDataDraftHydratedRef = useRef(false);
  const additionalDataDraftStorageKey = getAdditionalDataDraftStorageKey(job.id);
  const initialAdditionalDataDraft: AdditionalDataDraft = {
    vesselInwardDate: job.additionalData?.vesselInwardDate ? job.additionalData.vesselInwardDate.slice(0, 10) : "",
    importGeneralManifest:
      job.additionalData?.importGeneralManifest !== null && job.additionalData?.importGeneralManifest !== undefined
        ? String(job.additionalData.importGeneralManifest)
        : "",
    exportGeneralManifest:
      job.additionalData?.exportGeneralManifest !== null && job.additionalData?.exportGeneralManifest !== undefined
        ? String(job.additionalData.exportGeneralManifest)
        : "",
    customManifestValue:
      job.additionalData?.customManifestValue !== null && job.additionalData?.customManifestValue !== undefined
        ? String(job.additionalData.customManifestValue)
        : "",
    containerEntries: normalizeContainerEntries(job.additionalData?.containerDetails),
    mblNumber: job.additionalData?.mblNumber || "",
    hblNumber: job.additionalData?.hblNumber || "",
    deliveryOrderValidity: job.additionalData?.deliveryOrderValidity
      ? job.additionalData.deliveryOrderValidity.slice(0, 10)
      : "",
  };

  // Checklist Workflow State
  const [checklistFile, setChecklistFile] = useState<File | null>(null);
  const [checklistRemarks, setChecklistRemarks] = useState("");
  const [internalApprovalRemarks, setInternalApprovalRemarks] = useState("");
  const [customerApprovalRemarks, setCustomerApprovalRemarks] = useState("");
  const [customerMailSubject, setCustomerMailSubject] = useState("");
  const [customerMailBody, setCustomerMailBody] = useState("");
  const [customerMailAttachments, setCustomerMailAttachments] = useState<File[]>([]);

  // Filing Form State
  const [newEstFilingDate, setNewEstFilingDate] = useState("");
  const [filingRef, setFilingRef] = useState("");
  const [actualFilingDate, setActualFilingDate] = useState("");
  const [delayReason, setDelayReason] = useState("");
  const [filedBillCopyFile, setFiledBillCopyFile] = useState<File | null>(null);
  const [billOfEntryNumber, setBillOfEntryNumber] = useState(job.filing?.billOfEntryNumber || "");
  const [shippingBillNumber, setShippingBillNumber] = useState(job.filing?.shippingBillNumber || "");
  const filingShipmentType = job.shipmentType?.name?.trim() || job.filing?.filingShipmentType || "";

  // --- FILING WORKFLOW RUNNER STATES ---
  const [filingInstance, setFilingInstance] = useState<any>(null);
  const [activeNodeRun, setActiveNodeRun] = useState<any>(null);
  const [filingCompletionAnnouncement, setFilingCompletionAnnouncement] = useState("");
  const [filingValidationWarning, setFilingValidationWarning] = useState<FilingValidationWarning | null>(null);
  const [checklistResponses, setChecklistResponses] = useState<Record<string, { isChecked: boolean; remarks?: string; fileKey?: string; delayRemarks?: string }>>({});
  const [filingFieldValues, setFilingFieldValues] = useState<Record<string, string>>({});
  const [filingToggleStates, setFilingToggleStates] = useState<Record<string, boolean>>({});
  const [filingToggleStateDetails, setFilingToggleStateDetails] = useState<Record<string, { isEnabled: boolean; state: Record<string, unknown> | null }>>({});
  const [filingQueryTitle, setFilingQueryTitle] = useState("");
  const [filingQueryDetails, setFilingQueryDetails] = useState("");
  const [filingQueryReferenceNumber, setFilingQueryReferenceNumber] = useState("");
  const [filingQueryOfficerName, setFilingQueryOfficerName] = useState("");
  const [attachmentValidityDrafts, setAttachmentValidityDrafts] = useState<Record<string, string>>({});
  const [attachmentValidityEditors, setAttachmentValidityEditors] = useState<Record<string, boolean>>({});
  const [filingQueryReceivedAt, setFilingQueryReceivedAt] = useState("");
  const [filingQueryStatusUpdates, setFilingQueryStatusUpdates] = useState<Record<string, string>>({});
  const [filingQueryResponderNames, setFilingQueryResponderNames] = useState<Record<string, string>>({});
  const [queryToggleOffModalOpen, setQueryToggleOffModalOpen] = useState(false);
  const [queryToggleOffRemarks, setQueryToggleOffRemarks] = useState("");
  const [executionTimelineModalOpen, setExecutionTimelineModalOpen] = useState(false);
  const [queryProcessingPanelExpanded, setQueryProcessingPanelExpanded] = useState(false);
  const [goBackOpen, setGoBackOpen] = useState(false);
  const [goBackMode, setGoBackMode] = useState<"previous" | "return">("previous");
  const [goBackReason, setGoBackReason] = useState("");
  const [selectedJumpBackNodeKey, setSelectedJumpBackNodeKey] = useState("");
  const [blockedPrerequisiteModalOpen, setBlockedPrerequisiteModalOpen] = useState(false);
  const [nodeRemarks, setNodeRemarks] = useState("");
  const [nodeDelayRemarks, setNodeDelayRemarks] = useState("");
  const [selectedNextNodeKey, setSelectedNextNodeKey] = useState<string>("");
  const additionalDataAutosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filingAutosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const additionalDataAutosaveInFlightRef = useRef(false);
  const filingAutosaveInFlightRef = useRef(false);
  const lastAdditionalDataAutosaveKeyRef = useRef<string>("");
  const lastFilingAutosaveKeyRef = useRef<string>("");
  const additionalDataAutosaveErrorShownRef = useRef(false);
  const filingAutosaveErrorShownRef = useRef(false);
  const filingDraftHydratedForRef = useRef<string | null>(null);
  const filingDraftStorageKey = activeNodeRun?.id ? getFilingNodeDraftStorageKey(job.id, activeNodeRun.id) : null;
  const activeWorkflowVersionNode = useMemo(() => {
    if (!activeNodeRun?.nodeKey) return null;
    return filingInstance?.version?.nodes?.find((node: any) => node.key === activeNodeRun.nodeKey) ?? null;
  }, [activeNodeRun?.nodeKey, filingInstance?.version?.nodes]);

  useEffect(() => {
    setBillOfEntryNumber(job.filing?.billOfEntryNumber || "");
    setShippingBillNumber(job.filing?.shippingBillNumber || "");
  }, [job.filing?.billOfEntryNumber, job.filing?.shippingBillNumber]);

  useEffect(() => {
    const textarea = nodeRemarksTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [nodeRemarks, activeNodeRun?.id]);

  useEffect(() => {
    if (additionalDataDraftHydratedRef.current) return;

    additionalDataDraftHydratedRef.current = true;

    try {
      const savedDraft = localStorage.getItem(additionalDataDraftStorageKey);
      if (!savedDraft) return;

      const parsedDraft = normalizeAdditionalDataDraft(JSON.parse(savedDraft));
      if (!parsedDraft) {
        localStorage.removeItem(additionalDataDraftStorageKey);
        return;
      }

      setVesselInwardDate(parsedDraft.vesselInwardDate);
      setImportGeneralManifest(parsedDraft.importGeneralManifest);
      setExportGeneralManifest(parsedDraft.exportGeneralManifest);
      setCustomManifestValue(parsedDraft.customManifestValue);
      setContainerEntries(parsedDraft.containerEntries);
      setMblNumber(parsedDraft.mblNumber);
      setHblNumber(parsedDraft.hblNumber);
      setDeliveryOrderValidity(parsedDraft.deliveryOrderValidity);
    } catch {
      localStorage.removeItem(additionalDataDraftStorageKey);
    }
  }, [additionalDataDraftStorageKey]);

  const clearAdditionalDataDraft = () => {
    try {
      localStorage.removeItem(additionalDataDraftStorageKey);
    } catch {
      // localStorage unavailable
    }
  };

  const markAdditionalDataManuallySaved = () => {
    setHasManuallySavedAdditionalData(true);
    try {
      localStorage.setItem(additionalDataManualSaveStorageKey, "true");
    } catch {
      // localStorage unavailable
    }
  };

  useEffect(() => {
    if (!additionalDataDraftHydratedRef.current) return;

    const currentDraft: AdditionalDataDraft = {
      vesselInwardDate,
      importGeneralManifest,
      exportGeneralManifest,
      customManifestValue,
      containerEntries,
      mblNumber,
      hblNumber,
      deliveryOrderValidity,
    };

    try {
      if (JSON.stringify(currentDraft) === JSON.stringify(initialAdditionalDataDraft)) {
        localStorage.removeItem(additionalDataDraftStorageKey);
        return;
      }

      localStorage.setItem(additionalDataDraftStorageKey, JSON.stringify(currentDraft));
    } catch {
      // localStorage unavailable
    }
  }, [
    additionalDataDraftStorageKey,
    containerEntries,
    customManifestValue,
    deliveryOrderValidity,
    exportGeneralManifest,
    hblNumber,
    importGeneralManifest,
    initialAdditionalDataDraft,
    mblNumber,
    vesselInwardDate,
  ]);

  const outgoingEdges = useMemo(() => {
    if (!filingInstance || !activeNodeRun) return [];
    return filingInstance.version?.edges?.filter((e: any) => e.sourceKey === activeNodeRun.nodeKey) || [];
  }, [filingInstance, activeNodeRun]);
  const isFinalFilingNode = Boolean(
    activeNodeRun &&
    (activeNodeRun.node?.nodeType === "END" || outgoingEdges.length === 0),
  );

  const targetNodesMap = useMemo(() => {
    if (!filingInstance) return new Map();
    return new Map(filingInstance.version?.nodes?.map((n: any) => [n.key, n]) || []);
  }, [filingInstance]);

  const overdueChecklistItems = useMemo(() => filingInstance?.overdueItems || [], [filingInstance]);
  const overdueChecklistCount = overdueChecklistItems.length;
  const activeNodeAttachments = useMemo(
    () => filingInstance?.attachments?.filter((attachment: any) => attachment.nodeRunId === activeNodeRun?.id) || [],
    [activeNodeRun?.id, filingInstance?.attachments],
  );
  const activeNodeDocumentAttachmentsByKey = useMemo(() => {
    const map = new Map<string, any>();
    for (const attachment of activeNodeAttachments) {
      if (!attachment.documentRequirementKey) continue;
      const current = map.get(attachment.documentRequirementKey);
      if (!current) {
        map.set(attachment.documentRequirementKey, attachment);
        continue;
      }
      const currentUploadedAt = current.uploadedAt ? new Date(current.uploadedAt).getTime() : 0;
      const nextUploadedAt = attachment.uploadedAt ? new Date(attachment.uploadedAt).getTime() : 0;
      if (nextUploadedAt >= currentUploadedAt) {
        map.set(attachment.documentRequirementKey, attachment);
      }
    }
    return map;
  }, [activeNodeAttachments]);
  const activeChecklistItems = useMemo(
    () => activeNodeRun?.node?.checklistItems?.filter((item: any) => item.isActive !== false) || [],
    [activeNodeRun],
  );
  const checklistAttachmentsByItem = useMemo(() => {
    const map = new Map<string, any[]>();
    const attachments =
      filingInstance?.attachments?.filter((attachment: any) => attachment.nodeRunId === activeNodeRun?.id && attachment.checklistItemId) || [];

    for (const attachment of attachments) {
      const itemId = attachment.checklistItemId;
      if (!map.has(itemId)) {
        map.set(itemId, []);
      }
      map.get(itemId)?.push(attachment);
    }

    return map;
  }, [activeNodeRun?.id, filingInstance?.attachments]);
  const activeNodeDocumentRequirements = useMemo(() => {
    const raw =
      activeNodeRun?.node?.documentRequirementsJson ??
      activeNodeRun?.node?.documentRequirements ??
      activeWorkflowVersionNode?.documentRequirementsJson ??
      activeWorkflowVersionNode?.documentRequirements ??
      [];
    return Array.isArray(raw) ? raw : [];
  }, [
    activeNodeRun?.node?.documentRequirements,
    activeNodeRun?.node?.documentRequirementsJson,
    activeWorkflowVersionNode?.documentRequirements,
    activeWorkflowVersionNode?.documentRequirementsJson,
  ]);
  const activeNodeHasConfiguredStageUploads =
    activeNodeDocumentRequirements.length > 0 || (activeNodeRun?.node?.photoRequirements?.length ?? 0) > 0;
  const isLegacyStageChecklistUpload = (item: any) => activeNodeHasConfiguredStageUploads && item.allowsUpload;
  const checklistItemAllowsDirectUpload = (item: any) => item.allowsUpload && !isLegacyStageChecklistUpload(item);
  const currentChecklistItemIndex = useMemo(() => {
    if (activeChecklistItems.length === 0) return -1;

    const getAttachmentCount = (itemId: string) => checklistAttachmentsByItem.get(itemId)?.length || 0;
    const isItemReady = (item: any) => {
      const resp = checklistResponses[item.id];
      if (!resp?.isChecked) return false;
      if (item.requiresRemarks && !resp.remarks?.trim()) return false;

      const overdueMeta = overdueChecklistItems.find((entry: any) => entry.checklistItemId === item.id);
      if (overdueMeta && item.delayRemarksRequired && !resp.delayRemarks?.trim()) return false;

      if (checklistItemAllowsDirectUpload(item) && (item.minUploads || 0) > 0 && getAttachmentCount(item.id) < item.minUploads) {
        return false;
      }

      return true;
    };

    const firstPendingIndex = activeChecklistItems.findIndex((item: any) => !isItemReady(item));
    return firstPendingIndex === -1 ? activeChecklistItems.length - 1 : firstPendingIndex;
  }, [
    activeChecklistItems,
    activeNodeDocumentRequirements.length,
    activeNodeHasConfiguredStageUploads,
    activeNodeRun?.node?.name,
    checklistAttachmentsByItem,
    checklistResponses,
    overdueChecklistItems,
  ]);
  const markChecklistItemForReverification = (
    checklistItemId: string,
    updates?: Partial<{ remarks?: string; fileKey?: string; delayRemarks?: string }>,
  ) => {
    setChecklistResponses((prev) => ({
      ...prev,
      [checklistItemId]: {
        ...(prev[checklistItemId] || { isChecked: false, remarks: "", fileKey: undefined, delayRemarks: "" }),
        ...updates,
        isChecked: false,
      },
    }));
  };
  const markLatestVerifiedChecklistItemForReverification = () => {
    for (let index = activeChecklistItems.length - 1; index >= 0; index -= 1) {
      const checklistItemId = activeChecklistItems[index]?.id;
      if (checklistItemId && checklistResponses[checklistItemId]?.isChecked) {
        markChecklistItemForReverification(checklistItemId);
        break;
      }
    }
  };
  const activeNodeQueries = useMemo(
    () => (filingInstance?.queries || []).filter((query: any) => query.nodeRunId === activeNodeRun?.id),
    [activeNodeRun?.id, filingInstance?.queries],
  );
  const activeNodeQueryMessages = useMemo(() => {
    const activeQueryIds = new Set(activeNodeQueries.map((query: any) => query.id));
    return (filingInstance?.queryMessages || []).filter((message: any) => activeQueryIds.has(message.queryId));
  }, [activeNodeQueries, filingInstance?.queryMessages]);
  const currentUserDisplayName = useMemo(
    () => users.find((user) => user.id === currentUserId)?.name || "Team Member",
    [currentUserId, users],
  );
  const activeNodeOpenQueries = useMemo(
    () => activeNodeQueries.filter((query: any) => query.status !== "CLOSED"),
    [activeNodeQueries],
  );
  const activeNodeFieldDefinitions = useMemo(() => {
    const raw =
      activeNodeRun?.node?.fieldDefinitionsJson ??
      activeNodeRun?.node?.fieldDefinitions ??
      activeWorkflowVersionNode?.fieldDefinitionsJson ??
      activeWorkflowVersionNode?.fieldDefinitions ??
      [];
    return Array.isArray(raw) ? raw : [];
  }, [
    activeNodeRun?.node?.fieldDefinitions,
    activeNodeRun?.node?.fieldDefinitionsJson,
    activeWorkflowVersionNode?.fieldDefinitions,
    activeWorkflowVersionNode?.fieldDefinitionsJson,
  ]);
  const activeNodeConditionalSections = useMemo(() => {
    const raw =
      activeNodeRun?.node?.conditionalSectionsJson ??
      activeNodeRun?.node?.conditionalSections ??
      activeWorkflowVersionNode?.conditionalSectionsJson ??
      activeWorkflowVersionNode?.conditionalSections ??
      [];
    return Array.isArray(raw) ? raw : [];
  }, [
    activeNodeRun?.node?.conditionalSections,
    activeNodeRun?.node?.conditionalSectionsJson,
    activeWorkflowVersionNode?.conditionalSections,
    activeWorkflowVersionNode?.conditionalSectionsJson,
  ]);
  const visibleNodeConditionalSections = useMemo(
    () =>
      activeNodeConditionalSections.filter((section: any) => {
        const key = typeof section?.key === "string" ? section.key.trim().toLowerCase() : "";
        const label = typeof section?.label === "string" ? section.label.trim().toLowerCase() : "";
        return key !== "query_processing" && key !== "section49" && label !== "customs query" && label !== "sec 49";
      }),
    [activeNodeConditionalSections],
  );
  const activeNodeFieldKeys = useMemo(
    () => new Set(activeNodeFieldDefinitions.map((field: any) => field.key)),
    [activeNodeFieldDefinitions],
  );
  const activeNodeDisplayName = activeNodeRun?.node?.name || "";
  const activeNodePrerequisiteStatus = filingInstance?.activeNodePrerequisiteStatus || null;
  const firstMissingPrerequisiteNodeKey = activeNodePrerequisiteStatus?.missingNodeKeys?.[0] || null;
  const firstMissingPrerequisiteNodeName = firstMissingPrerequisiteNodeKey
    ? targetNodesMap.get(firstMissingPrerequisiteNodeKey)?.name || firstMissingPrerequisiteNodeKey
    : null;
  const activeNodeSlaDueDate = activeNodeRun?.slaDueDate ? new Date(activeNodeRun.slaDueDate) : null;
  const activeNodeIsOverdue = !!activeNodeSlaDueDate && activeNodeSlaDueDate.getTime() < Date.now();
  const activeNodeDelayRemarksRequired = activeNodeIsOverdue && activeNodeRun?.node?.delayRemarksRequired !== false;
  const activeNodeDelayDays = activeNodeSlaDueDate
    ? Math.max(1, Math.ceil((Date.now() - activeNodeSlaDueDate.getTime()) / (24 * 60 * 60 * 1000)))
    : 0;
  const pendingBlockedStage = filingInstance?.pendingBlockedStage || null;
  const canResumePendingBlockedStage = !!filingInstance?.canResumePendingBlockedStage;
  const jumpBackTargets = filingInstance?.jumpBackTargets || [];
  const returnToCurrentTarget = filingInstance?.returnToCurrentTarget || null;
  const getWorkflowNodeOrder = (nodeKey: string | null | undefined) => {
    if (!nodeKey || !filingInstance?.version?.nodes) return null;
    const index = filingInstance.version.nodes.findIndex((node: any) => node.key === nodeKey);
    return index >= 0 ? index : null;
  };
  const activeNodeOrder = getWorkflowNodeOrder(activeNodeRun?.nodeKey);
  const returnToCurrentNodeOrder = getWorkflowNodeOrder(returnToCurrentTarget?.nodeKey);
  const returnToCurrentIsActuallyCurrent = Boolean(
    activeNodeRun &&
    returnToCurrentTarget &&
    (
      returnToCurrentTarget.nodeRunId === activeNodeRun.id ||
      returnToCurrentTarget.nodeKey === activeNodeRun.nodeKey ||
      (
        typeof activeNodeOrder === "number" &&
        typeof returnToCurrentNodeOrder === "number" &&
        returnToCurrentNodeOrder <= activeNodeOrder
      )
    ),
  );
  const showReturnToCurrentStageShortcut = Boolean(returnToCurrentTarget && activeNodeRun);
  const isActiveStageBlocked = !!activeNodePrerequisiteStatus?.isBlocked;
  const hasShipmentBillNumberField = activeNodeFieldKeys.has("bill_number");
  const activeNodeHasOnlyOptionalChecklistItems =
    activeChecklistItems.length > 0 && activeChecklistItems.every((item: any) => item.isMandatory === false);
  const isSkippingActiveOptionalNode =
    (!!activeNodeRun?.node?.canBeSkipped || activeNodeHasOnlyOptionalChecklistItems) &&
    activeChecklistItems.every((item: any) => !checklistResponses[item.id]?.isChecked);
  const activeNodeHasConditionalFields = visibleNodeConditionalSections.some(
    (section: any) => Array.isArray(section?.unlocksFields) && section.unlocksFields.length > 0,
  );
  const activeNodeHasConditionalDocuments = visibleNodeConditionalSections.some(
    (section: any) => Array.isArray(section?.unlocksDocuments) && section.unlocksDocuments.length > 0,
  );
  const queryProcessingSection = useMemo(() => {
    return (
      activeNodeConditionalSections.find((section: any) => section?.key === "query_processing") ||
      activeNodeConditionalSections.find((section: any) => section?.config?.moduleType === "CUSTOMS_QUERY_PROCESSING") ||
      null
    );
  }, [activeNodeConditionalSections]);
  const queryProcessingEnabled = Boolean(queryProcessingSection || activeNodeRun);
  const queryProcessingToggleEnabled = Boolean(filingToggleStateDetails.query_processing?.isEnabled);
  const queryProcessingState = (filingToggleStateDetails.query_processing?.state as Record<string, unknown> | null) ?? null;
  const queryProcessingActive = queryProcessingEnabled && queryProcessingToggleEnabled;
  const queryProcessingStage = useMemo(() => {
    if (!queryProcessingActive) return "DISABLED";
    const persistedStage =
      typeof queryProcessingState?.stage === "string" && queryProcessingState.stage.trim()
        ? queryProcessingState.stage.trim().toUpperCase()
        : "";
    if (activeNodeOpenQueries.length > 0) {
      return persistedStage === "RESPONDED" ? "RESPONDED" : "OPEN";
    }
    if (persistedStage) {
      return persistedStage;
    }
    if (activeNodeQueries.some((query: any) => query.status === "CLOSED")) {
      return "CLEARED";
    }
    return "AWAITING_QUERY_DECISION";
  }, [activeNodeOpenQueries.length, activeNodeQueries, queryProcessingActive, queryProcessingState]);
  const latestStageQuery = useMemo(() => {
    if (activeNodeQueries.length === 0) return null;

    const latestQueryId =
      typeof queryProcessingState?.latestQueryId === "string" && queryProcessingState.latestQueryId.trim()
        ? queryProcessingState.latestQueryId.trim()
        : null;
    if (latestQueryId) {
      const matchedQuery = activeNodeQueries.find((query: any) => query.id === latestQueryId);
      if (matchedQuery) return matchedQuery;
    }

    return [...activeNodeQueries].sort(
      (left: any, right: any) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )[0];
  }, [activeNodeQueries, queryProcessingState]);
  const primaryQuerySummary = activeNodeOpenQueries[0] || latestStageQuery || null;
  const clearedQueryCount = activeNodeQueries.filter((query: any) => query.status === "CLOSED").length;
  const repliedQueryCount = activeNodeQueries.filter((query: any) => query.status === "REPLIED").length;
  const queryProcessingResolved =
    !queryProcessingActive || queryProcessingStage === "NO_QUERY" || queryProcessingStage === "CLEARED";
  const isSavingQueryProcessingDecision = loading === "filing-toggle-query_processing";
  const filingPrimaryColumnClass = "w-full max-w-[680px] xl:col-start-1";
  const filingCompletionColumnClass = "flex h-full w-full flex-col space-y-4 xl:col-start-2 xl:self-stretch";
  const nextWorkflowTargetNode = outgoingEdges.length > 0 ? targetNodesMap.get(outgoingEdges[0].targetKey) : null;
  const nextWorkflowTargetLabel = nextWorkflowTargetNode?.name || outgoingEdges[0]?.label || "Final submission";
  const filingQueryReferenceLabel =
    typeof queryProcessingState?.queryReferenceNumber === "string" && queryProcessingState.queryReferenceNumber.trim()
      ? queryProcessingState.queryReferenceNumber
      : latestStageQuery?.title || "Not Recorded";
  const filingQueryReceivedLabel =
    typeof queryProcessingState?.queryReceivedAt === "string" && queryProcessingState.queryReceivedAt.trim()
      ? new Date(queryProcessingState.queryReceivedAt).toLocaleDateString("en-IN")
      : latestStageQuery?.createdAt
        ? new Date(latestStageQuery.createdAt).toLocaleDateString("en-IN")
        : "Not Recorded";
  const filingSummaryCards = [
    {
      key: "current-stage",
      title: "Current Stage",
      value: activeNodeDisplayName || "Pending",
      note: [activeNodeRun?.node?.sectionName, activeNodeRun?.node?.branchName].filter(Boolean).join(" / ") || "Workflow in progress",
      icon: <FolderOpen size={18} />,
      tone: "cyan" as const,
    },
    {
      key: "next-stage",
      title: "Next Stage",
      value: nextWorkflowTargetLabel,
      note: outgoingEdges.length > 0 ? "Next eligible routing step" : "Workflow completes after this step",
      icon: <ArrowRight size={18} />,
      tone: "green" as const,
    },
    {
      key: "queries",
      title: "Queries",
      value: String(activeNodeQueries.length),
      note:
        activeNodeQueries.length > 0
          ? `${activeNodeOpenQueries.length} open, ${repliedQueryCount} replied, ${clearedQueryCount} cleared`
          : "No query records for this stage",
      icon: <AlertCircle size={18} />,
      tone: "orange" as const,
    },
    {
      key: "open-cases",
      title: "Open Cases",
      value: String(activeNodeOpenQueries.length),
      note: activeNodeOpenQueries[0]?.title || latestStageQuery?.title || "No active cases",
      icon: <ShieldCheck size={18} />,
      tone: "cyan" as const,
    },
    {
      key: "received",
      title: "Received",
      value: filingQueryReceivedLabel,
      note: filingQueryReferenceLabel,
      icon: <Clock3 size={18} />,
      tone: "cyan" as const,
    },
  ] as const;
  const queryProcessingWarning = !queryProcessingActive
    ? null
    : !queryProcessingResolved
      ? {
        title:
          activeNodeOpenQueries.length > 0
            ? "Active Query Pending"
            : queryProcessingStage === "RESPONDED"
              ? "Awaiting Customs Outcome"
              : "Query Decision Required",
        description:
          activeNodeOpenQueries.length > 0
            ? "Resolve or clear the active customs query before moving to the next step."
            : queryProcessingStage === "RESPONDED"
              ? "Await the customs outcome and mark the query cleared once the offline response is accepted."
              : "Record the customs query outcome before moving to the next step.",
      }
      : null;
  const stageSummaryItems = [
    activeChecklistItems.length > 0 ? "checks" : null,
    activeNodeFieldDefinitions.length > 0 || activeNodeHasConditionalFields ? "fields" : null,
    activeNodeDocumentRequirements.length > 0 ||
      activeNodeHasConditionalDocuments ||
      (activeNodeRun?.node?.photoRequirements?.length ?? 0) > 0
      ? "uploads"
      : null,
    queryProcessingActive ? "query updates" : null,
    activeNodeRun?.node?.commentsRequired ? "remarks" : null,
  ].filter((item): item is string => Boolean(item));
  const stageSummaryText =
    activeNodeRun?.node?.nodeType === "DECISION"
      ? "Choose the correct filing path below, then record remarks before routing this stage forward."
      : stageSummaryItems.length > 0
        ? `Complete the required ${formatSummaryList(stageSummaryItems)} below before moving this filing to the next stage.`
        : "Review this stage and record any completion notes before moving this filing to the next stage.";
  const highlightedChecklistItem =
    activeChecklistItems[Math.max(currentChecklistItemIndex, 0)] ?? activeChecklistItems[0] ?? null;
  const highlightedChecklistPosition =
    activeChecklistItems.length > 0 ? `Item ${Math.max(currentChecklistItemIndex, 0) + 1} of ${activeChecklistItems.length}` : null;
  const highlightedChecklistDeadline = highlightedChecklistItem
    ? `${highlightedChecklistItem.deadlineDuration || 2} ${highlightedChecklistItem.deadlineUnit === "HOURS"
      ? "HR"
      : highlightedChecklistItem.deadlineUnit === "DAYS"
        ? "DAY"
        : "BD"
    }`
    : null;
  // Go-back is available on every filing stage that has a completed predecessor.
  const hasPreviousFilingStage =
    !!activeNodeRun &&
    (filingInstance?.nodeRuns || []).some(
      (run: any) => run.status === "COMPLETED" && run.nodeKey !== activeNodeRun.nodeKey,
    );

  useEffect(() => {
    setQueryProcessingPanelExpanded(false);
  }, [activeNodeRun?.id]);

  useEffect(() => {
    if (isActiveStageBlocked && (activeNodePrerequisiteStatus?.missingNodeKeys || []).length > 0) {
      setBlockedPrerequisiteModalOpen(true);
      return;
    }
    setBlockedPrerequisiteModalOpen(false);
  }, [
    activeNodeRun?.id,
    isActiveStageBlocked,
    activeNodePrerequisiteStatus?.missingNodeKeys,
  ]);

  useEffect(() => {
    if (!queryProcessingActive) {
      setQueryProcessingPanelExpanded(false);
    }
  }, [queryProcessingActive]);


  // Customer Advance Form State
  const [expectedAdvance, setExpectedAdvance] = useState(
    job.customerAdvance?.expectedAmount ? Number(job.customerAdvance.expectedAmount) : 0
  );
  const [advanceDueDate, setAdvanceDueDate] = useState(
    job.customerAdvance?.dueDate ? job.customerAdvance.dueDate.slice(0, 10) : ""
  );
  const [advanceAssigneeId, setAdvanceAssigneeId] = useState(
    job.customerAdvance?.assignedUserId || ""
  );
  const [waiveAdvanceReason, setWaiveAdvanceReason] = useState("");
  const [showWaiveAdvance, setShowWaiveAdvance] = useState(false);

  // Advance Receipt Form State
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [receiptMethod, setReceiptMethod] = useState("NEFT");
  const [receiptRef, setReceiptRef] = useState("");
  const [receiptRemarks, setReceiptRemarks] = useState("");

  // Expense Request Form State
  const [expenseUrgent, setExpenseUrgent] = useState(false);
  const [expenseUrgencyReason, setExpenseUrgencyReason] = useState("");
  const [expenseUpiNumber, setExpenseUpiNumber] = useState("");
  const [expenseUpiId, setExpenseUpiId] = useState("");
  const [expandedJobExpenseId, setExpandedJobExpenseId] = useState<string | null>(job.expenseRequests?.[0]?.id ?? null);
  const [expenseLines, setExpenseLines] = useState<
    { category: string; purpose: string; amount: string; requiredDate: string; remarks: string; receiptFiles: File[] }[]
  >([{ category: expenseCategories[0] || "", purpose: "", amount: "", requiredDate: "", remarks: "", receiptFiles: [] }]);

  // Expense Escalation Form State
  const [escUrgencyReason, setEscUrgencyReason] = useState("");
  const [escRequestId, setEscRequestId] = useState<string | null>(null);

  // Manager Review Checklist Comment
  const [mgrApprovalComment, setMgrApprovalComment] = useState("");

  // Payment Post Details Form State
  const [payRequestId, setPayRequestId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payMethod, setPayMethod] = useState("BANK_TRANSFER");
  const [payRef, setPayRef] = useState("");
  const [payProofFiles, setPayProofFiles] = useState<File[]>([]);

  // Query Form State
  const [queryRequestId, setQueryRequestId] = useState<string | null>(null);
  const [queryText, setQueryText] = useState("");
  const [resolveQueryId, setResolveQueryId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");

  // Administrative Expense Review Action State
  const [expReviewId, setExpReviewId] = useState<string | null>(null);
  const [expReviewStatus, setExpReviewStatus] = useState<string>("");
  const [expReviewRemarks, setExpReviewRemarks] = useState("");
  const [expenseClarificationId, setExpenseClarificationId] = useState<string | null>(null);
  const [expenseClarificationText, setExpenseClarificationText] = useState("");
  const [deleteModalMode, setDeleteModalMode] = useState<"delete" | "approve" | "reject" | null>(null);
  const [deleteConfirmJobNumber, setDeleteConfirmJobNumber] = useState("");
  const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState("");
  const [deleteDecisionRemarks, setDeleteDecisionRemarks] = useState("");
  const [deleteDocModal, setDeleteDocModal] = useState<{
    reqId: string;
    versionId: string;
    fileName: string;
  } | null>(null);

  // Get active step index
  const activeStepIndex = STAGES.findIndex((s) => s.key === job.stage);
  const checklistStageIndex = STAGES.findIndex((s) => s.key === "CHECKLIST_PREPARATION");
  const filingStageIndex = STAGES.findIndex((s) => s.key === "FILING");
  const manifestRequirement = job.jobType?.manifestRequirement || null;
  const manifestMovementDirection = job.jobType?.movementDirection || null;
  const customManifestLabel = job.jobType?.customManifestLabel || "Custom Manifest";
  const manifestLabel =
    manifestRequirement === "IGM"
      ? "IGM Number"
      : manifestRequirement === "EGM"
        ? "EGM Number"
        : manifestRequirement === "BOTH"
          ? "IGM + EGM"
          : manifestRequirement === "CUSTOM"
            ? customManifestLabel
            : manifestRequirement === "NONE"
              ? "None"
              : "Not Configured";
  const manifestConfigMissing =
    !manifestMovementDirection ||
    !manifestRequirement ||
    (manifestRequirement === "CUSTOM" && !job.jobType?.customManifestLabel);
  const filingMovementDirection =
    manifestMovementDirection === "IMPORT" || manifestMovementDirection === "EXPORT"
      ? manifestMovementDirection
      : null;
  const isImportFiling = filingMovementDirection === "IMPORT";
  const isExportFiling = filingMovementDirection === "EXPORT";
  const filingBillNumberValue = isExportFiling ? shippingBillNumber : billOfEntryNumber;

  // Keep the bill number in sync between the filing stage input and the
  // shipment-level bill number field stored on the job.
  const setBillNumberEverywhere = (value: string) => {
    setFilingFieldValues((prev) => ({ ...prev, bill_number: value }));
    if (isExportFiling) {
      setShippingBillNumber(value);
      setBillOfEntryNumber("");
    } else {
      setBillOfEntryNumber(value);
      setShippingBillNumber("");
    }
  };

  // Seed the filing-stage bill number from the saved shipment bill number once
  // per active stage, so previously saved data stays visible.
  const billNumberSeededRunRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeNodeRun?.id) return;
    if (billNumberSeededRunRef.current === activeNodeRun.id) return;
    billNumberSeededRunRef.current = activeNodeRun.id;
    const savedBillNumber = filingBillNumberValue.trim();
    if (savedBillNumber) {
      setFilingFieldValues((prev) =>
        prev.bill_number?.trim() ? prev : { ...prev, bill_number: savedBillNumber },
      );
    }
  }, [activeNodeRun?.id, filingBillNumberValue]);
  const requiresIgm = manifestRequirement === "IGM" || manifestRequirement === "BOTH";
  const requiresEgm = manifestRequirement === "EGM" || manifestRequirement === "BOTH";
  const requiresCustomManifest = manifestRequirement === "CUSTOM";
  const manifestMandatory = job.jobType?.isManifestMandatory ?? false;
  const additionalDataComplete = Boolean(
    vesselInwardDate &&
    deliveryOrderValidity &&
    (!manifestMandatory || manifestRequirement === "NONE" || (
      (!requiresIgm || importGeneralManifest !== "") &&
      (!requiresEgm || exportGeneralManifest !== "") &&
      (!requiresCustomManifest || customManifestValue !== "")
    ))
  );
  const hasPersistedAdditionalData = hasManuallySavedAdditionalData || activeStepIndex > 1;
  const canEditAdditionalData = canUpdateJob && additionalDataStageAvailable && hasPersistedAdditionalData;
  const additionalDataLocked = !additionalDataStageAvailable || !canUpdateJob || (hasPersistedAdditionalData && !isAdditionalDataEditing);

  const addContainerEntry = () => {
    setContainerEntries((current) => [...current, getDefaultContainerEntry()]);
  };

  const updateContainerEntry = (index: number, field: keyof ContainerEntry, value: string) => {
    setContainerEntries((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [field]: value } : entry))
    );
  };

  const removeContainerEntry = (index: number) => {
    setContainerEntries((current) => {
      if (current.length === 1) {
        return [getDefaultContainerEntry()];
      }
      return current.filter((_, entryIndex) => entryIndex !== index);
    });
  };
  const populatedContainerCount = containerEntries.filter((entry) => entry.containerNumber.trim()).length;
  const manifestPreview = requiresCustomManifest
    ? customManifestValue || "Pending"
    : requiresIgm && requiresEgm
      ? `${importGeneralManifest || "IGM Pending"} / ${exportGeneralManifest || "EGM Pending"}`
      : requiresIgm
        ? importGeneralManifest || "Pending"
        : requiresEgm
          ? exportGeneralManifest || "Pending"
          : "Not Required";
  const blPreview = mblNumber || hblNumber
    ? [mblNumber && `MBL: ${mblNumber}`, hblNumber && `HBL: ${hblNumber}`].filter(Boolean).join(" / ")
    : "Pending";
  const activeDeletionRequest =
    job.deletionRequests?.find((request: any) => ["PENDING", "APPROVED"].includes(request.status)) ?? null;
  const pendingDeletionReview =
    job.deletionRequests?.find(
      (request: any) => request.status === "PENDING" && request.assignedManagerId === currentUserId
    ) ?? null;
  const canDirectDeleteJob =
    canApproveDeleteJob &&
    job.assignments?.some((assignment: any) => assignment.userId === currentUserId && assignment.responsibility === "APPROVAL");
  const isConcernedExpenseManager =
    job.primaryOwnerId === currentUserId ||
    job.assignedManagerId === currentUserId ||
    job.assignments?.some((assignment: any) => assignment.userId === currentUserId && assignment.responsibility === "APPROVAL");
  const isAssignedExpenseAccountsUser = job.assignments?.some(
    (assignment: any) => assignment.userId === currentUserId && assignment.responsibility === "ACCOUNTS",
  );
  const canReviewExpenseRequests = Boolean(canManageExpenses || isConcernedExpenseManager);
  const canProcessExpensePayments = Boolean(canPayExpenses || isAssignedExpenseAccountsUser);
  const canCreateExpenseRequests = Boolean(canRequestExpenses);
  const deleteInputsMatch =
    deleteConfirmJobNumber.trim() === job.jobNumber &&
    deleteConfirmPhrase.trim().toLowerCase() === "delete job";
  const checklistWorkflow = job.checklistWorkflow ?? null;
  const currentChecklistVersion = checklistWorkflow?.currentFileVersion ?? checklistWorkflow?.fileVersions?.[0] ?? null;

  useEffect(() => {
    if (["docs", "additionalData", "checklist", "filing", "expenses"].includes(activeTab)) {
      if (pendingStageNavigationRef.current) {
        setExpandedStageKey(pendingStageNavigationRef.current);
        pendingStageNavigationRef.current = null;
        return;
      }
      if (activeTab === "docs") setExpandedStageKey("DOCUMENT_COLLECTION");
      else if (activeTab === "additionalData") setExpandedStageKey("ADDITIONAL_DATA");
      else if (activeTab === "checklist") {
        setExpandedStageKey("CHECKLIST");
      }
      else if (activeTab === "filing") setExpandedStageKey(job.stage === "FILED" ? "FILED" : "FILING");
    } else {
      setExpandedStageKey(null);
    }
  }, [activeTab, job.stage, currentChecklistVersion]);

  const animateStageScrollIntoView = (stageKey: string, attempt = 0) => {
    const target = document.getElementById(`workflow-stage-${stageKey.toLowerCase()}`);
    if (!target) {
      if (attempt < 8) {
        window.setTimeout(() => animateStageScrollIntoView(stageKey, attempt + 1), 70);
      }
      return;
    }

    if (stageScrollAnimationRef.current !== null) {
      window.clearTimeout(stageScrollAnimationRef.current);
      stageScrollAnimationRef.current = null;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
    stageScrollAnimationRef.current = window.setTimeout(() => {
      target.animate(
        [
          { transform: "translateY(10px) scale(0.985)", filter: "brightness(0.985)" },
          { transform: "translateY(-2px) scale(1.008)", filter: "brightness(1.02)" },
          { transform: "translateY(0) scale(1)", filter: "brightness(1)" },
        ],
        {
          duration: 460,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      );
      stageScrollAnimationRef.current = null;
    }, 360);
  };

  const openWorkflowStage = (stageKey: string) => {
    const uiStageKey = stageKey === "FILED" || stageKey === "EXPENSES" ? stageKey : getWorkflowUiStageKey(stageKey);
    const targetTab =
      uiStageKey === "DOCUMENT_COLLECTION"
        ? "docs"
        : uiStageKey === "ADDITIONAL_DATA"
          ? "additionalData"
          : uiStageKey === "CHECKLIST"
            ? "checklist"
            : uiStageKey === "EXPENSES"
              ? "expenses"
              : "filing";

    pendingStageNavigationRef.current = uiStageKey;
    pendingStageScrollRef.current = uiStageKey;
    setExpandedStageKey(uiStageKey);

    setActiveTab(targetTab);

    window.setTimeout(() => {
      animateStageScrollIntoView(uiStageKey);
    }, 80);

    if (activeTab === targetTab && expandedStageKey === uiStageKey) {
      pendingStageScrollRef.current = null;
      animateStageScrollIntoView(uiStageKey);
    }

    setStageFocusKey(uiStageKey);
    if (stageFocusTimeoutRef.current !== null) {
      window.clearTimeout(stageFocusTimeoutRef.current);
    }
    stageFocusTimeoutRef.current = window.setTimeout(() => setStageFocusKey(null), 1100);
  };

  const handleMilestoneToggle = (stageKey: string) => {
    const isExpanded = expandedStageKey === stageKey;
    if (isExpanded) {
      setExpandedStageKey(null);
      return;
    }

    openWorkflowStage(stageKey);
  };

  const navigateToWorkspaceTab = (tab: WorkspaceTab) => {
    if (tab === "docs") {
      openWorkflowStage("DOCUMENT_COLLECTION");
      return;
    }
    if (tab === "additionalData") {
      openWorkflowStage("ADDITIONAL_DATA");
      return;
    }
    if (tab === "checklist") {
      openWorkflowStage("CHECKLIST");
      return;
    }
    if (tab === "filing") {
      openWorkflowStage(job.stage === "FILED" ? "FILED" : "FILING");
      return;
    }
    setActiveTab(tab);
    if (tab === "overview") {
      window.setTimeout(() => {
        animateStageScrollIntoView("OVERVIEW");
      }, 80);
    }
  };

  const checklistApprovals = checklistWorkflow?.approvals ?? [];
  const latestCustomerMailLog = checklistWorkflow?.customerMailLogs?.[0] ?? null;
  const customerApprovalVisibleAt = checklistWorkflow?.customerApprovalVisibleAt
    ? new Date(checklistWorkflow.customerApprovalVisibleAt)
    : latestCustomerMailLog?.approvalVisibleAt
      ? new Date(latestCustomerMailLog.approvalVisibleAt)
      : null;
  const customerApprovalDelayRemainingMs = customerApprovalVisibleAt
    ? Math.max(customerApprovalVisibleAt.getTime() - customerApprovalNow, 0)
    : 0;
  const customerApprovalDelayElapsed = customerApprovalVisibleAt ? customerApprovalDelayRemainingMs === 0 : false;
  const customerApprovalCountdown = customerApprovalVisibleAt
    ? `${String(Math.floor(customerApprovalDelayRemainingMs / 60000)).padStart(2, "0")}:${String(
      Math.floor((customerApprovalDelayRemainingMs % 60000) / 1000),
    ).padStart(2, "0")}`
    : null;
  useEffect(() => {
    setCustomerApprovalNow(Date.now());
  }, [checklistWorkflow?.currentApprovalStage, latestCustomerMailLog?.id, latestCustomerMailLog?.approvalVisibleAt]);

  useEffect(() => {
    if (
      checklistWorkflow?.currentApprovalStage !== "CUSTOMER" ||
      !latestCustomerMailLog ||
      !customerApprovalVisibleAt ||
      customerApprovalDelayElapsed
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      setCustomerApprovalNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [
    checklistWorkflow?.currentApprovalStage,
    latestCustomerMailLog?.id,
    customerApprovalVisibleAt,
    customerApprovalDelayElapsed,
  ]);
  const currentInternalApprovals = checklistApprovals.filter(
    (approval: any) =>
      approval.fileVersionId === currentChecklistVersion?.id &&
      approval.stage === "INTERNAL",
  );
  const currentCustomerApprovals = checklistApprovals.filter(
    (approval: any) =>
      approval.fileVersionId === currentChecklistVersion?.id &&
      approval.stage === "CUSTOMER",
  );
  const latestCustomerResponse = (checklistWorkflow?.customerResponses ?? []).find((response: any) => {
    if (!currentChecklistVersion?.uploadedAt) return true;
    return new Date(response.submittedAt).getTime() >= new Date(currentChecklistVersion.uploadedAt).getTime();
  }) ?? null;
  const portalCustomerDecision = latestCustomerResponse
    ? {
      id: `portal-response-${latestCustomerResponse.id}`,
      fileVersionId: currentChecklistVersion?.id,
      stage: "CUSTOMER",
      action: latestCustomerResponse.decision,
      assignedToId: null,
      actedById: null,
      actedAt: latestCustomerResponse.submittedAt,
      remarks: latestCustomerResponse.remarks,
      portalUser: latestCustomerResponse.portalUser,
      source: "CUSTOMER_PORTAL",
    }
    : null;
  const approvedInternalDecision =
    currentInternalApprovals.find((approval: any) => approval.action === "APPROVED") ?? null;
  const approvedCustomerDecision =
    currentCustomerApprovals.find((approval: any) => approval.action === "APPROVED") ??
    (portalCustomerDecision?.action === "APPROVED" ? portalCustomerDecision : null);
  const rejectedCustomerDecision =
    currentCustomerApprovals.find((approval: any) => approval.action === "REJECTED") ??
    (portalCustomerDecision?.action === "REJECTED" ? portalCustomerDecision : null);
  const finalCustomerDecision = approvedCustomerDecision ?? rejectedCustomerDecision;
  const isChecklistCustomerReworkRequired =
    checklistWorkflow?.status === "CUSTOMER_REWORK_REQUIRED" ||
    Boolean(rejectedCustomerDecision);
  const getCustomerResponseForVersion = (version: any) => {
    if (!version?.uploadedAt) return null;
    const uploadedAt = new Date(version.uploadedAt).getTime();
    const nextVersion = (checklistWorkflow?.fileVersions ?? [])
      .filter((entry: any) => new Date(entry.uploadedAt).getTime() > uploadedAt)
      .sort((a: any, b: any) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime())[0];
    const nextUploadedAt = nextVersion ? new Date(nextVersion.uploadedAt).getTime() : Number.POSITIVE_INFINITY;

    return (checklistWorkflow?.customerResponses ?? []).find((response: any) => {
      const submittedAt = new Date(response.submittedAt).getTime();
      return submittedAt >= uploadedAt && submittedAt < nextUploadedAt;
    }) ?? null;
  };
  const getChecklistVersionStatus = (versionId?: string | null) => {
    if (!versionId) return null;
    const version = checklistWorkflow?.fileVersions?.find((entry: any) => entry.id === versionId);
    const customerResponseForVersion = getCustomerResponseForVersion(version);
    if (customerResponseForVersion?.decision === "REJECTED") {
      return { label: "Customer Rejected", variant: "destructive" as const };
    }
    if (customerResponseForVersion?.decision === "APPROVED") {
      return { label: "Customer Approved", variant: "success" as const };
    }
    const versionApprovals = checklistApprovals.filter((approval: any) => approval.fileVersionId === versionId);
    if (versionId === currentChecklistVersion?.id && rejectedCustomerDecision) {
      return { label: "Customer Rejected", variant: "destructive" as const };
    }
    if (versionId === currentChecklistVersion?.id && approvedCustomerDecision) {
      return { label: "Customer Approved", variant: "success" as const };
    }
    if (versionApprovals.some((approval: any) => approval.action === "REJECTED")) {
      return { label: "Rejected", variant: "destructive" as const };
    }
    if (versionApprovals.some((approval: any) => approval.stage === "CUSTOMER" && approval.action === "APPROVED")) {
      return { label: "Customer Approved", variant: "success" as const };
    }
    if (versionApprovals.some((approval: any) => approval.stage === "INTERNAL" && approval.action === "APPROVED")) {
      return { label: "Internal Approved", variant: "warning" as const };
    }
    return null;
  };
  const canCurrentUserInternalApprove =
    canInternalApproveChecklist ||
    currentInternalApprovals.some((approval: any) => approval.assignedToId === currentUserId && approval.action === "PENDING");
  const canCurrentUserCustomerApprove =
    canCustomerApproveChecklist ||
    currentCustomerApprovals.some((approval: any) => approval.assignedToId === currentUserId && approval.action === "PENDING");
  const getUserName = (userId?: string | null) =>
    users.find((user) => user.id === userId)?.name || "Unknown";
  const getDecisionActorLabel = (decision: any) => {
    if (decision?.portalUser?.name) return `${decision.portalUser.name} (Customer Portal)`;
    if (decision?.portalUser?.email) return `${decision.portalUser.email} (Customer Portal)`;
    return getUserName(decision?.actedById || decision?.assignedToId);
  };
  const displayChecklistApprovals = useMemo(() => {
    if (!portalCustomerDecision) return checklistApprovals;
    const hasRecordedCustomerDecision = checklistApprovals.some(
      (approval: any) =>
        approval.fileVersionId === currentChecklistVersion?.id &&
        approval.stage === "CUSTOMER" &&
        approval.action !== "PENDING",
    );
    if (hasRecordedCustomerDecision) return checklistApprovals;
    return [
      ...checklistApprovals.filter(
        (approval: any) =>
          !(
            approval.fileVersionId === currentChecklistVersion?.id &&
            approval.stage === "CUSTOMER" &&
            approval.action === "PENDING"
          ),
      ),
      portalCustomerDecision,
    ];
  }, [checklistApprovals, currentChecklistVersion?.id, portalCustomerDecision]);
  const pendingCustomerApproverNames = Array.from(
    new Set(
      currentCustomerApprovals
        .filter((approval: any) => approval.action === "PENDING")
        .map((approval: any) => getUserName(approval.assignedToId)),
    ),
  );
  const getInternalApproverRole = (approval: any) =>
    approval?.assignedToId === job.primaryOwnerId
      ? "Owner"
      : approval?.assignedToId === job.assignedManagerId
        ? "Manager"
        : "TL";
  const eligibleInternalApproverLabels = Array.from(
    new Set(
      [
        job.primaryOwnerId
          ? `${getUserName(job.primaryOwnerId)} (Owner)`
          : null,
        job.assignedManagerId
          ? `${getUserName(job.assignedManagerId)} (Manager)`
          : null,
        ...currentInternalApprovals
          .filter((approval: any) => approval.assignedToId)
          .map((approval: any) => `${getUserName(approval.assignedToId)} (${getInternalApproverRole(approval)})`),
      ].filter(Boolean) as string[],
    ),
  );
  const currentUserName = users.find((user) => user.id === currentUserId)?.name || "You";
  const refreshJobInBackground = () => {
    startRefreshTransition(() => {
      router.refresh();
    });
  };
  const shouldAutoRefreshCustomerDecision =
    checklistWorkflow?.currentApprovalStage === "CUSTOMER" &&
    !finalCustomerDecision &&
    !isChecklistCustomerReworkRequired;

  useEffect(() => {
    if (!shouldAutoRefreshCustomerDecision) {
      return;
    }

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        refreshJobInBackground();
      }
    };

    const interval = window.setInterval(refreshIfVisible, 5000);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [shouldAutoRefreshCustomerDecision]);
  const getUploadValidityDate = () => new Date().toISOString().slice(0, 10);

  // Document version upload handler
  const handleUploadDoc = async (reqId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const requirement = documentRequirements.find((req) => req.id === reqId);
    const requiresValidity = !!requirement?.requirementItem?.requiresValidityDate;
    const validityDateValue = requiresValidity ? getUploadValidityDate() : "";

    setLoading(`doc-${reqId}`);
    try {
      const localUrl = URL.createObjectURL(file);
      const formData = new FormData();
      formData.append("file", file);
      if (requirement?.name === "Section 49" && section49ValidityDate) {
        formData.append("validityDate", section49ValidityDate);
      } else if (validityDateValue) {
        formData.append("validityDate", validityDateValue);
      }
      const res = await actions.uploadDocumentVersionAction(job.id, reqId, formData);

      if (res.ok) {
        const version = res.data;
        const versionId = version?.id;
        if (versionId) {
          setPreviewUrls((prev) => ({ ...prev, [versionId]: localUrl }));
        }
        setDocumentRequirements((current) =>
          current.map((req) =>
            req.id === reqId
              ? {
                ...req,
                status: "UPLOADED",
                exception: null,
                customerSubmissions: Array.isArray(req.customerSubmissions)
                  ? req.customerSubmissions.map((submission: any, index: number) =>
                      index === 0
                        ? {
                            ...submission,
                            status: submission.status === "ACCEPTED" ? "ACCEPTED" : "SUPERSEDED",
                            reviewerComment: submission.status === "ACCEPTED" ? submission.reviewerComment : "Superseded by CHA upload.",
                          }
                        : submission,
                    )
                  : req.customerSubmissions,
                versions: [
                  {
                    ...version,
                    fileKey: version?.fileKey || localUrl,
                    fileName: version?.fileName || file.name,
                    mimeType: version?.mimeType || file.type || "application/octet-stream",
                    sizeBytes: version?.sizeBytes || file.size,
                    uploadedById: version?.uploadedById || currentUserId,
                    isCurrent: true,
                  },
                  ...req.versions.map((existing: any) => ({ ...existing, isCurrent: false })),
                ],
              }
              : req,
          ),
        );
        setSelectedDocumentRequirementId(reqId);
        setIsDocumentDrawerOpen(true);
        setDocumentDrawerTab("preview");
        toast.success(`Uploaded ${file.name} successfully.`);
        refreshJobInBackground();
      } else {
        toast.error(res.error || "Upload failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleAcceptCustomerDocument = async (reqId: string) => {
    setLoading(`customer-accept-${reqId}`);
    try {
      const res = await actions.acceptCustomerDocumentSubmissionAction(job.id, reqId);
      if (!res.ok) {
        toast.error(res.error || "Failed to accept customer upload.");
        return;
      }

      const acceptedVersion = res.data?.acceptedVersion;
      const acceptedSubmission = res.data?.submission;
      setDocumentRequirements((current) =>
        current.map((req) =>
          req.id === reqId
            ? {
                ...req,
                status: "UPLOADED",
                exception: null,
                customerSubmissions: Array.isArray(req.customerSubmissions)
                  ? req.customerSubmissions.map((submission: any, index: number) =>
                      index === 0 && acceptedSubmission
                        ? acceptedSubmission
                        : submission,
                    )
                  : acceptedSubmission
                    ? [acceptedSubmission]
                    : req.customerSubmissions,
                versions: acceptedVersion
                  ? [
                      {
                        ...acceptedVersion,
                        isCurrent: true,
                      },
                      ...req.versions.map((existing: any) => ({ ...existing, isCurrent: false })),
                    ]
                  : req.versions,
              }
            : req,
        ),
      );
      setSelectedDocumentRequirementId(reqId);
      setIsDocumentDrawerOpen(true);
      setDocumentDrawerTab("preview");
      toast.success("Customer document accepted and saved as submitted.");
      refreshJobInBackground();
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleCreateCustomDocument = async () => {
    if (!customDocumentName.trim()) {
      toast.error("Enter a custom document name.");
      return;
    }

    if (!customDocumentFile) {
      toast.error("Choose a file to upload.");
      return;
    }

    setLoading("custom-doc-upload");
    try {
      const localUrl = URL.createObjectURL(customDocumentFile);
      const formData = new FormData();
      formData.append("name", customDocumentName.trim());
      formData.append("file", customDocumentFile);

      const res = await actions.createJobCustomDocumentUploadAction(job.id, formData);
      if (res.ok) {
        const createdRequirement = res.data;
        const currentVersion = createdRequirement?.versions?.find((version: any) => version.isCurrent) || createdRequirement?.versions?.[0];
        if (currentVersion?.id) {
          setPreviewUrls((prev) => ({ ...prev, [currentVersion.id]: localUrl }));
        }
        setDocumentRequirements((current) => [...current, createdRequirement]);
        setSelectedDocumentRequirementId(createdRequirement.id);
        setIsDocumentDrawerOpen(true);
        setDocumentDrawerTab("preview");
        setCustomDocumentName("");
        setCustomDocumentFile(null);
        setIsCustomDocumentModalOpen(false);
        toast.success("Custom document uploaded successfully.");
        refreshJobInBackground();
      } else {
        URL.revokeObjectURL(localUrl);
        toast.error(res.error || "Failed to upload custom document.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Declare Document Exception Handler
  const handleDeclareException = async (reqId: string) => {
    if (!exceptionReason.trim()) {
      toast.error("An exception reason is required.");
      return;
    }

    setLoading(`exc-${reqId}`);
    try {
      const res = await actions.declareDocumentExceptionAction(job.id, reqId, exceptionReason);
      if (res.ok) {
        setDocumentRequirements((current) =>
          current.map((req) =>
            req.id === reqId
              ? {
                ...req,
                status: "NOT_AVAILABLE",
                exception: {
                  ...(req.exception || {}),
                  ...(res.data || {}),
                  reason: exceptionReason,
                  user: { name: currentUserName },
                },
              }
              : req,
          ),
        );
        toast.success("Document requirement exempted.");
        setExceptionReason("");
        setActiveDocReqId(null);
        refreshJobInBackground();
      } else {
        toast.error(res.error || "Failed to waiver requirement.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleMarkNotAvailable = async (reqId: string) => {
    setLoading(`na-${reqId}`);
    try {
      const res = await actions.markDocumentNotAvailableAction(job.id, reqId);
      if (res.ok) {
        setDocumentRequirements((current) =>
          current.map((req) =>
            req.id === reqId
              ? {
                ...req,
                status: "NOT_AVAILABLE",
                exception: {
                  ...(req.exception || {}),
                  ...(res.data || {}),
                  reason: "N/A",
                  user: { name: currentUserName },
                },
              }
              : req,
          ),
        );
        toast.success("Document requirement marked as N/A.");
        setExceptionReason("");
        setActiveDocReqId(null);
        refreshJobInBackground();
      } else {
        toast.error(res.error || "Failed to mark requirement as N/A.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleMarkAllNotAvailable = async () => {
    if (bulkNaEligibleRequirements.length === 0) {
      toast.error("There are no visible pending documents to mark as N/A.");
      return;
    }

    setBulkNaConfirmOpen(true);
  };

  const handleConfirmMarkAllNotAvailable = async () => {
    if (bulkNaEligibleRequirements.length === 0) {
      setBulkNaConfirmOpen(false);
      toast.error("There are no visible pending documents to mark as N/A.");
      return;
    }

    setBulkNaConfirmOpen(false);
    setLoading("na-all");
    try {
      const updatedIds = new Set<string>();
      const failedNames: string[] = [];

      for (const requirement of bulkNaEligibleRequirements) {
        const res = await actions.markDocumentNotAvailableAction(job.id, requirement.id);
        if (res.ok) {
          updatedIds.add(requirement.id);
          continue;
        }
        failedNames.push(requirement.name);
      }

      if (updatedIds.size > 0) {
        setDocumentRequirements((current) =>
          current.map((req) =>
            updatedIds.has(req.id)
              ? {
                ...req,
                status: "NOT_AVAILABLE",
                exception: {
                  ...(req.exception || {}),
                  reason: "N/A",
                  user: { name: currentUserName },
                },
              }
              : req,
          ),
        );
        toast.success(`Marked ${updatedIds.size} document requirement(s) as N/A.`);
        refreshJobInBackground();
      }

      if (failedNames.length > 0) {
        toast.error(`Failed to mark as N/A: ${failedNames.join(", ")}`);
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Undo document exemption (Mark as active requirement again)
  const handleRemoveException = async (reqId: string) => {
    setLoading(`undo-exc-${reqId}`);
    try {
      const res = await actions.removeDocumentExceptionAction(job.id, reqId);
      if (res.ok) {
        setDocumentRequirements((current) =>
          current.map((req) =>
            req.id === reqId
              ? {
                ...req,
                status: res.data?.newStatus || (req.versions?.length ? "UPLOADED" : "PENDING"),
                exception: null,
              }
              : req,
          ),
        );
        toast.success("Exemption removed. Requirement is active again.");
        refreshJobInBackground();
      } else {
        toast.error(res.error || "Failed to remove exemption.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Proceed document gate validation stage advance
  const handleProceedStage = async () => {
    setLoading("proceed-stage");
    setProceedErrors(null);
    try {
      const res = await actions.proceedDocumentStageAction(job.id);
      if (res.ok) {
        toast.success("Workflow stage advanced to Additional Data successfully.");
        setActiveTab("additionalData");
        refreshJobInBackground();
        return true;
      } else {
        setProceedErrors(res.error ? [res.error] : ["Mandatory document requirement gating check failed."]);
        if (firstUnresolvedMandatoryDocumentId) {
          setHighlightedDocumentReqId(firstUnresolvedMandatoryDocumentId);
          setActiveTab("docs");
        }
        toast.error("Document collection gate not satisfied.");
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
      return false;
    } finally {
      setLoading(null);
    }
  };

  const isValidManifest = (value: string) => {
    if (value === "") return false;
    return /^[a-zA-Z0-9]+$/.test(value);
  };

  const buildAdditionalDataPayload = () => ({
    vesselInwardDate: vesselInwardDate || null,
    importGeneralManifest: importGeneralManifest === "" ? null : importGeneralManifest,
    exportGeneralManifest: exportGeneralManifest === "" ? null : exportGeneralManifest,
    customManifestValue: customManifestValue === "" ? null : customManifestValue,
    containerDetails: containerEntries.map((entry, index) => ({
      containerName: `Container ${index + 1}`,
      containerNumber: entry.containerNumber,
    })),
    mblNumber: mblNumber === "" ? null : mblNumber,
    hblNumber: hblNumber === "" ? null : hblNumber,
    deliveryOrderValidity: deliveryOrderValidity || null,
  });

  const persistAdditionalData = async ({
    silent = false,
    showLoading = false,
  }: {
    silent?: boolean;
    showLoading?: boolean;
  } = {}) => {
    const payload = buildAdditionalDataPayload();
    const payloadKey = JSON.stringify(payload);
    if (manifestConfigMissing) {
      if (!silent) {
        toast.error("This clearance type is missing manifest configuration. Update it in CHA settings before continuing.");
      }
      return false;
    }
    if (importGeneralManifest !== "" && !isValidManifest(importGeneralManifest)) {
      if (!silent) {
        toast.error("IGM must be alphanumeric.");
      }
      return false;
    }
    if (exportGeneralManifest !== "" && !isValidManifest(exportGeneralManifest)) {
      if (!silent) {
        toast.error("EGM must be alphanumeric.");
      }
      return false;
    }

    if (showLoading) {
      setLoading("additional-data-save");
    }
    try {
      const res = await actions.upsertAdditionalDataAction(job.id, payload);
      if (res.ok) {
        additionalDataAutosaveErrorShownRef.current = false;
        lastAdditionalDataAutosaveKeyRef.current = payloadKey;
        if (!silent) {
          clearAdditionalDataDraft();
          markAdditionalDataManuallySaved();
          toast.success("Additional Data saved successfully.");
          setIsAdditionalDataEditing(false);
          router.refresh();
        }
        return true;
      } else {
        if (silent) {
          if (!additionalDataAutosaveErrorShownRef.current) {
            toast.error(res.error || "Auto-save failed for Additional Data. Your local draft is still preserved.");
            additionalDataAutosaveErrorShownRef.current = true;
          }
        } else {
          toast.error(res.error || "Failed to save Additional Data.");
        }
      }
    } catch (err: any) {
      if (silent) {
        if (!additionalDataAutosaveErrorShownRef.current) {
          toast.error(err.message || "Auto-save failed for Additional Data. Your local draft is still preserved.");
          additionalDataAutosaveErrorShownRef.current = true;
        }
      } else {
        toast.error(err.message || "An unexpected error occurred.");
      }
    } finally {
      if (showLoading) {
        setLoading(null);
      }
    }
    return false;
  };

  const handleSaveAdditionalData = async () => {
    void persistAdditionalData({ silent: false, showLoading: true });
  };

  const handleProceedAdditionalData = async () => {
    if (manifestConfigMissing) {
      toast.error("This clearance type is missing manifest configuration. Update it in CHA settings before continuing.");
      return false;
    }
    if (!vesselInwardDate || !deliveryOrderValidity) {
      toast.error("Complete Vessel Inward Date and DO Validity before proceeding.");
      return false;
    }
    if (manifestMandatory && requiresIgm && importGeneralManifest === "") {
      toast.error("IGM Number is required before proceeding.");
      return false;
    }
    if (manifestMandatory && requiresEgm && exportGeneralManifest === "") {
      toast.error("EGM Number is required before proceeding.");
      return false;
    }
    if (manifestMandatory && requiresCustomManifest && customManifestValue === "") {
      toast.error(`${customManifestLabel} is required before proceeding.`);
      return false;
    }

    if (importGeneralManifest !== "" && !isValidManifest(importGeneralManifest)) {
      toast.error("IGM must be alphanumeric.");
      return false;
    }
    if (exportGeneralManifest !== "" && !isValidManifest(exportGeneralManifest)) {
      toast.error("EGM must be alphanumeric.");
      return false;
    }

    setLoading("additional-data-proceed");
    try {
      // Auto-save Additional Data first
      const saveRes = await actions.upsertAdditionalDataAction(job.id, {
        vesselInwardDate: vesselInwardDate || null,
        importGeneralManifest: importGeneralManifest === "" ? null : importGeneralManifest,
        exportGeneralManifest: exportGeneralManifest === "" ? null : exportGeneralManifest,
        customManifestValue: customManifestValue === "" ? null : customManifestValue,
        containerDetails: containerEntries.map((entry, index) => ({
          containerName: `Container ${index + 1}`,
          containerNumber: entry.containerNumber,
        })),
        mblNumber: mblNumber === "" ? null : mblNumber,
        hblNumber: hblNumber === "" ? null : hblNumber,
        deliveryOrderValidity: deliveryOrderValidity || null,
      });

      if (!saveRes.ok) {
        toast.error(saveRes.error || "Failed to auto-save Additional Data.");
        setLoading(null);
        return false;
      }

      clearAdditionalDataDraft();

      // Succeeded to save, now proceed!
      const res = await actions.proceedAdditionalDataAction(job.id);
      if (res.ok) {
        toast.success("Additional Data saved and workflow advanced to Checklist Preparation.");
        router.refresh();
        return true;
      } else {
        toast.error(res.error || "Failed to complete Additional Data.");
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
      return false;
    } finally {
      setLoading(null);
    }
  };

  const handleConfirmDeleteDoc = async () => {
    if (!deleteDocModal) return;
    setLoading("delete-doc");
    try {
      const res = await actions.deleteDocumentVersionAction(
        job.id,
        deleteDocModal.reqId,
        deleteDocModal.versionId
      );
      if (res.ok) {
        toast.success(`Deleted ${deleteDocModal.fileName} successfully.`);
        setDeleteDocModal(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete file.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleUploadChecklist = async (file: File | null) => {
    if (!file || file.size === 0) {
      toast.error("Please choose a checklist file to upload.");
      return;
    }

    setChecklistFile(file);
    setLoading("checklist-upload");
    try {
      const localUrl = URL.createObjectURL(file);
      const formData = new FormData();
      formData.append("file", file);
      if (checklistRemarks) {
        formData.append("remarks", checklistRemarks);
      }
      const res = await actions.uploadChecklistFileAction(job.id, formData);

      if (res.ok) {
        const versionId = res.data?.fileVersion?.id;
        if (versionId) {
          setPreviewUrls((prev) => ({ ...prev, [versionId]: localUrl }));
        }
        toast.success(currentChecklistVersion ? "Checklist reuploaded for approval." : "Checklist uploaded for approval.");
        setChecklistFile(null);
        setChecklistRemarks("");
        router.refresh();
      } else {
        setChecklistFile(null);
        toast.error(res.error || "Checklist upload failed.");
      }
    } catch (err: any) {
      setChecklistFile(null);
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleChecklistInternalDecision = async (decision: "APPROVED" | "REJECTED") => {
    if (!checklistWorkflow) return;
    if (decision === "REJECTED" && !internalApprovalRemarks.trim()) {
      toast.error("A rejection reason is required.");
      return;
    }

    setLoading(`checklist-internal-${decision}`);
    try {
      const formData = new FormData();
      formData.set("decision", decision);
      formData.set("remarks", internalApprovalRemarks);

      const res = await actions.submitChecklistInternalDecisionAction(job.id, checklistWorkflow.id, formData);
      if (res.ok) {
        toast.success(decision === "APPROVED" ? "Internal approval recorded." : "Checklist returned for rework.");
        setInternalApprovalRemarks("");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to process internal decision.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleChecklistCustomerDecision = async (decision: "APPROVED" | "REJECTED") => {
    if (!checklistWorkflow) return;
    if (decision === "REJECTED" && !customerApprovalRemarks.trim()) {
      toast.error("A rejection reason is required.");
      return;
    }

    setLoading(`checklist-customer-${decision}`);
    try {
      const res = await actions.submitChecklistCustomerDecisionAction(
        job.id,
        checklistWorkflow.id,
        decision,
        customerApprovalRemarks || undefined,
      );
      if (res.ok) {
        toast.success(decision === "APPROVED" ? "Customer approval recorded." : "Checklist returned from customer for rework.");
        setCustomerApprovalRemarks("");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to process customer decision.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleSendChecklistCustomerMail = async () => {
    if (!checklistWorkflow) return;
    const subject = customerMailSubject.trim() || `Checklist Approval Required - ${job.jobNumber}`;
    const body = customerMailBody.trim() || `Please review the attached approved checklist for job ${job.jobNumber}.`;

    setLoading("checklist-customer-mail");
    try {
      const formData = new FormData();
      formData.set("subject", subject);
      formData.set("body", body);
      customerMailAttachments.forEach((file) => formData.append("customerMailAttachments", file));
      const res = await actions.sendChecklistCustomerMailAction(job.id, checklistWorkflow.id, formData);
      if (res.ok) {
        toast.success("Customer email sent with the approved checklist attached.");
        setCustomerMailSubject("");
        setCustomerMailBody("");
        setCustomerMailAttachments([]);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to send checklist mail.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleUpdateManager = async () => {
    if (!selectedManagerId) {
      toast.error("Please select a manager.");
      return;
    }
    setLoading("update-manager");
    try {
      const res = await actions.updateJobDetailsAction(job.id, {
        assignedManagerId: selectedManagerId,
      });
      if (res.ok) {
        toast.success("Assigned manager updated successfully.");
        setIsEditingManager(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update manager.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const resetDeletionModalState = () => {
    setDeleteModalMode(null);
    setDeleteConfirmJobNumber("");
    setDeleteConfirmPhrase("");
    setDeleteDecisionRemarks("");
  };

  const handleSubmitJobDeletion = async () => {
    if (!deleteInputsMatch) {
      toast.error("Enter the exact job number and confirmation phrase to continue.");
      return;
    }

    setLoading("job-delete");
    try {
      const res = await actions.submitJobDeletionAction(
        job.id,
        deleteConfirmJobNumber,
        deleteConfirmPhrase,
      );

      if (res.ok) {
        const outcome = res.data.mode === "deleted"
          ? `CHA job ${job.jobNumber} was deleted successfully.`
          : `Deletion request submitted for ${job.jobNumber}. Manager approval is now pending.`;
        toast.success(outcome);
        resetDeletionModalState();
        router.push("/cha/jobs");
      } else {
        toast.error(res.error || "Failed to process the CHA job deletion.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleApproveDeletionRequest = async () => {
    if (!pendingDeletionReview) return;
    if (!deleteInputsMatch) {
      toast.error("Enter the exact job number and confirmation phrase to continue.");
      return;
    }

    setLoading("job-delete-approve");
    try {
      const res = await actions.decideJobDeletionRequestAction(
        pendingDeletionReview.id,
        "APPROVED",
        deleteDecisionRemarks || undefined,
      );

      if (res.ok) {
        toast.success(`Deletion request approved and job ${job.jobNumber} deleted.`);
        resetDeletionModalState();
        router.push("/cha/jobs");
      } else {
        toast.error(res.error || "Failed to approve the deletion request.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleRejectDeletionRequest = async () => {
    if (!pendingDeletionReview) return;
    if (!deleteDecisionRemarks.trim()) {
      toast.error("A rejection reason is required.");
      return;
    }

    setLoading("job-delete-reject");
    try {
      const res = await actions.decideJobDeletionRequestAction(
        pendingDeletionReview.id,
        "REJECTED",
        deleteDecisionRemarks,
      );

      if (res.ok) {
        toast.success(`Deletion request for ${job.jobNumber} was rejected.`);
        resetDeletionModalState();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to reject the deletion request.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Filing Date adjustment
  const handleAdjustEstDate = async () => {
    if (!newEstFilingDate) return;

    setLoading("est-date");
    try {
      const res = await actions.adjustEstimatedFilingDateAction(
        job.id,
        job.filing.id,
        new Date(newEstFilingDate)
      );

      if (res.ok) {
        toast.success("Estimated filing date adjusted.");
        setNewEstFilingDate("");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to adjust date.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Mark as Filed
  const handleMarkAsFiled = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filingRef || !actualFilingDate || !filedBillCopyFile) {
      toast.error("Filing Reference, Date, and Filed Copy are required.");
      return;
    }

    const est = job.filing.estimatedFilingDate ? new Date(job.filing.estimatedFilingDate) : null;
    const act = new Date(actualFilingDate);
    const isDelayed = est && act.getTime() > est.getTime();

    if (isDelayed && !delayReason.trim()) {
      toast.error("This filing is delayed. A justification reason is mandatory.");
      return;
    }

    setLoading("mark-filed");
    try {
      const mockFileKey = `cha/filings/${Math.random().toString(36).substring(7)}_${filedBillCopyFile.name}`;
      const res = await actions.markAsFiledAction(job.id, job.filing.id, {
        filingRef,
        actualFilingDate: act,
        filedBillCopyKey: mockFileKey,
        remarks: "Submitted and finalized",
        delayReason: isDelayed ? delayReason : undefined,
      });

      if (res.ok) {
        toast.success("Filing finalized. Operational cycle complete.");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to finalize filing.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // --- FILING WORKFLOW RUNNER HANDLERS ---
  const loadFilingData = async () => {
    const previousActiveNodeRunId = activeNodeRun?.id ?? null;
    const currentDraftSnapshot = buildCurrentFilingNodeDraft();

    setLoading("filing-load");
    try {
      const [instanceRes, section49Res] = await Promise.all([
        actions.getFilingWorkflowInstanceAction(job.id),
        actions.getFilingSection49Action(job.id)
      ]);
      if (instanceRes.ok) {
        setFilingInstance(instanceRes.data);
        const activeRun = instanceRes.data?.activeNodeRun || instanceRes.data?.nodeRuns?.find((r: any) => r.status === "ACTIVE");
        setActiveNodeRun(activeRun || null);
        setSelectedJumpBackNodeKey((current) => current || instanceRes.data?.jumpBackTargets?.[0]?.nodeKey || "");

        if (activeRun) {
          const initialResponses: Record<string, { isChecked: boolean; remarks?: string; fileKey?: string; delayRemarks?: string }> = {};
          const activeNodeItemIds = activeRun.node.checklistItems.map((item: any) => item.id);
          const currentResponses = instanceRes.data.responses?.filter(
            (r: any) => activeNodeItemIds.includes(r.checklistItemId)
          ) || [];

          activeRun.node.checklistItems.forEach((item: any) => {
            const match = currentResponses.find((r: any) => r.checklistItemId === item.id);
            initialResponses[item.id] = {
              isChecked: match ? match.isChecked : false,
              remarks: match ? (match.remarks || "") : "",
              fileKey: match ? (match.fileKey || undefined) : undefined,
              delayRemarks: match ? (match.delayRemarks || "") : "",
            };
          });
          const shouldPreserveDraft = previousActiveNodeRunId === activeRun.id;
          setChecklistResponses(
            shouldPreserveDraft
              ? mergeFilingChecklistResponses(initialResponses, currentDraftSnapshot.checklistResponses)
              : initialResponses,
          );
          const fieldValuesForNode = Object.fromEntries(
            (instanceRes.data.fieldValues || [])
              .filter((entry: any) => entry.nodeId === activeRun.node.id)
              .map((entry: any) => [entry.fieldKey, entry.valueJson == null ? "" : String(entry.valueJson)]),
          );
          setFilingFieldValues((current) => {
            if (!shouldPreserveDraft) {
              return fieldValuesForNode;
            }

            const mergedFieldValues = { ...fieldValuesForNode };
            for (const [fieldKey, fieldValue] of Object.entries(currentDraftSnapshot.filingFieldValues)) {
              const serverValue = mergedFieldValues[fieldKey];
              if ((serverValue === undefined || serverValue === null || serverValue === "") && fieldValue) {
                mergedFieldValues[fieldKey] = fieldValue;
              }
            }
            return mergedFieldValues;
          });
          const toggleEntriesForNode = (instanceRes.data.toggleStates || []).filter((entry: any) => entry.nodeId === activeRun.node.id);
          const toggleStatesForNode = Object.fromEntries(toggleEntriesForNode.map((entry: any) => [entry.sectionKey, !!entry.isEnabled]));
          const toggleStateDetailsForNode = Object.fromEntries(
            toggleEntriesForNode.map((entry: any) => [
              entry.sectionKey,
              {
                isEnabled: !!entry.isEnabled,
                state: entry.stateJson && typeof entry.stateJson === "object" ? entry.stateJson : null,
              },
            ]),
          );
          setFilingToggleStates(toggleStatesForNode);
          setFilingToggleStateDetails(toggleStateDetailsForNode);
          const queryProcessingDetails = toggleStateDetailsForNode.query_processing?.state as Record<string, unknown> | null | undefined;
          const serverQueryReferenceNumber =
            typeof queryProcessingDetails?.queryReferenceNumber === "string" ? queryProcessingDetails.queryReferenceNumber : "";
          const serverQueryOfficerName =
            typeof queryProcessingDetails?.customsOfficerName === "string" ? queryProcessingDetails.customsOfficerName : "";
          const serverQueryReceivedAt =
            typeof queryProcessingDetails?.queryReceivedAt === "string" ? queryProcessingDetails.queryReceivedAt : "";
          const serverQueryTitle = typeof fieldValuesForNode.query_title === "string" ? fieldValuesForNode.query_title : "";
          const serverQueryDetails = typeof fieldValuesForNode.query_notes === "string" ? fieldValuesForNode.query_notes : "";

          setFilingQueryReferenceNumber(
            shouldPreserveDraft && currentDraftSnapshot.filingQueryReferenceNumber.trim()
              ? currentDraftSnapshot.filingQueryReferenceNumber
              : serverQueryReferenceNumber,
          );
          setFilingQueryOfficerName(
            shouldPreserveDraft && currentDraftSnapshot.filingQueryOfficerName.trim()
              ? currentDraftSnapshot.filingQueryOfficerName
              : serverQueryOfficerName,
          );
          setFilingQueryReceivedAt(
            shouldPreserveDraft && currentDraftSnapshot.filingQueryReceivedAt.trim()
              ? currentDraftSnapshot.filingQueryReceivedAt
              : serverQueryReceivedAt,
          );
          setFilingQueryTitle(
            shouldPreserveDraft && currentDraftSnapshot.filingQueryTitle.trim()
              ? currentDraftSnapshot.filingQueryTitle
              : serverQueryTitle,
          );
          setFilingQueryDetails(
            shouldPreserveDraft && currentDraftSnapshot.filingQueryDetails.trim()
              ? currentDraftSnapshot.filingQueryDetails
              : serverQueryDetails,
          );
          if (shouldPreserveDraft) {
            setFilingQueryResponderNames(currentDraftSnapshot.filingQueryResponderNames);
            setFilingQueryStatusUpdates(currentDraftSnapshot.filingQueryStatusUpdates);
          } else {
            setFilingQueryResponderNames({});
            setFilingQueryStatusUpdates({});
          }

          const edges = instanceRes.data.version?.edges || [];
          const outgoing = edges.filter((e: any) => e.sourceKey === activeRun.nodeKey);
          if (outgoing.length === 1) {
            setSelectedNextNodeKey(
              shouldPreserveDraft && currentDraftSnapshot.selectedNextNodeKey.trim()
                ? currentDraftSnapshot.selectedNextNodeKey
                : outgoing[0].targetKey,
            );
          } else {
            setSelectedNextNodeKey(
              shouldPreserveDraft ? currentDraftSnapshot.selectedNextNodeKey : "",
            );
          }
        } else {
          setChecklistResponses({});
          setFilingFieldValues({});
          setFilingToggleStates({});
          setFilingToggleStateDetails({});
          setFilingQueryReferenceNumber("");
          setFilingQueryOfficerName("");
          setFilingQueryReceivedAt("");
          setFilingQueryResponderNames({});
          setFilingQueryStatusUpdates({});
          setFilingQueryTitle("");
          setFilingQueryDetails("");
          setSelectedNextNodeKey("");
        }

        setNodeRemarks(
          activeRun && previousActiveNodeRunId === activeRun.id && currentDraftSnapshot.nodeRemarks.trim()
            ? currentDraftSnapshot.nodeRemarks
            : activeRun?.remarks || "",
        );
        setNodeDelayRemarks(
          activeRun && previousActiveNodeRunId === activeRun.id && currentDraftSnapshot.nodeDelayRemarks.trim()
            ? currentDraftSnapshot.nodeDelayRemarks
            : activeRun?.delayRemarks || "",
        );
        return instanceRes.data;
      } else {
        toast.error(instanceRes.error || "Failed to load filing workflow. Check that a workflow is published in CHA Settings.");
      }
      if (section49Res.ok) {
        setSection49Flag(section49Res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load Filing workflow details.");
    } finally {
      setLoading(null);
    }
    return null;
  };

  useEffect(() => {
    if (activeTab === "filing" && activeStepIndex >= filingStageIndex) {
      void loadFilingData();
    }
  }, [activeTab, activeStepIndex, filingStageIndex]);

  const syncLocalToggleState = (
    sectionKey: string,
    isEnabled: boolean,
    state: Record<string, unknown> | null,
  ) => {
    setFilingToggleStates((current) => ({ ...current, [sectionKey]: isEnabled }));
    setFilingToggleStateDetails((current) => ({
      ...current,
      [sectionKey]: {
        isEnabled,
        state,
      },
    }));
  };

  const clearFilingNodeDraft = (storageKey?: string | null) => {
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // localStorage unavailable
    }
  };

  const buildCurrentFilingNodeDraft = (): FilingNodeDraft => ({
    checklistResponses,
    filingFieldValues,
    filingToggleStates,
    filingToggleStateDetails,
    filingQueryDetails,
    filingQueryOfficerName,
    filingQueryReceivedAt,
    filingQueryReferenceNumber,
    filingQueryResponderNames,
    filingQueryStatusUpdates,
    filingQueryTitle,
    nodeRemarks,
    nodeDelayRemarks,
    selectedNextNodeKey,
  });

  const persistFilingDraft = async ({
    silent = false,
    showLoading = false,
  }: {
    silent?: boolean;
    showLoading?: boolean;
  } = {}) => {
    if (!filingDraftStorageKey || !activeNodeRun?.id) {
      if (!silent) {
        toast.error("No active filing stage is available to save right now.");
      }
      return false;
    }

    const currentDraft = buildCurrentFilingNodeDraft();
    const toggleStatesForSave = Object.entries(currentDraft.filingToggleStateDetails).map(([sectionKey, entry]) => ({
      sectionKey,
      isEnabled: entry.isEnabled,
      state:
        sectionKey === "query_processing"
          ? {
            ...(entry.state ?? {}),
            queryReferenceNumber: filingQueryReferenceNumber.trim() || null,
            customsOfficerName: filingQueryOfficerName.trim() || null,
            queryReceivedAt: filingQueryReceivedAt.trim() || null,
          }
          : entry.state ?? null,
    }));
    const fieldValuesForSave = [
      ...Object.entries(currentDraft.filingFieldValues).map(([fieldKey, value]) => ({ fieldKey, value })),
      { fieldKey: "query_title", value: currentDraft.filingQueryTitle },
      { fieldKey: "query_notes", value: currentDraft.filingQueryDetails },
    ];
    const payloadKey = JSON.stringify({
      nodeRunId: activeNodeRun.id,
      draft: currentDraft,
    });

    if (showLoading) {
      setLoading("filing-save-draft");
    }
    try {
      const result = await actions.saveFilingNodeDraftAction(job.id, activeNodeRun.id, {
        remarks: currentDraft.nodeRemarks,
        delayRemarks: currentDraft.nodeDelayRemarks,
        checklistItemResponses: activeChecklistItems.map((item: any) => {
          const response = currentDraft.checklistResponses[item.id] || {
            isChecked: false,
            remarks: "",
            fileKey: undefined,
            delayRemarks: "",
          };
          return {
            checklistItemId: item.id,
            isChecked: response.isChecked,
            remarks: response.remarks || undefined,
            fileKey: response.fileKey || undefined,
            delayRemarks: response.delayRemarks || undefined,
          };
        }),
        fieldValues: fieldValuesForSave,
        toggleStates: toggleStatesForSave,
      });

      if (!result.ok) {
        if (silent) {
          if (!filingAutosaveErrorShownRef.current) {
            toast.error(result.error || "Auto-save failed for this filing stage. Your local draft is still preserved.");
            filingAutosaveErrorShownRef.current = true;
          }
        } else {
          toast.error(result.error || "Failed to save filing draft.");
        }
        return false;
      }

      try {
        localStorage.setItem(filingDraftStorageKey, JSON.stringify(currentDraft));
        filingDraftHydratedForRef.current = filingDraftStorageKey;
      } catch {
        // localStorage unavailable
      }

      filingAutosaveErrorShownRef.current = false;
      lastFilingAutosaveKeyRef.current = payloadKey;
      if (!silent) {
        setFilingValidationWarning(null);
        toast.success(`Saved draft for ${activeNodeRun.node.name}.`);
      }
      return true;
    } catch {
      if (silent) {
        if (!filingAutosaveErrorShownRef.current) {
          toast.error("Auto-save failed for this filing stage. Your local draft is still preserved.");
          filingAutosaveErrorShownRef.current = true;
        }
      } else {
        toast.error("Failed to save filing draft.");
      }
      return false;
    } finally {
      if (showLoading) {
        setLoading(null);
      }
    }
  };

  const handleSaveFilingDraft = () => {
    void persistFilingDraft({ silent: false, showLoading: true });
  };

  useEffect(() => {
    if (!filingDraftStorageKey || !activeNodeRun?.id) return;
    if (filingDraftHydratedForRef.current === filingDraftStorageKey) return;

    filingDraftHydratedForRef.current = filingDraftStorageKey;

    try {
      const savedDraft = localStorage.getItem(filingDraftStorageKey);
      if (!savedDraft) return;

      const parsedDraft = normalizeFilingNodeDraft(JSON.parse(savedDraft));
      if (!parsedDraft) {
        clearFilingNodeDraft(filingDraftStorageKey);
        return;
      }

      setChecklistResponses(parsedDraft.checklistResponses);
      setFilingFieldValues((current) => ({ ...current, ...parsedDraft.filingFieldValues }));
      setFilingToggleStates(parsedDraft.filingToggleStates);
      setFilingToggleStateDetails(parsedDraft.filingToggleStateDetails);
      setFilingQueryTitle(parsedDraft.filingQueryTitle);
      setFilingQueryDetails(parsedDraft.filingQueryDetails);
      setFilingQueryReferenceNumber(parsedDraft.filingQueryReferenceNumber);
      setFilingQueryOfficerName(parsedDraft.filingQueryOfficerName);
      setFilingQueryReceivedAt(parsedDraft.filingQueryReceivedAt);
      setFilingQueryStatusUpdates(parsedDraft.filingQueryStatusUpdates);
      setFilingQueryResponderNames(parsedDraft.filingQueryResponderNames);
      setNodeRemarks(parsedDraft.nodeRemarks);
      setNodeDelayRemarks(parsedDraft.nodeDelayRemarks);
      setSelectedNextNodeKey(parsedDraft.selectedNextNodeKey);
    } catch {
      clearFilingNodeDraft(filingDraftStorageKey);
    }
  }, [activeNodeRun?.id, filingDraftStorageKey]);

  useEffect(() => {
    if (!filingDraftStorageKey || filingDraftHydratedForRef.current !== filingDraftStorageKey) return;

    const draft = buildCurrentFilingNodeDraft();

    const hasDraftContent =
      Object.keys(checklistResponses).length > 0 ||
      Object.keys(filingFieldValues).length > 0 ||
      Object.keys(filingToggleStates).length > 0 ||
      Object.keys(filingToggleStateDetails).length > 0 ||
      Object.keys(filingQueryResponderNames).length > 0 ||
      Object.keys(filingQueryStatusUpdates).length > 0 ||
      !!filingQueryDetails.trim() ||
      !!filingQueryOfficerName.trim() ||
      !!filingQueryReceivedAt.trim() ||
      !!filingQueryReferenceNumber.trim() ||
      !!filingQueryTitle.trim() ||
      !!nodeRemarks.trim() ||
      !!nodeDelayRemarks.trim() ||
      !!selectedNextNodeKey.trim();

    try {
      if (!hasDraftContent) {
        localStorage.removeItem(filingDraftStorageKey);
        return;
      }
      localStorage.setItem(filingDraftStorageKey, JSON.stringify(draft));
    } catch {
      // localStorage unavailable
    }
  }, [
    checklistResponses,
    filingDraftStorageKey,
    filingFieldValues,
    filingQueryDetails,
    filingQueryOfficerName,
    filingQueryReceivedAt,
    filingQueryReferenceNumber,
    filingQueryResponderNames,
    filingQueryStatusUpdates,
    filingQueryTitle,
    filingToggleStateDetails,
    filingToggleStates,
    nodeDelayRemarks,
    nodeRemarks,
    selectedNextNodeKey,
  ]);

  useEffect(() => {
    return () => {
      if (additionalDataAutosaveTimeoutRef.current) {
        clearTimeout(additionalDataAutosaveTimeoutRef.current);
      }
      if (filingAutosaveTimeoutRef.current) {
        clearTimeout(filingAutosaveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAdditionalDataEditing || !additionalDataStageAvailable || additionalDataLocked || manifestConfigMissing) {
      return;
    }
    if (importGeneralManifest !== "" && !isValidManifest(importGeneralManifest)) {
      return;
    }
    if (exportGeneralManifest !== "" && !isValidManifest(exportGeneralManifest)) {
      return;
    }

    const currentDraft: AdditionalDataDraft = {
      vesselInwardDate,
      importGeneralManifest,
      exportGeneralManifest,
      customManifestValue,
      containerEntries,
      mblNumber,
      hblNumber,
      deliveryOrderValidity,
    };
    if (!hasAdditionalDataDraftContent(currentDraft)) {
      return;
    }

    const payload = buildAdditionalDataPayload();
    const payloadKey = JSON.stringify(payload);
    if (payloadKey === lastAdditionalDataAutosaveKeyRef.current) {
      return;
    }

    if (additionalDataAutosaveTimeoutRef.current) {
      clearTimeout(additionalDataAutosaveTimeoutRef.current);
    }
    additionalDataAutosaveTimeoutRef.current = setTimeout(() => {
      if (additionalDataAutosaveInFlightRef.current) {
        return;
      }
      additionalDataAutosaveInFlightRef.current = true;
      void persistAdditionalData({ silent: true, showLoading: false })
        .then((saved) => {
          if (saved) {
            lastAdditionalDataAutosaveKeyRef.current = payloadKey;
          }
        })
        .finally(() => {
          additionalDataAutosaveInFlightRef.current = false;
        });
    }, 1200);

    return () => {
      if (additionalDataAutosaveTimeoutRef.current) {
        clearTimeout(additionalDataAutosaveTimeoutRef.current);
      }
    };
  }, [
    additionalDataLocked,
    additionalDataStageAvailable,
    buildAdditionalDataPayload,
    containerEntries,
    customManifestValue,
    deliveryOrderValidity,
    exportGeneralManifest,
    hblNumber,
    importGeneralManifest,
    isAdditionalDataEditing,
    manifestConfigMissing,
    mblNumber,
    vesselInwardDate,
  ]);

  useEffect(() => {
    if (!activeNodeRun?.id || !filingDraftStorageKey) {
      return;
    }

    const draft = buildCurrentFilingNodeDraft();
    const payloadKey = JSON.stringify({
      nodeRunId: activeNodeRun.id,
      draft,
    });
    if (payloadKey === lastFilingAutosaveKeyRef.current) {
      return;
    }

    if (filingAutosaveTimeoutRef.current) {
      clearTimeout(filingAutosaveTimeoutRef.current);
    }
    filingAutosaveTimeoutRef.current = setTimeout(() => {
      if (filingAutosaveInFlightRef.current) {
        return;
      }
      filingAutosaveInFlightRef.current = true;
      void persistFilingDraft({ silent: true, showLoading: false })
        .then((saved) => {
          if (saved) {
            lastFilingAutosaveKeyRef.current = payloadKey;
          }
        })
        .finally(() => {
          filingAutosaveInFlightRef.current = false;
        });
    }, 1200);

    return () => {
      if (filingAutosaveTimeoutRef.current) {
        clearTimeout(filingAutosaveTimeoutRef.current);
      }
    };
  }, [
    activeChecklistItems,
    activeNodeRun?.id,
    checklistResponses,
    filingDraftStorageKey,
    filingFieldValues,
    filingQueryDetails,
    filingQueryOfficerName,
    filingQueryReceivedAt,
    filingQueryReferenceNumber,
    filingQueryResponderNames,
    filingQueryStatusUpdates,
    filingQueryTitle,
    filingToggleStateDetails,
    filingToggleStates,
    nodeRemarks,
    selectedNextNodeKey,
  ]);

  useEffect(() => {
    setFilingValidationWarning(null);
  }, [activeNodeRun?.id]);

  const showFilingValidationWarning = (warning: FilingValidationWarning) => {
    setFilingValidationWarning(warning);
    toast.error(warning.message);
    window.setTimeout(() => {
      filingActiveNodeCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const clearFilingValidationWarning = () => {
    if (filingValidationWarning) {
      setFilingValidationWarning(null);
    }
  };

  const handlePersistFilingToggleState = async (
    sectionKey: string,
    isEnabled: boolean,
    state: Record<string, unknown> | null,
    successMessage?: string,
  ) => {
    if (!activeNodeRun) {
      return false;
    }

    setLoading(`filing-toggle-${sectionKey}`);
    try {
      const res = await actions.upsertFilingWorkflowToggleStateAction(job.id, activeNodeRun.id, {
        sectionKey,
        isEnabled,
        state,
      });
      if (!res.ok) {
        toast.error(res.error || "Failed to update filing workflow section.");
        return false;
      }
      syncLocalToggleState(sectionKey, isEnabled, state);
      if (successMessage) {
        toast.success(successMessage);
      }
      await loadFilingData();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to update filing workflow section.");
      return false;
    } finally {
      setLoading(null);
    }
  };

  const handleQueryProcessingToggleChange = async () => {
    if (!queryProcessingToggleEnabled) {
      await handlePersistFilingToggleState(
        "query_processing",
        true,
        {
          ...(queryProcessingState ?? {}),
          stage:
            typeof queryProcessingState?.stage === "string" && queryProcessingState.stage.trim()
              ? queryProcessingState.stage
              : "AWAITING_QUERY_DECISION",
          disabledRemarks: undefined,
          disabledAt: undefined,
        },
        "Query processing enabled for this workflow stage.",
      );
      return;
    }

    setQueryToggleOffRemarks("");
    setQueryToggleOffModalOpen(true);
  };

  const handleConfirmQueryProcessingToggleOff = async () => {
    if (!queryToggleOffRemarks.trim()) {
      toast.error("Enter remarks before turning query processing off.");
      return;
    }

    const didDisable = await handlePersistFilingToggleState(
      "query_processing",
      false,
      {
        ...(queryProcessingState ?? {}),
        stage: undefined,
        disabledRemarks: queryToggleOffRemarks.trim(),
        disabledAt: new Date().toISOString(),
      },
      "Query processing disabled for this workflow stage.",
    );

    if (didDisable) {
      setQueryToggleOffModalOpen(false);
      setQueryProcessingPanelExpanded(false);
      setQueryToggleOffRemarks("");
    }
  };

  const handleCloseQueryToggleOffModal = () => {
    if (loading === "filing-toggle-query_processing") return;
    setQueryToggleOffRemarks("");
    setQueryToggleOffModalOpen(false);
  };

  const handleStartFilingWorkflow = async () => {
    setLoading("filing-start");
    try {
      const res = await actions.startFilingWorkflowAction(job.id);
      if (res.ok) {
        toast.success("Filing workflow initialized.");
        await loadFilingData();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to start filing workflow.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const completeActiveFilingNode = async () => {
    if (!activeNodeRun) return false;
    const currentFilingDraftStorageKey = filingDraftStorageKey;
    const validationWarning: FilingValidationWarning = {
      message: "Complete the highlighted required fields before finishing this stage.",
      details: [],
      fieldKeys: [],
      checklistItemIds: [],
      checklistRemarkItemIds: [],
      checklistDelayRemarkItemIds: [],
      documentRequirementKeys: [],
      photoRequirementIds: [],
      miscKeys: [],
    };
    const addValidationDetail = (detail: string) => {
      if (!validationWarning.details.includes(detail)) {
        validationWarning.details.push(detail);
      }
    };

    if (isActiveStageBlocked) {
      showFilingValidationWarning({
        ...validationWarning,
        message: "Complete the missing prerequisite stage before continuing this filing stage.",
        details: activeNodePrerequisiteStatus?.missingNodeNames?.length
          ? activeNodePrerequisiteStatus.missingNodeNames.map((name: string) => `Prerequisite stage: ${name}`)
          : ["A prerequisite filing stage is still incomplete."],
      });
      return false;
    }

    if (!isSkippingActiveOptionalNode) {
      if (queryProcessingEnabled && !queryProcessingResolved) {
        addValidationDetail("Resolve query processing before moving to the next filing step.");
        validationWarning.miscKeys.push("queryProcessing");
      }

      if (activeNodeRun.node.commentsRequired && !nodeRemarks.trim()) {
        addValidationDetail(`Completion comments are required for ${activeNodeRun.node.name}.`);
        validationWarning.miscKeys.push("nodeRemarks");
      }

      if (activeNodeDelayRemarksRequired && !nodeDelayRemarks.trim()) {
        addValidationDetail("Stage delay remarks are required because this stage crossed its SLA.");
        validationWarning.miscKeys.push("nodeDelayRemarks");
      }

      for (const field of activeNodeFieldDefinitions) {
        if (field.required === false) continue;
        if (!String(filingFieldValues[field.key] ?? "").trim()) {
          addValidationDetail(`${field.label || field.key} is required.`);
          validationWarning.fieldKeys.push(field.key);
        }
      }

      for (const section of visibleNodeConditionalSections) {
        if (!filingToggleStates[section.key]) continue;
        for (const field of section.unlocksFields ?? []) {
          if (field.required === false) continue;
          if (!String(filingFieldValues[field.key] ?? "").trim()) {
            addValidationDetail(`${field.label || field.key} is required.`);
            validationWarning.fieldKeys.push(field.key);
          }
        }
        for (const requirement of section.unlocksDocuments ?? []) {
          if (requirement.required === false) continue;
          if (!activeNodeDocumentAttachmentsByKey.get(requirement.key)) {
            addValidationDetail(`${requirement.label || requirement.key} upload is required.`);
            validationWarning.documentRequirementKeys.push(requirement.key);
          }
        }
      }

      if (activeNodeRun.node.requireAllMandatoryChecklistItems) {
        for (const item of activeChecklistItems) {
          if (item.isMandatory) {
            const resp = checklistResponses[item.id];
            if (!resp || !resp.isChecked) {
              addValidationDetail(`Mandatory checklist item "${item.label}" must be checked.`);
              validationWarning.checklistItemIds.push(item.id);
            }
          }
        }
      }

      for (const item of activeChecklistItems) {
        const resp = checklistResponses[item.id];
        if (item.requiresRemarks && resp?.isChecked && !resp.remarks?.trim()) {
          addValidationDetail(`Remarks are required for checklist item "${item.label}".`);
          validationWarning.checklistItemIds.push(item.id);
          validationWarning.checklistRemarkItemIds.push(item.id);
        }
        const matchingOverdue = overdueChecklistItems.find((entry: any) => entry.checklistItemId === item.id);
        if (matchingOverdue && resp?.isChecked && item.delayRemarksRequired && !resp.delayRemarks?.trim()) {
          addValidationDetail(`Delay remarks are required for overdue checklist item "${item.label}".`);
          validationWarning.checklistItemIds.push(item.id);
          validationWarning.checklistDelayRemarkItemIds.push(item.id);
        }
        const checklistItemAttachments = checklistAttachmentsByItem.get(item.id) || [];
        if (
          checklistItemAllowsDirectUpload(item) &&
          (item.minUploads || 0) > 0 &&
          checklistItemAttachments.length < (item.minUploads || 0)
        ) {
          addValidationDetail(`Supporting upload is required for checklist item "${item.label}".`);
          validationWarning.checklistItemIds.push(item.id);
        }
      }

      const currentAttachments = filingInstance?.attachments?.filter(
        (a: any) => a.nodeRunId === activeNodeRun.id
      ) || [];
      for (const requirement of activeNodeDocumentRequirements) {
        if (requirement.required === false) continue;
        if (!activeNodeDocumentAttachmentsByKey.get(requirement.key)) {
          addValidationDetail(`${requirement.label || requirement.key} upload is required.`);
          validationWarning.documentRequirementKeys.push(requirement.key);
        }
      }
      for (const pr of activeNodeRun.node.photoRequirements) {
        if (pr.isMandatory) {
          const uploadedCount = currentAttachments.filter((a: any) => a.photoRequirementId === pr.id).length;
          if (uploadedCount < pr.minPhotos) {
            addValidationDetail(`Mandatory upload "${pr.label}" requires at least ${pr.minPhotos} file(s). Uploaded ${uploadedCount}.`);
            validationWarning.photoRequirementIds.push(pr.id);
          }
        }
      }
    }

    if (validationWarning.details.length > 0) {
      validationWarning.fieldKeys = Array.from(new Set(validationWarning.fieldKeys));
      validationWarning.checklistItemIds = Array.from(new Set(validationWarning.checklistItemIds));
      validationWarning.checklistRemarkItemIds = Array.from(new Set(validationWarning.checklistRemarkItemIds));
      validationWarning.checklistDelayRemarkItemIds = Array.from(new Set(validationWarning.checklistDelayRemarkItemIds));
      validationWarning.documentRequirementKeys = Array.from(new Set(validationWarning.documentRequirementKeys));
      validationWarning.photoRequirementIds = Array.from(new Set(validationWarning.photoRequirementIds));
      validationWarning.miscKeys = Array.from(new Set(validationWarning.miscKeys));
      showFilingValidationWarning(validationWarning);
      return false;
    }

    clearFilingValidationWarning();

    setLoading("filing-complete");
    try {
      const completedNodeRunId = activeNodeRun.id;
      const completedNodeName = activeNodeRun.node.name;
      if (hasShipmentBillNumberField && filingFieldValues.bill_number?.trim()) {
        const billNumber = filingFieldValues.bill_number.trim();
        const shipmentSaveRes = await actions.upsertFilingShipmentDetailsAction(job.id, {
          filingShipmentType,
          billOfEntryNumber: isExportFiling ? null : billNumber,
          shippingBillNumber: isExportFiling ? billNumber : null,
        });
        if (!shipmentSaveRes.ok) {
          toast.error(shipmentSaveRes.error || "Failed to save bill number for filing.");
          return false;
        }
      }

      const responsesList = activeChecklistItems.map((item: any) => {
        const val = checklistResponses[item.id] || { isChecked: false, remarks: "", fileKey: undefined, delayRemarks: "" };
        return {
          checklistItemId: item.id,
          isChecked: val.isChecked,
          remarks: val.remarks || undefined,
          fileKey: val.fileKey || undefined,
          delayRemarks: val.delayRemarks || undefined,
        };
      });

      const res = await actions.completeFilingNodeAction(job.id, activeNodeRun.id, {
        remarks: nodeRemarks,
        delayRemarks: nodeDelayRemarks,
        checklistItemResponses: responsesList,
        fieldValues: Object.entries(filingFieldValues).map(([fieldKey, value]) => ({ fieldKey, value })),
        toggleStates: Object.entries(filingToggleStateDetails).map(([sectionKey, entry]) => ({
          sectionKey,
          isEnabled: entry.isEnabled,
          state: entry.state ?? null,
        })),
        nextNodeKey: selectedNextNodeKey || null,
      });

      if (res.ok) {
        clearFilingNodeDraft(currentFilingDraftStorageKey);
        toast.success(
          res.data?.resumedBlockedNodeName
            ? `Completed ${completedNodeName}. Resumed ${res.data.resumedBlockedNodeName}.`
            : isSkippingActiveOptionalNode
              ? `Skipped stage: ${completedNodeName}`
              : `Completed stage: ${completedNodeName}`,
        );
        const refreshedInstance = await loadFilingData();
        if (isFinalFilingNode || refreshedInstance?.status === "COMPLETED") {
          setActiveTab("expenses");
          setExpandedStageKey("EXPENSES");
          setStageFocusKey(null);
        }
        setFilingCompletionAnnouncement(
          refreshedInstance?.status === "COMPLETED"
            ? `${completedNodeName} ${isSkippingActiveOptionalNode ? "skipped" : "completed"}. Workflow completed successfully.`
            : res.data?.resumedBlockedNodeName
              ? `${completedNodeName} completed. ${res.data.resumedBlockedNodeName} resumed automatically.`
              : `${completedNodeName} ${isSkippingActiveOptionalNode ? "skipped" : "completed"}. ${refreshedInstance?.activeNodeRun?.node?.name || "Next step"} is now unlocked.`,
        );
        startRefreshTransition(() => {
          router.refresh();
        });
        return true;
      } else {
        toast.error(res.error || "Failed to finalize filing stage.");
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
      return false;
    } finally {
      setLoading(null);
    }
  };

  const handleCompleteFilingNode = async (e: React.FormEvent) => {
    e.preventDefault();
    await completeActiveFilingNode();
  };

  const handleGoBackStage = async () => {
    if (!activeNodeRun) return;
    const currentFilingDraftStorageKey = filingDraftStorageKey;
    if (!selectedJumpBackNodeKey) {
      toast.error(goBackMode === "return" ? "No return stage is available right now." : "Select the filing stage you want to reopen.");
      return;
    }
    if (!goBackReason.trim()) {
      toast.error(goBackMode === "return" ? "Enter a reason to return to the current stage." : "Enter a reason to jump back to the selected filing stage.");
      return;
    }
    setLoading("filing-go-back");
    try {
      const res = await actions.revertFilingStageAction(job.id, activeNodeRun.id, selectedJumpBackNodeKey, goBackReason.trim());
      if (res.ok) {
        clearFilingNodeDraft(currentFilingDraftStorageKey);
        toast.success(
          goBackMode === "return"
            ? `Returned to ${res.data?.reopenedNodeName || "the current stage"}.`
            : `Jumped back to ${res.data?.reopenedNodeName || "the selected stage"}.`,
        );
        setGoBackOpen(false);
        setGoBackMode("previous");
        setGoBackReason("");
        setSelectedJumpBackNodeKey("");
        await loadFilingData();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to jump back to the selected filing stage.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleReturnToCurrentStage = async () => {
    if (!activeNodeRun || !returnToCurrentTarget?.nodeKey) {
      toast.error("No current filing stage is available right now.");
      return;
    }
    if (returnToCurrentIsActuallyCurrent) {
      toast.info("This is the current filing stage.");
      return;
    }

    const currentFilingDraftStorageKey = filingDraftStorageKey;
    setLoading("filing-go-back");
    try {
      const res = await actions.revertFilingStageAction(
        job.id,
        activeNodeRun.id,
        returnToCurrentTarget.nodeKey,
        "Returned to the latest current filing stage from the workspace shortcut.",
      );
      if (res.ok) {
        clearFilingNodeDraft(currentFilingDraftStorageKey);
        toast.success(`Returned to ${res.data?.reopenedNodeName || "the current stage"}.`);
        setGoBackOpen(false);
        setGoBackMode("previous");
        setGoBackReason("");
        setSelectedJumpBackNodeKey("");
        await loadFilingData();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to return to the current filing stage.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleRedirectBlockedStage = async (targetNodeKey: string) => {
    if (!activeNodeRun) return;
    setLoading(`filing-redirect-${targetNodeKey}`);
    try {
      const res = await actions.redirectBlockedFilingStageAction(job.id, activeNodeRun.id, targetNodeKey);
      if (res.ok) {
        toast.success(`Redirected to ${res.data?.redirectedToNodeName || "the prerequisite stage"}.`);
        await loadFilingData();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to redirect to the prerequisite stage.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleResumeBlockedStage = async () => {
    if (!activeNodeRun) return;
    setLoading("filing-resume-blocked");
    try {
      const res = await actions.resumeBlockedFilingStageAction(job.id, activeNodeRun.id);
      if (res.ok) {
        toast.success(`Resumed ${res.data?.reopenedNodeName || "the blocked stage"}.`);
        await loadFilingData();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to resume the blocked filing stage.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleUploadFilingPhoto = async (photoRequirementId: string | null, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeNodeRun) return;
    const requirement = activeNodeRun.node.photoRequirements?.find((entry: any) => entry.id === photoRequirementId);
    const validityDateValue = requirement?.requiresValidity ? getUploadValidityDate() : "";

    setLoading(`filing-photo-${photoRequirementId || "general"}`);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (validityDateValue) {
        formData.append("validityDate", validityDateValue);
      }
      const res = await actions.uploadFilingAttachmentAction(job.id, activeNodeRun.id, photoRequirementId, null, null, formData);

      if (res.ok) {
        markLatestVerifiedChecklistItemForReverification();
        toast.success(`Uploaded ${file.name} successfully.`);
        await loadFilingData();
      } else {
        toast.error(res.error || "Upload failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteFilingPhoto = async (attachmentId: string) => {
    const attachment = filingInstance?.attachments?.find((entry: any) => entry.id === attachmentId);
    setLoading(`filing-delete-${attachmentId}`);
    try {
      const res = await actions.deleteFilingAttachmentAction(job.id, attachmentId);
      if (res.ok) {
        if (attachment?.checklistItemId) {
          markChecklistItemForReverification(attachment.checklistItemId);
        } else if (attachment?.documentRequirementKey || attachment?.photoRequirementId) {
          markLatestVerifiedChecklistItemForReverification();
        }
        toast.success("Attachment deleted successfully.");
        await loadFilingData();
      } else {
        toast.error(res.error || "Delete failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleUpdateFilingAttachmentValidity = async (attachmentId: string, validityDate: string | null) => {
    setLoading(`filing-attachment-validity-${attachmentId}`);
    try {
      const res = await actions.updateFilingAttachmentValidityAction(job.id, attachmentId, validityDate);
      if (res.ok) {
        const savedValidityDate = toDateInputValue(res.data?.validityDate ?? validityDate);
        setFilingInstance((current: any) => {
          if (!current) return current;
          return {
            ...current,
            attachments: (current.attachments || []).map((attachment: any) =>
              attachment.id === attachmentId
                ? {
                    ...attachment,
                    validityDate: savedValidityDate || null,
                  }
                : attachment,
            ),
          };
        });
        setAttachmentValidityDrafts((prev) => {
          const next = { ...prev };
          if (savedValidityDate) {
            next[attachmentId] = savedValidityDate;
          } else {
            delete next[attachmentId];
          }
          return next;
        });
        setAttachmentValidityEditors((prev) => ({
          ...prev,
          [attachmentId]: Boolean(savedValidityDate),
        }));
        toast.success(savedValidityDate ? "Validity date updated." : "Validity date cleared.");
        await loadFilingData();
        refreshJobInBackground();
      } else {
        toast.error(res.error || "Failed to update validity date.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleToggleSection49 = async () => {
    setLoading("section49-toggle");
    try {
      const nextState = !section49Flag?.isEnabled;
      const res = await actions.toggleFilingSection49Action(job.id, nextState, section49Remarks);
      if (res.ok) {
        toast.success(`Section 49 status updated: ${nextState ? "Enabled" : "Disabled"}`);
        setSection49Remarks("");
        setShowSection49Modal(false);
        await loadFilingData();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update Section 49 status.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleSaveSection49Validity = async () => {
    if (!section49ValidityDate) {
      toast.error("Enter Section 49 validity date.");
      return;
    }

    setLoading("section49-validity");
    try {
      const res = await actions.updateSection49ValidityAction(job.id, section49ValidityDate);
      if (res.ok) {
        setSection49Flag(res.data);
        toast.success("Section 49 validity date updated.");
        refreshJobInBackground();
      } else {
        toast.error(res.error || "Failed to update Section 49 validity date.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleApplySection49Extension = async () => {
    if (!section49ExtensionDate) {
      toast.error("Enter the new Section 49 validity date.");
      return;
    }
    if (!section49ExtensionFile) {
      toast.error("Choose the Section 49 extension document.");
      return;
    }

    setLoading("section49-extension");
    try {
      const formData = new FormData();
      formData.append("extensionDate", section49ExtensionDate);
      formData.append("file", section49ExtensionFile);
      const res = await actions.applySection49ExtensionAction(job.id, formData);
      if (res.ok) {
        toast.success("Section 49 extension applied.");
        setSection49ExtensionDate("");
        setSection49ExtensionFile(null);
        refreshJobInBackground();
      } else {
        toast.error(res.error || "Failed to apply Section 49 extension.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleUploadChecklistItemFile = async (checklistItemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeNodeRun) return;
    const requirement = activeNodeRun.node.checklistItems?.find((entry: any) => entry.id === checklistItemId);
    const validityDateValue = requirement?.requiresValidity ? getUploadValidityDate() : "";

    setLoading(`checklist-item-file-${checklistItemId}`);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (validityDateValue) {
        formData.append("validityDate", validityDateValue);
      }
      const res = await actions.uploadFilingAttachmentAction(job.id, activeNodeRun.id, null, checklistItemId, null, formData);
      if (res.ok) {
        const fileKey = res.data.fileKey;
        markChecklistItemForReverification(checklistItemId, { fileKey });
        toast.success(`Uploaded ${file.name} for checklist item.`);
        await loadFilingData();
      } else {
        toast.error(res.error || "Upload failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleUploadNodeDocument = async (documentRequirementKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeNodeRun) return;
    const requirement = [...activeNodeDocumentRequirements, ...visibleNodeConditionalSections.flatMap((section: any) => section.unlocksDocuments ?? [])]
      .find((entry: any) => entry.key === documentRequirementKey);
    const validityDateValue = requirement?.requiresValidity ? getUploadValidityDate() : "";

    setLoading(`node-document-${documentRequirementKey}`);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (validityDateValue) {
        formData.append("validityDate", validityDateValue);
      }
      const res = await actions.uploadFilingAttachmentAction(job.id, activeNodeRun.id, null, null, documentRequirementKey, formData);
      if (res.ok) {
        markLatestVerifiedChecklistItemForReverification();
        toast.success(`Uploaded ${file.name}.`);
        await loadFilingData();
      } else {
        toast.error(res.error || "Upload failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleCreateFilingQuery = async () => {
    if (!activeNodeRun || !filingQueryDetails.trim()) {
      toast.error("Enter query details before saving.");
      return;
    }

    setLoading("filing-query-create");
    try {
      const res = await actions.createFilingWorkflowQueryAction(job.id, activeNodeRun.id, {
        title: filingQueryTitle.trim() || "Customs Query",
        details: filingQueryDetails.trim(),
      });
      if (res.ok) {
        const nextState = {
          ...(queryProcessingState || {}),
          stage: "OPEN",
          queryReferenceNumber: filingQueryReferenceNumber.trim() || null,
          customsOfficerName: filingQueryOfficerName.trim() || null,
          queryReceivedAt: filingQueryReceivedAt.trim() || null,
          latestQueryId: res.data?.id || null,
          latestQueryRaisedAt: new Date().toISOString(),
          lastQueryTitle: filingQueryTitle.trim() || "Customs Query",
        } as Record<string, unknown>;
        await handlePersistFilingToggleState("query_processing", true, nextState);
        toast.success("Customs query recorded.");
        setFilingFieldValues((current) => ({ ...current, query_notes: filingQueryDetails.trim() }));
        setFilingQueryTitle("");
        setFilingQueryDetails("");
        setFilingQueryReferenceNumber("");
        setFilingQueryOfficerName("");
        setFilingQueryReceivedAt("");
        await loadFilingData();
      } else {
        toast.error(res.error || "Failed to save filing query.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleUpdateFilingQueryStatus = async (
    queryId: string,
    status: "OPEN" | "REPLIED" | "CLOSED",
    details?: string,
  ) => {
    setLoading(`filing-query-${queryId}`);
    try {
      const res = await actions.updateFilingWorkflowQueryStatusAction(job.id, queryId, {
        status,
        details: details?.trim() || undefined,
      });
      if (res.ok) {
        const nextState = {
          ...(queryProcessingState || {}),
          stage: status === "CLOSED" ? "CLEARED" : status === "REPLIED" ? "RESPONDED" : "OPEN",
          latestOutcomeUpdatedAt: new Date().toISOString(),
          latestResolutionNote: details?.trim() || null,
          clearedAt: status === "CLOSED" ? new Date().toISOString() : null,
          latestResponseSubmittedAt: status === "REPLIED" ? new Date().toISOString() : (queryProcessingState?.latestResponseSubmittedAt ?? null),
        } as Record<string, unknown>;
        await handlePersistFilingToggleState("query_processing", true, nextState);
        toast.success(
          status === "CLOSED"
            ? "Query cleared."
            : status === "REPLIED"
              ? "Offline response submitted."
              : "Query reopened.",
        );
        setFilingQueryStatusUpdates((current) => ({ ...current, [queryId]: "" }));
        await loadFilingData();
      } else {
        toast.error(res.error || "Failed to update filing query.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const buildFilingQueryResponseMessage = (queryId: string, fallbackDetails?: string) => {
    const response = filingQueryStatusUpdates[queryId]?.trim() || fallbackDetails?.trim() || "";
    const responder = (filingQueryResponderNames[queryId] || currentUserDisplayName).trim();
    if (!response) {
      return "";
    }
    return responder ? `Response by ${responder}: ${response}` : response;
  };

  const handleAddFilingQueryComment = async (queryId: string) => {
    const message = buildFilingQueryResponseMessage(queryId);
    if (!message) {
      toast.error("Enter an offline update before saving.");
      return;
    }

    setLoading(`filing-query-comment-${queryId}`);
    try {
      const res = await actions.addFilingWorkflowQueryCommentAction(job.id, queryId, { message });
      if (res.ok) {
        toast.success("Offline update saved.");
        setFilingQueryStatusUpdates((current) => ({ ...current, [queryId]: "" }));
        await loadFilingData();
      } else {
        toast.error(res.error || "Failed to save query update.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Customer Advance update expected terms
  const handleUpdateAdvanceExpected = async () => {
    if (expectedAdvance <= 0) {
      toast.error("Please enter a valid positive expected advance amount.");
      return;
    }

    setLoading("adv-expected");
    try {
      const res = await actions.updateCustomerAdvanceExpectedAction(
        job.id,
        job.customerAdvance.id,
        expectedAdvance,
        advanceDueDate ? new Date(advanceDueDate) : undefined,
        advanceAssigneeId || undefined
      );

      if (res.ok) {
        toast.success("Expected customer advance terms updated.");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update expected terms.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Waive customer advance
  const handleWaiveAdvance = async () => {
    if (!waiveAdvanceReason.trim()) {
      toast.error("A waiver justification reason is mandatory.");
      return;
    }

    setLoading("adv-waive");
    try {
      const res = await actions.declareAdvanceNotRequiredAction(
        job.id,
        job.customerAdvance.id,
        waiveAdvanceReason
      );

      if (res.ok) {
        toast.success("Customer advance waived.");
        setWaiveAdvanceReason("");
        setShowWaiveAdvance(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to waive advance.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Record customer advance receipt
  const handleRecordAdvanceReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(receiptAmount);
    if (Number.isNaN(amountNum) || amountNum <= 0 || !receiptDate) {
      toast.error("Valid Amount and Received Date are required.");
      return;
    }

    setLoading("adv-receipt");
    try {
      const mockReceiptKey = `cha/advances/${Math.random().toString(36).substring(7)}_receipt.pdf`;
      const res = await actions.recordCustomerAdvanceReceiptAction(job.id, job.customerAdvance.id, {
        amount: amountNum,
        receivedDate: new Date(receiptDate),
        paymentMethod: receiptMethod,
        referenceNumber: receiptRef || undefined,
        receiptProofKey: mockReceiptKey,
        remarks: receiptRemarks || undefined,
      });

      if (res.ok) {
        toast.success(`Recorded advance payment receipt of Rs. ${amountNum}`);
        setReceiptAmount("");
        setReceiptDate("");
        setReceiptRef("");
        setReceiptRemarks("");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to record receipt.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Expense line changes
  const handleExpenseLineChange = (index: number, field: string, val: string) => {
    setExpenseLines(
      expenseLines.map((line, i) => (i === index ? { ...line, [field]: val } : line))
    );
  };

  const handleAddExpenseLine = () => {
    setExpenseLines([
      ...expenseLines,
      { category: expenseCategories[0] || "", purpose: "", amount: "", requiredDate: "", remarks: "", receiptFiles: [] },
    ]);
  };

  const handleRemoveExpenseLine = (index: number) => {
    setExpenseLines(expenseLines.filter((_, i) => i !== index));
  };

  // Submit Expense Request
  const handleCreateExpenseRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseUrgent && !expenseUrgencyReason.trim()) {
      toast.error("An urgency explanation is mandatory for immediate disbursements.");
      return;
    }

    const lines = expenseLines.map((l) => ({
      category: l.category,
      purpose: l.purpose,
      amount: parseFloat(l.amount) || 0,
      requiredDate: l.requiredDate || "",
      remarks: l.remarks || undefined,
    }));

    if (lines.some((l) => !l.category || !l.purpose || l.amount <= 0)) {
      toast.error("All lines require a valid category, purpose, and positive amount.");
      return;
    }

    setLoading("expense-request");
    try {
      const formData = new FormData();
      formData.set("isUrgent", expenseUrgent ? "true" : "false");
      formData.set("urgencyReason", expenseUrgent ? expenseUrgencyReason : "");
      formData.set("upiNumber", expenseUpiNumber);
      formData.set("upiId", expenseUpiId);
      formData.set("linesJson", JSON.stringify(lines));
      expenseLines.forEach((line, lineIndex) => {
        line.receiptFiles.forEach((file) => formData.append(`receiptAttachment:${lineIndex}`, file));
      });
      const res = await actions.createExpenseRequestWithAttachmentAction(job.id, formData);

      if (res.ok) {
        toast.success("Expense request sent for review.");
        // Reset
        setExpenseUrgent(false);
        setExpenseUrgencyReason("");
        setExpenseUpiNumber("");
        setExpenseUpiId("");
        setExpenseLines([{ category: expenseCategories[0] || "", purpose: "", amount: "", requiredDate: "", remarks: "", receiptFiles: [] }]);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to dispatch expense.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Urgent Escalate Expense Action
  const handleEscalateExpense = async () => {
    if (!escUrgencyReason.trim() || !escRequestId) {
      toast.error("Urgency reason is mandatory for escalation.");
      return;
    }

    setLoading(`esc-${escRequestId}`);
    try {
      const res = await actions.triggerUrgentExpenseEscalationAction(escRequestId, escUrgencyReason);
      if (res.ok) {
        toast.success("Disbursement escalated to Urgent status.");
        setEscUrgencyReason("");
        setEscRequestId(null);
        router.refresh();
      } else {
        toast.error(res.error || "Escalation failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleExpenseReview = async (
    requestIdOverride?: string,
    statusOverride?: "CLARIFICATION_REQUIRED" | "APPROVED" | "REJECTED",
    remarksOverride?: string,
  ) => {
    const requestId = requestIdOverride || expReviewId;
    const decision = statusOverride || expReviewStatus;
    const remarks = remarksOverride ?? expReviewRemarks;
    if (!requestId || !["CLARIFICATION_REQUIRED", "APPROVED", "REJECTED"].includes(decision)) return;
    if ((decision === "CLARIFICATION_REQUIRED" || decision === "REJECTED") && !remarks.trim()) {
      toast.error("Review remarks explanation is mandatory for rejections or clarifications.");
      return;
    }

    setLoading(`review-${requestId}`);
    try {
      const res = await actions.reviewExpenseRequestAction(
        requestId,
        decision as "CLARIFICATION_REQUIRED" | "APPROVED" | "REJECTED",
        remarks
      );

      if (res.ok) {
        toast.success("Expense status updated.");
        setExpReviewId(null);
        setExpReviewRemarks("");
        router.refresh();
      } else {
        toast.error(res.error || "Action failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleExpenseClarification = async () => {
    if (!expenseClarificationId || !expenseClarificationText.trim()) {
      toast.error("Enter clarification details before submitting.");
      return;
    }
    setLoading(`clarify-${expenseClarificationId}`);
    try {
      const res = await actions.submitExpenseClarificationAction(expenseClarificationId, expenseClarificationText);
      if (res.ok) {
        toast.success("Clarification submitted for review.");
        setExpenseClarificationId(null);
        setExpenseClarificationText("");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to submit clarification.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleReadyForExpenseDisbursement = async (requestId: string) => {
    setLoading(`ready-${requestId}`);
    try {
      const res = await actions.markExpenseReadyForDisbursementAction(requestId);
      if (res.ok) {
        toast.success("Expense marked ready for disbursement.");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to mark expense ready for disbursement.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Post payment disburse details
  const handlePostExpensePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payRequestId || !payAmount || !payDate || !payRef || payProofFiles.length === 0) {
      toast.error("All payment disburse fields and payment proof are mandatory.");
      return;
    }

    setLoading(`pay-${payRequestId}`);
    try {
      const formData = new FormData();
      formData.set("amountPaid", payAmount);
      formData.set("paymentDate", payDate);
      formData.set("paymentMethod", payMethod);
      formData.set("transactionReference", payRef);
      payProofFiles.forEach((proofFile) => formData.append("paymentProof", proofFile));
      const res = await actions.postExpensePaymentAction(payRequestId, formData);

      if (res.ok) {
        toast.success("Expense payout posted. Requester notified.");
        setPayRequestId(null);
        setPayAmount("");
        setPayDate("");
        setPayRef("");
        setPayProofFiles([]);
        router.refresh();
      } else {
        toast.error(res.error || "Payout post failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Acknowledge receipt
  const handleAcknowledgeExpense = async (reqId: string) => {
    setLoading(`ack-${reqId}`);
    try {
      const res = await actions.acknowledgeExpenseReceiptAction(reqId);
      if (res.ok) {
        toast.success("Receipt acknowledged.");
        router.refresh();
      } else {
        toast.error(res.error || "Acknowledge failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Raise Query on Expense
  const handleRaiseQuery = async () => {
    if (!queryText.trim() || !queryRequestId) {
      toast.error("Written query description is mandatory.");
      return;
    }

    setLoading(`query-${queryRequestId}`);
    try {
      const res = await actions.raisePaymentQueryAction(queryRequestId, queryText);
      if (res.ok) {
        toast.success("Disbursement query dispatched.");
        setQueryText("");
        setQueryRequestId(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to raise query.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  // Resolve Query
  const handleResolveQuery = async () => {
    if (!resolutionText.trim() || !resolveQueryId) {
      toast.error("Resolution response is mandatory.");
      return;
    }

    setLoading(`resolve-${resolveQueryId}`);
    try {
      const res = await actions.resolvePaymentQueryAction(resolveQueryId, resolutionText);
      if (res.ok) {
        toast.success("Query resolved successfully.");
        setResolutionText("");
        setResolveQueryId(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to resolve query.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const docPercentage = useMemo(() => {
    if (activeStepIndex > 0) return 100;
    const total = visibleDocumentRequirements.length;
    if (total === 0) return 100;
    const uploaded = visibleDocumentRequirements.filter((r: any) => r.status === "UPLOADED" || r.status === "NOT_AVAILABLE" || r.exception).length;
    return Math.round((uploaded / total) * 100);
  }, [visibleDocumentRequirements, activeStepIndex]);

  const docValidationState = firstUnresolvedMandatoryDocumentId ? "Unresolved Documents" : "Valid";

  const additionalDataPercentage = useMemo(() => {
    if (activeStepIndex > 1) return 100;
    let filled = 0;
    let total = 2;
    if (vesselInwardDate) filled++;
    if (deliveryOrderValidity) filled++;
    if (manifestMandatory && manifestRequirement !== "NONE") {
      total++;
      if (requiresIgm && importGeneralManifest) filled++;
      if (requiresEgm && exportGeneralManifest) filled++;
      if (requiresCustomManifest && customManifestValue) filled++;
    }
    return Math.round((filled / total) * 100);
  }, [vesselInwardDate, deliveryOrderValidity, manifestMandatory, manifestRequirement, requiresIgm, importGeneralManifest, requiresEgm, exportGeneralManifest, requiresCustomManifest, customManifestValue, activeStepIndex]);

  const additionalDataValidationState = additionalDataComplete ? "Valid" : "Pending Fields";

  const checklistPrepPercentage = currentChecklistVersion ? 100 : 0;
  const checklistPrepValidationState = currentChecklistVersion ? "Uploaded" : "Awaiting File";

  const checklistApprovalPercentage = useMemo(() => {
    if (activeStepIndex > 3) return 100;
    if (!checklistWorkflow) return 0;
    let percent = 0;
    if (approvedInternalDecision) percent += 50;
    if (approvedCustomerDecision) percent += 50;
    return percent;
  }, [checklistWorkflow, approvedInternalDecision, approvedCustomerDecision, activeStepIndex]);

  const checklistApprovalValidationState = useMemo(() => {
    if (rejectedCustomerDecision) return "Customer Rework Required";
    if (approvedCustomerDecision) return "Approved";
    if (checklistWorkflow?.currentApprovalStage === "CUSTOMER") return "Awaiting Customer";
    if (checklistWorkflow?.currentApprovalStage === "INTERNAL") return "Awaiting Internal";
    return "Pending Upload";
  }, [checklistWorkflow, approvedCustomerDecision, rejectedCustomerDecision]);
  const checklistCombinedPercentage = activeStepIndex > 3
    ? 100
    : Math.round((checklistPrepPercentage + checklistApprovalPercentage) / 2);
  const checklistCombinedValidationState = currentChecklistVersion
    ? checklistApprovalValidationState
    : checklistPrepValidationState;
  const checklistCombinedStatusLabel = activeStepIndex > 3
    ? "Approved"
    : isChecklistCustomerReworkRequired
      ? "Customer Rework"
    : activeStepIndex === 3
      ? checklistWorkflow?.currentApprovalStage === "CUSTOMER" ? "Waiting Customer" : "Waiting Approval"
      : currentChecklistVersion
        ? "Waiting Approval"
        : activeStepIndex === 2
          ? "Awaiting Upload"
          : "Locked";

  const customerDecisionToastKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!finalCustomerDecision?.action || finalCustomerDecision.action === "PENDING") return;
    const toastKey = `${finalCustomerDecision.id}-${finalCustomerDecision.action}`;
    if (customerDecisionToastKeyRef.current === toastKey) return;
    customerDecisionToastKeyRef.current = toastKey;
    const actorLabel = getDecisionActorLabel(finalCustomerDecision);
    if (finalCustomerDecision.action === "REJECTED") {
      toast.error(`Customer rejected the checklist. Rework upload is required.`, {
        description: actorLabel,
      });
      return;
    }
    toast.success(`Customer approved the checklist. Filing is ready.`, {
      description: actorLabel,
    });
  }, [finalCustomerDecision]);

  const filingPercentage = activeStepIndex > 4 ? 100 : filingInstance?.activeNodeRun ? 50 : 0;
  const filingValidationState = isActiveStageBlocked ? "Blocked" : activeStepIndex > 4 ? "Filed" : "Active";

  const filedPercentage = activeStepIndex >= 5 ? 100 : 0;
  const filedValidationState = activeStepIndex >= 5 ? "Completed" : "Locked";

  const workflowUiActiveStageIndex = getWorkflowUiStageIndex(job.stage);
  const stageProgress = activeStepIndex >= 5
    ? 100
    : workflowUiActiveStageIndex >= 0
      ? Math.round(((workflowUiActiveStageIndex + 1) / WORKFLOW_UI_STAGES.length) * 100)
      : 0;
  const showDocumentCollectionStage = true;
  const showAdditionalDataStage = activeStepIndex >= 1;
  const showChecklistPreparationStage = activeStepIndex >= 2;
  const activeNodeSequence = useMemo(() => {
    const activeNodeKey = activeNodeRun?.nodeKey;
    if (!activeNodeKey || !filingInstance?.version?.nodes) return null;
    const nodeIndex = filingInstance.version.nodes.findIndex((node: any) => node.key === activeNodeKey);
    return nodeIndex >= 0 ? nodeIndex + 1 : null;
  }, [activeNodeRun?.nodeKey, filingInstance?.version?.nodes]);

  const activeNodeSubtitle = useMemo(() => {
    const node = activeNodeRun?.node;
    if (!node) return null;
    const parts = [node.description, node.sectionName, node.branchName]
      .filter((value) => typeof value === "string" && value.trim().length > 0);
    return parts[0] ?? null;
  }, [activeNodeRun?.node]);
  const filingCompletedSteps = useMemo(
    () =>
      (filingInstance?.nodeRuns || [])
        .filter((run: any) => run.status === "COMPLETED" || run.status === "SKIPPED")
        .sort(
          (left: any, right: any) =>
            new Date(right.completedAt || right.updatedAt || right.createdAt).getTime() -
            new Date(left.completedAt || left.updatedAt || left.createdAt).getTime(),
        )
        .map((run: any) => ({
          id: run.id,
          nodeName: run.node?.name || run.nodeName || "Completed Stage",
          completedAt: run.completedAt || run.updatedAt || run.createdAt,
          completedByName: run.completedBy?.name || run.completedByName || null,
          status: run.status,
        })),
    [filingInstance?.nodeRuns],
  );
  const finalFilingReviewStages = useMemo(() => {
    if (!filingInstance?.nodeRuns) return [];

    const nodeOrder = new Map<string, number>(
      (filingInstance.version?.nodes || []).map((node: any, index: number) => [node.key, index]),
    );
    const responsesByRun = new Map<string, any[]>();
    for (const response of filingInstance.responses || []) {
      if (!response.nodeRunId) continue;
      const current = responsesByRun.get(response.nodeRunId) || [];
      current.push(response);
      responsesByRun.set(response.nodeRunId, current);
    }

    return (filingInstance.nodeRuns || [])
      .filter((run: any) => run.status === "COMPLETED" || run.status === "SKIPPED")
      .filter((run: any) => run.nodeKey !== activeNodeRun?.nodeKey)
      .sort((left: any, right: any) => {
        const leftOrder = nodeOrder.get(left.nodeKey) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = nodeOrder.get(right.nodeKey) ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return new Date(left.startedAt || left.createdAt).getTime() - new Date(right.startedAt || right.createdAt).getTime();
      })
      .map((run: any, index: number) => {
        const responses = responsesByRun.get(run.id) || [];
        const completedResponses = responses.filter((response: any) => response.isChecked);
        const attachments = Array.isArray(run.attachments) ? run.attachments : [];
        const fieldValues = Array.isArray(run.fieldValues) ? run.fieldValues : [];
        const queries = Array.isArray(run.queries) ? run.queries : [];
        const openQueries = queries.filter((query: any) => query.status !== "CLOSED");
        return {
          id: run.id,
          sequence: index + 1,
          nodeName: run.node?.name || run.nodeKey || "Completed Stage",
          sectionLabel: [run.node?.sectionName, run.node?.branchName].filter(Boolean).join(" / "),
          status: run.status,
          startedAt: run.startedAt || run.createdAt || null,
          completedAt: run.completedAt || run.updatedAt || null,
          completedByName: run.completedBy?.name || null,
          remarks: typeof run.remarks === "string" && run.remarks.trim() ? run.remarks.trim() : null,
          delayRemarks: typeof run.delayRemarks === "string" && run.delayRemarks.trim() ? run.delayRemarks.trim() : null,
          checklistCompletedCount: completedResponses.length,
          checklistTotalCount: responses.length || (run.node?.checklistItems || []).filter((item: any) => item.isActive !== false).length,
          completedResponses,
          attachments,
          fieldValues,
          queries,
          openQueryCount: openQueries.length,
        };
      });
  }, [activeNodeRun?.nodeKey, filingInstance?.nodeRuns, filingInstance?.responses, filingInstance?.version?.nodes]);
  const latestCompletedRunForActiveNode = useMemo(() => {
    if (!activeNodeRun?.nodeKey) return null;
    return (filingInstance?.nodeRuns || [])
      .filter((run: any) => run.status === "COMPLETED" && run.nodeKey === activeNodeRun.nodeKey)
      .sort(
        (left: any, right: any) =>
          new Date(right.completedAt || right.updatedAt || right.createdAt).getTime() -
          new Date(left.completedAt || left.updatedAt || left.createdAt).getTime(),
      )[0] ?? null;
  }, [activeNodeRun?.nodeKey, filingInstance?.nodeRuns]);
  const filingBannerStatus = useMemo(() => {
    if (loading === "filing-complete") {
      return {
        label: isFinalFilingNode ? "Filing..." : "Completing...",
        description: isFinalFilingNode
          ? "Final workflow closure is in progress. The job will move to FILED."
          : "Final handoff is in progress for this filing stage.",
      };
    }
    if (isActiveStageBlocked) {
      return {
        label: "Blocked",
        description:
          activeNodePrerequisiteStatus?.missingNodeNames?.length
            ? `Waiting on ${activeNodePrerequisiteStatus.missingNodeNames.join(", ")} before this stage can continue.`
            : "This stage is blocked until its prerequisite workflow conditions are satisfied.",
      };
    }
    if (latestCompletedRunForActiveNode) {
      const reopenedAt = activeNodeRun?.createdAt || activeNodeRun?.updatedAt || null;
      const reopenedAtLabel = reopenedAt ? new Date(reopenedAt).toLocaleString("en-IN") : null;
      return {
        label: "Reopened Live",
        description: reopenedAtLabel
          ? `This stage was reopened and is currently live again from ${reopenedAtLabel}.`
          : "This completed stage was reopened and is currently live again.",
      };
    }
    return {
      label: "In Progress",
      description: activeNodeSubtitle || "Complete this active stage to continue the filing workflow.",
    };
  }, [
    activeNodePrerequisiteStatus?.missingNodeNames,
    activeNodeRun?.createdAt,
    activeNodeRun?.updatedAt,
    activeNodeSubtitle,
    isActiveStageBlocked,
    isFinalFilingNode,
    latestCompletedRunForActiveNode,
    loading,
  ]);

  const showFilingStage = activeStepIndex >= 4;
  const showExpenseStage = true;
  const showFiledStage = activeStepIndex >= 5;
  const uploadExcludedRequirements = useMemo(
    () =>
      visibleDocumentRequirements.filter((req: any) => req.status === "NOT_AVAILABLE" || !!req.exception),
    [visibleDocumentRequirements],
  );
  const uploadEligibleRequirements = useMemo(
    () =>
      visibleDocumentRequirements.filter((req: any) => !(req.status === "NOT_AVAILABLE" || !!req.exception)),
    [visibleDocumentRequirements],
  );
  const uploadedEligibleRequirements = useMemo(
    () =>
      uploadEligibleRequirements.filter((req: any) => req.status === "UPLOADED"),
    [uploadEligibleRequirements],
  );
  const pendingEligibleRequirements = useMemo(
    () =>
      uploadEligibleRequirements.filter((req: any) => req.status !== "UPLOADED"),
    [uploadEligibleRequirements],
  );
  const workflowProgressPercent = useMemo(() => {
    if (uploadEligibleRequirements.length === 0) return 100;
    return Math.round((uploadedEligibleRequirements.length / uploadEligibleRequirements.length) * 100);
  }, [uploadEligibleRequirements.length, uploadedEligibleRequirements.length]);
  const workflowCurrentStepLabel = pendingEligibleRequirements.length > 0 ? "Uploads Pending" : "Completed";
  const selectedDocumentPreviewUrl = selectedWorkflowDocumentVersion
    ? previewUrls[selectedWorkflowDocumentVersion.id] || selectedWorkflowDocumentVersion.fileKey || `/api/cha/documents/${selectedWorkflowDocumentVersion.id}`
    : null;
  const selectedDocumentDownloadUrl = selectedWorkflowDocumentVersion
    ? previewUrls[selectedWorkflowDocumentVersion.id] ||
      (selectedWorkflowDocumentVersion.source === "CUSTOMER_PORTAL"
        ? `/api/cha/customer-documents/${selectedWorkflowDocumentVersion.id}?download=true`
        : `/api/cha/documents/${selectedWorkflowDocumentVersion.id}?download=true`)
    : null;
  const deliveryOrderValiditySummary = getValiditySummary(deliveryOrderValidity || null);
  const workspaceTabs: { key: WorkspaceTab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "docs", label: "Documents", count: visibleDocumentRequirements.length },
    { key: "additionalData", label: "Additional Data" },
    { key: "checklist", label: "Checklist" },
    { key: "filing", label: "Filing" },
    { key: "advances", label: "Advances" },
    { key: "expenses", label: "Expenses", count: job.expenseRequests?.length || 0 },
    { key: "audit", label: "Audit" },
  ];
  const currentStageLabel = STAGES[Math.max(activeStepIndex, 0)]?.label ?? "Pending";
  const isOverviewTab = activeTab === "overview";
  const shipmentModeName = String(job.shipmentType?.name || job.jobType?.movementDirection || "Clearance");
  const shipmentModeUpper = shipmentModeName.toUpperCase();
  const shipmentModeIcon =
    shipmentModeUpper.includes("AIR") ? <Plane size={18} /> : shipmentModeUpper.includes("SEA") ? <Ship size={18} /> : <Boxes size={18} />;
  const topJobBadges = [
    { label: job.jobType?.name || "JOB TYPE", variant: "secondary" as const },
    ...(job.shipmentType?.name ? [{ label: job.shipmentType.name, variant: "secondary" as const }] : []),
    ...(job.branch?.name ? [{ label: job.branch.name, variant: "secondary" as const }] : []),
    { label: formatChaBadgeLabel(job.status), variant: getChaJobStatusBadgeVariant(job.status) },
  ];
  const overviewMetaItems = [
    {
      label: "Customer",
      value: job.customer?.name || "Not assigned",
      secondary: job.customer?.branchName || null,
      icon: <Building2 size={16} />,
    },
    {
      label: "Owner",
      value: job.primaryOwner?.name || "Not assigned",
      secondary: job.primaryOwner?.email || null,
      icon: <UserRound size={16} />,
    },
    {
      label: "Manager",
      value: job.assignedManager?.name || "Not assigned",
      secondary: job.assignedManager?.email || null,
      icon: <UserRound size={16} />,
    },
    {
      label: "Job Created",
      value: job.createdAt ? new Date(job.createdAt).toLocaleDateString("en-IN") : "Not available",
      secondary: job.createdAt ? new Date(job.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : null,
      icon: <CalendarDays size={16} />,
    },
    {
      label: "Last Updated",
      value: job.updatedAt ? new Date(job.updatedAt).toLocaleDateString("en-IN") : "Not available",
      secondary: job.updatedAt ? new Date(job.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : null,
      icon: <RefreshCcw size={16} />,
    },
    {
      label: "Job Type",
      value: job.jobType?.name || "Not configured",
      secondary: job.shipmentType?.name || null,
      icon: <Boxes size={16} />,
    },
    {
      label: "Reference",
      value: job.referenceNumber || job.referenceCode || job.reference || job.filing?.filingReference || "Not assigned",
      secondary: job.branch?.name || null,
      icon: <Bookmark size={16} />,
    },
  ];
  const overviewSummaryItems = [
    { label: "Shipment Type", value: job.shipmentType?.name || shipmentModeName || "Not set", icon: <Package size={14} /> },
    { label: job.shipmentType?.name?.toUpperCase() === "AIR" ? "Flight / Voyage" : "Vessel / Voyage", value: job.flightNumber || job.vesselName || job.carrierName || "Not set", icon: job.shipmentType?.name?.toUpperCase() === "AIR" ? <Plane size={14} /> : <Ship size={14} /> },
    { label: "Port of Discharge", value: job.portOfDischarge || job.port?.name || job.branch?.name || "Not set", icon: <MapPin size={14} /> },
    { label: "Bill of Lading", value: job.additionalData?.mblNumber || job.additionalData?.hblNumber || manifestPreview || "Not set", icon: <FileText size={14} />, numeric: true },
    { label: "No. of Packages", value: job.packageCount || job.numberOfPackages || "Not set", icon: <Package size={14} />, numeric: true },
    {
      label: "Container Number",
      value:
        normalizeContainerEntries(job.additionalData?.containerDetails)
          .map((entry) => entry.containerNumber)
          .filter(Boolean)
          .join(", ") || "Not set",
      icon: <Boxes size={14} />,
      numeric: true,
    },
  ];
  const overviewDateItems = [
    {
      label: "DO Validity",
      value: deliveryOrderValidity ? new Date(deliveryOrderValidity).toLocaleDateString("en-IN") : "Not required",
      badge: getDaysRemainingSummary(deliveryOrderValidity || null),
      icon: <CalendarDays size={14} />,
    },
    {
      label: "CE/Lab Report Validity",
      value: job.ceLabReportValidity ? new Date(job.ceLabReportValidity).toLocaleDateString("en-IN") : "Not required",
      badge: getDaysRemainingSummary(job.ceLabReportValidity || null),
      icon: <FileText size={14} />,
    },
    {
      label: "E-way Bill Validity",
      value: job.ewayBillValidity ? new Date(job.ewayBillValidity).toLocaleDateString("en-IN") : "Not required",
      badge: getDaysRemainingSummary(job.ewayBillValidity || null),
      icon: <FileText size={14} />,
    },
    {
      label: "Bill Filing Due Date",
      value: job.filing?.estimatedFilingDate ? new Date(job.filing.estimatedFilingDate).toLocaleDateString("en-IN") : "Pending",
      badge: getDaysRemainingSummary(job.filing?.estimatedFilingDate || null),
      icon: <Clock3 size={14} />,
    },
  ].filter((item) => item.value);
  const overviewRecentLogs = (job.auditLogs || []).slice(0, 4);
  const liveStatusTitle =
    job.status === "COMPLETED"
      ? "Completed"
      : activeStepIndex >= 5
        ? "Filed and Completed"
        : activeStepIndex >= 4
          ? "At Filing Stage"
          : activeStepIndex >= 3
            ? "Checklist In Approval"
            : activeStepIndex >= 2
              ? "Checklist In Preparation"
              : activeStepIndex >= 1
                ? "Additional Data In Progress"
                : "Document Collection In Progress";
  const liveStatusLocation = job.portOfDischarge || job.port?.name || job.branch?.name || "Tracking location unavailable";
  const liveStatusOrigin = job.countryOfOrigin || job.originCountry || job.customer?.branchName || "Origin pending";
  const liveStatusDestination = job.portOfDischarge || job.port?.name || job.branch?.name || "Destination pending";
  const overviewWorkflowStages = [
    {
      key: "OVERVIEW",
      label: "Overview",
      isCompleted: true,
      isCurrent: false,
      percent: null as number | null,
      onClick: () => navigateToWorkspaceTab("overview"),
    },
    ...WORKFLOW_UI_STAGES.map((stage, index) => {
      let percent: number | null = null;
      if (stage.key === "DOCUMENT_COLLECTION") percent = docPercentage;
      if (stage.key === "ADDITIONAL_DATA") percent = additionalDataPercentage;
      if (stage.key === "CHECKLIST") percent = checklistCombinedPercentage;
      if (stage.key === "FILING") percent = filingPercentage;
      if (stage.key === "FILED") percent = filedPercentage;
      if (stage.key === "EXPENSES") percent = null;
      const isFiledComplete = stage.key === "FILED" && activeStepIndex >= 5;
      const isExpenseCurrent = stage.key === "EXPENSES" && activeTab === "expenses";
      return {
        key: stage.key,
        label: stage.label,
        isCompleted: isFiledComplete || (stage.key !== "EXPENSES" && !isExpenseCurrent && index < workflowUiActiveStageIndex),
        isCurrent: isExpenseCurrent || index === workflowUiActiveStageIndex,
        percent,
        onClick: () => openWorkflowStage(stage.key),
      };
    }),
  ];
  const workspaceQuickActions = [
    { label: "Upload Document", note: "Add new document", icon: <Upload size={16} />, onClick: () => navigateToWorkspaceTab("docs"), accent: "cyan" as const, visible: true },
    { label: "Add Query", note: "Raise a new query", icon: <AlertCircle size={16} />, onClick: () => navigateToWorkspaceTab("filing"), accent: "orange" as const, visible: activeStepIndex >= 4 },
    { label: "View Workflow", note: "See filing workflow", icon: <Zap size={16} />, onClick: () => navigateToWorkspaceTab("filing"), accent: "cyan" as const, visible: true },
    { label: "Bill Filing", note: "Manage bill filing", icon: <FileText size={16} />, onClick: () => navigateToWorkspaceTab("filing"), accent: "cyan" as const, visible: activeStepIndex >= 4 },
    { label: "Request Expense", note: "Raise expense request", icon: <CreditCard size={16} />, onClick: () => navigateToWorkspaceTab("expenses"), accent: "cyan" as const, visible: canCreateExpenseRequests },
    { label: "Job Activity", note: "View all activities", icon: <History size={16} />, onClick: () => navigateToWorkspaceTab("audit"), accent: "cyan" as const, visible: true },
  ].filter((action) => action.visible);
  return (
    <main className="cha-job-workspace w-full space-y-5 overflow-x-hidden pb-6">
      <div className="space-y-4">
          <section
            className="ds-section-panel relative overflow-hidden"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.94) 46%, rgba(239,246,255,0.72) 68%, rgba(219,234,254,0.34) 100%), url("${CHA_OVERVIEW_BANNER_ART}")`,
              backgroundPosition: "right center",
              backgroundSize: "cover",
            }}
          >
            <div className="absolute inset-0 hidden dark:block" style={{ background: "linear-gradient(90deg, rgba(17,24,39,0.96) 0%, rgba(17,24,39,0.88) 48%, rgba(15,23,42,0.62) 74%, rgba(15,23,42,0.36) 100%)" }} />
            <div className="relative space-y-5 px-5 py-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {topJobBadges.map((badge) => (
                      <Badge key={`${badge.label}-${badge.variant}`} variant={badge.variant} className="uppercase">
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="ds-h1 ds-numeric text-on-surface">{job.jobNumber}</h1>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(job.jobNumber);
                        toast.success("Job number copied.");
                      }}
                      className="ds-plain rounded-full border border-outline-variant p-2 text-on-surface-variant transition hover:border-[#00cec4] hover:text-[#00cec4]"
                      aria-label="Copy job number"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <p className="text-sm text-on-surface-variant">{job.title}</p>
                </div>

                <div className="flex items-center gap-2 self-start">
                  {canDeleteJob ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 !border-red-500/45 !bg-white !text-red-500 hover:!border-red-600 hover:!bg-white hover:!text-red-600 dark:!bg-surface [&_svg]:!text-red-500 [&_svg]:!stroke-red-500"
                        disabled={loading !== null || Boolean(activeDeletionRequest)}
                        onClick={() => setDeleteModalMode("delete")}
                      >
                        <Trash2 className="mr-1.5 size-3.5" />
                        Delete Job
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="w-full rounded-xl border border-white/65 bg-white/78 shadow-[0_26px_44px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-white/8 dark:bg-[rgba(15,23,42,0.82)]">
                <div className="flex flex-col xl:flex-row w-full divide-y xl:divide-y-0 xl:divide-x divide-[#dbeafe] dark:divide-white/6">
                  {overviewMetaItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex min-h-[104px] items-start gap-3 px-4 py-4 flex-auto min-w-[140px]"
                    >
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#20e7df]/12 text-[#12d8d0] shadow-[inset_0_0_0_1px_rgba(32,231,223,0.18)]">
                        {item.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="ds-label">{item.label}</p>
                        <p className="mt-1 break-words text-sm font-medium text-on-surface">{item.value}</p>
                        {item.secondary ? (
                          <p 
                            className="mt-1 break-all text-xs leading-normal text-on-surface-variant"
                            title={item.secondary}
                          >
                            {item.secondary}
                          </p>
                        ) : null}
                        {item.label === "Manager" && canUpdateJob ? (
                          <button
                            type="button"
                            onClick={() => setIsEditingManager(true)}
                            className="mt-2 rounded-full border border-[#20e7df]/50 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#00b8af] transition-colors hover:bg-[#20e7df]/12 hover:text-[#00a9a5] dark:bg-[rgba(30,41,59,0.85)] dark:text-[#20e7df]"
                          >
                            Change
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="ds-section-panel px-4 py-4">
            <div className="mb-4">
              <div className="flex items-center justify-between gap-3">
                <p className="ds-label">Progress</p>
                <p className="ds-numeric text-sm text-[#00cec4]">{stageProgress}%</p>
              </div>
              <div className="ds-progress-bar mt-2 w-full">
                <span style={{ width: `${stageProgress}%` }} />
              </div>
            </div>

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <button
                  type="button"
                  aria-label="Scroll workflow stages left"
                  onClick={() => overviewStageScrollerRef.current?.scrollBy({ left: -320, behavior: "smooth" })}
                  className="ds-plain ds-workflow-link flex size-8 shrink-0 items-center justify-center text-on-surface-variant hover:text-[#00cec4]"
                >
                  <ChevronLeft size={18} />
                </button>
                <div ref={overviewStageScrollerRef} className="no-scrollbar min-w-0 flex-1 overflow-x-auto">
                  <div className="flex min-w-max items-center gap-0">
                    {overviewWorkflowStages.map((stage, index) => (
                      <div key={stage.key} className="flex items-center">
                        <button
                          type="button"
                          onClick={stage.onClick}
                          className="ds-plain ds-workflow-link flex items-center gap-3 px-3 py-2 text-left"
                        >
                          <span
                            className={cn(
                              "flex size-7 items-center justify-center rounded-full border text-[11px] font-semibold ds-numeric",
                              stage.isCurrent && "animate-current-stage-number",
                              stage.isCompleted || stage.isCurrent
                                ? "ds-workflow-dot-active bg-surface"
                                : "ds-workflow-dot",
                            )}
                          >
                            {stage.isCompleted ? <Check size={12} /> : index}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className={cn(
                              "whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em]",
                              stage.isCurrent
                                ? "text-[#00cec4]"
                                : "text-on-surface",
                            )}>
                              {stage.label}
                            </span>
                            {typeof stage.percent === "number" ? (
                              <span className="ds-numeric text-[10px] text-[#00cec4]">{stage.percent}%</span>
                            ) : null}
                          </span>
                        </button>
                        {index < overviewWorkflowStages.length - 1 ? (
                          <span className="mx-1 h-px w-8 rounded-full bg-outline-variant" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Scroll workflow stages right"
                  onClick={() => overviewStageScrollerRef.current?.scrollBy({ left: 320, behavior: "smooth" })}
                  className="ds-plain ds-workflow-link flex size-8 shrink-0 items-center justify-center text-on-surface-variant hover:text-[#00cec4]"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

            </div>
          </section>
      </div>

      {dueDateWarnings.map((warning) => (
        <ChaDueDateWarningNote
          key={warning.notificationId}
          warning={warning}
          onAcknowledged={() => {
            setDueDateWarnings((current) =>
              current.filter((entry) => entry.notificationId !== warning.notificationId),
            );
          }}
        />
      ))}

      {filingValidationWarning ? (
        <div className="card-left-accent-orange rounded-xl border border-red-500/35 bg-surface p-4 shadow-[0_18px_38px_-30px_rgba(239,68,68,0.38)]">
          <div className="flex items-start gap-3">
            <span className="ds-icon-badge animate-pulse-red shrink-0" style={{ background: "rgba(239,68,68,0.10)", color: "#f87171" }}>
              <AlertTriangle size={18} />
            </span>
            <div className="min-w-0 space-y-2">
              <p className="ds-label !text-red-500">Filing Stage Warning</p>
              <p className="text-sm font-medium text-on-surface">{filingValidationWarning.message}</p>
              <ul className="grid gap-1 text-xs text-on-surface-variant md:grid-cols-2">
                {filingValidationWarning.details.slice(0, 6).map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {!job.assignedManagerId && (
        <div className="rounded-2xl border border-[#fb923c]/35 bg-[#fb923c]/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <span className="ds-label text-[#fb923c]">Job Settings Alert</span>
              <p className="text-sm font-semibold text-on-surface">
                No manager assigned for this job.
              </p>
              <p className="text-xs text-on-surface-variant">
                An assigned manager is required to proceed with checklist upload and approval.
              </p>
            </div>
            {canUpdateJob && (
              <Button
                variant="outline"
                className="border-[#fb923c]/50 text-[#fb923c] hover:bg-[#fb923c]/10 shrink-0"
                onClick={() => setIsEditingManager(true)}
              >
                Assign Manager
              </Button>
            )}
          </div>
        </div>
      )}

      {activeDeletionRequest ? (
        <div className="rounded-2xl border border-[#fb923c]/35 bg-[#fb923c]/8 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <span className="ds-label text-[#fb923c]">Deletion Workflow</span>
              <p className="text-sm font-medium text-on-surface">
                {activeDeletionRequest.status === "PENDING"
                  ? `Deletion request is pending with ${activeDeletionRequest.assignedManager?.name || "the assigned manager"}.`
                  : "Deletion request has been approved and is awaiting execution."}
              </p>
              <p className="text-xs text-on-surface-variant">
                Requested by {activeDeletionRequest.requestedBy?.name || "Unknown"} on{" "}
                {new Date(activeDeletionRequest.requestedAt).toLocaleString("en-IN")}
              </p>
            </div>

            {pendingDeletionReview && canApproveDeleteJob ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="border-red-200 text-red-500 hover:bg-red-50"
                  disabled={loading !== null}
                  onClick={() => setDeleteModalMode("reject")}
                >
                  Reject Request
                </Button>
                <Button
                  variant="destructive"
                  disabled={loading !== null}
                  onClick={() => setDeleteModalMode("approve")}
                >
                  Approve & Delete
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <aside className="hidden">
          <div className="border-b border-outline-variant/20 px-2 pb-3">
            <h2 className="ds-h3 text-on-surface">Workflow</h2>
            <p className="mt-1 text-xs text-on-surface-variant">Secondary stage navigator</p>
          </div>

          <nav className="space-y-2 pt-3">
            {WORKFLOW_UI_STAGES.map((stage, index) => {
              const isFiledComplete = stage.key === "FILED" && activeStepIndex >= 5;
              const isExpenseCurrent = stage.key === "EXPENSES" && activeTab === "expenses";
              const isCompleted = isFiledComplete || (stage.key !== "EXPENSES" && !isExpenseCurrent && index < workflowUiActiveStageIndex);
              const isActive = isExpenseCurrent || index === workflowUiActiveStageIndex;
              const isLocked = stage.key !== "EXPENSES" && !isFiledComplete && index > workflowUiActiveStageIndex;

              let percent = 0;
              let valState = "";
              let statusColor = "text-on-surface-variant";
              let statusBg = "bg-surface-container-low";
              let statusLabel = "Pending";

              if (stage.key === "DOCUMENT_COLLECTION") {
                percent = docPercentage;
                valState = docValidationState;
                if (isCompleted) {
                  statusColor = "text-green-500";
                  statusBg = "bg-green-500/10";
                  statusLabel = "Completed";
                } else {
                  statusColor = "text-[#00cec4]";
                  statusBg = "bg-[#00cec4]/10";
                  statusLabel = "In Progress";
                }
              } else if (stage.key === "ADDITIONAL_DATA") {
                percent = additionalDataPercentage;
                valState = additionalDataValidationState;
                if (isCompleted) {
                  statusColor = "text-green-500";
                  statusBg = "bg-green-500/10";
                  statusLabel = "Completed";
                } else if (isActive) {
                  statusColor = "text-[#00cec4]";
                  statusBg = "bg-[#00cec4]/10";
                  statusLabel = "In Progress";
                } else {
                  statusColor = "text-on-surface-variant/40";
                  statusBg = "bg-surface-container-low/50";
                  statusLabel = "Locked";
                }
              } else if (stage.key === "CHECKLIST") {
                percent = checklistCombinedPercentage;
                valState = checklistCombinedValidationState;
                if (isCompleted) {
                  statusColor = "text-green-500";
                  statusBg = "bg-green-500/10";
                  statusLabel = "Completed";
                } else if (isActive) {
                  if (checklistWorkflow?.currentApprovalStage === "CUSTOMER") {
                    statusColor = "text-[#00cec4]";
                    statusBg = "bg-[#00cec4]/10";
                    statusLabel = "Awaiting Customer";
                  } else if (currentChecklistVersion) {
                    statusColor = "text-[#fb923c]";
                    statusBg = "bg-[#fb923c]/10";
                    statusLabel = "Awaiting Internal";
                  } else {
                    statusColor = "text-[#00cec4]";
                    statusBg = "bg-[#00cec4]/10";
                    statusLabel = "Awaiting Upload";
                  }
                } else {
                  statusColor = "text-on-surface-variant/40";
                  statusBg = "bg-surface-container-low/50";
                  statusLabel = "Locked";
                }
              } else if (stage.key === "FILING") {
                percent = filingPercentage;
                valState = filingValidationState;
                if (isCompleted) {
                  statusColor = "text-green-500";
                  statusBg = "bg-green-500/10";
                  statusLabel = "Completed";
                } else if (isActive) {
                  statusColor = "text-[#00cec4]";
                  statusBg = "bg-[#00cec4]/10";
                  statusLabel = "In Progress";
                } else {
                  statusColor = "text-on-surface-variant/40";
                  statusBg = "bg-surface-container-low/50";
                  statusLabel = "Locked";
                }
              } else if (stage.key === "FILED") {
                percent = filedPercentage;
                valState = filedValidationState;
                if (isCompleted) {
                  statusColor = "text-green-500";
                  statusBg = "bg-green-500/10";
                  statusLabel = "Filed";
                } else {
                  statusColor = "text-on-surface-variant/40";
                  statusBg = "bg-surface-container-low/50";
                  statusLabel = "Locked";
                }
              } else if (stage.key === "EXPENSES") {
                percent = 0;
                valState = "Open";
                if (isActive) {
                  statusColor = "text-[#00cec4]";
                  statusBg = "bg-[#00cec4]/10";
                  statusLabel = "Open";
                } else {
                  statusColor = "text-[#00cec4]";
                  statusBg = "bg-[#00cec4]/10";
                  statusLabel = "Open";
                }
              }

              const isHighlighted =
                (activeTab === "docs" && stage.key === "DOCUMENT_COLLECTION") ||
                (activeTab === "additionalData" && stage.key === "ADDITIONAL_DATA") ||
                (activeTab === "checklist" && stage.key === "CHECKLIST") ||
                (activeTab === "filing" && stage.key === "FILING") ||
                (activeTab === "filing" && stage.key === "FILED" && activeStepIndex >= 5) ||
                (activeTab === "expenses" && stage.key === "EXPENSES");

              const createdDate = new Date(job.createdAt || Date.now());
              const stageDate = new Date(createdDate.getTime() + index * 45 * 60 * 1000);
              const formattedDate = stageDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " - " + stageDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

              return (
                <div key={stage.key} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        return;
                      }
                      openWorkflowStage(stage.key);
                    }}
                    disabled={isLocked}
                    className={`group relative flex w-full flex-col gap-2 rounded-[18px] p-3 text-left transition-all ${isHighlighted
                        ? "bg-gradient-to-r from-[#00cec4]/12 via-[#00cec4]/10 to-[#00b8af]/8 text-[#00a9b2] shadow-[0_20px_40px_-28px_rgba(0,206,196,0.65)]"
                        : isLocked
                          ? "cursor-not-allowed opacity-50"
                          : "hover:bg-surface-container-low/80"
                      }`}
                  >
                    {/* Left border indicator for highlighted step */}
                    {isHighlighted && (
                      <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-md bg-gradient-to-b from-[#00cec4] to-[#00b8af]" />
                    )}

                    {/* Header block with circle and stage label */}
                    <div className="flex items-center gap-2.5 w-full">
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all ${isCompleted
                            ? "bg-green-600 text-white shadow-[0_14px_28px_-18px_rgba(22,163,74,0.8)]"
                            : isHighlighted
                              ? "bg-gradient-to-br from-[#00cec4] via-[#00c4b6] to-[#00a9b2] text-white shadow-[0_18px_34px_-18px_rgba(0,206,196,0.9)]"
                              : "border border-outline-variant bg-surface text-on-surface-variant"
                          }`}
                      >
                        {isCompleted ? <Check size={11} /> : isLocked ? <Lock size={9} /> : index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold uppercase tracking-wide truncate ${isHighlighted ? "text-[#00a9b2]" : "text-on-surface"
                          }`}>
                          {stage.label}
                        </p>
                      </div>
                    </div>

                    {/* Stage parameters info block */}
                    <div className="w-full space-y-1 pl-7 text-[10px] text-on-surface-variant">
                      {/* Status badge and progress */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-block rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.16em] ${statusBg} ${statusColor}`}>
                          {statusLabel}
                        </span>
                        {!isLocked && (
                          <span className="ds-numeric font-mono text-[10px] text-on-surface font-semibold">{percent}%</span>
                        )}
                      </div>

                      {/* Owner / Assignee */}
                      <div className="flex items-center justify-between text-[9px] opacity-80">
                        <span>Owner:</span>
                        <span className="font-medium text-on-surface truncate max-w-[100px]">{job.primaryOwner.name}</span>
                      </div>

                      {/* Due date or completion date */}
                      <div className="flex items-center justify-between text-[9px] opacity-80">
                        <span>{isCompleted ? "Closed:" : "Due:"}</span>
                        <span className="ds-numeric text-on-surface">
                          {isCompleted
                            ? formattedDate.split(" - ")[0]
                            : job.estimatedClosureDate
                              ? new Date(job.estimatedClosureDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                              : "-"
                          }
                        </span>
                      </div>

                      {/* Validation Text */}
                      {valState && (
                        <div className="text-[8px] text-on-surface-variant/70 italic truncate">
                          {valState}
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Connector line */}
                  {index < WORKFLOW_UI_STAGES.length - 1 && (
                    <div className={`ml-[15px] h-4 w-[2px] rounded-full ${index < workflowUiActiveStageIndex ? "bg-gradient-to-b from-green-500 to-green-400" : index === workflowUiActiveStageIndex ? "bg-gradient-to-b from-[#00cec4]/45 to-[#00cec4]/20" : "bg-outline-variant/40"
                      }`} />
                  )}
                </div>
              );
            })}

            {/* Divider: Utility sections */}
            <div className="my-2 border-t border-outline-variant/30" />
            {([
              { key: "advances" as WorkspaceTab, label: "Advances", icon: <CreditCard size={13} /> },
              { key: "expenses" as WorkspaceTab, label: "Expenses", icon: <BarChart2 size={13} />, count: job.expenseRequests?.length || 0 },
              { key: "audit" as WorkspaceTab, label: "Audit Log", icon: <ClipboardList size={13} /> },
            ] as { key: WorkspaceTab; label: string; icon: React.ReactNode; count?: number }[]).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => navigateToWorkspaceTab(item.key)}
                className={`flex w-full items-center gap-2.5 rounded-[18px] px-3 py-2.5 text-left transition-all ${activeTab === item.key
                    ? "bg-gradient-to-r from-[#00cec4]/10 to-[#00b8af]/8 text-[#00a9b2]"
                    : "hover:bg-surface-container-low text-on-surface-variant"
                  }`}
              >
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${activeTab === item.key
                    ? "bg-[#00cec4]/12 text-[#00a9b2]"
                    : "bg-surface-container-low text-on-surface-variant"
                  }`}>
                  {item.icon}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold ds-numeric ${activeTab === item.key ? "bg-[#00cec4] text-white" : "bg-surface-container text-on-surface-variant"
                    }`}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Overall Progress footer */}
          <div className="border-t border-outline-variant/30 px-4 py-4">
            <p className="ds-label text-on-surface-variant">Overall Progress</p>
            <p className="ds-numeric mt-1 text-3xl font-bold text-[#00a9b2]">{stageProgress}%</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-outline-variant/25">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#00cec4] via-[#00b8af] to-[#22c55e] transition-all duration-500"
                style={{ width: `${stageProgress}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-on-surface-variant">
              {workflowUiActiveStageIndex} of {WORKFLOW_UI_STAGES.length} stages completed
            </p>
          </div>
        </aside>

        <div className="min-w-0 space-y-3">
          {/* Secondary tab header card */}
          {activeTab !== "overview" && !["docs", "additionalData", "checklist", "filing", "expenses"].includes(activeTab) && (() => {
            const stageDescriptions: Record<string, string> = {
              docs: "Upload required customs documents or declare exceptions to pass the document verification gate.",
              additionalData: "Enter vessel inward date, manifest numbers, delivery order validity, and container details.",
              checklist: "Upload the customs checklist file for internal and customer approval before filing.",
              filing: "Enter BOE details and related information.",
              advances: "Track customer advance payments and record receipts.",
              expenses: "Submit and manage expense disbursement requests for this job.",
              audit: "View a complete audit trail of all actions and changes made to this job.",
            };
            const stageIcons: Record<string, React.ReactNode> = {
              docs: <FolderOpen size={18} />,
              additionalData: <Database size={18} />,
              checklist: <ShieldCheck size={18} />,
              filing: <FileText size={18} />,
              advances: <CreditCard size={18} />,
              expenses: <BarChart2 size={18} />,
              audit: <ClipboardList size={18} />,
            };
            const stageTitle = workspaceTabs.find(t => t.key === activeTab)?.label ?? "";
            const stageNum = activeTab === "docs" ? 1 : activeTab === "additionalData" ? 2 : activeTab === "checklist" ? 3 : activeTab === "filing" ? 4 : null;
            const displayTitle = stageNum ? `${stageNum}. ${stageTitle}` : stageTitle;

            return (
              <div className="rounded-[28px] border border-outline-variant/35 bg-surface px-6 py-5 shadow-[0_22px_52px_-38px_rgba(15,23,42,0.34)]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="flex size-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#00cec4] via-[#00c4b6] to-[#00a9b2] text-white shadow-[0_18px_36px_-18px_rgba(0,206,196,0.9)]">
                      {stageIcons[activeTab]}
                    </span>
                    <div>
                      <h2 className="ds-h2 text-on-surface">{displayTitle}</h2>
                      <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{stageDescriptions[activeTab]}</p>
                    </div>
                  </div>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); toast.info("Help instructions loading..."); }}
                    className="flex items-center gap-1.5 rounded-full border border-[#00cec4]/20 bg-[#00cec4]/8 px-3 py-2 text-xs font-bold text-[#00a9b2] transition-colors hover:bg-[#00cec4]/14"
                  >
                    <HelpCircle size={15} className="rounded-full border border-[#00cec4]/30 p-0.5" />
                    Help
                  </a>
                </div>
              </div>
            );
          })()}

          {/* Tab Panels */}
          {["docs", "additionalData", "checklist", "filing", "expenses"].includes(activeTab) ? (
            <div className="space-y-6">
              {/* 1. DOCUMENT_COLLECTION */}
              {showDocumentCollectionStage ? (
                <MilestoneCard
                  stageKey="DOCUMENT_COLLECTION"
                  isExpanded={expandedStageKey === "DOCUMENT_COLLECTION"}
                  isSpotlit={stageFocusKey === "DOCUMENT_COLLECTION"}
                  onToggle={handleMilestoneToggle}
                  title="Doc Collection"
                  description="Upload required customs documents or declare exceptions to pass the document verification gate."
                  isCompleted={activeStepIndex > 0}
                  isActive={activeStepIndex === 0}
                  isLocked={false}
                  percentage={docPercentage}
                  validationState={docValidationState}
                  statusLabel={activeStepIndex > 0 ? "Completed" : activeStepIndex === 0 ? "In Progress" : "Available"}
                  assignedUser={job.primaryOwner?.name || job.assignedManager?.name || "Operations Team"}
                  dueDate={job.estimatedClosureDate ? new Date(job.estimatedClosureDate).toLocaleDateString("en-IN") : null}
                  completedAt={activeStepIndex > 0 ? (job.updatedAt ? new Date(job.updatedAt).toLocaleString("en-IN") : null) : null}
                  summary={
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="text-on-surface-variant font-medium">Uploaded:</span>
                      {visibleDocumentRequirements.filter((r: any) => r.status === "UPLOADED").map((r: any) => (
                        <Badge key={r.id} variant="secondary" className="text-[10px] uppercase font-mono">{r.name}</Badge>
                      ))}
                      {visibleDocumentRequirements.filter((r: any) => r.status === "NOT_AVAILABLE" || r.exception).length > 0 && (
                        <span className="text-orange-500 font-medium">({visibleDocumentRequirements.filter((r: any) => r.status === "NOT_AVAILABLE" || r.exception).length} exceptions)</span>
                      )}
                    </div>
                  }
                >
                  <div className="space-y-6">
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
                      <div className="space-y-5">
                        <WorkflowDocumentsSectionHeader
                          uploadedCount={uploadedWorkflowDocuments.length}
                          searchValue={documentSearchQuery}
                          onSearchChange={setDocumentSearchQuery}
                          filterMode={documentsFilterMode}
                          onFilterChange={setDocumentsFilterMode}
                        />

                        <div className="flex flex-wrap items-center justify-end gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleMarkAllNotAvailable}
                            disabled={loading !== null || bulkNaEligibleRequirements.length === 0}
                            className="border-[#fb923c]/45 text-[#fb923c] hover:bg-surface"
                          >
                            {loading === "na-all" ? "Marking..." : "Mark All N/A"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowSection49Modal(true)}
                            disabled={loading !== null || !canUpdateJob}
                            className={
                              section49Flag?.isEnabled
                                ? "border-[#00cec4]/45 text-[#00cec4] hover:bg-surface"
                                : "border-[#fb923c]/45 text-[#fb923c] hover:bg-surface"
                            }
                          >
                            {section49Flag?.isEnabled ? "Deactivate Section 49" : "Activate Section 49"}
                          </Button>
                          <Button type="button" onClick={() => setIsCustomDocumentModalOpen(true)} className="gap-2">
                            <Plus size={14} />
                            Add Custom Document
                          </Button>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                          {sortedUploadedWorkflowDocuments.length > 0 ? (
                            sortedUploadedWorkflowDocuments.map((req: any) => {
                              const currentVersion = req.versions.find((version: WorkflowDocumentVersion) => version.isCurrent) || req.versions[0];
                              if (!currentVersion) return null;
                              const customerSubmission = req.customerSubmission ?? null;
                              const usesCustomerSubmission = Boolean(req.usesCustomerSubmission && customerSubmission);
                              const canAcceptCustomerSubmission =
                                usesCustomerSubmission &&
                                ["UPLOADED", "UNDER_REVIEW", "CLARIFICATION_REQUIRED", "REUPLOAD_REQUIRED"].includes(customerSubmission.status);

                              return (
                                <div
                                  key={req.id}
                                  ref={(element) => {
                                    documentRequirementCardRefs.current[req.id] = element;
                                  }}
                                  className={cn("h-full", highlightedDocumentReqId === req.id ? "animate-doc-missing-blink" : "")}
                                >
                                  <UploadedWorkflowDocumentCard
                                    requirement={req}
                                    version={currentVersion}
                                    loadingKey={loading}
                                    currentUserId={currentUserId}
                                    canDelete={Boolean(canDeleteDoc || canManageSettings || currentUserId === job.primaryOwnerId)}
                                    selected={selectedDocumentRequirementId === req.id}
                                    onSelect={(requirementId) => {
                                      setSelectedDocumentRequirementId(requirementId);
                                      setIsDocumentDrawerOpen(true);
                                      setDocumentDrawerTab("preview");
                                    }}
                                    onPreview={(requirementId) => {
                                      setSelectedDocumentRequirementId(requirementId);
                                      setIsDocumentDrawerOpen(true);
                                      setDocumentDrawerTab("preview");
                                    }}
                                    onDelete={(requirementId, versionId, fileName) =>
                                      setDeleteDocModal({
                                        reqId: requirementId,
                                        versionId,
                                        fileName,
                                      })
                                    }
                                    onDeclareExemption={(requirementId) => {
                                      setSelectedDocumentRequirementId(requirementId);
                                      setIsDocumentDrawerOpen(false);
                                      setActiveDocReqId(requirementId);
                                      const currentRequirement = documentRequirements.find((entry: any) => entry.id === requirementId);
                                      setExceptionReason(
                                        currentRequirement?.exception?.reason === "N/A"
                                          ? ""
                                          : currentRequirement?.exception?.reason || "",
                                      );
                                    }}
                                    onMarkNa={handleMarkNotAvailable}
                                    onUpload={setUploadDocumentModalReqId}
                                    uploadButtonLabel={usesCustomerSubmission ? "Upload CHA Copy" : undefined}
                                    helperContent={
                                      usesCustomerSubmission ? (
                                        <div className="space-y-2">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="secondary">CUSTOMER PORTAL</Badge>
                                            {customerSubmission.portalUser?.name ? (
                                              <span className="text-xs text-on-surface-variant">
                                                Uploaded by {customerSubmission.portalUser.name}
                                              </span>
                                            ) : null}
                                          </div>
                                          <p className="text-sm font-semibold text-on-surface">
                                            Customer-uploaded file awaiting CHA decision
                                          </p>
                                          <p className="text-xs text-on-surface-variant">
                                            Accept this file to save it as the submitted CHA document, or upload the CHA copy yourself if you need to replace it.
                                          </p>
                                          {customerSubmission.reviewerComment ? (
                                            <p className="text-xs text-[#fb923c]">{customerSubmission.reviewerComment}</p>
                                          ) : null}
                                        </div>
                                      ) : null
                                    }
                                    footerActions={
                                      canAcceptCustomerSubmission ? (
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="gap-2"
                                          disabled={loading !== null}
                                          onClick={() => handleAcceptCustomerDocument(req.id)}
                                        >
                                          <CheckCircle2 size={14} />
                                          {loading === `customer-accept-${req.id}` ? "Accepting..." : "Accept Customer Upload"}
                                        </Button>
                                      ) : null
                                    }
                                  />
                                </div>
                              );
                            })
                          ) : (
                            <div className="xl:col-span-2 flex items-center justify-center gap-3 rounded-xl border border-dashed border-outline-variant/60 bg-surface p-8 text-center text-sm text-on-surface-variant shadow-[0_18px_40px_-34px_rgba(15,23,42,0.14)]">
                              <Search size={18} className="shrink-0 text-[#00cec4]" />
                              <span>No uploaded documents match the current search and filter state yet.</span>
                            </div>
                          )}
                        </div>

                        {section49Requirement ? (
                          <div className="rounded-[24px] border border-outline-variant/60 bg-surface p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.16)]">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <p className="ds-label text-[#00cec4]">Section 49 Controls</p>
                                <div className="mt-2 grid grid-cols-[4px_minmax(0,1fr)] items-center gap-4">
                                  <span className="h-7 w-1 rounded-sm bg-[#00cec4]" aria-hidden="true" />
                                  <h3 className="ds-h3 text-on-surface">Manage Section 49 validity and extension workflow</h3>
                                </div>
                                <p className="mt-1 text-sm text-on-surface-variant">
                                  Keep the saved validity date current and attach extension evidence when customs warns of expiry.
                                </p>
                              </div>
                              {section49ValiditySummary ? (
                                <Badge
                                  variant={
                                    section49ValiditySummary.tone === "destructive"
                                      ? "destructive"
                                      : section49ValiditySummary.tone === "warning"
                                        ? "warning"
                                        : "success"
                                  }
                                >
                                  {section49ValiditySummary.detail}
                                </Badge>
                              ) : null}
                            </div>

                            <div className="mt-4 space-y-4">
                              {section49Flag?.validityDate ? (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-outline-variant/50 bg-surface-container-low/55 px-4 py-3">
                                  <div>
                                    <p className="ds-label">Saved Section 49 Validity</p>
                                    <p className="mt-1 ds-numeric text-sm text-on-surface">
                                      {new Date(section49Flag.validityDate).toLocaleDateString("en-IN")}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setUploadDocumentModalReqId(section49Requirement.id)}
                                    disabled={loading !== null}
                                  >
                                    Re-upload Section 49 Document
                                  </Button>
                                </div>
                              ) : (
                                <div className="grid gap-3 rounded-[20px] border border-outline-variant/50 bg-surface-container-low/55 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                                  <label className="space-y-1">
                                    <span className="ds-label">Section 49 Validity Date</span>
                                    <DateInput
                                      value={section49ValidityDate}
                                      onChange={(e) => setSection49ValidityDate(e.target.value)}
                                      disabled={loading !== null || !canUpdateJob}
                                      className="w-full ds-numeric"
                                    />
                                  </label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleSaveSection49Validity}
                                    disabled={loading !== null || !canUpdateJob || !section49ValidityDate}
                                  >
                                    {loading === "section49-validity" ? "Saving..." : "Save Date"}
                                  </Button>
                                </div>
                              )}

                              {section49Flag?.validityDate ? (
                                <div className="space-y-3 rounded-[20px] border border-outline-variant/50 bg-surface-container-low/55 p-4">
                                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto] lg:items-end">
                                    <label className="space-y-1">
                                      <span className="ds-label">New Validity Date</span>
                                      <DateInput
                                        value={section49ExtensionDate}
                                        onChange={(e) => setSection49ExtensionDate(e.target.value)}
                                        disabled={loading !== null || !canUpdateJob}
                                        className="w-full ds-numeric"
                                      />
                                    </label>
                                    <FileUploadField
                                      id="section49-extension-upload"
                                      compact
                                      label="Extension Document"
                                      accept="application/pdf,image/*"
                                      disabled={loading !== null || !canUpdateJob}
                                      helperText="Upload a PDF or image before applying the extension."
                                      triggerText="Choose extension document"
                                      selectedFile={
                                        section49ExtensionFile
                                          ? {
                                            file: section49ExtensionFile,
                                            name: section49ExtensionFile.name,
                                            sizeBytes: section49ExtensionFile.size,
                                            statusLabel: "Ready",
                                          }
                                          : null
                                      }
                                      onClear={() => setSection49ExtensionFile(null)}
                                      onInputChange={(e) => setSection49ExtensionFile(e.target.files?.[0] ?? null)}
                                    />
                                    <Button
                                      type="button"
                                      onClick={handleApplySection49Extension}
                                      disabled={
                                        loading !== null ||
                                        !canUpdateJob ||
                                        !section49WarningActive ||
                                        !section49ExtensionDate ||
                                        !section49ExtensionFile
                                      }
                                      className="w-full lg:w-auto"
                                    >
                                      {loading === "section49-extension" ? "Applying..." : "Apply Extension"}
                                    </Button>
                                  </div>
                                  <p className="text-xs text-on-surface-variant">
                                    {section49WarningActive
                                      ? "An extension document and new validity date are required to apply the extension."
                                      : "Extension submission becomes available only within four days of expiry or after expiry."}
                                  </p>

                                  {Array.isArray(job.section49Extensions) && job.section49Extensions.length > 0 ? (
                                    <div className="space-y-2 border-t border-outline-variant/30 pt-3">
                                      <p className="ds-label">Extension History</p>
                                      {job.section49Extensions.slice(0, 3).map((extension: any) => (
                                        <div key={extension.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-on-surface-variant">
                                          <span className="ds-numeric">
                                            {new Date(extension.extensionDate).toLocaleDateString("en-IN")}
                                          </span>
                                          {extension.fileKey ? (
                                            <a
                                              href={extension.fileKey}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-[#00cec4] hover:underline"
                                            >
                                              {extension.fileName || "View document"}
                                            </a>
                                          ) : null}
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}

                        {activeExceptionRequirement ? (
                          <div className="rounded-[24px] border border-outline-variant/60 bg-surface p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.16)]">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <p className="ds-label text-[#fb923c]">Exemption Draft</p>
                                <div className="mt-2 grid grid-cols-[4px_minmax(0,1fr)] items-center gap-3">
                                  <span className="h-7 w-1 rounded-sm bg-[#00cec4]" aria-hidden="true" />
                                  <h3 className="ds-h3 text-on-surface">{activeExceptionRequirement.name}</h3>
                                </div>
                                <p className="mt-1 text-sm text-on-surface-variant">
                                  Record the business reason for handling this requirement without a file upload.
                                </p>
                              </div>
                              <Badge variant="warning">PENDING EXEMPTION</Badge>
                            </div>
                            <div className="mt-4 space-y-3">
                              <textarea
                                value={exceptionReason}
                                onChange={(event) => setExceptionReason(event.target.value)}
                                placeholder="Enter detailed reason for exemption..."
                                className="min-h-28 w-full rounded-[20px] border border-outline-variant/55 bg-surface px-4 py-3 text-sm text-on-surface"
                              />
                              <div className="flex flex-wrap justify-end gap-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setActiveDocReqId(null);
                                    setExceptionReason("");
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button type="button" onClick={() => handleDeclareException(activeExceptionRequirement.id)}>
                                  Save Exemption
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="space-y-4">
                          {groupedPendingWorkflowDocuments.length > 0 ? (
                            groupedPendingWorkflowDocuments.map((group) => (
                              <section key={group.categoryName} className="space-y-4">
                                <div className="grid grid-cols-[4px_minmax(0,1fr)] items-start gap-3">
                                  <span className="mt-0.5 h-7 w-1 rounded-sm bg-[#00cec4]" aria-hidden="true" />
                                  <div className="min-w-0 space-y-1">
                                    <p className="ds-h3 text-on-surface">{group.categoryName}</p>
                                    <p className="text-sm text-on-surface-variant">
                                      {group.requirements.length} requirement{group.requirements.length === 1 ? "" : "s"} pending action in this category.
                                    </p>
                                  </div>
                                </div>
                                <div className="grid gap-4 xl:grid-cols-2">
                                  {group.requirements.map((req: WorkflowDocumentRequirement) => (
                                    <div
                                      key={req.id}
                                      ref={(element) => {
                                        documentRequirementCardRefs.current[req.id] = element;
                                      }}
                                      className={highlightedDocumentReqId === req.id ? "animate-doc-missing-blink" : ""}
                                    >
                                      <RequirementDocumentCard
                                        requirement={req}
                                        loadingKey={loading}
                                        selected={selectedDocumentRequirementId === req.id}
                                        onSelect={(requirementId) => {
                                          setSelectedDocumentRequirementId(requirementId);
                                          setIsDocumentDrawerOpen(true);
                                          setDocumentDrawerTab("preview");
                                        }}
                                        onUndo={handleRemoveException}
                                        onUpload={setUploadDocumentModalReqId}
                                        onDeclareExemption={(requirementId) => {
                                          setSelectedDocumentRequirementId(requirementId);
                                          setIsDocumentDrawerOpen(false);
                                          setActiveDocReqId(requirementId);
                                          const currentRequirement = documentRequirements.find((entry: any) => entry.id === requirementId);
                                          setExceptionReason(
                                            currentRequirement?.exception?.reason === "N/A"
                                              ? ""
                                              : currentRequirement?.exception?.reason || "",
                                          );
                                        }}
                                        onMarkNa={handleMarkNotAvailable}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </section>
                            ))
                          ) : (
                            <div className="rounded-[24px] border border-outline-variant/60 bg-surface p-8 text-center text-sm text-on-surface-variant shadow-[0_18px_40px_-34px_rgba(15,23,42,0.14)]">
                              No pending or exception-based requirements match the current filter.
                            </div>
                          )}
                        </div>

                        {job.stage === "DOCUMENT_COLLECTION" && (
                          <div className="flex flex-col gap-3 border-t border-outline-variant/25 pt-4 sm:items-end">
                            {proceedErrors ? (
                              <div className="w-full rounded-[20px] border border-[#fb923c]/30 bg-[#fb923c]/10 p-4 text-xs text-[#fb923c] sm:max-w-xl">
                                <p className="ds-label mb-1 text-[#fb923c]">Proceed Blocked</p>
                                <p>{proceedErrors[0]}</p>
                              </div>
                            ) : null}
                            <div className="w-full">
                              <SlideToComplete
                                key="document-stage-slider"
                                disabled={loading !== null || !!firstUnresolvedMandatoryDocumentId}
                                text={loading === "proceed-stage" ? "Advancing stage..." : "Slide to complete this step"}
                                onComplete={handleProceedStage}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-5 xl:sticky xl:top-24 w-full xl:w-[360px] flex-shrink-0">
                        <div ref={dropzoneRef}>
                          <DocumentDropzone
                            requirement={selectedWorkflowDocumentRequirement}
                            requirementsList={filteredWorkflowDocuments}
                            onRequirementIdChange={(id) => {
                              setSelectedDocumentRequirementId(id);
                              setIsDocumentDrawerOpen(true);
                              setDocumentDrawerTab("preview");
                            }}
                            disabled={loading !== null}
                            onInputChange={handleUploadDoc}
                          />
                        </div>

                        <div 
                          ref={previewDrawerRef}
                          style={{
                            transform: `translateY(${previewOffset}px)`,
                            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          }}
                        >
                          <FilingDocumentPreviewDrawer
                            open={isDocumentDrawerOpen}
                            requirement={selectedWorkflowDocumentRequirement}
                            version={selectedWorkflowDocumentVersion}
                            previewUrl={selectedDocumentPreviewUrl}
                            downloadUrl={selectedDocumentDownloadUrl}
                            loadingPreview={loadingPreview}
                            activeTab={documentDrawerTab}
                            currentStepLabel={`${workflowProgressPercent}% Uploaded • ${workflowCurrentStepLabel}`}
                            currentStageLabel={currentStageLabel}
                            dueDate={job.estimatedClosureDate || null}
                            onClose={() => setIsDocumentDrawerOpen(false)}
                            onTabChange={setDocumentDrawerTab}
                            onPreviewLoad={() => setLoadingPreview(false)}
                            onPreviewError={() => setLoadingPreview(false)}
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </MilestoneCard>
              ) : null}

              {/* 2. ADDITIONAL_DATA */}
              {showAdditionalDataStage ? (
                <MilestoneCard
                  stageKey="ADDITIONAL_DATA"
                  isExpanded={expandedStageKey === "ADDITIONAL_DATA"}
                  isSpotlit={stageFocusKey === "ADDITIONAL_DATA"}
                  onToggle={handleMilestoneToggle}
                  title="Additional Data"
                  description="Enter vessel inward date, manifest numbers, delivery order validity, and container details."
                  isCompleted={activeStepIndex > 1}
                  isActive={activeStepIndex === 1}
                  isLocked={activeStepIndex < 1}
                  percentage={additionalDataPercentage}
                  validationState={additionalDataValidationState}
                  statusLabel={activeStepIndex > 1 ? "Completed" : activeStepIndex === 1 ? "In Progress" : "Locked"}
                  assignedUser={job.primaryOwner?.name || "Operations Team"}
                  dueDate={deliveryOrderValidity ? new Date(deliveryOrderValidity).toLocaleDateString("en-IN") : null}
                  completedAt={activeStepIndex > 1 ? (job.additionalData?.updatedAt ? new Date(job.additionalData.updatedAt).toLocaleString("en-IN") : null) : null}
                  summary={
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-on-surface-variant block text-[10px] uppercase">Vessel Inward Date</span>
                        <span className="font-semibold text-on-surface ds-numeric">{vesselInwardDate ? new Date(vesselInwardDate).toLocaleDateString("en-IN") : "-"}</span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant block text-[10px] uppercase">DO Validity</span>
                        <span className="font-semibold text-on-surface ds-numeric">{deliveryOrderValidity ? new Date(deliveryOrderValidity).toLocaleDateString("en-IN") : "-"}</span>
                      </div>
                      {requiresIgm && (
                        <div>
                          <span className="text-on-surface-variant block text-[10px] uppercase">IGM Number</span>
                          <span className="font-semibold text-on-surface font-mono">{importGeneralManifest || "-"}</span>
                        </div>
                      )}
                      {requiresEgm && (
                        <div>
                          <span className="text-on-surface-variant block text-[10px] uppercase">EGM Number</span>
                          <span className="font-semibold text-on-surface font-mono">{exportGeneralManifest || "-"}</span>
                        </div>
                      )}
                    </div>
                  }
                >
                  <div className="space-y-4">
                    {job.stage === "DOCUMENT_COLLECTION" ? (
                      <div className="flex items-start gap-3 rounded-2xl border border-[#fb923c]/40 bg-surface p-4">
                        <AlertTriangle size={22} className="mt-0.5 shrink-0 text-[#fb923c]" />
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-wide text-[#fb923c]">DOCUMENT GATE REQUIRED</h4>
                          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                            Complete Document Collection before saving or completing Additional Data.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {manifestConfigMissing ? (
                      <div className="flex items-start gap-3 rounded-2xl border border-[#fb923c]/40 bg-surface p-4">
                        <AlertTriangle size={22} className="mt-0.5 shrink-0 text-[#fb923c]" />
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-wide text-[#fb923c]">Manifest Configuration Required</h4>
                          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                            This clearance type is missing manifest configuration. Please update it in CHA settings before continuing.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                      <AdditionalDataStatCard label="Status" value={job.additionalData?.status ?? "PENDING"} />
                      <AdditionalDataStatCard
                        label="Last Updated"
                        value={job.additionalData?.updatedAt
                          ? new Date(job.additionalData.updatedAt).toLocaleDateString("en-IN")
                          : "Not saved"}
                        numeric
                      />
                      <AdditionalDataStatCard label="Manifest" value={manifestPreview} numeric />
                      <AdditionalDataStatCard label="Direction" value={manifestMovementDirection || "Not Configured"} />
                      <AdditionalDataStatCard label="BL No" value={blPreview} />
                      <AdditionalDataStatCard label="Containers" value={String(populatedContainerCount)} numeric />
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]">
                      <div className="space-y-4">
                        <div className="card-cyan-outline card-top-accent rounded-xl border border-outline-variant/40 bg-surface p-4 shadow-sm">
                          <SectionHeading
                            title="Core Filing Data"
                            description="Complete the job movement and manifest references required before checklist preparation."
                          />
                          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
                            <label className="space-y-1.5 xl:col-span-4">
                              <span className="ds-label">Vessel Inward Date</span>
                              <DateInput
                                value={vesselInwardDate}
                                onChange={(e) => setVesselInwardDate(e.target.value)}
                                disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                                required
                                className="w-full"
                              />
                            </label>
                            <label className="space-y-1.5 xl:col-span-4">
                              <span className="ds-label">Delivery Order Validity</span>
                              <DateInput
                                id="deliveryOrderValidity"
                                value={deliveryOrderValidity}
                                onChange={(e) => setDeliveryOrderValidity(e.target.value)}
                                disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                                required
                                className="w-full"
                              />
                            </label>
                            {requiresIgm ? (
                              <label className="space-y-1.5 xl:col-span-4">
                                <span className="ds-label">IGM Number</span>
                                <Input
                                  type="text"
                                  inputMode="text"
                                  pattern="[A-Za-z0-9]*"
                                  value={importGeneralManifest}
                                  onChange={(e) => setImportGeneralManifest(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                                  disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked || manifestConfigMissing}
                                  required={manifestMandatory}
                                  className="w-full"
                                  placeholder={job.jobType?.manifestHelpText || "Enter IGM reference"}
                                />
                              </label>
                            ) : null}
                            {requiresEgm ? (
                              <label className="space-y-1.5 xl:col-span-4">
                                <span className="ds-label">EGM Number</span>
                                <Input
                                  type="text"
                                  inputMode="text"
                                  pattern="[A-Za-z0-9]*"
                                  value={exportGeneralManifest}
                                  onChange={(e) => setExportGeneralManifest(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                                  disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked || manifestConfigMissing}
                                  required={manifestMandatory}
                                  className="w-full"
                                  placeholder={job.jobType?.manifestHelpText || "Enter EGM reference"}
                                />
                              </label>
                            ) : null}
                            {requiresCustomManifest ? (
                              <label className="space-y-1.5 xl:col-span-4">
                                <span className="ds-label">{customManifestLabel}</span>
                                <Input
                                  type="text"
                                  value={customManifestValue}
                                  onChange={(e) => setCustomManifestValue(e.target.value)}
                                  disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked || manifestConfigMissing}
                                  required={manifestMandatory}
                                  className="w-full"
                                  placeholder={job.jobType?.manifestHelpText || `Enter ${customManifestLabel}`}
                                />
                              </label>
                            ) : null}
                          </div>
                          {job.additionalData ? (
                            <div className="mt-4 pt-4">
                              <DoValidityPanel
                                key={job.additionalData.deliveryOrderExtensionDate ?? "no-do-extension-date"}
                                jobId={job.id}
                                canUpdateJob={canUpdateJob}
                                additionalData={{
                                  deliveryOrderValidity: job.additionalData.deliveryOrderValidity ?? null,
                                  deliveryOrderExtensionDate: job.additionalData.deliveryOrderExtensionDate ?? null,
                                  doDocumentFileKey: job.additionalData.doDocumentFileKey ?? null,
                                  doDocumentFileName: job.additionalData.doDocumentFileName ?? null,
                                  doDocumentUploadedAt: job.additionalData.doDocumentUploadedAt ?? null,
                                }}
                                extensions={job.doExtensions ?? []}
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="card-cyan-outline card-top-accent rounded-xl border border-outline-variant/40 bg-surface p-4 shadow-sm">
                          <SectionHeading
                            title="BL References"
                            description="Store master and house bill numbers alongside the shipment record."
                          />
                          <div className="mt-4 grid grid-cols-1 gap-4">
                            <label className="space-y-1.5">
                              <span className="ds-label">MBL</span>
                              <Input
                                type="text"
                                value={mblNumber}
                                onChange={(e) => setMblNumber(e.target.value)}
                                disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                                className="w-full"
                                placeholder="Enter MBL number"
                              />
                            </label>
                            <label className="space-y-1.5">
                              <span className="ds-label">HBL</span>
                              <Input
                                type="text"
                                value={hblNumber}
                                onChange={(e) => setHblNumber(e.target.value)}
                                disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                                className="w-full"
                                placeholder="Enter HBL number"
                              />
                            </label>
                          </div>
                        </div>

                        <div className="card-cyan-outline card-top-accent rounded-xl border border-outline-variant/40 bg-surface p-4 shadow-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <SectionHeading
                              title="Containers"
                              description="Add only the container numbers that need to stay with this job."
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addContainerEntry}
                              disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                              className="w-full sm:w-auto"
                            >
                              <Plus className="mr-1.5 size-4" />
                              Add Container
                            </Button>
                          </div>
                          <div className="mt-4 grid grid-cols-1 gap-3">
                            {containerEntries.map((entry, index) => (
                              <div key={`container-${index}`} className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_64px] md:items-end">
                                <label className="space-y-1.5">
                                  <span className="ds-label">Container {index + 1}</span>
                                  <Input
                                    type="text"
                                    value={entry.containerNumber}
                                    onChange={(e) => updateContainerEntry(index, "containerNumber", e.target.value)}
                                    disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                                    className="w-full"
                                    placeholder={`Enter container ${index + 1} number`}
                                  />
                                </label>
                                <div className="flex items-end">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    mode="icon"
                                    onClick={() => removeContainerEntry(index)}
                                    disabled={job.stage === "DOCUMENT_COLLECTION" || additionalDataLocked}
                                    aria-label={`Remove container ${index + 1}`}
                                    className="h-11 w-full border-outline-variant/60 text-on-surface-variant hover:border-red-500/40 hover:bg-surface hover:text-red-500 md:w-16"
                                  >
                                    <Trash2 className="size-5" strokeWidth={2.2} />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`grid gap-3 pt-4 lg:items-center ${canEditAdditionalData || !additionalDataLocked
                          ? "lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]"
                          : "lg:grid-cols-1"
                        }`}
                    >
                      {job.stage === "ADDITIONAL_DATA" ? (
                        <div className="w-full">
                          <SlideToComplete
                            key="additional-data-slider"
                            disabled={loading !== null || !additionalDataComplete || manifestConfigMissing}
                            text={loading === "additional-data-proceed" ? "Saving and Proceeding..." : "Slide to complete Additional Data"}
                            onComplete={handleProceedAdditionalData}
                          />
                        </div>
                      ) : null}
                      {canEditAdditionalData || !additionalDataLocked ? (
                        <div className="flex justify-end">
                          {canEditAdditionalData && additionalDataLocked ? (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={loading !== null || isAdditionalDataEditing}
                              onClick={() => setIsAdditionalDataEditing(true)}
                              className="w-full"
                            >
                              <Pencil className="mr-2 size-4" />
                              Edit Additional Data
                            </Button>
                          ) : null}
                          {!additionalDataLocked ? (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={loading !== null || job.stage === "DOCUMENT_COLLECTION" || manifestConfigMissing}
                              onClick={handleSaveAdditionalData}
                              className="w-full"
                            >
                              <Database className="mr-2 size-4" />
                              {loading === "additional-data-save" ? "Saving..." : "Save Additional Data"}
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </MilestoneCard>
              ) : null}

              {/* 3. CHECKLIST */}
              {showChecklistPreparationStage ? (
                <MilestoneCard
                  stageKey="CHECKLIST"
                  isExpanded={expandedStageKey === "CHECKLIST"}
                  isSpotlit={stageFocusKey === "CHECKLIST"}
                  onToggle={handleMilestoneToggle}
                  title="Checklist Preparation & Approval"
                  description="Upload the customs checklist file and route approvals through internal and customer review."
                  isCompleted={activeStepIndex > 3}
                  isActive={activeStepIndex === 2 || activeStepIndex === 3}
                  isLocked={activeStepIndex < 2}
                  percentage={checklistCombinedPercentage}
                  validationState={checklistCombinedValidationState}
                  statusLabel={checklistCombinedStatusLabel}
                  assignedUser={currentChecklistVersion ? job.assignedManager?.name || "Approval Team" : undefined}
                  dueDate={currentChecklistVersion ? customerApprovalVisibleAt ? customerApprovalVisibleAt.toLocaleString("en-IN") : (job.estimatedClosureDate ? new Date(job.estimatedClosureDate).toLocaleDateString("en-IN") : null) : null}
                  completedAt={activeStepIndex > 3 ? (approvedCustomerDecision?.actedAt ? new Date(approvedCustomerDecision.actedAt).toLocaleString("en-IN") : approvedInternalDecision?.actedAt ? new Date(approvedInternalDecision.actedAt).toLocaleString("en-IN") : null) : null}
                  summary={
                    <div className="grid gap-3 text-xs sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <span className="text-on-surface-variant">Checklist File:</span>{" "}
                        {currentChecklistVersion ? (
                          <span className="font-mono font-semibold text-on-surface">{currentChecklistVersion.originalFileName} (V{currentChecklistVersion.versionNumber})</span>
                        ) : (
                          <span className="italic text-red-500">No checklist uploaded yet</span>
                        )}
                      </div>
                      <div className="flex gap-4 sm:justify-end">
                        <span className={approvedInternalDecision ? "text-green-600" : "text-orange-500"}>
                          Internal: {approvedInternalDecision ? "Approved" : "Pending"}
                        </span>
                        <span className={approvedCustomerDecision ? "text-green-600" : "text-orange-500"}>
                          Customer: {approvedCustomerDecision ? "Approved" : "Pending"}
                        </span>
                      </div>
                    </div>
                  }
                >
                  <div className="space-y-5">
                    {!job.assignedManagerId && (
                      <div className="bg-surface border border-[#fb923c]/40 p-4 rounded-2xl flex items-start gap-3">
                        <AlertTriangle size={24} className="text-[#fb923c] shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-sm uppercase text-[#fb923c]">Manager Assignment Recommended</h4>
                          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                            No manager has been assigned to this job yet. Internal approval can still be completed by the job owner, or route through the owner&apos;s Manager or TL if configured in HRMS, but assigning a manager keeps responsibility explicit.
                          </p>
                          {canUpdateJob && (
                            <button
                              type="button"
                              onClick={() => setIsEditingManager(true)}
                              className="ds-plain cha-link mt-2 text-xs font-semibold hover:underline uppercase tracking-wider"
                            >
                              Assign Manager Now -&gt;
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="ds-label">
                          {currentChecklistVersion ? "Replacement Upload" : "Checklist Upload"}
                        </span>
                        <p className="text-xs text-on-surface-variant">
                          Any file format is allowed here. The uploaded file will move into internal approval automatically.
                        </p>

                        {isChecklistCustomerReworkRequired ? (
                          <div className="card-left-accent-orange rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-on-surface">Customer rejected the latest checklist.</p>
                                <p className="text-xs text-on-surface-variant">
                                  Upload a reworked checklist file here. The replacement will restart internal approval and will move directly to Filing after employee approval.
                                </p>
                                {rejectedCustomerDecision?.remarks ? (
                                  <p className="text-xs text-on-surface">
                                    Reason: {rejectedCustomerDecision.remarks}
                                  </p>
                                ) : null}
                              </div>
                              <Badge variant="destructive" className="uppercase">
                                Rework Required
                              </Badge>
                            </div>
                          </div>
                        ) : null}

                        <FileUploadField
                          id="checklist-file-upload"
                          disabled={loading === "checklist-upload" || internalApproversCount === 0}
                          uploading={loading === "checklist-upload"}
                          uploadingLabel="Uploading checklist..."
                          helperText="Any file format is allowed here. The uploaded file will move into internal approval automatically."
                          triggerText="Drag and drop or choose checklist file to upload"
                          selectedFile={
                            checklistFile
                              ? {
                                file: checklistFile,
                                name: checklistFile.name,
                                sizeBytes: checklistFile.size,
                                statusLabel: loading === "checklist-upload" ? "Uploading" : "Ready",
                              }
                              : null
                          }
                          onClear={() => setChecklistFile(null)}
                          onInputChange={(e) => handleUploadChecklist(e.target.files?.[0] || null)}
                        />
                        <textarea
                          rows={2}
                          value={checklistRemarks}
                          disabled={internalApproversCount === 0}
                          onChange={(e) => setChecklistRemarks(e.target.value)}
                          placeholder="Optional upload remarks"
                          className="ds-textarea w-full disabled:opacity-50"
                        />
                      </div>

                      {currentChecklistVersion ? (
                        <div className="space-y-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <span className="ds-label">Current File</span>
                            </div>
                          </div>

                          <div className="overflow-hidden rounded-xl border border-outline-variant/60">
                            <table className="ds-table">
                              <thead>
                                <tr>
                                  <th>Version</th>
                                  <th>File</th>
                                  <th>Status</th>
                                  <th>Uploaded By</th>
                                  <th>Uploaded At</th>
                                </tr>
                              </thead>
                              <tbody>
                                {checklistWorkflow?.fileVersions?.map((version: any) => {
                                  const versionStatus = getChecklistVersionStatus(version.id);
                                  return (
                                    <tr key={version.id}>
                                      <td className="ds-numeric font-medium">V{version.versionNumber}</td>
                                      <td className="text-xs">
                                        <button
                                          type="button"
                                          className="ds-plain cha-link text-xs font-medium"
                                          onClick={() => setViewingVersion({
                                            ...version,
                                            type: "checklist",
                                            fileName: version.originalFileName,
                                            sizeBytes: version.fileSize,
                                            uploadedBy: { name: getUserName(version.uploadedById) },
                                          })}
                                        >
                                          {version.originalFileName}
                                        </button>
                                      </td>
                                      <td className="text-xs text-on-surface">
                                        {versionStatus ? (
                                          <Badge variant={versionStatus.variant} className="uppercase">
                                            {versionStatus.label}
                                          </Badge>
                                        ) : (
                                          <span className="text-on-surface-variant">Pending</span>
                                        )}
                                      </td>
                                      <td className="text-xs text-on-surface">{getUserName(version.uploadedById)}</td>
                                      <td className="text-xs text-on-surface ds-numeric">
                                        {new Date(version.uploadedAt).toLocaleString("en-IN")}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="border-t border-outline-variant/25 pt-5">
                  <div className="space-y-4">
                    <div className="card-cyan-outline rounded-xl border border-outline-variant/60 bg-surface p-4 space-y-4 shadow-sm">
                      <div className="space-y-3">
                        <SectionHeading
                          title="Internal Approval"
                          aside={
                            <Badge
                              variant={
                                approvedInternalDecision
                                  ? "success"
                                  : checklistWorkflow?.currentApprovalStage === "INTERNAL"
                                    ? "warning"
                                    : "secondary"
                              }
                              className="uppercase"
                            >
                              {approvedInternalDecision
                                ? "Approved"
                                : checklistWorkflow?.currentApprovalStage === "INTERNAL"
                                  ? "Pending"
                                  : "Locked"}
                            </Badge>
                          }
                        />
                        <p className="text-sm font-semibold text-on-surface">
                          {!checklistWorkflow
                            ? "Starts after checklist upload."
                            : approvedInternalDecision
                              ? `Approved by ${getUserName(approvedInternalDecision.actedById || approvedInternalDecision.assignedToId)}`
                              : checklistWorkflow.currentApprovalStage === "INTERNAL"
                                ? "Awaiting one internal approval."
                                : "Waiting for the current file version."}
                        </p>

                        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3 space-y-2">
                          {approvedInternalDecision ? (
                            <p className="text-xs text-on-surface-variant">
                              {getInternalApproverRole(approvedInternalDecision)} approval recorded on{" "}
                              <span className="text-on-surface ds-numeric">
                                {approvedInternalDecision.actedAt
                                  ? new Date(approvedInternalDecision.actedAt).toLocaleString("en-IN")
                                  : "Pending"}
                              </span>
                            </p>
                          ) : (
                            <>
                              <p className="text-xs text-on-surface-variant">
                                Eligible: <span className="text-on-surface">{eligibleInternalApproverLabels.join(", ") || "Owner, Manager, or TL"}</span>
                              </p>
                              {checklistWorkflow?.currentApprovalStage === "INTERNAL" && !approvedInternalDecision ? (
                                <p className="text-xs text-on-surface-variant">
                                  Pending:{" "}
                                  <span className="text-on-surface">
                                    {Array.from(
                                      new Set(
                                        currentInternalApprovals
                                          .filter((approval: any) => approval.action === "PENDING")
                                          .map((approval: any) => `${getUserName(approval.assignedToId)} (${getInternalApproverRole(approval)})`),
                                      ),
                                    ).join(", ") || "Owner, Manager, or TL"}
                                  </span>
                                </p>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                      {canCurrentUserInternalApprove && checklistWorkflow?.currentApprovalStage === "INTERNAL" ? (
                        <>
                          <textarea
                            rows={2}
                            value={internalApprovalRemarks}
                            onChange={(e) => setInternalApprovalRemarks(e.target.value)}
                            placeholder="Required for rejection, optional for approval"
                            className="ds-textarea w-full"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="destructive"
                              disabled={loading !== null}
                              onClick={() => handleChecklistInternalDecision("REJECTED")}
                            >
                              Reject
                            </Button>
                            <Button
                              type="button"
                              disabled={loading !== null}
                              onClick={() => handleChecklistInternalDecision("APPROVED")}
                            >
                              Approve
                            </Button>
                          </div>
                        </>
                      ) : null}
                    </div>

                    <div className="card-cyan-outline rounded-xl border border-outline-variant/60 bg-surface p-4 space-y-4 shadow-sm">
                      <div className="space-y-3">
                        <SectionHeading
                          title="Customer Approval"
                          aside={
                            finalCustomerDecision ? (
                              <Badge
                                variant={finalCustomerDecision.action === "REJECTED" ? "destructive" : "success"}
                                className="uppercase"
                              >
                                {finalCustomerDecision.action === "REJECTED" ? "Rejected" : "Approved"}
                              </Badge>
                            ) : checklistWorkflow?.currentApprovalStage === "CUSTOMER" ? (
                              <Badge variant="warning" className="uppercase">Pending</Badge>
                            ) : (
                              <Badge variant="secondary" className="uppercase">Locked</Badge>
                            )
                          }
                        />
                        <p className="text-sm text-on-surface">
                          {rejectedCustomerDecision
                            ? `Rejected by ${getDecisionActorLabel(rejectedCustomerDecision)} on ${rejectedCustomerDecision.actedAt ? new Date(rejectedCustomerDecision.actedAt).toLocaleString("en-IN") : "recorded time unavailable"}. Reworked upload is required.`
                            : approvedCustomerDecision
                              ? `Approved by ${getDecisionActorLabel(approvedCustomerDecision)} on ${approvedCustomerDecision.actedAt ? new Date(approvedCustomerDecision.actedAt).toLocaleString("en-IN") : "recorded time unavailable"}. Filing is ready.`
                            : checklistWorkflow?.currentApprovalStage === "CUSTOMER" && !latestCustomerMailLog
                              ? "Internal approval is complete. Send the customer mail here to unlock customer approval."
                              : checklistWorkflow?.currentApprovalStage === "CUSTOMER" && latestCustomerMailLog && !customerApprovalDelayElapsed
                                ? `Checklist mail sent on ${new Date(latestCustomerMailLog.sentAt).toLocaleString("en-IN")}. Customer approval unlocks automatically in ${customerApprovalCountdown} at ${customerApprovalVisibleAt?.toLocaleString("en-IN")}.`
                                : checklistWorkflow?.currentApprovalStage === "CUSTOMER"
                                  ? "Pending: concerned job user approval required."
                                  : checklistWorkflow?.customerRejectedOnce
                                    ? "Customer approval will not be requested again after rework."
                                    : "Customer approval starts after the first successful internal approval and mail dispatch."}
                        </p>
                        {latestCustomerMailLog ? (
                          <p className="text-xs text-on-surface-variant">
                            Mail recipients: {(latestCustomerMailLog.recipients || []).join(", ")}. Attachment: {latestCustomerMailLog.attachmentFileName || currentChecklistVersion?.originalFileName || "Checklist file"}.
                          </p>
                        ) : null}
                        {finalCustomerDecision?.remarks ? (
                          <div className={cn(
                            "rounded-xl border px-4 py-3 text-xs",
                            finalCustomerDecision.action === "REJECTED"
                              ? "border-red-500/25 bg-red-500/10 text-on-surface"
                              : "border-green-500/25 bg-green-500/10 text-on-surface",
                          )}>
                            Customer remarks: {finalCustomerDecision.remarks}
                          </div>
                        ) : null}
                        {checklistWorkflow?.currentApprovalStage === "CUSTOMER" && !approvedCustomerDecision ? (
                          <p className="text-xs text-on-surface-variant">
                            Eligible approvers: any concerned user linked to this job, including the job owner.
                            {pendingCustomerApproverNames.length > 0 ? ` Current linked users: ${pendingCustomerApproverNames.join(", ")}` : ""}
                          </p>
                        ) : null}
                      </div>
                      {checklistWorkflow?.currentApprovalStage === "CUSTOMER" && !latestCustomerMailLog ? (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="ds-label block">Email Subject</label>
                            <input
                              value={customerMailSubject}
                              onChange={(e) => setCustomerMailSubject(e.target.value)}
                              placeholder={`Checklist Approval Required - ${job.jobNumber}`}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="ds-label block">Email Content</label>
                            <textarea
                              rows={5}
                              value={customerMailBody}
                              onChange={(e) => setCustomerMailBody(e.target.value)}
                              placeholder={`Please review the attached approved checklist for job ${job.jobNumber}.`}
                              className="ds-textarea w-full"
                            />
                            <p className="text-xs text-on-surface-variant">
                              This content is placed inside the branded customer email template.
                            </p>
                          </div>
                          <FileUploadField
                            id="customer-mail-attachments-customer"
                            label="Additional Attachments"
                            multiple
                            compact
                            helperText="The approved checklist is attached automatically. Add any extra files before sending."
                            triggerText="Drag and drop or choose files to attach"
                            onInputChange={(event) => setCustomerMailAttachments(Array.from(event.target.files || []))}
                            onClear={() => setCustomerMailAttachments([])}
                            selectedFiles={customerMailAttachments.map((file) => ({
                              file,
                              name: file.name,
                              sizeBytes: file.size,
                              statusLabel: "Ready to send",
                            }))}
                          />
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <p className="max-w-xl text-xs text-on-surface-variant">
                              The latest approved checklist file will be attached automatically, customer recipients will be fetched from the customer record, and any files above will be included after you send the mail.
                            </p>
                            <Button
                              type="button"
                              disabled={loading !== null}
                              className="w-full whitespace-nowrap gap-2 sm:w-auto"
                              onClick={handleSendChecklistCustomerMail}
                            >
                              <Mail size={14} />
                              {loading === "checklist-customer-mail" ? "Sending..." : "Send Mail"}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                      {canCurrentUserCustomerApprove && checklistWorkflow?.currentApprovalStage === "CUSTOMER" && customerApprovalDelayElapsed ? (
                        <>
                          <textarea
                            rows={2}
                            value={customerApprovalRemarks}
                            onChange={(e) => setCustomerApprovalRemarks(e.target.value)}
                            placeholder="Required for rejection, optional for approval"
                            className="ds-textarea w-full"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="destructive"
                              disabled={loading !== null}
                              onClick={() => handleChecklistCustomerDecision("REJECTED")}
                            >
                              Reject
                            </Button>
                            <Button
                              type="button"
                              disabled={loading !== null}
                              onClick={() => handleChecklistCustomerDecision("APPROVED")}
                            >
                              Approve on behalf of customer
                            </Button>
                          </div>
                        </>
                      ) : null}
                    </div>

                    <div className="card-cyan-outline rounded-xl border border-outline-variant/60 bg-surface p-4 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="ds-label">Approval History</span>
                        <span className="text-[11px] text-on-surface-variant">
                          {displayChecklistApprovals.length} entries
                        </span>
                      </div>
                      {displayChecklistApprovals.length === 0 ? (
                        <p className="text-xs text-on-surface-variant">No approval history recorded yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {displayChecklistApprovals
                            .slice()
                            .reverse()
                            .map((approval: any, index: number, approvals: any[]) => (
                              <div key={approval.id} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3">
                                <div className="flex flex-col items-center">
                                  <span className="mt-1 h-3.5 w-3.5 rounded-full border-2 border-surface bg-[#00cec4]" />
                                  {index < approvals.length - 1 ? (
                                    <span className="mt-1 w-px flex-1 bg-outline-variant/60" />
                                  ) : null}
                                </div>
                                <div className="space-y-2 pb-1">
                                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                    <div className="space-y-1">
                                      <p className="text-sm font-semibold text-on-surface">
                                        {approval.stage.replace(/_/g, " ")} - {approval.action.replace(/_/g, " ")}
                                      </p>
                                      <p className="text-xs text-on-surface-variant">
                                        {approval.source === "CUSTOMER_PORTAL" ? (
                                          <>
                                            Submitted by <span className="text-on-surface">{getDecisionActorLabel(approval)}</span>
                                          </>
                                        ) : (
                                          <>
                                            Assigned to <span className="text-on-surface">{getUserName(approval.assignedToId)}</span>
                                            {approval.actedById ? ` - acted by ${getUserName(approval.actedById)}` : ""}
                                          </>
                                        )}
                                      </p>
                                    </div>
                                    <span className={cn(
                                      "text-[11px] ds-numeric md:text-right",
                                      approval.action === "REJECTED"
                                        ? "text-red-500"
                                        : approval.action === "APPROVED"
                                          ? "text-[#00cec4]"
                                          : "text-on-surface-variant",
                                    )}>
                                      {approval.actedAt ? new Date(approval.actedAt).toLocaleString("en-IN") : "Pending"}
                                    </span>
                                  </div>
                                  {approval.remarks ? (
                                    <p className="text-xs text-on-surface-variant">
                                      {approval.remarks}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                </MilestoneCard>
              ) : null}

              {/* 5. FILING */}
              {showFilingStage ? (
                <MilestoneCard
                  stageKey="FILING"
                  isExpanded={expandedStageKey === "FILING"}
                  isSpotlit={stageFocusKey === "FILING"}
                  onToggle={handleMilestoneToggle}
                  title="Filing Stage"
                  description="Execute filing operations using the workflow canvas."
                  isCompleted={activeStepIndex > 4}
                  isActive={activeStepIndex === 4}
                  isLocked={activeStepIndex < 4}
                  percentage={filingPercentage}
                  validationState={filingValidationState}
                  statusLabel={activeStepIndex > 4 ? "Filed" : activeStepIndex === 4 ? (isActiveStageBlocked ? "Blocked" : "In Progress") : "Locked"}
                  assignedUser={job.assignedManager?.name || job.primaryOwner?.name || "Filing Team"}
                  dueDate={job.estimatedClosureDate ? new Date(job.estimatedClosureDate).toLocaleDateString("en-IN") : null}
                  completedAt={activeStepIndex > 4 ? (job.filing?.updatedAt ? new Date(job.filing.updatedAt).toLocaleString("en-IN") : null) : null}
                  summary={
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      {job.filing?.billOfEntryNumber && (
                        <div>
                          <span className="text-on-surface-variant block text-[10px] uppercase">BOE Number</span>
                          <span className="font-semibold text-on-surface ds-numeric">{job.filing.billOfEntryNumber}</span>
                        </div>
                      )}
                      {job.filing?.shippingBillNumber && (
                        <div>
                          <span className="text-on-surface-variant block text-[10px] uppercase">Shipping Bill Number</span>
                          <span className="font-semibold text-on-surface ds-numeric">{job.filing.shippingBillNumber}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-on-surface-variant block text-[10px] uppercase">Filing Date</span>
                        <span className="font-semibold text-on-surface ds-numeric">{job.filing?.actualFilingDate ? new Date(job.filing.actualFilingDate).toLocaleDateString("en-IN") : "-"}</span>
                      </div>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    {overdueChecklistCount > 0 && (
                      <div className="card-left-accent-orange rounded-xl border border-outline-variant/60 bg-surface p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#fb923c]" />
                          <div className="space-y-1">
                            <h4 className="ds-label text-[#fb923c]">Overdue Filing Checklist Items</h4>
                            <p className="text-sm text-on-surface">
                              {overdueChecklistCount} Filing checklist item{overdueChecklistCount > 1 ? "s are" : " is"} overdue.
                            </p>
                            <p className="text-xs text-on-surface-variant">
                              Delay remarks are required before overdue items can be completed.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeStepIndex < filingStageIndex ? (
                      <div className="rounded-xl border border-outline-variant/60 bg-surface p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <span
                            className="ds-icon-badge mt-0.5 shrink-0"
                            style={{ background: "rgba(251,146,60,0.10)", color: "#fb923c" }}
                          >
                            <AlertTriangle size={18} />
                          </span>
                          <div className="space-y-1">
                            <h4 className="ds-label text-[#fb923c]">Filing Stage Locked</h4>
                            <p className="text-sm text-on-surface-variant leading-relaxed">
                              Clearance files can only be submitted to customs after the checklist is approved. Complete all prior checklist preparation and approvals.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {!filingInstance ? (
                          <div className="card-top-accent rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
                            <SectionHeading title="Filing Workflow" />
                            {loading === "filing-load" ? (
                              <p className="mt-4 text-xs text-on-surface-variant">Loading filing workflow...</p>
                            ) : (
                              <div className="mt-4 space-y-4">
                                <p className="max-w-3xl text-sm text-on-surface-variant leading-relaxed">
                                  No active filing workflow instance found. Ensure a workflow is published in{" "}
                                  <a href="/cha/settings/filing-workflows" className="text-[#00cec4] underline underline-offset-2">
                                    CHA Settings -&gt; Filing Workflows
                                  </a>
                                  , then start the workflow below.
                                </p>
                                <Button
                                  onClick={handleStartFilingWorkflow}
                                  disabled={loading === "filing-start"}
                                >
                                  {loading === "filing-start" ? "Starting..." : "Start Filing Workflow"}
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {activeNodeRun ? (
                              <div className="space-y-4">
                                <div aria-live="polite" className="sr-only">
                                  {filingCompletionAnnouncement}
                                </div>

                                {/* Node run completion form */}
                                <form
                                  ref={filingFormRef}
                                  onSubmit={handleCompleteFilingNode}
                                  className="grid gap-5 pt-2 xl:grid-cols-[minmax(0,680px)_minmax(0,1fr)] xl:items-start"
                                >
                                  <div ref={filingActiveNodeCardRef} className={`card-top-accent ${filingPrimaryColumnClass} space-y-3 rounded-xl border border-outline-variant/60 bg-surface p-4 shadow-sm`}>
                                    <SectionHeading
                                      title="Stage Checklist Verification"
                                      description="Review this active filing checkpoint, complete the checklist, and capture the required stage data."
                                      aside={
                                        <InfoNoteToggle
                                          title="Stage Summary"
                                          description={stageSummaryText}
                                          open={openWarningNote === "bill-filing"}
                                          onToggle={() =>
                                            setOpenWarningNote((current) => (current === "bill-filing" ? null : "bill-filing"))
                                          }
                                        />
                                      }
                                    />
                                    <div className="flex flex-wrap gap-2 pl-[17px]">
                                      {activeNodeRun.node.nodeType === "DECISION" ? <Badge variant="default">Decision</Badge> : null}
                                      {activeNodeRun.node.canBeSkipped ? <Badge variant="warning">Optional / Skippable</Badge> : null}
                                    </div>
                                    {overdueChecklistCount > 0 && (
                                      <p className="pl-[17px] text-xs text-[#fb923c]">
                                        {overdueChecklistCount} overdue checklist item{overdueChecklistCount > 1 ? "s" : ""} in this active stage.
                                      </p>
                                    )}
                                    {isActiveStageBlocked ? (
                                      <div className="card-top-accent-orange rounded-xl border border-[#fb923c]/35 bg-surface px-4 py-4 space-y-3">
                                        <div className="space-y-1">
                                          <p className="ds-label !text-[#fb923c]">Stage Blocked</p>
                                          <p className="text-sm text-on-surface">
                                            This stage is blocked until {activeNodePrerequisiteStatus?.mode === "ANY" ? "one of these stages is completed" : "all required stages are completed"}: {(activeNodePrerequisiteStatus?.missingNodeNames || []).join(", ")}.
                                          </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {(activeNodePrerequisiteStatus?.missingNodeKeys || []).map((nodeKey: string) => (
                                            <Button
                                              key={nodeKey}
                                              type="button"
                                              variant="outline"
                                              disabled={loading !== null}
                                              onClick={() => void handleRedirectBlockedStage(nodeKey)}
                                            >
                                              <ArrowRight size={14} />
                                              Go To {targetNodesMap.get(nodeKey)?.name || nodeKey}
                                            </Button>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                    {pendingBlockedStage && canResumePendingBlockedStage ? (
                                      <div className="rounded-xl border border-[#00cec4]/35 bg-surface-container-low px-4 py-3">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                          <div className="space-y-1">
                                            <p className="ds-label text-[#00cec4]">Blocked Stage Ready</p>
                                            <p className="text-sm text-on-surface">{pendingBlockedStage.nodeName} can now be resumed.</p>
                                          </div>
                                          <Button type="button" disabled={loading !== null} onClick={() => void handleResumeBlockedStage()}>
                                            Resume {pendingBlockedStage.nodeName}
                                          </Button>
                                        </div>
                                      </div>
                                    ) : null}
                                    <div className={`space-y-3 ${isActiveStageBlocked ? "pointer-events-none opacity-60" : ""}`}>
                                      {activeNodeRun.node.nodeType === "DECISION" && outgoingEdges.length > 0 ? (
                                        <div className="space-y-2">
                                          <label className="ds-label text-on-surface block">Decision *</label>
                                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            {outgoingEdges.map((edge: any) => {
                                              const targetNode = targetNodesMap.get(edge.targetKey);
                                              const isSelected = selectedNextNodeKey === edge.targetKey;
                                              return (
                                                <button
                                                  key={edge.targetKey}
                                                  type="button"
                                                  onClick={() => setSelectedNextNodeKey(edge.targetKey)}
                                                  className={`rounded-xl border px-4 py-3 text-left transition ${isSelected
                                                      ? "border-[#00cec4] bg-[#00cec4]/10 shadow-[0_0_0_3px_rgba(0,206,196,0.18)]"
                                                      : "border-outline-variant bg-surface hover:border-[#00cec4]/55 hover:bg-surface-container-low"
                                                    }`}
                                                >
                                                  <span className="ds-label block">{edge.label || "Choice"}</span>
                                                  <span className="mt-1 block text-sm font-medium text-on-surface">
                                                    {targetNode?.name || edge.targetKey}
                                                  </span>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ) : null}
                                      {isFinalFilingNode ? (
                                        <div className="space-y-3 bg-surface p-4 transition-all">
                                          <div className="flex items-start gap-3">
                                            <span className="ds-icon-badge shrink-0">
                                              <ShieldCheck size={18} />
                                            </span>
                                            <div className="min-w-0 space-y-1">
                                              <h4 className="ds-h3 text-on-surface">Final Filing Closure</h4>
                                              <p className="text-sm leading-5 text-on-surface-variant">
                                                Review every completed filing stage before submitting this final step. Submitting this stage will close the filing workflow, record the audit event, and move the job to FILED.
                                              </p>
                                            </div>
                                          </div>

                                          <div className="space-y-3 rounded-xl border border-outline-variant/45 bg-surface-container-low/35 p-3">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                              <div className="space-y-1">
                                                <p className="ds-label text-on-surface-variant">Completed Stage Overview</p>
                                                <p className="text-sm text-on-surface">
                                                  {finalFilingReviewStages.length} stage{finalFilingReviewStages.length === 1 ? "" : "s"} ready for final review.
                                                </p>
                                              </div>
                                              <div className="flex flex-wrap gap-2">
                                                <Badge variant="secondary">
                                                  {finalFilingReviewStages.reduce((total: number, stage: any) => total + stage.attachments.length, 0)} Files
                                                </Badge>
                                                <Badge variant="secondary">
                                                  {finalFilingReviewStages.reduce((total: number, stage: any) => total + stage.checklistCompletedCount, 0)} Checks
                                                </Badge>
                                                <Badge variant={finalFilingReviewStages.some((stage: any) => stage.openQueryCount > 0) ? "warning" : "success"}>
                                                  {finalFilingReviewStages.reduce((total: number, stage: any) => total + stage.openQueryCount, 0)} Open Queries
                                                </Badge>
                                              </div>
                                            </div>

                                            {finalFilingReviewStages.length > 0 ? (
                                              <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                                                {finalFilingReviewStages.map((stage: any) => (
                                                  <details
                                                    key={stage.id}
                                                    className="group overflow-hidden rounded-xl border border-outline-variant/50 bg-surface"
                                                    open={stage.sequence <= 3}
                                                  >
                                                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-3 hover:bg-surface-container-low/45">
                                                      <div className="flex min-w-0 items-start gap-3">
                                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#00cec4]/30 bg-[#00cec4]/10 text-[#00a9b2]">
                                                          <span className="ds-numeric text-xs">{String(stage.sequence).padStart(2, "0")}</span>
                                                        </span>
                                                        <div className="min-w-0 space-y-1">
                                                          <div className="flex flex-wrap items-center gap-2">
                                                            <h5 className="truncate text-sm font-medium text-on-surface">{stage.nodeName}</h5>
                                                            <Badge variant={stage.status === "SKIPPED" ? "secondary" : "success"}>{stage.status}</Badge>
                                                          </div>
                                                          {stage.sectionLabel ? (
                                                            <p className="ds-label text-on-surface-variant">{stage.sectionLabel}</p>
                                                          ) : null}
                                                          <p className="text-xs text-on-surface-variant">
                                                            {stage.completedAt ? `Completed ${new Date(stage.completedAt).toLocaleString("en-IN")}` : "Completion time not recorded"}
                                                            {stage.completedByName ? ` by ${stage.completedByName}` : ""}
                                                          </p>
                                                        </div>
                                                      </div>
                                                      <div className="flex shrink-0 items-center gap-2">
                                                        <span className="ds-numeric text-xs text-on-surface-variant">
                                                          {stage.checklistCompletedCount}/{stage.checklistTotalCount || 0}
                                                        </span>
                                                        <ChevronRight className="mt-1 size-4 text-on-surface-variant transition-transform group-open:hidden" />
                                                        <ChevronDown className="mt-1 hidden size-4 text-on-surface-variant group-open:block" />
                                                      </div>
                                                    </summary>

                                                    <div className="space-y-3 border-t border-outline-variant/35 px-3 py-3">
                                                      <div className="grid gap-2 sm:grid-cols-3">
                                                        <div className="rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-2">
                                                          <p className="ds-label text-on-surface-variant">Checks</p>
                                                          <p className="ds-numeric mt-1 text-sm text-on-surface">{stage.checklistCompletedCount}/{stage.checklistTotalCount || 0}</p>
                                                        </div>
                                                        <div className="rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-2">
                                                          <p className="ds-label text-on-surface-variant">Files</p>
                                                          <p className="ds-numeric mt-1 text-sm text-on-surface">{stage.attachments.length}</p>
                                                        </div>
                                                        <div className="rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-2">
                                                          <p className="ds-label text-on-surface-variant">Queries</p>
                                                          <p className="ds-numeric mt-1 text-sm text-on-surface">{stage.queries.length} total / {stage.openQueryCount} open</p>
                                                        </div>
                                                      </div>

                                                      {stage.remarks || stage.delayRemarks ? (
                                                        <div className="space-y-2">
                                                          {stage.remarks ? (
                                                            <div className="rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-2">
                                                              <p className="ds-label text-on-surface-variant">Remarks</p>
                                                              <p className="mt-1 text-sm leading-5 text-on-surface">{stage.remarks}</p>
                                                            </div>
                                                          ) : null}
                                                          {stage.delayRemarks ? (
                                                            <div className="card-left-accent-orange rounded-xl border border-[#fb923c]/30 bg-surface px-3 py-2">
                                                              <p className="ds-label !text-[#fb923c]">Delay Remarks</p>
                                                              <p className="mt-1 text-sm leading-5 text-on-surface">{stage.delayRemarks}</p>
                                                            </div>
                                                          ) : null}
                                                        </div>
                                                      ) : (
                                                        <div className="rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
                                                          No remarks recorded for this stage.
                                                        </div>
                                                      )}

                                                      {stage.completedResponses.length > 0 ? (
                                                        <div className="space-y-2">
                                                          <p className="ds-label text-on-surface-variant">Completed Checklist</p>
                                                          <div className="grid gap-2 md:grid-cols-2">
                                                            {stage.completedResponses.slice(0, 6).map((response: any) => (
                                                              <div key={response.id || response.checklistItemId} className="rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-2">
                                                                <div className="flex items-start gap-2">
                                                                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#00a9b2]" />
                                                                  <div className="min-w-0">
                                                                    <p className="text-sm text-on-surface">{response.checklistItem?.label || "Checklist item"}</p>
                                                                    {response.remarks ? (
                                                                      <p className="mt-1 text-xs leading-4 text-on-surface-variant">{response.remarks}</p>
                                                                    ) : null}
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            ))}
                                                          </div>
                                                          {stage.completedResponses.length > 6 ? (
                                                            <p className="text-xs text-on-surface-variant">
                                                              +{stage.completedResponses.length - 6} more checklist item{stage.completedResponses.length - 6 === 1 ? "" : "s"} completed.
                                                            </p>
                                                          ) : null}
                                                        </div>
                                                      ) : null}

                                                      {stage.fieldValues.length > 0 ? (
                                                        <div className="space-y-2">
                                                          <p className="ds-label text-on-surface-variant">Captured Data</p>
                                                          <div className="grid gap-2 md:grid-cols-2">
                                                            {stage.fieldValues.slice(0, 6).map((field: any) => (
                                                              <div key={field.id || field.fieldKey} className="rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-2">
                                                                <p className="ds-label text-on-surface-variant">{String(field.fieldKey || "Field").replace(/_/g, " ")}</p>
                                                                <p className="mt-1 truncate text-sm text-on-surface">
                                                                  {field.valueJson === null || field.valueJson === undefined || field.valueJson === ""
                                                                    ? "Not recorded"
                                                                    : typeof field.valueJson === "object"
                                                                      ? JSON.stringify(field.valueJson)
                                                                      : String(field.valueJson)}
                                                                </p>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        </div>
                                                      ) : null}

                                                      {stage.attachments.length > 0 ? (
                                                        <div className="space-y-2">
                                                          <p className="ds-label text-on-surface-variant">Uploaded Files</p>
                                                          <div className="grid gap-2 md:grid-cols-2">
                                                            {stage.attachments.map((attachment: any) => (
                                                              <a
                                                                key={attachment.id}
                                                                href={attachment.fileKey}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="flex min-w-0 items-start gap-2 rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-sm text-on-surface transition hover:border-[#00cec4]/55 hover:text-[#00a9b2]"
                                                              >
                                                                <ExternalLink size={14} className="mt-0.5 shrink-0 text-[#00a9b2]" />
                                                                <span className="min-w-0 flex-1">
                                                                  <span className="block truncate">{attachment.fileName || "Uploaded file"}</span>
                                                                  <span className="mt-0.5 block truncate text-xs text-on-surface-variant">
                                                                    {[attachment.checklistItem?.label, attachment.photoRequirement?.label, attachment.uploadedBy?.name ? `by ${attachment.uploadedBy.name}` : null]
                                                                      .filter(Boolean)
                                                                      .join(" / ") || "Workflow upload"}
                                                                  </span>
                                                                </span>
                                                              </a>
                                                            ))}
                                                          </div>
                                                        </div>
                                                      ) : null}
                                                    </div>
                                                  </details>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="rounded-xl border border-dashed border-outline-variant/60 px-4 py-5 text-sm text-on-surface-variant">
                                                No completed filing stages are available yet.
                                              </div>
                                            )}
                                          </div>

                                        </div>
                                      ) : null}
                                      {(activeNodeFieldDefinitions.length > 0 || activeNodeDocumentRequirements.length > 0) ? (
                                        <div className="space-y-3 pt-1">
                                          {activeNodeFieldDefinitions.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                                              {activeNodeFieldDefinitions.map((field: any) => {
                                                const isMissingField =
                                                  filingValidationWarning?.fieldKeys.includes(field.key) &&
                                                  !String(filingFieldValues[field.key] ?? "").trim();
                                                return (
                                                  <div
                                                    key={field.key}
                                                    className={cn(
                                                      "space-y-1 rounded-xl transition-all",
                                                      isMissingField && "animate-pulse-red border border-red-500/30 bg-surface p-2",
                                                    )}
                                                  >
                                                    <label className="ds-label block text-on-surface-variant">
                                                      {field.label} {field.required !== false ? "*" : ""}
                                                    </label>
                                                    {field.type === "DATE" ? (
                                                      <DateInput
                                                        value={filingFieldValues[field.key] || ""}
                                                        onChange={(e) => setFilingFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                                        className={cn("w-full", isMissingField && "!border-red-500/60")}
                                                      />
                                                    ) : (
                                                      <input
                                                        value={filingFieldValues[field.key] || ""}
                                                        onChange={(e) =>
                                                          field.key === "bill_number"
                                                            ? setBillNumberEverywhere(e.target.value)
                                                            : setFilingFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                                                        }
                                                        placeholder={field.placeholder || field.label}
                                                        className={cn("w-full text-sm", isMissingField && "!border-red-500/60")}
                                                      />
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : null}
                                          {activeChecklistItems.length === 0 && activeNodeDocumentRequirements.length > 0 && (() => {
                                            const requiredDocumentTotal = activeNodeDocumentRequirements.filter((requirement: any) => requirement.required !== false).length;
                                            const requiredDocumentUploadedCount = activeNodeDocumentRequirements.filter(
                                              (requirement: any) => requirement.required !== false && !!activeNodeDocumentAttachmentsByKey.get(requirement.key),
                                            ).length;
                                            const isCompleted = requiredDocumentUploadedCount >= requiredDocumentTotal;
                                            const hasMissingStandaloneDocuments = activeNodeDocumentRequirements.some(
                                              (requirement: any) =>
                                                requirement.required !== false &&
                                                !activeNodeDocumentAttachmentsByKey.get(requirement.key),
                                            );

                                            return (
                                              <div className="space-y-3 pt-3 border-t border-outline-variant/30 mt-3">
                                                <h4 className="ds-label text-on-surface">Stage Checklist Verification</h4>
                                                <div
                                                  className={`relative overflow-hidden rounded-xl border px-4 py-4 transition-all duration-200 ${
                                                    isCompleted
                                                      ? "border-[#22c55e]/28 bg-surface shadow-[0_16px_34px_-28px_rgba(34,197,94,0.28)]"
                                                      : hasMissingStandaloneDocuments
                                                        ? "animate-pulse-red border-red-500/35 bg-surface shadow-[0_16px_34px_-28px_rgba(239,68,68,0.38)]"
                                                        : "border-[#00cec4]/28 bg-surface shadow-[0_16px_34px_-28px_rgba(0,206,196,0.28)]"
                                                  }`}
                                                >
                                                  <div className={`pointer-events-none absolute inset-y-4 left-0 w-1 rounded-r-sm ${isCompleted ? "bg-[#22c55e]" : hasMissingStandaloneDocuments ? "bg-red-500" : "bg-[#00cec4]"}`} />

                                                  <div className="flex w-full items-center gap-3 bg-transparent text-left">
                                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                                      <span
                                                        className={`flex size-9 shrink-0 items-center justify-center rounded-xl border text-xs font-medium transition-all ${
                                                          isCompleted
                                                            ? "border-[#22c55e]/30 bg-[#22c55e]/12 text-[#15803d]"
                                                            : "border-[#00cec4]/30 bg-[#00cec4]/12 text-[#00a9b2]"
                                                        }`}
                                                      >
                                                        {isCompleted ? <Check size={16} /> : <Upload size={16} />}
                                                      </span>
                                                      <div className="flex min-h-9 min-w-0 flex-1 items-center">
                                                      <div className="text-base font-normal uppercase leading-none tracking-[0.04em] text-on-surface">
                                                          Filing Document Verification <span className="text-red-500">*</span>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  <div className="ml-12 mt-3 space-y-3">
                                                    <div>
                                                      <label className="ds-label block">Required Document</label>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {activeNodeDocumentRequirements.map((requirement: any) => {
                                                          const uploadedAttachment = activeNodeDocumentAttachmentsByKey.get(requirement.key);
                                                        const isMissingDocument =
                                                          requirement.required !== false &&
                                                          !uploadedAttachment;
                                                        return (
                                                          <div
                                                            key={requirement.key}
                                                            className={cn(
                                                              "space-y-2 rounded-xl transition-all",
                                                              isMissingDocument && "animate-pulse-red border border-red-500/30 bg-surface p-2",
                                                            )}
                                                          >
                                                            <FileUploadField
                                                              id={`node-document-upload-standalone-${activeNodeRun.id}-${requirement.key}`}
                                                              compact
                                                              disabled={loading === `node-document-${requirement.key}`}
                                                              uploading={loading === `node-document-${requirement.key}`}
                                                              uploadingLabel={`Uploading ${requirement.label}...`}
                                                              helperText={`Accepted formats: PDF and images. Uploading here ${requirement.allowReplacement !== false ? "replaces the current" : "adds the"} ${requirement.label}.`}
                                                              triggerText={`Drag and drop or choose file to ${uploadedAttachment && requirement.allowReplacement !== false ? "replace" : "upload"} the ${requirement.label}`}
                                                              showSelectedPreview={false}
                                                              onInputChange={(e) => handleUploadNodeDocument(requirement.key, e)}
                                                            />
                                                            {uploadedAttachment ? (
                                                              <FilingAttachmentValidityRow
                                                                attachment={uploadedAttachment}
                                                                draftValidityDate={
                                                                  attachmentValidityDrafts[uploadedAttachment.id]
                                                                  ?? toDateInputValue(uploadedAttachment.validityDate)
                                                                }
                                                                isEditingValidity={
                                                                  attachmentValidityEditors[uploadedAttachment.id]
                                                                  ?? Boolean(uploadedAttachment.validityDate)
                                                                }
                                                                isSaving={loading === `filing-attachment-validity-${uploadedAttachment.id}`}
                                                                onDraftChange={(value) =>
                                                                  setAttachmentValidityDrafts((prev) => ({
                                                                    ...prev,
                                                                    [uploadedAttachment.id]: value,
                                                                  }))
                                                                }
                                                                onRemove={() => void handleDeleteFilingPhoto(uploadedAttachment.id)}
                                                                onSaveValidity={(value) => void handleUpdateFilingAttachmentValidity(uploadedAttachment.id, value)}
                                                                onToggleValidity={(enabled) => {
                                                                  setAttachmentValidityEditors((prev) => ({
                                                                    ...prev,
                                                                    [uploadedAttachment.id]: enabled,
                                                                  }));
                                                                  if (!enabled && uploadedAttachment.validityDate) {
                                                                    void handleUpdateFilingAttachmentValidity(uploadedAttachment.id, null);
                                                                  }
                                                                }}
                                                              />
                                                            ) : null}
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      ) : null}
                                      {activeNodeRun.node.checklistItems?.length > 0 && (
                                        <div className="space-y-3 pt-1">
                                          <h4 className="ds-label text-on-surface">Stage Checklist Verification</h4>
                                          <div className="space-y-3.5">
                                            {activeChecklistItems.map((item: any, index: number) => {
                                              const resp = checklistResponses[item.id] || { isChecked: false, remarks: "", fileKey: undefined, delayRemarks: "" };
                                              const overdueMeta = overdueChecklistItems.find((entry: any) => entry.checklistItemId === item.id);
                                              const checklistItemAttachments = checklistAttachmentsByItem.get(item.id) || [];
                                              const mandatoryNodeDocumentsReady = activeNodeDocumentRequirements
                                                .filter((requirement: any) => requirement.required !== false)
                                                .every((requirement: any) => !!activeNodeDocumentAttachmentsByKey.get(requirement.key));
                                              const mandatoryPhotoRequirementsReady = (activeNodeRun.node.photoRequirements || [])
                                                .filter((requirement: any) => requirement.isMandatory)
                                                .every((requirement: any) => {
                                                  const uploadedCount = activeNodeAttachments.filter(
                                                    (attachment: any) => attachment.photoRequirementId === requirement.id,
                                                  ).length;
                                                  return uploadedCount >= (requirement.minPhotos || 1);
                                                });
                                              const checklistUploadsReady =
                                                !checklistItemAllowsDirectUpload(item) ||
                                                (item.minUploads || 0) === 0 ||
                                                checklistItemAttachments.length >= (item.minUploads || 0);
                                              const isCurrentItem = index === currentChecklistItemIndex;
                                              const isLockedItem = index > currentChecklistItemIndex;
                                              const checklistRemarksReady = !item.requiresRemarks || Boolean(resp.remarks?.trim());
                                              const checklistDelayRemarksReady =
                                                !overdueMeta ||
                                                item.delayRemarksRequired === false ||
                                                Boolean(resp.delayRemarks?.trim());
                                              const checklistItemComplete =
                                                resp.isChecked &&
                                                checklistRemarksReady &&
                                                checklistDelayRemarksReady &&
                                                checklistUploadsReady &&
                                                mandatoryNodeDocumentsReady &&
                                                mandatoryPhotoRequirementsReady;
                                              const hasValidationMissingChecklistItem =
                                                (filingValidationWarning?.checklistItemIds.includes(item.id) && !resp.isChecked) ||
                                                (isCurrentItem &&
                                                  activeNodeDocumentRequirements.some(
                                                    (requirement: any) =>
                                                      requirement.required !== false &&
                                                      !activeNodeDocumentAttachmentsByKey.get(requirement.key),
                                                  )) ||
                                                (isCurrentItem &&
                                                  (activeNodeRun.node.photoRequirements || []).some((requirement: any) => {
                                                    const uploadedCount = activeNodeAttachments.filter(
                                                      (attachment: any) => attachment.photoRequirementId === requirement.id,
                                                    ).length;
                                                    return (
                                                      requirement.isMandatory &&
                                                      uploadedCount < (requirement.minPhotos || 1)
                                                    );
                                                  }));
                                              const shouldBlinkChecklistItem =
                                                !isLockedItem && (!checklistItemComplete || Boolean(hasValidationMissingChecklistItem));
                                              const checklistItemDescription =
                                                typeof item.description === "string" && item.description.trim().length > 0
                                                  ? item.description.trim()
                                                  : "Complete the activity for this stage, confirm the required details are accurate, and mark it done once the supporting work is ready to move forward.";
                                              const canVerifyChecklistItem =
                                                !isLockedItem &&
                                                (resp.isChecked ||
                                                  (isCurrentItem && mandatoryNodeDocumentsReady && mandatoryPhotoRequirementsReady && checklistUploadsReady));
                                              return (
                                                <div
                                                  key={item.id}
                                                  className={`relative overflow-hidden rounded-xl border p-4 space-y-2.5 transition-all duration-200 ${isLockedItem
                                                      ? "border-outline-variant/60 bg-surface-container-low/75 opacity-70"
                                                      : checklistItemComplete
                                                        ? "border-green-500/30 bg-green-500/10 shadow-[0_20px_40px_-30px_rgba(34,197,94,0.32)]"
                                                        : shouldBlinkChecklistItem
                                                          ? "animate-pulse-red border-red-500/30 bg-surface shadow-[0_18px_38px_-30px_rgba(239,68,68,0.26)]"
                                                          : "border-outline-variant/60 bg-surface"
                                                      }`}
                                                >
                                                  {!isLockedItem ? (
                                                    <div
                                                      className={`pointer-events-none absolute inset-y-4 left-0 w-1 rounded-full ${checklistItemComplete
                                                          ? "bg-green-500"
                                                          : "bg-red-500"
                                                        }`}
                                                    />
                                                  ) : null}
                                                  <NeonCheckbox
                                                    disabled={!canVerifyChecklistItem}
                                                    checked={resp.isChecked}
                                                    onChange={(event) => {
                                                      if (!canVerifyChecklistItem) {
                                                        event.preventDefault();
                                                        return;
                                                      }
                                                      setChecklistResponses((prev) => ({
                                                        ...prev,
                                                        [item.id]: {
                                                          ...prev[item.id],
                                                          isChecked: event.target.checked,
                                                        },
                                                      }));
                                                    }}
                                                    className={`group relative flex w-full items-start bg-transparent text-left transition-all [&>div:first-child]:mt-1 [&_.neon-checkbox__box]:!bg-surface [&_.neon-checkbox__box]:!shadow-none [&_.neon-checkbox__glow]:!opacity-0 ${!canVerifyChecklistItem
                                                        ? "cursor-not-allowed"
                                                        : resp.isChecked
                                                          ? "hover:scale-[1.005]"
                                                          : "hover:scale-[1.005]"
                                                      }`}
                                                    label={
                                                      <span className="block min-w-0 flex-1 space-y-1">
                                                        <span className="block font-[family:var(--font-kiona-sans)] text-lg uppercase leading-6 tracking-[0.12em] text-on-surface">
                                                          {item.label} {item.isMandatory && <span className="text-red-500 font-bold">*</span>}
                                                        </span>
                                                        <span className="block max-w-3xl font-[family:var(--font-geist-sans)] text-sm font-normal leading-5 text-on-surface-variant">
                                                          {checklistItemDescription}
                                                        </span>
                                                      </span>
                                                    }
                                                  />

                                                  {isLockedItem && (
                                                    <div className="rounded-xl border border-outline-variant/60 bg-surface px-3 py-2 text-[11px] text-on-surface-variant">
                                                      Complete the current checklist item first to unlock this step.
                                                    </div>
                                                  )}

                                                  {!isLockedItem && isCurrentItem && activeNodeDocumentRequirements.length > 0 && (
                                                    <div className="ml-10 space-y-2">
                                                      <div>
                                                        <label className="ds-label block">Required Documents</label>
                                                      </div>
                                                      <div className="space-y-2.5">
                                                          {activeNodeDocumentRequirements.map((requirement: any) => {
                                                            const uploadedAttachment = activeNodeDocumentAttachmentsByKey.get(requirement.key);
                                                          const isMissingDocument =
                                                            requirement.required !== false &&
                                                            !uploadedAttachment;
                                                          return (
                                                            <div
                                                              key={requirement.key}
                                                              className={cn(
                                                                "space-y-2 rounded-xl transition-all",
                                                                isMissingDocument && "animate-pulse-red border border-red-500/30 bg-surface p-2",
                                                              )}
                                                            >
                                                              <FileUploadField
                                                                id={`node-document-upload-inline-${activeNodeRun.id}-${requirement.key}`}
                                                                compact
                                                                disabled={loading === `node-document-${requirement.key}`}
                                                                uploading={loading === `node-document-${requirement.key}`}
                                                                uploadingLabel={`Uploading ${requirement.label}...`}
                                                                helperText={`Accepted formats: PDF and images. Uploading here ${requirement.allowReplacement !== false ? "replaces the current" : "adds the"} ${requirement.label}.`}
                                                                triggerText={`Drag and drop or choose file to ${requirement.allowReplacement !== false ? "replace" : "upload"} the ${requirement.label}`}
                                                                showSelectedPreview={false}
                                                                onInputChange={(e) => handleUploadNodeDocument(requirement.key, e)}
                                                              />
                                                              {uploadedAttachment ? (
                                                                <FilingAttachmentValidityRow
                                                                  attachment={uploadedAttachment}
                                                                  draftValidityDate={
                                                                    attachmentValidityDrafts[uploadedAttachment.id]
                                                                    ?? toDateInputValue(uploadedAttachment.validityDate)
                                                                  }
                                                                  isEditingValidity={
                                                                    attachmentValidityEditors[uploadedAttachment.id]
                                                                    ?? Boolean(uploadedAttachment.validityDate)
                                                                  }
                                                                  isSaving={loading === `filing-attachment-validity-${uploadedAttachment.id}`}
                                                                  onDraftChange={(value) =>
                                                                    setAttachmentValidityDrafts((prev) => ({
                                                                      ...prev,
                                                                      [uploadedAttachment.id]: value,
                                                                    }))
                                                                  }
                                                                  onRemove={() => void handleDeleteFilingPhoto(uploadedAttachment.id)}
                                                                  onSaveValidity={(value) => void handleUpdateFilingAttachmentValidity(uploadedAttachment.id, value)}
                                                                  onToggleValidity={(enabled) => {
                                                                    setAttachmentValidityEditors((prev) => ({
                                                                      ...prev,
                                                                      [uploadedAttachment.id]: enabled,
                                                                    }));
                                                                    if (!enabled && uploadedAttachment.validityDate) {
                                                                      void handleUpdateFilingAttachmentValidity(uploadedAttachment.id, null);
                                                                    }
                                                                  }}
                                                                />
                                                              ) : null}
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  )}

                                                  {!isLockedItem && overdueMeta && (
                                                    <div
                                                      className={cn(
                                                        "rounded-2xl border border-[#fb923c]/35 bg-surface px-3 py-2 text-xs text-on-surface",
                                                        filingValidationWarning?.checklistDelayRemarkItemIds.includes(item.id) &&
                                                        !resp.delayRemarks?.trim() &&
                                                          "animate-pulse-red !border-red-500/35",
                                                      )}
                                                    >
                                                      <div className="flex flex-wrap items-center gap-3">
                                                        <span className="font-semibold text-[#fb923c] uppercase tracking-wide">Overdue</span>
                                                        <span className="ds-numeric">Due: {new Date(overdueMeta.dueAt).toLocaleDateString("en-IN")}</span>
                                                        <span className="ds-numeric">{overdueMeta.daysDelayed} day(s) delayed</span>
                                                      </div>
                                                      <div className="mt-2 space-y-1">
                                                        <label className="ds-label block text-[#fb923c]">Delay Remarks *</label>
                                                        <textarea
                                                          rows={2}
                                                          value={resp.delayRemarks || ""}
                                                          onChange={(e) => {
                                                            setChecklistResponses((prev) => ({
                                                              ...prev,
                                                              [item.id]: {
                                                                ...prev[item.id],
                                                                delayRemarks: e.target.value,
                                                              },
                                                            }));
                                                          }}
                                                          placeholder="Explain why this checklist item crossed its deadline..."
                                                          className={cn(
                                                            "w-full text-xs",
                                                            filingValidationWarning?.checklistDelayRemarkItemIds.includes(item.id) &&
                                                            !resp.delayRemarks?.trim() &&
                                                              "!border-red-500/60",
                                                          )}
                                                        />
                                                      </div>
                                                    </div>
                                                  )}

                                                  {!isLockedItem && resp.isChecked && item.requiresRemarks && (
                                                    <div
                                                      className={cn(
                                                        "ml-10 space-y-1.5 rounded-xl transition-all",
                                                        filingValidationWarning?.checklistRemarkItemIds.includes(item.id) &&
                                                        !resp.remarks?.trim() &&
                                                          "animate-pulse-red border border-red-500/30 bg-surface p-2",
                                                      )}
                                                    >
                                                      <label className="ds-label block">Remarks / Notes *</label>
                                                      <input
                                                        type="text"
                                                        required
                                                        value={resp.remarks || ""}
                                                        onChange={(e) => {
                                                          setChecklistResponses((prev) => ({
                                                            ...prev,
                                                            [item.id]: {
                                                              ...prev[item.id],
                                                              remarks: e.target.value,
                                                            },
                                                          }));
                                                        }}
                                                        placeholder="Enter required verification details..."
                                                        className={cn(
                                                          "w-full text-xs",
                                                          filingValidationWarning?.checklistRemarkItemIds.includes(item.id) &&
                                                          !resp.remarks?.trim() &&
                                                            "!border-red-500/60",
                                                        )}
                                                      />
                                                    </div>
                                                  )}

                                                  {!isLockedItem && checklistItemAllowsDirectUpload(item) && (
                                                    <div
                                                      className={cn(
                                                        "ml-10 space-y-2 rounded-xl transition-all",
                                                        !checklistUploadsReady &&
                                                          "animate-pulse-red border border-red-500/30 bg-surface p-2",
                                                      )}
                                                    >
                                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <label className="ds-label block">Supporting File / Photo</label>
                                                        <span className="text-[11px] text-on-surface-variant ds-numeric">
                                                          Uploaded {checklistItemAttachments.length} / Minimum {item.minUploads || 0}
                                                        </span>
                                                      </div>
                                                      <FileUploadField
                                                        id={`checklist-item-upload-${item.id}`}
                                                        compact
                                                        disabled={loading === `checklist-item-file-${item.id}`}
                                                        uploading={loading === `checklist-item-file-${item.id}`}
                                                        uploadingLabel="Uploading support file..."
                                                        helperText="Add images or documents here. This upload counts toward this checklist item directly."
                                                        triggerText="Drag and drop or choose supporting file to upload"
                                                        showSelectedPreview={false}
                                                        onInputChange={(e) => handleUploadChecklistItemFile(item.id, e)}
                                                      />
                                                      {checklistItemAttachments.length > 0 ? (
                                                        <div className="space-y-2">
                                                          {checklistItemAttachments.map((attachment: any) => (
                                                            <FilingAttachmentValidityRow
                                                              key={attachment.id}
                                                              attachment={attachment}
                                                              draftValidityDate={
                                                                attachmentValidityDrafts[attachment.id]
                                                                ?? toDateInputValue(attachment.validityDate)
                                                              }
                                                              isEditingValidity={
                                                                attachmentValidityEditors[attachment.id]
                                                                ?? Boolean(attachment.validityDate)
                                                              }
                                                              isSaving={loading === `filing-attachment-validity-${attachment.id}`}
                                                              onDraftChange={(value) =>
                                                                setAttachmentValidityDrafts((prev) => ({
                                                                  ...prev,
                                                                  [attachment.id]: value,
                                                                }))
                                                              }
                                                              onRemove={() => void handleDeleteFilingPhoto(attachment.id)}
                                                              onSaveValidity={(value) => void handleUpdateFilingAttachmentValidity(attachment.id, value)}
                                                              onToggleValidity={(enabled) => {
                                                                setAttachmentValidityEditors((prev) => ({
                                                                  ...prev,
                                                                  [attachment.id]: enabled,
                                                                }));
                                                                if (!enabled && attachment.validityDate) {
                                                                  void handleUpdateFilingAttachmentValidity(attachment.id, null);
                                                                }
                                                              }}
                                                            />
                                                          ))}
                                                        </div>
                                                      ) : null}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {visibleNodeConditionalSections.length > 0 && (
                                    <div className={`${filingPrimaryColumnClass} space-y-2.5 pt-0.5 ${isActiveStageBlocked ? "pointer-events-none opacity-60" : ""}`}>
                                      <h4 className="ds-label text-on-surface">Conditional Sections & Documents</h4>
                                      <div className="space-y-2.5">
                                        {visibleNodeConditionalSections.map((section: any) => (
                                          <div key={section.key} className="rounded-xl border border-outline-variant bg-surface-container-low p-3 space-y-2.5">
                                            <div className="flex items-center gap-3 text-sm text-on-surface">
                                              <NeonCheckbox
                                                checked={!!filingToggleStates[section.key]}
                                                onChange={(e) => {
                                                  const checked = e.target.checked;
                                                  setFilingToggleStates((prev) => ({ ...prev, [section.key]: checked }));
                                                  setFilingToggleStateDetails((prev) => ({
                                                    ...prev,
                                                    [section.key]: {
                                                      isEnabled: checked,
                                                      state: prev[section.key]?.state ?? null,
                                                    },
                                                  }));
                                                }}
                                                label={section.label}
                                              />
                                            </div>
                                            {filingToggleStates[section.key] && section.unlocksFields?.length > 0 && (
                                              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                                                {section.unlocksFields.map((field: any) => {
                                                  const isMissingField =
                                                    filingValidationWarning?.fieldKeys.includes(field.key) &&
                                                    !String(filingFieldValues[field.key] ?? "").trim();
                                                  return (
                                                    <div
                                                      key={field.key}
                                                      className={cn(
                                                        "space-y-1 rounded-xl transition-all",
                                                        isMissingField && "animate-pulse-red border border-red-500/30 bg-surface p-2",
                                                      )}
                                                    >
                                                      <label className="ds-label block text-on-surface-variant">
                                                        {field.label} {field.required !== false ? "*" : ""}
                                                      </label>
                                                      {field.type === "DATE" ? (
                                                        <DateInput
                                                          value={filingFieldValues[field.key] || ""}
                                                          onChange={(e) => setFilingFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                                          className={cn("w-full", isMissingField && "!border-red-500/60")}
                                                        />
                                                      ) : (
                                                        <input
                                                          value={filingFieldValues[field.key] || ""}
                                                          onChange={(e) => setFilingFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                                          placeholder={field.placeholder || field.label}
                                                          className={cn("w-full text-sm", isMissingField && "!border-red-500/60")}
                                                        />
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                            {filingToggleStates[section.key] && section.unlocksDocuments?.length > 0 && (
                                              <div className="space-y-1.5">
                                                {section.unlocksDocuments.map((requirement: any) => {
                                                  const uploadedAttachment = activeNodeDocumentAttachmentsByKey.get(requirement.key);
                                                  const isMissingDocument =
                                                    requirement.required !== false &&
                                                    !uploadedAttachment;
                                                  return (
                                                  <div
                                                    key={requirement.key}
                                                    className={cn(
                                                      "rounded-xl border border-outline-variant/60 bg-surface p-3",
                                                      isMissingDocument && "animate-pulse-red !border-red-500/35",
                                                    )}
                                                  >
                                                    <div className="flex items-center justify-between gap-3">
                                                      <div>
                                                        <div className="text-xs font-semibold text-on-surface">
                                                          {requirement.label} {requirement.required !== false ? "*" : ""}
                                                        </div>
                                                      </div>
                                                      <div className="w-full max-w-[220px]">
                                                        <FileUploadField
                                                          id={`unlocked-node-document-upload-${section.key}-${requirement.key}`}
                                                          compact
                                                          disabled={loading === `node-document-${requirement.key}`}
                                                          uploading={loading === `node-document-${requirement.key}`}
                                                          uploadingLabel={`Uploading ${requirement.label}...`}
                                                          showSelectedPreview={false}
                                                          triggerText="Choose file to upload"
                                                          onInputChange={(e) => handleUploadNodeDocument(requirement.key, e)}
                                                        />
                                                      </div>
                                                    </div>
                                                    {uploadedAttachment ? (
                                                      <div className="mt-3">
                                                        <FilingAttachmentValidityRow
                                                          attachment={uploadedAttachment}
                                                          draftValidityDate={
                                                            attachmentValidityDrafts[uploadedAttachment.id]
                                                            ?? toDateInputValue(uploadedAttachment.validityDate)
                                                          }
                                                          isEditingValidity={
                                                            attachmentValidityEditors[uploadedAttachment.id]
                                                            ?? Boolean(uploadedAttachment.validityDate)
                                                          }
                                                          isSaving={loading === `filing-attachment-validity-${uploadedAttachment.id}`}
                                                          onDraftChange={(value) =>
                                                            setAttachmentValidityDrafts((prev) => ({
                                                              ...prev,
                                                              [uploadedAttachment.id]: value,
                                                            }))
                                                          }
                                                          onRemove={() => void handleDeleteFilingPhoto(uploadedAttachment.id)}
                                                          onSaveValidity={(value) => void handleUpdateFilingAttachmentValidity(uploadedAttachment.id, value)}
                                                          onToggleValidity={(enabled) => {
                                                            setAttachmentValidityEditors((prev) => ({
                                                              ...prev,
                                                              [uploadedAttachment.id]: enabled,
                                                            }));
                                                            if (!enabled && uploadedAttachment.validityDate) {
                                                              void handleUpdateFilingAttachmentValidity(uploadedAttachment.id, null);
                                                            }
                                                          }}
                                                        />
                                                      </div>
                                                    ) : null}
                                                  </div>
                                                );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        ))}

                                      </div>
                                    </div>
                                  )}

                                  <div className={filingCompletionColumnClass}>
                                    {queryProcessingEnabled ? (
                                      <>
                                        <div className="card-top-accent-orange overflow-hidden rounded-xl border border-outline-variant/60 bg-surface shadow-sm">
                                          <div className="flex items-start justify-between gap-3 px-5 py-4">
                                            <div className="min-w-0 flex-1 space-y-1">
                                              <div className="grid grid-cols-[4px_minmax(0,1fr)] items-center gap-4">
                                                <span className="h-7 w-1 rounded-sm bg-[#fb923c]" aria-hidden="true" />
                                                <h3 className="ds-h3 text-[#fb923c]">Query Processing</h3>
                                              </div>
                                              <p className="pl-5 text-sm text-on-surface-variant">
                                                {activeNodeOpenQueries.length > 0
                                                  ? `${activeNodeOpenQueries.length} active quer${activeNodeOpenQueries.length > 1 ? "ies require" : "y requires"} attention.`
                                                  : queryProcessingStage === "CLEARED"
                                                    ? "All recorded queries are cleared for this filing stage."
                                                    : queryProcessingStage === "NO_QUERY"
                                                      ? "No query has been raised for this filing stage."
                                                      : "Track query intake and response status for this filing stage."}
                                              </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2 self-start">
                                              {queryProcessingWarning ? (
                                                <WarningNoteToggle
                                                  title={queryProcessingWarning.title}
                                                  description={queryProcessingWarning.description}
                                                  open={openWarningNote === "query-processing"}
                                                  onToggle={() =>
                                                    setOpenWarningNote((current) => (current === "query-processing" ? null : "query-processing"))
                                                  }
                                                />
                                              ) : null}
                                              <button
                                                type="button"
                                                role="switch"
                                                aria-checked={queryProcessingToggleEnabled}
                                                aria-label={queryProcessingToggleEnabled ? "Turn query processing off" : "Turn query processing on"}
                                                disabled={isSavingQueryProcessingDecision}
                                                onClick={() => void handleQueryProcessingToggleChange()}
                                                className={`inline-flex items-center gap-2 rounded-xl border border-[#fb923c]/20 bg-[#fb923c]/8 px-3 py-1.5 text-sm text-on-surface transition-all ${isSavingQueryProcessingDecision
                                                    ? "cursor-not-allowed opacity-60"
                                                    : "hover:shadow-[0_8px_18px_-14px_rgba(251,146,60,0.7)]"
                                                  }`}
                                              >
                                                <span className="ds-label text-[#c76628] whitespace-nowrap">{queryProcessingToggleEnabled ? "Queries On" : "Queries Off"}</span>
                                                <span
                                                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-all ${queryProcessingToggleEnabled
                                                      ? "border-[#fb923c]/45 bg-[#fb923c]/20"
                                                      : "border-[#fb923c]/25 bg-surface-container-low"
                                                    }`}
                                                  aria-hidden="true"
                                                >
                                                  <span
                                                    className={`pointer-events-none absolute top-[2px] left-[2px] h-[18px] w-[18px] rounded-full border border-[#fb923c]/20 bg-surface shadow-sm transition-transform ${queryProcessingToggleEnabled ? "translate-x-[20px]" : "translate-x-0"
                                                      }`}
                                                  />
                                                </span>
                                              </button>
                                            </div>
                                          </div>

                                          {/* Query summary cards */}
                                          <div className="grid grid-cols-3 gap-3 px-4 py-3">
                                            {filingSummaryCards
                                              .filter((card) => card.key === "queries" || card.key === "open-cases" || card.key === "received")
                                              .map((card) => {
                                                const toneClasses =
                                                  card.tone === "orange"
                                                    ? "border-[#fb923c]/30 text-[#c76628]"
                                                    : "border-[#00cec4]/25 text-[#0f766e]";
                                                return (
                                                  <div
                                                    key={card.key}
                                                    className={`rounded-[16px] border bg-surface px-3 py-3 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.18)] ${toneClasses}`}
                                                  >
                                                    <div className="flex items-start gap-2.5">
                                                      <span className="ds-icon-badge shrink-0">{card.icon}</span>
                                                      <div className="min-w-0 flex-1 space-y-0.5">
                                                        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface-variant">
                                                          {card.title}
                                                        </p>
                                                        <p className="text-sm font-semibold leading-5 text-on-surface">
                                                          {card.value}
                                                        </p>
                                                        <p className="text-[11px] leading-4 text-on-surface-variant">
                                                          {card.note}
                                                        </p>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                          </div>

                                          {queryProcessingActive ? (
                                            <div className="space-y-3 px-4 py-3">
                                              <div className="grid gap-3 text-sm sm:grid-cols-2">
                                                <div className="space-y-2 text-on-surface-variant">
                                                  <div className="flex items-center justify-between gap-3 sm:block">
                                                    <span className="ds-label block text-on-surface-variant">Ref</span>
                                                    <span className="text-sm font-medium text-on-surface sm:mt-1 sm:block">
                                                      {typeof queryProcessingState?.queryReferenceNumber === "string" && queryProcessingState.queryReferenceNumber.trim()
                                                        ? queryProcessingState.queryReferenceNumber
                                                        : primaryQuerySummary?.title || "Not Recorded"}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center justify-between gap-3 sm:block">
                                                    <span className="ds-label block text-on-surface-variant">Officer</span>
                                                    <span className="text-sm font-medium text-on-surface sm:mt-1 sm:block">
                                                      {typeof queryProcessingState?.customsOfficerName === "string" && queryProcessingState.customsOfficerName.trim()
                                                        ? queryProcessingState.customsOfficerName
                                                        : "Not Assigned"}
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="space-y-2 text-on-surface-variant">
                                                  <div className="flex items-center justify-between gap-3 sm:block">
                                                    <span className="ds-label block text-on-surface-variant">Received</span>
                                                    <span className="text-sm font-medium text-on-surface sm:mt-1 sm:block">
                                                      {typeof queryProcessingState?.queryReceivedAt === "string" && queryProcessingState.queryReceivedAt.trim()
                                                        ? new Date(queryProcessingState.queryReceivedAt).toLocaleDateString("en-IN")
                                                        : "Pending"}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center justify-between gap-3 sm:block">
                                                    <span className="ds-label block text-on-surface-variant">Open Cases</span>
                                                    <span className="text-sm font-medium text-on-surface sm:mt-1 sm:block">
                                                      {activeNodeOpenQueries.length}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  className="w-full justify-center gap-2 border-[#fb923c]/35 text-base text-[#c76628] hover:border-[#fb923c]/50 hover:text-[#c76628] sm:w-auto sm:min-w-[220px]"
                                                  onClick={() => setQueryProcessingPanelExpanded(true)}
                                                >
                                                  Manage Queries
                                                  <ChevronRight size={16} />
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="px-4 py-3 text-sm text-on-surface-variant">
                                              Turn on queries to reveal the customs query card, summary details, and manage actions for this filing step.
                                            </div>
                                          )}
                                        </div>

                                        {queryProcessingPanelExpanded && queryProcessingActive ? (
                                          <Modal
                                            open={queryProcessingPanelExpanded}
                                            title="Manage Queries"
                                            description="Review customs query details, record updates, and manage responses for this filing stage."
                                            onClose={() => setQueryProcessingPanelExpanded(false)}
                                            className="max-w-4xl"
                                          >
                                            <div className="space-y-5">

                                              {queryProcessingEnabled && queryProcessingStage === "CLEARED" ? (
                                                <div className="rounded-xl border border-[#00cec4]/25 bg-[#00cec4]/10 p-4 text-sm text-on-surface">
                                                  All customs queries are cleared for this workflow stage. You can continue to the next stage or record an additional query if customs raises another one.
                                                  <div className="mt-3">
                                                    <Button
                                                      type="button"
                                                      variant="outline"
                                                      onClick={() =>
                                                        handlePersistFilingToggleState(
                                                          "query_processing",
                                                          true,
                                                          {
                                                            ...(queryProcessingState ?? {}),
                                                            stage: "OPEN",
                                                          },
                                                          "Ready to capture an additional customs query.",
                                                        )
                                                      }
                                                    >
                                                      Record Additional Query
                                                    </Button>
                                                  </div>
                                                </div>
                                              ) : null}

                                              <div className="space-y-4 ds-form-section">
                                                <div className="flex items-start justify-between gap-3">
                                                  <div>
                                                    <h4>Create Query</h4>
                                                    <p className="pl-[13px] text-sm text-on-surface-variant">
                                                      Capture the customs note, reference number, officer, and received date.
                                                    </p>
                                                  </div>
                                                  <Badge variant="default">{activeNodeQueries.length} Case{activeNodeQueries.length === 1 ? "" : "s"}</Badge>
                                                </div>
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                  <label className="space-y-1">
                                                    <span className="ds-label block text-on-surface-variant">Query Title *</span>
                                                    <Input
                                                      value={filingQueryTitle}
                                                      onChange={(e) => setFilingQueryTitle(e.target.value)}
                                                      placeholder="Query title"
                                                      className="w-full"
                                                    />
                                                  </label>
                                                  <label className="space-y-1">
                                                    <span className="ds-label block text-on-surface-variant">Reference Number</span>
                                                    <Input
                                                      value={filingQueryReferenceNumber}
                                                      onChange={(e) => setFilingQueryReferenceNumber(e.target.value)}
                                                      placeholder="Enter query reference number"
                                                      className="w-full"
                                                    />
                                                  </label>
                                                  <label className="space-y-1">
                                                    <span className="ds-label block text-on-surface-variant">Customs Officer</span>
                                                    <Input
                                                      value={filingQueryOfficerName}
                                                      onChange={(e) => setFilingQueryOfficerName(e.target.value)}
                                                      placeholder="Officer name"
                                                      className="w-full"
                                                    />
                                                  </label>
                                                  <label className="space-y-1">
                                                    <span className="ds-label block text-on-surface-variant">Received Date</span>
                                                    <DateInput
                                                      value={filingQueryReceivedAt}
                                                      onChange={(e) => setFilingQueryReceivedAt(e.target.value)}
                                                    />
                                                  </label>
                                                </div>
                                                <label className="space-y-1">
                                                  <span className="ds-label block text-on-surface-variant">Query Details *</span>
                                                  <textarea
                                                    rows={3}
                                                    value={filingQueryDetails}
                                                    onChange={(e) => {
                                                      setFilingQueryDetails(e.target.value);
                                                      setFilingFieldValues((current) => ({ ...current, query_notes: e.target.value }));
                                                    }}
                                                    placeholder="Record customs query details, offline response notes, or follow-up context..."
                                                    className="ds-textarea w-full px-4 py-3 text-sm"
                                                  />
                                                </label>
                                                <div className="flex justify-end">
                                                  <Button type="button" onClick={handleCreateFilingQuery} disabled={loading !== null}>
                                                    {loading === "filing-query-create" ? "Saving..." : "Create Query Record"}
                                                  </Button>
                                                </div>
                                              </div>

                                              <div className="space-y-3 ds-form-section">
                                                <div className="flex items-center justify-between gap-3">
                                                  <div>
                                                    <h4>Query Cases</h4>
                                                    <p className="pl-[13px] text-sm text-on-surface-variant">
                                                      View responses, respond offline, submit updates, clear, or reopen any customs query.
                                                    </p>
                                                  </div>
                                                  <Badge variant="default">{activeNodeQueries.length}</Badge>
                                                </div>

                                                {activeNodeQueries.map((query: any) => {
                                                  const queryMessages = activeNodeQueryMessages.filter((message: any) => message.queryId === query.id);
                                                  const isClosed = query.status === "CLOSED";
                                                  const statusLabel =
                                                    query.status === "CLOSED"
                                                      ? "Cleared"
                                                      : query.status === "REPLIED"
                                                        ? "Response Submitted"
                                                        : "Open";
                                                  return (
                                                    <details
                                                      key={query.id}
                                                      className="group overflow-hidden rounded-xl border border-outline-variant/60 bg-surface"
                                                    >
                                                      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3">
                                                        <div className="min-w-0">
                                                          <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-sm font-medium text-on-surface">{query.title}</p>
                                                            <span className="rounded-md bg-[#00cec4]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#00cec4]">
                                                              {statusLabel}
                                                            </span>
                                                          </div>
                                                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-on-surface-variant">
                                                            {query.id === queryProcessingState?.latestQueryId &&
                                                              typeof queryProcessingState?.queryReferenceNumber === "string" &&
                                                              queryProcessingState.queryReferenceNumber.trim() ? (
                                                              <span>Ref: {queryProcessingState.queryReferenceNumber}</span>
                                                            ) : null}
                                                            {query.id === queryProcessingState?.latestQueryId &&
                                                              typeof queryProcessingState?.customsOfficerName === "string" &&
                                                              queryProcessingState.customsOfficerName.trim() ? (
                                                              <span>Officer: {queryProcessingState.customsOfficerName}</span>
                                                            ) : null}
                                                            <span>Created {new Date(query.createdAt).toLocaleString("en-IN")}</span>
                                                          </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                          <Badge variant={isClosed ? "success" : "secondary"}>
                                                            {queryMessages.length} Update{queryMessages.length === 1 ? "" : "s"}
                                                          </Badge>
                                                          <ChevronRight className="mt-0.5 size-4 shrink-0 text-on-surface-variant transition-transform group-open:hidden" />
                                                          <ChevronDown className="mt-0.5 hidden size-4 shrink-0 text-on-surface-variant group-open:block" />
                                                        </div>
                                                      </summary>
                                                      <div className="space-y-4 border-t border-outline-variant/40 px-4 py-4">
                                                        <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-3 text-sm text-on-surface">
                                                          {query.details}
                                                        </div>
                                                        <div className="space-y-2">
                                                          <label className="ds-label block text-on-surface-variant">Offline Response / Status Update</label>
                                                          <textarea
                                                            rows={3}
                                                            value={filingQueryStatusUpdates[query.id] || ""}
                                                            onChange={(e) =>
                                                              setFilingQueryStatusUpdates((current) => ({ ...current, [query.id]: e.target.value }))
                                                            }
                                                            placeholder="Record the response shared with customs or the latest status update..."
                                                            className="ds-textarea w-full px-4 py-3 text-sm"
                                                          />
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                          <label className="space-y-1">
                                                            <span className="ds-label block text-on-surface-variant">Responder Name</span>
                                                            <Input
                                                              value={filingQueryResponderNames[query.id] || ""}
                                                              onChange={(e) =>
                                                                setFilingQueryResponderNames((current) => ({ ...current, [query.id]: e.target.value }))
                                                              }
                                                              placeholder="Person who responded"
                                                            />
                                                          </label>
                                                        </div>
                                                        <div className="flex flex-wrap justify-end gap-2">
                                                          <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => handleAddFilingQueryComment(query.id)}
                                                            disabled={loading === `filing-query-${query.id}`}
                                                          >
                                                            Save Response Update
                                                          </Button>
                                                          {!isClosed ? (
                                                            <>
                                                              <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() =>
                                                                  handleUpdateFilingQueryStatus(
                                                                    query.id,
                                                                    "REPLIED",
                                                                    buildFilingQueryResponseMessage(query.id, query.details),
                                                                  )
                                                                }
                                                                disabled={loading === `filing-query-${query.id}`}
                                                              >
                                                                Mark Response Submitted
                                                              </Button>
                                                              <Button
                                                                type="button"
                                                                onClick={() =>
                                                                  handleUpdateFilingQueryStatus(
                                                                    query.id,
                                                                    "CLOSED",
                                                                    buildFilingQueryResponseMessage(query.id, query.details),
                                                                  )
                                                                }
                                                                disabled={loading === `filing-query-${query.id}`}
                                                              >
                                                                Mark Cleared
                                                              </Button>
                                                            </>
                                                          ) : (
                                                            <Button
                                                              type="button"
                                                              variant="outline"
                                                              onClick={() =>
                                                                handleUpdateFilingQueryStatus(
                                                                  query.id,
                                                                  "OPEN",
                                                                  buildFilingQueryResponseMessage(query.id, query.details),
                                                                )
                                                              }
                                                              disabled={loading === `filing-query-${query.id}`}
                                                            >
                                                              Reopen Query
                                                            </Button>
                                                          )}
                                                        </div>
                                                        {queryMessages.length > 0 ? (
                                                          <div className="space-y-2">
                                                            <span className="ds-label block text-on-surface-variant">History</span>
                                                            <div className="space-y-2">
                                                              {queryMessages.map((message: any) => (
                                                                <div key={message.id} className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3">
                                                                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-on-surface-variant">
                                                                    <span>{message.authorName || "System"}</span>
                                                                    <span>{new Date(message.createdAt).toLocaleString("en-IN")}</span>
                                                                  </div>
                                                                  <p className="mt-2 text-sm text-on-surface">{message.body}</p>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          </div>
                                                        ) : null}
                                                      </div>
                                                    </details>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          </Modal>
                                        ) : null}

                                        <Modal
                                          open={queryToggleOffModalOpen}
                                          title="Turn Off Query Processing"
                                          description="Add remarks before switching query processing off for this filing stage."
                                          onClose={handleCloseQueryToggleOffModal}
                                          className="max-w-lg"
                                        >
                                          <div className="space-y-5">
                                            <div className="rounded-[24px] border border-[#fb923c]/18 bg-[linear-gradient(135deg,rgba(251,146,60,0.09),rgba(255,255,255,0.02))] px-4 py-3 shadow-[0_18px_36px_-30px_rgba(251,146,60,0.35)]">
                                              <div className="flex items-start gap-3">
                                                <span className="mt-0.5 h-10 w-1.5 rounded-full bg-[#fb923c]" aria-hidden="true" />
                                                <div className="space-y-1">
                                                  <p className="text-sm font-medium text-on-surface">
                                                    Query processing can be turned off for this filing stage after adding operational remarks.
                                                  </p>
                                                  <p className="text-xs text-on-surface-variant">
                                                    Existing query records remain in the audit trail; this only closes the active query-processing path.
                                                  </p>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="rounded-[24px] border border-outline-variant/18 bg-surface-container-low/35 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                                              <div className="space-y-2">
                                                <label className="ds-label block text-on-surface-variant">
                                                  Remarks for turning off query processing *
                                                </label>
                                                <textarea
                                                  rows={4}
                                                  value={queryToggleOffRemarks}
                                                  onChange={(e) => setQueryToggleOffRemarks(e.target.value)}
                                                  placeholder="Explain why query processing is being turned off..."
                                                  className="w-full rounded-[18px] border border-outline-variant/20 bg-surface px-4 py-3 text-sm shadow-[0_14px_28px_-24px_rgba(15,23,42,0.2)]"
                                                  disabled={loading === "filing-toggle-query_processing"}
                                                />
                                              </div>
                                            </div>

                                            <div className="flex justify-end gap-2 border-t border-outline-variant/14 pt-1">
                                              <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleCloseQueryToggleOffModal}
                                                disabled={loading === "filing-toggle-query_processing"}
                                                className="rounded-2xl px-5"
                                              >
                                                Cancel
                                              </Button>
                                              <Button
                                                type="button"
                                                onClick={() => void handleConfirmQueryProcessingToggleOff()}
                                                disabled={loading === "filing-toggle-query_processing"}
                                                className="rounded-2xl px-5"
                                              >
                                                {loading === "filing-toggle-query_processing" ? "Saving..." : "Turn Off"}
                                              </Button>
                                            </div>
                                          </div>
                                        </Modal>
                                        <div className="flex flex-1">
                                          <div className="flex min-h-full w-full flex-col overflow-hidden rounded-[24px] border border-outline-variant/40 bg-surface shadow-[0_22px_48px_-34px_rgba(15,23,42,0.22)]">
                                            <div className="flex flex-1 flex-col space-y-6 px-5 py-5">
                                              <div className="flex items-start gap-4">
                                                <span className="ds-icon-badge size-12 shrink-0">
                                                  <ClipboardList size={20} />
                                                </span>
                                                <div className="space-y-0.5">
                                              <h3 className="ds-h3 text-on-surface">
                                                    {isFinalFilingNode ? "Final Filing Remarks" : "Completion Comments / Remarks"} {activeNodeRun.node.commentsRequired ? <span className="text-red-500">*</span> : null}
                                                  </h3>
                                                  <p className="text-sm text-on-surface-variant">
                                                    {isFinalFilingNode
                                                      ? "Record the final filing outcome or any closing note for the audit trail."
                                                      : "Provide checklist execution remarks or record the final outcome."}
                                                  </p>
                                                </div>
                                              </div>

                                              <textarea
                                                ref={nodeRemarksTextareaRef}
                                                rows={4}
                                                value={nodeRemarks}
                                                onChange={(e) => setNodeRemarks(e.target.value)}
                                                placeholder="Enter comments, observations, or checklist outcome..."
                                                className={cn(
                                                  "min-h-[112px] flex-1 w-full resize-none overflow-hidden rounded-[16px] border border-outline-variant/45 bg-surface px-5 py-4 text-sm font-sans shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]",
                                                  filingValidationWarning?.miscKeys.includes("nodeRemarks") &&
                                                  !nodeRemarks.trim() &&
                                                    "animate-pulse-red !border-red-500/60",
                                                )}
                                                disabled={loading !== null || isActiveStageBlocked}
                                                required={activeNodeRun.node.commentsRequired}
                                              />

                                              {activeNodeIsOverdue ? (
                                                <div
                                                  className={cn(
                                                    "card-left-accent-orange space-y-3 rounded-xl border border-[#fb923c]/35 bg-surface p-4",
                                                    filingValidationWarning?.miscKeys.includes("nodeDelayRemarks") &&
                                                    !nodeDelayRemarks.trim() &&
                                                      "animate-pulse-red !border-red-500/35",
                                                  )}
                                                >
                                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <label className="ds-label block !text-[#fb923c]">
                                                      Stage Delay Remarks {activeNodeDelayRemarksRequired ? "*" : ""}
                                                    </label>
                                                    {activeNodeSlaDueDate ? (
                                                      <span className="ds-numeric text-xs text-on-surface-variant">
                                                        Due: {activeNodeSlaDueDate.toLocaleDateString("en-IN")} · {activeNodeDelayDays} day(s) delayed
                                                      </span>
                                                    ) : null}
                                                  </div>
                                                  <textarea
                                                    rows={3}
                                                    value={nodeDelayRemarks}
                                                    onChange={(e) => setNodeDelayRemarks(e.target.value)}
                                                    placeholder="Explain why this filing stage crossed its SLA..."
                                                    className={cn(
                                                      "w-full resize-y text-sm",
                                                      filingValidationWarning?.miscKeys.includes("nodeDelayRemarks") &&
                                                      !nodeDelayRemarks.trim() &&
                                                        "!border-red-500/60",
                                                    )}
                                                    disabled={loading !== null || isActiveStageBlocked}
                                                    required={activeNodeDelayRemarksRequired}
                                                  />
                                                </div>
                                              ) : null}

                                              {isFinalFilingNode ? (
                                                <div className="rounded-[18px] border border-outline-variant/35 bg-surface-container-low/35 p-4 text-sm text-on-surface-variant">
                                                  Completing this node will finalize the filing workflow and transition the job stage to <strong>FILED</strong>.
                                                </div>
                                              ) : null}
                                            </div>
                                          </div>
                                        </div>
                                      </>
                                    ) : null}
                                  </div>

                                  {activeNodeRun ? (
                                    <div className="space-y-4 xl:col-span-2">
                                      <FilingWorkflowStatusBanner
                                        activeNodeName={activeNodeRun.node.name}
                                        activeNodeSequence={activeNodeSequence}
                                        activeNodeSubtitle={activeNodeSubtitle}
                                        completedSteps={filingCompletedSteps}
                                        nextStageName={outgoingEdges.length > 0 ? nextWorkflowTargetLabel : null}
                                        isBlocked={isActiveStageBlocked}
                                        isCompleting={loading === "filing-complete"}
                                        activeStatusLabel={filingBannerStatus.label}
                                        activeStatusDescription={filingBannerStatus.description}
                                      />
                                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                                        <div className="min-w-0 flex-1">
                                          <SlideToComplete
                                            key={activeNodeRun.id}
                                            disabled={loading !== null || isActiveStageBlocked}
                                            text={
                                              isSkippingActiveOptionalNode
                                                ? "Slide to skip this stage"
                                                : !isFinalFilingNode
                                                  ? "Slide to complete this step"
                                                  : "Slide to mark job filed"
                                            }
                                            helperText="Slide all the way to the right"
                                            accessibleName={`Slide to ${isFinalFilingNode ? "mark job filed" : isSkippingActiveOptionalNode ? "skip" : "complete"} ${activeNodeRun.node.name}`}
                                            onComplete={completeActiveFilingNode}
                                          />
                                        </div>
                                        <div className="flex flex-wrap gap-3 xl:shrink-0">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            disabled={loading !== null || isActiveStageBlocked}
                                            onClick={handleSaveFilingDraft}
                                            className="gap-2 rounded-[16px] px-5"
                                          >
                                            <Database size={16} />
                                            Save Draft
                                          </Button>
                                          {hasPreviousFilingStage ? (
                                            <Button
                                              type="button"
                                              variant="outline"
                                              disabled={loading !== null}
                                              onClick={() => {
                                                setGoBackMode("previous");
                                                setGoBackReason("");
                                                setSelectedJumpBackNodeKey(jumpBackTargets[0]?.nodeKey || "");
                                                setGoBackOpen(true);
                                              }}
                                              className="gap-2 rounded-[16px] border-[#00cec4]/40 bg-[#00cec4]/4 px-5 text-[#00a9b2]"
                                            >
                                              <Undo2 size={16} />
                                              Jump Back to Earlier Stage
                                            </Button>
                                          ) : null}
                                          {showReturnToCurrentStageShortcut ? (
                                            <Button
                                              type="button"
                                              variant="outline"
                                              disabled={loading !== null}
                                              onClick={() => void handleReturnToCurrentStage()}
                                              className="gap-2 rounded-[16px] border-[#2563eb]/35 bg-[#2563eb]/5 px-5 text-[#2563eb] dark:text-[#9ab8ff]"
                                            >
                                              <RotateCcw size={16} />
                                              {loading === "filing-go-back" ? "Returning..." : "Jump Back to Current Stage"}
                                            </Button>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}

                                  {/* Node Photo / File Upload Requirements */}
                                  {activeNodeRun.node.photoRequirements?.length > 0 && (
                                    <div className={`${filingPrimaryColumnClass} space-y-4 border-t border-outline-variant/30 pt-4 ${isActiveStageBlocked ? "pointer-events-none opacity-60" : ""}`}>
                                      <h4 className="ds-label text-on-surface">Required Photograph / Document Uploads</h4>
                                      <div className="space-y-4">
                                        {activeNodeRun.node.photoRequirements.map((pr: any) => {
                                          const reqAttachments = filingInstance.attachments?.filter(
                                            (a: any) => a.nodeRunId === activeNodeRun.id && a.photoRequirementId === pr.id
                                          ) || [];
                                          const isMissingPhotoRequirement =
                                            pr.isMandatory &&
                                            reqAttachments.length < (pr.minPhotos || 1);
                                          return (
                                            <div
                                              key={pr.id}
                                              className={cn(
                                                "p-4 rounded-2xl border border-dashed border-outline-variant/60 bg-surface space-y-3",
                                                isMissingPhotoRequirement && "animate-pulse-red !border-red-500/35",
                                              )}
                                            >
                                              <div>
                                                <h5 className="text-xs font-semibold text-on-surface">
                                                  {pr.label} {pr.isMandatory && <span className="text-red-500 font-bold">*</span>}
                                                </h5>
                                                {pr.description && <p className="text-[11px] text-on-surface-variant mt-0.5">{pr.description}</p>}
                                                <p className="text-[10px] text-on-surface-variant ds-numeric mt-1 font-mono">
                                                  (Requires: min {pr.minPhotos} {pr.maxPhotos ? `max ${pr.maxPhotos}` : ""})
                                                </p>
                                              </div>

                                              {/* Upload Input */}
                                              {(!pr.maxPhotos || reqAttachments.length < pr.maxPhotos) && (
                                                <>
                                                  <FileUploadField
                                                    id={`photo-requirement-upload-${pr.id}`}
                                                    compact
                                                    disabled={loading === `filing-photo-${pr.id}`}
                                                    uploading={loading === `filing-photo-${pr.id}`}
                                                    uploadingLabel="Uploading requirement file..."
                                                    helperText="This upload is counted against the requirement above, not the checklist item upload count."
                                                    triggerText="Drag and drop or choose required image or document"
                                                    showSelectedPreview={false}
                                                    onInputChange={(e) => handleUploadFilingPhoto(pr.id, e)}
                                                  />
                                                </>
                                              )}

                                              {/* Uploaded Attachments list */}
                                              {reqAttachments.length > 0 && (
                                                <div className="overflow-hidden rounded-xl border border-outline-variant/60">
                                                  <table className="ds-table">
                                                    <thead>
                                                      <tr>
                                                        <th>File Name</th>
                                                        <th>Size</th>
                                                        <th>Uploaded By</th>
                                                        <th className="w-16">Actions</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {reqAttachments.map((a: any) => (
                                                        <tr key={a.id}>
                                                          <td className="truncate max-w-[200px] text-xs font-medium text-on-surface">
                                                            <a href={a.fileKey} target="_blank" rel="noreferrer" className="text-[#00cec4] hover:underline flex items-center gap-1 font-semibold">
                                                              <ExternalLink size={12} className="shrink-0" /> {a.fileName}
                                                            </a>
                                                          </td>
                                                          <td className="ds-numeric text-xs font-mono">{(a.fileSize / 1024).toFixed(1)} KB</td>
                                                          <td className="text-xs">{a.uploadedBy?.name || "Unknown"}</td>
                                                          <td>
                                                            <Button
                                                              type="button"
                                                              variant="outline"
                                                              size="sm"
                                                              onClick={() => handleDeleteFilingPhoto(a.id)}
                                                              disabled={loading === `filing-delete-${a.id}`}
                                                              className="text-red-500 hover:text-red-600 hover:bg-red-500/10 p-1"
                                                            >
                                                              Delete
                                                            </Button>
                                                          </td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                </form>

                                <Modal
                                  open={goBackOpen}
                                  title={goBackMode === "return" ? "Jump Back To Current Stage" : "Jump Back To Earlier Stage"}
                                  description={
                                    goBackMode === "return"
                                      ? "The reopened earlier stage will be cancelled and the latest current filing stage will reopen as a fresh run. This move is recorded in the audit tab."
                                      : "The current stage will be cancelled and the selected earlier filing stage will reopen as a fresh run. This move is recorded in the audit tab."
                                  }
                                  onClose={() => {
                                    setGoBackOpen(false);
                                    setGoBackMode("previous");
                                    setGoBackReason("");
                                    setSelectedJumpBackNodeKey("");
                                  }}
                                  className="max-w-lg"
                                >
                                  <div className="space-y-4">
                                    {goBackMode === "return" && returnToCurrentTarget ? (
                                      <div className="rounded-2xl border border-[#2563eb]/18 bg-[#2563eb]/5 px-4 py-3">
                                        <div className="space-y-1">
                                          <span className="ds-label text-[#2563eb] dark:text-[#9ab8ff]">Returning To</span>
                                          <p className="text-sm font-semibold text-on-surface">{returnToCurrentTarget.nodeName}</p>
                                          {returnToCurrentTarget.completedAt ? (
                                            <p className="text-xs text-on-surface-variant">
                                              Last cancelled on {new Date(returnToCurrentTarget.completedAt).toLocaleString("en-IN")}
                                            </p>
                                          ) : null}
                                        </div>
                                      </div>
                                    ) : (
                                      <label className="block space-y-1.5">
                                        <span className="ds-label">Select Earlier Stage *</span>
                                        <DropdownSelect
                                          ariaLabel="Select earlier filing stage"
                                          value={selectedJumpBackNodeKey}
                                          onValueChange={setSelectedJumpBackNodeKey}
                                          placeholder="Choose earlier stage"
                                          options={jumpBackTargets.map((target: any) => ({
                                            value: target.nodeKey,
                                            label: `${target.nodeName}${target.completedAt ? ` (${new Date(target.completedAt).toLocaleString("en-IN")})` : ""}`,
                                          }))}
                                          triggerClassName="rounded-xl"
                                          contentClassName="rounded-xl border-[#00cec4]/25"
                                        />
                                      </label>
                                    )}
                                    <label className="block space-y-1.5">
                                      <span className="ds-label">{goBackMode === "return" ? "Reason for return *" : "Reason for jump-back *"}</span>
                                      <textarea
                                        rows={3}
                                        value={goBackReason}
                                        onChange={(e) => setGoBackReason(e.target.value)}
                                        placeholder={goBackMode === "return" ? "Explain why the workflow should return to the current filing stage..." : "Explain why this filing stage must be reworked..."}
                                        className="min-h-28 w-full resize-none rounded-xl border border-[#00cec4]/45 bg-surface px-4 py-3 text-sm text-on-surface shadow-[0_12px_26px_-22px_rgba(0,206,196,0.28)] outline-none transition placeholder:text-placeholder focus:border-[#00cec4]/70 focus:shadow-[0_0_0_3px_rgba(0,206,196,0.16)]"
                                        required
                                      />
                                    </label>
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setGoBackOpen(false);
                                          setGoBackMode("previous");
                                          setGoBackReason("");
                                          setSelectedJumpBackNodeKey("");
                                        }}
                                        disabled={loading === "filing-go-back"}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        disabled={loading === "filing-go-back" || !goBackReason.trim() || !selectedJumpBackNodeKey}
                                        onClick={() => void handleGoBackStage()}
                                      >
                                        {goBackMode === "return" ? <RotateCcw size={13} /> : <Undo2 size={13} />}
                                        {loading === "filing-go-back" ? (goBackMode === "return" ? "Returning..." : "Jumping Back...") : (goBackMode === "return" ? "Confirm Return" : "Confirm Jump Back")}
                                      </Button>
                                    </div>
                                  </div>
                                </Modal>
                              </div>
                            ) : (
                              <div className="card-top-accent rounded-xl border border-outline-variant/60 bg-surface p-5 space-y-4 shadow-sm">
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="ds-icon-badge">
                                    <CheckCircle2 size={18} />
                                  </span>
                                  <div className="space-y-1">
                                    <div className="grid grid-cols-[4px_minmax(0,1fr)] items-center gap-3">
                                      <span className="h-7 w-1 rounded-sm bg-[#00cec4]" aria-hidden="true" />
                                      <h4 className="ds-h3 text-on-surface">Customs Filing Workflow Complete</h4>
                                    </div>
                                    <Badge variant="success">Filed</Badge>
                                  </div>
                                </div>
                                <p className="max-w-xl text-sm text-on-surface-variant">
                                  All blueprint checklist checks have been completed and the customs submission has been filed. The job stage is updated to <strong>FILED</strong>.
                                </p>
                                <div className="grid grid-cols-2 gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4 text-xs max-w-md">
                                  <div>
                                    <span className="ds-label block text-on-surface-variant">Actual Filing Date</span>
                                    <span className="font-medium text-on-surface ds-numeric">
                                      {job.filing.actualFilingDate ? new Date(job.filing.actualFilingDate).toLocaleDateString("en-IN") : "Completed"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="ds-label block text-on-surface-variant">Filing Reference ID</span>
                                    <span className="font-medium text-on-surface ds-numeric">{job.filing.filingRef || "Completed"}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </MilestoneCard>
              ) : null}

              {/* 6. EXPENSES */}
              {showExpenseStage ? (
                <MilestoneCard
                  stageKey="EXPENSES"
                  isExpanded={expandedStageKey === "EXPENSES"}
                  isSpotlit={stageFocusKey === "EXPENSES"}
                  onToggle={handleMilestoneToggle}
                  title="Expenses"
                  description="Submit and manage expense disbursement requests for this job."
                  isCompleted={false}
                  isActive={activeTab === "expenses"}
                  isLocked={false}
                  percentage={0}
                  validationState="Open"
                  statusLabel="Open"
                  assignedUser={job.assignedManager?.name || job.primaryOwner?.name || "Operations Team"}
                  dueDate={null}
                  completedAt={null}
                  summary={null}
                >
                  <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.95fr)_minmax(420px,1.05fr)] xl:gap-0">
                    {canCreateExpenseRequests ? (
                    <div className="space-y-4 bg-surface xl:pr-6">
                      <div className="grid grid-cols-[4px_minmax(0,1fr)] items-center gap-3">
                        <span className="h-7 w-1 rounded-sm bg-[#00cec4]" aria-hidden="true" />
                        <h4 className="ds-h3 text-on-surface">New Clearance Expense Request</h4>
                      </div>

                      <form onSubmit={handleCreateExpenseRequest} className="space-y-4">
                        <div className="flex flex-col justify-between gap-4 rounded-xl border border-outline-variant/60 bg-surface p-4">
                          <div className="flex items-start space-x-3">
                            <NeonCheckbox
                              checked={expenseUrgent}
                              onChange={(e) => setExpenseUrgent(e.target.checked)}
                              className="mt-1"
                              label={
                                <div>
                                  <span className="block text-sm font-semibold text-on-surface">Escalate to URGENT Payment</span>
                                  <span className="text-xs text-on-surface-variant">
                                    Request accounts to disburse payment immediately to resolve critical port blocks.
                                  </span>
                                </div>
                              }
                            />
                          </div>

                          {expenseUrgent ? (
                            <div className="max-w-md flex-1 space-y-1">
                              <label className="ds-label block text-[#fb923c]">
                                Urgency Explanation Justification (REQUIRED) *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Demurrage free days end tomorrow"
                                value={expenseUrgencyReason}
                                onChange={(e) => setExpenseUrgencyReason(e.target.value)}
                                className="w-full border-[#fb923c]/50 text-xs font-sans"
                              />
                            </div>
                          ) : null}
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <label className="ds-label">UPI Number</label>
                            <input
                              type="text"
                              placeholder="Payee mobile number"
                              value={expenseUpiNumber}
                              onChange={(e) => setExpenseUpiNumber(e.target.value)}
                              className="h-9 w-full text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="ds-label">UPI ID</label>
                            <input
                              type="text"
                              placeholder="name@bank"
                              value={expenseUpiId}
                              onChange={(e) => setExpenseUpiId(e.target.value)}
                              className="h-9 w-full text-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/30 pb-2">
                            <span className="ds-label">Expense Line Items</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleAddExpenseLine}
                              className="flex items-center gap-1 border-[#00cec4] text-[#00cec4]"
                            >
                              <Plus size={12} /> Add Line Item
                            </Button>
                          </div>

                          <div className="space-y-3">
                            {expenseLines.map((line, index) => (
                              <div key={index} className="grid grid-cols-1 items-end gap-3 border-b border-outline-variant/20 pb-3 md:grid-cols-2 md:border-b-0 md:pb-0">
                                <div className="space-y-1">
                                  <label className="ds-label">Category</label>
                                  <NativeSelect
                                    value={line.category}
                                    onChange={(e) => handleExpenseLineChange(index, "category", e.target.value)}
                                    className="h-9 w-full text-xs"
                                  >
                                    {expenseCategories.map((cat) => (
                                      <option key={cat} value={cat}>
                                        {cat}
                                      </option>
                                    ))}
                                  </NativeSelect>
                                </div>

                                <div className="space-y-1">
                                  <label className="ds-label">Purpose / Purpose *</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Reason for payment"
                                    value={line.purpose}
                                    onChange={(e) => handleExpenseLineChange(index, "purpose", e.target.value)}
                                    className="h-9 w-full text-xs"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="ds-label">Amount (Rs.) *</label>
                                  <input
                                    type="number"
                                    required
                                    placeholder="Amount"
                                    value={line.amount}
                                    onChange={(e) => handleExpenseLineChange(index, "amount", e.target.value)}
                                    className="h-9 w-full text-xs font-mono ds-numeric"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="ds-label">Required Date</label>
                                  <DateInput
                                    value={line.requiredDate}
                                    onChange={(e) => handleExpenseLineChange(index, "requiredDate", e.target.value)}
                                    className="h-9 w-full text-xs"
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <FileUploadField
                                    id={`job-expense-line-receipts-${index}`}
                                    label="Line Receipt Attachments"
                                    accept="image/*,application/pdf"
                                    multiple
                                    compact
                                    triggerText="Drag and drop receipts, or choose files"
                                    helperText="Optional. Add one or more receipts for this expense line."
                                    selectedFiles={line.receiptFiles.map((file) => ({
                                      file,
                                      name: file.name,
                                      sizeBytes: file.size,
                                    }))}
                                    onInputChange={(event) =>
                                      setExpenseLines((current) =>
                                        current.map((entry, lineIndex) =>
                                          lineIndex === index
                                            ? { ...entry, receiptFiles: Array.from(event.currentTarget.files || []) }
                                            : entry,
                                        ),
                                      )
                                    }
                                    onClear={() =>
                                      setExpenseLines((current) =>
                                        current.map((entry, lineIndex) =>
                                          lineIndex === index ? { ...entry, receiptFiles: [] } : entry,
                                        ),
                                      )
                                    }
                                    onRemoveSelectedFile={(_, fileIndex) =>
                                      setExpenseLines((current) =>
                                        current.map((entry, lineIndex) =>
                                          lineIndex === index
                                            ? {
                                                ...entry,
                                                receiptFiles: entry.receiptFiles.filter((__, receiptIndex) => receiptIndex !== fileIndex),
                                              }
                                            : entry,
                                        ),
                                      )
                                    }
                                  />
                                </div>

                                {expenseLines.length > 1 ? (
                                  <div className="flex items-center justify-end md:col-span-2">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveExpenseLine(index)}
                                      className="p-1.5 text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button type="submit" disabled={loading !== null}>
                            Dispatch Expense Request
                          </Button>
                        </div>
                      </form>
                    </div>
                    ) : (
                      <div className="bg-surface xl:pr-6">
                        <p className="text-sm font-medium text-on-surface">Expense records are view-only for your role.</p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          You can track status, line items, payout details, and approval history after the filing stage is complete.
                        </p>
                      </div>
                    )}

                    <div className="space-y-4 bg-surface xl:border-l xl:border-outline-variant/50 xl:pl-6">
                      <div className="grid grid-cols-[4px_minmax(0,1fr)] items-center gap-3">
                        <span className="h-7 w-1 rounded-sm bg-[#00cec4]" aria-hidden="true" />
                        <h4 className="ds-h3 text-on-surface">Expenses Queue</h4>
                      </div>

                      {job.expenseRequests?.length === 0 ? (
                        <p className="text-xs italic text-on-surface-variant">No expenses requested for this job clearance.</p>
                      ) : (
                        <div className="space-y-3">
                          {job.expenseRequests.map((request: any) => {
                            const amount = request.lines.reduce((total: number, line: any) => total + Number(line.amount), 0);
                            const canReviewThisExpense =
                              canReviewExpenseRequests &&
                              String(request.status) === "UNDER_REVIEW";
                            const canClarifyThisExpense =
                              request.requestedById === currentUserId && String(request.status) === "CLARIFICATION_REQUIRED";
                            const canMarkReadyThisExpense =
                              canProcessExpensePayments && String(request.status) === "APPROVED";
                            const canPayThisExpense =
                              canProcessExpensePayments &&
                              ["APPROVED", "READY_FOR_DISBURSEMENT"].includes(String(request.status));
                            return (
                              <div key={request.id} className="space-y-3 rounded-xl border border-outline-variant/45 bg-surface p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-medium text-on-surface ds-numeric">Rs. {amount.toLocaleString("en-IN")}</p>
                                    <p className="mt-0.5 text-xs text-on-surface-variant">
                                      Ref: {request.id} - Requested by {request.requestedBy?.name || "Team Member"}
                                    </p>
                                  </div>
                                  <Badge variant="secondary">{String(request.status || "SUBMITTED").replace(/_/g, " ")}</Badge>
                                </div>
                                <div className="grid gap-2 md:grid-cols-2">
                                  {request.lines.map((line: any) => (
                                    <div key={line.id} className="rounded-lg border border-outline-variant/35 bg-surface-container-low p-3">
                                      <p className="ds-label">{line.category}</p>
                                      <p className="mt-1 text-xs text-on-surface">{line.purpose}</p>
                                      <p className="mt-2 text-xs text-on-surface-variant ds-numeric">
                                        Rs. {Number(line.amount).toLocaleString("en-IN")} due {new Date(line.requiredDate).toLocaleDateString("en-IN")}
                                      </p>
                                      {getReceiptLinks(line.supportingDocumentKey).length ? (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {getReceiptLinks(line.supportingDocumentKey).map((receiptLink, receiptIndex) => (
                                            <a
                                              key={`${receiptLink}-${receiptIndex}`}
                                              href={receiptLink}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex text-xs font-medium text-[#00cec4] hover:underline"
                                            >
                                              Receipt {receiptIndex + 1}
                                            </a>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                                {request.upiNumber || request.upiId ? (
                                  <div className="grid gap-2 rounded-lg border border-outline-variant/35 bg-surface p-3 md:grid-cols-2">
                                    {request.upiNumber ? (
                                      <div>
                                        <p className="ds-label">UPI Number</p>
                                        <p className="mt-1 text-xs text-on-surface ds-numeric">{request.upiNumber}</p>
                                      </div>
                                    ) : null}
                                    {request.upiId ? (
                                      <div>
                                        <p className="ds-label">UPI ID</p>
                                        <p className="mt-1 text-xs text-on-surface">{request.upiId}</p>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                                {request.payments?.length ? (
                                  <div className="rounded-lg border border-green-600/20 bg-green-600/10 p-3 text-xs text-on-surface">
                                    {request.payments.map((payment: any) => (
                                      <div key={payment.id}>
                                        <p>
                                          Processed Rs. {Number(payment.amountPaid).toLocaleString("en-IN")} via {payment.paymentMethod}
                                          {payment.transactionReference ? ` (${payment.transactionReference})` : ""}.
                                        </p>
                                        {getPaymentProofLinks(payment.paymentProofKey).length ? (
                                          <div className="mt-1 flex flex-wrap gap-2">
                                            {getPaymentProofLinks(payment.paymentProofKey).map((proofLink, index) => (
                                              <a
                                                key={`${proofLink}-${index}`}
                                                href={proofLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex text-xs font-medium text-[#00cec4] hover:underline"
                                              >
                                                View payment proof {index + 1}
                                              </a>
                                            ))}
                                          </div>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                {request.statusHistory?.length ? (
                                  <div className="space-y-1 border-t border-outline-variant/30 pt-3">
                                    <p className="ds-label">Approval History</p>
                                    {request.statusHistory.slice(0, 4).map((entry: any) => (
                                      <p key={entry.id} className="text-xs text-on-surface-variant">
                                        {String(entry.status).replace(/_/g, " ")} - {entry.remarks || "No remarks"} -{" "}
                                        {new Date(entry.createdAt).toLocaleString("en-IN")}
                                      </p>
                                    ))}
                                  </div>
                                ) : null}
                                {expReviewId === request.id ? (
                                  <div className="grid gap-2 rounded-lg border border-outline-variant/45 bg-surface p-3 md:grid-cols-[minmax(0,1fr)_auto]">
                                    <input
                                      type="text"
                                      value={expReviewRemarks}
                                      onChange={(e) => setExpReviewRemarks(e.target.value)}
                                      placeholder={expReviewStatus === "REJECTED" ? "Rejection reason" : "Clarification required"}
                                      className="text-xs"
                                    />
                                    <Button size="sm" variant={expReviewStatus === "REJECTED" ? "destructive" : "default"} onClick={() => handleExpenseReview(request.id, expReviewStatus as "CLARIFICATION_REQUIRED" | "APPROVED" | "REJECTED", expReviewRemarks)} disabled={loading !== null}>
                                      Submit Decision
                                    </Button>
                                  </div>
                                ) : null}
                                {expenseClarificationId === request.id ? (
                                  <div className="grid gap-2 rounded-lg border border-outline-variant/45 bg-surface p-3 md:grid-cols-[minmax(0,1fr)_auto]">
                                    <input
                                      type="text"
                                      value={expenseClarificationText}
                                      onChange={(e) => setExpenseClarificationText(e.target.value)}
                                      placeholder="Enter clarification response"
                                      className="text-xs"
                                    />
                                    <Button size="sm" onClick={handleExpenseClarification} disabled={loading !== null}>
                                      Submit Clarification
                                    </Button>
                                  </div>
                                ) : null}
                                {payRequestId === request.id ? (
                                  <form onSubmit={handlePostExpensePayment} className="grid gap-2 rounded-lg border border-outline-variant/45 bg-surface p-3 md:grid-cols-6">
                                    <input
                                      type="number"
                                      required
                                      value={payAmount}
                                      onChange={(e) => setPayAmount(e.target.value)}
                                      placeholder="Amount paid"
                                      className="h-10 text-xs ds-numeric"
                                    />
                                    <DateInput required value={payDate} onChange={(e) => setPayDate(e.target.value)} className="h-10 text-xs" />
                                    <NativeSelect
                                      value={payMethod}
                                      onChange={(e) => setPayMethod(e.target.value)}
                                      className="h-10 text-xs"
                                    >
                                      <option value="BANK_TRANSFER">Bank Transfer IMPS</option>
                                      <option value="NEFT">NEFT / RTGS</option>
                                      <option value="UPI">UPI</option>
                                      <option value="CASH">Cash Drawer</option>
                                    </NativeSelect>
                                    <input
                                      type="text"
                                      required
                                      value={payRef}
                                      onChange={(e) => setPayRef(e.target.value)}
                                      placeholder="Transaction reference"
                                      className="h-10 text-xs"
                                    />
                                    <FileUploadField
                                      id={`workspace-payment-proof-inline-${request.id}`}
                                      accept="image/*,application/pdf"
                                      multiple
                                      compact
                                      triggerText="Drag and drop payment proofs, or choose files"
                                      helperText="Images and PDFs accepted. Multiple files can be selected together."
                                      selectedFiles={payProofFiles.map((file) => ({
                                        file,
                                        name: file.name,
                                        sizeBytes: file.size,
                                      }))}
                                      uploading={loading === `pay-${request.id}`}
                                      onInputChange={(event) => setPayProofFiles(Array.from(event.currentTarget.files || []))}
                                      onClear={() => setPayProofFiles([])}
                                      onRemoveSelectedFile={(_, index) =>
                                        setPayProofFiles((current) => current.filter((__, fileIndex) => fileIndex !== index))
                                      }
                                    />
                                    <Button type="submit" size="sm" disabled={loading !== null}>
                                      Confirm Disbursement
                                    </Button>
                                  </form>
                                ) : null}
                                {canReviewThisExpense || canClarifyThisExpense || canMarkReadyThisExpense || canPayThisExpense ? (
                                  <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant/30 pt-3">
                                    {canReviewThisExpense ? (
                                      <>
                                        <Button type="button" variant="outline" size="sm" onClick={() => {
                                          setExpReviewId(request.id);
                                          setExpReviewStatus("CLARIFICATION_REQUIRED");
                                          setExpReviewRemarks("");
                                        }}>
                                          Require Clarification
                                        </Button>
                                        <Button type="button" variant="destructive" size="sm" onClick={() => {
                                          setExpReviewId(request.id);
                                          setExpReviewStatus("REJECTED");
                                          setExpReviewRemarks("");
                                        }}>
                                          Reject
                                        </Button>
                                        <Button type="button" size="sm" onClick={() => handleExpenseReview(request.id, "APPROVED", "")} disabled={loading !== null}>
                                          Approve
                                        </Button>
                                      </>
                                    ) : null}
                                    {canClarifyThisExpense ? (
                                      <Button type="button" variant="outline" size="sm" onClick={() => {
                                        setExpenseClarificationId(request.id);
                                        setExpenseClarificationText(request.clarificationResponse || "");
                                      }}>
                                        Submit Clarification
                                      </Button>
                                    ) : null}
                                    {canMarkReadyThisExpense ? (
                                      <Button type="button" variant="outline" size="sm" onClick={() => handleReadyForExpenseDisbursement(request.id)} disabled={loading !== null}>
                                        Ready for Disbursement
                                      </Button>
                                    ) : null}
                                    {canPayThisExpense ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                          setPayRequestId(request.id);
                                          setPayAmount(String(amount));
                                          setPayDate(new Date().toISOString().slice(0, 10));
                                          setPayRef("");
                                          setPayProofFiles([]);
                                        }}
                                      >
                                        Process Payment
                                      </Button>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </MilestoneCard>
              ) : null}

              {/* 7. FILED */}
              {showFiledStage ? (
                <MilestoneCard
                  stageKey="FILED"
                  isExpanded={expandedStageKey === "FILED"}
                  isSpotlit={stageFocusKey === "FILED"}
                  onToggle={handleMilestoneToggle}
                  title="Filed / Complete"
                  description="The customs clearance filing process is completed."
                  isCompleted={activeStepIndex >= 5}
                  isActive={false}
                  isLocked={activeStepIndex < 5}
                  percentage={filedPercentage}
                  validationState={filedValidationState}
                  statusLabel={activeStepIndex >= 5 ? "Completed" : "Locked"}
                  assignedUser={job.primaryOwner?.name || "Operations Team"}
                  dueDate={job.estimatedClosureDate ? new Date(job.estimatedClosureDate).toLocaleDateString("en-IN") : null}
                  completedAt={activeStepIndex >= 5 ? (job.updatedAt ? new Date(job.updatedAt).toLocaleString("en-IN") : null) : null}
                  summary={null}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-600/10 text-green-600">
                        <Check size={20} />
                      </span>
                      <div className="space-y-1">
                        <div className="grid grid-cols-[4px_minmax(0,1fr)] items-center gap-3">
                          <span className="h-7 w-1 rounded-sm bg-[#00cec4]" aria-hidden="true" />
                          <h4 className="ds-h3 text-on-surface">Customs Filing Complete</h4>
                        </div>
                        <Badge variant="success">Filed</Badge>
                      </div>
                    </div>
                    <p className="max-w-xl text-sm text-[#00cec4] font-medium font-sans">
                      All checklist preparation checks have been validated and the customs declaration has been filed.
                    </p>
                  </div>
                </MilestoneCard>
              ) : null}
            </div>
          ) : (
            <div
              className={cn(
                "min-h-[320px] rounded-xl",
                activeTab === "overview" ? "bg-transparent p-0 shadow-none" : "bg-surface p-6 shadow-sm",
              )}
            >

              {activeTab === "overview" && (
                <div id="workflow-stage-overview" className="scroll-mt-32 space-y-6">
                  <div className="grid items-stretch gap-4 xl:grid-cols-3">
                    <section className="ds-section-panel h-full p-5">
                      <div className="ds-section-panel-header flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="ds-icon-badge">
                            <Package size={16} />
                          </span>
                          <div className="space-y-0.5">
                            <h3 className="ds-h3 text-on-surface">Job Summary</h3>
                            <p className="text-xs text-on-surface-variant">Key shipment and clearance details for this job.</p>
                          </div>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => navigateToWorkspaceTab("additionalData")}>
                          View Details
                        </Button>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {overviewSummaryItems.map((item) => (
                          <div key={item.label} className="px-3 py-3">
                            <div className="flex items-start gap-3">
                              <span className="ds-icon-badge !size-8">
                                {item.icon}
                              </span>
                              <div className="min-w-0">
                                <p className="ds-label">{item.label}</p>
                                <p className={cn("mt-1 text-sm text-on-surface", item.numeric && "ds-numeric")}>{item.value}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="ds-section-panel h-full p-5">
                      <div className="ds-section-panel-header flex items-center gap-3">
                        <span className="ds-icon-badge">
                          <CalendarDays size={16} />
                        </span>
                        <div className="space-y-0.5">
                          <h3 className="ds-h3 text-on-surface">Important Dates</h3>
                          <p className="text-xs text-on-surface-variant">Validity and deadline signals for this shipment.</p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        {overviewDateItems.map((item) => (
                          <div key={item.label} className="ds-inset-row flex items-center justify-between gap-3 px-3 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="ds-icon-badge !size-8">
                                {item.icon}
                              </span>
                              <div className="min-w-0">
                                <p className="ds-label">{item.label}</p>
                                <p className="ds-numeric mt-1 text-sm text-on-surface">{item.value}</p>
                              </div>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                                item.badge.tone === "destructive"
                                  ? "bg-red-500/10 text-red-500"
                                  : item.badge.tone === "warning"
                                    ? "bg-[#fb923c]/12 text-[#fb923c]"
                                    : item.badge.tone === "success"
                                      ? "bg-green-500/10 text-green-600"
                                      : "bg-surface-container text-on-surface-variant",
                              )}
                            >
                              {item.badge.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="ds-section-panel h-full p-5">
                      <div className="ds-section-panel-header flex items-center gap-3">
                        <span className="ds-icon-badge">
                          <Zap size={16} />
                        </span>
                        <div className="space-y-0.5">
                          <h3 className="ds-h3 text-on-surface">Quick Actions</h3>
                          <p className="text-xs text-on-surface-variant">Common job actions and workspace shortcuts.</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3">
                        {workspaceQuickActions.map((action) => (
                          <div
                            key={action.label}
                            className="ds-action-row flex min-h-[76px] items-center justify-between gap-3 px-3 py-2 text-left"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="ds-icon-badge">
                                {action.icon}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm text-on-surface">{action.label}</p>
                                <p className="mt-1 text-xs text-on-surface-variant">{action.note}</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-auto w-fit shrink-0 !border-transparent !bg-transparent px-0 py-0 text-xs uppercase tracking-[0.14em] !text-[#00cec4] !shadow-none hover:!border-transparent hover:!bg-transparent hover:!text-[#00b8af] hover:!shadow-none"
                              onClick={action.onClick}
                            >
                              Open
                              <ArrowRight size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <section className="ds-section-panel p-5">
                    <div className="ds-section-panel-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="ds-icon-badge">
                          <History size={16} />
                        </span>
                        <h3 className="ds-h3 text-on-surface">Recent Activity</h3>
                      </div>
                      <Button type="button" variant="outline" onClick={() => navigateToWorkspaceTab("audit")}>
                        View All Activity
                      </Button>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-[20px]">
                      {overviewRecentLogs.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-on-surface-variant">
                          No recent job activity has been recorded yet.
                        </div>
                      ) : (
                        <div>
                          {overviewRecentLogs.map((log: any) => (
                            <div key={log.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)_130px_100px_160px] md:items-center">
                              <div className="flex items-center gap-3">
                                <span className={cn(
                                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                                  String(log.event || "").includes("QUERY") || String(log.event || "").includes("query")
                                    ? "bg-[#fb923c]/12 text-[#fb923c]"
                                    : "bg-[#00cec4]/10 text-[#00cec4]",
                                )}>
                                  {String(log.event || "").includes("QUERY") || String(log.event || "").includes("query") ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                                </span>
                                <p className="ds-label text-on-surface">{String(log.event || "Activity").replace(/_/g, " ")}</p>
                              </div>
                              <p className="text-sm text-on-surface-variant">{log.remarks || "Operational update recorded for this job."}</p>
                              <p className="ds-numeric text-sm text-on-surface-variant">
                                {log.timestamp ? new Date(log.timestamp).toLocaleDateString("en-IN") : "Not available"}
                              </p>
                              <p className="ds-numeric text-sm text-on-surface-variant">
                                {log.timestamp ? new Date(log.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                              </p>
                              <div className="flex items-center justify-between gap-2 md:justify-end">
                                <span className="inline-flex rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-medium text-on-surface-variant">
                                  {log.actor?.name || "System"}
                                </span>
                                <span className="size-2 rounded-full bg-green-500" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              )}

              {/* PANEL: ADVANCES */}
              {activeTab === "advances" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="grid grid-cols-[4px_minmax(0,1fr)] items-center gap-3">
                      <span className="h-7 w-1 rounded-sm bg-[#00cec4]" aria-hidden="true" />
                      <h3 className="ds-h3 text-on-surface">Client Advance Collections</h3>
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${job.customerAdvance.status === "FULLY_RECEIVED" ? "text-green-600" : "text-[#fb923c]"
                      }`}>
                      Collection: {job.customerAdvance.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {/* Expected settings */}
                    <div className="space-y-4">
                      <div className="border border-outline-variant p-4 rounded-2xl space-y-4">
                        <span className="ds-label block text-on-surface">Billing expected terms</span>

                        <div className="space-y-1">
                          <label className="ds-label block">Expected Advance Amount (Rs.) *</label>
                          <input
                            type="number"
                            value={expectedAdvance}
                            onChange={(e) => setExpectedAdvance(parseFloat(e.target.value) || 0)}
                            className="w-full text-xs font-mono ds-numeric"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="ds-label block">Advance Due Date</label>
                          <DateInput
                            value={advanceDueDate}
                            onChange={(e) => setAdvanceDueDate(e.target.value)}
                            className="w-full text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="ds-label block">Assigned Collections Agent</label>
                          <NativeSelect
                            value={advanceAssigneeId}
                            onChange={(e) => setAdvanceAssigneeId(e.target.value)}
                            className="w-full text-xs"
                          >
                            <option value="">No Agent Assigned</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </NativeSelect>
                        </div>

                        <div className="flex gap-2">
                          <Button onClick={handleUpdateAdvanceExpected} disabled={loading !== null} className="flex-1 text-xs h-9">
                            Save Terms
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowWaiveAdvance(!showWaiveAdvance)}
                            className="flex-1 text-xs h-9 text-red-500 border-red-200"
                          >
                            Waive Collection
                          </Button>
                        </div>
                      </div>

                      {/* Waive advance drawer */}
                      {showWaiveAdvance && (
                        <div className="border border-red-200 bg-red-50/5 p-4 rounded-2xl space-y-3">
                          <span className="ds-label text-red-500 block">Exempt / Waive Advance Requirement</span>
                          <input
                            type="text"
                            placeholder="Explain why client advance is not required..."
                            value={waiveAdvanceReason}
                            onChange={(e) => setWaiveAdvanceReason(e.target.value)}
                            className="text-xs w-full"
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowWaiveAdvance(false)}>
                              Cancel
                            </Button>
                            <Button variant="destructive" size="sm" onClick={handleWaiveAdvance} disabled={loading !== null}>
                              Confirm Waiver
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Receipts details */}
                    <div className="space-y-4">
                      {/* Form to add receipts */}
                      {job.customerAdvance.status !== "NOT_REQUIRED" && job.customerAdvance.status !== "FULLY_RECEIVED" && (
                        <form onSubmit={handleRecordAdvanceReceipt} className="border border-outline-variant p-4 rounded-2xl space-y-4">
                          <span className="ds-label block text-on-surface">Record Received Receipt</span>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="ds-label block">Amount Paid (Rs.) *</label>
                              <input
                                type="number"
                                required
                                value={receiptAmount}
                                onChange={(e) => setReceiptAmount(e.target.value)}
                                className="w-full text-xs font-mono ds-numeric"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="ds-label block">Date Received *</label>
                              <DateInput
                                required
                                value={receiptDate}
                                onChange={(e) => setReceiptDate(e.target.value)}
                                className="w-full text-xs"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="ds-label block">Payment Method *</label>
                              <NativeSelect
                                value={receiptMethod}
                                onChange={(e) => setReceiptMethod(e.target.value)}
                                className="w-full text-xs"
                              >
                                <option value="NEFT">NEFT / RTGS</option>
                                <option value="BANK_TRANSFER">Bank IMPS</option>
                                <option value="UPI">UPI</option>
                                <option value="CASH">Cash</option>
                                <option value="CHEQUE">Cheque</option>
                              </NativeSelect>
                            </div>
                            <div className="space-y-1">
                              <label className="ds-label block">Txn Reference Ref</label>
                              <input
                                type="text"
                                placeholder="e.g. IMPS992812"
                                value={receiptRef}
                                onChange={(e) => setReceiptRef(e.target.value)}
                                className="w-full text-xs"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="ds-label block">Remarks</label>
                            <input
                              type="text"
                              placeholder="e.g. Paid online"
                              value={receiptRemarks}
                              onChange={(e) => setReceiptRemarks(e.target.value)}
                              className="w-full text-xs"
                            />
                          </div>

                          <Button type="submit" disabled={loading !== null} className="w-full">
                            Post Receipt Details
                          </Button>
                        </form>
                      )}

                      {/* Receipts list */}
                      <div className="space-y-3">
                        <span className="ds-label block text-on-surface">Payment Receipts Catalog</span>
                        {job.customerAdvance.receipts?.length === 0 ? (
                          <p className="text-xs text-on-surface-variant italic">No receipts recorded for this job advance.</p>
                        ) : (
                          <div className="space-y-2">
                            {job.customerAdvance.receipts.map((r: any) => (
                              <div key={r.id} className="p-3 bg-surface-container-low border border-outline-variant/40 rounded-2xl flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-bold text-[#00cec4] block">Rs. {Number(r.amount).toLocaleString("en-IN")}</span>
                                  <span className="text-[10px] text-on-surface-variant block uppercase mt-0.5">
                                    {r.paymentMethod} - Ref: {r.referenceNumber || "-"}
                                  </span>
                                </div>
                                <span className="text-[10px] text-on-surface-variant font-mono">
                                  {new Date(r.receivedDate).toDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PANEL: EXPENSES */}
              {activeTab === "expenses" && (
                <div className="space-y-4">
                  {/* Create expense request */}
                  <div className="space-y-4 rounded-xl border border-outline-variant bg-surface p-4">
                    <div className="grid grid-cols-[4px_minmax(0,1fr)] items-center gap-3">
                      <span className="h-7 w-1 rounded-sm bg-[#00cec4]" aria-hidden="true" />
                      <h3 className="ds-h3 text-on-surface">New Clearance Expense Request</h3>
                    </div>

                    <form onSubmit={handleCreateExpenseRequest} className="space-y-4">
                      {/* Urgent switch */}
                      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between p-4 border border-outline-variant/60 rounded-2xl bg-surface">
                        <div className="flex items-start space-x-3">
                          <NeonCheckbox
                            checked={expenseUrgent}
                            onChange={(e) => setExpenseUrgent(e.target.checked)}
                            className="mt-1"
                            label={
                              <div>
                                <span className="text-sm font-semibold text-on-surface block">Escalate to URGENT Payment</span>
                                <span className="text-xs text-on-surface-variant">
                                  Request accounts to disburse payment immediately to resolve critical port blocks.
                                </span>
                              </div>
                            }
                          />
                        </div>

                        {expenseUrgent && (
                          <div className="flex-1 max-w-md space-y-1">
                            <label className="ds-label block text-[#fb923c]">
                              Urgency Explanation Justification (REQUIRED) *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Demurrage free days end tomorrow"
                              value={expenseUrgencyReason}
                              onChange={(e) => setExpenseUrgencyReason(e.target.value)}
                              className="w-full text-xs font-sans border-[#fb923c]/50"
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="ds-label">UPI Number</label>
                          <input
                            type="text"
                            placeholder="Payee mobile number"
                            value={expenseUpiNumber}
                            onChange={(e) => setExpenseUpiNumber(e.target.value)}
                            className="h-9 w-full text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="ds-label">UPI ID</label>
                          <input
                            type="text"
                            placeholder="name@bank"
                            value={expenseUpiId}
                            onChange={(e) => setExpenseUpiId(e.target.value)}
                            className="h-9 w-full text-xs"
                          />
                        </div>
                      </div>

                      {/* Multi-lines lists */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                          <span className="ds-label">Expense Line Items</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddExpenseLine}
                            className="flex items-center gap-1 border-[#00cec4] text-[#00cec4]"
                          >
                            <Plus size={12} /> Add Line Item
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {expenseLines.map((line, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end border-b border-outline-variant/20 pb-3 md:pb-0 md:border-b-0">
                              {/* category */}
                              <div className="space-y-1 md:col-span-1">
                                <label className="ds-label">Category</label>
                                <NativeSelect
                                  value={line.category}
                                  onChange={(e) => handleExpenseLineChange(index, "category", e.target.value)}
                                  className="w-full text-xs h-9"
                                >
                                  {expenseCategories.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </NativeSelect>
                              </div>

                              {/* Purpose */}
                              <div className="space-y-1 md:col-span-2">
                                <label className="ds-label">Purpose / Purpose *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Reason for payment"
                                  value={line.purpose}
                                  onChange={(e) => handleExpenseLineChange(index, "purpose", e.target.value)}
                                  className="w-full text-xs h-9"
                                />
                              </div>

                              {/* Amount */}
                              <div className="space-y-1 md:col-span-1">
                                <label className="ds-label">Amount (Rs.) *</label>
                                <input
                                  type="number"
                                  required
                                  placeholder="Amount"
                                  value={line.amount}
                                  onChange={(e) => handleExpenseLineChange(index, "amount", e.target.value)}
                                  className="w-full text-xs font-mono ds-numeric h-9"
                                />
                              </div>

                              {/* Required Date */}
                              <div className="space-y-1 md:col-span-1">
                                <label className="ds-label">Required Date</label>
                                <DateInput
                                  value={line.requiredDate}
                                  onChange={(e) => handleExpenseLineChange(index, "requiredDate", e.target.value)}
                                  className="w-full text-xs h-9"
                                />
                              </div>

                              <div className={expenseLines.length > 1 ? "md:col-span-5" : "md:col-span-6"}>
                                <FileUploadField
                                  id={`job-expense-inline-line-receipts-${index}`}
                                  label="Line Receipt Attachments"
                                  accept="image/*,application/pdf"
                                  multiple
                                  compact
                                  triggerText="Drag and drop receipts, or choose files"
                                  helperText="Optional. Add one or more receipts for this expense line."
                                  selectedFiles={line.receiptFiles.map((file) => ({
                                    file,
                                    name: file.name,
                                    sizeBytes: file.size,
                                  }))}
                                  onInputChange={(event) =>
                                    setExpenseLines((current) =>
                                      current.map((entry, lineIndex) =>
                                        lineIndex === index
                                          ? { ...entry, receiptFiles: Array.from(event.currentTarget.files || []) }
                                          : entry,
                                      ),
                                    )
                                  }
                                  onClear={() =>
                                    setExpenseLines((current) =>
                                      current.map((entry, lineIndex) =>
                                        lineIndex === index ? { ...entry, receiptFiles: [] } : entry,
                                      ),
                                    )
                                  }
                                  onRemoveSelectedFile={(_, fileIndex) =>
                                    setExpenseLines((current) =>
                                      current.map((entry, lineIndex) =>
                                        lineIndex === index
                                          ? {
                                              ...entry,
                                              receiptFiles: entry.receiptFiles.filter((__, receiptIndex) => receiptIndex !== fileIndex),
                                            }
                                          : entry,
                                      ),
                                    )
                                  }
                                />
                              </div>

                              {expenseLines.length > 1 ? (
                                <div className="flex items-center justify-end col-span-1">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveExpenseLine(index)}
                                    className="text-red-500 hover:text-red-700 p-1.5"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={loading !== null}>
                          Dispatch Expense Request
                        </Button>
                      </div>
                    </form>
                  </div>

                  {/* List of requested expenses */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-[4px_minmax(0,1fr)] items-center gap-3 border-b border-outline-variant/30 pb-2">
                      <span className="h-7 w-1 rounded-sm bg-[#00cec4]" aria-hidden="true" />
                      <h3 className="ds-h3 text-on-surface">Expenses Queue</h3>
                    </div>

                    {job.expenseRequests?.length === 0 ? (
                      <p className="text-xs text-on-surface-variant italic">No expenses requested for this job clearance.</p>
                    ) : (
                      <div className="space-y-4">
                        {job.expenseRequests.map((req: any) => {
                          const isPaid = req.status === "PAID";
                          const isAck = req.status === "RECEIPT_ACKNOWLEDGED";
                          const isQuery = req.status === "QUERY_RAISED";
                          const sum = req.lines.reduce((tot: number, l: any) => tot + Number(l.amount), 0);
                          const canReviewThisExpense = canReviewExpenseRequests && req.status === "UNDER_REVIEW";
                          const canClarifyThisExpense = req.requestedById === currentUserId && req.status === "CLARIFICATION_REQUIRED";
                          const canMarkReadyThisExpense = canProcessExpensePayments && req.status === "APPROVED";
                          const canPayThisExpense = canProcessExpensePayments && ["APPROVED", "READY_FOR_DISBURSEMENT"].includes(req.status);
                          const isExpanded = expandedJobExpenseId === req.id;

                          return (
                            <div
                              key={req.id}
                              className={`overflow-hidden rounded-xl border bg-surface transition-all ${req.isUrgent
                                  ? "border-red-200 bg-red-50/5"
                                  : "border-outline-variant"
                                }`}
                            >
                              {/* Title Bar */}
                              <div className="grid gap-3 bg-surface px-4 py-3 md:grid-cols-[minmax(0,1.3fr)_110px_110px_auto] md:items-center">
                                <button
                                  type="button"
                                  onClick={() => setExpandedJobExpenseId(isExpanded ? null : req.id)}
                                  className="ds-plain flex min-w-0 items-start gap-3 text-left"
                                >
                                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-outline-variant/45 bg-surface text-on-surface-variant">
                                    <ChevronDown size={15} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate text-xs text-on-surface-variant">
                                      Ref: {req.id}
                                    </span>
                                    <span className="mt-0.5 block truncate text-sm font-medium text-on-surface">
                                      {req.lines[0]?.category || "Expense"} • {req.lines.length} line{req.lines.length === 1 ? "" : "s"}
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-on-surface-variant">
                                      Requested by {req.requestedBy?.name || "Team Member"}
                                    </span>
                                    {req.isUrgent && (
                                      <span className="mt-1 inline-flex rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] uppercase text-red-500">
                                        URGENT
                                      </span>
                                    )}
                                  </span>
                                </button>

                                <div className="flex items-center justify-between gap-2 md:block">
                                  <span className="ds-label md:hidden">Amount</span>
                                  <span className="text-sm text-[#00cec4] ds-numeric">Rs. {sum.toLocaleString("en-IN")}</span>
                                </div>

                                <div className="flex items-center justify-between gap-2 md:block md:text-center">
                                  <span className="ds-label md:hidden">Status</span>
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isAck
                                      ? "bg-green-100 text-green-700"
                                      : isPaid
                                        ? "bg-[#00cec4]/10 text-[#00a9b2]"
                                        : isQuery
                                          ? "bg-orange-100 text-orange-700"
                                          : "bg-surface-container-high text-on-surface-variant border border-outline-variant"
                                    }`}>
                                    Status: {req.status.replace(/_/g, " ")}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  {/* Escalation button */}
                                  {req.status === "UNDER_REVIEW" && !req.isUrgent && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEscRequestId(req.id);
                                        setEscUrgencyReason("");
                                      }}
                                    >
                                      Escalate
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {isExpanded ? (
                              <div className="space-y-4 border-t border-outline-variant/25 p-4">
                              {/* Lines lists */}
                              <div className="space-y-1.5 pl-2 border-l border-outline-variant/40">
                                {req.lines.map((l: any) => (
                                  <div key={l.id} className="flex flex-col gap-1 text-xs md:flex-row md:items-center md:justify-between">
                                    <div>
                                      <span className="text-on-surface">
                                        <strong className="text-on-surface-variant uppercase">{l.category}</strong>: {l.purpose}
                                      </span>
                                      {getReceiptLinks(l.supportingDocumentKey).length ? (
                                        <span className="ml-0 inline-flex flex-wrap gap-2 md:ml-2">
                                          {getReceiptLinks(l.supportingDocumentKey).map((receiptLink, receiptIndex) => (
                                            <a
                                              key={`${receiptLink}-${receiptIndex}`}
                                              href={receiptLink}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="font-medium text-[#00cec4] hover:underline"
                                            >
                                              Receipt {receiptIndex + 1}
                                            </a>
                                          ))}
                                        </span>
                                      ) : null}
                                    </div>
                                    <span className="font-mono ds-numeric text-on-surface-variant">Rs. {Number(l.amount).toLocaleString("en-IN")}</span>
                                  </div>
                                ))}
                              </div>

                              {req.upiNumber || req.upiId ? (
                                <div className="grid gap-2 rounded-lg border border-outline-variant/35 bg-surface p-3 md:grid-cols-2">
                                  {req.upiNumber ? (
                                    <div>
                                      <p className="ds-label">UPI Number</p>
                                      <p className="mt-1 text-xs text-on-surface ds-numeric">{req.upiNumber}</p>
                                    </div>
                                  ) : null}
                                  {req.upiId ? (
                                    <div>
                                      <p className="ds-label">UPI ID</p>
                                      <p className="mt-1 text-xs text-on-surface">{req.upiId}</p>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}

                              {/* Rework / Escalation Alerts */}
                              {req.isUrgent && req.urgencyReason && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs leading-relaxed text-red-700">
                                  <strong>Urgent escalation reason:</strong> "{req.urgencyReason}"
                                </div>
                              )}

                              {/* Query loop visibility */}
                              {req.queries?.map((q: any) => (
                                <div key={q.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs space-y-2">
                                  <div>
                                    <strong className="text-[#fb923c]">DISBURSEMENT QUERY:</strong>
                                    <p className="text-on-surface italic mt-0.5">"{q.queryText}"</p>
                                    <span className="text-[10px] text-on-surface-variant block mt-0.5">Raised by: {q.author?.name}</span>
                                  </div>

                                  {q.resolved ? (
                                    <div className="border-t border-orange-200/50 pt-2 text-[11px] text-green-700">
                                      <strong>Resolution:</strong> "{q.resolutionText}" (Resolved by {q.resolvedBy?.name})
                                    </div>
                                  ) : (
                                    resolveQueryId === q.id ? (
                                      <div className="space-y-2 border-t border-orange-200/50 pt-2">
                                        <input
                                          type="text"
                                          placeholder="Enter query resolution details..."
                                          value={resolutionText}
                                          onChange={(e) => setResolutionText(e.target.value)}
                                          className="w-full text-xs font-sans"
                                        />
                                        <div className="flex justify-end gap-1">
                                          <Button size="sm" variant="outline" onClick={() => setResolveQueryId(null)}>
                                            Cancel
                                          </Button>
                                          <Button size="sm" onClick={handleResolveQuery} disabled={loading !== null}>
                                            Post Resolution
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setResolveQueryId(q.id);
                                          setResolutionText("");
                                        }}
                                        className="text-xs font-semibold text-[#fb923c] hover:underline"
                                      >
                                        Resolve Query
                                      </button>
                                    )
                                  )}
                                </div>
                              ))}

                              {/* Payments Posted */}
                              {req.payments?.map((p: any) => (
                                <div key={p.id} className="p-3 bg-green-50/5 border border-green-200 rounded-lg text-xs flex flex-col md:flex-row md:items-center justify-between gap-2">
                                  <div>
                                    <span className="font-semibold text-green-700 block">Payment Disbursed via {p.paymentMethod}</span>
                                    <span className="text-[10px] text-on-surface-variant">
                                      Txn Ref: {p.transactionReference} - Paid by {p.paidBy?.name}
                                    </span>
                                    {getPaymentProofLinks(p.paymentProofKey).length ? (
                                      <div className="mt-1 flex flex-wrap gap-2">
                                        {getPaymentProofLinks(p.paymentProofKey).map((proofLink, index) => (
                                          <a
                                            key={`${proofLink}-${index}`}
                                            href={proofLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex font-medium text-[#00cec4] hover:underline"
                                          >
                                            View payment proof {index + 1}
                                          </a>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                  <span className="text-[10px] text-on-surface-variant font-mono font-bold">
                                    {new Date(p.paymentDate).toDateString()}
                                  </span>
                                </div>
                              ))}

                              {/* Escalation dialog popup */}
                              {escRequestId === req.id && (
                                <div className="p-4 border border-[#fb923c]/40 bg-[#fb923c]/5 rounded-2xl space-y-3">
                                  <span className="ds-label text-[#fb923c] font-bold block">Escalate Request to Urgent</span>
                                  <input
                                    type="text"
                                    placeholder="Reason for immediate payment request..."
                                    value={escUrgencyReason}
                                    onChange={(e) => setEscUrgencyReason(e.target.value)}
                                    className="text-xs w-full"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setEscRequestId(null)}>
                                      Cancel
                                    </Button>
                                    <Button size="sm" onClick={handleEscalateExpense} disabled={loading !== null}>
                                      Escalate Request
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Review Action Drawer Popup */}
                              {expReviewId === req.id && (
                                <div className="p-4 border border-outline-variant/60 bg-surface rounded-2xl space-y-3">
                                  <span className="ds-label block text-on-surface">Administrative Expense Review</span>
                                  <input
                                    type="text"
                                    placeholder={expReviewStatus === "REJECTED" ? "Rejection reason..." : "Clarification required..."}
                                    value={expReviewRemarks}
                                    onChange={(e) => setExpReviewRemarks(e.target.value)}
                                    className="text-xs w-full"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setExpReviewId(null)}>
                                      Cancel
                                    </Button>
                                    <Button size="sm" variant={expReviewStatus === "REJECTED" ? "destructive" : "default"} onClick={() => handleExpenseReview(req.id, expReviewStatus as "CLARIFICATION_REQUIRED" | "APPROVED" | "REJECTED", expReviewRemarks)} disabled={loading !== null}>
                                      Post Decision
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {expenseClarificationId === req.id && (
                                <div className="p-4 border border-outline-variant/60 bg-surface rounded-2xl space-y-3">
                                  <span className="ds-label block text-on-surface">Clarification Response</span>
                                  <input
                                    type="text"
                                    placeholder="Enter clarification response..."
                                    value={expenseClarificationText}
                                    onChange={(e) => setExpenseClarificationText(e.target.value)}
                                    className="text-xs w-full"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setExpenseClarificationId(null)}>
                                      Cancel
                                    </Button>
                                    <Button size="sm" onClick={handleExpenseClarification} disabled={loading !== null}>
                                      Submit Clarification
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Post Payout Form Popup */}
                              {payRequestId === req.id && (
                                <form onSubmit={handlePostExpensePayment} className="p-4 border border-[#00cec4]/40 bg-[#00cec4]/5 rounded-2xl space-y-4">
                                  <span className="ds-label text-[#00cec4] block">Post Payment Disbursement Confirmation</span>
                                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                    <div>
                                      <label className="ds-label block">Amount Disbursed (Rs.) *</label>
                                      <input
                                        type="number"
                                        required
                                        value={payAmount}
                                        onChange={(e) => setPayAmount(e.target.value)}
                                        className="w-full text-xs font-mono ds-numeric h-8"
                                      />
                                    </div>
                                    <div>
                                      <label className="ds-label block">Date Paid *</label>
                                      <DateInput
                                        required
                                        value={payDate}
                                        onChange={(e) => setPayDate(e.target.value)}
                                        className="w-full text-xs h-8"
                                      />
                                    </div>
                                    <div>
                                      <label className="ds-label block">Payment Method *</label>
                                      <NativeSelect
                                        value={payMethod}
                                        onChange={(e) => setPayMethod(e.target.value)}
                                        className="w-full text-xs h-8"
                                      >
                                        <option value="BANK_TRANSFER">Bank Transfer IMPS</option>
                                        <option value="NEFT">NEFT / RTGS</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CASH">Cash Drawer</option>
                                      </NativeSelect>
                                    </div>
                                    <div>
                                      <label className="ds-label block">Txn Reference ID *</label>
                                      <input
                                        type="text"
                                        required
                                        placeholder="Txn reference code"
                                        value={payRef}
                                        onChange={(e) => setPayRef(e.target.value)}
                                        className="w-full text-xs h-8"
                                      />
                                    </div>
                                    <div>
                                      <FileUploadField
                                        id={`workspace-payment-proof-${req.id}`}
                                        label="Payment Proof *"
                                        accept="image/*,application/pdf"
                                        multiple
                                        compact
                                        triggerText="Drag and drop payment proofs, or choose files"
                                        helperText="Images and PDFs accepted. Multiple files can be selected together."
                                        selectedFiles={payProofFiles.map((file) => ({
                                          file,
                                          name: file.name,
                                          sizeBytes: file.size,
                                        }))}
                                        uploading={loading === `pay-${req.id}`}
                                        onInputChange={(event) => setPayProofFiles(Array.from(event.currentTarget.files || []))}
                                        onClear={() => setPayProofFiles([])}
                                        onRemoveSelectedFile={(_, index) =>
                                          setPayProofFiles((current) => current.filter((__, fileIndex) => fileIndex !== index))
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setPayRequestId(null)}>
                                      Cancel
                                    </Button>
                                    <Button type="submit" size="sm" disabled={loading !== null}>
                                      Confirm Disbursement
                                    </Button>
                                  </div>
                                </form>
                              )}

                              {/* Query Form Popup */}
                              {queryRequestId === req.id && (
                                <div className="p-4 border border-[#fb923c]/40 bg-[#fb923c]/5 rounded-2xl space-y-3">
                                  <span className="ds-label text-[#fb923c] font-bold block">Raise Payment Discrepancy Query</span>
                                  <input
                                    type="text"
                                    placeholder="What discrepancy is there in the posted payment details?..."
                                    value={queryText}
                                    onChange={(e) => setQueryText(e.target.value)}
                                    className="text-xs w-full"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setQueryRequestId(null)}>
                                      Cancel
                                    </Button>
                                    <Button size="sm" onClick={handleRaiseQuery} disabled={loading !== null}>
                                      Submit Query
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Action buttons footer */}
                              <div className="flex justify-end gap-2 border-t border-outline-variant/10 pt-3 text-xs">
                                {canReviewThisExpense ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        setExpReviewId(req.id);
                                        setExpReviewStatus("CLARIFICATION_REQUIRED");
                                        setExpReviewRemarks("");
                                      }}
                                      className="ds-plain cha-link hover:underline font-semibold"
                                    >
                                      Require Clarification
                                    </button>
                                    <button
                                      onClick={() => {
                                        setExpReviewId(req.id);
                                        setExpReviewStatus("REJECTED");
                                        setExpReviewRemarks("");
                                      }}
                                      className="ds-plain text-red-600 hover:underline font-semibold"
                                    >
                                      Reject
                                    </button>
                                    <button
                                      onClick={() => handleExpenseReview(req.id, "APPROVED", "")}
                                      disabled={loading !== null}
                                      className="ds-plain cha-link hover:underline font-bold"
                                    >
                                      Approve
                                    </button>
                                  </>
                                ) : null}

                                {canClarifyThisExpense ? (
                                  <button
                                    onClick={() => {
                                      setExpenseClarificationId(req.id);
                                      setExpenseClarificationText(req.clarificationResponse || "");
                                    }}
                                    className="ds-plain cha-link hover:underline font-semibold"
                                  >
                                    Submit Clarification
                                  </button>
                                ) : null}

                                {canMarkReadyThisExpense ? (
                                  <button
                                    onClick={() => handleReadyForExpenseDisbursement(req.id)}
                                    disabled={loading !== null}
                                    className="ds-plain cha-link hover:underline font-semibold"
                                  >
                                    Ready for Disbursement
                                  </button>
                                ) : null}

                                {canPayThisExpense ? (
                                  <button
                                    onClick={() => {
                                      setPayRequestId(req.id);
                                      setPayAmount(String(sum));
                                      setPayDate(new Date().toISOString().slice(0, 10));
                                      setPayRef("");
                                      setPayProofFiles([]);
                                    }}
                                    className="ds-plain cha-link hover:underline font-bold"
                                  >
                                    Register Payout
                                  </button>
                                ) : null}

                                {/* Requester Ack / Query */}
                                {isPaid && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setQueryRequestId(req.id);
                                        setQueryText("");
                                      }}
                                      className="text-[#fb923c] hover:underline font-semibold"
                                    >
                                      Raise Query
                                    </button>
                                    <button
                                      onClick={() => handleAcknowledgeExpense(req.id)}
                                      disabled={loading !== null}
                                      className="text-green-600 hover:underline font-bold"
                                    >
                                      Acknowledge Receipt
                                    </button>
                                  </>
                                )}
                              </div>
                              </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PANEL: AUDIT LOGS */}
              {activeTab === "audit" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-[4px_minmax(0,1fr)] items-center gap-3">
                    <span className="h-7 w-1 rounded-sm bg-[#00cec4]" aria-hidden="true" />
                    <h3 className="ds-h3 text-on-surface">Job Auditing History Trail</h3>
                  </div>

                  {job.auditLogs?.length === 0 ? (
                    <p className="text-xs text-on-surface-variant">No audit log records for this clearance.</p>
                  ) : (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/40">
                      {job.auditLogs.map((log: any) => (
                        <div key={log.id} className="relative space-y-1 text-xs">
                          {/* Dot */}
                          <span className="absolute -left-[20px] top-1.5 w-3.5 h-3.5 rounded-full bg-[#00cec4] border-2 border-surface shadow-[0_0_0_2px_rgba(0,206,196,0.1)]" />

                          <div className="flex items-center justify-between">
                            <span className="font-bold text-on-surface">{log.event.replace(/_/g, " ")}</span>
                            <span className="text-[10px] text-on-surface-variant font-mono">
                              {new Date(log.timestamp).toLocaleString("en-IN")}
                            </span>
                          </div>

                          <p className="text-on-surface-variant leading-relaxed">
                            {log.remarks}
                          </p>

                          <div className="flex gap-4 text-[10px] text-on-surface-variant pt-0.5">
                            <span>Actor: <strong>{log.actor?.name || "System"}</strong></span>
                            {log.newState && (
                              <span>New State: <strong>{log.newState}</strong></span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Modal
            open={executionTimelineModalOpen}
            onClose={() => setExecutionTimelineModalOpen(false)}
            title="Execution Blueprint Timeline"
            description="Review each filing workflow run, completion note, and attachment from the execution path."
            className="max-w-4xl"
          >
            <div className="space-y-4">
              {filingInstance?.nodeRuns?.length === 0 ? (
                <div className="rounded-xl border border-dashed border-outline-variant/70 px-4 py-5 text-sm text-on-surface-variant">
                  No workflow checks executed yet.
                </div>
              ) : (
                filingInstance?.nodeRuns?.map((run: any) => {
                  const isCurrent = run.status === "ACTIVE";
                  const runBadgeVariant =
                    run.status === "ACTIVE" ? "default" : run.completedAt ? "success" : "secondary";
                  return (
                    <div key={run.id} className="rounded-xl border border-outline-variant/60 bg-surface p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className={`text-sm font-medium ${isCurrent ? "text-[#00cec4]" : "text-on-surface"}`}>
                              {run.node?.name || run.nodeKey}
                            </h4>
                            <Badge variant={runBadgeVariant}>{run.status}</Badge>
                          </div>
                          {(run.node?.sectionName || run.node?.branchName) && (
                            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-on-surface-variant">
                              {[run.node?.sectionName, run.node?.branchName].filter(Boolean).join(" / ")}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] text-on-surface-variant">
                          Started {new Date(run.startedAt).toLocaleString("en-IN")}
                          {run.completedAt ? ` - Finished ${new Date(run.completedAt).toLocaleString("en-IN")}` : ""}
                        </span>
                      </div>

                      {run.completedBy ? (
                        <p className="mt-3 text-xs text-on-surface-variant">
                          Completed by: <strong className="text-on-surface">{run.completedBy.name}</strong>
                        </p>
                      ) : null}

                      {run.remarks ? (
                        <div className="mt-3 rounded-xl border border-outline-variant/50 bg-surface-container-low p-3 text-xs italic text-on-surface-variant">
                          "{run.remarks}"
                        </div>
                      ) : null}

                      {run.attachments?.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          <span className="ds-label block text-on-surface-variant">Attachments</span>
                          <div className="space-y-2">
                            {run.attachments.map((att: any) => (
                              <a
                                key={att.id}
                                href={att.fileKey}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2 text-xs font-medium text-[#00cec4] hover:underline"
                              >
                                <ExternalLink size={12} className="shrink-0" />
                                <span className="truncate">{att.fileName}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </Modal>

          <Modal
            open={deleteModalMode === "delete"}
            onClose={resetDeletionModalState}
            title="Delete CHA Job"
            titleClassName="font-[family:var(--font-kiona-sans)] tracking-[0.12em]"
            description={
              canDirectDeleteJob
                ? `This will immediately remove ${job.jobNumber} from the active CHA workspace. Related records stay in history, but this action is destructive and should be used carefully.`
                : `This will submit a manager approval request to delete ${job.jobNumber}. The job stays active until the assigned manager approves it.`
            }
            className="max-w-2xl"
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-red-200/70 bg-red-50/40 p-4 text-sm text-on-surface">
                <p className="ds-label text-red-600">Permanent action</p>
                <p className="mt-1 text-on-surface-variant">
                  Deleting this job affects linked CHA workflows, audit visibility, and operational references.
                </p>
                <p className="mt-3 text-on-surface-variant">
                  Type the exact job number{" "}
                  <span className="inline-flex rounded-md bg-surface-container px-2 py-0.5 text-on-surface ds-numeric">
                    {job.jobNumber}
                  </span>{" "}
                  and the confirmation phrase{" "}
                  <span className="inline-flex rounded-md bg-surface-container px-2 py-0.5 text-on-surface">
                    delete job
                  </span>{" "}
                  to continue.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="ds-label block">Type Exact Job Number</label>
                  <Input
                    type="text"
                    value={deleteConfirmJobNumber}
                    onChange={(e) => setDeleteConfirmJobNumber(e.target.value)}
                    placeholder={job.jobNumber}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="ds-label block">Type Confirmation Phrase</label>
                  <Input
                    type="text"
                    value={deleteConfirmPhrase}
                    onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                    placeholder="delete job"
                    className="text-sm"
                  />
                  <p className="text-xs text-on-surface-variant">
                    Enter exactly: <span className="text-on-surface">delete job</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={resetDeletionModalState}
                  disabled={loading !== null}
                  className="text-xs uppercase tracking-[0.12em]"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={!deleteInputsMatch || loading === "job-delete"}
                  onClick={handleSubmitJobDeletion}
                  className="text-xs uppercase tracking-[0.12em]"
                >
                  {loading === "job-delete"
                    ? "Processing..."
                    : canDirectDeleteJob
                      ? "Delete Job"
                      : "Request Deletion"}
                </Button>
              </div>
            </div>
          </Modal>

          <Modal
            open={deleteModalMode === "approve"}
            onClose={resetDeletionModalState}
            title="Approve Job Deletion"
            titleClassName="font-[family:var(--font-kiona-sans)] tracking-[0.12em]"
            description={`Approve the pending deletion request for ${job.jobNumber}. This will immediately soft-delete the job after approval.`}
            className="max-w-2xl"
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-red-200/70 bg-red-50/40 p-4 text-sm text-on-surface">
                <p className="ds-label text-red-600">Manager approval required</p>
                <p className="mt-1 text-on-surface-variant">
                  Confirm the exact job number and type <span className="text-on-surface">delete job</span> to execute this deletion request.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="ds-label block">Type Exact Job Number</label>
                  <Input
                    type="text"
                    value={deleteConfirmJobNumber}
                    onChange={(e) => setDeleteConfirmJobNumber(e.target.value)}
                    placeholder={job.jobNumber}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="ds-label block">Type Confirmation Phrase</label>
                  <Input
                    type="text"
                    value={deleteConfirmPhrase}
                    onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                    placeholder="delete job"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="ds-label block">Approval Note (Optional)</label>
                  <textarea
                    rows={3}
                    value={deleteDecisionRemarks}
                    onChange={(e) => setDeleteDecisionRemarks(e.target.value)}
                    placeholder="Add any execution note for the audit trail..."
                    className="w-full rounded-xl border border-[#00cec4]/55 bg-surface px-4 py-3 text-sm text-on-surface placeholder:text-[var(--color-placeholder)] hover:border-[#00cec4]/85 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={resetDeletionModalState}
                  disabled={loading !== null}
                  className="text-xs uppercase tracking-[0.12em]"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!deleteInputsMatch || loading === "job-delete-approve"}
                  onClick={handleApproveDeletionRequest}
                  className="text-xs uppercase tracking-[0.12em]"
                >
                  {loading === "job-delete-approve" ? "Deleting..." : "Approve & Delete"}
                </Button>
              </div>
            </div>
          </Modal>

          <Modal
            open={deleteModalMode === "reject"}
            onClose={resetDeletionModalState}
            title="Reject Job Deletion Request"
            titleClassName="font-[family:var(--font-kiona-sans)] tracking-[0.12em]"
            description={`Reject the pending deletion request for ${job.jobNumber}. A rejection reason is required and the job will remain active.`}
            className="max-w-2xl"
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="ds-label block">Rejection Reason</label>
                <textarea
                  rows={4}
                  value={deleteDecisionRemarks}
                  onChange={(e) => setDeleteDecisionRemarks(e.target.value)}
                  placeholder="Explain why this CHA job should not be deleted..."
                  className="w-full rounded-xl border border-[#00cec4]/55 bg-surface px-4 py-3 text-sm text-on-surface placeholder:text-[var(--color-placeholder)] hover:border-[#00cec4]/85 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={resetDeletionModalState}
                  disabled={loading !== null}
                  className="text-xs uppercase tracking-[0.12em]"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={!deleteDecisionRemarks.trim() || loading === "job-delete-reject"}
                  onClick={handleRejectDeletionRequest}
                  className="text-xs uppercase tracking-[0.12em]"
                >
                  {loading === "job-delete-reject" ? "Rejecting..." : "Reject Request"}
                </Button>
              </div>
            </div>
          </Modal>

          {deleteDocModal && (
            <Modal
              open={true}
              onClose={() => setDeleteDocModal(null)}
              title="Delete Document Version"
              description="Are you sure you want to permanently delete this document version?"
              className="max-w-md"
            >
              <div className="space-y-4">
                <p className="text-sm text-on-surface">
                  File: <strong className="text-on-surface-variant font-medium">{deleteDocModal.fileName}</strong>
                </p>
                <p className="text-xs text-red-500 font-medium">
                  This action is permanent and cannot be undone. If this is a mandatory document requirement, the workflow stage may revert to Document Collection.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDocModal(null)}
                    disabled={loading === "delete-doc"}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleConfirmDeleteDoc}
                    disabled={loading === "delete-doc"}
                  >
                    {loading === "delete-doc" ? "Deleting..." : "Confirm Delete"}
                  </Button>
                </div>
              </div>
            </Modal>
          )}

          {uploadDocumentModalRequirement && (
            <Modal
              open={true}
              onClose={() => setUploadDocumentModalReqId(null)}
              title={`Upload ${uploadDocumentModalRequirement.name}`}
              description="Drag and drop a file here or click to browse and upload it to this document requirement."
              className="max-w-xl"
            >
              <div className="space-y-4">
                <FileUploadField
                  id={`document-upload-modal-${uploadDocumentModalRequirement.id}`}
                  uploading={loading === `doc-${uploadDocumentModalRequirement.id}`}
                  uploadingLabel={`Uploading ${uploadDocumentModalRequirement.name}...`}
                  helperText="Choose the file for this document requirement. If a validity date is required, you will be prompted next."
                  triggerText="Drag and drop or choose file to upload"
                  onInputChange={(e) => {
                    handleUploadDoc(uploadDocumentModalRequirement.id, e);
                    setUploadDocumentModalReqId(null);
                  }}
                />

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUploadDocumentModalReqId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Modal>
          )}

          <Modal
            open={bulkNaConfirmOpen}
            onClose={() => {
              if (loading === "na-all") return;
              setBulkNaConfirmOpen(false);
            }}
            title="Mark Documents As N/A"
            description="Confirm this bulk document action before updating the visible pending requirements."
            className="max-w-lg"
            titleClassName="text-lg font-medium leading-none tracking-[0.075em]"
          >
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-xl border border-[#fb923c]/30 bg-[#fb923c]/8 px-4 py-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#fb923c]/30 bg-[#fb923c]/12 text-[#fb923c]">
                  <AlertTriangle size={18} />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-on-surface">
                    Mark {bulkNaEligibleRequirements.length} visible pending document requirement(s) as N/A?
                  </p>
                  <p className="text-xs leading-5 text-on-surface-variant">
                    This will record each selected requirement as not available and add an audit entry. Uploaded or already resolved documents will not be changed.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBulkNaConfirmOpen(false)}
                  disabled={loading === "na-all"}
                  className="rounded-xl px-5 text-xs font-medium uppercase tracking-[0.12em]"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmMarkAllNotAvailable}
                  disabled={loading === "na-all" || bulkNaEligibleRequirements.length === 0}
                  variant="outline"
                  className="rounded-xl !border-[#fb923c]/45 !bg-surface px-5 text-xs font-medium uppercase tracking-[0.12em] !text-[#fb923c] !shadow-none hover:!border-[#fb923c]/70 hover:!bg-surface hover:!text-[#f97316] hover:!shadow-[0_0_0_3px_rgba(251,146,60,0.18),0_10px_24px_-18px_rgba(251,146,60,0.75)] hover:!animate-none focus-visible:!ring-[#fb923c]/35"
                >
                  {loading === "na-all" ? "Marking..." : "Mark As N/A"}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Closing Two-Column Wrapper Divs */}
        </div>
      </div>

      {blockedPrerequisiteModalOpen && isActiveStageBlocked ? (
        <Modal
          open={true}
          onClose={() => setBlockedPrerequisiteModalOpen(false)}
          title="Prerequisite Required"
          description="Complete the required filing stage before continuing this stage."
          className="max-w-lg"
        >
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl border border-[#fb923c]/30 bg-surface px-4 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#fb923c]/30 bg-[#fb923c]/12 text-[#fb923c]">
                <AlertTriangle size={18} />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-on-surface">
                  {activeNodeRun?.node?.name || "This stage"} is waiting on {(activeNodePrerequisiteStatus?.missingNodeNames || []).join(", ") || "a prerequisite stage"}.
                </p>
                <p className="text-xs leading-5 text-on-surface-variant">
                  A skipped prerequisite does not count as completed. Go to the required stage, tick the required work, complete it, then return here to continue.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBlockedPrerequisiteModalOpen(false)}
                disabled={loading !== null}
              >
                Close
              </Button>
              {firstMissingPrerequisiteNodeKey ? (
                <Button
                  type="button"
                  disabled={loading !== null}
                  onClick={() => {
                    setBlockedPrerequisiteModalOpen(false);
                    void handleRedirectBlockedStage(firstMissingPrerequisiteNodeKey);
                  }}
                >
                  <ArrowRight size={14} />
                  Go To {firstMissingPrerequisiteNodeName}
                </Button>
              ) : null}
            </div>
          </div>
        </Modal>
      ) : null}

      {isCustomDocumentModalOpen && (
        <Modal
          open={true}
          onClose={() => {
            if (loading === "custom-doc-upload") return;
            setIsCustomDocumentModalOpen(false);
            setCustomDocumentName("");
            setCustomDocumentFile(null);
          }}
          title="Add Custom Document"
          description="Create a temporary document slot for this job only and upload the file immediately."
          className="max-w-xl"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4 text-xs text-on-surface-variant">
              This custom document name is job-specific and will appear only inside <strong className="text-on-surface">this CHA job</strong>, under the <strong className="text-on-surface">User Uploads</strong> section.
            </div>

            <div className="space-y-4">
              <label className="space-y-1.5">
                <span className="ds-label">Custom Document Name</span>
                <input
                  type="text"
                  value={customDocumentName}
                  onChange={(e) => setCustomDocumentName(e.target.value)}
                  placeholder="Example: Supplier Email Approval"
                  maxLength={120}
                  className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-3 py-2.5 text-sm text-on-surface"
                />
              </label>

              <FileUploadField
                id="custom-document-upload"
                label="File Upload"
                helperText="Upload the file now so this custom document appears immediately in the job workspace."
                triggerText="Drag and drop or choose file to upload"
                selectedFile={
                  customDocumentFile
                    ? {
                      file: customDocumentFile,
                      name: customDocumentFile.name,
                      sizeBytes: customDocumentFile.size,
                      statusLabel: "Ready",
                    }
                    : null
                }
                onClear={() => setCustomDocumentFile(null)}
                onInputChange={(e) => setCustomDocumentFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-outline-variant/20 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCustomDocumentModalOpen(false);
                  setCustomDocumentName("");
                  setCustomDocumentFile(null);
                }}
                disabled={loading === "custom-doc-upload"}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateCustomDocument}
                disabled={loading === "custom-doc-upload"}
              >
                {loading === "custom-doc-upload" ? "Uploading..." : "Create And Upload"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {viewingVersion && viewingVersion.type === "checklist" && (
        <Modal
          open={true}
          onClose={() => setViewingVersion(null)}
          title="Document Viewer"
          description={`Viewing file: ${viewingVersion.fileName}`}
          className="max-w-4xl w-full"
        >
          {(() => {
            const previewUrl = previewUrls[viewingVersion.id] || viewingVersion.fileKey || null;
            const targetUrl = previewUrl?.startsWith("blob:")
              ? previewUrl
              : (viewingVersion.type === "checklist"
                ? `/api/cha/checklist-files/${viewingVersion.id}`
                : `/api/cha/documents/${viewingVersion.id}`);

            const downloadUrl = previewUrl?.startsWith("blob:")
              ? previewUrl
              : (viewingVersion.type === "checklist"
                ? `/api/cha/checklist-files/${viewingVersion.id}?download=true`
                : `/api/cha/documents/${viewingVersion.id}?download=true`);

            const isImage = viewingVersion.mimeType.startsWith("image/");
            const isPdf = viewingVersion.mimeType === "application/pdf";
            const canPreview = isImage || isPdf;

            return (
              <div className="relative h-[60vh] flex flex-col bg-surface border border-outline-variant/30 rounded-2xl overflow-hidden">
                {canPreview ? (
                  <>
                    {loadingPreview && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-[1px] z-10 gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-t-[#00cec4] border-r-transparent border-b-[#00cec4] border-l-transparent animate-spin" />
                        <span className="text-xs text-on-surface-variant font-sans">Loading preview...</span>
                      </div>
                    )}
                    {isImage ? (
                      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                        <img
                          src={targetUrl}
                          alt={viewingVersion.fileName}
                          className="max-w-full max-h-full object-contain"
                          onLoad={() => setLoadingPreview(false)}
                          onError={() => setLoadingPreview(false)}
                        />
                      </div>
                    ) : (
                      <iframe
                        src={targetUrl}
                        className="w-full h-full border-0"
                        title={viewingVersion.fileName}
                        onLoad={() => setLoadingPreview(false)}
                      />
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#00cec4]/10 text-[#00cec4] flex items-center justify-center">
                      <FileText size={32} />
                    </div>
                    <div className="space-y-2 max-w-md">
                      <div className="grid grid-cols-[4px_minmax(0,1fr)] items-center gap-3">
                        <span className="h-7 w-1 rounded-sm bg-[#00cec4]" aria-hidden="true" />
                        <h4 className="ds-h3 text-on-surface">Preview Unavailable</h4>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed font-sans">
                        Word, Excel, or binary formats cannot be previewed directly in the browser. You can download this file to view it locally.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-outline-variant bg-surface-container-low text-left text-xs space-y-2 w-full max-w-md">
                      <p className="font-semibold text-on-surface uppercase ds-label">File Details</p>
                      <div className="grid grid-cols-2 gap-2 text-on-surface-variant">
                        <span>Filename:</span>
                        <span className="text-on-surface truncate font-sans">{viewingVersion.fileName}</span>
                        <span>Size:</span>
                        <span className="text-on-surface ds-numeric font-sans">{(viewingVersion.sizeBytes / 1024).toFixed(1)} KB</span>
                        <span>Uploaded By:</span>
                        <span className="text-on-surface font-sans">{viewingVersion.uploadedBy?.name || "System"}</span>
                        <span>Uploaded At:</span>
                        <span className="text-on-surface ds-numeric font-sans">
                          {viewingVersion.uploadedAt ? new Date(viewingVersion.uploadedAt).toLocaleString("en-IN") : "N/A"}
                        </span>
                      </div>
                    </div>
                    <a
                      href={downloadUrl}
                      download={previewUrl?.startsWith("blob:") ? viewingVersion.fileName : undefined}
                      className="inline-flex items-center justify-center bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-2xl text-xs uppercase tracking-wide transition-all font-medium"
                    >
                      Download File
                    </a>
                  </div>
                )}
              </div>
            );
          })()}
        </Modal>
      )}

      {isEditingManager && (
        <Modal
          open={true}
          onClose={() => setIsEditingManager(false)}
          title="Edit Job Manager Assignment"
          description="Update the assigned manager for this CHA job. The manager is responsible for internal approvals and deletion approvals."
          className="max-w-md"
        >
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="ds-label block">Select Manager</label>
              <NativeSelect
                value={selectedManagerId}
                onChange={(e) => setSelectedManagerId(e.target.value)}
                className="w-full text-sm rounded-2xl"
              >
                <option value="">-- Choose Manager --</option>
                {filteredManagers.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditingManager(false)}
                disabled={loading !== null}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpdateManager}
                disabled={loading !== null || !selectedManagerId}
              >
                {loading === "update-manager" ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {showSection49Modal && (
        <Modal
          open={showSection49Modal}
          onClose={() => {
            setShowSection49Modal(false);
            setSection49Remarks("");
          }}
          title={`${section49Flag?.isEnabled ? "Deactivate" : "Activate"} Section 49`}
          description={`Toggle Section 49 customs bond filing status for job ${job.jobNumber}.`}
          className="max-w-md"
        >
          <div className="space-y-4 pt-2">
            <p className="text-xs text-on-surface-variant font-sans">
              Are you sure you want to {section49Flag?.isEnabled ? "deactivate" : "activate"} Section 49 customs bond filing status? This change will be logged in the audit trail.
            </p>
            <div className="space-y-1.5">
              <span className="ds-label">Remarks / Explanation *</span>
              <textarea
                rows={3}
                value={section49Remarks}
                onChange={(e) => setSection49Remarks(e.target.value)}
                placeholder="Provide justification or remarks for this status change..."
                className="w-full resize-none rounded-xl border border-[rgba(0,206,196,0.55)] bg-surface px-[14px] py-[10px] text-sm text-on-surface placeholder:text-placeholder outline-none transition-colors hover:border-[rgba(0,206,196,0.4)] focus:border-[rgba(0,206,196,0.52)] focus:shadow-[0_0_0_3px_rgba(14,137,149,0.14)]"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSection49Modal(false);
                  setSection49Remarks("");
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={loading !== null || !section49Remarks.trim()}
                onClick={handleToggleSection49}
                className="bg-[#00cec4] text-white hover:bg-[#00b8af]"
              >
                {loading === "section49-toggle" ? "Updating..." : "Confirm Change"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}
