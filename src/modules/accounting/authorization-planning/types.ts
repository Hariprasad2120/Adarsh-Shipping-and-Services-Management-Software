import type { AccountingPolicyDecisionId } from "../rollout/policy-register";

export const PHASE8_READINESS_LOGIC_VERSION =
  "accounting-production-authorization-planning/v1" as const;

export type ProductionScope = {
  organizationId: string;
  legalEntityId: string;
  environment: "PRODUCTION";
};

export type IdentityClassification =
  | "PRODUCTION_HUMAN"
  | "DEVELOPMENT"
  | "STAGING"
  | "TEST"
  | "SYNTHETIC"
  | "PLACEHOLDER";

export type ProductionIdentity = {
  identityId: string;
  organizationId: string;
  legalEntityIds: string[];
  active: boolean;
  classification: IdentityClassification;
  permissions: string[];
};

export const EVIDENCE_STATES = [
  "MISSING",
  "SUBMITTED",
  "UNDER_REVIEW",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "SUPERSEDED",
  "REVOKED",
] as const;

export type EvidenceState = (typeof EVIDENCE_STATES)[number];
export type EvidenceOrigin =
  | "PRODUCTION_EXTERNAL"
  | "SYNTHETIC"
  | "SAMPLE"
  | "METADATA_ONLY";

export type ProductionEvidenceItem = ProductionScope & {
  evidenceId: string;
  evidenceType: string;
  requirementId: string;
  version: number;
  contentDigest: string;
  issuingSystemOrAuthority: string;
  ownerIdentityId: string;
  submittedByIdentityId: string;
  submittedAt: string;
  validFrom: string;
  validUntil: string;
  secureExternalReference: string;
  dataClassification: "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
  reviewStatus: EvidenceState;
  reviewedByIdentityId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  supersededByEvidenceId: string | null;
  revoked: boolean;
  revokedAt: string | null;
  revocationReason: string | null;
  retentionClassification: string;
  verificationMethod: string;
  verificationResult: "NOT_VERIFIED" | "PASSED" | "FAILED";
  verificationTimestamp: string | null;
  origin: EvidenceOrigin;
  rowVersion: number;
};

export const POLICY_DECISION_STATES = [
  "AWAITING_DECISION",
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "SUPERSEDED",
  "REVOKED",
] as const;

export type GovernedPolicyDecisionState =
  (typeof POLICY_DECISION_STATES)[number];

export type GovernedPolicyDecision = ProductionScope & {
  policyId: AccountingPolicyDecisionId;
  version: number;
  authoritativeOwnerIdentityId: string | null;
  decisionText: string | null;
  structuredSelection: Record<string, string> | null;
  rationale: string | null;
  effectiveDate: string | null;
  reviewDate: string | null;
  supportingEvidenceIds: string[];
  makerIdentityId: string | null;
  checkerIdentityId: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  status: GovernedPolicyDecisionState;
  supersededByVersion: number | null;
  revokedAt: string | null;
  revocationReason: string | null;
  statutoryJurisdiction: string | null;
  sourceAuthorityReference: string | null;
  rowVersion: number;
};

export const PRODUCTION_RESPONSIBILITY_ROLES = [
  "EXECUTIVE_BUSINESS_SPONSOR",
  "ACCOUNTING_OWNER",
  "MIGRATION_OPERATOR",
  "INDEPENDENT_CHECKER",
  "DATABASE_OWNER",
  "BACKUP_RESTORE_OWNER",
  "INFRASTRUCTURE_OWNER",
  "SECURITY_OWNER",
  "STATUTORY_TAX_APPROVER",
  "BUSINESS_ACCEPTANCE_OWNER",
  "SCHEDULER_OWNER",
  "PROVIDER_INTEGRATION_OWNER",
  "SUPPORT_LEAD",
  "INCIDENT_COMMANDER",
  "ROLLBACK_AUTHORITY",
  "COMMUNICATIONS_OWNER",
] as const;

export type ProductionResponsibilityRole =
  (typeof PRODUCTION_RESPONSIBILITY_ROLES)[number];

export type ResponsibilityAssignment = ProductionScope & {
  assignmentId: string;
  role: ProductionResponsibilityRole;
  identityId: string;
  requiredPermission: string;
  assignedAt: string;
  acknowledgedAt: string | null;
  validUntil: string;
  assignedByIdentityId: string;
  rowVersion: number;
};

