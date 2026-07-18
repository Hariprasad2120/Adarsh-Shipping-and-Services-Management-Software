export type PortalShipmentScope = "active" | "action" | "completed" | "all";

export interface PortalActionSummary {
  hasActionRequired: boolean;
  pendingDocumentCount: number;
  checklistPending: boolean;
  openQueryCount: number;
}

export interface PortalDocumentVersionSummary {
  id: string;
  fileName?: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedAt?: string | Date | null;
  source?: string | null;
  validityDate?: string | Date | null;
}

export interface PortalDocumentSubmissionSummary {
  id: string;
  status: string;
  customerComment?: string | null;
  reviewerComment?: string | null;
  versions: PortalDocumentVersionSummary[];
}

export interface PortalDocumentRequirementSummary {
  id: string;
  name: string;
  status: string;
  category?: string | null;
  isMandatory: boolean;
  exception?: {
    reason?: string | null;
    createdAt?: string | Date | null;
    user?: { name?: string | null } | null;
  } | null;
  requirementItem?: {
    description?: string | null;
    requiresValidityDate?: boolean | null;
    category?: { name?: string | null } | null;
  } | null;
  customerSubmissions: PortalDocumentSubmissionSummary[];
}

export interface PortalStageMapping {
  internalStageKey?: string;
  label: string;
  description?: string | null;
  sortOrder?: number | null;
}

export interface PortalCoordinator {
  name: string;
  email: string;
  phone?: string | null;
  designation?: string | null;
  officeHours?: string | null;
  escalationName?: string | null;
  escalationEmail?: string | null;
}

export interface PortalShipmentSummary {
  id: string;
  jobNumber: string;
  title: string | null;
  customerRef: string | null;
  currentStage: string;
  currentStageDescription: string | null;
  shipmentType: string;
  clearanceType: string;
  priority?: string | null;
  status: string;
  lastUpdatedAt: Date;
  contactName: string | null;
  progressPercent: number;
  actions: PortalActionSummary;
  scope: Exclude<PortalShipmentScope, "all">;
  documentRequirements: PortalDocumentRequirementSummary[];
}

export interface PortalRatingCategory {
  key: string;
  label: string;
}

export interface PortalQueryMessageSummary {
  id: string;
  authorId?: string | null;
  createdAt: string | Date;
  body: string;
}

export interface PortalQueryThreadSummary {
  id: string;
  title: string;
  description?: string | null;
  requiresCustomerAction: boolean;
  messages: PortalQueryMessageSummary[];
}

export interface PortalAuditLogSummary {
  id: string;
  event: string;
  createdAt: string | Date;
  remarks?: string | null;
  portalUserId?: string | null;
}

export interface PortalShipmentDetailJob {
  id: string;
  jobNumber: string;
  status: string;
  stage: string;
  customerRef?: string | null;
  title?: string | null;
  jobType?: { name: string } | null;
  shipmentType?: { name: string } | null;
  primaryOwner?: {
    name: string;
    email: string;
    personalPhone?: string | null;
    designation?: string | null;
  } | null;
  assignedManager?: {
    name: string;
    email: string;
    personalPhone?: string | null;
    designation?: string | null;
  } | null;
  additionalData?: {
    portOfLoading?: string | null;
    deliveryOrderValidity?: string | Date | null;
    assessedValue?: number | null;
    dutyPaid?: boolean | null;
    vesselName?: string | null;
    billOfLadingNo?: string | null;
    containerNumbers?: string | null;
  } | null;
  documentRequirements: PortalDocumentRequirementSummary[];
  checklistWorkflow?: {
    id: string;
    status: string;
    currentFileVersion?: { id: string } | null;
  } | null;
  customerQueryThreads: PortalQueryThreadSummary[];
  shipmentRatings: Array<{ portalUserId: string }>;
}

export interface PortalShipmentDetailView {
  job: PortalShipmentDetailJob;
  stageMappings: PortalStageMapping[];
  currentStage: PortalStageMapping | null;
  actions: PortalActionSummary;
  auditLogs: PortalAuditLogSummary[];
}