export type BackupRestoreCertification = ProductionScope & {
  certificationId: string;
  version: number;
  backupScopeReference: string;
  databaseCovered: boolean;
  attachmentsCovered: boolean;
  encryptionEvidenceId: string;
  backupTimestamp: string;
  maximumBackupAgeMinutes: number;
  retentionEvidenceId: string;
  integrityVerificationEvidenceId: string;
  isolatedRestoreEvidenceId: string;
  isolatedRestorePassed: boolean;
  restorationTimestamp: string;
  recoveryPointObjectiveMinutes: number;
  recoveryPointObservedMinutes: number;
  recoveryTimeObjectiveMinutes: number;
  recoveryTimeObservedMinutes: number;
  accountingConsistencyEvidenceId: string;
  accountingConsistencyPassed: boolean;
  attachmentConsistencyEvidenceId: string;
  attachmentConsistencyPassed: boolean;
  restoreOwnerIdentityId: string;
  independentVerifierIdentityId: string;
  rollbackAuthorityIdentityId: string;
  postedEffectsStrategy: "CANONICAL_REVERSAL_CANCELLATION_OR_ADJUSTMENT_ONLY";
  evidenceOrigin: EvidenceOrigin;
  certifiedAt: string;
  rowVersion: number;
};

export type OwnerAttestation = {
  ownerIdentityId: string;
  checkerIdentityId: string;
  evidenceId: string;
  signedAt: string;
};

export type ProductionConfigurationDeclaration = ProductionScope & {
  declarationId: string;
  version: number;
  productionDatabaseIdentityReference: string;
  expectedEnvironmentClassification: "PRODUCTION";
  allowedHostPolicyReference: string;
  databaseHostClassification:
    | "APPROVED_NON_LOOPBACK"
    | "LOOPBACK"
    | "DEVELOPMENT"
    | "STAGING"
    | "TEST"
    | "SYNTHETIC";
  databasePort: number;
  canonicalServiceEndpointReferences: string[];
  providerDeclarations: Array<{
    providerName: string;
    configurationReference: string;
    activationState: "DISABLED";
  }>;
  schedulerOwnershipReference: string;
  schedulerMode: "DISABLED";
  outboundDeliveryMode: "DISABLED";
  attachmentStorageReference: string;
  encryptionKeyManagementReference: string;
  observabilityDestinationReference: string;
  alertOwnershipReference: string;
  retentionConfigurationReference: string;
  authenticationAuthorizationIssuerReference: string;
  deploymentIdentityReference: string;
  releaseArtifactDigest: string;
  featureFlagDeclarationReference: string;
  killSwitchReference: string;
  sensitiveValueReferences: string[];
  executionMode: "PLANNING_ONLY";
  productionEnablementFlag?: boolean;
  ownerAttestations: OwnerAttestation[];
  rowVersion: number;
};

export type ExactCurrencyTotals = {
  documentTotal: string;
  receiptPaymentTotal: string;
  allocatedTotal: string;
  unallocatedTotal: string;
  debitTotal: string;
  creditTotal: string;
};

export type RealSourceManifest = ProductionScope & {
  manifestVersion: "accounting-real-source-manifest/v1";
  manifestId: string;
  sourceSystemIdentity: string;
  extractionTimestamp: string;
  extractionOperatorIdentityId: string;
  classification: "PRODUCTION_REAL_SOURCE" | "SYNTHETIC" | "SAMPLE";
  recordTypeCounts: Record<string, number>;
  currencyTotals: Record<string, ExactCurrencyTotals>;
  dependencyCounts: Record<string, number>;
  attachmentCount: number;
  rejectedCount: number;
  excludedCount: number;
  sourceChecksum: string;
  immutableExtractionReference: string;
  policyVersionReferences: string[];
  mappingVersionReferences: string[];
  canonicalContractVersion: string;
  makerAttestation: OwnerAttestation;
  freshnessLimitMinutes: number;
  reconciliationTolerance: "EXACT_ZERO";
  rowVersion: number;
};

export type ManifestVerificationExpectation = ProductionScope & {
  independentlyComputedSourceChecksum: string;
  expectedRecordTypeCounts: Record<string, number>;
  expectedCurrencyTotals: Record<string, ExactCurrencyTotals>;
  expectedDependencyCounts: Record<string, number>;
  expectedAttachmentCount: number;
  expectedRejectedCount: number;
  expectedExcludedCount: number;
};

export const NON_WAIVABLE_CONTROL_CLASSES = [
  "SECURITY",
  "SCOPE_ISOLATION",
  "RECONCILIATION",
  "BACKUP_RESTORE",
  "CANONICAL_FINANCIAL_BOUNDARY",
  "STATUTORY",
] as const;

export type NonWaivableControlClass =
  (typeof NON_WAIVABLE_CONTROL_CLASSES)[number];

export type ExceptionControlClass =
  | NonWaivableControlClass
  | "PERFORMANCE"
  | "OPERATIONS"
  | "DOCUMENTATION";

export type ReadinessException = ProductionScope & {
  exceptionId: string;
  version: number;
  controlClass: ExceptionControlClass;
  controlId: string;
  ownerIdentityId: string;
  rationale: string;
  impact: string;
  compensatingControl: string;
  evidenceIds: string[];
  expiresAt: string;
  makerIdentityId: string;
  checkerIdentityId: string;
  status: "SUBMITTED" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "REVOKED";
  reviewedAt: string | null;
  revokedAt: string | null;
  rowVersion: number;
};

export type ReadinessGate = {
  gateId: string;
  critical: boolean;
  satisfied: boolean;
  safeReason: string;
};

export type Phase8ReadinessSnapshot = ProductionScope & {
  readinessLogicVersion: typeof PHASE8_READINESS_LOGIC_VERSION;
  releaseCommit: string;
  releaseArtifactDigest: string;
  evidence: ProductionEvidenceItem[];
  policies: GovernedPolicyDecision[];
  assignments: ResponsibilityAssignment[];
  backupRestore: BackupRestoreCertification | null;
  configuration: ProductionConfigurationDeclaration | null;
  manifest: RealSourceManifest | null;
  exceptions: ReadinessException[];
  gates: ReadinessGate[];
};

export const AUTHORIZATION_REQUEST_STATES = [
  "NOT_READY",
  "AUTHORIZATION_REQUEST_READY",
  "INVALIDATED",
] as const;

export type AuthorizationRequestState =
  (typeof AUTHORIZATION_REQUEST_STATES)[number];

export type AuthorizationRequestPackage = ProductionScope & {
  requestId: string;
  state: AuthorizationRequestState;
  releaseCommit: string;
  releaseArtifactDigest: string;
  approvedPolicyVersions: Array<{ policyId: string; version: number }>;
  acceptedEvidenceVersions: Array<{ evidenceId: string; version: number }>;
  configurationDeclarationVersion: number | null;
  realSourceManifestDigest: string | null;
  roleAssignments: Array<{
    role: ProductionResponsibilityRole;
    assignmentId: string;
    rowVersion: number;
  }>;
  openRisksAndExceptions: Array<{
    exceptionId: string;
    controlId: string;
    status: ReadinessException["status"];
  }>;
  goNoGoAssessment: "NO_GO" | "AUTHORIZATION_REQUEST_READY";
  blockers: string[];
  generatedAt: string;
  expiresAt: string;
  makerIdentityId: string;
  proposedIndependentCheckerIdentityId: string;
  readinessSnapshotDigest: string;
  productionAuthorizationGranted: false;
  cutoverExecutionAvailable: false;
};

export type AuditAction =
  | "EVIDENCE_SUBMITTED"
  | "EVIDENCE_REVIEWED"
  | "EVIDENCE_REJECTED"
  | "EVIDENCE_REVOKED"
  | "POLICY_SUBMITTED"
  | "POLICY_APPROVED"
  | "POLICY_REJECTED"
  | "POLICY_REVOKED"
  | "ROLE_ASSIGNED"
  | "ROLE_ACKNOWLEDGED"
  | "CONFIGURATION_VERIFIED"
  | "MANIFEST_VERIFIED"
  | "AUTHORIZATION_REQUEST_CREATED"
  | "AUTHORIZATION_REQUEST_INVALIDATED"
  | "EXCEPTION_SUBMITTED"
  | "EXCEPTION_DISPOSITION";

export type Phase8AuditEvent = ProductionScope & {
  eventId: string;
  actorIdentityId: string;
  action: AuditAction;
  occurredAt: string;
  objectId: string;
  outcome: "SUCCEEDED" | "REJECTED" | "BLOCKED";
  safeDetailCode: string;
  previousEventHash: string | null;
  eventHash: string;
};
